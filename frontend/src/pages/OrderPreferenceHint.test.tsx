import { fireEvent, render, screen } from '@testing-library/react'
import { getPreferences } from '../services/preferences'
import { OrderCreatePage } from './OrderCreatePage'

vi.mock('../services/preferences', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/preferences')>()
  return { ...actual, getPreferences: vi.fn() }
})

const getMock = vi.mocked(getPreferences)
const id = '123e4567-e89b-12d3-a456-426614174000'

describe('order client preference hint', () => {
  beforeEach(() => { getMock.mockReset() })

  it('presenta la preferencia y aplica solo la referencia a petición del operador', async () => {
    getMock.mockResolvedValue({ cliente_id: id, horario_preferido: '08:00 a 10:00', referencia: 'Portón de prueba', restriccion_acceso: 'Avisar' })
    render(<OrderCreatePage />)
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: id } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar preferencias del cliente' }))
    expect(await screen.findByText('Horario: 08:00 a 10:00')).toBeInTheDocument()
    expect(screen.getByText('El horario es informativo; confirma manualmente la ventana del pedido.')).toBeInTheDocument()
    expect(screen.getByLabelText('Punto de referencia')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Usar referencia' }))
    expect(screen.getByLabelText('Punto de referencia')).toHaveValue('Portón de prueba')
  })

  it('limpia la sugerencia al cambiar de cliente', async () => {
    getMock.mockResolvedValue({ cliente_id: id, horario_preferido: null, referencia: null, restriccion_acceso: null })
    render(<OrderCreatePage />)
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: id } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar preferencias del cliente' }))
    expect(await screen.findByText('Horario: sin preferencia')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('ID del cliente (UUID)'), { target: { value: '' } })
    expect(screen.queryByText('Horario: sin preferencia')).not.toBeInTheDocument()
  })
})
