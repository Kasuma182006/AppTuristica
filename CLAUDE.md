# CLAUDE.md — Buscador turístico Colombia

## Qué es
Web + API pública (solo lectura) para encontrar lugares turísticos poco conocidos de Colombia
(cascadas, senderos, miradores, ríos…), con búsqueda **solo por filtros**.
Proyecto personal y experimental, desarrollado por una sola persona con IA. **Costo $0.**
MVP: **Valle del Cauca** (42 municipios). Debe poder crecer a otros departamentos solo con datos y configuración.

## Stack
- Next.js (App Router) + TypeScript estricto, desplegado en Vercel Hobby
- PostgreSQL + PostGIS en Supabase · ORM: Drizzle
- Tailwind CSS · MapLibre + teselas de OpenFreeMap
- Vitest · ESLint + Prettier · CI en GitHub Actions
- Ingesta: scripts TS ejecutados por GitHub Actions (cron semanal + manual)
- Anti-spam: Cloudflare Turnstile + límite por IP

## Arquitectura
Monolito modular. La web y la API REST (`/api/v1`) viven en el mismo proyecto Next.js;
la ingesta corre aparte y escribe directo en la base. Sin microservicios, colas ni Redis.

```
src/
  app/              # rutas: páginas web y app/api/v1/*
  modules/          # dominio: places, catalogs, proposals, reports, agencies
    <modulo>/       # schemas (zod), repository (Drizzle), service (lógica), types
  components/       # UI reutilizable
  lib/              # db, geo, rate-limit, turnstile, utils
ingest/
  sources/          # un adaptador por fuente: osm, wikidata, commons, rnt
  pipeline/         # normalizar, descartar, deduplicar, restricciones, confianza, guardar
db/                 # schema, migraciones, seeds (departamentos, municipios, tipos, actividades)
```
Las páginas no consultan la base directamente: usan los services de `modules/`, igual que la API.

## Reglas de dominio (no romper)
- **Filtros:** Lugar (municipio/ciudad, selección única), Tipo, Actividad, Dificultad, Origen, ocultar acceso restringido.
  **Y entre filtros, O dentro de un filtro múltiple.** Filtros, orden, página y vista siempre en la URL.
- **No hay** búsqueda por texto libre ni filtros por distancia.
- **Sitios frágiles:** nunca exponer coordenadas exactas (web ni API); usar aproximación ~2 km. "Cómo llegar" lleva solo al municipio.
  La aproximación es el centro de una cuadrícula de 0,02° (`src/lib/geo.ts`, radio 2 km); sus fuentes y fotos
  van sin enlace (el elemento de OSM, Wikidata o Commons delataría el punto). Usar siempre `toPublicLocation`.
- **Sitios ocultos** (3 reportes) no aparecen en ninguna respuesta, conteo ni sitemap.
  Toda consulta pública de `places` lleva `isPublished` (`src/modules/places/repository.ts`) como término
  AND; `repository.test.ts` lo verifica sobre el SQL generado. Al agregar consultas (sitemap, conteos), probarlas ahí.
- La ingesta es **idempotente**, **no modifica sitios de la comunidad** y **no reactiva sitios ocultos**.
- Validación geográfica: todo sitio debe caer dentro del polígono del Valle; municipio asignado por cruce geográfico.
- Propuestas: anónimas, sin fotos, Turnstile verificado en servidor, publicación inmediata con origen "comunidad".
- Un reporte por IP y sitio. IP siempre guardada cifrada (hash), nunca en claro.

## Legal y datos
- Solo fuentes abiertas: OpenStreetMap (Overpass), Wikidata, Wikimedia Commons, datos.gov.co (RNT).
- **Nunca copiar textos ni fotos de terceros.** Descripciones generadas por plantillas; fotos solo de Commons con autor y licencia.
  Única excepción (HU-27): la descripción corta de Wikidata en español (CC0), guardada aparte
  (`places.wikidata_description`) y mostrada como de Wikidata, nunca como la descripción del sitio.
