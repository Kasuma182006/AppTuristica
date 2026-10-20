# Épica 1: Configuración del proyecto (HU-01 a HU-08)
Esqueleto técnico: repositorio, base de datos, pruebas, CI y despliegue.

## HU-01 · Proyecto Next.js base
Como desarrollador, quiero crear el proyecto Next.js con TypeScript, ESLint y Prettier, para tener una base de código consistente.
- El proyecto corre en local
- Lint y formato sin errores
- TypeScript en modo estricto
Req.: Base

## HU-02 · Tailwind y estilos base
Como desarrollador, quiero configurar Tailwind CSS con los colores y la tipografía base, para mantener un estilo uniforme.
- Tokens de color y fuente definidos
- Una página de prueba los usa
Req.: Base

## HU-03 · Supabase con PostGIS
Como desarrollador, quiero crear el proyecto en Supabase con PostGIS habilitado, para guardar datos geográficos.
- Extensión PostGIS activa
- Credenciales en variables de entorno, fuera del repositorio
- `.env.example` documentado
Req.: Base

## HU-04 · Drizzle y migraciones
Como desarrollador, quiero configurar Drizzle con migraciones, para versionar el esquema de la base.
- Conexión a Supabase funcionando
- Comando para generar y aplicar migraciones
Req.: Base

## HU-05 · Vitest
Como desarrollador, quiero configurar Vitest, para escribir pruebas automatizadas.
- Comando `test` ejecuta una prueba de ejemplo
Req.: Base

## HU-06 · CI en GitHub Actions
Como desarrollador, quiero un flujo de CI en GitHub Actions, para validar cada cambio.
- En cada push corre lint, tipos, pruebas y build
- Un fallo marca el commit en rojo
Req.: Base

## HU-07 · Despliegue en Vercel
Como desarrollador, quiero conectar el repositorio a Vercel, para desplegar automáticamente.
- Push a `main` despliega producción
- Las ramas generan vistas previas
Req.: RNF-07

## HU-08 · Layout base
Como visitante, quiero un diseño base con encabezado y pie de página, para navegar el sitio desde cualquier dispositivo.
- Encabezado con logo y enlace a "Proponer lugar"
- Pie de página presente
- Se adapta desde 360 px de ancho
Req.: RNF-01
