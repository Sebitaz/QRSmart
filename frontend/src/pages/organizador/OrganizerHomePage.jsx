import { useAuth } from '../../context/auth-context'

export default function OrganizerHomePage() {
  const { user } = useAuth()
  return (
    <section>
      <h1>Mis eventos</h1>
      <p className="muted">Bienvenido, {user.first_name}. Desde aquí gestionarás tus eventos y su aforo.</p>
    </section>
  )
}