- Atribución "© OpenStreetMap contributors" visible en todo mapa. Datos de la API bajo ODbL.
- Sin cuentas ni datos personales en el MVP.

## Buenas prácticas
- Código, nombres y commits en inglés; textos de la interfaz en español.
- TypeScript estricto, sin `any`. Validar con zod toda entrada externa (query params, formularios, respuestas de fuentes).
- Server Components por defecto; `"use client"` solo cuando haya interacción.
- Funciones pequeñas y puras para la lógica de dominio, con pruebas (sobre todo ingesta y filtros).
- Errores de API con formato consistente: `{ error: { code, message } }` y códigos HTTP correctos (400, 404, 429).
- Mobile-first, accesibilidad AA, imágenes optimizadas (`next/image`).
- Secretos solo en variables de entorno; mantener `.env.example` actualizado.
- Commits convencionales (`feat:`, `fix:`, `chore:`…) que referencien la historia: `feat(HU-36): ...`.

## Cómo trabajar en este repo
- Se trabaja **una historia de usuario (HU-xx) a la vez**, en el orden del backlog.
- Una historia está hecha cuando: cumple sus criterios, pasa lint + tipos + pruebas, funciona en móvil y escritorio, y despliega sin errores.
- **No agregar dependencias** sin preguntar primero, y ninguna que implique costo.
- No implementar nada de "Fuera del MVP" sin que se pida.
- Si algo de la historia es ambiguo o contradice este archivo, preguntar antes de implementar.

## Flujo Git y despliegue (Vercel)
- `main` está protegida: sin push directo. Cada HU va en una rama `feat/hu-xx-...` → PR → CI y check `Vercel`
  en verde → "Squash and merge" con título `feat(HU-xx): ...` → `git switch main && git pull`.
- Vercel despliega solo: PR/rama → vista previa (requiere login de Vercel; usa la misma base que producción);
  merge a `main` → producción en https://app-turistica.vercel.app. Vercel no espera a la CI.
- **Tras cada merge, verificar que producción cambió.** En HU-08 el aviso de GitHub a Vercel se perdió y no hubo
  despliegue (ni siquiera aparecía en Vercel). Solución: Vercel → Deployments → **Create Deployment** con `main`.
  No usar "Redeploy" (republica el commit viejo). Si se repite, revisar acceso de la app de Vercel en GitHub.
- Estado de despliegue: status `Vercel` en `/commits/<sha>/status` de la API de GitHub (sin `gh`; límite 60 req/h).

