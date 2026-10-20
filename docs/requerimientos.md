# Requerimientos del MVP

Busca el ID que necesites (por ejemplo `RF-26`) en lugar de leer el archivo completo.

## Alcance y restricciones
- Una persona con IA · costo $0 (solo planes gratuitos) · proyecto personal, no comercial.
- MVP: Valle del Cauca (42 municipios). Otros departamentos después, solo con configuración y datos.
- Publicación 100% autónoma con avisos de posibles errores. Sin curación manual.
- Búsqueda solo por filtros: sin texto libre ni filtros por distancia.
- Propuestas de la comunidad desde el MVP. Sin cuentas de usuario.

## Decisiones técnicas
| Área | Decisión |
| --- | --- |
| Producto | Web + API REST `/api/v1` en un solo proyecto Next.js (App Router, SSR por SEO) |
| Lenguaje | TypeScript en todo |
| Base de datos | PostgreSQL + PostGIS en Supabase · Drizzle |
| Mapas | MapLibre + OpenFreeMap · atribución a OSM |
| Ingesta | Scripts TS en GitHub Actions (cron semanal + manual) |
| Anti-spam | Cloudflare Turnstile + límite por IP |
| Hosting | Vercel Hobby |
| Arquitectura | Monolito modular por dominio; sin microservicios ni colas |

Límites gratuitos a vigilar: Supabase pausa proyectos inactivos; Vercel Hobby no permite uso comercial; GitHub desactiva crons de repos inactivos.

## Ingesta y calidad
Fuentes: OpenStreetMap (Overpass), Wikidata (SPARQL), Wikimedia Commons, datos.gov.co (RNT, API Socrata), comunidad.
Pipeline: descubrimiento → extracción → normalización → deduplicación → enriquecimiento → validación → publicación.
- Descripciones generadas con plantillas a partir de datos estructurados; nunca copiar textos externos.
- Validación: coordenadas dentro del polígono del Valle; sin nombre, coordenadas o tipo → descartado.
- Deduplicación: < 200 m y nombre similar → un solo sitio con ambas fuentes.
- Confianza según número de fuentes y completitud.
- 3 reportes → sitio oculto.
- La ingesta no sobrescribe sitios de la comunidad ni reactiva ocultos.
- Fuera del MVP: LLM y scraping de blogs.

## Modelo de datos (conceptual)
| Entidad | Datos principales |
| --- | --- |
| Departamento | DIVIPOLA, nombre, polígono |
| Lugar (municipio/ciudad) | DIVIPOLA, nombre, slug, departamento, polígono |
| Tipo de lugar | cascada, río, mirador, cerro o pico, sendero, lago o laguna, reserva natural, balneario… + etiquetas OSM |
| Actividad | senderismo, baño en río, avistamiento de aves, camping, ciclismo, fotografía, plan familiar… |
| Sitio | nombre, slug, tipo, actividades, lugar, punto PostGIS, descripción, dificultad, altitud, costo (gratis/pago/sin dato), sensibilidad (normal/frágil), restricciones (área protegida, propiedad privada), origen (abiertas/comunidad), confianza, estado (publicado/oculto), fechas |
| Foto | sitio, URL, autor, licencia, fuente |
| Fuente | sitio, nombre, URL, id externo |
| Agencia | número RNT, nombre, municipio, contacto, estado |
| Reporte | sitio, motivo, comentario, fecha, IP cifrada |
| Ejecución de ingesta | fecha, nuevos, actualizados, descartados, errores |

El filtro geográfico se llama "Lugar" y agrupa municipios y ciudades.

## Legal, ambiental y seguridad
- Solo fuentes abiertas; fotos solo de Commons con autor y licencia; enlaces a fuentes originales.
- "© OpenStreetMap contributors" en todo mapa; datos de la API bajo ODbL.
- Retiro de contenido por correo; el mantenedor elimina desde Supabase.
- Propuestas: el colaborador acepta términos y cede licencia; sin fotos.
- Sin datos personales (Ley 1581 de 2012); IP solo cifrada y temporal.
- Sitios frágiles (p. ej. en áreas protegidas): ubicación aproximada ~2 km, sin coordenadas exactas en web ni API; avisos "No deje rastro".
- Etiquetas automáticas de área protegida y propiedad privada (OSM).
- Orden público: no se etiqueta como "seguro"; aviso fijo para consultar con alcaldía o Policía + agencias RNT.
- Constancia en: README, banner de primera visita, footer, ficha y formulario de propuesta.

