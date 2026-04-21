import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppServer } from "../src/server.js";

const originalEnv = { ...process.env };

describe("createAppServer", () => {
  afterEach(async () => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("starts in degraded mode when both databases are unreachable at boot", async () => {
    process.env.DB_HOST_PRIMARY = "127.0.0.1";
    process.env.DB_PORT_PRIMARY = "1";
    process.env.DB_HOST_STANDBY = "127.0.0.1";
    process.env.DB_PORT_STANDBY = "2";
    process.env.DB_NAME = "bubbleshot";
    process.env.DB_USER = "bubbleshot";
    process.env.DB_PASSWORD = "secret";

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const server = await createAppServer({ corsOrigin: "*" });

    expect(server).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DB] Failed to connect to Standby DB as well.")
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DB] Starting API in degraded mode.")
    );

    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  });
});
