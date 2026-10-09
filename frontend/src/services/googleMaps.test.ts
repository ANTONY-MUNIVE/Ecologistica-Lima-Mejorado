import { createMap, requestGoogleRoute } from './googleMaps'

describe('Google Routes adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports provider configuration or quota failures without fabricating a route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })))
    await expect(requestGoogleRoute('demo-key', [{ lat: -12, lng: -77 }, { lat: -12.01, lng: -77.01 }]))
      .rejects.toThrow('configuración o cuota')
  })

  it('rejects an incomplete provider response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ routes: [{}] }), { status: 200 })))
    await expect(requestGoogleRoute('demo-key', [{ lat: -12, lng: -77 }, { lat: -12.01, lng: -77.01 }]))
      .rejects.toThrow('respuesta incompleta')
  })

  it('removes marker listeners and detaches markers on disposal', () => {
    const markerInstances: Array<{ map: unknown; removed: string[] }> = []
    class FakeMap {
      fitBounds() {}
    }
    class FakeBounds {
      extend() {}
    }
    class FakeMarker {
      map: unknown
      removed: string[] = []
      constructor() {
        this.map = {}
        markerInstances.push(this)
      }
      addEventListener() {}
      removeEventListener(event: string) {
        this.removed.push(event)
      }
    }
    class FakePolyline {}
    vi.stubGlobal('google', { maps: { Map: FakeMap, LatLngBounds: FakeBounds, Polyline: FakePolyline, marker: { AdvancedMarkerElement: FakeMarker } } })

    const instance = createMap(document.createElement('div'), [{ lat: -12, lng: -77 }], () => undefined)
    instance.dispose()

    expect(markerInstances[0].removed).toEqual(['gmp-click'])
    expect(markerInstances[0].map).toBeNull()
  })
})
