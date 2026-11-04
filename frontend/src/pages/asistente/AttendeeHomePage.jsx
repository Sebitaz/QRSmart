import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ticketsApi } from '../../api/tickets'
import { useAuth } from '../../context/auth-context'
import { formatRange } from '../../utils/dates'
import { ticketPublicUrl } from '../../utils/ticketUrl'

const STATUS_LABELS = {
  VALIDO: 'Válida',
  USADO: 'Usada',
  ANULADO: 'Anulada',
}

function TicketCard({ ticket }) {
  const { event } = ticket
  const isValid = ticket.status === 'VALIDO'
  return (
    <article className={`card ticket-card ${isValid ? '' : 'ticket-inactive'}`}>
      <div className="ticket-info">
        <h3>{event.name}</h3>
        <p className="muted">{event.location}</p>
        <p className="muted">{formatRange(event.start_at, event.end_at)}</p>
        <span className={`badge badge-ticket-${ticket.status.toLowerCase()}`}>
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </span>
      </div>
      <div className="ticket-qr">
        <QRCodeSVG value={ticketPublicUrl(ticket.code)} size={160} marginSize={2} title={`Entrada ${event.name}`} />
        <code className="ticket-code">{ticket.code.slice(0, 8).toUpperCase()}</code>
      </div>
    </article>
  )
}

export default function AttendeeHomePage() {
  const { user } = useAuth()
  const location = useLocation()
  const acquired = location.state?.acquired
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ticketsApi
      .mine()
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Mis entradas</h1>
          <p className="muted">Hola, {user.first_name}. Muestra el código QR en la entrada del evento.</p>
        </div>
        <Link to="/asistente/eventos" className="btn btn-primary">Buscar eventos</Link>
      </div>

      {acquired && (
        <div className="alert alert-success page-notice" role="status">
          ¡Listo! Ya tienes tu entrada para “{acquired}”.
        </div>
      )}
      {error && <div className="alert alert-error page-notice" role="alert">{error}</div>}

      {loading ? (
        <p className="muted">Cargando entradas…</p>
      ) : tickets.length === 0 ? (
        <div className="card placeholder">
          Aún no tienes entradas. <Link to="/asistente/eventos">Mira los eventos disponibles</Link>.
        </div>
      ) : (
        <div className="ticket-list">
          {tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      )}
    </section>
  )
}
