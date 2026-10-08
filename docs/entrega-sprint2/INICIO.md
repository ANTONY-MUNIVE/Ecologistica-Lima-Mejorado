# Iniciar y reproducir la entrega local

Requisitos usados: Windows/PowerShell, Python 3.12.10, Node 24.13.0, npm 11.6.2,
Docker Desktop con motor 28.5.1. Dependencias fijadas en los lockfiles existentes.
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

Instala dependencias locales (solo en una instalación nueva):

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

En una terminal desde la raíz, carga `.env.sprint2` como en el bloque anterior:

```powershell
Get-Content .env.sprint2 | ForEach-Object {
    $key, $value = $_ -split '=', 2
    if ($key) { [Environment]::SetEnvironmentVariable($key, $value, 'Process') }
}
$env:APP_ENV = 'development'
$env:CORS_ALLOWED_ORIGINS = '["http://127.0.0.1:5173"]'
Set-Location backend
$env:PYTHONPATH = '.venv/deps;.'
python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

En otra terminal desde la raíz:

```powershell
Set-Location frontend
$env:VITE_API_BASE_URL = 'http://127.0.0.1:8000'
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Verifica `/health`, `/health/ready`, `/docs` y `/openapi.json` en el puerto 8000.
Usa **127.0.0.1** en ambos servicios para conservar cookies SameSite y CORS.
La identidad UI actual vive en memoria: recargar toda la página requiere volver
a iniciar sesión. Cambia de rol con una nueva pestaña/contexto y login; no hay
control visual de logout añadido en este incremento.

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
Produce `frontend/evidencias/sprint2-local/resultado.json` y capturas. Cada
ejecución sustituye esas capturas locales; las evidencias originales ECL-56 del
equipo permanecen intactas. Revisa el resultado antes de incorporarlo a Git.
