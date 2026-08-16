import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  ticker: '',
  category_id: '',
  action: 'buy',
  shares: '',
  price: '',
  trade_date: new Date().toISOString().slice(0, 10),
  note: '',
}

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    const [txResult, catResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, categories(name)')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true }),
    ])

    if (txResult.error) setError(txResult.error.message)
    else setTransactions(txResult.data)

    if (catResult.error) setError(catResult.error.message)
    else {
      setCategories(catResult.data)
      setForm((f) => ({ ...f, category_id: f.category_id || catResult.data[0]?.id || '' }))
    }

    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      ticker: form.ticker.trim().toUpperCase(),
      category_id: form.category_id,
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
    setForm({ ...emptyForm, category_id: form.category_id })
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

      {!loading && categories.length === 0 ? (
        <p>還沒有任何分類，先去<Link to="/categories">分類管理</Link>新增幾個。</p>
      ) : (
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
              分類
              <select
                name="category_id"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
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

          <label className="tx-note">
            備註（選填）
            <input
              name="note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? '送出中...' : '新增交易'}
          </button>
        </form>
      )}

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
                <td>{t.categories?.name}</td>
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
