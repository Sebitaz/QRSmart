import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/auth-context'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <p className="center muted">Cargando…</p>

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/registro" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
