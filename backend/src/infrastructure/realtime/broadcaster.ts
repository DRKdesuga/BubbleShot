import type { Bubble, LeaderboardEntry } from "../../domain/entities/bubble.js";

export interface Broadcaster {
  broadcastState(state: Bubble[]): Promise<void>;
  broadcastLeaderboard(leaderboard: LeaderboardEntry[]): Promise<void>;
}