## Comandos (se completan al crearlos)
Disponibles (`npm run <cmd>`): `dev` · `build` · `lint` · `typecheck` · `format` · `format:check` ·
`test` (Vitest, una vez) · `test:watch` ·
`db:generate` (migración desde `db/schema`) · `db:migrate` (aplica `db/migrations`) · `db:studio` ·
`db:seed` (catálogos desde `db/seeds`, idempotente) · `db:fetch-boundary -- <divipola>` (baja un límite de OSM) ·
`ingest` (todas las fuentes; `-- --source=osm|rnt` para una; si una falla sigue y sale con código 1).
La ingesta escribe en la base compartida (= producción): reconoce los sitios por su id de OSM, solo
crea/actualiza lo que cambió, y borra las fuentes que lleva 30 días sin ver (y el sitio si queda sin
ninguna). Slugs `nombre-municipio`, fijos una vez creados. `rnt`: agencias activas (de viajes y turismo
+ operadoras, sin mayoristas) por número RNT; las que salen del RNT pasan a inactivas; teléfono y correo
solo de empresas (NIT 8/9…), nunca de personas naturales; guías de turismo nunca.
Overpass: overpass-api.de responde 406 desde la red local; la ingesta pasa sola a los respaldos
(overpass.private.coffee, overpass.kumi.systems). Servidores configurables con `OVERPASS_URLS`. Una corrida
de OSM tarda 5-17 min. Cron semanal en `.github/workflows/ingest.yml` (secreto `DATABASE_URL_DIRECT`).
Si Overpass falla seguido, el plan es pasar a un extracto de Geofabrik + osmium (ver README).
Scripts fuera de Next.js (seed, ingesta) se ejecutan con `tsx`. En código, "Lugar" (municipio) es
`municipalities`; `places` son los sitios turísticos. Toda tabla nueva lleva `.enableRLS()` (lo verifica una prueba).
Pruebas: archivos `*.test.ts` junto al código en `src/`, `db/` o `ingest/`. Node 24 (`.nvmrc`; CI y Vercel usan la última 24.x). Local: Node 24.22.1 (parches de
seguridad, 2026-10-23) con npm 11.19, que avisa de install scripts no aprobados (`esbuild`,
`unrs-resolver`): es inofensivo, todo funciona sin ellos.
SQL que Drizzle no genera (extensiones, funciones): `npx drizzle-kit generate --custom --name=<nombre>`.
API: respuestas `{ data }` (listas paginadas: `{ data, meta }` con `apiPage`) con claves en inglés
(valores en español) y errores con `apiError` de `src/lib/api-response.ts`. Parámetros de búsqueda en
español: filtros (`lugar`, `tipo`…, listas con comas), `orden`, `pagina`, `por-pagina` (`modules/places/filters.ts`). La base se obtiene con `getDb()` (`src/lib/db.ts`, perezosa: la CI construye
sin `DATABASE_URL`). El cliente va sin prepared statements ni pipelining (`max_pipeline: 0`): por el pooler de
Supabase, encolar consultas en una conexión ocupada colgaba el servidor (HU-51); no quitarlo. Toda ruta de `/api/v1` se envuelve en `publicApi` (`src/lib/public-api.ts`: `connection()`,
límite de 60/min por IP con 429 + `Retry-After`, CORS `*`) y exporta `OPTIONS = corsPreflight`. El límite usa
la tabla `rate_limits` (`src/lib/rate-limit.ts`, reutilizable con otra ventana para HU-82); la IP solo se guarda
como HMAC con `IP_HASH_SECRET` (`src/lib/ip-hash.ts`), el mismo valor en local y en Vercel.
Documentación: `src/lib/openapi.ts` (OpenAPI 3.1, servida en `/api/v1/openapi.json` y mostrada en `/api-docs`);
al cambiar rutas, parámetros o campos, actualízala: `openapi.test.ts` falla si se desalinea del código.
Mapa: `maplibre-gl` (versión fija) solo se carga en la vista de mapa (`src/components/places-map.tsx`, `next/dynamic`).
Su worker se publica con `setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url))`
(`map-canvas.tsx`); sin eso las teselas no cargan. Atribución "© OpenStreetMap contributors" en `map-data.ts`.
Rutas (`src/lib/routes.ts`): ficha `/sitio/{slug}`, municipio `/lugar/{slug}` (HU-70). Ambas hacen streaming, así
que su estado HTTP queda en 200 aunque llamen `notFound()`. Para el 404 real (HU-69), `src/proxy.ts` consulta la base
y reescribe los sitios o municipios inexistentes (o sitios ocultos) a `/sitio-no-encontrado` (estática, 404); un
`/lugar/{slug}` de sitio (dirección vieja) redirige con 308 a `/sitio/{slug}`, y si el slug es también de un municipio
gana el municipio. `export const instant = false` no sirve para el 404: solo apaga validaciones.
Metadatos (HU-71): cada página con contenido usa `pageMetadata` (`src/lib/page-metadata.ts`: título, descripción,
canónica y Open Graph completo, porque Next reemplaza el `openGraph` del layout entero). Imágenes OG generadas con
`next/og` (`src/components/og-card.tsx`, sin fotos), en `opengraph-image.tsx` de cada ruta.
Sitemap (HU-72): `src/app/sitemap.ts` lee la base en cada petición (`connection()`), así sigue a cada ingesta. Lista inicio, `/api-docs`,
municipios con sitios (solo su primera página) y todas las fichas publicadas (frágiles incluidas), con `lastmod` solo en fichas. Las páginas nuevas
indexables se agregan a `STATIC_PATHS` (`src/lib/sitemap.ts`). `robots.ts` bloquea solo `/api/`: no bloquear páginas con noindex, Google dejaría de leerlo.
Datos estructurados (HU-73): JSON-LD `TouristAttraction` en cada ficha (`src/components/place-json-ld.ts`); los frágiles van sin `geo`, `image` ni `sameAs`.
Siempre con `serializeJsonLd`: escapa `<` para que un texto de la comunidad no cierre el `<script>`. Google no da resultados enriquecidos con este tipo: se valida en validator.schema.org.
Propuestas (HU-74): formulario en `/proponer` (`src/components/proposal-form.tsx`), validado con el esquema zod de `src/modules/proposals/schemas.ts`, que también usará el servidor (HU-80).
Ubicación (HU-75): `location-picker-canvas.tsx` (marcador) y latitud/longitud editables, que son lo que envía el formulario. Worker y WebGL de MapLibre en `map-setup.ts`, compartido por todos los mapas. Al elegir municipio, el mapa encuadra su mayor porción de tierra (`findMunicipalityBounds`): Buenaventura incluye Malpelo.
Términos (HU-78): `/terminos` es una versión corta con noindex, para que exista lo que el formulario pide aceptar. HU-88 la completa, le quita el noindex y la agrega a `STATIC_PATHS`; el canal de retiro depende de HU-91. Los aportes se publican bajo ODbL.
Turnstile (HU-79): el formulario envía por la server action `submitProposal` (`src/app/proponer/actions.ts`) a `receiveProposal` (`modules/proposals/service.ts`), que verifica el token con `verifyTurnstile` (`src/lib/turnstile.ts`). Si Cloudflare no responde, rechaza. Cada token sirve una vez: el widget se reinicia tras cada envío. Claves: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (se lee al construir) y `TURNSTILE_SECRET_KEY`; en local y Preview, las de prueba de `.env.example`.
Validación (HU-80): `receiveProposal` verifica el token, luego el esquema y luego la base. El municipio lo da el punto (`locateInMunicipality`, con `locatePoints` de `modules/catalogs/locate.ts`, compartido con la ingesta: tolerancia de 200 m en bordes y costa, y mueve el punto adentro); si difiere del elegido, devuelve el error y `suggestedMunicipality`, y el formulario corrige la lista. Guardar debe usar el municipio y el punto ya ubicados.
Duplicados (HU-81): `possibleDuplicates` (`modules/places/service.ts`) avisa con nombre similar (`place-names.ts`) a menos de 200 m. Un sitio frágil se compara SIEMPRE por su ubicación pública, dentro de sus 2 km: comparar su punto real permitiría encontrarlo probando coordenadas (lo verifica `duplicates.test.ts`). Quien dice que no es ninguno envía `notDuplicate`.
Límite (HU-82): `PROPOSAL_RATE_LIMIT` (5 al día UTC por IP, en `src/lib/rate-limit.ts`). Es el último paso antes de guardar: corregir errores o ver un duplicado no gasta cupo. Si no se puede contar, no se acepta (al revés que la API).
Publicación (HU-83): `saveCommunityPlace` (`modules/proposals/repository.ts`) guarda sitio, actividades y fuente `community` en una sola sentencia SQL, con el municipio y el punto ya ubicados y slug `nombre-municipio` (`src/lib/slug.ts`, compartido con la ingesta). **`db.transaction` no funciona en la app** (`max_pipeline: 0` rompe `sql.begin` con `UNSAFE_TRANSACTION`): para varias escrituras juntas, una sentencia con CTE. Las propuestas solo pueden enviarse donde estén configuradas las claves de Turnstile.
Reportes (HU-84): `report-error.tsx` abre un `<dialog>` nativo en "Sobre estos datos"; sin `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no se ofrece el botón. El formulario (`report-form.tsx`) solo existe con el modal abierto, para no cargar Cloudflare en cada ficha. `receiveReport` (`modules/reports/service.ts`) verifica el token, luego los campos, y `saveReportStatement` guarda en una sola sentencia, solo sobre sitios publicados. `TurnstileWidget` es el mismo de las propuestas. Los comentarios no se muestran en ningún lado.
Un reporte por IP (HU-85): la misma IP en el mismo sitio no guarda nada y ve el mismo agradecimiento. Los reportes duran `REPORT_RETENTION_DAYS` (180): `deleteExpiredReports` los borra completos, no solo el hash (un reporte sin hash seguiría contando y la IP podría repetir hasta ocultar el sitio sola). Lo corre `npm run purge-reports`, último paso de `ingest.yml`, aunque falle lo anterior; si GitHub desactiva el cron por 60 días sin actividad, tampoco se borran.
Ocultamiento (HU-86): el trigger `reports_hide_place` (migración 0017) oculta el sitio al tercer reporte, en el mismo commit y sin código en la app; bloquea la fila del sitio con `FOR NO KEY UPDATE` para que reportes simultáneos se cuenten entre sí (`FOR UPDATE` causaría deadlock con la llave foránea). El estado solo vuelve a publicado a mano: ver "Sitios ocultos" en el README. El proxy deja pasar las server actions (`next-action`) para que un reporte desde una ficha ya abierta reciba "ya no está publicado". La imagen OG de un sitio oculto puede seguir en la CDN hasta 8 días (`og-card.tsx`): no sale en ningún listado, solo con su dirección exacta.
Banner (HU-87): `first-visit-notice.tsx` va en el layout y sale en el HTML de todas las páginas; `FIRST_VISIT_SCRIPT` (`first-visit.ts`), en línea al inicio del `<body>`, marca `<html data-notice-closed>` antes de pintar si ya se cerró (`localStorage`), y el CSS lo oculta: sin parpadeo ni salto, y sin volver dinámicas las páginas como haría una cookie. Por eso `<html>` lleva `suppressHydrationWarning`. Las páginas 404 se pintan en el navegador y ahí el script no corre: el componente repite la comprobación en `useLayoutEffect`. Si se agrega una CSP, ese script necesita permiso.

## Fuera del MVP
Cuentas, favoritos, reseñas, búsqueda por texto o semántica, filtros por distancia, filtro "Ideal para",
filtro por costo, fotos en propuestas, LLM/scraping, otros departamentos, multilenguaje, panel de administración.

## Documentos de referencia (leer bajo demanda, nunca completos ni al inicio)
- **Historias:** al trabajar una HU, abre SOLO el archivo de su épica en `docs/historias/`
  y busca su encabezado (`## HU-36`). No leas otras épicas salvo que la historia dependa de ellas.

  | HU | Archivo |
  | --- | --- |
  | 01–08 | `epica-01-configuracion.md` |
  | 09–19 | `epica-02-modelo-datos.md` |
  | 20–34 | `epica-03-ingesta.md` |
  | 35–42 | `epica-04-api.md` |
  | 43–58 | `epica-05-exploracion.md` |
  | 59–69 | `epica-06-ficha.md` |
  | 70–73 | `epica-07-seo.md` |
  | 74–83 | `epica-08-propuestas.md` |
  | 84–86 | `epica-09-reportes.md` |
  | 87–92 | `epica-10-legal.md` |
  | 93–98 | `epica-11-calidad.md` |
  | 99–103 | `epica-12-lanzamiento.md` |
- **Requerimientos:** `docs/requerimientos.md`. Solo si la HU cita un RF/RNF que necesites aclarar;
  busca el ID con grep (`RF-26`) en vez de leer el archivo entero.
- **Pendientes:** `docs/pendientes.md`. Revísalo si la HU aparece ahí; pregunta antes de implementar.
- **Confianza:** `docs/confianza.md` (fórmula de `places.confidence`). Ábrelo si la HU toca el puntaje
  (ingesta, propuestas, tarjetas, ficha, orden por confianza).
