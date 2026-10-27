import { API_ERROR_CODES } from "@/lib/api-response";
import { APPROX_RADIUS_M } from "@/lib/geo";
import { API_RATE_LIMIT } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";
import { SLUG_PATTERN } from "@/lib/slug";
import type { Catalogs } from "@/modules/catalogs/types";
import { FREE_ACCESS } from "@/modules/places/filters";
import {
  COST_SLUGS,
  DIFFICULTY_SLUGS,
  ORIGIN_SLUGS,
  PAGE_SIZE,
  SORT_SLUGS,
  SOURCE_NAMES,
  type Page,
  type PlaceDetail,
  type PlaceSummary,
} from "@/modules/places/types";

/** The subset of JSON Schema (OpenAPI 3.1) this document uses. */
export interface Schema {
  type?: SchemaType | SchemaType[];
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  enum?: readonly (string | null)[];
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  default?: string | number;
  $ref?: string;
  anyOf?: Schema[];
}

type SchemaType = "object" | "array" | "string" | "integer" | "number" | "boolean" | "null";

export interface Parameter {
  name: string;
  in: "query" | "path";
  required?: boolean;
  description: string;
  schema: Schema;
  /** Lists go comma-separated (`?tipo=cascada,rio`): style form, explode false. */
  style?: "form";
  explode?: boolean;
  example?: string;
}

export interface ResponseObject {
  description: string;
  headers?: Record<string, { description: string; schema: Schema }>;
  content?: { "application/json": { schema: Schema; example?: unknown } };
}

export interface Operation {
  operationId: string;
  summary: string;
  description: string;
  parameters?: Parameter[];
  responses: Record<string, ResponseObject | { $ref: string }>;
  /** Request shown on /api-docs, relative to the server URL. */
  "x-example-request": string;
}

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
    description: string;
    license: { name: string; identifier: string; url: string };
  };
  servers: { url: string; description: string }[];
  paths: Record<string, { get: Operation }>;
  components: {
    schemas: Record<string, Schema>;
    responses: Record<string, ResponseObject>;
  };
}

export const API_BASE_PATH = "/api/v1";

export const DATA_LICENSE = {
  name: "Open Database License (ODbL) 1.0",
  identifier: "ODbL-1.0",
  url: "https://opendatacommons.org/licenses/odbl/1-0/",
} as const;

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const nullable = (type: SchemaType, description: string): Schema => ({
  type: [type, "null"],
  description,
});
const slugPattern = SLUG_PATTERN.source;
const keysOf = (record: Record<string, unknown>) => Object.keys(record);

// Examples are real responses (October 2026), typed so they break when the shapes change.
const catalogsExample: Catalogs = {
  municipalities: [
    { slug: "alcala", name: "Alcalá" },
    { slug: "andalucia", name: "Andalucía" },
  ],
  placeTypes: [
    { slug: "cascada", name: "Cascada" },
    { slug: "rio", name: "Río" },
  ],
  activities: [
    { slug: "senderismo", name: "Senderismo" },
    { slug: "bano-en-rio", name: "Baño en río" },
  ],
};

const placeSummaryExample: PlaceSummary = {
  slug: "embalse-de-calima",
  name: "Embalse de Calima",
  municipality: { slug: "calima", name: "Calima" },
  placeType: { slug: "lago", name: "Lago o laguna" },
  activities: [],
  difficulty: null,
  origin: "abiertas",
  confidence: 75,
  location: { lat: 3.892485, lng: -76.501984, approximate: false, radiusM: null },
  restricted: false,
  photo: {
    url: "https://upload.wikimedia.org/wikipedia/commons/1/14/Lago_Calima.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
    width: 1280,
    height: 960,
    author: "No machine-readable author provided. Chilangoco assumed (based on copyright claims).",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Lago_Calima.jpg",
  },
};

const pageExample: { data: PlaceSummary[]; meta: Omit<Page<PlaceSummary>, "items"> } = {
  data: [placeSummaryExample],
  meta: { total: 9, page: 1, pageSize: 1, totalPages: 9 },
};

