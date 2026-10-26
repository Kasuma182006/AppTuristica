import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_ERROR_CODES } from "@/lib/api-response";
import { FILTER_PARAMS, PAGING_PARAMS, parsePlaceQuery } from "@/modules/places/filters";
import {
  DIFFICULTY_SLUGS,
  ORIGIN_SLUGS,
  PAGE_SIZE,
  SORT_SLUGS,
  type PlaceDetail,
  type PlaceSummary,
} from "@/modules/places/types";
import { DATA_LICENSE, openApiDocument, type Operation, type Schema } from "./openapi";

const apiDir = join(process.cwd(), "src/app/api/v1");

/** API routes that hold data, as OpenAPI paths (e.g. "/places/{slug}"). */
function dataRoutes(dir = apiDir, prefix = ""): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) return [];
    const segment = entry.replace(/^\[(.+)\]$/, "{$1}");
    const path = `${prefix}/${segment}`;
    const own = readdirSync(full).includes("route.ts") ? [path] : [];
    return [...own, ...dataRoutes(full, path)];
  });
}

const operations = Object.entries(openApiDocument.paths).map(
  ([path, item]) => [path, item.get] as [string, Operation],
);
const listPlaces = openApiDocument.paths["/places"]?.get;
const schemas = openApiDocument.components.schemas;

function resolve(schema: Schema | undefined): Schema | undefined {
  const name = schema?.$ref?.split("/").pop();
  return name ? schemas[name] : schema;
}

function exampleOf(path: string): unknown {
  const response = openApiDocument.paths[path]?.get.responses["200"];
  return response && "content" in response
    ? response.content?.["application/json"].example
    : undefined;
}

describe("openApiDocument", () => {
  it("documents every API route except the document itself", () => {
    const routes = dataRoutes().filter((path) => path !== "/openapi.json");

    expect(Object.keys(openApiDocument.paths).sort()).toEqual(routes.sort());
  });

  it("declares the ODbL license", () => {
    expect(openApiDocument.info.license).toEqual(DATA_LICENSE);
    expect(DATA_LICENSE.identifier).toBe("ODbL-1.0");
  });

  it("documents exactly the query parameters /places accepts", () => {
    const names = listPlaces?.parameters?.map((parameter) => parameter.name);

    expect(names).toEqual([...FILTER_PARAMS, ...PAGING_PARAMS]);
  });

  it("lists the same values and defaults as the code", () => {
    const schemaOf = (name: string) =>
      listPlaces?.parameters?.find((parameter) => parameter.name === name)?.schema;

    expect(schemaOf("dificultad")?.items?.enum).toEqual(Object.keys(DIFFICULTY_SLUGS));
    expect(schemaOf("origen")?.items?.enum).toEqual(Object.keys(ORIGIN_SLUGS));
    expect(schemaOf("orden")).toMatchObject({ enum: SORT_SLUGS, default: SORT_SLUGS[0] });
    expect(schemaOf("por-pagina")).toMatchObject({
      maximum: PAGE_SIZE.max,
      default: PAGE_SIZE.default,
    });
    expect(resolve(schemas.Error?.properties?.error)?.properties?.code?.enum).toEqual(
      API_ERROR_CODES,
    );
  });

  it("gives /places parameter examples the API accepts", () => {
    for (const parameter of listPlaces?.parameters ?? []) {
      const query = new URLSearchParams({ [parameter.name]: parameter.example ?? "" });
      expect(parsePlaceQuery(query), parameter.name).toMatchObject({ ok: true });
    }
  });

  it("has a 200 response with an example for every operation", () => {
    for (const [path] of operations) expect(exampleOf(path), path).toBeDefined();
  });

  it("documents every field of the examples, and requires them", () => {
    const cases: [string, object][] = [
      ["PlaceSummary", (exampleOf("/places") as { data: PlaceSummary[] }).data[0] ?? {}],
      ["PlaceDetail", (exampleOf("/places/{slug}") as { data: PlaceDetail }).data],
    ];
    for (const [name, example] of cases) {
      const fields = Object.keys(example).sort();
      expect(Object.keys(schemas[name]?.properties ?? {}).sort(), name).toEqual(fields);
      expect([...(schemas[name]?.required ?? [])].sort(), name).toEqual(fields);
    }
  });

  it("only references schemas and responses that exist", () => {
    const refs = JSON.stringify(openApiDocument).match(/"#\/components\/[a-z]+\/[A-Za-z]+"/g) ?? [];
    for (const raw of refs) {
      const [, , kind, name] = JSON.parse(raw).split("/") as [string, string, string, string];
      const components = openApiDocument.components as Record<string, Record<string, unknown>>;
      expect(components[kind]?.[name], raw).toBeDefined();
    }
  });

  it("documents the rate limit response with Retry-After", () => {
    expect(openApiDocument.components.responses.TooManyRequests?.headers).toHaveProperty(
      "Retry-After",
    );
    for (const [path, operation] of operations) {
      expect(operation.responses, path).toHaveProperty("429");
    }
  });
});
