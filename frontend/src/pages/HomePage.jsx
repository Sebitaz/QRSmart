import { useAuth } from '../context/auth-context'

export default function HomePage() {
  const { user, logout } = useAuth()
  return (
    <main className="container">
      <div className="card">
        <h1>Hola, {user.full_name}</h1>
        <p className="muted">Rol: {user.role}</p>
        <button className="btn btn-outline" onClick={logout}>Cerrar sesión</button>
      </div>
    </main>
  )
}
