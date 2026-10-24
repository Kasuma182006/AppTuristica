import { describe, expect, it } from "vitest";
import type { RestrictedSite } from "../pipeline/types";
import { attachWikidata, fetchWikidataItems, parseEntities, summarizeWikidata } from "./wikidata";

const sonso = {
  id: "Q3216251",
  descriptions: { es: { language: "es", value: "humedal en Colombia" } },
  sitelinks: {
    eswiki: {
      site: "eswiki",
      title: "Laguna de Sonso",
      url: "https://es.wikipedia.org/wiki/Laguna_de_Sonso",
    },
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("parseEntities", () => {
  it("takes the Spanish description and Wikipedia article", () => {
    expect(parseEntities({ entities: { Q3216251: sonso } }).get("Q3216251")).toEqual({
      id: "Q3216251",
      description: "humedal en Colombia",
      wikipediaUrl: "https://es.wikipedia.org/wiki/Laguna_de_Sonso",
    });
  });

  it("leaves out missing items and keeps items without Spanish data", () => {
    const items = parseEntities({
      entities: {
        Q1: { id: "Q1", missing: "" },
        Q2: { id: "Q2", descriptions: {}, sitelinks: {} },
      },
    });
    expect([...items.keys()]).toEqual(["Q2"]);
    expect(items.get("Q2")).toEqual({ id: "Q2", description: null, wikipediaUrl: null });
  });

  it("indexes redirected items by the id that was requested", () => {
    const items = parseEntities({
      entities: { Q9: { ...sonso, id: "Q9", redirects: { from: "Q5", to: "Q9" } } },
    });
    expect(items.get("Q5")?.id).toBe("Q5");
  });

  it("rejects API errors (e.g. maxlag) and malformed bodies", () => {
    expect(() =>
      parseEntities({ error: { code: "maxlag", info: "Waiting for a database server" } }),
    ).toThrow("Wikidata API error: maxlag");
    expect(() => parseEntities("<html>")).toThrow();
  });
});

describe("fetchWikidataItems", () => {
  function fakeApi(replies: (Response | Error)[]) {
    const urls: URL[] = [];
    const sleeps: number[] = [];
    const fetch = async (input: string | URL | Request) => {
      urls.push(new URL(String(input)));
      const reply = replies.shift();
      if (reply === undefined) return json({ entities: {} });
      if (reply instanceof Error) throw reply;
      return reply;
    };
    return {
      urls,
      sleeps,
      options: {
        fetch: fetch as typeof globalThis.fetch,
        sleep: async (ms: number) => void sleeps.push(ms),
        retryDelaysMs: [10, 20],
        log: () => {},
      },
    };
  }

  it("asks only for Spanish descriptions and es.wikipedia links, without repeating ids", async () => {
    const { urls, options } = fakeApi([json({ entities: { Q3216251: sonso } })]);
    const items = await fetchWikidataItems(["Q3216251", "Q3216251"], options);
    expect(items.size).toBe(1);
    const params = urls[0]?.searchParams;
    expect(params?.get("action")).toBe("wbgetentities");
    expect(params?.get("ids")).toBe("Q3216251");
    expect(params?.get("languages")).toBe("es");
    expect(params?.get("sitefilter")).toBe("eswiki");
  });

  it("sends at most 50 ids per request", async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `Q${i + 1}`);
    const { urls, options } = fakeApi([]);
    await fetchWikidataItems(ids, options);
    expect(urls.map((u) => u.searchParams.get("ids")?.split("|").length)).toEqual([50, 50, 20]);
  });

  it("makes no request without ids", async () => {
    const { urls, options } = fakeApi([]);
    expect((await fetchWikidataItems([], options)).size).toBe(0);
    expect(urls).toEqual([]);
  });

  it("retries network errors, 429, 5xx and maxlag", async () => {
    const { urls, sleeps, options } = fakeApi([
      new TypeError("fetch failed"),
      json({ error: { code: "maxlag" } }),
      json({ entities: { Q3216251: sonso } }),
    ]);
    expect((await fetchWikidataItems(["Q3216251"], options)).size).toBe(1);
    expect(urls).toHaveLength(3);
    expect(sleeps).toEqual([10, 20]);
  });

  it("fails when the retries run out, or right away on a 4xx", async () => {
    const exhausted = fakeApi([json({}, 503), json({}, 503), json({}, 503)]);
    await expect(fetchWikidataItems(["Q1"], exhausted.options)).rejects.toThrow(
      "Wikidata request failed: HTTP 503",
    );
    const rejected = fakeApi([json({}, 400)]);
    await expect(fetchWikidataItems(["Q1"], rejected.options)).rejects.toThrow("HTTP 400");
    expect(rejected.urls).toHaveLength(1);
  });
});

describe("attachWikidata", () => {
  const site = (wikidataId: string | null) =>
    ({ name: "Laguna de Sonso", wikidataId }) as RestrictedSite;
  const items = parseEntities({ entities: { Q3216251: sonso } });

  it("adds the item's data, or null when there is no item or it is missing", () => {
    const enriched = attachWikidata([site("Q3216251"), site(null), site("Q404")], items);
    expect(enriched.map((s) => s.wikidata?.description ?? null)).toEqual([
      "humedal en Colombia",
      null,
      null,
    ]);
    expect(summarizeWikidata(enriched)).toBe(
      "1 sites with a Wikidata item (1 with Spanish description, 1 with Spanish Wikipedia)",
    );
  });
});