const placeDetailExample: PlaceDetail = {
  slug: "embalse-de-calima",
  name: "Embalse de Calima",
  municipality: { slug: "calima", name: "Calima" },
  placeType: { slug: "lago", name: "Lago o laguna" },
  activities: [],
  difficulty: null,
  origin: "abiertas",
  confidence: 75,
  location: { lat: 3.892485, lng: -76.501984, approximate: false, radiusM: null },
  description: "Lago en Calima, Valle del Cauca.",
  wikidataDescription: "embalse de Colombia",
  wikipediaUrl: "https://es.wikipedia.org/wiki/Embalse_del_Calima",
  altitudeM: null,
  cost: null,
  fragile: false,
  inProtectedArea: false,
  privateProperty: false,
  photos: [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/1/14/Lago_Calima.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      width: 1280,
      height: 960,
      author:
        "No machine-readable author provided. Chilangoco assumed (based on copyright claims).",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lago_Calima.jpg",
    },
  ],
  sources: [
    { source: "openstreetmap", url: "https://www.openstreetmap.org/relation/11305941" },
    { source: "wikidata", url: "https://www.wikidata.org/wiki/Q3133513" },
  ],
  updatedAt: "2026-10-26T09:20:39.640Z",
};

const errorResponse = (description: string, code: string, message: string): ResponseObject => ({
  description,
  content: {
    "application/json": { schema: ref("Error"), example: { error: { code, message } } },
  },
});

const commonErrors = {
  "429": { $ref: "#/components/responses/TooManyRequests" },
  "500": { $ref: "#/components/responses/InternalError" },
};

const listParameter = (
  name: string,
  description: string,
  items: Schema,
  example: string,
): Parameter => ({
  name,
  in: "query",
  description,
  schema: { type: "array", items },
  style: "form",
  explode: false,
  example,
});

const placeSummaryProperties: Record<string, Schema> = {
  slug: { type: "string", pattern: slugPattern, description: "Identificador en URLs." },
  name: { type: "string" },
  municipality: { ...ref("CatalogItem"), description: "Municipio (filtro Lugar)." },
  placeType: ref("CatalogItem"),
  activities: { type: "array", items: ref("CatalogItem") },
  difficulty: {
    type: ["string", "null"],
    enum: [...keysOf(DIFFICULTY_SLUGS).filter((slug) => slug !== "sin-dato"), null],
    description: "null si no hay dato.",
  },
  origin: { type: "string", enum: keysOf(ORIGIN_SLUGS) },
  confidence: {
    type: "integer",
    minimum: 0,
    maximum: 100,
    description: "Puntaje de 0 a 100 según fuentes y datos completos.",
  },
  location: ref("Location"),
};

