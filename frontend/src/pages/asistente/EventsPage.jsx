import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventsApi } from '../../api/events'
import { ticketsApi } from '../../api/tickets'
import { formatRange } from '../../utils/dates'

function EventCard({ event, onAcquire, acquiring }) {
  const soldOut = event.tickets_available === 0

  let action
  if (event.has_ticket) {
    action = <Link to="/asistente" className="btn btn-outline">Ver mi entrada</Link>
  } else if (soldOut) {
    action = <button className="btn btn-outline" disabled>Agotado</button>
  } else {
    action = (
      <button className="btn btn-primary" onClick={() => onAcquire(event)} disabled={acquiring}>
        {acquiring ? 'Procesando…' : 'Obtener entrada'}
      </button>
    )
  }

  return (
    <article className="card event-card">
      <div className="event-card-header">
        <h3>{event.name}</h3>
        {event.has_ticket && <span className="badge badge-asistente">Ya tienes entrada</span>}
      </div>
      <p className="muted">{event.location}</p>
      <p className="muted">{formatRange(event.start_at, event.end_at)}</p>
      {event.description && <p className="event-description">{event.description}</p>}
      <div className="event-card-footer">
        <span className={soldOut ? 'text-danger' : 'muted'}>
          {soldOut ? 'Sin cupos' : `${event.tickets_available} de ${event.capacity} disponibles`}
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
    if (!window.confirm(`¿Quieres obtener una entrada para "${event.name}"?`)) return
    setError('')
    setAcquiringId(event.id)
    try {
      await ticketsApi.acquire(event.id)
      navigate('/asistente', { state: { acquired: event.name } })
    } catch (err) {
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
          <h1>Eventos disponibles</h1>
          <p className="muted">Elige un evento y obtén tu entrada con código QR.</p>
        </div>
      </div>

      {error && <div className="alert alert-error page-notice" role="alert">{error}</div>}

      {loading ? (
        <p className="muted">Cargando eventos…</p>
      ) : events.length === 0 ? (
        <div className="card placeholder">Por ahora no hay eventos disponibles.</div>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onAcquire={onAcquire}
              acquiring={acquiringId === event.id}
            />
          ))}
        </div>
      )}
    </section>
  )
}
