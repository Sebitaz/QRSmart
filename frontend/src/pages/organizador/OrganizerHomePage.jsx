import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { eventsApi } from '../../api/events'
import { ticketsApi } from '../../api/tickets'
import { useAuth } from '../../context/auth-context'

const STATUS_LABELS = {
  PROGRAMADO: 'Programado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const timeFormat = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

function EventCard({ event }) {
  const percent = event.capacity ? Math.round((event.current_occupancy / event.capacity) * 100) : 0
  const isCritical = percent >= 90
  const isWarning = percent >= 80 && percent < 90
  const remaining = Math.max(event.capacity - event.current_occupancy, 0)

  let alertLevelClass = ''
  let barLevelClass = 'is-normal'
  if (isCritical) {
    alertLevelClass = 'is-danger'
    barLevelClass = 'is-danger'
  } else if (isWarning) {
    alertLevelClass = 'is-warning'
    barLevelClass = 'is-warning'
  }

  return (
    <article className={`card event-card ${alertLevelClass}`}>
      <div className="event-card-header">
        <div>
          <h3>{event.name}</h3>
          <span className="badge badge-status">{STATUS_LABELS[event.status] ?? event.status}</span>
        </div>
        {isCritical && (
          <span className="badge badge-alert-danger" title="Aforo al 90% o más de capacidad">
            {percent >= 100 ? '⛔ 100% Aforo' : `🚨 ${percent}% Crítico`}
          </span>
        )}
        {isWarning && (
          <span className="badge badge-alert-warning" title="Aforo preventivo (80% a 89%)">
            ⚠️ {percent}% Alto
          </span>
        )}
      </div>

      <p className="muted">{event.location}</p>
      <p className="muted">
        {dateFormat.format(new Date(event.start_at))} – {dateFormat.format(new Date(event.end_at))}
      </p>

      {/* Indicador de Aforo Actual vs Capacidad Máxima (HU 1.2) */}
      <div className="occupancy">
        <div className="occupancy-header">
          <span className="occupancy-title">Aforo Actual</span>
          <span className="occupancy-value" aria-label={`Aforo: ${event.current_occupancy} de ${event.capacity}`}>
            <strong>{event.current_occupancy}</strong> / {event.capacity}
          </span>
        </div>

        <div
          className={`occupancy-bar ${barLevelClass}`}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>

        <div className="occupancy-stats">
          <span>{percent}% ocupado</span>
          <span>{remaining} cupos restantes</span>
        </div>

        {/* Alerta visual cuando el aforo alcance el 90% o más (HU 1.2) */}
        {isCritical && (
          <div className="alert-card-box alert-card-danger" role="alert">
            <span>🚨</span>
            <div>
              <strong>Alerta de Seguridad (≥90% de Aforo):</strong>
              <br />
              {percent >= 100
                ? 'Capacidad máxima alcanzada. No se debe permitir más ingresos.'
                : `Aforo al ${percent}%. Se ha alcanzado el umbral normativo del 90%.`}
            </div>
          </div>
        )}
        {isWarning && (
          <div className="alert-card-box alert-card-warning" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Aviso preventivo:</strong> El evento está al {percent}% de capacidad.
            </div>
          </div>
        )}
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
  const [lastSync, setLastSync] = useState(() => new Date())
  const [isLive, setIsLive] = useState(true)

  // Validador / Simulador de escaneo en puerta
  const [showScanner, setShowScanner] = useState(false)
  const [qrInput, setQrInput] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState(null)

  const reloadEvents = useCallback(() => {
    return eventsApi
      .list()
      .then((data) => {
        setEvents(data)
        setLastSync(new Date())
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Carga inicial y polling en vivo cada 3 segundos (HU 1.2: actualización inmediata tras escaneo)
  useEffect(() => {
    reloadEvents()
    if (!isLive) return
    const interval = setInterval(reloadEvents, 3000)
    return () => clearInterval(interval)
  }, [isLive, reloadEvents])

  const handleValidateTicket = async (e) => {
    e.preventDefault()
    const trimmed = qrInput.trim()
    if (!trimmed) return

    if (trimmed.length < 32) {
      setScanMessage({
        type: 'error',
        text: `El código ingresado ("${trimmed}") es solo una abreviación visual (8 caracteres). Debes ingresar el código QR completo de 36 caracteres (UUID). Puedes copiarlo con un clic desde "Mis entradas" del asistente.`,
      })
      return
    }

    setScanLoading(true)
    setScanMessage(null)
    try {
      const res = await ticketsApi.validate(trimmed)
      setScanMessage({
        type: 'success',
        text: `✅ ${res.message || 'Acceso Permitido'}: Entrada validada. Asistente: ${res.holder?.full_name || 'Asistente'} (${res.event?.name || 'Evento'}). El aforo se actualizó en vivo.`,
      })
      setQrInput('')
      await reloadEvents() // Actualiza inmediatamente el aforo
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: `❌ ${err.message || 'Error al validar ticket.'}`,
      })
    } finally {
      setScanLoading(false)
    }
  }

  // Identificar si algún evento está en alerta crítica (≥90%)
  const criticalEvents = events.filter((ev) => ev.capacity && (ev.current_occupancy / ev.capacity) >= 0.9)

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Dashboard de Aforo</h1>
          <p className="muted">Bienvenido, {user.first_name}. Monitorea en vivo el aforo y la capacidad máxima de tus eventos.</p>
        </div>

        <div className="dashboard-controls">
          <div className="live-pill" title="Actualización automática periódica en segundo plano">
            <span className={`live-dot ${isLive ? 'active' : 'paused'}`} />
            <span>{isLive ? 'En vivo' : 'En pausa'}</span>
            <button
              type="button"
              className="btn-outline btn-sm"
              style={{ padding: '0.15rem 0.45rem', fontSize: '0.75rem', marginLeft: '0.25rem' }}
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? 'Pausar' : 'Reanudar'}
            </button>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={reloadEvents}
            title="Sincronizar aforo de inmediato"
          >
            🔄 Actualizar ({timeFormat.format(lastSync)})
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowScanner(!showScanner)}
          >
            {showScanner ? 'Ocultar Escáner' : '📷 Simular Escaneo'}
          </button>

          <Link to="/organizador/eventos/nuevo" className="btn btn-primary btn-sm">+ Crear evento</Link>
        </div>
      </div>

      {/* Alerta general si algún evento llegó al 90% de capacidad */}
      {criticalEvents.length > 0 && (
        <div className="banner-aforo-alert is-danger" role="alert">
          <div>
            <strong>🚨 ALERTA DE AFORO (≥90% DE CAPACIDAD ALCANZADA)</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
              {criticalEvents.map((ev) => (
                <span key={ev.id} style={{ display: 'block' }}>
                  • El evento <strong>“{ev.name}”</strong> ha alcanzado{' '}
                  <strong>{ev.current_occupancy} / {ev.capacity}</strong> personas (
                  {Math.round((ev.current_occupancy / ev.capacity) * 100)}% de ocupación).
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Simulador rápido de escaneo en puerta para pruebas y evaluación */}
      {showScanner && (
        <div className="sim-box">
          <div className="sim-header">
            <strong>📷 Validador de Códigos QR en Puerta (Simulador en Vivo)</strong>
            <span className="muted" style={{ fontSize: '0.8rem' }}>Permite probar el escaneo de entrada y ver el aforo cambiar al instante</span>
          </div>

          <form onSubmit={handleValidateTicket} className="sim-form">
            <input
              type="text"
              placeholder="Pega el UUID completo del QR (ej. 7d7d654d-a505-45c3-af00-1aa4e45e7dce)…"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              disabled={scanLoading}
            />
            <button type="submit" className="btn btn-primary" disabled={scanLoading || !qrInput.trim()}>
              {scanLoading ? 'Validando…' : 'Validar Entrada'}
            </button>
          </form>
          <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.8rem' }}>
            💡 <em>Tip:</em> Los códigos QR contienen un identificador UUID completo de 36 caracteres. En la pestaña de asistente haz clic sobre el código para copiarlo al portapapeles.
          </p>

          {scanMessage && (
            <div
              className={`alert ${scanMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}
              style={{ marginTop: '0.75rem' }}
            >
              {scanMessage.text}
            </div>
          )}
        </div>
      )}

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
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}
