import { Pool, PoolConfig } from "pg";

export class DatabaseConnectionManager {
  private pool: Pool | null = null;
  public currentHost: string | null = null;

  private createPoolConfig(host: string, port: string): PoolConfig {
    return {
      host,
      port: Number(port),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionTimeoutMillis: 3000, // Fail quickly to allow retry/failover
    };
  }

  private extractErrorMessage(error: any): string {
    let msg = error?.message || "";
    if (error?.errors && Array.isArray(error.errors)) {
      msg += " " + error.errors.map((e: any) => e.message + " " + e.code).join(" ");
    }
    if (error?.code) {
      msg += " " + error.code;
    }
    return msg.trim() || String(error);
  }

  public async getPool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    const primaryHost = process.env.DB_HOST_PRIMARY || "localhost";
    const standbyHost = process.env.DB_HOST_STANDBY || "localhost";

    const primaryPort = process.env.DB_PORT_PRIMARY || process.env.DB_PORT || "5432";
    const standbyPort = process.env.DB_PORT_STANDBY || process.env.DB_PORT || "5432";

    try {
      console.log(`[DB] Attempting connection to Primary DB at ${primaryHost}:${primaryPort}`);
      const primaryPool = new Pool(this.createPoolConfig(primaryHost, primaryPort));
      
      primaryPool.on('error', (err) => {
        console.warn(`[DB] Idle Primary client error: ${this.extractErrorMessage(err)}. Pool will failover on next query.`);
      });

      await primaryPool.query("SELECT 1"); // Verify connection
      
      this.pool = primaryPool;
      this.currentHost = primaryHost;
      console.log(`[DB] Successfully connected to Primary DB.`);
      return this.pool;
    } catch (error) {
      console.warn(`[DB] Failed to connect to Primary DB. Error: ${this.extractErrorMessage(error)}`);
      console.log(`[DB] Falling back to Standby DB at ${standbyHost}:${standbyPort}...`);

      try {
        const standbyPool = new Pool(this.createPoolConfig(standbyHost, standbyPort));
        
        standbyPool.on('error', (err) => {
          console.warn(`[DB] Idle Standby client error: ${this.extractErrorMessage(err)}. Pool will failover on next query.`);
        });

        await standbyPool.query("SELECT 1"); // Verify connection

        this.pool = standbyPool;
        this.currentHost = standbyHost;
        console.log(`[DB] Successfully connected to Standby DB.`);
        return this.pool;
      } catch (standbyError) {
        console.error(`[DB] Failed to connect to Standby DB as well. Error: ${this.extractErrorMessage(standbyError)}`);
        throw new Error("Database connection failed for both primary and standby.");
      }
    }
  }

  private isErrorConnectionLost(error: any): boolean {
    const msg = this.extractErrorMessage(error);
    return ["aborted", "terminating connection", "write EPIPE", "read ECONNRESET", "Connection terminated", "read ECONNREFUSED", "connect ECONNREFUSED", "ECONNREFUSED"].some(p => msg.includes(p));
  }

  public async query(text: string, params?: any[]) {
    const activePool = await this.getPool();
    try {
      return await activePool.query(text, params);
    } catch (error) {
      if (this.isErrorConnectionLost(error)) {
        console.warn(`[DB] Connection lost. Unsetting active pool to trigger failover connection search.`);
        this.pool?.end().catch(() => {});
        this.pool = null;

        console.log(`[DB] Retrying query...`);
        const nextPool = await this.getPool();
        return await nextPool.query(text, params);
      }
      throw error;
    }
  }

  public async transaction<T>(callback: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
    try {
      return await this._runTransaction(callback);
    } catch (error) {
      if (this.isErrorConnectionLost(error)) {
        console.warn(`[DB] Connection lost during transaction. Unsetting active pool to trigger failover connection search.`);
        this.pool?.end().catch(() => {});
        this.pool = null;

        console.log(`[DB] Retrying transaction...`);
        return await this._runTransaction(callback);
      }
      throw error;
    }
  }

  private async _runTransaction<T>(callback: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.currentHost = null;
    }
  }
}
