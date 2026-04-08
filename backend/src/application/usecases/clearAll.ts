import type { Broadcaster } from "../../infrastructure/realtime/broadcaster.js";
import type { BubbleRepository } from "../../infrastructure/repositories/bubbleRepository.js";

export class ClearAllUseCase {
  constructor(
    private readonly repo: BubbleRepository,
    private readonly broadcaster: Broadcaster
  ) {}

  async execute(): Promise<void> {
    await this.repo.clearAll();

    await Promise.all([
      this.broadcaster.broadcastState([]),
      this.broadcaster.broadcastLeaderboard([]),
    ]);
  }
}
