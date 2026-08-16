import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function CategoriesPanel() {
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
    if (!confirm('確定要刪除這個分類嗎？如果還有股票使用這個分類會刪除失敗。')) return
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
    <div>
      <p className="page-hint">在這裡定義產業分層，股票管理裡的「分類」欄位會從這裡選。</p>

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

function SecuritiesPanel() {
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
    <div>
      <p className="page-hint">
        每檔股票在這裡固定綁定一個分類，之後在交易紀錄輸入這個代號，分類會自動帶出來。
      </p>

      {categories.length === 0 ? (
        <p>還沒有任何分類，先去上面的「分類」新增幾個。</p>
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

export default function Settings() {
  const [tab, setTab] = useState('securities')

  return (
    <div className="settings-page">
      <h2>設定</h2>

      <div className="segmented">
        <button
          className={tab === 'securities' ? 'active' : ''}
          onClick={() => setTab('securities')}
        >
          股票
        </button>
        <button
          className={tab === 'categories' ? 'active' : ''}
          onClick={() => setTab('categories')}
        >
          分類
        </button>
      </div>

      {tab === 'securities' ? <SecuritiesPanel /> : <CategoriesPanel />}
    </div>
  )
}
