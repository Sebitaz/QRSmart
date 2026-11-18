import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { eventsApi } from '../../api/events'
import { IconCalendar, IconMapPin, IconPlus } from '../../components/Icons'
import { useAuth } from '../../context/auth-context'
import { soundFx } from '../../utils/sound'

const STATUS_LABELS = {
  PROGRAMADO: 'Programado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

function EventCard({ event, index }) {
  const percent = Math.min(100, Math.round((event.current_occupancy / event.capacity) * 100))
  const barTone = percent >= 100 ? 'occupancy-full' : percent >= 85 ? 'occupancy-high' : ''

  return (
    <article
      className={`card event-card stagger-item ${barTone}`}
      style={{ '--stagger': index }}
    >
      <div className="event-card-header">
        <h3>{event.name}</h3>
        <span className="badge badge-status">{STATUS_LABELS[event.status] ?? event.status}</span>
      </div>

      <div className="meta-rows">
        <p className="meta-row">
          <IconMapPin size={14} />
          <span>{event.location}</span>
        </p>
        <p className="meta-row">
          <IconCalendar size={14} />
          <span>
            {dateFormat.format(new Date(event.start_at))} – {dateFormat.format(new Date(event.end_at))}
          </span>
        </p>
      </div>

      <div className="occupancy">
        <div className="occupancy-label">
          <span>Aforo registrado</span>
          <strong className="tabular-nums">
            {event.current_occupancy} / {event.capacity}{' '}
            <span className="occupancy-pct">({percent}%)</span>
          </strong>
        </div>
        <div
          className="occupancy-bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
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

  const totalOccupancy = events.reduce((sum, ev) => sum + ev.current_occupancy, 0)
  const totalCapacity = events.reduce((sum, ev) => sum + ev.capacity, 0)

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow eyebrow-live">
            <span className="live-pulse-dot" aria-hidden="true" />
            Telemetría de aforo en vivo
          </span>
          <h1>Mis eventos</h1>
          <p className="muted">Bienvenido, {user.first_name}. Gestiona tus eventos y su aforo en puerta.</p>
        </div>
        <Link
          to="/organizador/eventos/nuevo"
          className="btn btn-primary btn-icon-label"
          onClick={() => soundFx.tap()}
        >
          <IconPlus size={16} />
          <span>Crear evento</span>
        </Link>
      </div>

      {!loading && events.length > 0 && (
        <div className="kpi-strip">
          <div className="kpi-pill">
            <span className="kpi-label">Eventos activos</span>
            <strong className="kpi-value tabular-nums">{events.length}</strong>
          </div>
          <div className="kpi-pill">
            <span className="kpi-label">Asistentes dentro</span>
            <strong className="kpi-value tabular-nums">{totalOccupancy}</strong>
          </div>
          <div className="kpi-pill">
            <span className="kpi-label">Capacidad total</span>
            <strong className="kpi-value tabular-nums">{totalCapacity}</strong>
          </div>
        </div>
      )}

      {created && (
        <div className="alert alert-success page-notice" role="status">
          Evento “{created}” creado correctamente.
        </div>
      )}
      {error && (
        <div className="alert alert-error page-notice" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="event-grid" aria-busy="true">
          <div className="card skeleton-card" />
          <div className="card skeleton-card" />
        </div>
      ) : events.length === 0 ? (
        <div className="card placeholder empty-state">
          <IconCalendar size={28} />
          <p>
            Aún no has creado eventos.{' '}
            <Link to="/organizador/eventos/nuevo" onClick={() => soundFx.tap()}>
              Crea el primero
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </div>
      )}
    </section>
  )
}
