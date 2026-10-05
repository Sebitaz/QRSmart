import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventsApi } from '../../api/events'
import FormField from '../../components/FormField'

const INITIAL_FORM = {
  name: '',
  description: '',
  location: '',
  start_at: '',
  end_at: '',
  capacity: '',
}

function nowForInput() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function validate(form) {
  const errors = {}
  if (form.name.trim().length < 3) errors.name = 'El nombre debe tener al menos 3 caracteres.'
  if (!form.location.trim()) errors.location = 'El lugar es obligatorio.'
  if (!form.start_at) errors.start_at = 'Indica la fecha y hora de inicio.'
  else if (new Date(form.start_at) <= new Date()) errors.start_at = 'La fecha de inicio debe ser futura.'
  if (!form.end_at) errors.end_at = 'Indica la fecha y hora de fin.'
  else if (form.start_at && new Date(form.end_at) <= new Date(form.start_at)) {
    errors.end_at = 'La fecha de fin debe ser posterior a la de inicio.'
  }
  const capacity = Number(form.capacity)
  if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = 'La capacidad debe ser un número entero mayor a 0.'
  return errors
}

export default function CreateEventPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const clientErrors = validate(form)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      const event = await eventsApi.create({
        ...form,
        // se pasan las fechas a ISO para el back
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        capacity: Number(form.capacity),
      })
      navigate('/organizador', { state: { created: event.name } })
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      setError(err.status === 400 ? 'Revisa los datos del formulario.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="narrow">
      <Link to="/organizador" className="back-link">← Volver a mis eventos</Link>
      <h1>Crear evento</h1>
      <p className="muted">Define los datos del evento y su capacidad máxima de personas.</p>

      <form className="form card" onSubmit={onSubmit} noValidate>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <FormField
          label="Nombre del evento" name="name" required maxLength={200}
          value={form.name} onChange={onChange} error={errors.name}
        />
        <FormField
          label="Descripción (opcional)" name="description" as="textarea" rows={3}
          value={form.description} onChange={onChange} error={errors.description}
        />
        <FormField
          label="Lugar" name="location" required maxLength={255}
          value={form.location} onChange={onChange} error={errors.location}
        />
        <div className="form-row">
          <FormField
            label="Inicio" name="start_at" type="datetime-local" required min={nowForInput()}
            value={form.start_at} onChange={onChange} error={errors.start_at}
          />
          <FormField
            label="Fin" name="end_at" type="datetime-local" required min={form.start_at || nowForInput()}
            value={form.end_at} onChange={onChange} error={errors.end_at}
          />
        </div>
        <FormField
          label="Capacidad máxima (aforo)" name="capacity" type="number" min={1} step={1} required
          value={form.capacity} onChange={onChange} error={errors.capacity}
        />
        <div className="form-actions">
          <Link to="/organizador" className="btn btn-outline">Cancelar</Link>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creando…' : 'Crear evento'}
          </button>
        </div>
      </form>
    </section>
  )
}
