import { describe, expect, it } from "vitest";
import { parseEwkbPoint } from "./geometry";

// Hex values produced by PostGIS for POINT(-76.6111 3.3247).
const LITTLE_ENDIAN_WITH_SRID = "0101000020E61000007AA52C431C2753C0F0164850FC980A40";
const BIG_ENDIAN_WITH_SRID = "0020000001000010e6c053271c432ca57a400a98fc504816f0";
const LITTLE_ENDIAN_NO_SRID = "01010000007AA52C431C2753C0F0164850FC980A40";
const LINESTRING =
  "0102000020E61000000200000000000000000000000000000000000000000000000000F03F000000000000F03F";

describe("parseEwkbPoint", () => {
  it.each([
    ["little-endian EWKB with SRID (Postgres output)", LITTLE_ENDIAN_WITH_SRID],
    ["big-endian EWKB with SRID", BIG_ENDIAN_WITH_SRID],
    ["little-endian WKB without SRID", LITTLE_ENDIAN_NO_SRID],
  ])("parses %s", (_label, hex) => {
    expect(parseEwkbPoint(hex)).toEqual({ lng: -76.6111, lat: 3.3247 });
  });

  it("rejects other geometry types", () => {
    expect(() => parseEwkbPoint(LINESTRING)).toThrow(/Expected an EWKB point/);
  });

  it("rejects truncated input", () => {
    expect(() => parseEwkbPoint(LITTLE_ENDIAN_WITH_SRID.slice(0, 30))).toThrow(/too short/);
    expect(() => parseEwkbPoint("")).toThrow(/too short/);
  });
});
