import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import { useAuth } from '../context/auth-context'

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
      setErrors({ password_confirm: 'Las contraseñas no coinciden.' })
      return
    }
    setSubmitting(true)
    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      setError(err.status === 400 ? 'Revisa los datos del formulario.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="card">
        <h1 className="brand">QR<span>Smart</span></h1>
        <p className="subtitle">Crea tu cuenta</p>

        <form className="form" onSubmit={onSubmit} noValidate>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="form-row">
            <FormField
              label="Nombres" name="first_name" autoComplete="given-name" required
              value={form.first_name} onChange={onChange} error={errors.first_name}
            />
            <FormField
              label="Apellidos" name="last_name" autoComplete="family-name" required
              value={form.last_name} onChange={onChange} error={errors.last_name}
            />
          </div>
          <FormField
            label="Email" name="email" type="email" autoComplete="email" required
            value={form.email} onChange={onChange} error={errors.email}
          />
          <FormField
            label="Tipo de cuenta" name="role" as="select"
            value={form.role} onChange={onChange} error={errors.role}
          >
            <option value="ASISTENTE">Asistente: quiero asistir a eventos</option>
            <option value="ORGANIZADOR">Organizador: quiero crear eventos</option>
          </FormField>
          <FormField
            label="Contraseña" name="password" type="password" autoComplete="new-password" required
            value={form.password} onChange={onChange} error={errors.password}
          />
          <FormField
            label="Confirmar contraseña" name="password_confirm" type="password" autoComplete="new-password" required
            value={form.password_confirm} onChange={onChange} error={errors.password_confirm}
          />
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creando cuenta…' : 'Registrarme'}
          </button>
        </form>

        <p className="center muted">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </main>
  )
}
