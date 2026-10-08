# Validación local de ST-030

Fecha: 08/10/2026, America/Lima.
Rama: `feature/st-030-itinerario-movil`.

Trazabilidad: **ECL-56 / ST-030 → ECL-22 / EN-004**.
Diseño previo requerido: **ECL-55 / ST-029**.
Commit del prototipo: `ea114f9`.
Pull Request: [#24](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/24).

El PR representa un avance parcial pendiente de aprobación humana. Su eventual
integración no implica finalizar ECL-56/ST-030 ni ECL-22/EN-004.

## Incremento

Prototipo del itinerario móvil con tres paradas ficticias, resumen por estado,
filtros, selección y detalle. La numeración conserva el orden original al filtrar
y el detalle corresponde a una parada visible. La ruta `/conductor/itinerario`
y su enlace están protegidos visualmente para el rol `CONDUCTOR`.

Se conserva la autenticación existente. Los itinerarios aún no consumen una API
de rutas y no incluyen GPS, cambios de estado, persistencia o sincronización offline.
No se implementa ST-023, gestión de conductores.

## Resultados ejecutados

| Comprobación | Resultado |
|---|---|
| `npm ci --no-audit --no-fund` | Correcto, sin modificar el lockfile. |
| `npm run typecheck` | Correcto. |
| `npm run lint` | Correcto. |
| `npm run test:coverage` | 257 pruebas aprobadas en 9 archivos. |
| Nueva pantalla | 100% de líneas, sentencias, funciones y ramas. |
| `App.tsx` | 100% de líneas, sentencias, funciones y ramas. |
| Cobertura global | Líneas 99.35%, sentencias 99.04%, funciones 100%, ramas 98.33%. |
| `npm run build` | Correcto. |
| `git diff --check` | Correcto. |
| PostgreSQL 16/PostGIS | Comprobación `app.db.check` aprobada. |
| Alembic `current` y `heads` | Ambos: `0006_create_cliente_pedido (head)`. |
| `GET /health` | `status: ok`. |
| Login HTTP real con cuenta ficticia | HTTP 200, rol `CONDUCTOR`. |
| CORS del login real | Origen `http://127.0.0.1:5173`, credenciales habilitadas. |
| Logout HTTP real | Correcto. |
| Frontend `/conductor/itinerario` | Vite devuelve HTTP 200; esto solo acredita que sirve la aplicación. |

Las pruebas de React comprueban selección, filtros, teclado, redirección a login
sin identidad y acceso denegado para Administrador, Operador, Analista y Auditor.
La prueba HTTP real acredita el backend de autenticación; falta comprobar el
recorrido completo desde el navegador.

El reporte HTML de cobertura se genera en `coverage/index.html`, ignorado por Git.
La primera ejecución restringida falló por `spawn EPERM`; la ejecución con permiso
para subprocesos pasó. No se cambiaron configuraciones para ocultar ese error.

## Entorno local de demostración

Se inició un proyecto Docker separado: `ecologistica-lima-st030-giancarlo`.
Usa un volumen nuevo; el volumen existente `ecologistica-lima-ecl29_postgis_data`
no se reutilizó. La base no publica un puerto al host. FastAPI escucha en
`http://127.0.0.1:8000` y Vite en `http://127.0.0.1:5173`.

La configuración privada y el acceso de la cuenta ficticia están en el archivo
local `.env.st030` de la raíz, ignorado por Git. Las claves de acceso son
`ST030_DRIVER_EMAIL` y `ST030_DRIVER_PASSWORD`. No adjuntar ese archivo ni incluir
sus valores en capturas, commits o Pull Requests. `frontend/.env.local` contiene
la URL local del API y también está ignorado.

Para volver a iniciar los contenedores preparados, desde la raíz:

```powershell
docker compose -p ecologistica-lima-st030-giancarlo --env-file .env.st030 up -d --wait db backend
```

Para detenerlos conservando el volumen:

```powershell
docker compose -p ecologistica-lima-st030-giancarlo --env-file .env.st030 down
```

El frontend se ejecuta por separado con el comando de desarrollo del README.

## Pendientes de aceptación y evidencias

- Implementación de la **siguiente parada** como información explícita del
  itinerario; seleccionar una parada para ver su detalle no satisface ese criterio.
- Implementación de **alertas operativas**; las indicaciones estáticas y el aviso
  de datos de demostración no satisfacen ese criterio.
- Prototipos de ECL-55/ST-029 en Figma, guía visual de componentes y aprobación
  del diseño que debe seguir ST-030.
- Navegación comprobada en **Chrome y Firefox**, con versiones registradas y
  capturas de la interfaz móvil a 360 px en ambos navegadores.
- Recorrido de login y apertura de **Mi itinerario** desde el navegador.
- Capturas de escritorio, móvil de 360 px, filtros y detalle seleccionado.
- Comprobación visual de ausencia de desplazamiento horizontal y foco de teclado.
- Evidencia de acceso anónimo y denegación a otros roles en navegador.
- Validación del diseño ST-029 y criterios definitivos de ST-030 en Jira.
- Aprobación humana del PR antes de integrar. Según la revisión compartida por
  el equipo, los seis checks de CI/CodeQL pasaron para `ea114f9`; estos resultados
  no sustituyen la aceptación funcional ni la revisión de nuevas revisiones.
- Conexión a itinerarios reales según los criterios acordados; la demo no acredita
  la aceptación completa de EN-004.

La sincronización offline corresponde al trabajo posterior **ECL-58 / ST-032**.
Este documento actualiza el registro local inicial: el usuario ya creó el commit,
publicó la rama y abrió el PR #24. Los resultados de pruebas anteriores corresponden
al código del prototipo; esta corrección documental no acredita los pendientes.
