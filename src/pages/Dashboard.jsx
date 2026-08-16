import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getQuotes } from '../lib/prices'
import { computeHoldings, computeCategoryRollup } from '../lib/portfolio'

const money = (n) => n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const pct = (n) => n == null ? '—' : `${n.toFixed(1)}%`

export default function Dashboard() {
  const { user } = useAuth()
  const [rollup, setRollup] = useState([])
  const [totalValue, setTotalValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [priceError, setPriceError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setPriceError(false)

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: true })

    if (txError) {
      setError(txError.message)
      setLoading(false)
      return
    }

    const holdings = computeHoldings(transactions ?? [])
    if (holdings.length === 0) {
      setRollup([])
      setTotalValue(0)
      setLoading(false)
      return
    }

    const quotes = await getQuotes(holdings.map((h) => h.ticker))
    if (Object.values(quotes).some((q) => q.error)) setPriceError(true)

    const { rollup, totalValue } = computeCategoryRollup(holdings, quotes)
    setRollup(rollup)
    setTotalValue(totalValue)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="page-loading">讀取中...</div>
  if (error) return <div className="page-error">讀取失敗：{error}</div>

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>美股產業配置分類</h2>
        <button onClick={load}>重新整理</button>
      </div>

      {priceError && (
        <p className="warn-banner">部分股價抓取失敗（可能是 CORS proxy 暫時不穩定），已顯示可用的資料。</p>
      )}

      <p className="total-value">總市值：{money(totalValue)}</p>

      {rollup.length === 0 ? (
        <p>目前沒有持股，去「交易紀錄」頁面新增買進紀錄。</p>
      ) : (
        <table className="rollup-table">
          <thead>
            <tr>
              <th>分類</th>
              <th>個股</th>
              <th>現值</th>
              <th>現值佔比</th>
            </tr>
          </thead>
          <tbody>
            {rollup.map((c) => (
              <tr key={c.category}>
                <td>{c.category}</td>
                <td>{c.holdings.map((h) => `${h.ticker}(${h.shares}股)`).join('、')}</td>
                <td>{money(c.currentValue)}</td>
                <td>{pct(c.weightPercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
