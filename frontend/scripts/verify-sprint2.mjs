// Real local API + synthetic PostgreSQL data. No intercepted HTTP responses.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const { chromium, firefox } = await import('../node_modules/.sprint2-browser/node_modules/playwright/index.mjs')
const privateText = await readFile(new URL('../../.env.sprint2', import.meta.url), 'utf8')
const settings = Object.fromEntries(privateText.split(/\r?\n/).filter((line) => line.includes('=')).map((line) => {
  const position = line.indexOf('=')
  return [line.slice(0, position), line.slice(position + 1)]
}))
assert(settings.DEMO_PASSWORD, 'Falta DEMO_PASSWORD en el archivo privado local')
const output = fileURLToPath(new URL('../evidencias/sprint2-local/', import.meta.url))
await mkdir(output, { recursive: true })
const results = []
for (const [name, launcher, options] of [
  ['chrome', chromium, { channel: 'chrome' }],
  ['firefox', firefox, {}],
]) {
  const browser = await launcher.launch({ headless: true, ...options })
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, timezoneId: 'America/Lima' })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', () => errors.push('pageerror'))
  const width = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Desbordamiento horizontal')
  const capture = async (label) => { await width(); await page.screenshot({ path: `${output}/${name}-${label}.png`, fullPage: true }) }
  const login = async (email) => {
    await page.goto('http://127.0.0.1:5173/login')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña').fill(settings.DEMO_PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await page.getByRole('heading', { name: 'Rutas sostenibles para Lima' }).waitFor()
  }
  let phase = 'login'
  try {
    await login('operador@example.test')
    phase = 'formulario y persistencia de conductores'
    await page.getByRole('link', { name: 'Conductores', exact: true }).click()
    await page.getByText('DEMO Conductor sintético 01', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Guardar conductor' }).click()
    assert.equal(await page.locator('#driver-nombre').evaluate((node) => node === document.activeElement), true)
    const dni = String(91000000 + Math.floor(Math.random() * 999999))
    const driverName = `DEMO Navegador ${name} ${dni}`
    for (const [field, value] of Object.entries({
      nombre: driverName, dni, licencia: `DEMO-${dni}`, licencia_vigente_hasta: '2028-10-09',
      experiencia_anios: '2', telefono: '000000000', disponible_desde: '2026-10-09T08:00',
      disponible_hasta: '2026-10-09T16:00', punto_partida: 'DEMO Depósito sintético',
    })) await page.locator(`#driver-${field}`).fill(value)
    await page.getByRole('button', { name: 'Guardar conductor' }).click()
    await page.getByText(`Conductor ${driverName} guardado.`, { exact: true }).waitFor()
    const card = page.locator('.drivers-page .driver-card').filter({ hasText: driverName })
    await card.getByRole('button', { name: 'Editar', exact: true }).click()
    await page.locator('#driver-punto_partida').fill('DEMO Partida editada y persistida')
    const patchResponse = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes('/conductores/'))
    await page.getByRole('button', { name: 'Guardar conductor' }).click()
    assert.equal((await patchResponse).status(), 200)
    await card.getByText('Partida: DEMO Partida editada y persistida', { exact: true }).waitFor()
    await capture('conductores-360')
    await page.setViewportSize({ width: 1280, height: 900 })
    await capture('conductores-1280')
    phase = 'preferencias y consulta en pedido'
    await page.setViewportSize({ width: 360, height: 800 })
    await page.getByRole('link', { name: 'Preferencias', exact: true }).click()
    await page.getByLabel('ID del cliente (UUID)').fill('00000000-0000-4000-8000-000000000052')
    await page.getByRole('button', { name: 'Consultar cliente' }).click()
    await page.getByLabel('Punto de referencia', { exact: true }).fill(`DEMO Referencia persistida ${name}`)
    await page.getByRole('button', { name: 'Guardar preferencias' }).click()
    await page.getByText('Preferencias guardadas para el cliente consultado.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Consultar cliente' }).click()
    await page.getByRole('form', { name: 'Editar preferencias' }).waitFor()
    assert.equal(await page.getByLabel('Punto de referencia', { exact: true }).inputValue(), `DEMO Referencia persistida ${name}`)
    await capture('preferencias-360')
    phase = 'pedido: navegar y consultar preferencias'
    await page.getByRole('link', { name: 'Registrar pedido', exact: true }).click()
    await page.getByLabel('ID del cliente (UUID)').fill('00000000-0000-4000-8000-000000000052')
    await page.getByRole('button', { name: 'Consultar preferencias del cliente' }).click()
    phase = 'pedido: referencia recuperada'
    await page.getByText(`Referencia: DEMO Referencia persistida ${name}`, { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Usar referencia', exact: true }).click()
    assert.equal(await page.getByLabel('Punto de referencia', { exact: true }).inputValue(), `DEMO Referencia persistida ${name}`)
    await capture('pedido-preferencias-360')
    phase = 'itinerario de demostración, teclado y lista vacía'
    assert.equal((await context.request.post('http://127.0.0.1:8000/logout')).status(), 204)
    await login('conductor@example.test')
    await page.getByRole('link', { name: 'Mi itinerario', exact: true }).click()
    await page.getByRole('heading', { name: 'Siguiente parada', exact: true }).waitFor()
    await capture('itinerario-demo-360')
    await page.getByRole('button', { name: 'Ver detalle de parada', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('heading', { name: 'Detalle de parada', exact: true }).waitFor()
    await page.keyboard.press('Tab')
    const back = page.getByRole('button', { name: 'Volver al itinerario' })
    assert(await back.evaluate((element) => element === document.activeElement))
    assert(await back.evaluate((element) => getComputedStyle(element).outlineStyle !== 'none'))
    await capture('detalle-foco-360')
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: 'Ver ejemplo sin asignación' }).click()
    await page.getByRole('heading', { name: 'Aún no tienes un itinerario' }).waitFor()
    await capture('itinerario-vacio-360')
    await page.getByRole('button', { name: 'Cargar ejemplo de itinerario' }).click()
    await page.setViewportSize({ width: 1280, height: 900 })
    await capture('itinerario-demo-1280')
    phase = 'RBAC real de auditor'
    assert.equal((await context.request.post('http://127.0.0.1:8000/logout')).status(), 204)
    await login('auditor@example.test')
    assert.equal(await page.getByRole('link', { name: 'Conductores', exact: true }).count(), 0)
    assert.equal((await context.request.get('http://127.0.0.1:8000/conductores')).status(), 403)
    assert.equal((await context.request.get('http://127.0.0.1:8000/internal/metrics')).status(), 200)
    assert.equal(errors.length, 0)
    results.push({ browser: name, version: browser.version(), result: 'passed', widths: [360, 1280], login: 'real', api: 'real', itinerary: 'demo', horizontalOverflow: false, pageErrors: errors.length })
    console.log(`${name}: recorrido correcto`)
  } catch {
    results.push({ browser: name, version: browser.version(), result: 'failed', phase })
    console.error(`${name}: fallo en ${phase}; no se imprimen datos privados`)
    process.exitCode = 1
  } finally {
    await context.close()
    await browser.close()
  }
}
await writeFile(`${output}/resultado.json`, JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2) + '\n')
