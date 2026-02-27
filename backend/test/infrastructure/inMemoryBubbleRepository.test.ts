import { describe, expect, it } from "vitest";
import { InMemoryBubbleRepository } from "../../src/infrastructure/repositories/inMemoryBubbleRepository.js";

describe("InMemoryBubbleRepository", () => {
  it("adds and updates bubbles", async () => {
    const repo = new InMemoryBubbleRepository();

    await repo.addWord("alpha");
    await repo.addWord("beta");
    await repo.addWord("alpha");

    const all = await repo.getAll();
    expect(all).toEqual([
      { word: "alpha", hp: 10 },
      { word: "beta", hp: 5 },
    ]);
  });

  it("hits and pops bubbles", async () => {
    const repo = new InMemoryBubbleRepository();
    await repo.addWord("alpha");

    for (let i = 0; i < 4; i += 1) {
      await repo.hitWord("alpha");
    }

    const result = await repo.hitWord("alpha");
    expect(result.popped).toBe(true);
    expect(result.bubble).toBeNull();
    expect(await repo.getAll()).toEqual([]);
  });

  it("returns leaderboard in score order", async () => {
    const repo = new InMemoryBubbleRepository();
    await repo.addWord("delta");
    await repo.addWord("alpha");
    await repo.addWord("alpha");
    await repo.addWord("beta");

    const top2 = await repo.getLeaderboard(2);
    expect(top2).toEqual([
      { word: "alpha", hp: 10 },
      { word: "beta", hp: 5 },
    ]);
  });
});
