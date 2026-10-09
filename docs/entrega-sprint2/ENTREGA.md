# Avance local Sprint 2 — entrega del 9 de octubre de 2026

Corte de verificación: 8 de octubre de 2026, America/Lima. Revisión final:
[REVISION_FINAL.md](REVISION_FINAL.md). Este documento describe
un respaldo independiente. **Ninguna tarea se declara Hecho ni aceptada.**
No se modificó Jira ni se publicaron ramas, PR o merges remotos.

## Fuentes y base

- Se leyeron `AGENTS.md`, README y los documentos de requisitos funcionales,
  no funcionales, reglas, stack, base de datos, C4 y planificación indicados allí.
  No se modificó esa línea base.
- Jira consultado en lectura: proyecto ECL, Sprint 37, **Sprint 2 - GestiónOrt y ExpV**,
  cinco historias y 19 subtareas. Inicio registrado: 8/oct/2026 00:59 Lima;
  fin planificado: 23/oct/2026 16:00 Lima. La exposición del **9/oct** es un corte
  de avance, no una modificación de esas fechas.
- Estados consultados: ECL-59 En curso; ECL-46 a ECL-64 restantes Tareas por hacer.
  Los resultados locales no sustituyen esos estados.
- `upstream`: `https://github.com/JulioNaupariC/EcoLog-stica-Lima.git`.
- `origin`: `https://github.com/ANTONY-MUNIVE/Ecologistica-Lima-Mejorado.git`.
  GitHub lo reportó **público**, aunque la solicitud lo describe como privado.
  No se cambió su visibilidad ni se publicó nada.
- Rama de entrada limpia: `respaldo/sprint2-avance`, sin operación Git pendiente.
  No fue necesario crear worktree. Se conservó esa rama.
