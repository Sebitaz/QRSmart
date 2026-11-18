import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ROLE_LABELS, ROLE_NAV } from '../constants/roles'
import { useAuth } from '../context/auth-context'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const notice = location.state?.notice

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">QR<span>Smart</span></span>
          <nav className="topbar-nav">
            {ROLE_NAV[user.role]?.map((link) => (
              <NavLink key={link.to} to={link.to} end>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-user">
            <div className="topbar-user-info">
              <span>{user.full_name}</span>
              <span className={`badge badge-${user.role.toLowerCase()}`}>{ROLE_LABELS[user.role]}</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={logout}>Salir</button>
          </div>
        </div>
      </header>

      <main className="container">
        {notice && <div className="alert alert-error page-notice" role="alert">{notice}</div>}
        <Outlet />
      </main>
    </>
  )
}
