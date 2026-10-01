import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createVehicle, listVehicles, VehicleServiceError } from '../services/vehicles'
import type { VehicleCreatePayload, VehicleResponse, VehicleType } from '../services/vehicles'

type VehicleField = keyof VehicleCreatePayload
type FormValues = Record<VehicleField, string>
type FieldErrors = Partial<Record<VehicleField, string>>

const INITIAL_VALUES: FormValues = {
  placa: '',
  tipo: '',
  capacidad_kg: '',
  capacidad_m3: '',
  rendimiento_km_l: '',
  factor_co2_kg_km: '',
  anio_fabricacion: '',
}

const FIELDS: { name: VehicleField; label: string }[] = [
  { name: 'placa', label: 'Placa' },
  { name: 'tipo', label: 'Tipo' },
  { name: 'capacidad_kg', label: 'Capacidad (kg)' },
  { name: 'capacidad_m3', label: 'Capacidad (m³)' },
  { name: 'rendimiento_km_l', label: 'Rendimiento (km/L)' },
  { name: 'factor_co2_kg_km', label: 'Factor CO₂ (kg/km)' },
  { name: 'anio_fabricacion', label: 'Año de fabricación' },
]

const DECIMAL_FIELDS = [
  { name: 'capacidad_kg', places: 2, allowZero: false },
  { name: 'capacidad_m3', places: 2, allowZero: false },
  { name: 'rendimiento_km_l', places: 3, allowZero: false },
  { name: 'factor_co2_kg_km', places: 5, allowZero: true },
] as const

function isVehicleType(value: string): value is VehicleType {
  return value === 'CAMIONETA' || value === 'FURGON' || value === 'MOTO'
}

function decimalError(value: string, places: number, allowZero: boolean): string | undefined {
  if (!value.trim()) return 'Este campo es obligatorio.'
  if (!/^\d+(?:\.\d+)?$/u.test(value)) {
    return 'Usa un número sin signo, con punto decimal; por ejemplo, 1.25.'
  }
  const [whole, fraction = ''] = value.split('.')
  // Count on a copy, preserving the original text and avoiding floating point.
  const integerDigits = whole.replace(/^0+/u, '')
  const fractionalDigits = fraction.replace(/0+$/u, '')
  if (!allowZero && !/[1-9]/u.test(value)) return 'El valor debe ser mayor que cero.'
  if (integerDigits.length > 10 - places || fractionalDigits.length > places) {
    return `Usa como máximo ${10 - places} dígitos enteros y ${places} decimales significativos.`
  }
  return undefined
}

function validate(values: FormValues): { errors: FieldErrors; payload?: VehicleCreatePayload } {
  const errors: FieldErrors = {}
  const plateLength = Array.from(values.placa.trim().toUpperCase()).length
  if (plateLength === 0) errors.placa = 'La placa es obligatoria.'
  else if (plateLength > 10) errors.placa = 'La placa no puede superar 10 caracteres al normalizarse.'
  if (!isVehicleType(values.tipo)) errors.tipo = 'Selecciona un tipo de vehículo válido.'
  for (const { name, places, allowZero } of DECIMAL_FIELDS) {
    const error = decimalError(values[name], places, allowZero)
    if (error) errors[name] = error
  }
  const year = Number(values.anio_fabricacion)
  if (!/^\d{4}$/u.test(values.anio_fabricacion) || year < 1980 || year > 2100) {
    errors.anio_fabricacion = 'Ingresa un año entero entre 1980 y 2100.'
  }
  if (Object.keys(errors).length > 0 || !isVehicleType(values.tipo)) return { errors }
  return { errors, payload: { ...values, tipo: values.tipo, anio_fabricacion: year } }
}

function serviceMessage(error: unknown): string {
  return error instanceof VehicleServiceError ? error.message : 'No se pudo completar la operación.'
}

