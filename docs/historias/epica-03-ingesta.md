# Épica 3: Ingesta automática (HU-20 a HU-34)
Llena la base con sitios del Valle desde fuentes abiertas, sin intervención manual.

## HU-20 · Estructura de ingesta
Como desarrollador, quiero una estructura de ingesta con un adaptador por fuente, para agregar fuentes sin tocar el resto.
- Comando `ingest` ejecuta todas las fuentes
- Se puede ejecutar una sola fuente por parámetro
Req.: RF-31

## HU-21 · Consulta a Overpass
Como sistema de ingesta, quiero consultar Overpass por el área del Valle, para obtener sitios candidatos de OSM.
- Trae los elementos de las etiquetas mapeadas en HU-11
- Reintenta ante errores de red
Req.: RF-32

## HU-22 · Normalización OSM
Como sistema de ingesta, quiero convertir cada elemento de OSM en un sitio normalizado, para guardarlo con un formato común.
- Nombre, tipo, coordenadas, dificultad (`sac_scale`), altitud y costo cuando existan
- Actividades asignadas con las reglas de HU-12
Req.: RF-32

## HU-23 · Municipio por cruce geográfico
Como sistema de ingesta, quiero asignar el municipio por cruce geográfico, para que cada sitio tenga su lugar.
- El municipio es el polígono que contiene el punto
Req.: RF-32

## HU-24 · Descarte de inválidos
Como sistema de ingesta, quiero descartar sitios fuera del Valle o sin campos mínimos, para no publicar datos inválidos.
- Sin nombre, coordenadas o tipo → descartado
- Fuera del polígono → descartado
- Motivo registrado
Req.: RF-32

## HU-25 · Restricciones de acceso
Como sistema de ingesta, quiero detectar restricciones de acceso, para advertir al visitante.
- Dentro de un área protegida → etiqueta y sensibilidad frágil
- `access=private` → etiqueta de propiedad privada
Req.: RF-13

## HU-26 · Deduplicación
Como sistema de ingesta, quiero deduplicar sitios cercanos con nombre similar, para no mostrar el mismo lugar dos veces.
- A menos de 200 m y nombre similar → un solo sitio con ambas fuentes
Req.: RF-32

## HU-27 · Enriquecimiento con Wikidata
Como sistema de ingesta, quiero enriquecer los sitios con Wikidata, para sumar descripción corta y enlaces.
- Si OSM tiene `wikidata`, se guarda la descripción corta y el enlace a Wikipedia
- Se agrega como fuente
Req.: RF-32

## HU-28 · Fotos de Commons
Como sistema de ingesta, quiero obtener fotos de Wikimedia Commons, para mostrar imágenes con licencia libre.
- Solo fotos con autor y licencia libre
- Máximo 5 por sitio
Req.: RF-11

## HU-29 · Descripciones por plantilla
Como sistema de ingesta, quiero generar descripciones con plantillas, para tener textos propios.
- Una plantilla por tipo
- Usa solo datos disponibles
- Nunca copia textos externos
Req.: RF-10

## HU-30 · Puntaje de confianza
Como sistema de ingesta, quiero calcular un puntaje de confianza, para que el visitante sepa qué tan completo es un sitio.
- Según número de fuentes y campos completos
- Fórmula documentada y con pruebas
Req.: RF-15

## HU-31 · Guardado idempotente
Como sistema de ingesta, quiero guardar los sitios de forma idempotente, para actualizar sin duplicar.
- Repetir la ingesta no crea duplicados
- No modifica sitios de la comunidad
- No reactiva sitios ocultos
Req.: RF-33

## HU-32 · Agencias del RNT
Como sistema de ingesta, quiero importar las agencias del RNT del Valle desde datos.gov.co, para sugerirlas en las fichas.
- Solo agencias activas
- Asociadas a su municipio
- Actualiza las existentes por número RNT
Req.: RF-16

## HU-33 · Registro de ejecución
Como desarrollador, quiero que cada ejecución quede registrada, para revisar qué pasó.
- Guarda nuevos, actualizados, descartados y errores
- Resumen impreso al terminar
Req.: RF-34

## HU-34 · Cron en GitHub Actions
Como desarrollador, quiero programar la ingesta en GitHub Actions, para que corra sola cada semana.
- Cron semanal
- Ejecución manual disponible
- Credenciales como secretos de GitHub
Req.: RF-31
