import type { Bubble, LeaderboardEntry } from "../../domain/entities/bubble.js";
import { hpAfterAdd, hpAfterHit, isPopped } from "../../domain/services/bubbleRules.js";
import type { BubbleRepository, HitWordResult } from "./bubbleRepository.js";

function sortByScoreThenWord(items: Bubble[]): Bubble[] {
  return [...items].sort((a, b) => {
    if (b.hp !== a.hp) {
      return b.hp - a.hp;
    }
    return a.word.localeCompare(b.word);
  });
}

export class InMemoryBubbleRepository implements BubbleRepository {
  private readonly bubbles = new Map<string, Bubble>();

  async getAll(): Promise<Bubble[]> {
    return sortByScoreThenWord([...this.bubbles.values()]);
  }

  async addWord(word: string): Promise<Bubble> {
    const existing = this.bubbles.get(word) ?? null;
    const next: Bubble = {
      word,
      hp: hpAfterAdd(existing?.hp ?? null),
    };

    this.bubbles.set(word, next);
    return next;
  }

  async hitWord(word: string): Promise<HitWordResult> {
    const existing = this.bubbles.get(word);
    if (!existing) {
      return { popped: false, bubble: null };
    }

    const nextHp = hpAfterHit(existing.hp);
    if (isPopped(nextHp)) {
      this.bubbles.delete(word);
      return { popped: true, bubble: null };
    }

    const next: Bubble = { word, hp: nextHp };
    this.bubbles.set(word, next);

    return { popped: false, bubble: next };
  }

  async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const ordered = sortByScoreThenWord([...this.bubbles.values()]);
    return ordered.slice(0, limit);
  }

  async clearAll(): Promise<void> {
    this.bubbles.clear();
  }
}
