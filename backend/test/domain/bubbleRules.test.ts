import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/domain/errors/domainError.js";
import {
  BUBBLE_RULES,
  hpAfterAdd,
  hpAfterHit,
  isPopped,
  normalizeWord,
} from "../../src/domain/services/bubbleRules.js";

describe("bubbleRules", () => {
  it("normalizes valid words", () => {
    expect(normalizeWord("  HeLLo-World  ")).toBe("hello-world");
  });

  it("rejects invalid words", () => {
    expect(() => normalizeWord("hello123")).toThrow(DomainError);
    expect(() => normalizeWord("")).toThrow(DomainError);
  });

  it("increments hp and caps at max", () => {
    expect(hpAfterAdd(null)).toBe(BUBBLE_RULES.initialHp);
    expect(hpAfterAdd(5)).toBe(10);
    expect(hpAfterAdd(24)).toBe(BUBBLE_RULES.maxHp);
  });

  it("decrements hp and reports pop", () => {
    expect(hpAfterHit(5)).toBe(4);
    expect(isPopped(0)).toBe(true);
    expect(isPopped(1)).toBe(false);
  });
});
