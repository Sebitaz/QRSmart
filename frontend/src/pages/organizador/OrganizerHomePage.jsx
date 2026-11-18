import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { eventsApi } from '../../api/events'
import { useAuth } from '../../context/auth-context'

const STATUS_LABELS = {
  PROGRAMADO: 'Programado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

function EventCard({ event }) {
  const percent = Math.round((event.current_occupancy / event.capacity) * 100)
  return (
    <article className="card event-card">
      <div className="event-card-header">
        <h3>{event.name}</h3>
        <span className="badge badge-status">{STATUS_LABELS[event.status] ?? event.status}</span>
      </div>
      <p className="muted">{event.location}</p>
      <p className="muted">
        {dateFormat.format(new Date(event.start_at))} – {dateFormat.format(new Date(event.end_at))}
      </p>
      <div className="occupancy">
        <div className="occupancy-label">
          <span>Aforo</span>
          <strong>{event.current_occupancy} / {event.capacity}</strong>
        </div>
        <div className="occupancy-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${percent}%` }} />
        </div>
      </div>
    </article>
  )
}

export default function OrganizerHomePage() {
  const { user } = useAuth()
  const location = useLocation()
  const created = location.state?.created
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const fetchEvents = () => {
      eventsApi
        .list()
        .then((data) => {
          if (active) {
            setEvents(data)
            setError('')
          }
        })
        .catch((err) => {
          if (active) setError(err.message)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }

    fetchEvents()
    // Actualiza el aforo en tiempo real mientras se escanean tickets en puerta
    const intervalId = setInterval(fetchEvents, 4000)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [])

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Mis eventos</h1>
          <p className="muted">Bienvenido, {user.first_name}. Gestiona tus eventos y su aforo.</p>
        </div>
        <Link to="/organizador/eventos/nuevo" className="btn btn-primary">+ Crear evento</Link>
      </div>

      {created && <div className="alert alert-success" role="status">Evento “{created}” creado correctamente.</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {loading ? (
        <p className="muted">Cargando eventos…</p>
      ) : events.length === 0 ? (
        <div className="card placeholder">
          Aún no has creado eventos. <Link to="/organizador/eventos/nuevo">Crea el primero</Link>.
        </div>
      ) : (
        <div className="event-grid">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </section>
  )
}
