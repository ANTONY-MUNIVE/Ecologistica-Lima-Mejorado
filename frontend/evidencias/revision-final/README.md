# Evidencia de la revisión final

`resultado.json` registra fecha UTC, SHA, blobs de fuente, puertos, navegadores y
resultados del recorrido real. Las capturas contienen solo datos sintéticos.
`environment.json` identifica instalación, bases aisladas y comandos.

- `backend-unit.txt`: suite unitaria y cobertura.
- `backend-integration.txt`: PostgreSQL/PostGIS, migraciones, permisos/persistencia.
- `frontend-coverage.txt`: suite frontend y cobertura; fuente sin cambios desde
  688045a (la corrección posterior solo afecta backend/auth y su prueba).
- `npm-audit.json`: resultado puntual del lockfile parcheado.
- `recovery.txt`: comparación de huellas del contenido persistido antes/después
  de reiniciar el contenedor nuevo. No contiene campos ni hashes de contraseña.
- `manifest.json`: SHA-256 de archivos de evidencia para comprobar integridad.

Las huellas de texto usan UTF-8 con finales de línea LF (contenido versionado),
para que la conversión automática CRLF de Git en Windows no altere la comparación.
Las huellas PNG usan bytes originales. No se incluye el manifiesto en sí mismo.

Las rutas del checkout se sustituyeron por `<checkout-limpio>` en logs de pruebas.
Se retiraron espacios finales del formato de tablas de terminal, sin cambiar resultados.
No se versionan configuración privada, cookies ni logs del servidor. Capturas de
la primera entrega y las del equipo permanecen en sus directorios originales.
