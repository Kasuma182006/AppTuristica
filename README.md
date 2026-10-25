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
npm run ingest       # importa sitios (OSM) y agencias (RNT); `-- --source=osm|rnt` para una sola
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

Los tipos de lugar (cascada, río, mirador…) y sus etiquetas de OSM están en
`db/seeds/place-types.ts`. El orden de la lista es el de la interfaz y también la prioridad cuando un
elemento de OSM encaja en varios tipos.

Las actividades y sus reglas de asignación automática (por tipo de lugar o por etiquetas de OSM)
están en `db/seeds/activities.ts`. Las reglas son conservadoras: una actividad equivocada confunde
al visitante; una que falte la puede agregar la comunidad.
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

## Ingesta programada

GitHub Actions (`.github/workflows/ingest.yml`) ejecuta `npm run ingest` cada semana (lunes 03:17
UTC, domingo 10:17 p. m. en Colombia) y a mano desde la pestaña Actions → Ingest → Run workflow,
eligiendo la fuente (`all`, `osm` o `rnt`). Cada fuente queda registrada en la tabla `ingest_runs`.

- Secreto obligatorio (Settings → Secrets and variables → Actions → Secrets): `DATABASE_URL_DIRECT`.
- Variable opcional (misma sección, pestaña Variables): `OVERPASS_URLS`, si se quieren otros
  servidores de Overpass.
- Si OSM falla, el workflow lo reintenta una vez a los 20 minutos; las agencias se importan igual.
  Una semana fallida no borra nada: los sitios solo se retiran tras 30 días sin verse.
- GitHub desactiva los cron de repositorios públicos sin actividad en 60 días: si pasa, se reactiva
  en Actions → Ingest → Enable workflow.

### Posible cambio: de Overpass a Geofabrik

Los servidores públicos de Overpass fallan con frecuencia (en las pruebas de octubre de 2026, 2 de 7
corridas fallaron, y overpass-api.de responde 406 desde algunas redes). Si el cron falla seguido, la
alternativa evaluada es descargar en GitHub Actions el extracto de Colombia de Geofabrik
(`colombia-latest.osm.pbf`, ~333 MB, actualizado a diario) y filtrarlo con `osmium`, dejando
Overpass solo para pruebas locales. Es una descarga de archivo estable, sin cuotas, y da siempre el
mismo resultado para los mismos datos. Implica reescribir la consulta (hoy Overpass entrega los
puntos y polígonos ya armados) y sería una historia aparte. Opciones descartadas: la API de ohsome
(datos con ~3 meses de atraso), más servidores públicos de Overpass (igual de inestables) y un
Overpass propio (no cabe en costo $0).

Ver `CLAUDE.md` para arquitectura y reglas, y `docs/` para requerimientos e historias.
