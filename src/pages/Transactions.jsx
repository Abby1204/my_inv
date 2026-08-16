import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const DEFAULT_CATEGORIES = ['連接層', '運算層', '雲端層', '光學層', '周邊基建', '架構層', '記憶體層']

const emptyForm = {
  ticker: '',
  category: DEFAULT_CATEGORIES[0],
  action: 'buy',
  shares: '',
  price: '',
  trade_date: new Date().toISOString().slice(0, 10),
  note: '',
}

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setTransactions(data)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const categories = [...new Set([...DEFAULT_CATEGORIES, ...transactions.map((t) => t.category)])]

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      ticker: form.ticker.trim().toUpperCase(),
      category: form.category,
      action: form.action,
      shares: Number(form.shares),
      price: Number(form.price),
      trade_date: form.trade_date,
      note: form.note.trim() || null,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setForm({ ...emptyForm, category: form.category })
    load()
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

      <form className="tx-form" onSubmit={handleSubmit}>
        <div className="tx-form-row">
          <label>
            股票代號
            <input
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              placeholder="AAPL"
              required
            />
          </label>

          <label>
            分類
            <input
              list="category-options"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
            <datalist id="category-options">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>

          <label>
            買/賣
            <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
              <option value="buy">買進</option>
              <option value="sell">賣出</option>
            </select>
          </label>
        </div>

        <div className="tx-form-row">
          <label>
            股數
            <input
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
              type="number"
              step="any"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </label>

          <label>
            日期
            <input
              type="date"
              value={form.trade_date}
              onChange={(e) => setForm({ ...form, trade_date: e.target.value })}
              required
            />
          </label>
        </div>

        <label className="tx-note">
          備註（選填）
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? '送出中...' : '新增交易'}
        </button>
      </form>

      <h3>歷史紀錄</h3>
      {loading ? (
        <p>讀取中...</p>
      ) : transactions.length === 0 ? (
        <p>還沒有任何交易紀錄。</p>
      ) : (
        <table className="tx-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>代號</th>
              <th>分類</th>
              <th>買/賣</th>
              <th>股數</th>
              <th>成交價</th>
              <th>備註</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.trade_date}</td>
                <td>{t.ticker}</td>
                <td>{t.category}</td>
                <td>{t.action === 'buy' ? '買進' : '賣出'}</td>
                <td>{t.shares}</td>
                <td>{t.price}</td>
                <td>{t.note}</td>
                <td><button className="link-btn" onClick={() => handleDelete(t.id)}>刪除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