- `fetch upstream` ejecutado. Base registrada para el código entregado:
  `099838bdec64c16c4ecaee04644f2f69ec2c46dc` (merge PR #24).
  En la revisión final upstream/main avanzó a `de1819cdc5c2e308d90618d756c6028dc233e2d1`:
  tres documentos BDD/capacidad, sin cambios de runtime; no se integraron automáticamente.
- El estado de entrada anterior describe la primera ejecución. La revisión final
  comenzó en `respaldo/sprint2-integracion`, SHA `6e984427f87a15e4972b55aa968ae6ed73291824`,
  con árbol limpio, y utiliza otro checkout, procesos y bases nuevos.

## Funcionalidad y límites

**Verificada con PostgreSQL/PostGIS real y sesiones reales:** migración nueva de
conductores, altas, consulta y actualización; DNI único, vigencia, disponibilidad
y restricciones de cuenta; RBAC; preferencias persistidas en Cliente y consulta
durante registro de pedidos. Formularios recorridos en Chrome y Firefox.

**Prototipo de demostración conservado:** itinerario móvil de Giancarlo, con
ruta, paradas y alertas ficticias, avisos visibles y sin API de itinerarios.
Las pantallas vacías del itinerario son ejemplos explícitos. No hay GPS,
persistencia de entregas ni sincronización offline simulada.

**Incremento parcial comprobado:** contadores y tiempos HTTP/SQL, 5xx, concurrencia
observada y disponibilidad API/BD. Son datos del proceso; no acreditan P95 de carga
ni SLA mensual. No existe todavía el dashboard operativo con payload medible.

## Matriz de las 19 subtareas

Los responsables son los asignados en Jira, no una atribución de autoría de los
incrementos locales. Ver comandos y resultados en [VALIDACION.md](VALIDACION.md).
U = pruebas unitarias; I = integración PostgreSQL/PostGIS; V = navegador real.

| Tarea / responsable Jira | Criterio y entregable | Implementación local / evidencia | Dependencia y pendiente |
|---|---|---|---|
| [ECL-46 / ST-020](https://continental-team-il84x39k.atlassian.net/browse/ECL-46) Antony | Modelo y migración con DNI único, licencia, disponibilidad, contacto y partida | `Conductor`, Alembic `0007`; U modelo, I `test_conductor_migration.py`, `alembic check` | Confirmar DDL propuesto con Frank; revisión del equipo |
| [ECL-47 / ST-021](https://continental-team-il84x39k.atlassian.net/browse/ECL-47) Frank | BDD alta, actualización, DNI duplicado y licencia vencida; RF-003/RN-005 | BDD de Frank disponible en upstream/main, PR #26; revisado como **borrador**, sin implementación atribuida | Ratificar contrato; diferencias en REVISION_FINAL; no son pruebas ejecutadas por Frank |
| [ECL-48 / ST-022](https://continental-team-il84x39k.atlassian.net/browse/ECL-48) Antony | API conductores validada y autorizada, sin persistir inválidos | POST/GET/PATCH y `/me`; U API/repositorio/servicio; I sesiones, rollback y RBAC | ECL-46/47; sin API de rutas/reportes; aceptación pendiente |
| [ECL-49 / ST-023](https://continental-team-il84x39k.atlassian.net/browse/ECL-49) Giancarlo | Formulario/lista, API, carga/error, edición autorizada | `DriversPage`, servicio tipado, foco inválido, listas vacías; U+V alta y edición sin cuenta | API real integrada; revisar diseño con responsable |
| [ECL-50 / ST-024](https://continental-team-il84x39k.atlassian.net/browse/ECL-50) José | Pruebas válidos/inválidos, permisos, disponibilidad y persistencia | `test_conductor_http_e2e.py`; I real, U y cobertura | Contraste BDD registrado; divergencias, CI remoto y aceptación pendientes |
| [ECL-51 / ST-025](https://continental-team-il84x39k.atlassian.net/browse/ECL-51) Frank | BDD preferencias válidas/inválidas y actualización | BDD de Frank disponible en upstream/main, PR #27; **borrador** revisado | Ratificar propuestas; diferencia de recorte de espacios; no define formato temporal |
| [ECL-52 / ST-026](https://continental-team-il84x39k.atlassian.net/browse/ECL-52) Antony | Persistir/recuperar preferencias al registrar pedidos | GET/PATCH sobre Cliente existente, sin tabla duplicada; U+I | ECL-51; horario textual propuesto, ventana explícita |
| [ECL-53 / ST-027](https://continental-team-il84x39k.atlassian.net/browse/ECL-53) José | Formulario guardar/recuperar, errores legibles | `PreferencesPage`; consulta y botón Usar referencia en pedido; U+V | Revisión UX y BDD; búsqueda por UUID, no catálogo nuevo de clientes |
| [ECL-54 / ST-028](https://continental-team-il84x39k.atlassian.net/browse/ECL-54) Frank | Validar flujo completo, inválidos y cliente inexistente | `test_preferencias_http_e2e.py`, persistencia Cliente y Pedido, 404/422/RBAC; V; reforzado aislamiento entre dos clientes y atomicidad | No equivale a aceptación de Frank; diferencia de espacios pendiente |
| [ECL-55 / ST-029](https://continental-team-il84x39k.atlassian.net/browse/ECL-55) Giancarlo | Diseño 360px, contraste, siguiente parada y alertas, Figma | PR #25 revisado: documentación/diseño, no incorporado automáticamente | Aprobación de diseño/Figma no verificada; cambios abiertos separados |
| [ECL-56 / ST-030](https://continental-team-il84x39k.atlassian.net/browse/ECL-56) Giancarlo | Vista móvil de ruta/paradas/alertas, Chrome y Firefox | PR #24 ya en base; U existentes y V nuevo 360/1280, detalle, vacío y foco | Sigue siendo demo; asignación/API itinerario pendiente |
| [ECL-57 / ST-031](https://continental-team-il84x39k.atlassian.net/browse/ECL-57) José | Responsive 360px, teclado, etiquetas, foco, contraste/navegadores | Corregida colisión `.driver-card`; V sin overflow, teclado y foco en Chrome/Firefox | Auditoría completa WCAG AA/contraste/lector de pantalla no verificada |
| [ECL-58 / ST-032](https://continental-team-il84x39k.atlassian.net/browse/ECL-58) José | Último itinerario offline, cola de reportes, sincronizar sin duplicar y estado visible | No implementado; aviso explícito de ausencia en itinerario | Requiere contrato de itinerario y reportes, identidad, idempotencia/conflictos/retención; alcance separado del CRUD |
| [ECL-59 / ST-033](https://continental-team-il84x39k.atlassian.net/browse/ECL-59) Julio | Plan 1000 pedidos/día, 50 vehículos, 100 concurrentes, P95≤2s, 5xx<1%, SLA≥99,5% mensual | PR #23 fusionado por el equipo en upstream; documento revisado, sin carga ejecutada | Referencias actuales RNF-007 disponibilidad/RNF-008 capacidad correctas; aprobación no acreditada |
| [ECL-60 / ST-034](https://continental-team-il84x39k.atlassian.net/browse/ECL-60) Antony | Latencias, 5xx, disponibilidad API/BD en entorno de pruebas | `/health/ready`, `/internal/metrics`, hooks SQL; U y I, acceso real Auditor en V | Exportación persistente, agregación multiworker y captura por intervalo pendientes |
| [ECL-61 / ST-035](https://continental-team-il84x39k.atlassian.net/browse/ECL-61) José | Carga reproducible 1000/50/100 con latencia, errores y persistencia | No ejecutada; suite funcional no se presenta como carga | ECL-59/60 y datos/harness aprobado; no hay P95 ni SLA acreditados |
| [ECL-62 / ST-036](https://continental-team-il84x39k.atlassian.net/browse/ECL-62) Julio | Informe, SLA y procedimientos sustentados por métricas reales | Este informe cubre avance y pruebas funcionales, no informe de carga/SLA | ECL-61 y observación mensual |
| [ECL-63 / ST-037](https://continental-team-il84x39k.atlassian.net/browse/ECL-63) Antony | Medir payload dashboard≤250KB sin mapa y EXPLAIN pedidos/rutas/dashboard | No hay dashboard/API de rutas en base; medición correspondiente no verificada | Definir consultas representativas y volumen con equipo; no usar bundle Vite como payload dashboard |
| [ECL-64 / ST-038](https://continental-team-il84x39k.atlassian.net/browse/ECL-64) Antony | Optimización demostrada por comparación de métricas | Sin optimización especulativa ni índices añadidos | Depende de resultados ECL-63; comparación antes/después pendiente |

## Decisiones técnicas propuestas, no reglas aprobadas

1. Conductor puede existir sin cuenta; una cuenta vinculada es única y debe ser
   Conductor activo. PATCH no desvincula cuentas con null. Falta resolver si toda
   alta exige cuenta, reasignación y ciclo de baja con ECL-47.
2. DNI de ocho dígitos; licencia como texto de hasta 40, teléfono hasta 30 y partida
   hasta 255; experiencia entera no negativa. Son restricciones técnicas del
   incremento donde no hay DDL/BDD específico aprobado. DNI único tiene respaldo.
   Licencia vencida presenta ambigüedad RF-003/US-003: el código rechaza guardado,
   Frank propone guardarlo no asignable; requiere resolución, sin cambiar la línea base.
3. Fecha de licencia se contrasta con el día de Lima; disponibilidad requiere
   timestamps con zona y final posterior. **RN-005 regula conducción de rutas**
   (máximo 8h/día, 4h continuas y descanso de 1h), no limita este intervalo de
   disponibilidad. No se ha implementado el motor de esas restricciones de ruta.
4. Preferencias reutilizan longitudes de Cliente: 120/255/255. null borra; texto
   vacío y payload sin cambios son inválidos. El código recorta espacios exteriores;
   Frank propone preservarlos. Horario sigue textual; solo una
   acción explícita copia referencia al pedido. No se convierte automáticamente
   en ventana ni se interpreta restricción de acceso como regla de optimización.
5. Datos detallados de conductores/preferencias usan permisos generales existentes.
   No se amplió RBAC para entregar datos personales a alcances agregados de Analista
   o Auditor. Conductor usa `/conductores/me` para consultar su propia asociación.
6. Métricas en memoria por proceso constituyen una primera instrumentación; se
   requiere almacenamiento externo y un contrato de observabilidad antes de SLA.

## Aportes revisados y conservados

| Aporte | SHA revisado | Tratamiento |
|---|---|---|
| [PR #24, itinerario Giancarlo](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/24) | Merge `099838bdec64c16c4ecaee04644f2f69ec2c46dc`; commits `ea114f9`, `6f0cf39`, `5ffe0e9` | Ya pertenece a upstream/main; se preservó historial, interfaz, tests y evidencias previas |
| [PR #25, diseño móvil](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/25) | `66e535babe5c6f537bc214828e5eeb91dc8c86ec`, aporte `af72041` | Diff de siete documentos/imágenes revisado; sin dependencia de runtime; pendiente revisión del equipo, no incorporado |
| [PR #23, capacidad](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/23) | Head final `16e0b5ae111cc05efbf6579769c8c56a84d425b3`; merge `f15e9a7dabfa9b22ee8d0542f6241fbc80419a38` | Fusionado por el equipo; no incorporado al código local. El documento vigente corrige las referencias RNF antes observadas; no acredita ejecución |

No se encontraron aportes de implementación de conductores/preferencias que
sustituyeran estos incrementos. No se incorporó ningún PR abierto basándose en CI.
Inventario de ramas/commits: [HISTORIAL.md](HISTORIAL.md).
