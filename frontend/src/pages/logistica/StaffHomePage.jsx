import { useEffect, useRef, useState } from 'react'
import { ticketsApi } from '../../api/tickets'
import { useAuth } from '../../context/auth-context'

export default function StaffHomePage() {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentResult, setCurrentResult] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({ permitted: 0, used: 0, invalid: 0, avgLatency: 0 })
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleValidate = async (e) => {
    e?.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return

    setLoading(true)
    const startTime = performance.now()

    try {
      const res = await ticketsApi.validate(trimmed)
      const latency = Math.round(performance.now() - startTime)

      const result = {
        type: 'PERMITTED',
        title: 'Acceso Permitido',
        message: 'Entrada válida y no utilizada. El ticket ha sido marcado como "Usado" en la base de datos.',
        holder: res.holder?.full_name || 'Asistente',
        event: res.event?.name || 'Evento',
        code: res.code,
        usedAt: res.used_at || new Date().toISOString(),
        latency,
      }

      setCurrentResult(result)
      setHistory((prev) => [result, ...prev.slice(0, 7)])
      setStats((prev) => ({
        ...prev,
        permitted: prev.permitted + 1,
        avgLatency: prev.avgLatency ? Math.round((prev.avgLatency + latency) / 2) : latency,
      }))
      setCode('')
    } catch (err) {
      const latency = Math.round(performance.now() - startTime)
      const errData = err.data || {}
      const isAlreadyUsed =
        errData.code === 'ticket_already_used' ||
        err.message?.toLowerCase().includes('ya usado') ||
        err.message?.toLowerCase().includes('usado')

      let result
      if (isAlreadyUsed) {
        result = {
          type: 'USED',
          title: 'Ticket ya usado',
          message:
            '¡ALERTA DE DUPLICIDAD! Este código QR ya fue escaneado e ingresado previamente. Entrada no válida para reingreso.',
          holder: errData.holder || 'Titular registrado',
          event: errData.event || 'Evento',
          usedAt: errData.used_at_formatted || errData.used_at || 'Previamente',
          code: trimmed,
          latency,
        }
        setStats((prev) => ({
          ...prev,
          used: prev.used + 1,
          avgLatency: prev.avgLatency ? Math.round((prev.avgLatency + latency) / 2) : latency,
        }))
      } else {
        result = {
          type: 'INVALID',
          title: 'Ticket Inválido',
          message:
            err.message || 'El código QR no existe en la base de datos o su formato no corresponde a una entrada emitida.',
          code: trimmed,
          latency,
        }
        setStats((prev) => ({
          ...prev,
          invalid: prev.invalid + 1,
          avgLatency: prev.avgLatency ? Math.round((prev.avgLatency + latency) / 2) : latency,
        }))
      }

      setCurrentResult(result)
      setHistory((prev) => [result, ...prev.slice(0, 7)])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleClear = () => {
    setCode('')
    setCurrentResult(null)
    inputRef.current?.focus()
  }

  return (
    <section className="access-control-container">
      <div className="page-header">
        <div>
          <h1>Control de Acceso en Puerta (HU 3.2)</h1>
          <p className="muted">
            Operador de Logística: <strong>{user.first_name} {user.last_name}</strong>. Valida los códigos QR para autorizar el ingreso y prevenir duplicados.
          </p>
        </div>
      </div>

      {/* Métricas en vivo del acceso en puerta */}
      <div className="access-stats-grid">
        <div className="access-stat-card">
          <span className="access-stat-label">Accesos Permitidos</span>
          <span className="access-stat-number is-success">{stats.permitted}</span>
        </div>
        <div className="access-stat-card">
          <span className="access-stat-label">Duplicados Bloqueados</span>
          <span className="access-stat-number is-duplicate">{stats.used}</span>
        </div>
        <div className="access-stat-card">
          <span className="access-stat-label">Tickets Inválidos</span>
          <span className="access-stat-number is-invalid">{stats.invalid}</span>
        </div>
        <div className="access-stat-card">
          <span className="access-stat-label">Latencia de Respuesta</span>
          <span className="access-stat-number is-latency">
            {stats.avgLatency ? `${stats.avgLatency}ms` : '< 200ms'}
          </span>
        </div>
      </div>

      {/* Formulario y entrada de escáner QR */}
      <div className="access-scanner-card">
        <form onSubmit={handleValidate} className="form">
          <div className="field">
            <label htmlFor="access-qr-input">
              Código QR o UUID de la entrada (pistola láser o escáner de cámara)
            </label>
            <div className="access-input-group">
              <input
                ref={inputRef}
                id="access-qr-input"
                type="text"
                placeholder="Pega o escanea el código QR (ej: 7d7d654d-a505-45c3-af00-1aa4e45e7dce)…"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !code.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                {loading ? 'Validando…' : 'Validar Ingreso'}
              </button>
              {code && (
                <button type="button" className="btn btn-outline" onClick={handleClear}>
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Alerta Visual Grande del Resultado (HU 3.2 Criterios 1, 2, 3 y 4) */}
      {currentResult && (
        <div
          className={`access-result-card ${
            currentResult.type === 'PERMITTED'
              ? 'is-permitted'
              : currentResult.type === 'USED'
              ? 'is-used'
              : 'is-invalid'
          }`}
          role="alert"
        >
          <div className="access-result-header">
            <h2 className="access-result-title">
              {currentResult.type === 'PERMITTED' && '✅ ACCESO PERMITIDO'}
              {currentResult.type === 'USED' && '⛔ TICKET YA USADO'}
              {currentResult.type === 'INVALID' && '❌ TICKET INVÁLIDO'}
            </h2>
            <span className={`access-latency-pill ${currentResult.latency < 200 ? 'is-fast' : ''}`}>
              ⚡ {currentResult.latency} ms {currentResult.latency < 200 ? '(< 200ms OK)' : ''}
            </span>
          </div>

          <p className="access-result-message">{currentResult.message}</p>

          <div className="access-details-box">
            {currentResult.holder && (
              <div className="access-detail-field">
                <span className="access-detail-field-label">Titular / Asistente</span>
                <strong className="access-detail-field-value">{currentResult.holder}</strong>
              </div>
            )}
            {currentResult.event && (
              <div className="access-detail-field">
                <span className="access-detail-field-label">Evento</span>
                <strong className="access-detail-field-value">{currentResult.event}</strong>
              </div>
            )}
            {currentResult.usedAt && (
              <div className="access-detail-field">
                <span className="access-detail-field-label">
                  {currentResult.type === 'USED' ? 'Primer uso registrado' : 'Hora de ingreso'}
                </span>
                <span className="access-detail-field-value">
                  {new Date(currentResult.usedAt).toLocaleString('es-CO')}
                </span>
              </div>
            )}
            <div className="access-detail-field">
              <span className="access-detail-field-label">Código QR</span>
              <code className="access-detail-field-value" style={{ fontSize: '0.82rem' }}>
                {currentResult.code}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Historial reciente de escaneos en la sesión */}
      {history.length > 0 && (
        <div className="access-history-section">
          <div className="access-history-header">
            <h3>Historial de Escaneos Recientes</h3>
            <span className="muted" style={{ fontSize: '0.8rem' }}>Últimos registros en puerta</span>
          </div>

          <table className="access-history-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Asistente / Evento</th>
                <th>Código QR</th>
                <th>Latencia</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, idx) => (
                <tr key={`${item.code}-${idx}`}>
                  <td>
                    <span
                      className={`badge ${
                        item.type === 'PERMITTED'
                          ? 'badge-ticket-valido'
                          : item.type === 'USED'
                          ? 'badge-ticket-usado'
                          : 'badge-ticket-anulado'
                      }`}
                    >
                      {item.title}
                    </span>
                  </td>
                  <td>
                    <strong>{item.holder || 'Sin titular'}</strong>
                    {item.event && <div className="muted" style={{ fontSize: '0.78rem' }}>{item.event}</div>}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem' }}>{item.code.slice(0, 8)}…</code>
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>{item.latency} ms</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
