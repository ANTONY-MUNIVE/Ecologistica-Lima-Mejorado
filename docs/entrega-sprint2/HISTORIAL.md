# Historial local de integración

Base: `099838bdec64c16c4ecaee04644f2f69ec2c46dc`, upstream/main tras fetch.
Se conserva `main` y `respaldo/sprint2-avance` en esa base. No hubo reset,
clean, rebase destructivo, publicación ni escritura remota.

Cada rama de subtarea se creó sobre el incremento anterior: son **ramas
apiladas**, no cambios independientes para fusionar en cualquier orden. La
unidad de cada incremento es su commit respecto del padre. Su integración
local conserva todos los commits mediante avance fast-forward.

| Rama local | Commit del incremento | Contenido |
|---|---|---|
| `feat/ECL-46-modelo-conductores` | `149a21a9543447c174e3f866f864ddfe33d78863` | Modelo, migración nueva y pruebas |
| `feat/ECL-48-api-conductores` | `a561353f94e38c819b0af2ee79afedd3a5dc2d04` | API, autorización, schema y transacciones |
| `feat/ECL-52-preferencias-cliente` | `307005c248500f87b982c0c3c5cae26cc7b8e193` | Preferencias sobre Cliente existente |
| `feat/ECL-49-formulario-conductores` | `735af6c5058e68d28ad91f3ae29f20a65df4478f` | Formulario, listado y servicio UI |
| `feat/ECL-53-formulario-preferencias` | `f25e21278415ae754041e78c4519290342449bf2` | Formulario y consulta en Pedido |
| `feat/ECL-60-metricas-api-db` | `46d19148c446abb344d9cefc60ad71f9302ecf82` | Instrumentación HTTP/SQL y readiness |
| `fix/ECL-49-edicion-sin-cuenta` | `f5126e718f477f460b44c0841e63cc1e2d577cba` | Contrato PATCH sin null de cuenta |
| `test/ECL-50-conductores-postgis` | `83ea62f40deaa314f7b67f5edcf6056446c1b36c` | Sesiones y persistencia reales, rollback y RBAC |
| `test/ECL-54-preferencias-postgis` | `381ce1ec9ab1a25209c4b7ebe33026fe55cf80e7` | Preferencias y copia explícita a Pedido |
| `fix/ECL-46-regresion-alembic` | `853f3aba09653f7373e48396aad4c0d6092b4e0a` | Comparación metadata en head preservando aserciones históricas |
| `fix/ECL-57-estilos-compatibles` | `a04ac033de3b75090e9a486fa64b662333aa87e2` | Aislar CSS de gestión del itinerario demo |
| `fix/ECL-49-tipado-prueba` | `09c7214e77303e0ba86cc32c7a2d74557a1c716a` | JSON de prueba tipado como unknown |
| `docs/sprint2-entrega-local` | Consultar `git log docs/sprint2-entrega-local` | Semilla, arranque, recorrido, capturas y paquete de entrega |
| `respaldo/sprint2-integracion` | Consultar `git rev-parse respaldo/sprint2-integracion` | Rama final local con el conjunto anterior |

No se atribuyen los incrementos de este respaldo a aceptación de los responsables
Jira. Los aportes históricos de Giancarlo y del resto del equipo mantienen sus
autores originales. PR #24 está incorporado **por pertenecer a la base**; PR #23 y
#25 se revisaron y permanecen fuera de esta integración local (detalle en ENTREGA).

Verificación reproducible de historia y límites:

```powershell
git status --short
git remote -v
git log --oneline upstream/main..respaldo/sprint2-integracion
git diff --stat upstream/main...respaldo/sprint2-integracion
git merge-base --is-ancestor 099838bdec64c16c4ecaee04644f2f69ec2c46dc respaldo/sprint2-integracion
git diff --check upstream/main...respaldo/sprint2-integracion
```

La ausencia de cambios locales al terminar incluye secretos y dependencias
ignorados: no implica borrarlos. `.env.sprint2`, `.venv`, `node_modules`, `dist` y
cobertura permanecen fuera de Git. Solo se versionan capturas necesarias del
recorrido con datos sintéticos; no se incluyen trazas con cookies o cuerpos privados.
