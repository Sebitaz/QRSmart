import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ROLE_LABELS, ROLE_NAV } from '../constants/roles'
import { useAuth } from '../context/auth-context'
import {
  getSoundEnabled,
  setSoundEnabled,
  soundFx,
  subscribeSoundPreference,
} from '../utils/sound'
import { BrandLogo, IconLogout, IconVolumeOff, IconVolumeOn } from './Icons'

function getInitials(fullName, email) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0]) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return String(email || 'QR').slice(0, 2).toUpperCase()
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const notice = location.state?.notice
  const [soundOn, setSoundOn] = useState(getSoundEnabled)

  useEffect(() => subscribeSoundPreference(setSoundOn), [])

  const toggleSound = () => {
    const next = !soundOn
    setSoundEnabled(next)
    if (next) soundFx.transition()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand-group">
            <BrandLogo size={30} />
            <span className="brand">
              QR<span>Smart</span>
            </span>
          </div>

          <nav className="topbar-nav" aria-label="Navegación principal">
            {ROLE_NAV[user.role]?.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                onClick={() => soundFx.tap()}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-user">
            <button
              type="button"
              className={`sound-toggle-btn ${soundOn ? 'sound-on' : 'sound-off'}`}
              onClick={toggleSound}
              title={soundOn ? 'Silenciar efectos de sonido' : 'Activar efectos de sonido'}
              aria-label={soundOn ? 'Silenciar efectos de sonido' : 'Activar efectos de sonido'}
            >
              {soundOn ? <IconVolumeOn size={16} /> : <IconVolumeOff size={16} />}
            </button>

            <div className="user-pill">
              <span className="user-avatar" aria-hidden="true">
                {getInitials(user.full_name, user.email)}
              </span>
              <div className="topbar-user-info">
                <span className="user-name">{user.full_name}</span>
                <span className={`badge badge-${user.role.toLowerCase()}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm btn-icon-label"
              onClick={() => {
                soundFx.tap()
                logout()
              }}
            >
              <IconLogout size={15} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {notice && (
          <div className="alert alert-error page-notice" role="alert">
            {notice}
          </div>
        )}
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
