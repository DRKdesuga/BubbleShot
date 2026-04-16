import type { Bubble, LeaderboardEntry } from "../../domain/entities/bubble.js";
import { hpAfterAdd, hpAfterHit, isPopped } from "../../domain/services/bubbleRules.js";
import type { BubbleRepository, HitWordResult } from "./bubbleRepository.js";
import { DatabaseConnectionManager } from "../db/connectionManager.js";

const ENSURE_BUBBLES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS bubbles (
    word VARCHAR(255) PRIMARY KEY,
    hp INT NOT NULL
  )
`;

export class BubbleRepositoryPostgres implements BubbleRepository {
  constructor(private readonly db: DatabaseConnectionManager) {
    this.db.registerInitializer(async (pool) => {
      await pool.query(ENSURE_BUBBLES_TABLE_SQL);
    });
  }

  async initialize(): Promise<void> {
    await this.db.getPool();
  }

  async getAll(): Promise<Bubble[]> {
    const res = await this.db.query(`
      SELECT word, hp FROM bubbles 
      ORDER BY hp DESC, word ASC
    `);
    return res.rows;
  }

  async addWord(word: string): Promise<Bubble> {
    const res = await this.db.query(`SELECT hp FROM bubbles WHERE word = $1`, [word]);
    const existingHp = res.rows.length > 0 ? res.rows[0].hp : null;
    
    const nextHp = hpAfterAdd(existingHp);

    await this.db.query(`
      INSERT INTO bubbles (word, hp) 
      VALUES ($1, $2) 
      ON CONFLICT (word) DO UPDATE SET hp = EXCLUDED.hp
    `, [word, nextHp]);

    return { word, hp: nextHp };
  }

  async hitWord(word: string): Promise<HitWordResult> {
    return this.db.transaction(async (client) => {
      const res = await client.query(`SELECT hp FROM bubbles WHERE word = $1 FOR UPDATE`, [word]);
      if (res.rows.length === 0) {
        return { popped: false, bubble: null };
      }

      const existingHp = res.rows[0].hp;
      const nextHp = hpAfterHit(existingHp);

      if (isPopped(nextHp)) {
        await client.query(`DELETE FROM bubbles WHERE word = $1`, [word]);
        return { popped: true, bubble: null };
      }

      await client.query(`UPDATE bubbles SET hp = $2 WHERE word = $1`, [word, nextHp]);
      return { popped: false, bubble: { word, hp: nextHp } };
    });
  }

  async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const res = await this.db.query(`
      SELECT word, hp FROM bubbles 
      ORDER BY hp DESC, word ASC 
      LIMIT $1
    `, [limit]);
    return res.rows;
  }

  async clearAll(): Promise<void> {
    await this.db.query(`DELETE FROM bubbles`);
  }
}
