import { useEffect, useState } from 'react'
import { ticketsApi } from '../api/tickets'
import { soundFx } from '../utils/sound'
import { IconSend, IconShield } from './Icons'

export default function TransferTicketModal({ ticket, onClose, onTransferred }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  if (!ticket) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      soundFx.error()
      setFieldError('Ingresa el correo electrónico del destinatario.')
      return
    }

    setSubmitting(true)
    setError('')
    setFieldError('')

    try {
      const response = await ticketsApi.transfer(ticket.id, trimmedEmail)
      onTransferred(ticket, response)
    } catch (err) {
      soundFx.error()
      if (err.fieldErrors?.email) {
        setFieldError(err.fieldErrors.email)
      } else {
        setError(err.message || 'No fue posible completar la transferencia.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <span className="badge badge-asistente badge-icon-row">
              <IconShield size={12} />
              Transferencia atómica segura
            </span>
            <h2 id="transfer-modal-title">Transferir ticket</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        <div className="modal-ticket-summary">
          <strong>{ticket.event.name}</strong>
          <span className="muted">
            Código #{String(ticket.code).slice(0, 8).toUpperCase()} · {ticket.event.location}
          </span>
        </div>

        <p className="modal-warning">
          Al confirmar, tu código QR actual quedará invalidado de inmediato y el destinatario
          recibirá la entrada con un nuevo código QR en su cuenta.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="recipient-email">Correo electrónico del destinatario</label>
            <input
              id="recipient-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (fieldError) setFieldError('')
              }}
              disabled={submitting}
              autoFocus
              required
            />
            {fieldError && <span className="field-error">{fieldError}</span>}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-icon-label" disabled={submitting}>
              <IconSend size={15} />
              <span>{submitting ? 'Transfiriendo…' : 'Confirmar transferencia'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
