import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import { useAuth } from '../context/auth-context'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form.email, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="card">
        <h1 className="brand">QR<span>Smart</span></h1>
        <p className="subtitle">Inicia sesión para continuar</p>

        <form className="form" onSubmit={onSubmit} noValidate>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <FormField
            label="Email" name="email" type="email" autoComplete="email" required
            value={form.email} onChange={onChange}
          />
          <FormField
            label="Contraseña" name="password" type="password" autoComplete="current-password" required
            value={form.password} onChange={onChange}
          />
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="center muted">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </div>
    </main>
  )
}
