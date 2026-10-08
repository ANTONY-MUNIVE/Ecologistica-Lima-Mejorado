import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getPreferences, PreferenceServiceError, savePreferences } from '../services/preferences'
import type { PreferenceFields, PreferenceRecord } from '../services/preferences'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

export function PreferencesPage() {
  const [clientId, setClientId] = useState('')
  const [loaded, setLoaded] = useState<PreferenceRecord | null>(null)
  const [values, setValues] = useState({ horario_preferido: '', referencia: '', restriccion_acceso: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const requestId = useRef(0)
  const clientRef = useRef<HTMLInputElement>(null)

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = clientId.trim()
    if (!UUID.test(id)) {
      setMessage('Ingresa un UUID de cliente válido.')
      clientRef.current?.focus()
      return
    }
    const current = ++requestId.current
    setStatus('loading')
    setMessage('')
    setSuccess('')
    setLoaded(null)
    try {
      const result = await getPreferences(id)
      if (current !== requestId.current) return
      setLoaded(result)
      setValues({
        horario_preferido: result.horario_preferido ?? '',
        referencia: result.referencia ?? '',
        restriccion_acceso: result.restriccion_acceso ?? '',
      })
    } catch (error) {
      if (current === requestId.current) setMessage(error instanceof PreferenceServiceError ? error.message : 'No se pudo cargar el cliente.')
    } finally {
      if (current === requestId.current) setStatus('idle')
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!loaded || status !== 'idle') return
    const next: PreferenceFields = {
      horario_preferido: values.horario_preferido.trim() || null,
      referencia: values.referencia.trim() || null,
      restriccion_acceso: values.restriccion_acceso.trim() || null,
    }
    const current = ++requestId.current
    setStatus('saving')
    setMessage('')
    setSuccess('')
    try {
      const result = await savePreferences(loaded.cliente_id, next)
      if (current === requestId.current) {
        setLoaded(result)
        setSuccess('Preferencias guardadas para el cliente consultado.')
      }
    } catch (error) {
      if (current === requestId.current) setMessage(error instanceof PreferenceServiceError ? error.message : 'No se pudieron guardar las preferencias.')
    } finally {
      if (current === requestId.current) setStatus('idle')
    }
  }

  function changeClient(value: string) {
    requestId.current += 1
    setClientId(value)
    setLoaded(null)
    setMessage('')
    setSuccess('')
    setStatus('idle')
  }

  return (
    <section className="preferences-page" aria-labelledby="preferences-title">
      <p className="eyebrow">Gestión de clientes</p>
      <h1 id="preferences-title">Preferencias de entrega</h1>
      <p className="form-intro">Consulta un cliente existente antes de editar su horario, referencia o restricciones.</p>
      <form className="vehicle-form" onSubmit={(event) => { void load(event) }}>
        <div className="form-field">
          <label htmlFor="preferences-client-id">ID del cliente (UUID)</label>
          <input id="preferences-client-id" ref={clientRef} required value={clientId} onChange={(event) => changeClient(event.target.value)} aria-invalid={message.startsWith('Ingresa un UUID')} />
        </div>
        <button className="submit-button" type="submit" disabled={status !== 'idle'}>{status === 'loading' ? 'Consultando…' : 'Consultar cliente'}</button>
      </form>
      {status === 'loading' ? <p role="status" className="vehicle-loading">Cargando preferencias…</p> : null}
      {message ? <p role="alert" className="form-alert error-alert">{message}</p> : null}
      {success ? <p role="status" className="form-alert success-alert">{success}</p> : null}
      {loaded ? (
        <form className="vehicle-form preference-edit-form" aria-label="Editar preferencias" aria-busy={status === 'saving'} onSubmit={(event) => { void save(event) }}>
          <p className="form-intro">Cliente: {loaded.cliente_id}. Deja un campo vacío para borrar esa preferencia.</p>
          <div className="form-field">
            <label htmlFor="preferred-schedule">Horario preferido</label>
            <input id="preferred-schedule" maxLength={120} value={values.horario_preferido} disabled={status === 'saving'} onChange={(event) => setValues((current) => ({ ...current, horario_preferido: event.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="preferred-reference">Punto de referencia</label>
            <input id="preferred-reference" maxLength={255} value={values.referencia} disabled={status === 'saving'} onChange={(event) => setValues((current) => ({ ...current, referencia: event.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="preferred-access">Restricción de acceso</label>
            <textarea id="preferred-access" maxLength={255} rows={3} value={values.restriccion_acceso} disabled={status === 'saving'} onChange={(event) => setValues((current) => ({ ...current, restriccion_acceso: event.target.value }))} />
          </div>
          <button className="submit-button" type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Guardando…' : 'Guardar preferencias'}</button>
        </form>
      ) : null}
    </section>
  )
}
