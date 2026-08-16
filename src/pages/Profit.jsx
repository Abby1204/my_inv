import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getQuotes } from '../lib/prices'
import { computeHoldings, computeCategoryRollup } from '../lib/portfolio'

const money = (n) => n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const pct = (n) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const signed = (n) => `${n >= 0 ? '+' : ''}${money(n)}`

function GainText({ value }) {
  if (value == null) return <span>—</span>
  return <span className={value >= 0 ? 'up-text' : 'down-text'}>{signed(value)}</span>
}

export default function Profit() {
  const { user } = useAuth()
  const [currentHoldings, setCurrentHoldings] = useState([])
  const [exitedHoldings, setExitedHoldings] = useState([])
  const [totals, setTotals] = useState({ realized: 0, unrealized: 0, unrealizedPercent: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [priceError, setPriceError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setPriceError(false)

    const [txResult, secResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: true }),
      supabase
        .from('securities')
        .select('ticker, categories(name)')
        .eq('user_id', user.id),
    ])

    if (txResult.error) {
      setError(txResult.error.message)
      setLoading(false)
      return
    }
    if (secResult.error) {
      setError(secResult.error.message)
      setLoading(false)
      return
    }

    const categoryByTicker = {}
    for (const s of secResult.data) categoryByTicker[s.ticker] = s.categories?.name ?? '未分類'

    const withCategoryName = (txResult.data ?? []).map((t) => ({
      ...t,
      category: categoryByTicker[t.ticker] ?? '未分類',
    }))

    const allHoldings = computeHoldings(withCategoryName)
    const totalRealizedGain = allHoldings.reduce((sum, h) => sum + h.realizedGain, 0)
    const exited = allHoldings.filter((h) => h.shares <= 1e-9 && Math.abs(h.realizedGain) > 1e-9)
    setExitedHoldings(exited)

    const current = allHoldings.filter((h) => h.shares > 1e-9)
    if (current.length === 0) {
      setCurrentHoldings([])
      setTotals({ realized: totalRealizedGain, unrealized: 0, unrealizedPercent: null })
      setLoading(false)
      return
    }

    const quotes = await getQuotes(current.map((h) => h.ticker))
    if (Object.values(quotes).some((q) => q.error)) setPriceError(true)

    const { holdings, totalUnrealizedGain, totalUnrealizedGainPercent } = computeCategoryRollup(current, quotes)
    setCurrentHoldings([...holdings].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0)))
    setTotals({
      realized: totalRealizedGain,
      unrealized: totalUnrealizedGain,
      unrealizedPercent: totalUnrealizedGainPercent,
    })
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="page-loading">讀取中...</div>
  if (error) return <div className="page-error">讀取失敗：{error}</div>

  const totalGain = totals.realized + totals.unrealized

  return (
    <div className="profit-page">
      <div className="dashboard-header">
        <h2>損益</h2>
        <button onClick={load}>重新整理</button>
      </div>

      {priceError && (
        <p className="warn-banner">部分股價抓取失敗（可能是 CORS proxy 暫時不穩定），已顯示可用的資料。</p>
      )}

      <div className="hero profit-summary">
        <div className="profit-summary-row">
          <span>已實現損益</span>
          <GainText value={totals.realized} />
        </div>
        <div className="profit-summary-row">
          <span>未實現損益</span>
          <span>
            <GainText value={totals.unrealized} /> {totals.unrealizedPercent != null && `(${pct(totals.unrealizedPercent)})`}
          </span>
        </div>
        <div className="profit-summary-row profit-summary-total">
          <span>總損益</span>
          <GainText value={totalGain} />
        </div>
      </div>

      {currentHoldings.length === 0 && exitedHoldings.length === 0 ? (
        <p>還沒有任何交易紀錄。</p>
      ) : (
        <>
          {currentHoldings.length > 0 && (
            <>
              <h3>持股明細</h3>
              <div className="category-cards">
                {currentHoldings.map((h) => (
                  <div className="asset-card" key={h.ticker}>
                    <div className="asset-card-top">
                      <span className="asset-name">{h.ticker}</span>
                      <span className="asset-weight">{h.category}</span>
                    </div>
                    <div className="profit-row">
                      <span>現值 {money(h.currentValue)}（{h.shares} 股 @ 均價 {money(h.avgCost)}）</span>
                    </div>
                    <div className="profit-row">
                      <span>未實現</span>
                      <GainText value={h.unrealizedGain} />
                      {h.unrealizedGainPercent != null && <span className="profit-sub">{pct(h.unrealizedGainPercent)}</span>}
                    </div>
                    {Math.abs(h.realizedGain) > 1e-9 && (
                      <div className="profit-row">
                        <span>已實現（此檔曾部分賣出）</span>
                        <GainText value={h.realizedGain} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {exitedHoldings.length > 0 && (
            <>
              <h3>已出清部位</h3>
              <div className="category-cards">
                {exitedHoldings.map((h) => (
                  <div className="asset-card" key={h.ticker}>
                    <div className="asset-card-top">
                      <span className="asset-name">{h.ticker}</span>
                      <span className="asset-weight">{h.category}</span>
                    </div>
                    <div className="profit-row">
                      <span>已實現損益</span>
                      <GainText value={h.realizedGain} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