/** OpenAPI 3.1 description of the public API (HU-42, RF-29), served at /api/v1/openapi.json. */
export const openApiDocument: OpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "API del Buscador turístico del Valle del Cauca",
    version: "1.0.0",
    description:
      "API pública de solo lectura con los sitios turísticos poco conocidos del Valle del Cauca " +
      "(Colombia). Sin autenticación. Las respuestas exitosas van en `data` (las listas, además, " +
      "en `meta`) y los errores en `error`. Textos en español.",
    license: DATA_LICENSE,
  },
  servers: [{ url: `${SITE_URL}${API_BASE_PATH}`, description: "Producción" }],
  paths: {
    "/catalogs": {
      get: {
        operationId: "getCatalogs",
        summary: "Catálogos de los filtros",
        description:
          "Municipios (filtro `lugar`), tipos (`tipo`) y actividades (`actividad`) con su slug y " +
          "nombre, incluidos los que aún no tienen sitios. Se pueden guardar en caché una hora.",
        responses: {
          "200": {
            description: "Valores de los filtros.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: { data: ref("Catalogs") },
                },
                example: { data: catalogsExample },
              },
            },
          },
          ...commonErrors,
        },
        "x-example-request": "/catalogs",
      },
    },
    "/places": {
      get: {
        operationId: "listPlaces",
        summary: "Buscar sitios",
        description:
          "Sitios publicados que cumplen los filtros: Y entre filtros distintos, O entre los " +
          "valores de un mismo filtro (separados por comas). Sin filtros devuelve todos.",
        parameters: [
          {
            name: "lugar",
            in: "query",
            description: "Slug de un municipio (uno solo). Ver /catalogs.",
            schema: { type: "string", pattern: slugPattern },
            example: "dagua",
          },
          listParameter(
            "tipo",
            "Slugs de tipos de sitio. Ver /catalogs.",
            { type: "string", pattern: slugPattern },
            "cascada,rio",
          ),
          listParameter(
            "actividad",
            "Slugs de actividades. Ver /catalogs.",
            { type: "string", pattern: slugPattern },
            "senderismo",
          ),
          listParameter(
            "dificultad",
            "Dificultad; `sin-dato` incluye los sitios que no la tienen.",
            { type: "string", enum: keysOf(DIFFICULTY_SLUGS) },
            "facil,sin-dato",
          ),
          listParameter(
            "origen",
            "`abiertas` (fuentes abiertas) o `comunidad` (propuestos por visitantes).",
            { type: "string", enum: keysOf(ORIGIN_SLUGS) },
            "comunidad",
          ),
          {
            name: "acceso",
            in: "query",
            description: `\`${FREE_ACCESS}\` excluye los sitios en áreas protegidas o en propiedad privada.`,
            schema: { type: "string", enum: [FREE_ACCESS] },
            example: FREE_ACCESS,
          },
          {
            name: "orden",
            in: "query",
            description:
              "`confianza` (mayor primero), `recientes` (los del día más nuevo primero; dentro " +
              "del día, mayor confianza) o `alfabetico`.",
            schema: { type: "string", enum: SORT_SLUGS, default: SORT_SLUGS[0] },
            example: "recientes",
          },
          {
            name: "pagina",
            in: "query",
            description: "Número de página. Una página posterior a la última llega vacía.",
            schema: { type: "integer", minimum: 1, default: 1 },
            example: "2",
          },
          {
            name: "por-pagina",
            in: "query",
            description: "Sitios por página.",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: PAGE_SIZE.max,
              default: PAGE_SIZE.default,
            },
            example: "24",
          },
        ],
        responses: {
          "200": {
            description: "Una página de resultados.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data", "meta"],
                  properties: {
                    data: { type: "array", items: ref("PlaceSummary") },
                    meta: ref("PageMeta"),
                  },
                },
                example: pageExample,
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          ...commonErrors,
        },
        "x-example-request": "/places?lugar=calima&orden=confianza&por-pagina=1",
      },
    },
    "/places/{slug}": {
      get: {
        operationId: "getPlace",
        summary: "Detalle de un sitio",
        description:
          "Toda la información de un sitio publicado: descripción, fotos con autor y licencia, " +
          "fuentes y fecha de actualización.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            description: "Slug del sitio, como llega en /places.",
            schema: { type: "string", pattern: slugPattern },
            example: "embalse-de-calima",
          },
        ],
        responses: {
          "200": {
            description: "El sitio.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: { data: ref("PlaceDetail") },
                },
                example: { data: placeDetailExample },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          ...commonErrors,
        },
        "x-example-request": "/places/embalse-de-calima",
      },
    },
  },
  components: {
    schemas: {
      CatalogItem: {
        type: "object",
        required: ["slug", "name"],
        properties: {
          slug: { type: "string", pattern: slugPattern, description: "Valor para los filtros." },
          name: { type: "string", description: "Nombre para mostrar." },
        },
      },
      Catalogs: {
        type: "object",
        required: ["municipalities", "placeTypes", "activities"],
        properties: {
          municipalities: {
            type: "array",
            items: ref("CatalogItem"),
            description: "En orden alfabético.",
          },
          placeTypes: { type: "array", items: ref("CatalogItem") },
          activities: { type: "array", items: ref("CatalogItem") },
        },
      },
      Location: {
        type: "object",
        required: ["lat", "lng", "approximate", "radiusM"],
        description:
          "Ubicación en WGS 84. Los sitios frágiles nunca llevan coordenadas exactas: se da el " +
          `centro de un área de ${APPROX_RADIUS_M / 1000} km de radio que siempre contiene el sitio.`,
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
          approximate: { type: "boolean" },
          radiusM: nullable("integer", "Radio del área en metros si es aproximada; si no, null."),
        },
      },
      PlaceSummary: {
        type: "object",
        required: [...Object.keys(placeSummaryProperties), "restricted", "photo"],
        properties: {
          ...placeSummaryProperties,
          restricted: {
            type: "boolean",
            description: "En área protegida o en propiedad privada.",
          },
          photo: {
            anyOf: [ref("Photo"), { type: "null" }],
            description:
              "Portada (la primera foto de la galería); null si el sitio no tiene fotos.",
          },
        },
      },
      Photo: {
        type: "object",
        required: ["url", "width", "height", "author", "license", "licenseUrl", "sourceUrl"],
        description: "Foto de Wikimedia Commons. Al reutilizarla, cita su autor y su licencia.",
        properties: {
          url: { type: "string", format: "uri" },
          width: nullable("integer", "Ancho en píxeles."),
          height: nullable("integer", "Alto en píxeles."),
          author: { type: "string" },
          license: { type: "string", description: 'Por ejemplo "CC BY-SA 4.0".' },
          licenseUrl: nullable("string", "Texto de la licencia."),
          sourceUrl: nullable(
            "string",
            "Página del archivo en Commons; null en sitios frágiles (revelaría la ubicación).",
          ),
        },
      },
      Source: {
        type: "object",
        required: ["source", "url"],
        properties: {
          source: { type: "string", enum: Object.values(SOURCE_NAMES) },
          url: nullable(
            "string",
            "Elemento de OSM o de Wikidata; null para la comunidad y en sitios frágiles.",
          ),
        },
      },
      PlaceDetail: {
        type: "object",
        required: [
          ...Object.keys(placeSummaryProperties),
          "description",
          "wikidataDescription",
          "wikipediaUrl",
          "altitudeM",
          "cost",
          "fragile",
          "inProtectedArea",
          "privateProperty",
          "photos",
          "sources",
          "updatedAt",
        ],
        properties: {
          ...placeSummaryProperties,
          description: nullable("string", "Descripción del sitio."),
          wikidataDescription: nullable(
            "string",
            "Descripción corta de Wikidata (CC0). Muéstrala como de Wikidata, no como del sitio.",
          ),
          wikipediaUrl: nullable("string", "Artículo en Wikipedia en español."),
          altitudeM: nullable("integer", "Altitud en metros."),
          cost: {
            type: ["string", "null"],
            enum: [...keysOf(COST_SLUGS), null],
            description: "Costo de entrada; null si no hay dato.",
          },
          fragile: {
            type: "boolean",
            description: "Sitio frágil: ubicación aproximada y sin enlaces a las fuentes.",
          },
          inProtectedArea: { type: "boolean" },
          privateProperty: { type: "boolean" },
          photos: {
            type: "array",
            items: ref("Photo"),
            description: "En orden de galería; la primera es la portada.",
          },
          sources: { type: "array", items: ref("Source") },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "Última vez que las fuentes confirmaron el sitio.",
          },
        },
      },
      PageMeta: {
        type: "object",
        required: ["total", "page", "pageSize", "totalPages"],
        properties: {
          total: { type: "integer", description: "Sitios que cumplen los filtros." },
          page: { type: "integer" },
          pageSize: { type: "integer" },
          totalPages: { type: "integer", description: "0 si no hay resultados." },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", enum: API_ERROR_CODES },
              message: { type: "string", description: "Explicación en español." },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: errorResponse(
        "Parámetro inválido o slug inexistente.",
        "bad_request",
        'tipo: "volcan" no existe; consulta /api/v1/catalogs.',
      ),
      NotFound: errorResponse(
        "El sitio no existe o fue retirado.",
        "not_found",
        'No existe un sitio con el slug "no-existe".',
      ),
      TooManyRequests: {
        ...errorResponse(
          `Más de ${API_RATE_LIMIT.limit} peticiones por minuto desde la misma IP.`,
          "rate_limited",
          "Demasiadas peticiones. Intenta de nuevo en 23 s.",
        ),
        headers: {
          "Retry-After": {
            description: "Segundos que faltan para poder volver a pedir.",
            schema: { type: "integer", minimum: 1 },
          },
        },
      },
      InternalError: errorResponse(
        "Error del servidor.",
        "internal_error",
        "No se pudieron cargar los sitios.",
      ),
    },
  },
};
