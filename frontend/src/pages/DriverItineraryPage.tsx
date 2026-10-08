import { useState } from 'react'
import './DriverItineraryPage.css'

type DeliveryState = 'PENDIENTE' | 'EN_RUTA' | 'ENTREGADO'
interface Stop {
  id: string
  order: string
  client: string
  address: string
  time: string
  state: DeliveryState
  note: string
}

// Datos únicamente ilustrativos: reemplazar con un endpoint autenticado cuando exista.
const DEMO_STOPS: readonly Stop[] = [
  { id: 'uno', order: 'PED-DEMO-01', client: 'Cliente de ejemplo A', address: 'Dirección de demostración 1, Lima', time: '08:30–09:00', state: 'PENDIENTE', note: 'Confirmar la recepción con el destinatario.' },
  { id: 'dos', order: 'PED-DEMO-02', client: 'Cliente de ejemplo B', address: 'Dirección de demostración 2, Lima', time: '09:15–09:45', state: 'EN_RUTA', note: 'Verificar el acceso antes de estacionar.' },
  { id: 'tres', order: 'PED-DEMO-03', client: 'Cliente de ejemplo C', address: 'Dirección de demostración 3, Lima', time: '10:00–10:30', state: 'ENTREGADO', note: 'Información ficticia para evaluar el diseño.' },
]

const STATE_LABEL: Record<DeliveryState, string> = {
  PENDIENTE: 'Pendiente', EN_RUTA: 'En ruta', ENTREGADO: 'Entregado',
}

export function DriverItineraryPage() {
  const [selectedId, setSelectedId] = useState<string>('uno')
  const [filter, setFilter] = useState<'TODAS' | DeliveryState>('TODAS')
  const filtered = DEMO_STOPS.filter((stop) => filter === 'TODAS' || stop.state === filter)
  // La muestra fija contiene una parada de cada estado, por lo que nunca queda vacía.
  const selected = filtered.find((stop) => stop.id === selectedId) ?? filtered[0]

  return (
    <section className="driver-page" aria-labelledby="driver-title">
      <div className="driver-hero">
        <div>
          <p className="driver-eyebrow">Panel del conductor · Vista móvil</p>
          <h1 id="driver-title">Mi itinerario</h1>
          <p>Consulta las paradas y revisa los detalles de cada entrega.</p>
        </div>
        <div className="driver-hero-stat" aria-label={`${DEMO_STOPS.length} paradas de demostración`}>
          <strong>{DEMO_STOPS.length}</strong><span>paradas</span>
        </div>
      </div>

      <div className="driver-demo-warning" role="note">
        <strong>Vista de demostración.</strong> Los pedidos, horarios y direcciones son ficticios. No hay conexión todavía con el backend ni se actualizan entregas reales.
      </div>

      <div className="driver-summary" aria-label="Resumen del itinerario de demostración">
        <div><strong>{DEMO_STOPS.filter((item) => item.state === 'PENDIENTE').length}</strong><span>Pendientes</span></div>
        <div><strong>{DEMO_STOPS.filter((item) => item.state === 'EN_RUTA').length}</strong><span>En ruta</span></div>
        <div><strong>{DEMO_STOPS.filter((item) => item.state === 'ENTREGADO').length}</strong><span>Entregadas</span></div>
      </div>

      <div className="driver-content">
        <section aria-labelledby="driver-list-title">
          <div className="driver-section-heading"><h2 id="driver-list-title">Paradas asignadas (demo)</h2></div>
          <label className="driver-filter-label" htmlFor="driver-filter">Filtrar por estado</label>
          <select id="driver-filter" className="driver-filter" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="TODAS">Todas las paradas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_RUTA">En ruta</option>
            <option value="ENTREGADO">Entregadas</option>
          </select>
          <ol className="driver-stops">
            {filtered.map((stop) => (
              <li key={stop.id}>
                <button
                  type="button"
                  className={`driver-stop${selected.id === stop.id ? ' driver-stop-selected' : ''}`}
                  aria-pressed={selected.id === stop.id}
                  onClick={() => setSelectedId(stop.id)}
                >
                  <span className="driver-stop-number" aria-hidden="true">{DEMO_STOPS.indexOf(stop) + 1}</span>
                  <span className="driver-stop-info"><strong>{stop.client}</strong><span>{stop.address}</span><small>{stop.time}</small></span>
                  <span className={`driver-status driver-status-${stop.state.toLowerCase()}`}>{STATE_LABEL[stop.state]}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <section className="driver-detail" aria-labelledby="driver-detail-title">
          <p className="driver-eyebrow">Detalle de la parada</p>
          <h2 id="driver-detail-title">{selected.client}</h2>
          <dl>
              <div><dt>Pedido de prueba</dt><dd>{selected.order}</dd></div>
              <div><dt>Dirección</dt><dd>{selected.address}</dd></div>
              <div><dt>Ventana de entrega</dt><dd>{selected.time}</dd></div>
              <div><dt>Estado</dt><dd>{STATE_LABEL[selected.state]}</dd></div>
              <div><dt>Indicaciones</dt><dd>{selected.note}</dd></div>
          </dl>
          <p className="driver-detail-notice">La navegación GPS, los cambios de estado y la sincronización se integrarán cuando estén disponibles los servicios de rutas y entregas.</p>
        </section>
      </div>
    </section>
  )
}
