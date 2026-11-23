import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { eventsApi } from '../../api/events'
import { ticketsApi } from '../../api/tickets'
import { IconAlert, IconCalendar, IconMapPin, IconPlus, IconQrCode } from '../../components/Icons'
import { useAuth } from '../../context/auth-context'
import { soundFx } from '../../utils/sound'

const STATUS_LABELS = {
  PROGRAMADO: 'Programado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const timeFormat = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function EventCard({ event, index }) {
  const percent = event.capacity
    ? Math.min(100, Math.round((event.current_occupancy / event.capacity) * 100))
    : 0
  const isCritical = percent >= 90
  const isWarning = percent >= 80 && percent < 90
  const remaining = Math.max(event.capacity - event.current_occupancy, 0)
  const barTone = isCritical ? 'occupancy-critical' : isWarning ? 'occupancy-high' : ''

  return (
    <article
      className={`card event-card stagger-item ${barTone}`}
      style={{ '--stagger': index }}
    >
      <div className="event-card-header">
        <div>
          <h3>{event.name}</h3>
          <span className="badge badge-status">{STATUS_LABELS[event.status] ?? event.status}</span>
        </div>
        {isCritical && (
          <span className="badge badge-ticket-anulado" title="Aforo al 90% o más de capacidad">
            {percent >= 100 ? '100% Lleno' : `${percent}% Crítico`}
          </span>
        )}
        {isWarning && (
          <span className="badge badge-logistica" title="Aforo preventivo (80% a 89%)">
            {percent}% Alto
          </span>
        )}
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
          <span>Aforo actual</span>
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
        <div className="occupancy-submeta">
          <span className="muted tabular-nums">
            {remaining === 0 ? 'Sin cupos restantes' : `${remaining} cupos libres`}
          </span>
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
  const [isLive, setIsLive] = useState(true)
  const [lastSync, setLastSync] = useState(() => new Date())
  const [showSimulator, setShowSimulator] = useState(false)
  const [qrInput, setQrInput] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState(null)

  const fetchEvents = useCallback(() => {
    return eventsApi
      .list()
      .then((data) => {
        setEvents(data)
        setLastSync(new Date())
        setError('')
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (!isLive) return undefined
    const intervalId = setInterval(fetchEvents, 4000)
    return () => clearInterval(intervalId)
  }, [isLive, fetchEvents])

  const handleSimulateValidation = async (e) => {
    e.preventDefault()
    const code = qrInput.trim()
    if (!code) return

    setScanLoading(true)
    setScanMessage(null)
    try {
      const res = await ticketsApi.validate(code)
      soundFx.scanAllowed()
      setScanMessage({
        type: 'success',
        text: `Ingreso registrado: ${res.holder?.full_name ?? 'Asistente'} (${res.event?.name ?? 'Evento'})`,
      })
      setQrInput('')
      await fetchEvents()
    } catch (err) {
      soundFx.error()
      setScanMessage({
        type: 'error',
        text: err.message || 'No se pudo validar el código QR.',
      })
    } finally {
      setScanLoading(false)
    }
  }

  const totalOccupancy = events.reduce((sum, ev) => sum + ev.current_occupancy, 0)
  const totalCapacity = events.reduce((sum, ev) => sum + ev.capacity, 0)
  const criticalEvents = events.filter(
    (ev) => ev.capacity && ev.current_occupancy / ev.capacity >= 0.9
  )

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow eyebrow-live">
            <span className={`live-pulse-dot ${isLive ? '' : 'paused'}`} aria-hidden="true" />
            {isLive ? `Telemetría en vivo · ${timeFormat.format(lastSync)}` : 'Telemetría en pausa'}
          </span>
          <h1>Dashboard de Aforo</h1>
          <p className="muted">
            Bienvenido, {user.first_name}. Monitorea en tiempo real el ingreso y la capacidad máxima de tus eventos.
          </p>
        </div>

        <div className="organizer-header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              soundFx.tap()
              setIsLive((prev) => !prev)
            }}
          >
            {isLive ? 'Pausar vivo' : 'Reanudar vivo'}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm btn-icon-label"
            onClick={() => {
              soundFx.tap()
              setShowSimulator((prev) => !prev)
            }}
          >
            <IconQrCode size={15} />
            <span>{showSimulator ? 'Ocultar validador' : 'Validar por UUID'}</span>
          </button>
          <Link
            to="/organizador/eventos/nuevo"
            className="btn btn-primary btn-sm btn-icon-label"
            onClick={() => soundFx.tap()}
          >
            <IconPlus size={15} />
            <span>Crear evento</span>
          </Link>
        </div>
      </div>

      {criticalEvents.length > 0 && (
        <div className="alert alert-error page-notice capacity-alert-banner" role="alert">
          <IconAlert size={20} />
          <div>
            <strong>Alerta preventiva de aforo (≥90% de capacidad alcanzada)</strong>
            <div className="capacity-alert-list">
              {criticalEvents.map((ev) => (
                <span key={ev.id}>
                  • <strong>{ev.name}</strong>: {ev.current_occupancy} / {ev.capacity} asistentes (
                  {Math.round((ev.current_occupancy / ev.capacity) * 100)}%)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSimulator && (
        <div className="card simulator-card page-notice">
          <div className="simulator-header">
            <strong>Validador rápido de tickets en puerta</strong>
            <span className="muted">
              Ingresa el UUID de un ticket para registrar su acceso y actualizar el aforo al instante.
            </span>
          </div>
          <form className="scanner-manual-row" onSubmit={handleSimulateValidation}>
            <input
              type="text"
              placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              disabled={scanLoading}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={scanLoading || !qrInput.trim()}
            >
              {scanLoading ? 'Validando…' : 'Registrar ingreso'}
            </button>
          </form>
          {scanMessage && (
            <div
              className={`alert ${scanMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}
              role="status"
            >
              {scanMessage.text}
            </div>
          )}
        </div>
      )}

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
