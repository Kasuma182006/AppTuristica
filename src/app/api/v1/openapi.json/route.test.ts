import { describe, expect, it } from "vitest";
import { openApiDocument } from "@/lib/openapi";
import { GET } from "./route";

describe("GET /api/v1/openapi.json", () => {
  it("returns the OpenAPI document with CORS headers", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.json()).toEqual(openApiDocument);
  });
});
