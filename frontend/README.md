# Frontend de EcoLogística Lima

Base técnica React + TypeScript construida con Vite. Incluye navegación mínima,
configuración externa de la URL del API, validaciones automáticas y estilos CSS
responsive.

## Requisitos

- Node.js 22.18.0 (definido en `.nvmrc`) o una versión compatible con
  `>=22.12.0 <27`.
- npm 10 o superior.

Si se usa NVM, ejecutar `nvm use` dentro de `frontend/`.

## Instalación reproducible

```bash
cd frontend
npm ci
```

El archivo `package-lock.json` fija todas las versiones resueltas.

## Configuración de entorno

Copiar `.env.example` como `.env.local` y ajustar únicamente para el entorno
local:

```bash
cp .env.example .env.local
```

`VITE_API_BASE_URL` es obligatoria para construir las URLs del API y debe
ser una URL HTTP o HTTPS válida. Las variables `VITE_*` quedan expuestas en el
bundle del navegador: nunca deben contener secretos, tokens ni credenciales.

En desarrollo, el frontend se sirve desde `http://127.0.0.1:5173` y el backend
desde `http://127.0.0.1:8000`. El backend debe configurar:

```text
CORS_ALLOWED_ORIGINS=["http://127.0.0.1:5173"]
```

Las solicitudes autenticadas usan `credentials: "include"` para enviar la cookie
HttpOnly. No mezclar `localhost` con `127.0.0.1`: la sesión usa `SameSite=Strict`
y ambos procesos deben conservar una relación de mismo sitio. La sesión de un
Operador o Administrador debe existir antes de usar el formulario de pedidos.

## Desarrollo

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

## Build y previsualización

```bash
npm run build
npm run preview
```

## Calidad

```bash
npm run typecheck
npm run lint
npm run test
npm run test:coverage
```

La cobertura excluye únicamente `src/main.tsx` (bootstrap del DOM),
`src/env.d.ts` (declaraciones) y `src/test/setup.ts` (configuración del entorno
de pruebas). Los módulos de aplicación, páginas y configuración del API sí se
miden y deben alcanzar al menos 80% en líneas, sentencias, funciones y ramas.
