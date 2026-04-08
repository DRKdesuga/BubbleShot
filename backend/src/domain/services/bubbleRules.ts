import { DomainError } from "../errors/domainError.js";

export const BUBBLE_RULES = {
  initialHp: 5,
  hpStepOnAdd: 5,
  hpStepOnHit: 1,
  maxHp: 25,
  maxWordLength: 30,
} as const;

const WORD_REGEX = /^[a-zA-ZÀ-ÿ-]+$/;

export function normalizeWord(raw: string): string {
  const normalized = raw.trim().toLowerCase();

  if (!normalized) {
    throw new DomainError("INVALID_WORD", "Word cannot be empty.");
  }

  if (normalized.length > BUBBLE_RULES.maxWordLength) {
    throw new DomainError(
      "INVALID_WORD",
      `Word must be at most ${BUBBLE_RULES.maxWordLength} characters.`
    );
  }

  if (!WORD_REGEX.test(normalized)) {
    throw new DomainError(
      "INVALID_WORD",
      "Word can only contain letters and hyphens."
    );
  }

  return normalized;
}

export function hpAfterAdd(previousHp: number | null): number {
  if (previousHp === null) {
    return BUBBLE_RULES.initialHp;
  }

  return Math.min(previousHp + BUBBLE_RULES.hpStepOnAdd, BUBBLE_RULES.maxHp);
}

export function hpAfterHit(previousHp: number): number {
  if (previousHp <= 0) {
    throw new DomainError("BUBBLE_ALREADY_POPPED", "Bubble is already popped.");
  }

  return previousHp - BUBBLE_RULES.hpStepOnHit;
}

export function isPopped(hp: number): boolean {
  return hp <= 0;
}
