import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>美股投資 Dashboard</h1>
          <p className="auth-error">
            尚未設定 Supabase。請複製 .env.example 為 .env，填入你的 Supabase Project URL 與 anon key 後重新啟動。
          </p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)
    setBusy(false)

    if (error) {
      setError(error.message)
      return
    }
    if (mode === 'signup') {
      setInfo('帳號建立成功，請去信箱確認後再登入。')
      setMode('signin')
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>美股投資 Dashboard</h1>
        <p className="auth-subtitle">{mode === 'signin' ? '登入' : '建立帳號'}</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <button type="submit" disabled={busy}>
          {busy ? '處理中...' : mode === 'signin' ? '登入' : '註冊'}
        </button>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? '還沒有帳號？註冊' : '已經有帳號？登入'}
        </button>
      </form>
    </div>
  )
}
