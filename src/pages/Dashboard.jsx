import { useEffect, useState, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getQuotes } from '../lib/prices'
import { computeHoldings, computeCategoryRollup } from '../lib/portfolio'

const money = (n) => n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const pct = (n) => n == null ? '—' : `${n.toFixed(1)}%`

const CHART_COLORS = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#38bdf8', '#a78bfa', '#fb923c']

function ChangeBadge({ value }) {
  if (value == null) return null
  const isUp = value >= 0
  return (
    <span className={`change-badge ${isUp ? 'up' : 'down'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [rollup, setRollup] = useState([])
  const [totalValue, setTotalValue] = useState(0)
  const [dayChangePercent, setDayChangePercent] = useState(null)
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

    const holdings = computeHoldings(withCategoryName)
    if (holdings.length === 0) {
      setRollup([])
      setTotalValue(0)
      setDayChangePercent(null)
      setLoading(false)
      return
    }

    const quotes = await getQuotes(holdings.map((h) => h.ticker))
    if (Object.values(quotes).some((q) => q.error)) setPriceError(true)

    const { rollup, totalValue, dayChangePercent } = computeCategoryRollup(holdings, quotes)
    setRollup(rollup)
    setTotalValue(totalValue)
    setDayChangePercent(dayChangePercent)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="page-loading">讀取中...</div>
  if (error) return <div className="page-error">讀取失敗：{error}</div>

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-top">
          <span className="hero-label">總市值</span>
          <button className="refresh-btn" onClick={load} aria-label="重新整理">⟳</button>
        </div>
        <div className="hero-value">{money(totalValue)}</div>
        <ChangeBadge value={dayChangePercent} />
      </section>

      {priceError && (
        <p className="warn-banner">部分股價抓取失敗（可能是 CORS proxy 暫時不穩定），已顯示可用的資料。</p>
      )}

      {rollup.length === 0 ? (
        <p>目前沒有持股，去「交易紀錄」頁面新增買進紀錄。</p>
      ) : (
        <>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={rollup}
                  dataKey="currentValue"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                >
                  {rollup.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="category-cards">
            {rollup.map((c, i) => (
              <div className="asset-card" key={c.category}>
                <div className="asset-card-top">
                  <span className="asset-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="asset-name">{c.category}</span>
                  <span className="asset-weight">{pct(c.weightPercent)}</span>
                </div>
                <div className="asset-card-value">{money(c.currentValue)}</div>
                <div className="asset-card-tickers">
                  {c.holdings.map((h) => `${h.ticker}(${h.shares}股)`).join('、')}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
