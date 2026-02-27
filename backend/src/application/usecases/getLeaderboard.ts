import type { LeaderboardEntry } from "../../domain/entities/bubble.js";
import type { BubbleRepository } from "../../infrastructure/repositories/bubbleRepository.js";

export class GetLeaderboardUseCase {
  constructor(private readonly repo: BubbleRepository) {}

  async execute(limit = 10): Promise<LeaderboardEntry[]> {
    return this.repo.getLeaderboard(limit);
  }
}
