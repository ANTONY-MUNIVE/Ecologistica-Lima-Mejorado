import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEMO_ITINERARY } from '../data/demoDriverItinerary'
import { DELIVERY_LABEL, getNextStop, getStopAlerts } from '../domain/driverItinerary'
import type { DeliveryState, DemoItinerary, DriverAlert, DriverStop } from '../domain/driverItinerary'
import './DriverItineraryPage.css'
import { createMap, drawRoute, loadGoogleMaps, requestGoogleRoute } from '../services/googleMaps'

function ItineraryMap({ stops, onSelect }: { stops: readonly DriverStop[]; onSelect: (stop: DriverStop) => void }) {
  const mapElement = useRef<HTMLDivElement>(null)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>(apiKey ? 'loading' : 'missing')
  const [routeStatus, setRouteStatus] = useState<'loading' | 'ready' | 'error'>(apiKey ? 'loading' : 'error')
  const [routeSummary, setRouteSummary] = useState<{ distance: string; duration: string } | null>(null)
  const points = useMemo(() => stops.map((stop) => stop.coordinates), [stops])
  useEffect(() => {
    if (!apiKey) return
    if (!mapElement.current || points.length === 0) return
    let active = true
    const controller = new AbortController()
    let mapInstance: ReturnType<typeof createMap> | undefined
    let route: ReturnType<typeof drawRoute> | undefined
    setMapStatus('loading')
    setRouteStatus('loading')
    setRouteSummary(null)
    void loadGoogleMaps(apiKey).then(() => {
      if (!active || !mapElement.current) return
      mapInstance = createMap(mapElement.current, points, (index) => onSelect(stops[index]))
      setMapStatus('ready')
      return requestGoogleRoute(apiKey, points, controller.signal)
    }).then((googleRoute) => {
      if (!active || !mapInstance || !googleRoute) return
      route = drawRoute(mapInstance.map, googleRoute.path)
      setRouteSummary({ distance: `${(googleRoute.distanceMeters / 1000).toFixed(1)} km`, duration: `${Math.round(googleRoute.durationSeconds / 60)} min` })
      setRouteStatus('ready')
    }).catch((error: unknown) => {
      if (!active || (error instanceof DOMException && error.name === 'AbortError')) return
      if (mapInstance) setRouteStatus('error')
      else setMapStatus('error')
    })
    return () => {
      active = false
      controller.abort()
      route?.setMap(null)
      mapInstance?.dispose()
    }
  }, [apiKey, onSelect, points, stops])
  return <section className="driver-map-panel" aria-label="Mapa del itinerario">
    <div className="driver-map-header"><div><p className="driver-map-kicker">Mapa de paradas</p><h2>Recorrido de demostración</h2></div>
      {routeSummary ? <p className="driver-route-metrics"><strong>{routeSummary.distance}</strong><span>{routeSummary.duration} · respuesta de Google</span></p> : null}
    </div>
    {!apiKey ? <div className="driver-map-state"><strong>Mapa no configurado</strong><span>Añade VITE_GOOGLE_MAPS_API_KEY para activar el mapa y el recorrido vial. La lista sigue disponible.</span></div>
      : <><div className="driver-map-canvas" ref={mapElement} aria-label="Mapa interactivo de las paradas" aria-busy={mapStatus === 'loading'} />
        {mapStatus === 'loading' ? <p className="driver-map-loading" aria-live="polite">Cargando mapa…</p> : null}
        {mapStatus === 'error' ? <div className="driver-map-state" role="alert"><strong>No se pudo cargar el mapa</strong><span>Comprueba la clave, APIs habilitadas y restricciones de Maps JavaScript API.</span></div> : null}
        {mapStatus === 'ready' && routeStatus === 'loading' ? <p className="driver-map-loading" aria-live="polite">Calculando recorrido vial…</p> : null}
        {mapStatus === 'ready' && routeStatus === 'error' ? <div className="driver-map-state" role="alert"><strong>No se pudo calcular el recorrido</strong><span>El mapa sigue disponible. Comprueba Routes API, restricciones y cuota.</span></div> : null}</>}
    <p className="driver-map-caption">Las paradas y coordenadas son ficticias. El recorrido vial solo se muestra cuando existe una respuesta real de Google.</p>
  </section>
}

function OperationalAlerts({ alerts }: { alerts: readonly DriverAlert[] }) {
  return <section className="driver-alerts" aria-label="Alertas operativas de demostración">
    {alerts.length === 0 ? <p>No hay alertas operativas en este ejemplo.</p> : alerts.map((alert) => (
      <div className="driver-alert" key={alert.id}>
        <p className="driver-alert-title">{alert.title}</p><strong>{alert.description}</strong>
        <p>{alert.instruction}</p><small>Alerta de demostración · Sin información de tráfico real</small>
      </div>
    ))}
  </section>
}

function StopCard({ stop, next = false }: { stop: DriverStop; next?: boolean }) {
  return <span className={`driver-card driver-card-${stop.state.toLowerCase()}${next ? ' driver-card-next' : ''}`}>
    <span className="driver-card-state">{next ? 'Siguiente' : DELIVERY_LABEL[stop.state]} · {String(stop.sequence).padStart(2, '0')}</span>
    <strong>{stop.client}</strong><span>{stop.address}</span><small>{stop.window} · {stop.load}</small>
  </span>
}

