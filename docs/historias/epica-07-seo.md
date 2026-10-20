# Épica 7: Páginas por municipio y SEO (HU-70 a HU-73)
Que Google encuentre e indexe los sitios: el principal canal gratuito de visitantes.

## HU-70 · Página por municipio
Como visitante, quiero una página por municipio, para ver todos sus sitios juntos.
- Ruta `/lugar/{slug}` con nombre y lista paginada de sitios
- Renderizada en servidor
Req.: RF-09

## HU-71 · Metadatos y Open Graph
Como desarrollador, quiero metadatos y Open Graph en fichas y municipios, para que se vean bien en buscadores y al compartir.
- Título, descripción e imagen únicos por página
Req.: RNF-02

## HU-72 · Sitemap y robots
Como desarrollador, quiero generar `sitemap.xml` y `robots.txt`, para que Google descubra todas las páginas.
- Sitemap con fichas publicadas y municipios
- Se actualiza tras cada ingesta
Req.: RNF-02

## HU-73 · Datos estructurados
Como desarrollador, quiero datos estructurados de schema.org en las fichas, para mejorar cómo aparecen en Google.
- JSON-LD de tipo `TouristAttraction` válido en la herramienta de Google
Req.: RNF-02
