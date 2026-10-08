import { buildApiUrl } from './api'

export interface DriverPayload {
  usuario_id: string | null
  nombre: string
  dni: string
  licencia: string
  licencia_vigente_hasta: string
  experiencia_anios: number
  telefono: string
  disponible_desde: string
  disponible_hasta: string
  punto_partida: string
}

export interface DriverRecord extends DriverPayload {
  conductor_id: string
}

type DriverErrorKind = 'unauthorized' | 'forbidden' | 'conflict' | 'validation' | 'unavailable' | 'network' | 'unexpected'

const MESSAGES: Record<DriverErrorKind, string> = {
  unauthorized: 'Tu sesión no está disponible o ha vencido.',
  forbidden: 'No tienes permisos para gestionar conductores.',
  conflict: 'El DNI o la cuenta ya está asociada a otro conductor.',
  validation: 'Revisa los datos del conductor.',
  unavailable: 'El servicio no está disponible en este momento.',
  network: 'No se pudo conectar con el servicio.',
  unexpected: 'No se pudo completar la operación.',
}

export class DriverServiceError extends Error {
  constructor(readonly kind: DriverErrorKind) {
    super(MESSAGES[kind])
    this.name = 'DriverServiceError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDriver(value: unknown): DriverRecord {
  if (!isRecord(value) || typeof value.conductor_id !== 'string' ||
    (value.usuario_id !== null && typeof value.usuario_id !== 'string') ||
    typeof value.nombre !== 'string' || typeof value.dni !== 'string' ||
    typeof value.licencia !== 'string' || typeof value.licencia_vigente_hasta !== 'string' ||
    typeof value.experiencia_anios !== 'number' || typeof value.telefono !== 'string' ||
    typeof value.disponible_desde !== 'string' || typeof value.disponible_hasta !== 'string' ||
    typeof value.punto_partida !== 'string') {
    throw new DriverServiceError('unexpected')
  }
  return value as unknown as DriverRecord
}

async function requestDriver(path: string, method: 'GET' | 'POST' | 'PATCH', payload?: Partial<DriverPayload>): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(buildApiUrl(path), {
      method,
      credentials: 'include',
      ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
    })
  } catch {
    throw new DriverServiceError('network')
  }
  if (!response.ok) {
    const kind: DriverErrorKind = response.status === 401 ? 'unauthorized' :
      response.status === 403 ? 'forbidden' :
        response.status === 409 ? 'conflict' :
          response.status === 422 ? 'validation' :
            response.status === 503 ? 'unavailable' : 'unexpected'
    throw new DriverServiceError(kind)
  }
  try {
    return await response.json()
  } catch {
    throw new DriverServiceError('unexpected')
  }
}

export async function listDrivers(): Promise<DriverRecord[]> {
  const body = await requestDriver('conductores', 'GET')
  if (!Array.isArray(body)) throw new DriverServiceError('unexpected')
  return body.map(parseDriver)
}

export async function createDriver(payload: DriverPayload): Promise<DriverRecord> {
  return parseDriver(await requestDriver('conductores', 'POST', payload))
}

export async function updateDriver(id: string, payload: DriverPayload): Promise<DriverRecord> {
  // A missing account preserves the existing association; PATCH rejects nulls.
  const changes: Partial<DriverPayload> = { ...payload }
  if (changes.usuario_id === null) delete changes.usuario_id
  return parseDriver(await requestDriver(`conductores/${encodeURIComponent(id)}`, 'PATCH', changes))
}
