import { Link, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OrderCreatePage } from '../pages/OrderCreatePage'

export function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="container" aria-label="Navegación principal">
          <Link className="brand" to="/">
            EcoLogística Lima
          </Link>
          <Link className="nav-link" to="/pedidos/nuevo">
            Registrar pedido
          </Link>
        </nav>
      </header>
      <main id="contenido-principal" className="container main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pedidos/nuevo" element={<OrderCreatePage />} />
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
