import { Pool, PoolConfig, type PoolClient } from "pg";

export type DatabaseRole = "primary" | "standby";

export interface DatabaseStatus {
  state: "connecting" | "connected" | "reconnecting" | "error";
  role: DatabaseRole | null;
  host: string | null;
  port: number | null;
  message?: string;
}

interface DatabaseTarget {
  role: DatabaseRole;
  host: string;
  port: string;
}

type PoolInitializer = (pool: Pool) => Promise<void>;
type StatusListener = (status: DatabaseStatus) => void;

export class DatabaseConnectionManager {
  private pool: Pool | null = null;
  public currentHost: string | null = null;
  private currentRole: DatabaseRole | null = null;
  private currentPort: string | null = null;
  private fallbackActive = false;
  private connectPromise: Promise<Pool> | null = null;
  private readonly initializers: PoolInitializer[] = [];
  private readonly listeners = new Set<StatusListener>();
  private status: DatabaseStatus = {
    state: "connecting",
    role: null,
    host: null,
    port: null,
    message: "Connecting to database...",
  };

  private createPoolConfig(host: string, port: string): PoolConfig {
    return {
      host,
      port: Number(port),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionTimeoutMillis: 3000,
    };
  }

  private getTargets(): { primary: DatabaseTarget; standby: DatabaseTarget } {
    return {
      primary: {
        role: "primary",
        host: process.env.DB_HOST_PRIMARY || "localhost",
        port: process.env.DB_PORT_PRIMARY || process.env.DB_PORT || "5432",
      },
      standby: {
        role: "standby",
        host: process.env.DB_HOST_STANDBY || "localhost",
        port: process.env.DB_PORT_STANDBY || process.env.DB_PORT || "5432",
      },
    };
  }

  private formatRole(role: DatabaseRole): string {
    return role === "primary" ? "Primary" : "Standby";
  }

  private setWaitingForDatabaseStatus(message: string): void {
    this.setStatus({
      state: "reconnecting",
      role: null,
      host: null,
      port: null,
      message,
    });
  }

  private activateFallbackMode(reason: string): void {
    if (!this.fallbackActive) {
      console.warn(`[DB] Fallback mode activated. ${reason}`);
    }
    this.fallbackActive = true;
  }

  private setStatus(status: DatabaseStatus): void {
    this.status = status;
    for (const listener of this.listeners) {
      listener({ ...status });
    }
  }

