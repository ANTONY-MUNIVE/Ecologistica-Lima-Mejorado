import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { DriverItineraryPage } from '../pages/DriverItineraryPage'
import { DriversPage } from '../pages/DriversPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OrderCreatePage } from '../pages/OrderCreatePage'
import { PreferencesPage } from '../pages/PreferencesPage'
import { VehiclesPage } from '../pages/VehiclesPage'
import { AuthServiceError, logout } from '../services/auth'
import type { AuthRole, LoginResponse } from '../services/auth'

function canCreateOrders(role: AuthRole): boolean {
  return role === 'ADMINISTRADOR' || role === 'OPERADOR'
}

function getVehicleAccess(role: AuthRole | undefined) {
  const canCreate = role === 'ADMINISTRADOR' || role === 'OPERADOR'
  return { canList: canCreate || role === 'AUDITOR', canCreate }
}

function AccessDenied() {
  return (
    <section className="access-denied" aria-labelledby="access-denied-title">
      <h1 id="access-denied-title">Acceso denegado</h1>
      <p role="alert">No tienes permisos para acceder a esta función.</p>
    </section>
  )
}

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.localStorage.getItem('ecologistica-theme') === 'dark' ? 'dark' : 'light'
}

export function App() {
  const [identity, setIdentity] = useState<LoginResponse | null>(null)
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const navigate = useNavigate()
  const createOrdersAllowed = identity !== null && canCreateOrders(identity.rol)
  const vehicleAccess = getVehicleAccess(identity?.rol)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('ecologistica-theme', theme)
  }, [theme])

  function handleLoginSuccess(loggedInIdentity: LoginResponse) {
    setIdentity(loggedInIdentity)
    setLogoutError('')
    void navigate('/', { replace: true })
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      setIdentity(null)
      void navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error instanceof AuthServiceError ? error.message : 'No se pudo cerrar sesión.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="container" aria-label="Navegación principal">
          <Link className="brand" to="/">
            <span className="brand-logo-frame">
              <img className="brand-logo" src="/logo-ecologistica-lima.jpg" alt="" />
            </span>
            <span className="brand-name">EcoLogística Lima</span>
          </Link>
          <div className="nav-actions">
            <button
              className="theme-toggle"
              type="button"
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
              <span>{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
            </button>
            {identity ? (
              <div className="user-menu" aria-label="Menú de usuario">
                <span className="identity-role">Rol: {identity.rol}</span>
                <button className="logout-button" type="button" disabled={loggingOut} onClick={() => { void handleLogout() }}>
                  {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </button>
              </div>
            ) : (
              <Link className="nav-link" to="/login">Iniciar sesión</Link>
            )}
            {createOrdersAllowed ? (
              <Link className="nav-link" to="/pedidos/nuevo">Registrar pedido</Link>
            ) : null}
            {vehicleAccess.canList ? (
              <Link className="nav-link" to="/vehiculos">Vehículos</Link>
            ) : null}
            {createOrdersAllowed ? <Link className="nav-link" to="/conductores">Conductores</Link> : null}
            {createOrdersAllowed ? <Link className="nav-link" to="/clientes/preferencias">Preferencias</Link> : null}
            {identity?.rol === 'CONDUCTOR' ? (
              <Link className="nav-link" to="/conductor/itinerario">Mi itinerario</Link>
            ) : null}
          </div>
        </nav>
        {logoutError ? <div className="container nav-alert" role="alert">{logoutError}</div> : null}
      </header>
      <main id="contenido-principal" className="container main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={identity ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/pedidos/nuevo"
            element={identity === null ? <Navigate to="/login" replace /> : (
              createOrdersAllowed ? <OrderCreatePage /> : <AccessDenied />
            )}
          />
          <Route
            path="/vehiculos"
            element={identity === null ? <Navigate to="/login" replace /> : (
              vehicleAccess.canList ? <VehiclesPage canCreate={vehicleAccess.canCreate} /> : <AccessDenied />
            )}
          />
          <Route path="/conductores" element={identity === null ? <Navigate to="/login" replace /> : (
            createOrdersAllowed ? <DriversPage /> : <AccessDenied />
          )} />
          <Route path="/clientes/preferencias" element={identity === null ? <Navigate to="/login" replace /> : (
            createOrdersAllowed ? <PreferencesPage /> : <AccessDenied />
          )} />
          <Route
            path="/conductor/itinerario"
            element={identity === null ? <Navigate to="/login" replace /> : (
              identity.rol === 'CONDUCTOR' ? <DriverItineraryPage /> : <AccessDenied />
            )}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>Base técnica del optimizador de rutas sostenibles.</p>
        </div>
      </footer>
    </div>
  )
}
