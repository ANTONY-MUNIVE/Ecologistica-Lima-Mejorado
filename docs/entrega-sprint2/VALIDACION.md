# Validaciones de la primera entrega — 8/oct/2026

**Registro histórico anterior a la revisión final.** Estas capturas no contienen
SHA de origen y no acreditan por sí solas las correcciones posteriores. Resultados
y evidencias del código revisado: [REVISION_FINAL.md](REVISION_FINAL.md).

Entorno local Windows, Python 3.12.10, Node 24.13.0/npm 11.6.2.
PostgreSQL **16.9** y PostGIS **3.5.2** del digest fijado en el proyecto.
BD de desarrollo y pruebas nuevas y separadas; no se reutilizaron volúmenes.
Comandos reproducibles: [INICIO.md](INICIO.md).

| Comprobación realmente ejecutada | Resultado |
|---|---|
| `python -m pip check` con dependencias locales | No broken requirements found |
| `ruff check .` backend | All checks passed |
| `ruff format --check .` backend | 116 archivos ya formateados |
| `pytest tests/unit -q --cov=app --cov-report=term-missing --cov-fail-under=80` | **336 passed**, cobertura global **90,60 %**, umbral 80 % cumplido |
| `pytest tests/integration -q` con ambas URLs explícitas | **101 passed**, cero omitidas; 97,87 s de ejecución, no benchmark de API |
| Migración desarrollo a head y `alembic check` | `0007_create_conductor`; No new upgrade operations detected |
| Migración conductor 0006→0007→0006, restricciones y conservación tras rechazo | Pasó en base de pruebas; integrada en las 101 pruebas |
| Semilla de datos sintéticos en desarrollo | Creó cuatro cuentas, un Cliente y un Conductor; sin credenciales versionadas |
| `npm run lint` | Pasó |
| `npm run typecheck` | Pasó |
| `npm run test:coverage` | **292 passed**, 15 archivos; statements **96,95 %**, branches **93,68 %**, functions **98,86 %**, lines **98,54 %** |
| `npm run build` | Pasó, 41 módulos transformados; build no prueba el límite de payload del dashboard |
| `node scripts/verify-sprint2.mjs` | Chrome **154.0.8037.98** y Firefox **146.0.1**: passed, con API/sesiones reales |
| `scripts/new-sprint2-db.ps1 -DatabasePort 55440` | Sintaxis válida y ejecución completa correcta en directorio privado temporal, contenedor y volumen nuevos; PostGIS 3.5.2 verificado; recursos de esta comprobación retirados, demo conservada |

El backend emite dos avisos de deprecación del conjunto fijado de
FastAPI/Starlette/httpx y BlockingPortal. No se cambiaron lockfiles para ocultarlos.

## Evidencia por incremento

- Conductores: modelo, schema, API, servicio y repositorio cubiertos por pruebas
  unitarias; servicio/repositorio 100 %, schema 96 %, router 83 %. Migración con
  DNI único y ventana inválida; HTTP con cookie real, operadores/admin, denegación
  de Auditor/Analista/Conductor para datos generales, `/me`, rechazo de cuenta
  inválida, licencia vencida y duplicado sin filas adicionales ni cambios parciales.
- Preferencias: tests U API/schema/servicio/Cliente; el conjunto de esos cuatro
  módulos en la suite final alcanza 87,5 %. Integración verifica persistencia,
  null para borrar, longitud/extrablancos, 404, RBAC y copia explícita a Pedido.
- Observabilidad: registro SQL 100 %, router 86 %; I verifica contadores de negocio
  y auditoría reales y ausencia de DNI/UUID en métricas. Readiness verificada contra
  la BD real; fallos de readiness cubiertos por pruebas unitarias controladas,
  **no se ejecutó una caída real de la BD**.
