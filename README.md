# Encuestas IJS

Aplicación web para cargar manualmente encuestas realizadas en papel.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Validaciones

```bash
npm run lint
npm run build
```

La integración con Google Sheets utiliza `GOOGLE_SCRIPT_URL` en `.env.local` y el endpoint server-side `POST /api/submit`.