## Requerimientos funcionales

### A. Búsqueda y exploración
- **RF-01** Inicio minimalista: solo presentación breve y panel de filtros; la información aparece al buscar.
- **RF-02** Filtros: Lugar (única, autocompletado), Tipo (múltiple), Actividad (múltiple), Dificultad (fácil, moderada, difícil, sin dato), Origen (abiertas, comunidad), ocultar acceso restringido.
- **RF-03** Y entre filtros; O dentro de un filtro múltiple.
- **RF-04** Filtros reflejados en la URL (`/explorar?lugar=dagua&actividad=senderismo`).
- **RF-05** Tarjetas: foto o genérica, nombre, lugar, tipo, actividades, confianza.
- **RF-06** Vista lista/mapa; frágiles como área aproximada.
- **RF-07** Orden: más recientes, mayor confianza, alfabético; barra de paginación numerada con la página en la URL.
- **RF-08** Estado vacío: sugerir quitar filtros.
- **RF-09** Página por lugar (`/lugar/{slug}`) para SEO.

### B. Ficha del lugar
- **RF-10** Nombre, tipo, lugar, descripción, actividades; dificultad, altitud y costo si hay dato.
- **RF-11** Galería con autor y licencia, o foto genérica del tipo.
- **RF-12** Mapa exacto o aproximado + "Cómo llegar" (Google Maps/OSM); frágiles → solo municipio.
- **RF-13** Etiquetas: área protegida, propiedad privada, frágil, "Propuesto por la comunidad · No verificado".
- **RF-14** Avisos fijos: "No deje rastro" y orden público.
- **RF-15** Fuentes con enlaces, confianza explicada, fecha de actualización.
- **RF-16** Agencias RNT del municipio, con aclaración de que no es recomendación.
- **RF-17** Otros sitios del mismo municipio (sin distancia).
- **RF-18** Compartir: copiar enlace y WhatsApp.

### C. Contribución
- **RF-19** Formulario: nombre, tipo, actividades, lugar, ubicación (clic en mapa), descripción, costo opcional, casilla frágil, aceptar términos, Turnstile; sin fotos.
- **RF-20** Validación: dentro del Valle, campos completos, aviso de duplicados, límite por IP.
- **RF-21** Confirmación con enlace a la ficha publicada.
- **RF-22** Reportar error: motivo (no existe, ubicación incorrecta, info falsa, inapropiado, peligroso) + comentario opcional.
- **RF-23** Ocultamiento automático con 3 reportes.

### D. Legal
- **RF-24** Banner de primera visita que se recuerda.
- **RF-25** Páginas: Términos, Aviso de responsabilidad, Fuentes y atribuciones, Contacto para retiro.

### E. API pública (solo lectura)
- **RF-26** `GET /api/v1/places` con los mismos filtros.
- **RF-27** `GET /api/v1/places/{slug}`; sin coordenadas exactas de frágiles.
- **RF-28** `GET /api/v1/catalogs`: lugares, tipos, actividades.
- **RF-29** Documentación OpenAPI + licencia ODbL.
- **RF-30** Límite de peticiones por IP.

### F. Ingesta
- **RF-31** Ejecución semanal + manual desde GitHub.
- **RF-32** Importar OSM, Wikidata, Commons y RNT con normalización, deduplicación y confianza.
- **RF-33** No sobrescribe comunidad ni reactiva ocultos.
- **RF-34** Registro de cada ejecución.

## Requerimientos no funcionales
- **RNF-01** Mobile-first.
- **RNF-02** SEO: SSR, metadatos, sitemap.
- **RNF-03** Ficha < 2,5 s en 4G; imágenes optimizadas.
- **RNF-04** Accesibilidad básica (AA).
- **RNF-05** Sin datos personales; IP cifrada y temporal.
- **RNF-06** Solo español.
- **RNF-07** Costo $0.
- **RNF-08** Agregar un departamento solo con configuración y datos.

## Pantallas
| Pantalla | Ruta |
| --- | --- |
| Inicio | `/` |
| Explorar | `/explorar` |
| Ficha | `/sitio/{slug}` |
| Municipio | `/lugar/{slug}` |
| Proponer | `/proponer` |
| Legales | `/terminos`, `/aviso`, `/fuentes`, `/contacto` |
| Docs API | `/api-docs` |