- Frontend: DriversPage 90,99 % statements / 82,35 % branches; PreferencesPage
  98,41 % / 80,43 %; OrderCreatePage 92,71 % / 87,82 %. No se redujeron umbrales.

## Recorrido visual

[Resultado estructurado](../../frontend/evidencias/sprint2-local/resultado.json),
ejecutado a las 20:57:27 UTC (15:57 Lima). Todas las cuentas son sintéticas.
El script no intercepta ni inventa respuestas HTTP.

- Login real Operador; validación del formulario vacío y foco en nombre.
- Alta y edición de conductor sin cuenta asociada; respuesta PATCH 200 y
  lectura posterior del dato persistido.
- Guardado y nueva consulta de preferencias; consulta desde Pedido y acción
  Usar referencia. La creación efectiva de Pedido se verificó por integración HTTP.
- Login real Conductor; itinerario **demo**, detalle con Enter, regreso con Tab/Space,
  foco visible y ejemplo sin asignación.
- Login real Auditor; ausencia del enlace de gestión, API conductores 403 y
  métricas 200.
- Sin desbordamiento horizontal en capturas de 360/1280 px y sin errores de
  ejecución de página en los dos navegadores. Esto no certifica WCAG AA completo.

Capturas representativas (las demás están en el mismo directorio):

- [Conductores móvil](../../frontend/evidencias/sprint2-local/chrome-conductores-360.png)
- [Conductores escritorio](../../frontend/evidencias/sprint2-local/chrome-conductores-1280.png)
- [Preferencias móvil](../../frontend/evidencias/sprint2-local/chrome-preferencias-360.png)
- [Pedido y preferencias](../../frontend/evidencias/sprint2-local/firefox-pedido-preferencias-360.png)
- [Itinerario demo móvil](../../frontend/evidencias/sprint2-local/firefox-itinerario-demo-360.png)
- [Detalle y foco](../../frontend/evidencias/sprint2-local/chrome-detalle-foco-360.png)
- [Itinerario demo escritorio](../../frontend/evidencias/sprint2-local/chrome-itinerario-demo-1280.png)

Se inspeccionaron visualmente las capturas de preferencias móvil e itinerario
escritorio, además de las comprobaciones automáticas del recorrido.

## Fallos detectados y resueltos durante la ejecución

1. Edición sin cuenta enviaba `usuario_id:null`, incompatible con PATCH: el
   servicio UI omite el valor ausente; test de contrato y navegador real pasan.
2. Test histórico de Pedido intentaba comparar metadata en 0006 tras agregar
   0007: conserva aserciones de 0006 y aplica head antes de `alembic check`.
   Primera suite: 99 passed, 1 failed, 1 skipped. Suite final: 101 passed.
3. Base Docker por defecto incluía Tiger en search_path: configurado `public`
   exclusivamente en la nueva base de desarrollo; no se borraron extensiones.
4. Clase CSS `.driver-card` compartida: los estilos de gestión se limitan a
   `.drivers-page`, preservando tarjetas del itinerario.
5. Primera ejecución del guion de navegador buscaba texto sin el prefijo
   «Referencia:»; selector corregido, después ambos navegadores pasaron.
6. Lint detectó JSON sin tipar en una prueba nueva: se usa `unknown`, sin `any`
   ni desactivación de reglas; controles frontend repetidos y aprobados.

## No verificada / pendientes de aceptación

CI remoto de estos commits, CodeQL/SAST sin vulnerabilidades críticas, peer
review y aceptación del equipo: **no verificada**. Ruff no reemplaza SAST.
Auditoría completa WCAG/lectores/contraste: **no verificada**.
Carga 1000/50/100, P95≤2s, 5xx<1 % bajo carga, SLA mensual≥99,5 %, payload de
dashboard≤250KB, planes EXPLAIN representativos y optimización comparativa:
**no verificada**. Offline y sincronización: **no implementados**.

No se alteró Jira para reflejar estas verificaciones ni se interpretan como DoD completo.
