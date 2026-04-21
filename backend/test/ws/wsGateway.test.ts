import { type AddressInfo } from "node:net";
import { type Server as HttpServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { createAppServer } from "../../src/server.js";
import { InMemoryBubbleRepository } from "../../src/infrastructure/repositories/inMemoryBubbleRepository.js";
import type { BubbleRepository } from "../../src/infrastructure/repositories/bubbleRepository.js";

const WS_TEST_DEBUG = process.env.WS_TEST_DEBUG === "1";

function debug(message: string): void {
  if (WS_TEST_DEBUG) {
    console.log(`[ws-test] ${message}`);
  }
}

function waitForEvent<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${event}`));
    }, 2500);

    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function connectClient(url: string): Promise<ClientSocket> {
  return new Promise<ClientSocket>((resolve, reject) => {
    const socket = ioClient(url, {
      path: "/api/socket.io",
      autoConnect: false,
      reconnection: false,
      transports: ["websocket"],
    });

    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("Timed out waiting for socket connection"));
    }, 3000);

    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      socket.close();
      reject(error);
    });

    socket.connect();
  });
}

function startServer(server: HttpServer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("error", onError);
      reject(error);
    };

    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });
}

describe("wsGateway", () => {
  const clients: ClientSocket[] = [];

  afterEach(() => {
    for (const c of clients) {
      c.disconnect();
    }
  });

  it("broadcasts state updates to all clients", async () => {
    const { httpServer, io, repo } = await createAppServer({
      corsOrigin: "*",
      repo: new InMemoryBubbleRepository(),
    });
    await repo.clearAll();

    debug("starting HTTP server");
    await startServer(httpServer);

    try {
      const port = (httpServer.address() as AddressInfo).port;
      const url = `http://127.0.0.1:${port}`;
      debug(`server listening on ${url}`);

      const [a, b] = await Promise.all([connectClient(url), connectClient(url)]);
      clients.push(a, b);
      debug("both clients connected");

      const bStatePromise = waitForEvent<Array<{ word: string; hp: number }>>(b, "state");
      const ack = await new Promise<{ ok: boolean }>((resolve) => {
        debug("emitting addWord from client A");
        a.emit("addWord", { word: "hello" }, resolve);
      });
      debug(`ack received: ${JSON.stringify(ack)}`);

      expect(ack.ok).toBe(true);

      const bState = await bStatePromise;
      debug(`client B state received: ${JSON.stringify(bState)}`);
      expect(bState).toContainEqual({ word: "hello", hp: 5 });
    } finally {
      debug("disconnecting clients");
      for (const c of clients) {
        c.disconnect();
      }

      debug("closing socket.io");
      await new Promise<void>((resolve) => io.close(() => resolve()));
      debug("closing HTTP server");
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      debug("teardown completed");
    }
  }, 10000);

  it("emits dbStatus on connect even when initial repository load fails", async () => {
    const failingRepo: BubbleRepository = {
      getAll: async () => {
        throw new Error("database unavailable");
      },
      addWord: async () => {
        throw new Error("database unavailable");
      },
      hitWord: async () => {
        throw new Error("database unavailable");
      },
      getLeaderboard: async () => {
        throw new Error("database unavailable");
      },
      clearAll: async () => {},
    };

    const { httpServer, io } = await createAppServer({
      corsOrigin: "*",
      repo: failingRepo,
      getDatabaseStatus: () => ({
        state: "reconnecting",
        role: null,
        host: null,
        port: null,
        message: "Waiting for database connection...",
      }),
    });

    await startServer(httpServer);

    try {
      const port = (httpServer.address() as AddressInfo).port;
      const url = `http://127.0.0.1:${port}`;
      const client = ioClient(url, {
        path: "/api/socket.io",
        autoConnect: false,
        reconnection: false,
        transports: ["websocket"],
      });
      clients.push(client);

      const dbStatusPromise = waitForEvent(client, "dbStatus");
      client.connect();

      await expect(dbStatusPromise).resolves.toMatchObject({
        state: "reconnecting",
        message: "Waiting for database connection...",
      });
    } finally {
      for (const c of clients) {
        c.disconnect();
      }

      await new Promise<void>((resolve) => io.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });
});
