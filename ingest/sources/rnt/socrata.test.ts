import { describe, expect, it } from "vitest";
import { buildAgenciesWhere, fetchRntAgencies } from "./socrata";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const aviatur = {
  codigo_rnt: "68",
  cod_mun: "76001",
  razon_social_establecimiento: "AVIATUR CALI LA FLORA",
  sub_categoria: "AGENCIA DE VIAJES Y DE TURISMO",
  nit: "860000018",
  num_celular: "6645050",
  correo_establecimiento: "ventas@aviatur.com",
};

/** A fake API answering the count query with `total` and pages with `rows`. */
function fakeApi(total: number, rows: unknown[], requests: URL[] = []): typeof fetch {
  return (input) => {
    const url = new URL(String(input));
    requests.push(url);
    if (url.searchParams.get("$select")?.startsWith("count")) {
      return Promise.resolve(json([{ total: String(total) }]));
    }
    const offset = Number(url.searchParams.get("$offset"));
    const limit = Number(url.searchParams.get("$limit"));
    return Promise.resolve(json(rows.slice(offset, offset + limit)));
  };
}

const quiet = { sleep: () => Promise.resolve(), log: () => {} };

describe("buildAgenciesWhere", () => {
  it("filters active agencies of the subcategories and departments, quoting text", () => {
    expect(buildAgenciesWhere(["76"], ["AGENCIA DE VIAJES OPERADORAS", "D'ARTE"])).toBe(
      "cod_dpto in(76) AND categoria = 'AGENCIAS DE VIAJES' AND " +
        "sub_categoria in('AGENCIA DE VIAJES OPERADORAS', 'D''ARTE') AND estado_rnt = 'ACTIVO'",
    );
  });
});

describe("fetchRntAgencies", () => {
  it("downloads every page and parses the rows", async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({
      ...aviatur,
      codigo_rnt: String(i + 1),
    }));
    const requests: URL[] = [];
    const download = await fetchRntAgencies("x", {
      fetch: fakeApi(1500, rows, requests),
      ...quiet,
    });
    expect(download.rows).toHaveLength(1500);
    expect(download.invalid).toEqual([]);
    expect(requests.map((r) => r.searchParams.get("$offset"))).toEqual([null, "0", "1000"]);
    expect(requests[1]?.searchParams.get("$order")).toBe("codigo_rnt");
  });

  it("leaves out rows missing a required column, reporting their code", async () => {
    const rows = [aviatur, { codigo_rnt: "99", cod_mun: "76001" }];
    const download = await fetchRntAgencies("x", { fetch: fakeApi(2, rows), ...quiet });
    expect(download.rows.map((r) => r.codigo_rnt)).toEqual(["68"]);
    expect(download.invalid).toEqual(["99"]);
  });

  it("fails when the download has fewer rows than the count, or none", async () => {
    await expect(fetchRntAgencies("x", { fetch: fakeApi(3, [aviatur]), ...quiet })).rejects.toThrow(
      "incomplete: 1 of 3",
    );
    await expect(fetchRntAgencies("x", { fetch: fakeApi(0, []), ...quiet })).rejects.toThrow(
      "no agencies",
    );
  });

  it("retries server errors and fails on a rejected query", async () => {
    let calls = 0;
    const flaky: typeof fetch = (input) => {
      calls++;
      return calls === 1 ? Promise.resolve(json({}, 503)) : fakeApi(1, [aviatur])(input);
    };
    expect((await fetchRntAgencies("x", { fetch: flaky, ...quiet })).rows).toHaveLength(1);

    const rejected: typeof fetch = () => Promise.resolve(json({ message: "bad query" }, 400));
    await expect(fetchRntAgencies("x", { fetch: rejected, ...quiet })).rejects.toThrow("HTTP 400");
  });
});
