# Épica 8: Propuestas de la comunidad (HU-74 a HU-83)
Cualquier persona agrega sitios poco conocidos; se publican automáticamente tras validarse.

## HU-74 · Formulario de propuesta
Como colaborador, quiero un formulario con los datos básicos del sitio, para proponer un lugar.
- Nombre, tipo, actividades, lugar y descripción
- Campos obligatorios marcados
- Sin subida de fotos
Req.: RF-19

## HU-75 · Ubicación en el mapa
Como colaborador, quiero marcar la ubicación con un clic en el mapa, para indicar dónde queda.
- Un marcador movible
- Las coordenadas se guardan en el formulario
Req.: RF-19

## HU-76 · Costo de entrada
Como colaborador, quiero indicar el costo de entrada, para informar a otros visitantes.
- Campo opcional: gratis, pago o no sé
Req.: RF-19

## HU-77 · Marcar como frágil
Como colaborador, quiero marcar el sitio como frágil, para que su ubicación exacta no se publique.
- Casilla con explicación breve
- Marcada → sensibilidad frágil
Req.: RF-19

## HU-78 · Aceptar términos
Como colaborador, quiero aceptar los términos y la licencia antes de enviar, para saber cómo se usará mi aporte.
- Casilla obligatoria con enlace a Términos de uso
- Sin marcarla no se puede enviar
Req.: RF-19

## HU-79 · Turnstile
Como desarrollador, quiero proteger el formulario con Cloudflare Turnstile, para evitar envíos de bots.
- El servidor verifica el token
- Token inválido → rechazo
Req.: RF-19

## HU-80 · Validación en servidor
Como desarrollador, quiero validar la propuesta en el servidor, para no publicar datos inválidos.
- Campos completos
- Coordenadas dentro del Valle
- Municipio asignado por cruce geográfico
- Errores mostrados junto a cada campo
Req.: RF-20

## HU-81 · Aviso de duplicado
Como colaborador, quiero ver si el sitio ya existe antes de enviarlo, para no duplicarlo.
- Sitio a < 200 m con nombre similar → "¿Es este lugar?" con enlace
- Puede continuar si no lo es
Req.: RF-20

## HU-82 · Límite por IP
Como desarrollador, quiero limitar las propuestas por IP, para frenar el spam.
- Máximo de envíos por IP al día
- IP guardada cifrada
Req.: RF-20, RNF-05

## HU-83 · Publicación y confirmación
Como colaborador, quiero ver mi sitio publicado al enviarlo, para confirmar que quedó bien.
- Publicación inmediata con origen comunidad
- Pantalla de confirmación con enlace a la ficha
Req.: RF-21
