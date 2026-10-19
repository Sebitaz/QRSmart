import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ticketsApi } from '../../api/tickets'
import { formatDate, formatRange } from '../../utils/dates'

const STATUS_META = {
  VALIDO: {
    label: 'Entrada válida · Lista para escanear',
    badgeClass: 'badge-ticket-valido',
    shortLabel: 'Válida',
  },
  USADO: {
    label: 'Entrada ya utilizada en puerta',
    badgeClass: 'badge-ticket-usado',
    shortLabel: 'Usada',
  },
  ANULADO: {
    label: 'Entrada anulada',
    badgeClass: 'badge-ticket-anulado',
    shortLabel: 'Anulada',
  },
}

export default function TicketDetailPage() {
  const { ticketId } = useParams()
  const location = useLocation()
  const acquired = location.state?.acquired

  const initialTicket = location.state?.ticket?.id === ticketId ? location.state.ticket : null
  const [ticket, setTicket] = useState(initialTicket)
  const [loading, setLoading] = useState(!initialTicket)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    ticketsApi
      .get(ticketId)
      .then((data) => {
        if (active) {
          setTicket(data)
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'No se pudo cargar el ticket.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [ticketId])

  const handleCopyUuid = async () => {
    if (!ticket?.code) return
    try {
      await navigator.clipboard.writeText(String(ticket.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback silencioso si el navegador bloquea el portapapeles
    }
  }

  if (loading && !ticket) {
    return (
      <section className="wallet-container">
        <p className="center muted">Cargando tu ticket digital…</p>
      </section>
    )
  }

  if (error || !ticket) {
    return (
      <section className="wallet-container">
        <Link to="/asistente/mis-tickets" className="back-link">
          ← Volver a Mis Tickets
        </Link>
        <div className="alert alert-error" role="alert">
          {error || 'No se encontró el ticket solicitado.'}
        </div>
      </section>
    )
  }

  const { event } = ticket
  const isValid = ticket.status === 'VALIDO'
  const statusInfo = STATUS_META[ticket.status] ?? {
    label: ticket.status,
    badgeClass: 'badge-status',
    shortLabel: ticket.status,
  }

  // REGLA ESTRICTA HU 2.2: El QR contiene única y exclusivamente el UUID del ticket generado por el backend
  const qrUuidValue = String(ticket.code)

  return (
    <section className="wallet-container">
      <Link to="/asistente/mis-tickets" className="back-link">
        ← Volver a Mis Tickets
      </Link>

      {acquired && (
        <div className="alert alert-success page-notice" role="status">
          ¡Compra confirmada! Aquí tienes tu ticket digital para “{acquired}”.
        </div>
      )}

      <article className={`wallet-pass ${isValid ? '' : 'wallet-pass-inactive'}`}>
        <header className="wallet-pass-header">
          <div className="wallet-pass-brand">
            <span className="brand">
              QR<span>Smart</span> Pass
            </span>
            <span className={`badge ${statusInfo.badgeClass}`}>{statusInfo.shortLabel}</span>
          </div>
          <h1 className="wallet-event-title">{event.name}</h1>
          <p className="wallet-status-caption">{statusInfo.label}</p>
        </header>

        <div className="wallet-qr-section">
          <div className="wallet-qr-frame" aria-label="Código QR de acceso al evento">
            <QRCodeSVG
              value={qrUuidValue}
              size={240}
              level="M"
              marginSize={3}
              title={`Ticket QR · ${event.name}`}
            />
          </div>
          <p className="wallet-qr-hint">
            Presenta este código en la entrada. Sube el brillo de tu pantalla al máximo.
          </p>

          <div className="wallet-uuid-box">
            <span className="wallet-uuid-label">UUID DEL TICKET</span>
            <code className="wallet-uuid-value">{qrUuidValue}</code>
            <button
              type="button"
              className="btn btn-outline btn-sm wallet-copy-btn"
              onClick={handleCopyUuid}
            >
              {copied ? '¡UUID copiado!' : 'Copiar código'}
            </button>
          </div>
        </div>

        <div className="wallet-divider" aria-hidden="true">
          <span className="wallet-notch wallet-notch-left" />
          <span className="wallet-perforation" />
          <span className="wallet-notch wallet-notch-right" />
        </div>

        <footer className="wallet-pass-details">
          <div className="wallet-detail-grid">
            <div className="wallet-detail-item">
              <span className="wallet-detail-label">Lugar</span>
              <strong className="wallet-detail-value">{event.location}</strong>
            </div>
            <div className="wallet-detail-item">
              <span className="wallet-detail-label">Horario del evento</span>
              <strong className="wallet-detail-value">
                {formatRange(event.start_at, event.end_at)}
              </strong>
            </div>
            <div className="wallet-detail-item">
              <span className="wallet-detail-label">Adquirido el</span>
              <span className="wallet-detail-value">{formatDate(ticket.created_at)}</span>
            </div>
            {ticket.used_at && (
              <div className="wallet-detail-item">
                <span className="wallet-detail-label">Validado en puerta</span>
                <span className="wallet-detail-value">{formatDate(ticket.used_at)}</span>
              </div>
            )}
          </div>
          <p className="wallet-privacy-note">
            🔒 Privacidad protegida: este QR solo codifica el UUID único de tu entrada sin incluir
            datos personales.
          </p>
        </footer>
      </article>
    </section>
  )
}

