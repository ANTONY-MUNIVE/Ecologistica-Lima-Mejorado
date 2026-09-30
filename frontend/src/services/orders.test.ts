import {
  createOrder,
  datetimeLocalToIso,
  OrderCreatePayload,
  OrderServiceError,
} from './orders'

const payload: OrderCreatePayload = {
  cliente_id: '123e4567-e89b-12d3-a456-426614174000',
  direccion: 'Av. Principal 123',
  referencia: 'Frente al parque',
  latitud: -11.987654,
  longitud: -76.987654,
  peso_kg: '12.50',
  volumen_m3: '0.080',
  ventana_inicio: '2026-10-01T14:00:00.000Z',
  ventana_fin: '2026-10-01T16:00:00.000Z',
  prioridad: 'ESTANDAR',
  tipo_producto: 'Libre',
}

const created = {
  ...payload,
  pedido_id: '223e4567-e89b-12d3-a456-426614174000',
  estado: 'PENDIENTE',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('servicio de pedidos', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('crea el pedido con URL, credenciales, headers y payload exactos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(created, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createOrder(payload)).resolves.toEqual(created)
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/pedidos', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(request.body).toBe(JSON.stringify(payload))
    expect(request.body).toContain('"peso_kg":"12.50"')
    expect(request.body).toContain('"volumen_m3":"0.080"')
  })

  it.each([
    [401, 'unauthorized', 'Tu sesión no está disponible o ha vencido.'],
    [403, 'forbidden', 'No tienes permisos para registrar pedidos.'],
    [404, 'client-not-found', 'El cliente indicado no existe.'],
    [503, 'unavailable', 'El servicio no está disponible en este momento.'],
  ] as const)('mapea HTTP %s a un error tipado', async (status, kind, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'privado' }, status)))

    const error = await createOrder(payload).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(OrderServiceError)
    expect(error).toMatchObject({ kind, message, status, issues: [] })
  })

  it('conserva los errores FastAPI 422 asociables a campos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      detail: [
        { loc: ['body', 'cliente_id'], msg: 'UUID inválido', type: 'uuid_parsing' },
        { loc: ['body', 'peso_kg'], msg: 'Debe ser mayor que cero' },
        { loc: ['body'], msg: 'La solicitud no cumple la regla combinada' },
        { loc: ['body', 'desconocido'], msg: 'Campo desconocido' },
        { loc: ['body', 'direccion'], msg: { private: true } },
        null,
      ],
    }, 422)))

    const error = await createOrder(payload).catch((caught: unknown) => caught)
    expect(error).toMatchObject({
      kind: 'validation',
      message: 'Revisa los datos ingresados.',
      issues: [
        { field: 'cliente_id', message: 'UUID inválido' },
        { field: 'peso_kg', message: 'Debe ser mayor que cero' },
        { message: 'La solicitud no cumple la regla combinada' },
        { message: 'Campo desconocido' },
      ],
    })
  })

  it.each([{ detail: 'inválido' }, { detail: [{ loc: 'body' }] }, null])(
    'tolera un detail 422 no estructurado',
    async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body, 422)))

      const error = await createOrder(payload).catch((caught: unknown) => caught)
      expect(error).toMatchObject({ kind: 'validation', issues: [] })
      expect(String(error)).not.toContain('[object Object]')
    },
  )

  it('distingue fallos de transporte', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(createOrder(payload)).rejects.toMatchObject({
      kind: 'network',
      message: 'No se pudo conectar con el servicio.',
    })
  })

  it('maneja respuestas HTTP inesperadas y cuerpos exitosos inválidos', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('no-json', { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ estado: 'PENDIENTE' }, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createOrder(payload)).rejects.toMatchObject({
      kind: 'unexpected',
      message: 'No se pudo registrar el pedido.',
    })
    await expect(createOrder(payload)).rejects.toMatchObject({
      kind: 'unexpected',
      message: 'El servicio devolvió una respuesta inválida.',
    })
  })
})

describe('datetimeLocalToIso', () => {
  it('convierte la hora local usando la semántica real de Date', () => {
    const value = '2026-10-01T09:30'
    expect(datetimeLocalToIso(value)).toBe(new Date(value).toISOString())
    expect(datetimeLocalToIso(value)).toMatch(/(?:Z|[+-]\d{2}:\d{2})$/u)
  })

  it.each(['', '   ', 'fecha-inválida'])('rechaza una fecha local inválida: %s', (value) => {
    expect(datetimeLocalToIso(value)).toBeNull()
  })
})
