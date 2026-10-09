# Guion breve de exposición — 5 a 7 minutos

Antes: iniciar según [INICIO.md](INICIO.md), probar `/health/ready` y tener el
UUID del cliente demo. No proyectar `.env.sprint2`, cookies ni contraseñas.

1. **Contexto (30 s).** «Este es el avance local del 9 de octubre. Jira mantiene
   sus estados; distinguimos persistencia real, prototipo y pendientes».
2. **Conductor (90 s).** Entrar como Operador. Mostrar registros DEMO. Enviar
   formulario vacío para ver validación/foco. Crear un conductor con nombre DEMO,
   DNI sintético no usado y licencia vigente. Editar punto de partida y pulsar
   Actualizar para recuperar el dato desde PostgreSQL. Un DNI repetido se rechaza.
3. **Preferencias (60 s).** Consultar cliente
   `00000000-0000-4000-8000-000000000052`. Guardar una referencia DEMO y consultar
   de nuevo. En Registrar pedido, consultar preferencias y usar referencia.
   Aclarar: horario es sugerencia textual; ventana del pedido sigue explícita.
4. **Móvil (60 s).** En otra pestaña/contexto, iniciar como Conductor. Mostrar
   itinerario a 360 px, aviso de datos ficticios, siguiente parada, alerta,
   detalle con teclado y ejemplo vacío. «Esta vista no consulta rutas reales ni
   sincroniza reportes; no se presenta como operación offline».
5. **Verificación (60 s).** Mostrar matriz y resultados de REVISION_FINAL.md,
   101 integración PostgreSQL/PostGIS, 293 frontend y Chrome/Firefox. Como Auditor,
   la API deniega conductores y permite métricas. Los contadores no son SLA/P95.
6. **Pendientes (30 s).** Ratificación de los BDD borrador de Frank y diferencias
   concretas de contrato (cuenta, licencia, disponibilidad, listado y espacios), revisión UX,
   contrato de itinerarios/reportes para offline y pruebas de carga/EXPLAIN.
   PR abiertos revisados no se fusionaron automáticamente.

Si el entorno falla durante la presentación, mostrar las capturas fechadas como
**evidencia previa**, nunca fingir que el guardado actual tuvo éxito.
