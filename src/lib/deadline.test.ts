import { afterEach, describe, expect, it, vi } from "vitest";
import { DeadlineError, withDeadline } from "./deadline";

describe("withDeadline", () => {
  afterEach(() => vi.useRealTimers());

  it("returns the result when it arrives in time", async () => {
    await expect(withDeadline(Promise.resolve(42), 1000, "datos")).resolves.toBe(42);
  });

  it("passes the promise's own error through", async () => {
    await expect(withDeadline(Promise.reject(new Error("caída")), 1000, "datos")).rejects.toThrow(
      "caída",
    );
  });

  it("fails with a DeadlineError when the promise takes too long", async () => {
    vi.useFakeTimers();
    const slow = new Promise<number>(() => {});
    const result = withDeadline(slow, 10_000, "los resultados");
    vi.advanceTimersByTime(10_000);

    await expect(result).rejects.toBeInstanceOf(DeadlineError);
    await expect(result).rejects.toThrow("los resultados: no respondió en 10000 ms");
  });
});
