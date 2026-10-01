import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../services/auth'
import type { AuthRole } from '../services/auth'
import { App } from './App'

vi.mock('../services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/auth')>()
  return { ...actual, login: vi.fn() }
})

const loginMock = vi.mocked(login)
const usuario_id = '123e4567-e89b-12d3-a456-426614174000'

function RouteControls() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <aside aria-label="Controles de prueba">
      <span data-testid="path">{location.pathname}</span>
      <button type="button" onClick={() => { void navigate('/pedidos/nuevo') }}>Abrir ruta de pedido</button>
      <button type="button" onClick={() => { void navigate('/login') }}>Abrir ruta de login</button>
      <button type="button" onClick={() => { void navigate(-1) }}>Atrás</button>
    </aside>
  )
}

function renderAt(path: string, initialEntries?: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries ?? [path]} initialIndex={initialEntries ? initialEntries.length - 1 : 0}>
      <RouteControls />
      <App />
    </MemoryRouter>,
  )
}

async function signIn(role: AuthRole) {
  const user = userEvent.setup()
  loginMock.mockResolvedValue({ usuario_id, rol: role })
  await user.type(screen.getByLabelText('Correo electrónico'), 'user@example.test')
  await user.type(screen.getByLabelText('Contraseña'), 'private-password')
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  expect(await screen.findByRole('heading', { name: 'Rutas sostenibles para Lima' })).toBeInTheDocument()
  return user
}

describe('App', () => {
  beforeEach(() => {
    loginMock.mockReset()
  })

  it('renderiza el inicio con landmarks y enlace de acceso anónimo', () => {
    renderAt('/')
    expect(screen.getByRole('navigation')).toHaveAccessibleName('Navegación principal')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rutas sostenibles para Lima' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Aplicación iniciada correctamente')
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: 'Registrar pedido' })).not.toBeInTheDocument()
  })

  it('abre /login desde el enlace anónimo', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: 'Iniciar sesión' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('muestra la página 404 para una ruta desconocida y permite volver al inicio', async () => {
    const user = userEvent.setup()
    renderAt('/ruta-inexistente')
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    await user.click(screen.getByRole('link', { name: 'Volver al inicio' }))
    expect(screen.getByRole('heading', { name: 'Rutas sostenibles para Lima' })).toBeInTheDocument()
  })

  it('redirige /pedidos/nuevo a /login sin identidad', () => {
    renderAt('/pedidos/nuevo')
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Registrar pedido' })).not.toBeInTheDocument()
  })

  it('al entrar correctamente vuelve a / y reemplaza la entrada de /login', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValue({ usuario_id, rol: 'OPERADOR' })
    renderAt('/login', ['/ruta-inexistente', '/login'])
    await user.type(screen.getByLabelText('Correo electrónico'), 'user@example.test')
    await user.type(screen.getByLabelText('Contraseña'), 'private-password')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Rutas sostenibles para Lima' })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/')
    expect(screen.getByText('Rol: OPERADOR')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/ruta-inexistente')
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument()
  })

  it.each<AuthRole>(['ADMINISTRADOR', 'OPERADOR'])(
    'permite a %s ver y abrir el formulario de pedidos',
    async (role) => {
      renderAt('/login')
      const user = await signIn(role)
      expect(screen.getByText(`Rol: ${role}`)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Registrar pedido' })).toHaveAttribute('href', '/pedidos/nuevo')
      await user.click(screen.getByRole('link', { name: 'Registrar pedido' }))
      expect(screen.getByRole('heading', { name: 'Registrar pedido' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Registrar pedido' })).toBeInTheDocument()
    },
  )

  it.each<AuthRole>(['CONDUCTOR', 'ANALISTA', 'AUDITOR'])(
    'oculta pedidos y deniega el acceso directo a %s',
    async (role) => {
      renderAt('/login')
      const user = await signIn(role)
      expect(screen.getByText(`Rol: ${role}`)).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Registrar pedido' })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Abrir ruta de pedido' }))
      expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('No tienes permisos para acceder a esta función.')
      expect(screen.queryByRole('button', { name: 'Registrar pedido' })).not.toBeInTheDocument()
    },
  )

  it('redirige /login a / cuando ya existe identidad en memoria', async () => {
    renderAt('/login')
    const user = await signIn('OPERADOR')
    await user.click(screen.getByRole('button', { name: 'Abrir ruta de login' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/')
    expect(screen.queryByRole('heading', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
  })

  it('no recupera identidad al volver a montar App', async () => {
    const first = renderAt('/login')
    await signIn('OPERADOR')
    expect(screen.getByRole('link', { name: 'Registrar pedido' })).toBeInTheDocument()
    first.unmount()
    renderAt('/pedidos/nuevo')
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
    expect(screen.queryByRole('link', { name: 'Registrar pedido' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })
})
