import { getPreferences, savePreferences } from './preferences'
import type { PreferenceRecord } from './preferences'

const record: PreferenceRecord = {
  cliente_id: '123e4567-e89b-12d3-a456-426614174000',
  horario_preferido: '08:00 a 10:00', referencia: 'Portón de prueba', restriccion_acceso: null,
}

describe('preference HTTP service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1')
  })

  it('consulta y guarda en el cliente indicado con credenciales', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify(record), { status: 200 })))
    expect(await getPreferences(record.cliente_id)).toEqual(record)
    expect(fetchMock.mock.calls[0][0]).toContain(`/clientes/${record.cliente_id}/preferencias`)
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'GET', credentials: 'include' }))
    expect(await savePreferences(record.cliente_id, { horario_preferido: null, referencia: 'Nueva', restriccion_acceso: null })).toEqual(record)
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'PATCH', credentials: 'include' }))
  })

  it('rechaza cliente inexistente, respuesta inválida y error de red sin filtrar detalles', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'private SQL' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cliente_id: record.cliente_id }), { status: 200 }))
      .mockRejectedValueOnce(new Error('private network'))
    await expect(getPreferences(record.cliente_id)).rejects.toMatchObject({ kind: 'missing' })
    await expect(getPreferences(record.cliente_id)).rejects.toMatchObject({ kind: 'unexpected' })
    await expect(getPreferences(record.cliente_id)).rejects.toMatchObject({ kind: 'network' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each([
    [401, 'unauthorized'], [403, 'forbidden'], [422, 'validation'], [503, 'unavailable'], [500, 'unexpected'],
  ] as const)('clasifica HTTP %i sin mostrar el cuerpo', async (status, kind) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('private SQL', { status }))
    await expect(getPreferences(record.cliente_id)).rejects.toMatchObject({ kind })
  })

  it('rechaza respuesta sin JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('sin JSON', { status: 200 }))
    await expect(getPreferences(record.cliente_id)).rejects.toMatchObject({ kind: 'unexpected' })
  })
})
