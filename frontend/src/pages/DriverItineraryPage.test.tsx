import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DriverItineraryPage } from './DriverItineraryPage'

describe('DriverItineraryPage (demo, sin API)', () => {
  it('identifica explícitamente los datos ficticios', () => {
    render(<DriverItineraryPage />)
    expect(screen.getByRole('heading', { name: 'Mi itinerario' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Vista de demostración')
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(2)
  })

  it('permite seleccionar parada y consultar su detalle', () => {
    render(<DriverItineraryPage />)
    fireEvent.click(screen.getByRole('button', { name: /Cliente de ejemplo B/i }))
    expect(screen.getByRole('heading', { name: 'Cliente de ejemplo B' })).toBeInTheDocument()
    expect(screen.getByText('PED-DEMO-02')).toBeInTheDocument()
  })

  it('filtra sin cambiar el estado real de entregas', () => {
    render(<DriverItineraryPage />)
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'ENTREGADO' } })
    expect(screen.getByRole('button', { name: /Cliente de ejemplo C/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cliente de ejemplo A/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cliente de ejemplo C' })).toBeInTheDocument()
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('3')
  })

  it.each([
    ['PENDIENTE', 'Cliente de ejemplo A'],
    ['EN_RUTA', 'Cliente de ejemplo B'],
    ['ENTREGADO', 'Cliente de ejemplo C'],
  ])('muestra solo las paradas de %s y restaura el listado completo', (state, client) => {
    render(<DriverItineraryPage />)
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: state } })
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent(client)
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'TODAS' } })
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('permite recorrer y seleccionar paradas con el teclado', async () => {
    const user = userEvent.setup()
    render(<DriverItineraryPage />)
    await user.tab()
    expect(screen.getByLabelText('Filtrar por estado')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /Cliente de ejemplo A/i })).toHaveFocus()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'Cliente de ejemplo B' })).toBeInTheDocument()
    await user.tab()
    await user.keyboard(' ')
    expect(screen.getByRole('heading', { name: 'Cliente de ejemplo C' })).toBeInTheDocument()
  })
})
