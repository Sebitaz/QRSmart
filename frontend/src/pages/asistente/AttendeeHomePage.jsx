import { useAuth } from '../../context/auth-context'

export default function AttendeeHomePage() {
  const { user } = useAuth()
  return (
    <section>
      <h1>Mis entradas</h1>
      <p className="muted">Hola, {user.first_name}. Aquí encontrarás tus entradas con código QR y la información de tus eventos.</p>
      <div className="card placeholder">Aún no tienes entradas.</div>
    </section>
  )
}
