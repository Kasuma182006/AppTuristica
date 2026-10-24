import { describe, expect, it } from "vitest";
import { summarizeElements } from ".";

describe("summarizeElements", () => {
  it("counts elements by type and those without a point", () => {
    expect(
      summarizeElements([
        { type: "node", id: 1, tags: {}, point: { lat: 3, lon: -76 } },
        { type: "way", id: 2, tags: {}, point: { lat: 3, lon: -76 } },
        { type: "relation", id: 3, tags: {}, point: null },
      ]),
    ).toBe("3 elements (1 nodes, 1 ways, 1 relations; 1 without a point)");
  });
});
