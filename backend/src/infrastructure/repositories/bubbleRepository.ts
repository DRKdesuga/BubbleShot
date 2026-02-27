import type { Bubble, LeaderboardEntry } from "../../domain/entities/bubble.js";

export interface HitWordResult {
  popped: boolean;
  bubble: Bubble | null;
}

export interface BubbleRepository {
  getAll(): Promise<Bubble[]>;
  addWord(word: string): Promise<Bubble>;
  hitWord(word: string): Promise<HitWordResult>;
  getLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;
  clearAll(): Promise<void>;
}
