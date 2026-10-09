# Iniciar y reproducir la entrega local

Requisitos usados: Windows/PowerShell, Python 3.12.10, Node 24.13.0, npm 11.6.2,
Docker Desktop (primera ejecución 28.5.1; revisión final 29.8.2).
Dependencias fijadas en los lockfiles existentes.
Servicios solo en loopback: UI `http://127.0.0.1:5173`, API
`http://127.0.0.1:8000`, PostgreSQL `127.0.0.1:55439`.

## Estado de este clon

El entorno ya se creó durante la verificación:

- Contenedor `ecl-sprint2-20261008-1545-db` y volumen
  `ecl-sprint2-20261008-1545-data`, ambos nuevos y exclusivos de este trabajo.
- Desarrollo `ecl_sprint2_dev`; pruebas destructivas `ecl_sprint2_test`.
- Credenciales aleatorias locales en `.env.sprint2`, ignorado por Git.
- Dependencias Python en `backend/.venv/deps`; npm en `frontend/node_modules`.
- Semilla ya aplicada. Los recorridos de navegador añadieron conductores con
  prefijo DEMO y editaron referencias sintéticas. No son datos operativos.

No vuelvas a ejecutar la semilla sobre este entorno: rechaza datos existentes.
Puedes reanudar el contenedor conocido con:

```powershell
docker start ecl-sprint2-20261008-1545-db
```

## Instalación nueva

Desde la raíz, únicamente si no existe `.env.sprint2`, ejecuta:

```powershell
powershell -NoProfile -File scripts/new-sprint2-db.ps1
```

El script genera nombre de contenedor/volumen nuevos y contraseñas aleatorias.
Rechaza un archivo privado existente o el puerto ocupado. Usa la imagen PostGIS
fijada por digest; crea la base de pruebas desde `template_postgis`. Configura
`search_path=public` en desarrollo para que Alembic no interprete tablas de
la extensión Tiger como tablas de aplicación. No elimina contenedores ni datos.
Si hay un fallo intermedio, revisa los recursos nombrados en `.env.sprint2`;
no sustituyas el archivo para continuar sin comprobarlos.

Instala dependencias locales en una instalación nueva. Si cambia un lockfile,
vuelve a instalar sus dependencias antes de arrancar:

```powershell
Set-Location backend
python -m pip install --target .venv/deps -r requirements-dev.lock --index-url https://pypi.org/simple
Set-Location ../frontend
npm ci --ignore-scripts
Set-Location ..
```

Este fue el mecanismo utilizado en el entorno de ejecución: `PYTHONPATH`
selecciona ese directorio aislado. La alternativa convencional con virtualenv
está en [backend/README.md](../../backend/README.md). No mezcles mecanismos al
reproducir resultados y no versiones `.venv`, `node_modules` ni `.env.sprint2`.

## Migración y semilla: primera vez en una base nueva

Desde la raíz, carga los valores sin imprimir secretos:

```powershell
Get-Content .env.sprint2 | ForEach-Object {
    $key, $value = $_ -split '=', 2
    if ($key) { [Environment]::SetEnvironmentVariable($key, $value, 'Process') }
}
$env:APP_ENV = 'development'
Set-Location backend
$env:PYTHONPATH = '.venv/deps;.'
python -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { throw 'Migración fallida' }
python -m alembic current
python -m alembic check
if ($LASTEXITCODE -ne 0) { throw 'Diferencia de esquema' }
python -m app.seed_sprint2
```

Head esperado: `0007_create_conductor`. La semilla exige la base local
`ecl_sprint2_dev`, APP_ENV development, contraseña de 12+ caracteres y ausencia
de Usuario/Cliente/Conductor. Inserta todo en una transacción; no sobrescribe.

Cuentas sintéticas (misma contraseña local `DEMO_PASSWORD`, consultar el archivo
privado con el editor, no incorporarla a la presentación):

| Cuenta | Rol / uso |
|---|---|
| `operador@example.test` | Formularios de conductores, preferencias y pedidos |
| `admin@example.test` | Gestión y métricas |
| `conductor@example.test` | Asociación propia y vista de itinerario demo |
| `auditor@example.test` | Métricas; denegado el listado detallado de conductores |

Cliente sintético: `00000000-0000-4000-8000-000000000052`.
Nombre y campos identificados con DEMO. El DNI de ocho dígitos y teléfono de
ceros son datos de ensayo, sin atribución a personas reales.

## Iniciar API y UI

Desde la raíz del repositorio, ejecutar el script reproducible:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-sprint2.ps1
```

El script localiza la raíz desde `$PSScriptRoot`, carga `.env.sprint2` sin
imprimir sus valores, comprueba Docker, verifica el contenedor existente y lo
inicia únicamente si está detenido. Nunca crea otro contenedor ni elimina o
reinicia volúmenes. También comprueba PostgreSQL en `127.0.0.1:55439`.

El backend y el frontend se abren en terminales PowerShell separadas. Antes de
iniciar cada servicio, el script consulta sus puertos y endpoints: si ya
responde correctamente, lo conserva y lo reporta; si el puerto está ocupado
pero el servicio no es saludable, termina sin matar procesos ni iniciar un
duplicado. Al final verifica `http://127.0.0.1:8000/health/ready`.

Verifica `/health`, `/health/ready`, `/docs` y `/openapi.json` en el puerto 8000.
Usa **127.0.0.1** en ambos servicios para conservar cookies SameSite y CORS.
La identidad UI actual vive en memoria: recargar toda la página requiere volver
a iniciar sesión. Cambia de rol con una nueva pestaña/contexto y login. El menú
de usuario incluye **Cerrar sesión**, que revoca la sesión mediante `POST
/logout` antes de volver a `/login`.

