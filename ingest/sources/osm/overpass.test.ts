import { describe, expect, it } from "vitest";
import {
  DEFAULT_OVERPASS_ENDPOINTS,
  parseOverpassEndpoints,
  parseOverpassResponse,
  queryOverpass,
  type OverpassOptions,
} from "./overpass";

const A = "https://a.example/api/interpreter";
const B = "https://b.example/api/interpreter";

const waterfall = { type: "node", id: 1, lat: 3.5, lon: -76.5, tags: { natural: "waterfall" } };
const okBody = { elements: [waterfall] };

type Reply = Response | Error;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Fake fetch answering with the given replies in order, recording the endpoints called. */
function fakeOverpass(replies: Reply[]) {
  const calls: string[] = [];
  const sleeps: number[] = [];
  const fetch = async (input: string | URL | Request) => {
    calls.push(String(input));
    const reply = replies.shift();
    if (reply === undefined) throw new Error("unexpected request");
    if (reply instanceof Error) throw reply;
    return reply;
  };
  const options: OverpassOptions = {
    endpoints: [A, B],
    retryDelaysMs: [10, 30],
    requestTimeoutMs: 1000,
    fetch: fetch as typeof globalThis.fetch,
    sleep: async (ms) => void sleeps.push(ms),
    log: () => {},
  };
  return { calls, sleeps, options };
}

describe("parseOverpassEndpoints", () => {
  it("uses the defaults when unset or blank", () => {
    expect(parseOverpassEndpoints(undefined)).toEqual(DEFAULT_OVERPASS_ENDPOINTS);
    expect(parseOverpassEndpoints("  ")).toEqual(DEFAULT_OVERPASS_ENDPOINTS);
  });

  it("splits a comma-separated list, keeping the order", () => {
    expect(parseOverpassEndpoints(` ${B} , ${A},`)).toEqual([B, A]);
  });

  it("rejects values that are not http(s) URLs", () => {
    expect(() => parseOverpassEndpoints("not-a-url")).toThrow();
    expect(() => parseOverpassEndpoints("ftp://a.example")).toThrow();
  });
});

describe("parseOverpassResponse", () => {
  it("uses node coordinates and way/relation centers as the point", () => {
    expect(
      parseOverpassResponse({
        elements: [
          waterfall,
          { type: "way", id: 2, center: { lat: 4, lon: -76 }, tags: { waterway: "river" } },
          { type: "relation", id: 3, tags: { boundary: "protected_area" } },
        ],
      }),
    ).toEqual([
      { type: "node", id: 1, tags: { natural: "waterfall" }, point: { lat: 3.5, lon: -76.5 } },
      { type: "way", id: 2, tags: { waterway: "river" }, point: { lat: 4, lon: -76 } },
      { type: "relation", id: 3, tags: { boundary: "protected_area" }, point: null },
    ]);
  });

  it("defaults missing tags to an empty object", () => {
    const [element] = parseOverpassResponse({
      elements: [{ type: "node", id: 9, lat: 1, lon: 2 }],
    });
    expect(element?.tags).toEqual({});
  });

  it("rejects responses whose remark reports an error (incomplete results)", () => {
    expect(() =>
      parseOverpassResponse({
        elements: [waterfall],
        remark: 'runtime error: Query timed out in "query" at line 3 after 300 seconds.',
      }),
    ).toThrow("Overpass query failed");
  });

  it("rejects malformed elements", () => {
    expect(() => parseOverpassResponse({ elements: [{ type: "node", id: 1 }] })).toThrow();
    expect(() => parseOverpassResponse({ elements: [{ ...waterfall, lat: 120 }] })).toThrow();
    expect(() => parseOverpassResponse("<html>")).toThrow();
  });
});

describe("queryOverpass", () => {
  it("returns the elements of the first successful response", async () => {
    const { calls, sleeps, options } = fakeOverpass([json(okBody)]);
    const elements = await queryOverpass("q", options);
    expect(elements).toHaveLength(1);
    expect(calls).toEqual([A]);
    expect(sleeps).toEqual([]);
  });

  it("retries the same endpoint on network errors, 429 and 5xx, waiting each delay", async () => {
    const { calls, sleeps, options } = fakeOverpass([
      new TypeError("fetch failed"),
      json({}, 504),
      json(okBody),
    ]);
    await queryOverpass("q", options);
    expect(calls).toEqual([A, A, A]);
    expect(sleeps).toEqual([10, 30]);
  });

  it("retries invalid or incomplete responses", async () => {
    const { calls, options } = fakeOverpass([
      new Response("<html>busy</html>", { status: 200 }),
      json({ elements: [], remark: "runtime error: out of memory" }),
      json(okBody),
    ]);
    await expect(queryOverpass("q", options)).resolves.toHaveLength(1);
    expect(calls).toEqual([A, A, A]);
  });

  it("moves to the next endpoint once the retries run out", async () => {
    const { calls, sleeps, options } = fakeOverpass([
      json({}, 429),
      json({}, 503),
      json({}, 502),
      json(okBody),
    ]);
    await queryOverpass("q", options);
    expect(calls).toEqual([A, A, A, B]);
    expect(sleeps).toEqual([10, 30]);
  });

  it("skips a blocked endpoint (403/406) without retrying it", async () => {
    const { calls, sleeps, options } = fakeOverpass([json({}, 406), json(okBody)]);
    await queryOverpass("q", options);
    expect(calls).toEqual([A, B]);
    expect(sleeps).toEqual([]);
  });

  it("fails right away when the query itself is rejected", async () => {
    const { calls, options } = fakeOverpass([new Response("parse error", { status: 400 })]);
    await expect(queryOverpass("q", options)).rejects.toThrow(
      "Overpass rejected the query (HTTP 400): parse error",
    );
    expect(calls).toEqual([A]);
  });

  it("fails listing each endpoint's last error when all of them fail", async () => {
    const { options } = fakeOverpass([
      json({}, 403),
      new TypeError("fetch failed"),
      new TypeError("fetch failed"),
      json({}, 500),
    ]);
    await expect(queryOverpass("q", options)).rejects.toThrow(
      `Every Overpass endpoint failed:\n${A}: HTTP 403 (blocked)\n${B}: HTTP 500`,
    );
  });

  it("sends the query as a form with an identifying User-Agent", async () => {
    let request: RequestInit | undefined;
    const options: OverpassOptions = {
      endpoints: [A],
      requestTimeoutMs: 1000,
      fetch: (async (_input: string | URL | Request, init?: RequestInit) => {
        request = init;
        return json(okBody);
      }) as typeof fetch,
    };
    await queryOverpass("[out:json];node(1);out;", options);
    expect(request?.method).toBe("POST");
    expect(new Headers(request?.headers).get("User-Agent")).toMatch(/^buscador-turistico /);
    expect(String(request?.body)).toBe(
      new URLSearchParams({ data: "[out:json];node(1);out;" }).toString(),
    );
  });
});
