import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import { BrandLogo } from '../components/Icons'
import { homeForRole } from '../constants/roles'
import { useAuth } from '../context/auth-context'
import { soundFx } from '../utils/sound'

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  role: 'ASISTENTE',
  password: '',
  password_confirm: '',
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrors({})
    if (form.password !== form.password_confirm) {
      soundFx.error()
      setErrors({ password_confirm: 'Las contraseñas no coinciden.' })
      return
    }
    setSubmitting(true)
    try {
      const user = await register(form)
      soundFx.success()
      navigate(homeForRole(user.role), { replace: true })
    } catch (err) {
      soundFx.error()
      setErrors(err.fieldErrors ?? {})
      setError(err.status === 400 ? 'Revisa los datos del formulario.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="card auth-card auth-card-wide">
        <div className="auth-brand-header">
          <BrandLogo size={42} />
          <h1 className="brand">
            QR<span>Smart</span>
          </h1>
          <p className="subtitle">Crea tu cuenta para acceder a eventos o gestionarlos</p>
        </div>

        <form className="form" onSubmit={onSubmit} noValidate>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-row">
            <FormField
              label="Nombres"
              name="first_name"
              autoComplete="given-name"
              required
              value={form.first_name}
              onChange={onChange}
              error={errors.first_name}
            />
            <FormField
              label="Apellidos"
              name="last_name"
              autoComplete="family-name"
              required
              value={form.last_name}
              onChange={onChange}
              error={errors.last_name}
            />
          </div>
          <FormField
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={onChange}
            error={errors.email}
          />
          <FormField
            label="Tipo de cuenta"
            name="role"
            as="select"
            value={form.role}
            onChange={onChange}
            error={errors.role}
          >
            <option value="ASISTENTE">Asistente · Quiero asistir a eventos</option>
            <option value="ORGANIZADOR">Organizador · Quiero crear y gestionar eventos</option>
          </FormField>
          <div className="form-row">
            <FormField
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={onChange}
              error={errors.password}
            />
            <FormField
              label="Confirmar contraseña"
              name="password_confirm"
              type="password"
              autoComplete="new-password"
              required
              value={form.password_confirm}
              onChange={onChange}
              error={errors.password_confirm}
            />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Creando cuenta…' : 'Registrarme'}
          </button>
        </form>

        <p className="center muted auth-footer-link">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" onClick={() => soundFx.tap()}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
