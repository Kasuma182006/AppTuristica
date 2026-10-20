# Épica 5: Inicio y exploración (HU-43 a HU-58)
El visitante encuentra sitios con filtros, en lista o en mapa.

## HU-43 · Inicio minimalista
Como visitante, quiero una página de inicio minimalista con el panel de filtros, para empezar a buscar sin distracciones.
- Solo presentación breve y filtros
- Al buscar, navega a `/explorar` con los filtros elegidos
Req.: RF-01

## HU-44 · Filtro Lugar
Como visitante, quiero elegir un lugar con autocompletado, para encontrar rápido mi municipio o ciudad.
- Sugerencias al escribir, sin importar tildes
- Solo valores del catálogo
- Selección única
Req.: RF-02

## HU-45 · Filtro Tipo
Como visitante, quiero filtrar por uno o varios tipos de lugar, para ver solo lo que me interesa.
- Selección múltiple
- Cascada + río muestra cascadas o ríos
Req.: RF-02, RF-03

## HU-46 · Filtro Actividad
Como visitante, quiero filtrar por una o varias actividades, para encontrar planes como senderismo.
- Selección múltiple con lógica O
Req.: RF-02, RF-03

## HU-47 · Filtro Dificultad
Como visitante, quiero filtrar por dificultad, para elegir senderos acordes a mi nivel.
- Opciones: fácil, moderada, difícil, sin dato
Req.: RF-02

## HU-48 · Filtro Origen
Como visitante, quiero filtrar por origen, para ver solo sitios de fuentes abiertas o de la comunidad.
- Dos casillas, ambas marcadas por defecto
Req.: RF-02

## HU-49 · Ocultar acceso restringido
Como visitante, quiero ocultar sitios con acceso restringido, para ver solo lugares de acceso libre.
- Casilla desmarcada por defecto
- Al marcarla se excluyen áreas protegidas y propiedad privada
Req.: RF-02

## HU-50 · Limpiar filtros
Como visitante, quiero limpiar todos los filtros con un clic, para empezar de nuevo.
- Botón "Limpiar filtros" visible cuando hay alguno activo
Req.: RF-02

## HU-51 · Filtros en la URL
Como visitante, quiero que los filtros queden en la URL, para compartir mi búsqueda.
- Cada cambio actualiza la URL
- Abrir la URL restaura los filtros
Req.: RF-04

## HU-52 · Tarjetas de resultados
Como visitante, quiero ver los resultados en tarjetas, para comparar sitios de un vistazo.
- Foto o imagen genérica, nombre, lugar, tipo, actividades y confianza
- Clic abre la ficha
Req.: RF-05

## HU-53 · Ordenar resultados
Como visitante, quiero ordenar los resultados, para ver primero lo que más me interesa.
- Más recientes, mayor confianza o alfabético
- El orden queda en la URL
Req.: RF-07

## HU-54 · Paginación numerada
Como visitante, quiero una barra de paginación numerada, para recorrer los resultados por páginas.
- Anterior, números y siguiente
- Página actual resaltada y en la URL
- Cambiar un filtro vuelve a la página 1
Req.: RF-07

## HU-55 · Estado vacío
Como visitante, quiero un mensaje cuando no hay resultados, para saber qué hacer.
- Sugiere quitar filtros
- Botón para limpiarlos
Req.: RF-08

## HU-56 · Carga y error
Como visitante, quiero ver indicadores de carga y de error, para entender qué está pasando.
- Esqueleto de tarjetas mientras carga
- Mensaje y botón de reintento ante error
Req.: RNF-01

## HU-57 · Alternar lista/mapa
Como visitante, quiero alternar entre vista de lista y de mapa, para elegir cómo explorar.
- Botón de alternancia
- La vista elegida queda en la URL
- Los filtros se mantienen
Req.: RF-06

## HU-58 · Vista de mapa
Como visitante, quiero ver los resultados en un mapa, para ubicar los sitios en el territorio.
- Marcadores con MapLibre y OpenFreeMap
- Sitios frágiles como área aproximada
- Clic en marcador muestra resumen y enlace
- Atribución a OSM visible
Req.: RF-06
