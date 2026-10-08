import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getPreferences, savePreferences } from '../services/preferences'
import type { PreferenceRecord } from '../services/preferences'
import { PreferencesPage } from './PreferencesPage'

vi.mock('../services/preferences', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/preferences')>()
  return { ...actual, getPreferences: vi.fn(), savePreferences: vi.fn() }
})

const getMock = vi.mocked(getPreferences)
const saveMock = vi.mocked(savePreferences)
const record: PreferenceRecord = {
  cliente_id: '123e4567-e89b-12d3-a456-426614174000',
  horario_preferido: '08:00 a 10:00', referencia: 'Portón de prueba', restriccion_acceso: null,
}

describe('PreferencesPage', () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue(record)
    saveMock.mockReset().mockResolvedValue(record)
  })

  it('enfoca UUID inválido sin consultar al servidor', () => {
    render(<PreferencesPage />)
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar cliente' }))
    expect(screen.getByLabelText('ID del cliente (UUID)')).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent('UUID de cliente válido')
    expect(getMock).not.toHaveBeenCalled()
  })

  it('recupera, edita y guarda preferencias del mismo cliente', async () => {
    render(<PreferencesPage />)
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: record.cliente_id } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar cliente' }))
    expect(await screen.findByLabelText('Horario preferido')).toHaveValue('08:00 a 10:00')
    fireEvent.change(screen.getByLabelText('Punto de referencia'), { target: { value: ' Nueva referencia ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencias' }))
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith(record.cliente_id, {
      horario_preferido: '08:00 a 10:00', referencia: 'Nueva referencia', restriccion_acceso: null,
    }))
    expect(await screen.findByText('Preferencias guardadas para el cliente consultado.')).toBeInTheDocument()
  })

  it('muestra error seguro y permite consultar otra vez', async () => {
    getMock.mockRejectedValueOnce(new Error('private SQL'))
    render(<PreferencesPage />)
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: record.cliente_id } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar cliente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el cliente.')
    expect(screen.queryByText('private SQL')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Consultar cliente' }))
    expect(await screen.findByLabelText('Horario preferido')).toBeInTheDocument()
  })

  it('permite borrar preferencias y comunica fallo de guardado sin detalles privados', async () => {
    saveMock.mockRejectedValueOnce(new Error('private SQL'))
    render(<PreferencesPage />)
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: record.cliente_id } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar cliente' }))
    await screen.findByLabelText('Horario preferido')
    fireEvent.change(screen.getByLabelText('Horario preferido'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Punto de referencia'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Restricción de acceso'), { target: { value: 'Avisar' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencias' }))
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith(record.cliente_id, {
      horario_preferido: null, referencia: null, restriccion_acceso: 'Avisar',
    }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron guardar las preferencias.')
    expect(screen.queryByText('private SQL')).not.toBeInTheDocument()
  })

  it('descarta una consulta antigua al cambiar de cliente', async () => {
    let resolve!: (value: PreferenceRecord) => void
    getMock.mockReturnValueOnce(new Promise<PreferenceRecord>((done) => { resolve = done }))
    render(<PreferencesPage />)
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: record.cliente_id } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar cliente' }))
    expect(screen.getByText('Cargando preferencias…')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: '' } })
    resolve(record)
    await waitFor(() => expect(screen.queryByText('Cargando preferencias…')).not.toBeInTheDocument())
    expect(screen.queryByLabelText('Horario preferido')).not.toBeInTheDocument()
  })
})
