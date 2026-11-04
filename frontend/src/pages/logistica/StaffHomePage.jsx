import { useState } from 'react'
import { ticketsApi } from '../../api/tickets'
import { useAuth } from '../../context/auth-context'

export default function StaffHomePage() {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleValidate = async (e) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setResult(null)
    try {
      const res = await ticketsApi.validate(code.trim())
      setResult({
        type: 'success',
        text: `✅ Entrada validada con éxito. Estado: USADO. Código: ${res.code}`,
      })
      setCode('')
    } catch (err) {
      setResult({
        type: 'error',
        text: `❌ ${err.message || 'Error al validar ticket'}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h1>Control de acceso en puerta</h1>
      <p className="muted">Hola, {user.first_name}. Valida los códigos QR de las entradas para registrar el ingreso al evento.</p>

      <div className="card" style={{ maxWidth: 560, marginTop: '1.25rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Escanear o ingresar código QR</h3>
        <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          Ingresa el identificador único del código QR que porta el asistente en su entrada móvil.
        </p>

        <form onSubmit={handleValidate} className="form">
          <div className="field">
            <label htmlFor="ticket-code">Código QR del ticket</label>
            <input
              id="ticket-code"
              type="text"
              placeholder="Ej: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !code.trim()}>
            {loading ? 'Validando…' : 'Validar Ingreso en Puerta'}
          </button>
        </form>

        {result && (
          <div
            className={`alert ${result.type === 'success' ? 'alert-success' : 'alert-error'}`}
            style={{ marginTop: '1rem' }}
          >
            {result.text}
          </div>
        )}
      </div>
    </section>
  )
}
