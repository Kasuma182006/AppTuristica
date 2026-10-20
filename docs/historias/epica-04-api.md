# Épica 4: API pública (HU-35 a HU-42)
Expone los datos en solo lectura; la web consume los mismos services.

## HU-35 · Catálogos
Como consumidor de la API, quiero obtener los catálogos, para conocer los valores de los filtros.
- `GET /api/v1/catalogs` devuelve lugares, tipos y actividades con slug y nombre
Req.: RF-28

## HU-36 · Filtrar sitios
Como consumidor de la API, quiero filtrar sitios por lugar, tipo, actividad, dificultad, origen y acceso, para obtener solo lo que busco.
- `GET /api/v1/places` acepta los filtros
- Y entre filtros, O dentro de un filtro múltiple
- Parámetro inválido → 400 con mensaje
Req.: RF-26, RF-03

## HU-37 · Ordenar y paginar
Como consumidor de la API, quiero ordenar y paginar los resultados, para recorrerlos por partes.
- Parámetros `sort`, `page` y `pageSize`
- La respuesta incluye total y número de páginas
Req.: RF-26, RF-07

## HU-38 · Detalle de un sitio
Como consumidor de la API, quiero consultar el detalle de un sitio, para ver toda su información.
- `GET /api/v1/places/{slug}` con fotos, fuentes y actividades
- Slug inexistente u oculto → 404
Req.: RF-27

## HU-39 · Proteger sitios frágiles
Como desarrollador, quiero que la API nunca entregue coordenadas exactas de sitios frágiles, para protegerlos.
- Sitio frágil → coordenadas aproximadas a ~2 km
- Aplica en listado y detalle
Req.: RF-27

## HU-40 · Excluir ocultos
Como desarrollador, quiero que los sitios ocultos no aparezcan en ninguna respuesta, para respetar los reportes.
- Estado oculto excluido de listado, detalle y conteos
Req.: RF-23

## HU-41 · Límite por IP
Como desarrollador, quiero limitar las peticiones por IP, para proteger el plan gratuito.
- Al superar el límite → 429 con tiempo de espera
Req.: RF-30

## HU-42 · Documentación OpenAPI
Como consumidor de la API, quiero una documentación OpenAPI, para integrarme sin leer el código.
- Página `/api-docs` con todos los endpoints
- Indica licencia ODbL y atribución a OSM
Req.: RF-29
