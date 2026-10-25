# Puntaje de confianza (HU-30)

Número de 0 a 100 (`places.confidence`) que dice qué tan completo es un sitio. Se calcula igual
para los sitios de la ingesta y los de la comunidad. Código: `src/modules/places/confidence.ts`
(`CONFIDENCE_POINTS` y `confidenceScore`).

## Fórmula

| Concepto | Puntos | Cuándo suma |
| --- | ---: | --- |
| Base | 30 | Siempre: todo sitio tiene nombre, tipo, municipio, punto y una fuente |
| Fuente adicional | 20 | Por cada tipo de fuente más allá de la primera (p. ej. Wikidata en un sitio de OSM) |
| Fotos | 20 | Al menos una foto (da igual cuántas) |
| Dificultad | 10 | Tiene dificultad |
| Costo | 10 | Tiene costo (gratis o pago) |
| Altitud | 5 | Tiene altitud |
| Artículo de Wikipedia | 5 | Tiene enlace a Wikipedia en español |

Con dos fuentes y todos los campos, el sitio llega a 100. El resultado nunca pasa de 100.

- Las fuentes se cuentan por tipo (OpenStreetMap, Wikidata, comunidad), no por elemento: un río
  con 20 tramos de OSM cuenta como una sola fuente.
- Wikidata solo cuenta si el elemento existe. Una etiqueta `wikidata` de OSM que apunta a un
  elemento borrado no suma.
- Commons no es una fuente del sitio: aporta las fotos, que suman en su propia fila.
- Los campos cuentan igual para todos los tipos, aunque OSM casi solo da dificultad a los
  senderos y altitud a los cerros.

## Ejemplos

| Sitio | Puntaje |
| --- | ---: |
| Solo OSM, sin datos opcionales | 30 |
| Cerro de OSM con altitud | 35 |
| Sendero de OSM con dificultad | 40 |
| OSM + Wikidata con artículo de Wikipedia | 55 |
| OSM + Wikidata, Wikipedia y fotos | 75 |
| Propuesta de la comunidad con dificultad y costo | 50 |

Distribución con datos reales (546 sitios, 2026-10-24): 444 con 30, 74 con 35, 5 con 40,
20 con 55, 1 con 60 y 2 con 75.
