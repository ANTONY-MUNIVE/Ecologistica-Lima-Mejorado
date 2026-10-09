# Revisión final local para el 9 de octubre de 2026

## Dictamen

**Apta para una demostración de avance local con límites explícitos.** No acredita
aceptación del Sprint, DoD completo, aprobación de contratos BDD ni preparación
para producción. Se revisó código y se reconstruyó un entorno independiente;
las comprobaciones nuevas no dependen del informe de la primera entrega.

Exponer como persistencia real: conductores, preferencias sobre Cliente y
consulta de preferencias en Pedido, con sesiones y permisos reales. Exponer el
itinerario de Giancarlo como **demo**. Instrumentación es un incremento parcial;
offline, carga, SLA, payload de dashboard y optimización no están acreditados.

## Identidad y alcance de la revisión

- Entrada: `respaldo/sprint2-integracion`, SHA completo
  `6e984427f87a15e4972b55aa968ae6ed73291824`, árbol limpio y sin operación Git pendiente.
- Base registrada: `099838bdec64c16c4ecaee04644f2f69ec2c46dc`, merge del PR #24.
  Se conservan `main`, la rama inicial, historial y aportes del equipo.
- Código final comprobado: `8c3180de705172fd9bc211fbac4258c707c7f43e`.
  Los commits posteriores de cierre contienen documentación y evidencia.
- `fetch upstream` se ejecutó; upstream/main observado al cierre de consulta:
  `de1819cdc5c2e308d90618d756c6028dc233e2d1`. Su diff contra la base registrada
  contiene únicamente los dos BDD de Frank y el plan de capacidad (840 líneas).
  No se incorporó automáticamente ese avance al código local.
- Remotos comprobados: upstream `JulioNaupariC/EcoLog-stica-Lima`, origin
  `ANTONY-MUNIVE/Ecologistica-Lima-Mejorado`, ambos por HTTPS.
  La consulta de metadata GitHub volvió a confirmar **origin público**.
  No se cambió visibilidad ni se realizaron push, PR, merge remoto o escrituras Jira.

La matriz de [ENTREGA.md](ENTREGA.md) contiene exactamente ECL-46 a ECL-64,
las 19 subtareas consultadas en Jira con sus responsables y dependencias.
Estados consultados: ECL-59 En curso; las otras 18 Tareas por hacer.
Ninguna se declara Hecho a partir de pruebas locales.

| Clasificación del avance | Subtareas | Límite |
|---|---|---|
| Implementación con comprobaciones locales | 46, 48, 49, 50, 52, 53, 54 | Contrato final/aceptación pendientes; no equivale a cumplimiento de todos los BDD candidatos |
| Documentos del equipo disponibles | 47, 51, 59 | BDD borrador y plan; fusión de PR no implica aprobación de negocio ni pruebas ejecutadas |
| Diseño externo revisado | 55 | PR #25 revisado, no incorporado automáticamente; Figma/aprobación no verificada |
| Demostración conservada | 56 | Itinerario ficticio de PR #24, sin rutas reales/GPS/persistencia de entregas |
| Implementación parcial | 57, 60 | Responsive y teclado comprobados; WCAG completa no verificada. Métricas por proceso, sin agregación/SLA |
| Entregable requerido no realizado | 58, 61, 62, 63, 64 | Sin offline/sync, carga, informe SLA, EXPLAIN/payload representativos o optimización comparativa |

## Revisión directa de código y correcciones

Se inspeccionaron migración 0007, modelo Conductor, esquemas, repositorios,
servicios y routers de conductores/preferencias, autenticación/dependencias/RBAC,
formulario y servicio DriversPage, PreferencesPage y propuesta en Pedido.

- DNI y usuario vinculado únicos en PostgreSQL; cuenta nullable, si se vincula
  debe existir y ser Conductor activo. POST no crea cuentas. Intervalo obligatorio
  con zona; licencia vencida rechazada según día de Lima. PATCH bloquea null y
  revalida el registro completo: editar otro campo con licencia ya vencida exige
  renovarla en la misma operación. No hay motor de elegibilidad/asignación.
- Transacciones con rollback; actualización bloquea fila objetivo. Preferencias
  reutilizan Cliente, conservan omitidos y borran null; 120/255/255; recortan texto.
  Pedido propone información y copia referencia solo con acción explícita.
