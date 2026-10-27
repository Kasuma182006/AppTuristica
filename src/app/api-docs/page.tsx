import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  API_BASE_PATH,
  DATA_LICENSE,
  openApiDocument,
  type Operation,
  type Parameter,
  type ResponseObject,
  type Schema,
} from "@/lib/openapi";
import { API_RATE_LIMIT } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "API abierta",
  description:
    "Documentación de la API pública de solo lectura con los sitios turísticos del Valle del Cauca, bajo licencia ODbL.",
};

const serverUrl = openApiDocument.servers[0]?.url ?? API_BASE_PATH;
const OPENAPI_JSON_PATH = `${API_BASE_PATH}/openapi.json`;

/** Renders `code` spans written in the document's descriptions. */
function richText(text: string): ReactNode[] {
  return text.split(/`([^`]+)`/).map((part, index) =>
    index % 2 === 1 ? (
      <code key={index} className="rounded bg-bg px-1 font-mono text-[0.9em]">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

function anchorId(path: string): string {
  return `endpoint-${path.replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`;
}

/** Accepted values of a parameter, in words. */
function describeValues({ schema, style, explode }: Parameter): string {
  const item = schema.type === "array" ? schema.items : schema;
  const list = style === "form" && explode === false ? "Lista separada por comas. " : "";
  const parts: string[] = [];
  if (item?.enum) parts.push(`Valores: ${item.enum.join(", ")}.`);
  else if (item?.pattern) parts.push("Slug: minúsculas, números y guiones.");
  if (item?.type === "integer") {
    const range = [item.minimum, item.maximum].every((value) => value !== undefined)
      ? `de ${item.minimum} a ${item.maximum}`
      : `desde ${item.minimum ?? 1}`;
    parts.push(`Entero ${range}.`);
  }
  if (schema.default !== undefined) parts.push(`Por defecto: ${schema.default}.`);
  return list + parts.join(" ");
}

function resolveResponse(response: ResponseObject | { $ref: string }): ResponseObject {
  if (!("$ref" in response)) return response;
  const name = response.$ref.split("/").pop() ?? "";
  const resolved = openApiDocument.components.responses[name];
  if (!resolved) throw new Error(`Unknown response ${response.$ref}`);
  return resolved;
}

function CodeBlock({ label, children }: { label: string; children: string }) {
  return (
    <figure className="space-y-1">
      <figcaption className="text-sm font-medium text-muted">{label}</figcaption>
      <pre
        tabIndex={0}
        className="max-h-96 overflow-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs leading-relaxed sm:text-sm"
      >
        <code>{children}</code>
      </pre>
    </figure>
  );
}

function Parameters({ parameters }: { parameters: Parameter[] }) {
  return (
    <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
      {parameters.map((parameter) => (
        <div
          key={parameter.name}
          className="space-y-1 p-3 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4"
        >
          <dt className="font-mono text-sm font-semibold">
            {parameter.name}
            {parameter.in === "path" ? (
              <span className="ml-2 font-sans text-xs font-normal text-muted">en la ruta</span>
            ) : null}
          </dt>
          <dd className="space-y-1 text-sm">
            <p>{richText(parameter.description)}</p>
            <p className="text-muted">{describeValues(parameter)}</p>
            {parameter.example ? (
              <p className="text-muted">
                Ejemplo: <code className="font-mono">{parameter.example}</code>
              </p>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Endpoint({ path, operation }: { path: string; operation: Operation }) {
  const id = anchorId(path);
  const success = resolveResponse(operation.responses["200"] ?? { $ref: "" });
  const example = success.content?.["application/json"].example;

  return (
    <section aria-labelledby={id} className="space-y-4 border-t border-border pt-8">
      <header className="space-y-2">
        <h2 id={id} className="flex flex-wrap items-baseline gap-2 text-xl font-semibold">
          <span className="rounded bg-primary px-2 py-0.5 font-mono text-sm text-on-primary">
            GET
          </span>
          <span className="font-mono break-all">{path}</span>
        </h2>
        <p className="font-medium">{operation.summary}</p>
        <p className="text-muted">{richText(operation.description)}</p>
      </header>

      {operation.parameters?.length ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Parámetros</h3>
          <Parameters parameters={operation.parameters} />
        </div>
      ) : null}

      <CodeBlock label="Ejemplo de petición">
        {`curl "${serverUrl}${operation["x-example-request"]}"`}
      </CodeBlock>
      {example !== undefined ? (
        <CodeBlock label="Respuesta 200">{JSON.stringify(example, null, 2)}</CodeBlock>
      ) : null}

      <div className="space-y-2">
        <h3 className="font-semibold">Respuestas</h3>
        <ul className="space-y-1 text-sm">
          {Object.entries(operation.responses).map(([status, response]) => (
            <li key={status}>
              <span className="font-mono font-semibold">{status}</span>{" "}
              {resolveResponse(response).description}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A field's type in words, e.g. "Photo o null" or "lista de CatalogItem". */
function typeName(property: Schema): string {
  if (property.$ref) return property.$ref.split("/").pop() ?? "";
  if (property.anyOf) return property.anyOf.map(typeName).join(" o ");
  if (property.type === "array")
    return `lista de ${property.items ? typeName(property.items) : ""}`;
  return [property.type].flat().join(" o ");
}

function SchemaFields({ name, schema }: { name: string; schema: Schema }) {
  const id = `esquema-${name.toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="font-mono font-semibold">
        {name}
      </h3>
      {schema.description ? (
        <p className="text-sm text-muted">{richText(schema.description)}</p>
      ) : null}
      <ul className="space-y-1 text-sm">
        {Object.entries(schema.properties ?? {}).map(([field, property]) => {
          const type = typeName(property);
          return (
            <li key={field}>
              <code className="font-mono">{field}</code>{" "}
              <span className="text-muted">({type})</span>
              {property.enum ? (
                <span className="text-muted"> · {property.enum.map(String).join(", ")}</span>
              ) : null}
              {property.description ? <> · {richText(property.description)}</> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function ApiDocsPage() {
  const paths = Object.entries(openApiDocument.paths);
  const { schemas } = openApiDocument.components;

  return (
    <article className="max-w-3xl space-y-10">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">API abierta</h1>
        <p className="text-muted">{richText(openApiDocument.info.description)}</p>
        <dl className="grid gap-3 rounded-lg border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Dirección base</dt>
            <dd className="font-mono break-all">{serverUrl}</dd>
          </div>
          <div>
            <dt className="font-semibold">Autenticación</dt>
            <dd>Ninguna. Solo lectura (GET).</dd>
          </div>
          <div>
            <dt className="font-semibold">Límite</dt>
            <dd>
              {API_RATE_LIMIT.limit} peticiones por minuto por IP; al superarlo, 429 con{" "}
              <code className="font-mono">Retry-After</code>.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Navegadores</dt>
            <dd>CORS abierto a cualquier origen.</dd>
          </div>
        </dl>
        <p>
          <a
            href={OPENAPI_JSON_PATH}
            className="font-medium text-primary underline underline-offset-4"
          >
            Descargar la especificación OpenAPI 3.1 (JSON)
          </a>
        </p>
        <nav aria-label="Endpoints">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
            {paths.map(([path]) => (
              <li key={path}>
                <a
                  href={`#${anchorId(path)}`}
                  className="text-primary underline underline-offset-4"
                >
                  {path}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section
        aria-labelledby="licencia"
        className="space-y-3 rounded-lg border border-border bg-surface p-4"
      >
        <h2 id="licencia" className="text-xl font-semibold">
          Licencia de los datos
        </h2>
        <p>
          Los datos de la API se publican bajo la{" "}
          <a href={DATA_LICENSE.url} className="text-primary underline underline-offset-4">
            {DATA_LICENSE.name}
          </a>
          . Contienen información de ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            className="text-primary underline underline-offset-4"
          >
            OpenStreetMap contributors
          </a>{" "}
          y de Wikidata (CC0).
        </p>
        <p>
          Si los reutilizas, atribuye a OpenStreetMap y comparte las bases de datos derivadas bajo
          ODbL.
        </p>
        <p>
          Las fotos <strong>no</strong> están bajo ODbL: cada una indica su autor y su licencia
          (campos <code className="font-mono">author</code> y{" "}
          <code className="font-mono">license</code>), que debes respetar al reutilizarla.
        </p>
      </section>

      {paths.map(([path, item]) => (
        <Endpoint key={path} path={path} operation={item.get} />
      ))}

      <section aria-labelledby="esquemas" className="space-y-6 border-t border-border pt-8">
        <h2 id="esquemas" className="text-xl font-semibold">
          Campos de las respuestas
        </h2>
        {(
          [
            "PlaceSummary",
            "PlaceDetail",
            "Location",
            "Photo",
            "Source",
            "PageMeta",
            "Error",
          ] as const
        ).map((name) => {
          const schema = schemas[name];
          return schema ? <SchemaFields key={name} name={name} schema={schema} /> : null;
        })}
      </section>
    </article>
  );
}
