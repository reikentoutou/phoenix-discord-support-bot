import { describe, expect, it } from "vitest";
import { detectLanguage } from "../src/language.js";

describe("detectLanguage", () => {
  it("detects Chinese", () => {
    expect(detectLanguage("现在有空位吗？")).toBe("zh");
  });

  it("detects Japanese", () => {
    expect(detectLanguage("営業時間を教えてください")).toBe("ja");
  });

  it("detects English", () => {
    expect(detectLanguage("Are you open now?")).toBe("en");
  });
});
