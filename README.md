# Buscador turístico Colombia

Web y API pública para encontrar lugares turísticos poco conocidos de Colombia. MVP: Valle del Cauca.

## Requisitos

- Node.js 24 o superior (ver `.nvmrc`)
- VS Code con las extensiones ESLint (`dbaeumer.vscode-eslint`), Prettier (`esbenp.prettier-vscode`)
  y Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`). La carpeta `.vscode/` no se versiona.

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
npm run db:seed      # carga los catálogos (departamentos…); se puede repetir sin duplicar
npm run db:fetch-boundary -- 76  # descarga de OSM el límite de un departamento (código DIVIPOLA)
```

Las credenciales van en `.env.local` (ver `.env.example`).

## Datos de referencia

Los departamentos en alcance se configuran en `db/seeds/departments.ts` y sus municipios (código
DIVIPOLA del DANE, nombre común y relación de OSM) en `db/seeds/municipalities.ts`. Los polígonos se
guardan en `db/seeds/data/{departments,municipalities}/<divipola>.geojson`, descargados una sola vez
de OpenStreetMap (vía Nominatim) con `db:fetch-boundary`, que verifica la etiqueta `divipola` de cada
relación (o su nombre, si no la tiene). El seed comprueba que cada municipio quede dentro de su
departamento. Para agregar un departamento: añadir las entradas, descargar los límites y correr
`db:seed`.
Datos © OpenStreetMap contributors, bajo licencia ODbL.

Todas las tablas tienen RLS activado y sin políticas: la app accede con Drizzle desde el servidor, y
la Data API pública de Supabase queda bloqueada.

## Despliegue

Vercel (plan Hobby) conectado al repositorio de GitHub:

- Push a `main` → producción en https://app-turistica.vercel.app
- Push a cualquier otra rama → vista previa (protegida con inicio de sesión de Vercel)
- Variables de entorno en el panel de Vercel (Production y Preview): `DATABASE_URL`.
  Las migraciones se aplican desde local con `npm run db:migrate`.
- Vercel no espera a la CI: subir a `main` solo con la CI en verde.

## Integración continua

GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push y pull request: lint, formato,
tipos, pruebas, build y `npm audit --omit=dev`. Las alertas que solo afectan dependencias de
desarrollo (por ejemplo `braces`, vía `eslint-config-next`) están aceptadas mientras no exista
versión corregida.

Ver `CLAUDE.md` para arquitectura y reglas, y `docs/` para requerimientos e historias.
