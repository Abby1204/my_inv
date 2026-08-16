import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Categories from './pages/Categories'
import Securities from './pages/Securities'
import { useTheme } from './hooks/useTheme'
import './App.css'

const TABS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
    ),
  },
  {
    to: '/transactions',
    label: '交易',
    icon: (
      <path d="M4 6h16M4 12h16M4 18h10" />
    ),
  },
  {
    to: '/securities',
    label: '股票',
    icon: (
      <path d="M3 17l6-6 4 4 8-8M21 7v6h-6" />
    ),
  },
  {
    to: '/categories',
    label: '分類',
    icon: (
      <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
    ),
  },
]

function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      aria-label={isLight ? '切換成深色模式' : '切換成淺色模式'}
    >
      {isLight ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  )
}

function TopBar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="top-bar">
      <span className="brand">Investment</span>
      <div className="top-bar-actions">
        <ThemeToggle />
        <button className="signout-btn" onClick={handleSignOut}>登出</button>
      </div>
    </header>
  )
}

function BottomNav() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `bottom-nav-tab${isActive ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {tab.icon}
          </svg>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/securities"
            element={
              <ProtectedRoute>
                <Securities />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default App
