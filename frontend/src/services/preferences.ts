import { buildApiUrl } from './api'

export interface PreferenceRecord {
  cliente_id: string
  horario_preferido: string | null
  referencia: string | null
  restriccion_acceso: string | null
}

export type PreferenceFields = Omit<PreferenceRecord, 'cliente_id'>
type PreferenceErrorKind = 'unauthorized' | 'forbidden' | 'missing' | 'validation' | 'unavailable' | 'network' | 'unexpected'

const MESSAGES: Record<PreferenceErrorKind, string> = {
  unauthorized: 'Tu sesión no está disponible o ha vencido.',
  forbidden: 'No tienes permisos para consultar este cliente.',
  missing: 'El cliente indicado no existe.',
  validation: 'Revisa las preferencias ingresadas.',
  unavailable: 'El servicio no está disponible en este momento.',
  network: 'No se pudo conectar con el servicio.',
  unexpected: 'No se pudo completar la operación.',
}

export class PreferenceServiceError extends Error {
  constructor(readonly kind: PreferenceErrorKind) {
    super(MESSAGES[kind])
    this.name = 'PreferenceServiceError'
  }
}

function parsePreference(value: unknown): PreferenceRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new PreferenceServiceError('unexpected')
  const body = value as Record<string, unknown>
  if (typeof body.cliente_id !== 'string' ||
    !['horario_preferido', 'referencia', 'restriccion_acceso'].every((field) => body[field] === null || typeof body[field] === 'string')) {
    throw new PreferenceServiceError('unexpected')
  }
  return body as unknown as PreferenceRecord
}

async function request(id: string, method: 'GET' | 'PATCH', payload?: PreferenceFields): Promise<PreferenceRecord> {
  let response: Response
  try {
    response = await fetch(buildApiUrl(`clientes/${encodeURIComponent(id)}/preferencias`), {
      method,
      credentials: 'include',
      ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
    })
  } catch {
    throw new PreferenceServiceError('network')
  }
  if (!response.ok) {
    const kind: PreferenceErrorKind = response.status === 401 ? 'unauthorized' :
      response.status === 403 ? 'forbidden' :
        response.status === 404 ? 'missing' :
          response.status === 422 ? 'validation' :
            response.status === 503 ? 'unavailable' : 'unexpected'
    throw new PreferenceServiceError(kind)
  }
  try {
    return parsePreference(await response.json())
  } catch (error) {
    if (error instanceof PreferenceServiceError) throw error
    throw new PreferenceServiceError('unexpected')
  }
}

export function getPreferences(id: string): Promise<PreferenceRecord> {
  return request(id, 'GET')
}

export function savePreferences(id: string, payload: PreferenceFields): Promise<PreferenceRecord> {
  return request(id, 'PATCH', payload)
}