- Administrador/Operador gestionan; Conductor consulta su vínculo por `/me`.
  Detalle por ID/listado denegado a Conductor, Analista y Auditor. La UI no sustituye
  la autorización del servidor. No se añadió API itinerario/reportes ni delete.

| Problema demostrado | Corrección / commit local | Comprobación |
|---|---|---|
| FastAPI incluía entradas personales en errores 422 de conductores | Ruta de validación que devuelve solo type/loc/msg, sin input/ctx ni nombres desconocidos; `01b0e26` | 4 regresiones de privacidad, sin llamada al servicio para entradas inválidas |
| Mismo eco de entrada en preferencias | Aplicación de ruta privada; `499826c` | 2 regresiones con referencia larga y propiedad desconocida |
| Borrar cuenta vinculada en formulario aparentaba éxito aunque API la preservaba | Rechazo visible y foco en campo; `e78e1de` | Test falló antes del arreglo; pruebas UI y ambos navegadores después |
| Evidencia anterior no ligaba captura a código | SHA, blobs y origen local configurables en verificador; `715eaf6` | Nuevo resultado.json; se conservan capturas antiguas |
| Dependencia dev source-map-js 1.2.1 con aviso alto GHSA-68fv-2mgg-jv7q | Parche 1.2.2; `8f4e931`, seguido de `688045a` que conserva versiones ajenas | Diff neto solo tres valores de esa dependencia; instalación limpia, audit, build y suite frontend |
| Login también repetía credenciales ante entrada inválida | Reutiliza ruta privada, sin cambiar cookies/roles/login válido; `8c3180d` | 2 regresiones fallaron antes; 11 pruebas auth pasaron después |

`cadaa0b` refuerza pruebas de preferencias: dos clientes independientes, lectura
del cliente no objetivo y rechazo de patch mixto sin modificación parcial.
No se alteraron requisitos de línea base, RBAC, umbrales ni migraciones históricas.

## BDD disponibles de Frank y diferencias

Se leyeron ambos archivos completos de upstream/main, incluidos D1–D9, escenarios
RN-005 y P1–P8/P4a–c. **Ambos dicen BORRADOR y requieren ratificación.** Los
“acuerdos de Frank para revisión” siguen pendientes de Antony/Julio; no se
equiparan a acuerdos del equipo. Su descripción de ausencia de API corresponde
a la base 099838b, no al código local posterior.

| Tema/escenario | Borrador vigente de Frank | Código entregado / pendiente |
|---|---|---|
| D1 cuenta | Cuenta Conductor obligatoria y alta atómica distinta del actor | Perfil admite ausencia o vínculo con cuenta existente; no crea cuenta. Provisionamiento de credenciales bloquea contrato final |
| D2/D5 DNI/atomicidad | Unicidad, rechazo inválidos, sin datos eco/registro parcial | Comprobado localmente para perfil; no se prueba alta atómica de usuario porque no existe |
| D3/D3a licencia | Guardar vencido, no asignable hasta renovación; evaluar fecha de ruta | Código rechaza guardado vencido; no hay habilitado_asignacion ni motor. Ambigüedad RF-003/US-003 requiere control de cambios |
| D4 disponibilidad | Ambos extremos en PATCH; ambos null limpian y deshabilitan | Código acepta cambio de un extremo si intervalo resultante válido; no permite null. UI intervalo Lima; almacenamiento timestamptz |
| DNI/licencia/contacto | Trim DNI; licencia_numero 20, mayúsculas/patrón; contacto E.164 | DNI estricto sin trim; campo licencia 40 y telefono 30, sin ese patrón/normalización; experiencia SMALLINT ≤32767 es límite técnico |
| D6/D7 lectura propia | GET por ID propio permitido; ajeno 403; mínimo sin Analista/Auditor | Propio disponible por /me; GET por ID devuelve 403 también si propio. Denegación ajena y roles comprobados |
| D9 listado/proyección | Paginación page/page_size, orden ID, proyección sin DNI/licencia/contacto | Lista no paginada con detalle completo solo Admin/Operador; no cumple candidato D9. Alcance de proyección/paginación pendiente |
| D8 / RN-005 | Agregado Auditor y restricciones de conducción, fuera del mínimo CRUD | No implementados; no inferir cumplimiento por disponibilidad o métricas |
| P1/P2/P3/P5/P6/P7 | Cliente existente, persistencia, capacidades, inexistencia, aislamiento y permisos | Comprobaciones locales U/I y flujo V; no aceptación de Frank |
| P4a/b/c | Omitir conserva; null limpia; vacío/solo espacios rechaza; no vacío se preserva exacto | Primeras tres conductas comprobadas; **FE y API recortan espacios exteriores**, diferencia explícita pendiente |
| P8 | Horario/restricción informativos y acción explícita de referencia | Comprobado en UI y pedido por integración; ninguna conversión automática de horario |

