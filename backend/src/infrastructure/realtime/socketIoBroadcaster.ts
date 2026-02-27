import type { Server } from "socket.io";
import type { Bubble, LeaderboardEntry } from "../../domain/entities/bubble.js";
import type { Broadcaster } from "./broadcaster.js";

export class SocketIoBroadcaster implements Broadcaster {
  constructor(private readonly io: Server) {}

  async broadcastState(state: Bubble[]): Promise<void> {
    this.io.emit("state", state);
  }

  async broadcastLeaderboard(leaderboard: LeaderboardEntry[]): Promise<void> {
    this.io.emit("leaderboard", leaderboard);
  }
}
