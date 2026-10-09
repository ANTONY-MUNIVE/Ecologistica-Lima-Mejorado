import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createDriver, DriverServiceError, listDrivers, updateDriver } from '../services/drivers'
import type { DriverPayload, DriverRecord } from '../services/drivers'

type FormValues = Record<keyof DriverPayload, string>
type Field = keyof FormValues
type Errors = Partial<Record<Field, string>>

const EMPTY: FormValues = {
  usuario_id: '', nombre: '', dni: '', licencia: '', licencia_vigente_hasta: '',
  experiencia_anios: '', telefono: '', disponible_desde: '', disponible_hasta: '', punto_partida: '',
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

const FIELDS: { name: Field; label: string; type: string; required?: boolean }[] = [
  { name: 'nombre', label: 'Nombre', type: 'text', required: true },
  { name: 'dni', label: 'DNI', type: 'text', required: true },
  { name: 'licencia', label: 'Licencia', type: 'text', required: true },
  { name: 'licencia_vigente_hasta', label: 'Vigencia de licencia', type: 'date', required: true },
  { name: 'experiencia_anios', label: 'Años de experiencia', type: 'number', required: true },
  { name: 'telefono', label: 'Teléfono', type: 'tel', required: true },
  { name: 'disponible_desde', label: 'Disponible desde', type: 'datetime-local', required: true },
  { name: 'disponible_hasta', label: 'Disponible hasta', type: 'datetime-local', required: true },
  { name: 'punto_partida', label: 'Punto de partida', type: 'text', required: true },
  { name: 'usuario_id', label: 'ID de cuenta Conductor (opcional)', type: 'text' },
]

function localDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const two = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`
}

function formValues(driver: DriverRecord): FormValues {
  return {
    usuario_id: driver.usuario_id ?? '', nombre: driver.nombre, dni: driver.dni,
    licencia: driver.licencia, licencia_vigente_hasta: driver.licencia_vigente_hasta,
    experiencia_anios: String(driver.experiencia_anios), telefono: driver.telefono,
    disponible_desde: localDateTime(driver.disponible_desde),
    disponible_hasta: localDateTime(driver.disponible_hasta), punto_partida: driver.punto_partida,
  }
}

function validate(values: FormValues, hasLinkedAccount: boolean): { errors: Errors; payload?: DriverPayload } {
  const errors: Errors = {}
  const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])) as FormValues
  for (const field of FIELDS.filter((item) => item.required)) {
    if (!trimmed[field.name]) errors[field.name] = 'Este campo es obligatorio.'
  }
  if (trimmed.nombre.length > 160) errors.nombre = 'Máximo 160 caracteres.'
  if (!/^\d{8}$/u.test(trimmed.dni)) errors.dni = 'Ingresa ocho dígitos.'
  if (trimmed.licencia.length > 40) errors.licencia = 'Máximo 40 caracteres.'
  if (trimmed.telefono.length > 30) errors.telefono = 'Máximo 30 caracteres.'
  if (trimmed.punto_partida.length > 255) errors.punto_partida = 'Máximo 255 caracteres.'
  if (trimmed.usuario_id && !UUID.test(trimmed.usuario_id)) errors.usuario_id = 'Ingresa un UUID válido.'
  if (hasLinkedAccount && !trimmed.usuario_id) errors.usuario_id = 'La cuenta vinculada no se puede quitar desde este formulario.'
  const experience = Number(trimmed.experiencia_anios)
  if (!Number.isInteger(experience) || experience < 0 || experience > 32767) {
    errors.experiencia_anios = 'Ingresa años enteros no negativos.'
  }
  const start = new Date(trimmed.disponible_desde)
  const end = new Date(trimmed.disponible_hasta)
  if (Number.isNaN(start.getTime())) errors.disponible_desde = 'Ingresa una fecha y hora válida.'
  if (Number.isNaN(end.getTime()) || end <= start) errors.disponible_hasta = 'La hora final debe ser posterior.'
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(trimmed.licencia_vigente_hasta)) {
    errors.licencia_vigente_hasta = 'Ingresa una fecha válida.'
  }
  if (Object.keys(errors).length) return { errors }
  return {
    errors,
    payload: {
      ...trimmed,
      usuario_id: trimmed.usuario_id || null,
      experiencia_anios: experience,
      disponible_desde: start.toISOString(),
      disponible_hasta: end.toISOString(),
    },
  }
}

function DriverForm({ selected, onSaved, onCancel }: {
  selected: DriverRecord | null
  onSaved: (driver: DriverRecord) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<FormValues>(selected ? formValues(selected) : EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const busy = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  function change(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const result = validate(values, Boolean(selected?.usuario_id))
    setErrors(result.errors)
    if (!result.payload) {
      setMessage('Revisa los campos indicados.')
      const first = FIELDS.find(({ name }) => result.errors[name])
      const control = first && formRef.current?.elements.namedItem(first.name)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    busy.current = true
    setSubmitting(true)
    setMessage('')
    try {
      const saved = selected ? await updateDriver(selected.conductor_id, result.payload) : await createDriver(result.payload)
      onSaved(saved)
      if (!selected) setValues(EMPTY)
    } catch (error) {
      setMessage(error instanceof DriverServiceError ? error.message : 'No se pudo guardar el conductor.')
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="driver-form-section" aria-labelledby="driver-form-title">
      <h2 id="driver-form-title">{selected ? 'Editar conductor' : 'Registrar conductor'}</h2>
      {message ? <p className="form-alert error-alert" role="alert">{message}</p> : null}
      <form className="vehicle-form" ref={formRef} aria-busy={submitting} noValidate onSubmit={(event) => { void submit(event) }}>
        <div className="form-grid">
          {FIELDS.map(({ name, label, type, required }) => (
            <div className="form-field" key={name}>
              <label htmlFor={`driver-${name}`}>{label}</label>
              <input id={`driver-${name}`} name={name} type={type} required={required} disabled={submitting}
                value={values[name]} onChange={(event) => change(name, event.target.value)}
                aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `driver-${name}-error` : undefined} />
              {errors[name] ? <p className="field-error" id={`driver-${name}-error`}>{errors[name]}</p> : null}
            </div>
          ))}
        </div>
        <div className="driver-actions">
          <button className="submit-button" type="submit" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar conductor'}</button>
          {selected ? <button className="secondary-button" type="button" onClick={onCancel}>Cancelar edición</button> : null}
        </div>
      </form>
    </section>
  )
}

export function DriversPage() {
  const [rows, setRows] = useState<DriverRecord[]>([])
  const [selected, setSelected] = useState<DriverRecord | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const requestId = useRef(0)

  const reload = useCallback(() => {
    const id = ++requestId.current
    void listDrivers().then(
      (drivers) => { if (id === requestId.current) { setRows(drivers); setStatus('ready'); setMessage('') } },
      (error: unknown) => {
        if (id === requestId.current) {
          setStatus('error')
          setMessage(error instanceof DriverServiceError ? error.message : 'No se pudo cargar el listado.')
        }
      },
    )
  }, [])
  useEffect(() => { reload(); return () => { requestId.current += 1 } }, [reload])

  function refresh() {
    setStatus('loading')
    reload()
  }

  function saved(driver: DriverRecord) {
    setSuccess(`Conductor ${driver.nombre} guardado.`)
    setSelected(null)
    refresh()
  }

  return (
    <section className="drivers-page" aria-labelledby="drivers-title">
      <p className="eyebrow">Gestión operativa</p>
      <h1 id="drivers-title">Conductores</h1>
      <p className="form-intro">Consulta y actualiza los datos de conductores autorizados.</p>
      {success ? <p className="form-alert success-alert" role="status">{success}</p> : null}
      <section aria-labelledby="drivers-list-title" aria-busy={status === 'loading'}>
        <div className="vehicle-list-heading">
          <h2 id="drivers-list-title">Listado de conductores</h2>
          <button type="button" className="submit-button" onClick={refresh} disabled={status === 'loading'}>Actualizar</button>
        </div>
        {status === 'loading' ? <p role="status" className="vehicle-loading">Cargando conductores…</p> : null}
        {status === 'error' ? <p role="alert" className="form-alert error-alert">{message}</p> : null}
        {status === 'ready' && rows.length === 0 ? <p role="status" className="vehicle-empty">No hay conductores registrados.</p> : null}
        {rows.length > 0 ? (
          <ul className="driver-list">
            {rows.map((driver) => (
              <li className="driver-card" key={driver.conductor_id}>
                <div><strong>{driver.nombre}</strong><span>DNI: {driver.dni}</span><span>Licencia: {driver.licencia} · vence {driver.licencia_vigente_hasta}</span></div>
                <div><span>Teléfono: {driver.telefono}</span><span>Experiencia: {driver.experiencia_anios} años</span><span>Partida: {driver.punto_partida}</span></div>
                <button type="button" className="secondary-button" onClick={() => setSelected(driver)}>Editar</button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <DriverForm key={selected?.conductor_id ?? 'new'} selected={selected} onSaved={saved} onCancel={() => setSelected(null)} />
    </section>
  )
}
