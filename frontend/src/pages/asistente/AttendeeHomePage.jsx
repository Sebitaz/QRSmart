import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ticketsApi } from '../../api/tickets'
import TransferTicketModal from '../../components/TransferTicketModal'
import { useAuth } from '../../context/auth-context'
import { formatRange } from '../../utils/dates'

const STATUS_LABELS = {
  VALIDO: 'Válida · Compra activa',
  USADO: 'Usada',
  ANULADO: 'Anulada',
}

function TicketCard({ ticket, onOpenTransfer }) {
  const { event } = ticket
  const isValid = ticket.status === 'VALIDO'
  // REGLA ESTRICTA HU 2.2: Solo el UUID del ticket generado por el backend
  const qrUuidValue = String(ticket.code)

  return (
    <article className={`card ticket-card ${isValid ? '' : 'ticket-inactive'}`}>
      <div className="ticket-info">
        <div className="ticket-info-top">
          <span className={`badge badge-ticket-${ticket.status.toLowerCase()}`}>
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
          <code className="ticket-code">#{qrUuidValue.slice(0, 8).toUpperCase()}</code>
        </div>
        <h3>
          <Link
            to={`/asistente/tickets/${ticket.id}`}
            state={{ ticket }}
            className="ticket-title-link"
          >
            {event.name}
          </Link>
        </h3>
        <p className="muted">📍 {event.location}</p>
        <p className="muted">🗓️ {formatRange(event.start_at, event.end_at)}</p>

        <div className="ticket-card-actions">
          <Link
            to={`/asistente/tickets/${ticket.id}`}
            state={{ ticket }}
            className="btn btn-primary btn-sm"
          >
            Ver pase QR
          </Link>
          {isValid && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onOpenTransfer(ticket)}
            >
              Transferir
            </button>
          )}
        </div>
      </div>

      <Link
        to={`/asistente/tickets/${ticket.id}`}
        state={{ ticket }}
        className="ticket-qr ticket-qr-link"
        aria-label={`Abrir código QR para ${event.name}`}
      >
        <QRCodeSVG
          value={qrUuidValue}
          size={136}
          level="M"
          marginSize={2}
          title={`Entrada ${event.name}`}
        />
        <code className="ticket-code">{qrUuidValue.slice(0, 8).toUpperCase()}</code>
      </Link>
    </article>
  )
}

export default function AttendeeHomePage() {
  const { user } = useAuth()
  const location = useLocation()
  const acquired = location.state?.acquired
  const initialTransferNotice = location.state?.transferredNotice ?? ''

  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('ACTIVE')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ticketToTransfer, setTicketToTransfer] = useState(null)
  const [transferNotice, setTransferNotice] = useState(initialTransferNotice)

  useEffect(() => {
    ticketsApi
      .mine()
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleTransferred = (transferredTicket, response) => {
    // HU 2.3: Actualiza el estado inmediatamente para que desaparezca sin recargar la página
    setTickets((prev) => prev.filter((item) => item.id !== transferredTicket.id))
    setTicketToTransfer(null)
    setTransferNotice(
      `¡Listo! Transferiste tu entrada de “${transferredTicket.event.name}” a ${response.recipient_email}.`
    )
  }

  const activeTickets = tickets.filter((t) => t.status === 'VALIDO')
  const visibleTickets = filter === 'ACTIVE' ? activeTickets : tickets

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Mis Tickets</h1>
          <p className="muted">
            Hola, {user.first_name}. Abre tu pase QR para ingresar o transfiere una entrada válida a otro asistente.
          </p>
        </div>
        <Link to="/asistente/eventos" className="btn btn-primary">
          Comprar / Buscar eventos
        </Link>
      </div>

      {acquired && (
        <div className="alert alert-success page-notice" role="status">
          ¡Listo! Ya tienes tu entrada para “{acquired}”. Toca la tarjeta para mostrar tu QR.
        </div>
      )}
      {transferNotice && (
        <div className="alert alert-success page-notice" role="status">
          {transferNotice}
        </div>
      )}
      {error && (
        <div className="alert alert-error page-notice" role="alert">
          {error}
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="ticket-filter-tabs" role="tablist" aria-label="Filtro de tickets">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'ACTIVE'}
            className={`btn btn-sm ${filter === 'ACTIVE' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('ACTIVE')}
          >
            Compras activas ({activeTickets.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'ALL'}
            className={`btn btn-sm ${filter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('ALL')}
          >
            Todos ({tickets.length})
          </button>
        </div>
      )}

      {loading ? (
        <p className="muted">Cargando tus tickets digitales…</p>
      ) : visibleTickets.length === 0 ? (
        <div className="card placeholder">
          {tickets.length === 0 ? (
            <>
              Aún no tienes tickets activos.{' '}
              <Link to="/asistente/eventos">Explora los eventos disponibles</Link>.
            </>
          ) : (
            <>
              No tienes compras activas pendientes por usar.{' '}
              <button type="button" className="link-button" onClick={() => setFilter('ALL')}>
                Ver historial completo
              </button>
              .
            </>
          )}
        </div>
      ) : (
        <div className="ticket-list">
          {visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onOpenTransfer={setTicketToTransfer}
            />
          ))}
        </div>
      )}

      <TransferTicketModal
        ticket={ticketToTransfer}
        onClose={() => setTicketToTransfer(null)}
        onTransferred={handleTransferred}
      />
    </section>
  )
}

