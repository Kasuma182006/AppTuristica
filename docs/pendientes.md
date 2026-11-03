# Decisiones pendientes
Preguntar al dueño del proyecto antes de implementar la historia afectada. Al decidir, anotar la respuesta aquí.

- [ ] Meta mínima de sitios publicados para lanzar (HU-100)
- [x] Propuestas permitidas por IP al día (HU-82): 5, contando solo las aceptadas (decidido el 2026-11-02)
- [x] Correo para solicitudes de retiro (HU-91): kasuma184@gmail.com, en `/contacto` (decidido el 2026-11-02)
- [ ] Revisar con un abogado `/terminos`, `/aviso` y `/contacto`: el texto no tiene revisión legal, y no nombra a un responsable (HU-88). El hash de la IP podría ser dato personal para la Ley 1581, que pide identificar al responsable del tratamiento.
- [ ] Sitios de la comunidad en áreas protegidas: solo son frágiles si quien propone marca la casilla (HU-77), porque los polígonos de OSM no se guardan en la base. Un sitio sin marcar se publica con punto exacto y la ingesta no lo corrige. Opción si se vuelve un problema: guardar los polígonos en una tabla, llenada por la ingesta, y marcar frágil al guardar
- [ ] Si el cron de ingesta falla seguido por Overpass: historia para pasar a Geofabrik + osmium (ver README)

## Supuestos ya tomados
- 24 resultados por página en explorar (HU-54, decidido el 2026-10-27) · ~2 km de aproximación para sitios frágiles (HU-39) · máx. 5 fotos por sitio (HU-28) · hasta 6 sitios relacionados (HU-67)
