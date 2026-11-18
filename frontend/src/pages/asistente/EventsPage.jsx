import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventsApi } from '../../api/events'
import { ticketsApi } from '../../api/tickets'
import { IconCalendar, IconMapPin, IconQrCode, IconTicket } from '../../components/Icons'
import { formatRange } from '../../utils/dates'
import { soundFx } from '../../utils/sound'

function EventCard({ event, index, onAcquire, acquiring }) {
  const soldOut = event.tickets_available === 0

  let action
  if (event.has_ticket) {
    action = (
      <Link
        to="/asistente/mis-tickets"
        className="btn btn-outline btn-sm btn-icon-label"
        onClick={() => soundFx.tap()}
      >
        <IconQrCode size={15} />
        <span>Ver mi ticket QR</span>
      </Link>
    )
  } else if (soldOut) {
    action = (
      <button className="btn btn-outline btn-sm" disabled>
        Agotado
      </button>
    )
  } else {
    action = (
      <button
        className="btn btn-primary btn-sm btn-icon-label"
        onClick={() => onAcquire(event)}
        disabled={acquiring}
      >
        <IconTicket size={15} />
        <span>{acquiring ? 'Procesando…' : 'Obtener entrada'}</span>
      </button>
    )
  }

  return (
    <article
      className="card event-card stagger-item"
      style={{ '--stagger': index }}
    >
      <div className="event-card-header">
        <h3>{event.name}</h3>
        {event.has_ticket && <span className="badge badge-asistente">Ya tienes entrada</span>}
      </div>

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

      {event.description && <p className="event-description">{event.description}</p>}

      <div className="event-card-footer">
        <span className={soldOut ? 'text-danger availability-pill' : 'muted availability-pill'}>
          {soldOut
            ? 'Sin cupos'
            : `${event.tickets_available} de ${event.capacity} disponibles`}
        </span>
        {action}
      </div>
    </article>
  )
}

export default function EventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acquiringId, setAcquiringId] = useState(null)

  const loadEvents = () =>
    eventsApi
      .available()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    loadEvents()
  }, [])

  const onAcquire = async (event) => {
    soundFx.tap()
    if (!window.confirm(`¿Quieres obtener una entrada para "${event.name}"?`)) return
    setError('')
    setAcquiringId(event.id)
    try {
      const ticket = await ticketsApi.acquire(event.id)
      soundFx.success()
      navigate(`/asistente/tickets/${ticket.id}`, { state: { acquired: event.name, ticket } })
    } catch (err) {
      soundFx.error()
      setError(err.message)
      // puede que se hayan agotado mientras tanto
      loadEvents()
    } finally {
      setAcquiringId(null)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">
            <IconCalendar size={13} />
            Cartelera activa
          </span>
          <h1>Eventos disponibles</h1>
          <p className="muted">Elige un evento y obtén tu entrada digital con código QR único.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error page-notice" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="event-grid" aria-busy="true">
          <div className="card skeleton-card" />
          <div className="card skeleton-card" />
          <div className="card skeleton-card" />
        </div>
      ) : events.length === 0 ? (
        <div className="card placeholder empty-state">
          <IconCalendar size={28} />
          <p>Por ahora no hay eventos disponibles.</p>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              index={index}
              onAcquire={onAcquire}
              acquiring={acquiringId === event.id}
            />
          ))}
        </div>
      )}
    </section>
  )
}