function VehicleForm({ onCreated }: { onCreated: (vehicle: VehicleResponse) => void }) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const mountedRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!globalError || submitting) return
    const firstInvalid = FIELDS.find(({ name }) => errors[name])
    const control = firstInvalid && formRef.current?.elements.namedItem(firstInvalid.name)
    if (control instanceof HTMLElement) control.focus()
    else errorRef.current?.focus()
  }, [errors, globalError, submitting])

  function updateValue(field: VehicleField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setGlobalError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    const result = validate(values)
    setErrors(result.errors)
    if (!result.payload) {
      setGlobalError('Revisa los campos indicados antes de registrar el vehículo.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setGlobalError('')
    try {
      const vehicle = await createVehicle(result.payload)
      if (!mountedRef.current) return
      setValues(INITIAL_VALUES)
      setErrors({})
      onCreated(vehicle)
    } catch (error) {
      if (!mountedRef.current) return
      const nextErrors: FieldErrors = {}
      if (error instanceof VehicleServiceError) {
        for (const issue of error.issues) nextErrors[issue.field] = issue.message
        if (error.kind === 'conflict') nextErrors.placa = error.message
      }
      setErrors(nextErrors)
      setGlobalError(serviceMessage(error))
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setSubmitting(false)
    }
  }

  return (
    <section className="vehicle-registration" aria-labelledby="vehicle-form-title">
      <h2 id="vehicle-form-title">Registrar vehículo</h2>
      <p id="vehicle-format-help" className="form-intro">
        Todos los campos son obligatorios. Usa punto decimal, sin separadores de miles ni exponentes.
      </p>
      {globalError ? (
        <div className="form-alert error-alert" role="alert" ref={errorRef} tabIndex={-1}>
          {globalError}
        </div>
      ) : null}
      {submitting ? <p className="vehicle-loading" role="status">Registrando vehículo…</p> : null}
      <form
        className="vehicle-form"
        aria-labelledby="vehicle-form-title"
        aria-describedby="vehicle-format-help"
        aria-busy={submitting}
        noValidate
        ref={formRef}
        onSubmit={(event) => { void handleSubmit(event) }}
      >
        <div className="form-grid">
          {FIELDS.map(({ name, label }) => {
            const id = `vehicle-${name}`
            const inputProps = {
              id,
              name,
              required: true,
              disabled: submitting,
              value: values[name],
              'aria-invalid': Boolean(errors[name]),
              'aria-describedby': errors[name] ? `${id}-error` : undefined,
            }
            return (
              <div className="form-field" key={name}>
                <label htmlFor={id}>{label}</label>
                {name === 'tipo' ? (
                  <select {...inputProps} onChange={(event) => updateValue(name, event.target.value)}>
                    <option value="">Selecciona un tipo</option>
                    <option value="CAMIONETA">Camioneta</option>
                    <option value="FURGON">Furgón</option>
                    <option value="MOTO">Moto</option>
                  </select>
                ) : (
                  <input
                    {...inputProps}
                    type="text"
                    inputMode={name === 'placa' ? 'text' : name === 'anio_fabricacion' ? 'numeric' : 'decimal'}
                    onChange={(event) => updateValue(name, event.target.value)}
                  />
                )}
                {errors[name] ? <p className="field-error" id={`${id}-error`}>{errors[name]}</p> : null}
              </div>
            )
          })}
        </div>
        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Registrar vehículo'}
        </button>
      </form>
    </section>
  )
}

function VehicleTable({ vehicles }: { vehicles: VehicleResponse[] }) {
  return (
    <div className="vehicle-table-scroll" role="region" aria-label="Tabla de vehículos, desplazamiento horizontal" tabIndex={0}>
      <table className="vehicle-table">
        <caption>Vehículos registrados, incluidos activos e inactivos</caption>
        <thead>
          <tr>
            {['Placa', 'Tipo', 'Capacidad (kg)', 'Capacidad (m³)', 'Rendimiento (km/L)', 'Factor (kg CO₂/km)', 'Año', 'Estado'].map((label) => (
              <th scope="col" key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.vehiculo_id}>
              <td>{vehicle.placa}</td>
              <td>{vehicle.tipo}</td>
              <td>{vehicle.capacidad_kg}</td>
              <td>{vehicle.capacidad_m3}</td>
              <td>{vehicle.rendimiento_km_l}</td>
              <td>{vehicle.factor_co2_kg_km}</td>
              <td>{vehicle.anio_fabricacion}</td>
              <td><span className="vehicle-state">{vehicle.estado}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ListState {
  status: 'loading' | 'ready' | 'error'
  vehicles: VehicleResponse[]
  error: string
}

export function VehiclesPage({ canCreate }: { canCreate: boolean }) {
  const [list, setList] = useState<ListState>({ status: 'loading', vehicles: [], error: '' })
  const [createdVehicle, setCreatedVehicle] = useState<VehicleResponse | null>(null)
  const latestRequest = useRef(0)
  const listErrorRef = useRef<HTMLDivElement>(null)

  const loadList = useCallback((afterCreate = false) => {
    const requestId = ++latestRequest.current
    void listVehicles().then(
      (vehicles) => {
        if (requestId !== latestRequest.current) return
        setList({ status: 'ready', vehicles, error: '' })
      },
      (error: unknown) => {
        if (requestId !== latestRequest.current) return
        const message = serviceMessage(error)
        setList((current) => ({
          ...current,
          status: 'error',
          error: afterCreate ? `Vehículo registrado. No se pudo actualizar el listado. ${message}` : message,
        }))
      },
    )
  }, [])

  useEffect(() => {
    loadList()
    // Invalidates earlier GETs, including StrictMode's first mount and unmount.
    return () => { latestRequest.current += 1 }
  }, [loadList])

  useEffect(() => {
    if (list.status === 'error') listErrorRef.current?.focus()
  }, [list])

  function refreshList(afterCreate = false) {
    setList((current) => ({ ...current, status: 'loading', error: '' }))
    loadList(afterCreate)
  }

  function handleCreated(vehicle: VehicleResponse) {
    setCreatedVehicle(vehicle)
    refreshList(true)
  }

  return (
    <section className="vehicles-page" aria-labelledby="vehicles-title">
      <p className="eyebrow">Gestión de flota</p>
      <h1 id="vehicles-title">Vehículos</h1>
      {createdVehicle ? (
        <p className="form-alert success-alert" role="status">Vehículo registrado: {createdVehicle.placa}.</p>
      ) : null}
      {list.status === 'loading' ? <p className="vehicle-loading" role="status">Cargando vehículos…</p> : null}
      <section className="vehicle-list" aria-labelledby="vehicle-list-title" aria-busy={list.status === 'loading'}>
        <div className="vehicle-list-heading">
          <h2 id="vehicle-list-title">Listado de vehículos</h2>
          <button className="submit-button" type="button" disabled={list.status === 'loading'} onClick={() => refreshList()}>
            Actualizar listado
          </button>
        </div>
        {list.status === 'error' ? (
          <div className="form-alert error-alert" role="alert" tabIndex={-1} ref={listErrorRef}>
            {list.error}
            {list.vehicles.length > 0 ? <span>El listado mostrado puede estar desactualizado.</span> : null}
          </div>
        ) : null}
        {list.status === 'ready' && list.vehicles.length === 0 ? (
          <p className="vehicle-empty" role="status">No hay vehículos registrados.</p>
        ) : null}
        {list.vehicles.length > 0 ? <VehicleTable vehicles={list.vehicles} /> : null}
      </section>
      {canCreate ? <VehicleForm onCreated={handleCreated} /> : null}
    </section>
  )
}
