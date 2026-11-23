import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ticketsApi } from '../../api/tickets'
import {
  BrandLogo,
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconCopy,
  IconMapPin,
  IconSend,
  IconShield,
} from '../../components/Icons'
import TransferTicketModal from '../../components/TransferTicketModal'
import { formatDate, formatRange } from '../../utils/dates'
import { soundFx } from '../../utils/sound'

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
  const navigate = useNavigate()
  const acquired = location.state?.acquired

  const initialTicket = location.state?.ticket?.id === ticketId ? location.state.ticket : null
  const [ticket, setTicket] = useState(initialTicket)
  const [loading, setLoading] = useState(!initialTicket)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

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
      soundFx.transition()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback silencioso si el navegador bloquea el portapapeles
    }
  }

  if (loading && !ticket) {
    return (
      <section className="wallet-container">
        <div className="card skeleton-card wallet-skeleton" />
      </section>
    )
  }

  if (error || !ticket) {
    return (
      <section className="wallet-container">
        <Link to="/asistente/mis-tickets" className="back-link" onClick={() => soundFx.tap()}>
          <IconArrowLeft size={15} />
          <span>Volver a Mis Tickets</span>
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
      <Link to="/asistente/mis-tickets" className="back-link" onClick={() => soundFx.tap()}>
        <IconArrowLeft size={15} />
        <span>Volver a Mis Tickets</span>
      </Link>

      {acquired && (
        <div className="alert alert-success page-notice" role="status">
          ¡Compra confirmada! Aquí tienes tu ticket digital para “{acquired}”.
        </div>
      )}

      <article className={`wallet-pass ${isValid ? 'wallet-pass-valid' : 'wallet-pass-inactive'}`}>
        <div className="wallet-foil-strip" aria-hidden="true" />

        <header className="wallet-pass-header">
          <div className="wallet-pass-brand">
            <div className="wallet-brand-lockup">
              <BrandLogo size={22} />
              <span className="brand">
                QR<span>Smart</span> Pass
              </span>
            </div>
            <span className={`badge ${statusInfo.badgeClass}`}>
              {isValid && <span className="status-dot" aria-hidden="true" />}
              {statusInfo.shortLabel}
            </span>
          </div>
          <h1 className="wallet-event-title">{event.name}</h1>
          <p className="wallet-status-caption">{statusInfo.label}</p>
        </header>

        <div className="wallet-qr-section">
          <div className="wallet-qr-frame" aria-label="Código QR de acceso al evento">
            <span className="qr-crop qr-crop-tl" aria-hidden="true" />
            <span className="qr-crop qr-crop-tr" aria-hidden="true" />
            <span className="qr-crop qr-crop-bl" aria-hidden="true" />
            <span className="qr-crop qr-crop-br" aria-hidden="true" />
            <QRCodeSVG
              value={qrUuidValue}
              size={232}
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
            <div className="wallet-action-row">
              <button
                type="button"
                className={`btn btn-sm btn-icon-label ${copied ? 'btn-primary' : 'btn-outline'}`}
                onClick={handleCopyUuid}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                <span>{copied ? 'UUID copiado' : 'Copiar código'}</span>
              </button>
              {isValid && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm btn-icon-label"
                  onClick={() => {
                    soundFx.tap()
                    setShowTransferModal(true)
                  }}
                >
                  <IconSend size={14} />
                  <span>Transferir entrada</span>
                </button>
              )}
            </div>
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
              <span className="wallet-detail-label">
                <IconMapPin size={12} />
                Lugar
              </span>
              <strong className="wallet-detail-value">{event.location}</strong>
            </div>
            <div className="wallet-detail-item">
              <span className="wallet-detail-label">
                <IconCalendar size={12} />
                Horario del evento
              </span>
              <strong className="wallet-detail-value">
                {formatRange(event.start_at, event.end_at)}
              </strong>
            </div>
            <div className="wallet-detail-row-split">
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
          </div>
          <p className="wallet-privacy-note">
            <IconShield size={14} />
            <span>
              Privacidad protegida: este QR solo codifica el UUID único de tu entrada sin datos personales.
            </span>
          </p>
        </footer>
      </article>

      <TransferTicketModal
        ticket={showTransferModal ? ticket : null}
        onClose={() => {
          soundFx.tap()
          setShowTransferModal(false)
        }}
        onTransferred={(transferredTicket, response) => {
          soundFx.success()
          navigate('/asistente/mis-tickets', {
            replace: true,
            state: {
              transferredNotice: `¡Listo! Transferiste tu entrada de “${transferredTicket.event.name}” a ${response.recipient_email}.`,
            },
          })
        }}
      />
    </section>
  )
}