Para detener: Ctrl+C en las terminales iniciadas por ti; `docker stop` sobre el
nombre exacto creado por el script. Conserva el volumen. No ejecutes downgrade
en desarrollo: las pruebas de reversibilidad usan exclusivamente `_test`.

## Repetir comprobaciones

Backend, tras cargar las dos URLs privadas y desde `backend`:

```powershell
$env:PYTHONPATH = '.venv/deps;.'
python -m pip check
python -m ruff check .
python -m ruff format --check .
python -m pytest tests/unit -q --cov=app --cov-report=term-missing --cov-fail-under=80
python -m pytest tests/integration -q
```

La base `_test` debe tener esquema public vacío antes de la suite, salvo
`spatial_ref_sys` y una `alembic_version` vacía. El fixture valida aislamiento y
rechaza datos previos. Sus downgrades son destructivos solo allí.

Frontend desde `frontend`:

```powershell
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

Navegadores, con API/UI y semilla disponibles:

```powershell
npm install --prefix node_modules/.sprint2-browser --no-package-lock --no-save playwright@1.58.2
node node_modules/.sprint2-browser/node_modules/playwright/cli.js install firefox
node scripts/verify-sprint2.mjs
```

Chrome debe estar instalado. El script usa Chrome y Firefox de Playwright,
inicia sesiones reales y modifica únicamente datos sintéticos de la base local.
Genera nuevos conductores DEMO y actualiza la referencia del cliente semilla.
Registra el SHA y blobs del código y rechaza fuentes con cambios sin commit.
Para conservar capturas anteriores, establece `SPRINT2_EVIDENCE_DIR` a un
directorio nuevo, por ejemplo `evidencias/repeticion-local` desde frontend.
Permite puertos alternativos con `SPRINT2_API_URL` y `SPRINT2_UI_URL`; deben
coincidir con VITE_API_BASE_URL y CORS. Produce resultado.json y capturas. Cada
ejecución sustituye esas capturas locales; las evidencias originales ECL-56 del
equipo permanecen intactas. Revisa el resultado antes de incorporarlo a Git.

## Recuperar datos sintéticos sin procesos abiertos

Conserva `.env.sprint2` y el volumen nombrado allí. Desde la raíz:

```powershell
Get-Content .env.sprint2 | ForEach-Object {
    $key, $value = $_ -split '=', 2
    if ($key) { [Environment]::SetEnvironmentVariable($key, $value, 'Process') }
}
docker start $env:SPRINT2_CONTAINER
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el contenedor conocido' }
docker exec $env:SPRINT2_CONTAINER pg_isready -U ecl_synthetic -d ecl_sprint2_dev
if ($LASTEXITCODE -ne 0) { throw 'Espera a que PostgreSQL esté listo' }
```

Después inicia API y UI en dos terminales con los bloques anteriores. No vuelvas
a sembrar: el volumen conserva las cuentas, altas y preferencias guardadas. Si el
volumen se perdió, una base **nueva** y la semilla reconstruyen solo los datos
iniciales; no recuperan ediciones posteriores. No hay sincronización remota ni
copia de seguridad automática.

Para instalar otro entorno mientras existe el archivo privado, utiliza otro
checkout limpio y un puerto libre (`-DatabasePort 55441`, por ejemplo). No borres
ni sustituyas la configuración existente. Sigue todos los bloques de instalación,
migración y semilla en ese checkout. Los puertos 8001/5174 se usaron en la revisión:
cambia el puerto de uvicorn, el de Vite, VITE_API_BASE_URL y CORS juntos.

La revisión conserva un entorno independiente en `.venv/revision-final`, con
archivo privado propio y volumen `ecl-sprint2-c2fe0c5adb1f-data`. En un clon nuevo
ese directorio no existe: usa el procedimiento de instalación nueva. No copies
sus credenciales a Git. Evidencia de recuperación: REVISION_FINAL.md.

## Mapa y recorrido de demostración

La pantalla de itinerario conserva datos sintéticos y no consulta una API de
asignaciones reales. Para activar el mapa en el navegador, crea o edita
`frontend/.env` (archivo local ignorado por Git) y configura:

```text
VITE_GOOGLE_MAPS_API_KEY=
```

La integración usa Maps JavaScript API con la librería `marker` y
`AdvancedMarkerElement` para los marcadores numerados. El recorrido vial usa
Routes API (`directions/v2:computeRoutes`) y solo muestra distancia, duración
y polilínea cuando Google devuelve una respuesta válida. En ese caso se
etiqueta **Recorrido de demostración**: el orden de paradas sintéticas no es
una optimización ni una asignación operativa.

En Google Cloud se deben habilitar, con una cuenta del proyecto y facturación
asociada, Maps JavaScript API y Routes API. Google puede cobrar por estas
solicitudes según la cuenta y el volumen; este repositorio no habilita
facturación. La clave `VITE_GOOGLE_MAPS_API_KEY` es visible en el navegador:
restrínjela por sitios web (orígenes locales y los dominios de despliegue) y
por las dos APIs necesarias. Nunca coloque credenciales privadas de servicios
en `VITE_*`, ni envíe DNI, teléfonos o credenciales a Google.

Sin clave, sin APIs habilitadas, con cuota agotada o ante una respuesta
incompleta, la lista de paradas y el detalle siguen utilizables y se muestra
el estado de configuración o error. No se dibuja una línea recta como
recorrido vial. La llamada real a Google queda pendiente de verificar en un
proyecto con clave restringida; las pruebas locales sin clave son simuladas.