export function DriverItineraryPage({ itinerary = DEMO_ITINERARY }: { itinerary?: DemoItinerary | null }) {
  const [selected, setSelected] = useState<DriverStop | null>(null)
  const [filter, setFilter] = useState<'TODAS' | DeliveryState>('TODAS')
  const [showEmpty, setShowEmpty] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const current = showEmpty ? null : itinerary
  const next = getNextStop(current?.stops ?? [])
  const visible = (current?.stops ?? []).filter((stop) => filter === 'TODAS' || stop.state === filter)
  const detail = current !== null && selected !== null
  const selectStop = useCallback((stop: DriverStop) => setSelected(stop), [])
  useEffect(() => { heading.current?.focus() }, [selected, showEmpty])

  return <section className="driver-page" aria-labelledby="driver-title">
    <div className="driver-demo-warning" role="note">
      <strong>Datos de demostración · Vista de demostración.</strong>
      <span>Ruta, pedidos, horarios, direcciones y alertas ficticios. No se consultan itinerarios reales.</span>
    </div>
    <p className="driver-eyebrow">EcoLogística Lima</p>
    <h1 id="driver-title" ref={heading} tabIndex={-1}>{detail ? 'Detalle de parada' : 'Mi itinerario'}</h1>
    <p className="driver-route-label">{current ? `Ruta ${current.id} · ${current.stops.length} paradas · Ejemplo ficticio` : 'Estado de demostración · Sin asignación'}</p>
    {current === null ? <>
      <div className="driver-empty driver-panel"><p className="driver-card-state">Sin asignación</p>
        <h2>Aún no tienes un itinerario</h2><p>Cuando se te asigne una ruta, verás aquí las paradas y las alertas operativas.</p>
        <strong>No hay paradas pendientes en este ejemplo.</strong>
      </div>
      <p>Si esperabas una ruta, solicita la asignación a tu coordinador.</p>
      {showEmpty ? <button className="driver-primary" type="button" onClick={() => { setShowEmpty(false); setFilter('TODAS') }}>Cargar ejemplo de itinerario</button> : null}
    </> : detail ? <>
      <StopCard stop={selected} next={selected.id === next?.id} />
      <section className="driver-panel" aria-labelledby="driver-info-title">
        <h2 id="driver-info-title">Información de entrega</h2><dl>
          <div><dt>Ventana de atención</dt><dd>{selected.window}</dd></div>
          <div><dt>Carga de demostración</dt><dd>{selected.load}</dd></div>
          <div><dt>Pedido de prueba</dt><dd>{selected.order}</dd></div>
          <div><dt>Recepción</dt><dd>{selected.reception}</dd></div>
          <div><dt>Estado</dt><dd>{DELIVERY_LABEL[selected.state]}</dd></div>
        </dl>
      </section>
      <OperationalAlerts alerts={getStopAlerts(current.alerts, selected.id)} />
      <section className="driver-panel" aria-labelledby="driver-instructions-title">
        <h2 id="driver-instructions-title">Antes de llegar</h2>
        <ol>{selected.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
        <small>Estas indicaciones son ficticias.</small>
      </section>
      <button className="driver-primary" type="button" onClick={() => setSelected(null)}>Volver al itinerario</button>
    </> : <>
      <ItineraryMap stops={current.stops} onSelect={selectStop} />
      <OperationalAlerts alerts={current.alerts} />
      <section aria-labelledby="driver-next-title"><h2 id="driver-next-title">Siguiente parada</h2>
        {next ? <><StopCard stop={next} next /><button className="driver-primary" type="button" onClick={() => setSelected(next)}>Ver detalle de parada</button></> : <p>No hay paradas pendientes en este ejemplo.</p>}
      </section>
      <section aria-labelledby="driver-list-title"><h2 id="driver-list-title">Recorrido de hoy</h2>
        <label className="driver-filter-label" htmlFor="driver-filter">Filtrar por estado</label>
        <select id="driver-filter" className="driver-filter" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
          <option value="TODAS">Todas las paradas</option><option value="PENDIENTE">Pendientes</option>
          <option value="EN_RUTA">En ruta</option><option value="ENTREGADO">Completadas</option><option value="DEMORADO">Con demora prevista</option>
        </select>
        <ol className="driver-stops">{visible.map((stop) => <li key={stop.id}>
          <button className="driver-stop" type="button" onClick={() => setSelected(stop)} aria-label={`Ver parada ${stop.sequence}: ${stop.client}`}><StopCard stop={stop} next={stop.id === next?.id} /></button>
        </li>)}</ol>
        {visible.length === 0 ? <p role="status">No hay paradas con este estado.</p> : null}
      </section>
      <button className="driver-secondary" type="button" onClick={() => { setSelected(null); setShowEmpty(true) }}>Ver ejemplo sin asignación</button>
    </>}
    <p className="driver-footnote">Datos de demostración. No se consulta una ruta real ni se modifican entregas. Sin GPS o sincronización offline.</p>
  </section>
}
