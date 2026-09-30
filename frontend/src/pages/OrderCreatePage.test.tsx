import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createOrder,
  OrderCreateResponse,
  OrderServiceError,
} from '../services/orders'
import { OrderCreatePage } from './OrderCreatePage'

vi.mock('../services/orders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/orders')>()
  return { ...actual, createOrder: vi.fn() }
})

const createOrderMock = vi.mocked(createOrder)

const createdOrder: OrderCreateResponse = {
  pedido_id: '223e4567-e89b-12d3-a456-426614174000',
  estado: 'PENDIENTE',
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

const validValues = {
  'ID del cliente (UUID)': '123e4567-e89b-12d3-a456-426614174000',
  Dirección: ' Av. Principal 123 ',
  'Punto de referencia': ' Frente al parque ',
  Latitud: '-11.987654',
  Longitud: '-76.987654',
  'Peso (kg)': '12.50',
  'Volumen (m³)': '0.080',
  'Inicio de ventana': '2026-10-01T09:00',
  'Fin de ventana': '2026-10-01T11:00',
  'Tipo de producto': ' Libre ',
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fillValid(overrides: Partial<typeof validValues> = {}) {
  for (const [label, value] of Object.entries({ ...validValues, ...overrides })) {
    change(label, value)
  }
}

function submit() {
  fireEvent.submit(screen.getByRole('button', { name: 'Registrar pedido' }).closest('form')!)
}

describe('OrderCreatePage', () => {
  beforeEach(() => {
    createOrderMock.mockReset()
    createOrderMock.mockResolvedValue(createdOrder)
  })

  it('renderiza todos los controles con etiquetas accesibles', () => {
    render(<OrderCreatePage />)

    for (const label of Object.keys(validValues)) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Prioridad')).toHaveValue('ESTANDAR')
    expect(screen.getByRole('button', { name: 'Registrar pedido' })).toBeEnabled()
  })

  it.each([
    ['', 'El ID del cliente es obligatorio.'],
    ['no-es-uuid', 'Ingresa un UUID de cliente válido.'],
  ])('valida cliente_id: %s', (clienteId, message) => {
    render(<OrderCreatePage />)
    fillValid({ 'ID del cliente (UUID)': clienteId })
    submit()

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText('ID del cliente (UUID)')).toHaveAttribute('aria-invalid', 'true')
    expect(createOrderMock).not.toHaveBeenCalled()
  })

  it('valida dirección vacía', () => {
    render(<OrderCreatePage />)
    fillValid({ Dirección: '   ' })
    submit()

    expect(screen.getByText('La dirección es obligatoria.')).toBeInTheDocument()
  })

  it('exige referencia o coordenadas completas', () => {
    render(<OrderCreatePage />)
    fillValid({ 'Punto de referencia': '', Latitud: '', Longitud: '' })
    submit()

    expect(screen.getByText('Ingresa coordenadas completas o un punto de referencia.')).toBeInTheDocument()
    expect(createOrderMock).not.toHaveBeenCalled()
  })

  it('rechaza una sola coordenada', () => {
    render(<OrderCreatePage />)
    fillValid({ 'Punto de referencia': '', Longitud: '' })
    submit()

    expect(screen.getAllByText('Latitud y longitud deben ingresarse juntas.')).toHaveLength(2)
  })

  it.each([
    ['Latitud', '91', 'La latitud debe estar entre -90 y 90.'],
    ['Longitud', '-181', 'La longitud debe estar entre -180 y 180.'],
  ])('rechaza %s fuera de rango', (label, value, message) => {
    render(<OrderCreatePage />)
    fillValid({ [label]: value })
    submit()

    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it.each([
    ['Peso (kg)', '0', 'El peso debe ser mayor que cero y tener como máximo 2 decimales.'],
    ['Peso (kg)', '1.001', 'El peso debe ser mayor que cero y tener como máximo 2 decimales.'],
    ['Volumen (m³)', '-1', 'El volumen debe ser mayor que cero y tener como máximo 3 decimales.'],
    ['Volumen (m³)', '1.0001', 'El volumen debe ser mayor que cero y tener como máximo 3 decimales.'],
  ])('valida decimales de %s con valor %s', (label, value, message) => {
    render(<OrderCreatePage />)
    fillValid({ [label]: value })
    submit()

    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it.each([
    ['', 'El tipo de producto es obligatorio.'],
    ['x'.repeat(21), 'El tipo de producto no puede superar 20 caracteres.'],
  ])('valida tipo_producto', (value, message) => {
    render(<OrderCreatePage />)
    fillValid({ 'Tipo de producto': value })
    submit()

    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('rechaza una ventana final igual o anterior al inicio', () => {
    render(<OrderCreatePage />)
    fillValid({ 'Fin de ventana': '2026-10-01T09:00' })
    submit()

    expect(screen.getByText('La hora final debe ser posterior a la hora inicial.')).toBeInTheDocument()
  })

  it('envía prioridad, strings decimales y fechas ISO timezone-aware', async () => {
    render(<OrderCreatePage />)
    fillValid()
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'EXPRESS' } })
    submit()

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1))
    expect(createOrderMock).toHaveBeenCalledWith({
      cliente_id: '123e4567-e89b-12d3-a456-426614174000',
      direccion: 'Av. Principal 123',
      referencia: 'Frente al parque',
      latitud: -11.987654,
      longitud: -76.987654,
      peso_kg: '12.50',
      volumen_m3: '0.080',
      ventana_inicio: new Date('2026-10-01T09:00').toISOString(),
      ventana_fin: new Date('2026-10-01T11:00').toISOString(),
      prioridad: 'EXPRESS',
      tipo_producto: 'Libre',
    })
  })

  it('envía null para referencia y coordenadas vacías cuando la otra ubicación existe', async () => {
    render(<OrderCreatePage />)
    fillValid({ Latitud: '', Longitud: '' })
    submit()
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1))
    expect(createOrderMock.mock.calls[0]?.[0]).toMatchObject({ latitud: null, longitud: null })

    createOrderMock.mockClear()
    change('Punto de referencia', '')
    change('Latitud', '-11.9')
    change('Longitud', '-76.9')
    submit()
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1))
    expect(createOrderMock.mock.calls[0]?.[0]).toMatchObject({ referencia: null })
  })

  it('deshabilita el botón durante loading e impide doble submit', async () => {
    let resolveRequest!: (order: OrderCreateResponse) => void
    createOrderMock.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    render(<OrderCreatePage />)
    fillValid()

    const form = screen.getByRole('button', { name: 'Registrar pedido' }).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(screen.getByRole('button', { name: 'Registrando…' })).toBeDisabled()
    expect(createOrderMock).toHaveBeenCalledTimes(1)
    act(() => resolveRequest(createdOrder))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })

  it('muestra pedido_id y estado después del éxito', async () => {
    render(<OrderCreatePage />)
    fillValid()
    submit()

    expect(await screen.findByRole('status')).toHaveTextContent('Pedido registrado.')
    expect(screen.getByRole('status')).toHaveTextContent(createdOrder.pedido_id)
    expect(screen.getByRole('status')).toHaveTextContent('PENDIENTE')
  })

  it.each([
    ['unauthorized', 'Tu sesión no está disponible o ha vencido.'],
    ['forbidden', 'No tienes permisos para registrar pedidos.'],
    ['client-not-found', 'El cliente indicado no existe.'],
    ['unavailable', 'El servicio no está disponible en este momento.'],
    ['network', 'No se pudo conectar con el servicio.'],
  ] as const)('muestra el error de servicio %s y conserva el formulario', async (kind, message) => {
    createOrderMock.mockRejectedValue(new OrderServiceError(kind, message))
    render(<OrderCreatePage />)
    fillValid()
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByLabelText('Dirección')).toHaveValue(' Av. Principal 123 ')
    expect(screen.getByRole('button', { name: 'Registrar pedido' })).toBeEnabled()
  })

  it('mapea el 422 a campo y conserva errores de modelo en el resumen', async () => {
    createOrderMock.mockRejectedValue(new OrderServiceError(
      'validation',
      'Revisa los datos ingresados.',
      {
        status: 422,
        issues: [
          { field: 'peso_kg', message: 'El peso no es válido' },
          { message: 'La ubicación no cumple la regla combinada' },
        ],
      },
    ))
    render(<OrderCreatePage />)
    fillValid()
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa los datos ingresados.')
    expect(screen.getByRole('alert')).toHaveTextContent('La ubicación no cumple la regla combinada')
    expect(screen.getByText('El peso no es válido')).toBeInTheDocument()
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument()
  })

  it('limpia el error del campo cuando el usuario lo corrige', async () => {
    const user = userEvent.setup()
    render(<OrderCreatePage />)
    fillValid({ 'ID del cliente (UUID)': 'inválido' })
    submit()
    const input = screen.getByLabelText('ID del cliente (UUID)')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    await user.clear(input)
    await user.type(input, '123e4567-e89b-12d3-a456-426614174000')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('presenta un error seguro ante un rechazo no tipado', async () => {
    createOrderMock.mockRejectedValue(new Error('detalle interno'))
    render(<OrderCreatePage />)
    fillValid()
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar el pedido.')
    expect(screen.queryByText('detalle interno')).not.toBeInTheDocument()
  })
})
