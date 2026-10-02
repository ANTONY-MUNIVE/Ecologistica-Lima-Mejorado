# Artefactos Jira — Adenda operativa del Sprint 1

**Versión:** 1.0.1  
**Fecha de actualización:** 02/10/2026 (America/Lima), antes de la inspección.  
**Fuente:** consulta directa de Jira y merges verificados en GitHub.

Esta adenda complementa la [línea base V_1_0_0](<02 Artefactos Jira V_1_0_0.md>); no sustituye sus tablas ni sus capturas del 11/09. El corte de los cuatro entregables preparatorios sigue siendo el 01/10.

## Reprogramación confirmada

| Campo | Evidencia vigente |
|---|---|
| Sprint / board | Sprint 1 - Base Operativa, ID 4 / board 3 |
| Fin original | 25/09/2026 09:00 America/Lima |
| Fin reprogramado | 02/10/2026 16:00 America/Lima (21:00 UTC) |
| Estado consultado | Activo; no se ejecutó el cierre del sprint |
| Inicio operativo en Jira | 11/09/2026 15:36:05.864 America/Lima |
| Inicio en la planificación original | 11/09/2026 09:00 America/Lima; se conserva como dato de planificación |
| Decisión | Ajuste solicitado por Antony Munive Ríos y aplicado mediante el conector Jira el 02/10 |
| Motivo | Completar validación independiente y disponer del incremento para la inspección del 02/10 |

El ajuste conserva el nombre, objetivo y fecha de inicio operativa. La extensión respecto del fin original es de siete días y siete horas; no representa cumplimiento del plazo inicial ni modifica los hitos generales del proyecto.

## Estado operativo consultado el 02/10

Los seis padres ECL-7, ECL-8, ECL-10, ECL-19, ECL-20 y ECL-24 figuran **Finalizada**. Según las estimaciones de la línea base, representan **28/28 SP (100 %)**. Las subtareas ECL-27 a ECL-45 figuran **Finalizada: 19/19 (100 %)**. Ambas métricas se mantienen separadas: no se suman padres y subtareas ni se presentan como velocidad final o aceptación del stakeholder.

Las 18 subtareas originales permanecen en V_1_0_0. La subtarea adicional [ECL-45](https://continental-team-il84x39k.atlassian.net/browse/ECL-45) corresponde a integración CORS. ECL-19 y ECL-29 figuran finalizadas en esta consulta; sus campos de actualización no se usan como prueba de la fecha exacta de transición.

## Integración y validación independiente

| Cambio | Evidencia |
|---|---|
| Docker y arranque ECL-29 | [PR #20](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/20), merge `0aa4fbe7462d5be6905ca5c79970f3ce856d3ac4` |
| Entregables preparatorios | [PR #21](https://github.com/JulioNaupariC/EcoLog-stica-Lima/pull/21), merge `79602bd767234c7dd13e855c5d01f0170a490d23` |
| Validador independiente y aprobación registrada | Giancarlo Marcio Soto Escobar (`GiancarloSE`), evidencia y review en PR #20 |
| SHA validado para ECL-29 | `8881b07f68ffe0e6ff095697d81fba7f1f6efd33` |

La evidencia aportada por Giancarlo registra config/build correctos, PostgreSQL/PostGIS y migraciones correctas, tres servicios saludables y HTTP 200 en frontend, health y OpenAPI. Acredita persistencia del **esquema**, no de datos de negocio. Los servicios se apagaron conservando el volumen. Esta adenda no reproduce esas pruebas: las atribuye al validador y a su reporte/review. La review conserva un marcador de hora de finalización; no se inventa esa hora a partir de la hora de publicación.

## Pendientes que permanecen

- Login con una cuenta de prueba autorizada y persistencia de datos de negocio en Docker: no realizados en la validación independiente comunicada.
- Exclusión de objetos espaciales en autogeneración Alembic: limitación conocida; no aplicar eliminaciones de extensiones.
- Inspección G5117 del 02/10, 15:40–16:00, feedback y aceptación: sin evidencia de realización al elaborar esta adenda.
- Retrospectiva y acuerdos efectivos del equipo: pendientes. Las acciones de V_1_0_0 son propuestas.
- Gasto real y recuento consolidado de defectos: no registrados en el corte original.
- Cierre administrativo del sprint: pendiente; la fecha fin no ejecuta el cierre.

## Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 11/09/2026 | Línea base y evidencias iniciales conservadas en el documento original. |
| 1.0.1 | 02/10/2026 | Adenda: reprogramación confirmada, estado Jira, merges y validación independiente; aceptación pendiente. |

[← Volver al README principal](../../README.md)
