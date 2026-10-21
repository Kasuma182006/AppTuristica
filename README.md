# Buscador turístico Colombia

Web y API pública para encontrar lugares turísticos poco conocidos de Colombia. MVP: Valle del Cauca.

## Requisitos

- Node.js 24 o superior (ver `.nvmrc`)
- VS Code con las extensiones recomendadas (ESLint y Prettier; VS Code las sugiere al abrir el proyecto)

## Comandos

```bash
npm install          # instala dependencias (solo dentro del proyecto)
npm run dev          # servidor local en http://localhost:3000
npm run build        # build de producción
npm run lint         # ESLint
npm run typecheck    # TypeScript sin emitir
npm run format       # formatea con Prettier
npm run format:check # verifica formato
npm test             # ejecuta las pruebas (Vitest)
npm run test:watch   # pruebas en modo observación
npm run db:generate  # genera una migración a partir de db/schema
npm run db:migrate   # aplica las migraciones pendientes en Supabase
npm run db:studio    # explorador visual de la base (Drizzle Studio)
```

Las credenciales van en `.env.local` (ver `.env.example`).

Ver `CLAUDE.md` para arquitectura y reglas, y `docs/` para requerimientos e historias.
