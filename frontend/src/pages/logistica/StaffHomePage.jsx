import QrScanner from '../../components/QrScanner'
import { useAuth } from '../../context/auth-context'

export default function StaffHomePage() {
  const { user } = useAuth()
  return (
    <section className="scanner-page">
      <div className="page-header">
        <div>
          <h1>Control de acceso · Escáner QR</h1>
          <p className="muted">
            Hola, {user.first_name}. Apunta la cámara trasera al código QR del asistente para validar su ingreso en tiempo real.
          </p>
        </div>
      </div>

      <QrScanner />
    </section>
  )
}

