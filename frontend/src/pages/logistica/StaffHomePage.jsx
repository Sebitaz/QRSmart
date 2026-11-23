import { IconQrCode } from '../../components/Icons'
import QrScanner from '../../components/QrScanner'
import { useAuth } from '../../context/auth-context'

export default function StaffHomePage() {
  const { user } = useAuth()
  return (
    <section className="scanner-page">
      <div className="page-header">
        <div>
          <span className="eyebrow eyebrow-live">
            <IconQrCode size={13} />
            Terminal de acceso
          </span>
          <h1>Control de acceso</h1>
          <p className="muted">
            Hola, {user.first_name}. Apunta la cámara trasera al pase QR del asistente para validar en tiempo real.
          </p>
        </div>
      </div>

      <QrScanner />
    </section>
  )
}
