import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import './App.css'

function NavBar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <span className="brand">Investment</span>
      <Link to="/">Dashboard</Link>
      <Link to="/transactions">交易紀錄</Link>
      <span className="nav-spacer" />
      <span className="nav-user">{user.email}</span>
      <button onClick={handleSignOut}>登出</button>
    </nav>
  )
}

function App() {
  return (
    <>
      <NavBar />
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
        </Routes>
      </main>
    </>
  )
}

export default App
