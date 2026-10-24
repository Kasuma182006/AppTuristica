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
- **Sitios ocultos** (3 reportes) no aparecen en ninguna respuesta, conteo ni sitemap.
- La ingesta es **idempotente**, **no modifica sitios de la comunidad** y **no reactiva sitios ocultos**.
- Validación geográfica: todo sitio debe caer dentro del polígono del Valle; municipio asignado por cruce geográfico.
- Propuestas: anónimas, sin fotos, Turnstile verificado en servidor, publicación inmediata con origen "comunidad".
- Un reporte por IP y sitio. IP siempre guardada cifrada (hash), nunca en claro.

## Legal y datos
- Solo fuentes abiertas: OpenStreetMap (Overpass), Wikidata, Wikimedia Commons, datos.gov.co (RNT).
- **Nunca copiar textos ni fotos de terceros.** Descripciones generadas por plantillas; fotos solo de Commons con autor y licencia.
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
`ingest` (todas las fuentes; `-- --source=osm|rnt` para una; si una falla sigue y sale con código 1)
Scripts fuera de Next.js (seed, ingesta) se ejecutan con `tsx`. En código, "Lugar" (municipio) es
`municipalities`; `places` son los sitios turísticos. Toda tabla nueva lleva `.enableRLS()` (lo verifica una prueba).
Pruebas: archivos `*.test.ts` junto al código en `src/`, `db/` o `ingest/`. Node 24 (`.nvmrc`; CI y Vercel usan la última 24.x). Local: Node 24.22.1 (parches de
seguridad, 2026-10-23) con npm 11.19, que avisa de install scripts no aprobados (`esbuild`,
`unrs-resolver`): es inofensivo, todo funciona sin ellos.
SQL que Drizzle no genera (extensiones, funciones): `npx drizzle-kit generate --custom --name=<nombre>`.

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
