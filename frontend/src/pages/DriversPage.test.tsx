import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createDriver, listDrivers, updateDriver } from '../services/drivers'
import type { DriverRecord } from '../services/drivers'
import { DriversPage } from './DriversPage'

vi.mock('../services/drivers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/drivers')>()
  return { ...actual, listDrivers: vi.fn(), createDriver: vi.fn(), updateDriver: vi.fn() }
})

const listMock = vi.mocked(listDrivers)
const createMock = vi.mocked(createDriver)
const updateMock = vi.mocked(updateDriver)
const row: DriverRecord = {
  conductor_id: '123e4567-e89b-12d3-a456-426614174000', usuario_id: null,
  nombre: 'Conductor sintético', dni: '12345678', licencia: 'SYN-001',
  licencia_vigente_hasta: '2027-01-01', experiencia_anios: 2, telefono: '000000000',
  disponible_desde: '2026-10-09T13:00:00Z', disponible_hasta: '2026-10-09T21:00:00Z',
  punto_partida: 'Depósito de prueba',
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fill() {
  change('Nombre', row.nombre)
  change('DNI', row.dni)
  change('Licencia', row.licencia)
  change('Vigencia de licencia', row.licencia_vigente_hasta)
  change('Años de experiencia', '2')
  change('Teléfono', row.telefono)
  change('Disponible desde', '2026-10-09T08:00')
  change('Disponible hasta', '2026-10-09T16:00')
  change('Punto de partida', row.punto_partida)
}

describe('DriversPage', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue([])
    createMock.mockReset().mockResolvedValue(row)
    updateMock.mockReset().mockResolvedValue(row)
  })

  it('muestra carga y vacío y rechaza DNI inválido antes de enviar', async () => {
    render(<DriversPage />)
    expect(screen.getByText('Cargando conductores…')).toBeInTheDocument()
    expect(await screen.findByText('No hay conductores registrados.')).toBeInTheDocument()
    fill()
    change('DNI', '123')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar conductor' }))
    expect(screen.getByLabelText('DNI')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('DNI')).toHaveFocus()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('registra, confirma y vuelve a consultar el listado', async () => {
    render(<DriversPage />)
    await screen.findByText('No hay conductores registrados.')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar conductor' }))
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock.mock.calls[0][0]).toEqual(expect.objectContaining({
      dni: row.dni, experiencia_anios: 2, usuario_id: null,
    }))
    expect(await screen.findByText('Conductor Conductor sintético guardado.')).toBeInTheDocument()
    expect(listMock).toHaveBeenCalledTimes(2)
  })

  it('edita un conductor del listado y muestra errores de consulta', async () => {
    listMock.mockResolvedValueOnce([row]).mockRejectedValueOnce(new Error('private SQL'))
    render(<DriversPage />)
    await screen.findByText('DNI: 12345678')
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('heading', { name: 'Editar conductor' })).toBeInTheDocument()
    change('Años de experiencia', '3')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar conductor' }))
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(updateMock.mock.calls[0][0]).toBe(row.conductor_id)
    expect(updateMock.mock.calls[0][1].experiencia_anios).toBe(3)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el listado.')
    expect(screen.queryByText('private SQL')).not.toBeInTheDocument()
  })

  it('valida experiencia, cuenta y ventana antes de enviar', async () => {
    render(<DriversPage />)
    await screen.findByText('No hay conductores registrados.')
    fill()
    change('Años de experiencia', '-1')
    change('ID de cuenta Conductor (opcional)', 'cuenta inválida')
    change('Disponible hasta', '2026-10-09T07:00')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar conductor' }))
    expect(screen.getByLabelText('Años de experiencia')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('ID de cuenta Conductor (opcional)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Disponible hasta')).toHaveAttribute('aria-invalid', 'true')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('muestra un error seguro si falla el guardado', async () => {
    createMock.mockRejectedValueOnce(new Error('private SQL'))
    render(<DriversPage />)
    await screen.findByText('No hay conductores registrados.')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar conductor' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el conductor.')
    expect(screen.queryByText('private SQL')).not.toBeInTheDocument()
  })
})
