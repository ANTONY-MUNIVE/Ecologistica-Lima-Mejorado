import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('renderiza el inicio con sus landmarks y contenido principal', () => {
    renderAt('/')

    expect(screen.getByRole('navigation')).toHaveAccessibleName(
      'Navegación principal',
    )
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Rutas sostenibles para Lima' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Aplicación iniciada correctamente',
    )
  })

  it('muestra la página 404 para una ruta desconocida', () => {
    renderAt('/ruta-inexistente')

    expect(
      screen.getByRole('heading', { name: 'Página no encontrada' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('permite volver al inicio desde la página 404', async () => {
    const user = userEvent.setup()
    renderAt('/ruta-inexistente')

    await user.click(screen.getByRole('link', { name: 'Volver al inicio' }))

    expect(
      screen.getByRole('heading', { name: 'Rutas sostenibles para Lima' }),
    ).toBeInTheDocument()
  })

  it('renderiza directamente el formulario de registro de pedidos', () => {
    renderAt('/pedidos/nuevo')

    expect(
      screen.getByRole('heading', { name: 'Registrar pedido' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Registrar pedido' }),
    ).toBeInTheDocument()
  })

  it('navega al formulario desde el enlace principal', async () => {
    const user = userEvent.setup()
    renderAt('/')

    await user.click(screen.getByRole('link', { name: 'Registrar pedido' }))

    expect(
      screen.getByRole('heading', { name: 'Registrar pedido' }),
    ).toBeInTheDocument()
  })
})
