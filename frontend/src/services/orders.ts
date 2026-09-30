import { buildApiUrl } from './api'

export type Priority = 'EXPRESS' | 'ESTANDAR' | 'ECONOMICO'

export interface OrderCreatePayload {
  cliente_id: string
  direccion: string
  referencia: string | null
  latitud: number | null
  longitud: number | null
  peso_kg: string
  volumen_m3: string
  ventana_inicio: string
  ventana_fin: string
  prioridad: Priority
  tipo_producto: string
}

export interface OrderCreateResponse extends OrderCreatePayload {
  pedido_id: string
  estado: string
}

export type OrderServiceErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'client-not-found'
  | 'validation'
  | 'unavailable'
  | 'network'
  | 'unexpected'

export interface OrderValidationIssue {
  field?: keyof OrderCreatePayload
  message: string
}

const ORDER_FIELDS = new Set<keyof OrderCreatePayload>([
  'cliente_id',
  'direccion',
  'referencia',
  'latitud',
  'longitud',
  'peso_kg',
  'volumen_m3',
  'ventana_inicio',
  'ventana_fin',
  'prioridad',
  'tipo_producto',
])

const ERROR_MESSAGES: Partial<Record<number, string>> = {
  401: 'Tu sesión no está disponible o ha vencido.',
  403: 'No tienes permisos para registrar pedidos.',
  404: 'El cliente indicado no existe.',
  503: 'El servicio no está disponible en este momento.',
}

const ERROR_KINDS: Partial<Record<number, OrderServiceErrorKind>> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'client-not-found',
  422: 'validation',
  503: 'unavailable',
}

export class OrderServiceError extends Error {
  readonly kind: OrderServiceErrorKind
  readonly status?: number
  readonly issues: OrderValidationIssue[]

  constructor(
    kind: OrderServiceErrorKind,
    message: string,
    options: { status?: number; issues?: OrderValidationIssue[] } = {},
  ) {
    super(message)
    this.name = 'OrderServiceError'
    this.kind = kind
    this.status = options.status
    this.issues = options.issues ?? []
  }
}

export function datetimeLocalToIso(value: string): string | null {
  if (!value.trim()) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validationIssues(body: unknown): OrderValidationIssue[] {
  if (!isRecord(body) || !Array.isArray(body.detail)) {
    return []
  }

  return body.detail.flatMap((detail): OrderValidationIssue[] => {
    if (!isRecord(detail) || typeof detail.msg !== 'string') {
      return []
    }

    const issue: OrderValidationIssue = { message: detail.msg }
    if (Array.isArray(detail.loc)) {
      const location = detail.loc as unknown[]
      const candidate = location.at(-1)
      if (typeof candidate === 'string' && ORDER_FIELDS.has(candidate as keyof OrderCreatePayload)) {
        issue.field = candidate as keyof OrderCreatePayload
      }
    }
    return [issue]
  })
}

async function responseBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function httpError(status: number, body: unknown): OrderServiceError {
  if (status === 422) {
    return new OrderServiceError('validation', 'Revisa los datos ingresados.', {
      status,
      issues: validationIssues(body),
    })
  }

  const kind = ERROR_KINDS[status] ?? 'unexpected'
  const message = ERROR_MESSAGES[status] ?? 'No se pudo registrar el pedido.'
  return new OrderServiceError(kind, message, { status })
}

export async function createOrder(
  payload: OrderCreatePayload,
): Promise<OrderCreateResponse> {
  let response: Response
  try {
    response = await fetch(buildApiUrl('pedidos'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new OrderServiceError('network', 'No se pudo conectar con el servicio.')
  }

  const body = await responseBody(response)
  if (!response.ok) {
    throw httpError(response.status, body)
  }
  if (!isRecord(body) || typeof body.pedido_id !== 'string' || typeof body.estado !== 'string') {
    throw new OrderServiceError('unexpected', 'El servicio devolvió una respuesta inválida.', {
      status: response.status,
    })
  }

  return body as unknown as OrderCreateResponse
}
