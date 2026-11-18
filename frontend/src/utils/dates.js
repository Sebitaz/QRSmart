const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

export const formatDate = (value) => dateFormat.format(new Date(value))

export const formatRange = (start, end) => `${formatDate(start)} – ${formatDate(end)}`