Fuentes externas examinadas, sin incorporación automática:

- [PR #26](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/26), head
  `add47db9506cca64364b1525c782928d43c9f36c`, merge
  `d3e64bc53bce3ef014c8d4a5bd1a8d74e2d7a6ce` (21:43:41 UTC, 8/oct).
- [PR #27](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/27), head
  `aa71f8abd15cb5c2baaeba5da6d53f9ef79e3a5b`, merge
  `de1819cdc5c2e308d90618d756c6028dc233e2d1` (21:46:23 UTC, 8/oct).
- [PR #23](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/23), head
  `16e0b5ae111cc05efbf6579769c8c56a84d425b3`, merge
  `f15e9a7dabfa9b22ee8d0542f6241fbc80419a38` (21:28:58 UTC, 8/oct).
  El plan vigente corrige RNF-007 disponibilidad/RNF-008 capacidad; la observación
  del informe anterior sobre referencias invertidas es histórica.

## Entorno reproducido y evidencia

Checkout limpio creado con Git worktree en `.venv/revision-final`; dependencias
instaladas desde lockfiles sin reutilizar node_modules/deps del checkout principal.
Windows/PowerShell; Python 3.12.10; Node 24.13.0; npm 11.6.2; Docker 29.8.2;
PostgreSQL 16.9 y PostGIS 3.5.2, imagen del digest fijado por el script.

Contenedor nuevo `ecl-sprint2-c2fe0c5adb1f-db`, volumen nuevo
`ecl-sprint2-c2fe0c5adb1f-data`; puerto loopback 55441; bases distintas
`ecl_sprint2_dev` y `ecl_sprint2_test`. API 8001, UI 5174, procesos iniciados para
esta revisión. Credenciales aleatorias propias en archivo ignorado.

La creación fue interrumpida al cambiar de sesión: se verificó el contenedor
identificado antes de completar search_path public y crear la base _test.
El primer alembic check detectó Tiger porque esa inicialización no había acabado;
tras completarla pasó. No se eliminaron extensiones ni reutilizaron bases ajenas.

Comandos completos: [INICIO.md](INICIO.md) y
[environment.json](../../frontend/evidencias/revision-final/environment.json).
Resultados y capturas nuevas: [evidencias/revision-final](../../frontend/evidencias/revision-final/README.md).
Los resultados históricos de VALIDACION.md permanecen identificados como previos.

| Comando realmente ejecutado | Resultado final / evidencia |
|---|---|
| pip check; ruff check .; ruff format --check . | Sin dependencias rotas; pasó; 117 archivos formateados |
| alembic upgrade head; current; check | Head 0007_create_conductor; sin nuevas operaciones |
| pytest tests/unit -q --cov=app --cov-report=term-missing --cov-fail-under=80 | **344 passed**, cobertura **90,73 %**, 2 avisos de deprecación; backend-unit.txt |
| pytest tests/integration -q | **101 passed**, 0 omitidas, 94,49 s (duración de suite, no benchmark); backend-integration.txt |
| npm ci --ignore-scripts; npm audit --json | Instalación limpia; cero avisos de vulnerabilidad en esa consulta; npm-audit.json |
| npm run lint; npm run typecheck | Pasaron |
| npm run test:coverage | **293 passed**, 15 archivos; statements **96,96 %**, branches **93,72 %**, functions **98,86 %**, lines **98,55 %**; frontend-coverage.txt |
| npm run build | Pasó, 41 módulos; no acredita payload del dashboard |
| node scripts/verify-sprint2.mjs | Chrome **154.0.8037.98** y Firefox **146.0.1** pasaron; 360/1280 px, sin overflow ni pageErrors |

Recorrido final fechado **9/oct 02:03:58 UTC = 8/oct 21:03:58 Lima**. SHA y blobs
en resultado.json corresponden a 8c3180d. Frontend se probó en 688045a; el diff
posterior de fuentes frontend es vacío. API reiniciada con el SHA final antes de
regenerar capturas. Se inspeccionaron visualmente conductores móvil y Pedido con
preferencias móvil; no se afirma una auditoría WCAG completa.

La semilla nueva creó 4 cuentas, 1 Cliente y 1 Conductor; los dos recorridos
añadieron 4 conductores sintéticos. La recuperación usa el mismo volumen, sin
ejecutar otra vez semilla ni reinstalar dependencias. Las credenciales privadas
son necesarias para reanudar; no dependen de un proceso previo.

Se detuvieron los PID nuevos de API/UI y el contenedor nombrado; se inició ese
contenedor y se compararon SHA-256 de filas ordenadas de Usuario/Cliente/Conductor
antes/después. Resultado: **idénticas**, 4/1/5 filas, head 0007. Se iniciaron API/UI
en procesos nuevos con los bloques de INICIO y se ejecutó un smoke de Chrome:
readiness 200, login real, 5 tarjetas y referencia de Cliente recuperada.
Evidencias: recovery.txt y recovery-smoke.txt. Comandos efectivos: `docker stop`
y `docker start ecl-sprint2-c2fe0c5adb1f-db`, `python .venv/check_recovery.py`
desde backend y `node node_modules/recovery-smoke.mjs` desde frontend. Los dos
helpers temporales permanecen ignorados en el checkout de revisión; para reanudar
desde un clon nuevo no son necesarios (INICIO incluye los comandos de recuperación).

Barrido de 260 archivos originalmente versionados y de la evidencia nueva:
sin coincidencias con las contraseñas privadas de ambos entornos; sin `.env`
sensible, node_modules, entornos virtuales, pyc, claves privadas o logs de servidor
versionados. Los .env.example son ejemplos; los marcadores de credenciales en
tests son ficticios. Las cadenas de conexión privadas no se copiaron a evidencias.
Se verificaron diffs de línea base y evidencias del equipo: preservados.

Al cierre se verificaron las 25 huellas del manifiesto contra blobs de Git y se
repitió el barrido sobre los **287 archivos versionados**: sin coincidencias de
secretos privados ni rutas prohibidas. El clon principal quedó con `npm ci`
actualizado y `npm audit` cero. Se detuvieron los procesos conocidos de la demo
previa y de esta revisión; los volúmenes se conservan. Para exponer, inicia según
INICIO.md; no hay un servidor anterior del que dependa el procedimiento.

## Riesgos para la exposición y aceptación

1. Las diferencias de contrato BDD anteriores son reales y requieren ratificación;
   no presentar el CRUD como aprobación de ECL-47/51 ni como asignador de rutas.
2. No hay catálogo/búsqueda nueva de clientes: se usa UUID existente. Cuenta opcional
   no es aprovisionamiento de identidad; no hay desvinculación desde formulario.
3. Recargar UI exige login nuevo; no hay control visual nuevo de logout. Preparar
   contextos separados por rol y no proyectar credenciales/cookies.
4. No hay offline, sync ni GPS. Métricas desaparecen al reiniciar proceso y no
   representan P95/SLA. Carga, EXPLAIN, dashboard/payload y optimización: no verificados.
5. CI remoto, peer review, aceptación, SAST y WCAG AA completa: **no verificada**.
   Npm audit cero es un resultado puntual de dependencias, no certificación SAST.
6. Origin público exige mantener secretos privados; ningún cambio se publicó.
   Barrido local no certifica ausencia de secretos en todo el historial remoto.

Recorrido de 5–7 minutos: [GUION.md](GUION.md). Arranque y recuperación del volumen:
[INICIO.md](INICIO.md). Si falla el entorno, identificar capturas como evidencia
previa y no anunciar un guardado que no ocurrió.
