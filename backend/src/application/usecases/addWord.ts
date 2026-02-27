import { normalizeWord } from "../../domain/services/bubbleRules.js";
import type { Broadcaster } from "../../infrastructure/realtime/broadcaster.js";
import type { BubbleRepository } from "../../infrastructure/repositories/bubbleRepository.js";

export class AddWordUseCase {
  constructor(
    private readonly repo: BubbleRepository,
    private readonly broadcaster: Broadcaster
  ) {}

  async execute(rawWord: string): Promise<void> {
    const word = normalizeWord(rawWord);
    await this.repo.addWord(word);

    const [state, leaderboard] = await Promise.all([
      this.repo.getAll(),
      this.repo.getLeaderboard(),
    ]);

    await Promise.all([
      this.broadcaster.broadcastState(state),
      this.broadcaster.broadcastLeaderboard(leaderboard),
    ]);
  }
}
