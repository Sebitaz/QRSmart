import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRedirect from './components/RoleRedirect'
import { ROLES } from './constants/roles'
import { useAuth } from './context/auth-context'
import AttendeeHomePage from './pages/asistente/AttendeeHomePage'
import LoginPage from './pages/LoginPage'
import StaffHomePage from './pages/logistica/StaffHomePage'
import OrganizerHomePage from './pages/organizador/OrganizerHomePage'
import RegisterPage from './pages/RegisterPage'

function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <p className="center muted">Cargando…</p>

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <RoleRedirect /> : <LoginPage />} />
      <Route path="/registro" element={isAuthenticated ? <RoleRedirect /> : <RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ORGANIZADOR]} />}>
            <Route path="/organizador" element={<OrganizerHomePage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.LOGISTICA]} />}>
            <Route path="/logistica" element={<StaffHomePage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ASISTENTE]} />}>
            <Route path="/asistente" element={<AttendeeHomePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}

export default App
