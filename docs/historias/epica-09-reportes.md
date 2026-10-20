# Épica 9: Reportes de errores (HU-84 a HU-86)
Reemplaza la curación manual: los visitantes señalan problemas y el sistema reacciona solo.

## HU-84 · Reportar error
Como colaborador, quiero reportar un error desde la ficha, para avisar de información incorrecta o peligrosa.
- Modal con motivo (no existe, ubicación incorrecta, información falsa, contenido inapropiado, peligroso) y comentario opcional
- Protegido con Turnstile
- Mensaje de agradecimiento
Req.: RF-22

## HU-85 · Un reporte por IP y sitio
Como desarrollador, quiero aceptar un solo reporte por IP y sitio, para que nadie oculte un sitio por su cuenta.
- Un segundo reporte de la misma IP al mismo sitio se ignora
Req.: RF-22, RNF-05

## HU-86 · Ocultamiento automático
Como desarrollador, quiero ocultar automáticamente un sitio con 3 reportes, para retirar contenido problemático sin intervención.
- Al tercer reporte el estado pasa a oculto
- Desaparece de web y API
Req.: RF-23
