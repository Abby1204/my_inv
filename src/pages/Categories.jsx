import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Categories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })

    if (error) setError(error.message)
    else setCategories(data)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    const trimmed = name.trim()
    if (!trimmed) return

    const nextSortOrder = categories.length
      ? Math.max(...categories.map((c) => c.sort_order)) + 1
      : 0

    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: trimmed,
      sort_order: nextSortOrder,
    })

    if (error) setError(error.message)
    else {
      setName('')
      load()
    }
  }

  async function handleDelete(id) {
    if (!confirm('確定要刪除這個分類嗎？如果還有交易紀錄使用這個分類會刪除失敗。')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  async function handleMove(index, direction) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return

    const a = categories[index]
    const b = categories[target]

    setError('')
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    if (err1 || err2) setError((err1 ?? err2).message)
    else load()
  }

  return (
    <div className="categories-page">
      <h2>分類管理</h2>
      <p className="page-hint">在這裡定義產業分層，交易紀錄的「分類」欄位會從這裡選。</p>

      <form className="category-form" onSubmit={handleAdd}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：連接層"
        />
        <button type="submit">新增分類</button>
      </form>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p>讀取中...</p>
      ) : categories.length === 0 ? (
        <p>還沒有任何分類，先新增幾個吧。</p>
      ) : (
        <table className="category-table">
          <thead>
            <tr>
              <th>分類名稱</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="category-actions">
                  <button onClick={() => handleMove(i, -1)} disabled={i === 0}>↑</button>
                  <button onClick={() => handleMove(i, 1)} disabled={i === categories.length - 1}>↓</button>
                  <button className="link-btn" onClick={() => handleDelete(c.id)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
