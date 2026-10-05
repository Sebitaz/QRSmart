import { useAuth } from '../../context/auth-context'

export default function StaffHomePage() {
  const { user } = useAuth()
  return (
    <section>
      <h1>Control de acceso</h1>
      <p className="muted">Hola, {user.first_name}. Aquí podrás escanear los códigos QR de los asistentes en la puerta.</p>
      <div className="card placeholder">El escáner QR estará disponible en un próximo sprint.</div>
    </section>
  )
}
