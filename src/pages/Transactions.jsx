import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ensureSecurity } from '../lib/securities'
import { computeHoldings } from '../lib/portfolio'

const money = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const emptyForm = {
  ticker: '',
  action: 'buy',
  shares: '',
  price: '',
  trade_date: new Date().toISOString().slice(0, 10),
  note: '',
}

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categoryByTicker, setCategoryByTicker] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [monthFilter, setMonthFilter] = useState('all')
  const [tickerFilter, setTickerFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)

    const [txResult, secResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('securities')
        .select('ticker, categories(name)')
        .eq('user_id', user.id),
    ])

    if (txResult.error) setError(txResult.error.message)
    else setTransactions(txResult.data)

    if (secResult.error) setError(secResult.error.message)
    else {
      const map = {}
      for (const s of secResult.data) map[s.ticker] = s.categories?.name ?? '未分類'
      setCategoryByTicker(map)
    }

    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const months = useMemo(
    () => [...new Set(transactions.map((t) => t.trade_date.slice(0, 7)))].sort((a, b) => b.localeCompare(a)),
    [transactions]
  )
  const tickers = useMemo(
    () => [...new Set(transactions.map((t) => t.ticker))].sort(),
    [transactions]
  )
  const filteredTransactions = useMemo(
    () => transactions.filter((t) =>
      (monthFilter === 'all' || t.trade_date.startsWith(monthFilter)) &&
      (tickerFilter === 'all' || t.ticker === tickerFilter)
    ),
    [transactions, monthFilter, tickerFilter]
  )
  // Net shares + weighted-avg cost per ticker, scoped to whatever's
  // currently filtered — reuses the same math the Dashboard uses for
  // holdings, just fed the filtered subset instead of everything.
  // computeHoldings processes buys/sells in array order, so it needs
  // oldest-first input regardless of how the list below is displayed.
  const summary = useMemo(() => {
    const chronological = [...filteredTransactions].sort((a, b) =>
      a.trade_date === b.trade_date
        ? a.created_at.localeCompare(b.created_at)
        : a.trade_date.localeCompare(b.trade_date)
    )
    return computeHoldings(chronological)
  }, [filteredTransactions])

  function startEdit(t) {
    setEditingId(t.id)
    setForm({
      ticker: t.ticker,
      action: t.action,
      shares: String(t.shares),
      price: String(t.price),
      trade_date: t.trade_date,
      note: t.note ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const ticker = form.ticker.trim().toUpperCase()

    try {
      await ensureSecurity(user.id, ticker)

      const payload = {
        ticker,
        action: form.action,
        shares: Number(form.shares),
        price: Number(form.price),
        trade_date: form.trade_date,
        note: form.note.trim() || null,
      }

      const { error } = editingId
        ? await supabase.from('transactions').update(payload).eq('id', editingId)
        : await supabase.from('transactions').insert({ ...payload, user_id: user.id })

      if (error) throw error

      setEditingId(null)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('確定要刪除這筆交易紀錄嗎？')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div className="transactions-page">
      <h2>交易紀錄</h2>
      <p className="page-hint">
        股票代號如果沒登記過，會自動歸到「未分類」，之後可以去<Link to="/securities">股票管理</Link>改成正確的分類。
      </p>

      <form className="tx-form" onSubmit={handleSubmit}>
        <div className="tx-form-row">
          <label>
            股票代號
            <input
              name="ticker"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              placeholder="AAPL"
              required
            />
          </label>

          <label>
            買/賣
            <select
              name="action"
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
            >
              <option value="buy">買進</option>
              <option value="sell">賣出</option>
            </select>
          </label>

          <label>
            日期
            <input
              name="trade_date"
              type="date"
              value={form.trade_date}
              onChange={(e) => setForm({ ...form, trade_date: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="tx-form-row">
          <label>
            股數
            <input
              name="shares"
              type="number"
              step="any"
              min="0"
              value={form.shares}
              onChange={(e) => setForm({ ...form, shares: e.target.value })}
              required
            />
          </label>

          <label>
            成交價
            <input
              name="price"
              type="number"
              step="any"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </label>

          <label className="tx-note">
            備註（選填）
            <input
              name="note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="tx-form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? '送出中...' : editingId ? '更新交易' : '新增交易'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit}>取消編輯</button>
          )}
        </div>
      </form>

      <h3>歷史紀錄</h3>
      {!loading && transactions.length > 0 && (
        <div className="tx-filters">
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="all">全部月份</option>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={tickerFilter} onChange={(e) => setTickerFilter(e.target.value)}>
            <option value="all">全部代號</option>
            {tickers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}
      {loading ? (
        <p>讀取中...</p>
      ) : transactions.length === 0 ? (
        <p>還沒有任何交易紀錄。</p>
      ) : filteredTransactions.length === 0 ? (
        <p>沒有符合篩選條件的交易紀錄。</p>
      ) : (
        <>
          {summary.length > 0 && (
            <div className="tx-summary">
              {summary.map((h) => (
                <div className="tx-summary-row" key={h.ticker}>
                  <span className="tx-summary-ticker">{h.ticker}</span>
                  <span>淨股數 {h.shares}</span>
                  <span>平均成本 {money(h.avgCost)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="tx-history-list">
            {filteredTransactions.map((t) => (
              <div className="tx-row" key={t.id}>
                <div className="tx-row-top">
                  <span className="tx-ticker">{t.ticker}</span>
                  <span className={`tx-action-badge ${t.action}`}>
                    {t.action === 'buy' ? '買進' : '賣出'}
                  </span>
                  <span className="tx-date">{t.trade_date}</span>
                </div>
                <div className="tx-row-mid">
                  <span>{categoryByTicker[t.ticker] ?? '—'}</span>
                  <span>{t.shares} 股 @ {t.price}</span>
                </div>
                {t.note && <div className="tx-row-note">{t.note}</div>}
                <div className="tx-row-actions">
                  <button className="link-btn" onClick={() => startEdit(t)}>編輯</button>
                  <button className="link-btn" onClick={() => handleDelete(t.id)}>刪除</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
