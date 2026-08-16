import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Securities() {
  const { user } = useAuth()
  const [securities, setSecurities] = useState([])
  const [categories, setCategories] = useState([])
  const [ticker, setTicker] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [secResult, catResult] = await Promise.all([
      supabase
        .from('securities')
        .select('*, categories(name)')
        .eq('user_id', user.id)
        .order('ticker', { ascending: true }),
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true }),
    ])

    if (secResult.error) setError(secResult.error.message)
    else setSecurities(secResult.data)

    if (catResult.error) setError(catResult.error.message)
    else {
      setCategories(catResult.data)
      setCategoryId((c) => c || catResult.data[0]?.id || '')
    }

    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    const trimmed = ticker.trim().toUpperCase()
    if (!trimmed || !categoryId) return

    const { error } = await supabase.from('securities').insert({
      user_id: user.id,
      ticker: trimmed,
      category_id: categoryId,
    })

    if (error) setError(error.message)
    else {
      setTicker('')
      load()
    }
  }

  async function handleCategoryChange(id, newCategoryId) {
    setError('')
    const { error } = await supabase
      .from('securities')
      .update({ category_id: newCategoryId })
      .eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  async function handleDelete(id) {
    if (!confirm('確定要刪除這檔股票的分類設定嗎？已存在的交易紀錄不會被刪除，但之後會找不到分類。')) return
    const { error } = await supabase.from('securities').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div className="securities-page">
      <h2>股票管理</h2>
      <p className="page-hint">
        每檔股票在這裡固定綁定一個分類，之後在<Link to="/transactions">交易紀錄</Link>輸入這個代號，分類會自動帶出來。
      </p>

      {categories.length === 0 ? (
        <p>還沒有任何分類，先去<Link to="/categories">分類管理</Link>新增幾個。</p>
      ) : (
        <form className="category-form" onSubmit={handleAdd}>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="股票代號，例如 AVGO"
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit">新增股票</button>
        </form>
      )}

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p>讀取中...</p>
      ) : securities.length === 0 ? (
        <p>還沒有任何股票設定。</p>
      ) : (
        <table className="category-table">
          <thead>
            <tr>
              <th>股票代號</th>
              <th>分類</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {securities.map((s) => (
              <tr key={s.id}>
                <td>{s.ticker}</td>
                <td>
                  <select
                    value={s.category_id}
                    onChange={(e) => handleCategoryChange(s.id, e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td className="category-actions">
                  <button className="link-btn" onClick={() => handleDelete(s.id)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
