import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMunicipality } from "@/modules/catalogs/service";
import { placeExists } from "@/modules/places/service";
import { proxy } from "./proxy";

vi.mock("@/modules/catalogs/service", () => ({ getMunicipality: vi.fn() }));
vi.mock("@/modules/places/service", () => ({ placeExists: vi.fn() }));

const request = (path: string, headers?: HeadersInit, method = "GET") =>
  new NextRequest(`https://example.com${path}`, { headers, method });

/** Where a response sends the visitor without changing the address, if anywhere. */
const rewrittenTo = (response: Response) => response.headers.get("x-middleware-rewrite");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("proxy", () => {
  it("serves the 404 page for a hidden or unknown site (HU-69)", async () => {
    vi.mocked(placeExists).mockResolvedValue(false);

    const response = await proxy(request("/sitio/oculto"));

    expect(rewrittenTo(response)).toContain("/sitio-no-encontrado");
  });

  it("lets a published site through", async () => {
    vi.mocked(placeExists).mockResolvedValue(true);

    const response = await proxy(request("/sitio/embalse-de-calima"));

    expect(rewrittenTo(response)).toBeNull();
  });

  it("lets a report through from a page opened before the site was hidden (HU-86)", async () => {
    vi.mocked(placeExists).mockResolvedValue(false);

    const response = await proxy(request("/sitio/oculto", { "next-action": "abc" }, "POST"));

    expect(rewrittenTo(response)).toBeNull();
    expect(placeExists).not.toHaveBeenCalled();
  });
});
