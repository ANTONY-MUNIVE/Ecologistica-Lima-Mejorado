export interface MapPoint {
  lat: number
  lng: number
}

export interface GoogleRoute {
  path: MapPoint[]
  distanceMeters: number
  durationSeconds: number
}

interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap
      LatLngBounds: new () => GoogleBounds
      marker?: { AdvancedMarkerElement: new (options: Record<string, unknown>) => GoogleMarker }
      Polyline: new (options: Record<string, unknown>) => GooglePolyline
    }
  }
}

interface GoogleMap {
  fitBounds(bounds: GoogleBounds, padding?: number): void
  setCenter(point: MapPoint): void
}
interface GoogleBounds { extend(point: MapPoint): void }
interface GoogleMarker {
  addEventListener(event: string, callback: () => void): void
  removeEventListener(event: string, callback: () => void): void
  map: GoogleMap | null
}
interface GooglePolyline { setMap(map: GoogleMap | null): void }

let scriptPromise: Promise<void> | null = null

function isGoogleMapsReady(googleWindow: GoogleMapsWindow): boolean {
  const maps = googleWindow.google?.maps
  return Boolean(maps?.Map && maps.LatLngBounds && maps.Polyline && maps.marker?.AdvancedMarkerElement)
}

function waitForGoogleMapsReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const check = () => {
      if (isGoogleMapsReady(window)) {
        resolve()
        return
      }
      if (Date.now() - startedAt >= 10000) {
        reject(new Error('Google Maps no terminó de inicializarse.'))
        return
      }
      window.setTimeout(check, 25)
    }
    check()
  })
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  const googleWindow = window as GoogleMapsWindow
  if (isGoogleMapsReady(googleWindow)) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  const existingScript = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com/maps/api/js"]')
  scriptPromise = existingScript
    ? waitForGoogleMapsReady()
    : new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&loading=async`
      script.async = true
      script.defer = true
      script.onload = () => { void waitForGoogleMapsReady().then(resolve, reject) }
      script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'))
      document.head.appendChild(script)
    })
  scriptPromise = scriptPromise.catch((error: unknown) => {
    scriptPromise = null
    throw error
  })
  return scriptPromise
}

export interface GoogleMapInstance {
  map: GoogleMap
  markers: GoogleMarker[]
  dispose: () => void
}

export function createMap(element: HTMLElement, points: readonly MapPoint[], onSelect: (index: number) => void): GoogleMapInstance {
  const maps = (window as GoogleMapsWindow).google?.maps
  if (!maps) throw new Error('Google Maps no está disponible.')
  const center = points[0] ?? { lat: -12.0464, lng: -77.0428 }
  const map = new maps.Map(element, { center, zoom: 13, mapId: 'DEMO_MAP_ID', mapTypeControl: false, streetViewControl: false })
  const bounds = new maps.LatLngBounds()
  const listeners: Array<() => void> = []
  const markers = points.map((point, index) => {
    bounds.extend(point)
    if (!maps.marker?.AdvancedMarkerElement) throw new Error('Advanced Markers no está disponible.')
    const marker = new maps.marker.AdvancedMarkerElement({ map, position: point, title: `Parada ${index + 1}`, gmpClickable: true })
    const listener = () => onSelect(index)
    marker.addEventListener('gmp-click', listener)
    listeners.push(() => marker.removeEventListener('gmp-click', listener))
    return marker
  })
  if (points.length > 1) map.fitBounds(bounds, 48)
  return {
    map,
    markers,
    dispose: () => {
      listeners.forEach((removeListener) => removeListener())
      markers.forEach((marker) => { marker.map = null })
    },
  }
}

export function drawRoute(map: GoogleMap, path: readonly MapPoint[]): GooglePolyline {
  const maps = (window as GoogleMapsWindow).google?.maps
  if (!maps) throw new Error('Google Maps no está disponible.')
  return new maps.Polyline({ map, path, strokeColor: '#166534', strokeOpacity: 0.9, strokeWeight: 5 })
}

export async function requestGoogleRoute(apiKey: string, points: readonly MapPoint[], signal?: AbortSignal): Promise<GoogleRoute> {
  if (points.length < 2) throw new Error('Se requieren al menos dos paradas.')
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline' },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: points[0].lat, longitude: points[0].lng } } },
      destination: { location: { latLng: { latitude: points.at(-1)?.lat, longitude: points.at(-1)?.lng } } },
      intermediates: points.slice(1, -1).map((point) => ({ location: { latLng: { latitude: point.lat, longitude: point.lng } } })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'es-PE',
      units: 'METRIC',
    }),
    signal,
  })
  if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'Google Maps rechazó la solicitud por configuración o cuota.' : 'Google Maps no pudo calcular el recorrido.')
  const result = await response.json() as { routes?: Array<{ distanceMeters?: number; duration?: string; polyline?: { encodedPolyline?: string } }> }
  const route = result.routes?.[0]
  if (!route?.polyline?.encodedPolyline || route.distanceMeters === undefined || !route.duration) throw new Error('Google Maps devolvió una respuesta incompleta.')
  return { path: decodePolyline(route.polyline.encodedPolyline), distanceMeters: route.distanceMeters, durationSeconds: Number.parseFloat(route.duration) }
}

function decodePolyline(encoded: string): MapPoint[] {
  const points: MapPoint[] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5 } while (byte >= 32)
    lat += (result & 1) ? ~(result >> 1) : result >> 1
    shift = 0
    result = 0
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5 } while (byte >= 32)
    lng += (result & 1) ? ~(result >> 1) : result >> 1
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

export type GooglePolylineInstance = GooglePolyline
