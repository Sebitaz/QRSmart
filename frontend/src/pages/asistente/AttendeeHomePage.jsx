import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ticketsApi } from '../../api/tickets'
import {
  IconCalendar,
  IconMapPin,
  IconQrCode,
  IconSend,
  IconTicket,
} from '../../components/Icons'
import TransferTicketModal from '../../components/TransferTicketModal'
import { useAuth } from '../../context/auth-context'
import { formatRange } from '../../utils/dates'
import { soundFx } from '../../utils/sound'

const STATUS_LABELS = {
  VALIDO: 'Válida · Compra activa',
  USADO: 'Usada',
  ANULADO: 'Anulada',
}

function TicketCard({ ticket, index, onOpenTransfer }) {
  const { event } = ticket
  const isValid = ticket.status === 'VALIDO'
  // REGLA ESTRICTA HU 2.2: Solo el UUID del ticket generado por el backend
  const qrUuidValue = String(ticket.code)

  return (
    <article
      className={`card ticket-card stagger-item ${isValid ? '' : 'ticket-inactive'}`}
      style={{ '--stagger': index }}
    >
      <div className="ticket-info">
        <div className="ticket-info-top">
          <span className={`badge badge-ticket-${ticket.status.toLowerCase()}`}>
            {isValid && <span className="status-dot" aria-hidden="true" />}
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
          <code className="ticket-code">#{qrUuidValue.slice(0, 8).toUpperCase()}</code>
        </div>

        <h3>
          <Link
            to={`/asistente/tickets/${ticket.id}`}
            state={{ ticket }}
            className="ticket-title-link"
            onClick={() => soundFx.transition()}
          >
            {event.name}
          </Link>
        </h3>

        <div className="meta-rows">
          <p className="meta-row">
            <IconMapPin size={14} />
            <span>{event.location}</span>
          </p>
          <p className="meta-row">
            <IconCalendar size={14} />
            <span>{formatRange(event.start_at, event.end_at)}</span>
          </p>
        </div>

        <div className="ticket-card-actions">
          <Link
            to={`/asistente/tickets/${ticket.id}`}
            state={{ ticket }}
            className="btn btn-primary btn-sm btn-icon-label"
            onClick={() => soundFx.transition()}
          >
            <IconQrCode size={15} />
            <span>Ver pase QR</span>
          </Link>
          {isValid && (
            <button
              type="button"
              className="btn btn-outline btn-sm btn-icon-label"
              onClick={() => {
                soundFx.tap()
                onOpenTransfer(ticket)
              }}
            >
              <IconSend size={14} />
              <span>Transferir</span>
            </button>
          )}
        </div>
      </div>

      <Link
        to={`/asistente/tickets/${ticket.id}`}
        state={{ ticket }}
        className="ticket-qr ticket-qr-link"
        aria-label={`Abrir código QR para ${event.name}`}
        onClick={() => soundFx.transition()}
      >
        <div className="ticket-qr-frame">
          <QRCodeSVG
            value={qrUuidValue}
            size={128}
            level="M"
            marginSize={2}
            title={`Entrada ${event.name}`}
          />
        </div>
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
    soundFx.success()
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
          <span className="eyebrow">
            <IconTicket size={13} />
            Billetera digital
          </span>
          <h1>Mis Tickets</h1>
          <p className="muted">
            Hola, {user.first_name}. Abre tu pase QR para ingresar o transfiere una entrada válida a otro asistente.
          </p>
        </div>
        <Link
          to="/asistente/eventos"
          className="btn btn-primary btn-icon-label"
          onClick={() => soundFx.tap()}
        >
          <IconTicket size={16} />
          <span>Comprar / Buscar eventos</span>
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
            className={`tab-pill ${filter === 'ACTIVE' ? 'tab-pill-active' : ''}`}
            onClick={() => {
              soundFx.tap()
              setFilter('ACTIVE')
            }}
          >
            Compras activas
            <span className="tab-count">{activeTickets.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'ALL'}
            className={`tab-pill ${filter === 'ALL' ? 'tab-pill-active' : ''}`}
            onClick={() => {
              soundFx.tap()
              setFilter('ALL')
            }}
          >
            Historial completo
            <span className="tab-count">{tickets.length}</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="skeleton-list" aria-busy="true">
          <div className="card skeleton-card" />
          <div className="card skeleton-card" />
        </div>
      ) : visibleTickets.length === 0 ? (
        <div className="card placeholder empty-state">
          <IconTicket size={28} />
          {tickets.length === 0 ? (
            <p>
              Aún no tienes tickets activos.{' '}
              <Link to="/asistente/eventos" onClick={() => soundFx.tap()}>
                Explora los eventos disponibles
              </Link>
              .
            </p>
          ) : (
            <p>
              No tienes compras activas pendientes por usar.{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  soundFx.tap()
                  setFilter('ALL')
                }}
              >
                Ver historial completo
              </button>
              .
            </p>
          )}
        </div>
      ) : (
        <div className="ticket-list">
          {visibleTickets.map((ticket, index) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              index={index}
              onOpenTransfer={setTicketToTransfer}
            />
          ))}
        </div>
      )}

      <TransferTicketModal
        ticket={ticketToTransfer}
        onClose={() => {
          soundFx.tap()
          setTicketToTransfer(null)
        }}
        onTransferred={handleTransferred}
      />
    </section>
  )
}
