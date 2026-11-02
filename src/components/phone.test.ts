import { describe, expect, it } from "vitest";
import { formatPhone, phoneHref } from "./phone";

describe("formatPhone", () => {
  it("groups mobile and landline numbers 3-3-4", () => {
    expect(formatPhone("3001234567")).toBe("300 123 4567");
    expect(formatPhone("6023456789")).toBe("602 345 6789");
  });

  it("leaves other formats alone", () => {
    expect(formatPhone("+5726012345")).toBe("+5726012345");
  });
});

describe("phoneHref", () => {
  it("adds Colombia's code to national numbers", () => {
    expect(phoneHref("3001234567")).toBe("tel:+573001234567");
  });

  it("keeps numbers that already have one", () => {
    expect(phoneHref("+5726012345")).toBe("tel:+5726012345");
  });
});
