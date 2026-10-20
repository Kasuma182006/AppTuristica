# Épica 2: Modelo de datos y catálogos (HU-09 a HU-19)
Tablas y catálogos que alimentan los filtros.

## HU-09 · Departamentos
Como desarrollador, quiero la tabla de departamentos con el Valle del Cauca cargado, para delimitar el alcance geográfico.
- Código DIVIPOLA, nombre y polígono
- Seed reproducible
Req.: RNF-08

## HU-10 · Lugares (municipios y ciudades)
Como desarrollador, quiero la tabla de lugares con los 42 del Valle, para el filtro "Lugar".
- DIVIPOLA, nombre, slug único, departamento y polígono
- 42 registros tras el seed
Req.: RF-02

## HU-11 · Tipos de lugar
Como desarrollador, quiero el catálogo de tipos de lugar con su equivalencia en etiquetas de OSM, para clasificar los sitios.
- Tipos: cascada, río, mirador, cerro o pico, sendero, lago o laguna, reserva natural, balneario
- Cada tipo tiene sus etiquetas OSM
Req.: RF-02

## HU-12 · Actividades
Como desarrollador, quiero el catálogo de actividades con reglas de derivación, para asignar actividades automáticamente.
- Actividades cargadas
- Reglas que asocian tipos o etiquetas a actividades (sendero → senderismo)
Req.: RF-02

## HU-13 · Sitios
Como desarrollador, quiero la tabla de sitios, para guardar cada lugar turístico.
- Campos del modelo conceptual (ver docs/requerimientos.md)
- Ubicación como punto PostGIS
- Slug único
- Estado publicado u oculto
Req.: RF-10

## HU-14 · Sitios ↔ actividades
Como desarrollador, quiero la relación entre sitios y actividades, para que un sitio tenga varias actividades.
- Relación muchos a muchos
- Sin duplicados por sitio
Req.: RF-02

## HU-15 · Fotos
Como desarrollador, quiero la tabla de fotos, para guardar imágenes con su atribución.
- URL, autor, licencia y fuente obligatorios
Req.: RF-11

## HU-16 · Fuentes por sitio
Como desarrollador, quiero la tabla de fuentes por sitio, para mostrar de dónde sale cada dato.
- Nombre de la fuente, URL e identificador externo
- Única por fuente e identificador
Req.: RF-15

## HU-17 · Agencias
Como desarrollador, quiero la tabla de agencias, para guardar las agencias del RNT.
- Número RNT único, nombre, municipio, contacto y estado
Req.: RF-16

## HU-18 · Reportes y ejecuciones de ingesta
Como desarrollador, quiero las tablas de reportes y de ejecuciones de ingesta, para registrar incidencias y procesos.
- Reporte: sitio, motivo, comentario, fecha, IP cifrada
- Ejecución: fecha, conteos y errores
Req.: RF-22, RF-34

## HU-19 · Índices
Como desarrollador, quiero índices en las columnas filtradas, para que las búsquedas sean rápidas.
- Índice espacial en ubicación
- Índices en lugar, tipo y estado
Req.: RNF-03
