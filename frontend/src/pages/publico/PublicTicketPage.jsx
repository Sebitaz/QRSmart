import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ticketsApi } from '../../api/tickets'
import { formatDate, formatRange } from '../../utils/dates'

const STATUS = {
  VALIDO: { title: 'Entrada válida', hint: 'Presenta este código en la entrada del evento.' },
  USADO: { title: 'Entrada ya utilizada', hint: null },
  ANULADO: { title: 'Entrada anulada', hint: 'Esta entrada ya no permite el ingreso.' },
}

export default function PublicTicketPage() {
  const { code } = useParams()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ticketsApi
      .public(code)
      .then(setTicket)
      .catch((err) =>
        setError(err.status === 404 ? 'No encontramos ninguna entrada con este código.' : err.message),
      )
  }, [code])

  const status = ticket && (STATUS[ticket.status] ?? { title: ticket.status_display, hint: null })
  const eventCancelled = ticket?.event.status === 'CANCELADO'

  return (
    <main className="public-ticket-page">
      <p className="brand">QR<span>Smart</span></p>

      {!ticket && !error && <p className="muted">Cargando entrada…</p>}

      {error && (
        <div className="card public-ticket">
          <div className="public-ticket-status status-anulado">
            <strong>Entrada no encontrada</strong>
          </div>
          <div className="public-ticket-body">
            <p className="muted">{error}</p>
          </div>
        </div>
      )}

      {ticket && (
        <article className="card public-ticket">
          <div className={`public-ticket-status status-${ticket.status.toLowerCase()}`}>
            <strong>{status.title}</strong>
            {ticket.status === 'USADO' && ticket.used_at && (
              <span>Ingresó el {formatDate(ticket.used_at)}</span>
            )}
            {status.hint && <span>{status.hint}</span>}
          </div>

          <div className="public-ticket-body">
            <h1>{ticket.event.name}</h1>
            {eventCancelled && (
              <div className="alert alert-error">Este evento fue cancelado.</div>
            )}
            <dl className="public-ticket-details">
              <div>
                <dt>Lugar</dt>
                <dd>{ticket.event.location}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatRange(ticket.event.start_at, ticket.event.end_at)}</dd>
              </div>
              <div>
                <dt>Titular</dt>
                <dd>{ticket.holder_name}</dd>
              </div>
              <div>
                <dt>Código</dt>
                <dd><code className="ticket-code">{ticket.code.slice(0, 8).toUpperCase()}</code></dd>
              </div>
            </dl>
          </div>
        </article>
      )}

      <Link to="/login" className="muted public-ticket-footer">Ir a QRSmart</Link>
    </main>
  )
}