  public getStatus(): DatabaseStatus {
    return { ...this.status };
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public registerInitializer(initializer: PoolInitializer): void {
    this.initializers.push(initializer);
  }

  private async runInitializers(pool: Pool): Promise<void> {
    for (const initializer of this.initializers) {
      await initializer(pool);
    }
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

  private isErrorConnectionLost(error: any): boolean {
    const msg = this.extractErrorMessage(error);
    return [
      "aborted",
      "terminating connection",
      "write EPIPE",
      "read ECONNRESET",
      "Connection terminated",
      "read ECONNREFUSED",
      "connect ECONNREFUSED",
      "ECONNREFUSED",
      "57P01",
    ].some((pattern) => msg.includes(pattern));
  }

  private invalidateActivePool(message: string): void {
    const activePool = this.pool;
    this.pool = null;
    this.currentHost = null;
    this.currentRole = null;
    this.currentPort = null;
    this.setStatus({
      state: "reconnecting",
      role: null,
      host: null,
      port: null,
      message,
    });
    void activePool?.end().catch(() => {});
  }

  private triggerBackgroundReconnect(): void {
    void this.getPool().catch((error) => {
      const message = this.extractErrorMessage(error);
      console.error(`[DB] Background reconnection failed. Error: ${message}`);
      this.setWaitingForDatabaseStatus("Waiting for database connection...");
    });
  }

  private attachPoolErrorHandler(pool: Pool, target: DatabaseTarget): void {
    pool.on("error", (err) => {
      const message = this.extractErrorMessage(err);
      console.warn(
        `[DB] Idle ${this.formatRole(target.role)} client error: ${message}.`
      );

      if (!this.isErrorConnectionLost(err) || this.pool !== pool) {
        return;
      }

      if (target.role === "primary") {
        console.warn(`[DB] Primary database is down. Error: ${message}`);
        this.activateFallbackMode("Reads and writes will use Standby DB only.");
      }
      this.invalidateActivePool("Reconnecting to standby database...");
      this.triggerBackgroundReconnect();
    });
  }

  private async connectToTarget(target: DatabaseTarget): Promise<Pool> {
    const label = this.formatRole(target.role);
    console.log(`[DB] Attempting connection to ${label} DB at ${target.host}:${target.port}`);

    const pool = new Pool(this.createPoolConfig(target.host, target.port));
    this.attachPoolErrorHandler(pool, target);

    try {
      await pool.query("SELECT 1");
      await this.runInitializers(pool);
      this.pool = pool;
      this.currentHost = target.host;
      this.currentRole = target.role;
      this.currentPort = target.port;
      this.setStatus({
        state: "connected",
        role: target.role,
        host: target.host,
        port: Number(target.port),
        message:
          target.role === "primary"
            ? "Connected to primary database."
            : this.fallbackActive
              ? "Fallback mode active. Connected to standby database."
              : "Connected to standby database.",
      });
      if (target.role === "primary") {
        console.log("[DB] Primary database is healthy.");
      }
      console.log(`[DB] Successfully connected to ${label} DB.`);
      return pool;
    } catch (error) {
      await pool.end().catch(() => {});
      throw error;
    }
  }

  private async establishPool(): Promise<Pool> {
    const { primary, standby } = this.getTargets();

    if (!this.fallbackActive) {
      try {
        return await this.connectToTarget(primary);
      } catch (error) {
        console.warn(
          `[DB] Primary database is down. Error: ${this.extractErrorMessage(error)}`
        );
        console.log(`[DB] Falling back to Standby DB at ${standby.host}:${standby.port}...`);
      }
    } else {
      console.log("[DB] Fallback mode active. Skipping Primary DB connection attempt.");
    }

    try {
      const standbyPool = await this.connectToTarget(standby);
      this.activateFallbackMode("Reads and writes will use Standby DB only.");
      this.setStatus({
        state: "connected",
        role: standby.role,
        host: standby.host,
        port: Number(standby.port),
        message: "Fallback mode active. Connected to standby database.",
      });
      return standbyPool;
    } catch (standbyError) {
      console.error(
        `[DB] Failed to connect to Standby DB as well. Error: ${this.extractErrorMessage(standbyError)}`
      );
      this.setWaitingForDatabaseStatus("Waiting for database connection...");
      throw new Error("Database connection failed for both primary and standby.");
    }
  }

  public async getPool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.setStatus({
      state: this.currentRole ? "reconnecting" : "connecting",
      role: null,
      host: null,
      port: null,
      message: "Connecting to database...",
    });

    this.connectPromise = this.establishPool().finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  public async query(text: string, params?: any[]) {
    const activePool = await this.getPool();
    try {
      return await activePool.query(text, params);
    } catch (error) {
      if (this.isErrorConnectionLost(error)) {
        if (this.currentRole === "primary") {
          console.warn(
            `[DB] Primary database is down. Error: ${this.extractErrorMessage(error)}`
          );
          this.activateFallbackMode("Reads and writes will use Standby DB only.");
        }
        console.warn(
          "[DB] Connection lost. Unsetting active pool to trigger failover connection search."
        );
        this.invalidateActivePool("Reconnecting to standby database...");
        console.log("[DB] Retrying query...");
        this.triggerBackgroundReconnect();
        const nextPool = await this.getPool();
        return await nextPool.query(text, params);
      }

      console.error(`[DB] Query failed. Error: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  public async writeQuery(text: string, params?: any[]) {
    const activePool = await this.getPool();
    const shouldDoubleWrite = this.currentRole === "primary" && !this.fallbackActive;

    if (shouldDoubleWrite) {
      console.log("[DB] Attempting double write on Primary and Standby DB.");
    }

    try {
      const result = await activePool.query(text, params);

      if (shouldDoubleWrite) {
        await this.writeToStandbyBestEffort((pool) => pool.query(text, params));
      }

      return result;
    } catch (error) {
      if (this.isErrorConnectionLost(error) && this.currentRole === "primary") {
        console.warn(
          `[DB] Primary database is down. Error: ${this.extractErrorMessage(error)}`
        );
        this.activateFallbackMode("Reads and writes will use Standby DB only.");
        this.invalidateActivePool("Reconnecting to standby database...");
        console.log("[DB] Retrying write on Standby DB only.");
        const nextPool = await this.getPool();
        return await nextPool.query(text, params);
      }

      console.error(`[DB] Write query failed. Error: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    try {
      return await this._runTransaction(callback);
    } catch (error) {
      if (this.isErrorConnectionLost(error)) {
        if (this.currentRole === "primary") {
          console.warn(
            `[DB] Primary database is down. Error: ${this.extractErrorMessage(error)}`
          );
          this.activateFallbackMode("Reads and writes will use Standby DB only.");
        }
        console.warn(
          "[DB] Connection lost during transaction. Unsetting active pool to trigger failover connection search."
        );
        this.invalidateActivePool("Reconnecting to standby database...");
        console.log("[DB] Retrying transaction...");
        this.triggerBackgroundReconnect();
        return await this._runTransaction(callback);
      }

      console.error(`[DB] Transaction failed. Error: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  public async writeTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    await this.getPool();
    const shouldDoubleWrite = this.currentRole === "primary" && !this.fallbackActive;

    if (shouldDoubleWrite) {
      console.log("[DB] Attempting double write transaction on Primary and Standby DB.");
    }

    try {
      const result = await this._runTransaction(callback);

      if (shouldDoubleWrite) {
        await this.writeTransactionToStandbyBestEffort(callback);
      }

      return result;
    } catch (error) {
      if (this.isErrorConnectionLost(error) && this.currentRole === "primary") {
        console.warn(
          `[DB] Primary database is down. Error: ${this.extractErrorMessage(error)}`
        );
        this.activateFallbackMode("Reads and writes will use Standby DB only.");
        this.invalidateActivePool("Reconnecting to standby database...");
        console.log("[DB] Retrying transaction on Standby DB only.");
        return await this._runTransaction(callback);
      }

      console.error(`[DB] Write transaction failed. Error: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  private async _runTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
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

  private async writeToStandbyBestEffort<T>(
    operation: (pool: Pool) => Promise<T>
  ): Promise<void> {
    const { standby } = this.getTargets();
    const pool = new Pool(this.createPoolConfig(standby.host, standby.port));

    try {
      await pool.query("SELECT 1");
      await this.runInitializers(pool);
      await operation(pool);
    } catch (error) {
      console.warn(
        `[DB] Standby write failed during double write. Continuing with Primary result. Error: ${this.extractErrorMessage(error)}`
      );
    } finally {
      await pool.end().catch(() => {});
    }
  }

  private async writeTransactionToStandbyBestEffort<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<void> {
    const { standby } = this.getTargets();
    const pool = new Pool(this.createPoolConfig(standby.host, standby.port));

    try {
      await pool.query("SELECT 1");
      await this.runInitializers(pool);
      await this.runTransactionOnPool(pool, callback);
    } catch (error) {
      console.warn(
        `[DB] Standby transaction failed during double write. Continuing with Primary result. Error: ${this.extractErrorMessage(error)}`
      );
    } finally {
      await pool.end().catch(() => {});
    }
  }

  private async runTransactionOnPool<T>(
    pool: Pool,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
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
      this.currentRole = null;
      this.currentPort = null;
    }
  }
}
