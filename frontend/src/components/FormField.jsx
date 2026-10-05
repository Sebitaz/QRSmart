export default function FormField({ label, name, error, as = 'input', children, ...props }) {
  const Control = as
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <Control id={name} name={name} aria-invalid={Boolean(error)} {...props}>
        {children}
      </Control>
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
