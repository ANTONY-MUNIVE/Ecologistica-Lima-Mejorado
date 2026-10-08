import { createDriver, DriverServiceError, listDrivers, updateDriver } from './drivers'
import type { DriverRecord } from './drivers'

const row: DriverRecord = {
  conductor_id: '123e4567-e89b-12d3-a456-426614174000', usuario_id: null,
  nombre: 'Conductor sintético', dni: '12345678', licencia: 'SYN-001',
  licencia_vigente_hasta: '2027-01-01', experiencia_anios: 2, telefono: '000000000',
  disponible_desde: '2026-10-09T13:00:00Z', disponible_hasta: '2026-10-09T21:00:00Z',
  punto_partida: 'Depósito de prueba',
}

describe('driver HTTP service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1')
  })

  it('envía credenciales para leer, crear y actualizar', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([row]), { status: 200 }))
    expect(await listDrivers()).toEqual([row])
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'GET', credentials: 'include' }))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(row), { status: 201 }))
    expect(await createDriver(row)).toEqual(row)
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'POST', credentials: 'include' }))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(row), { status: 200 }))
    expect(await updateDriver(row.conductor_id, row)).toEqual(row)
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'PATCH', credentials: 'include' }))
  })

  it('no muestra detalles del servidor y rechaza respuestas incompletas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'private SQL' }), { status: 503 }))
    await expect(listDrivers()).rejects.toMatchObject({ kind: 'unavailable' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify([{ nombre: 'Sin ID' }]), { status: 200 }))
    await expect(listDrivers()).rejects.toBeInstanceOf(DriverServiceError)
  })

  it.each([
    [401, 'unauthorized'], [403, 'forbidden'], [409, 'conflict'], [422, 'validation'], [500, 'unexpected'],
  ] as const)('clasifica HTTP %i sin exponer el cuerpo', async (status, kind) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('private SQL', { status }))
    await expect(listDrivers()).rejects.toMatchObject({ kind })
  })

  it('distingue falta de red de una respuesta sin JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('private network'))
    await expect(listDrivers()).rejects.toMatchObject({ kind: 'network' })
    fetchMock.mockResolvedValueOnce(new Response('sin JSON', { status: 200 }))
    await expect(listDrivers()).rejects.toMatchObject({ kind: 'unexpected' })
  })
})
