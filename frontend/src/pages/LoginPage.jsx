import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import { BrandLogo } from '../components/Icons'
import { homeForRole } from '../constants/roles'
import { useAuth } from '../context/auth-context'
import { soundFx } from '../utils/sound'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(form.email, form.password)
      soundFx.transition()
      navigate(location.state?.from ?? homeForRole(user.role), { replace: true })
    } catch (err) {
      soundFx.error()
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="card auth-card">
        <div className="auth-brand-header">
          <BrandLogo size={42} />
          <h1 className="brand">
            QR<span>Smart</span>
          </h1>
          <p className="subtitle">Control inteligente de aforo y pases digitales</p>
        </div>

        <form className="form" onSubmit={onSubmit} noValidate>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <FormField
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@correo.com"
            required
            value={form.email}
            onChange={onChange}
          />
          <FormField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={form.password}
            onChange={onChange}
          />
          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="center muted auth-footer-link">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" onClick={() => soundFx.tap()}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  )
}
