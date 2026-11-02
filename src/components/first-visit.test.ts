import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeFirstVisitNotice,
  FIRST_VISIT_SCRIPT,
  hideFirstVisitNoticeIfClosed,
} from "./first-visit";

const dataset: Record<string, string> = {};
const stored = new Map<string, string>();

const workingStorage = {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
};

const blockedStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

const runScript = () => new Function(FIRST_VISIT_SCRIPT)();

beforeEach(() => {
  delete dataset.noticeClosed;
  stored.clear();
  vi.stubGlobal("document", { documentElement: { dataset } });
  vi.stubGlobal("localStorage", workingStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the first-visit notice", () => {
  it("shows on a first visit", () => {
    runScript();

    expect(dataset.noticeClosed).toBeUndefined();
  });

  it("goes away when closed", () => {
    closeFirstVisitNotice();

    expect(dataset.noticeClosed).toBe("");
  });

  it("stays away on the next visit once closed", () => {
    closeFirstVisitNotice();
    delete dataset.noticeClosed;

    runScript();

    expect(dataset.noticeClosed).toBe("");
  });

  it("stays away on pages drawn in the browser, where the script does not run", () => {
    hideFirstVisitNoticeIfClosed();
    expect(dataset.noticeClosed).toBeUndefined();

    closeFirstVisitNotice();
    delete dataset.noticeClosed;

    hideFirstVisitNoticeIfClosed();
    expect(dataset.noticeClosed).toBe("");
  });

  it("closes without an error when the browser blocks storage, and shows again", () => {
    vi.stubGlobal("localStorage", blockedStorage);

    expect(closeFirstVisitNotice).not.toThrow();
    expect(dataset.noticeClosed).toBe("");

    delete dataset.noticeClosed;
    expect(runScript).not.toThrow();
    expect(hideFirstVisitNoticeIfClosed).not.toThrow();
    expect(dataset.noticeClosed).toBeUndefined();
  });
});
