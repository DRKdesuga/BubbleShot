import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer, type Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { AddWordUseCase } from "./application/usecases/addWord.js";
import { GetLeaderboardUseCase } from "./application/usecases/getLeaderboard.js";
import { HitWordUseCase } from "./application/usecases/hitWord.js";
import { SocketIoBroadcaster } from "./infrastructure/realtime/socketIoBroadcaster.js";
import { DatabaseConnectionManager } from "./infrastructure/db/connectionManager.js";
import { BubbleRepositoryPostgres } from "./infrastructure/repositories/bubbleRepositoryPostgres.js";
import { buildHttpRoutes } from "./presentation/http/routes.js";
import { registerWsGateway } from "./presentation/ws/wsGateway.js";

import { BubbleRepository } from "./infrastructure/repositories/bubbleRepository.js";

export interface AppServer {
  app: express.Express;
  httpServer: HttpServer;
  io: SocketIOServer;
  repo: BubbleRepository;
}

export interface ServerConfig {
  corsOrigin: string;
}

export async function createAppServer(config?: Partial<ServerConfig>): Promise<AppServer> {
  const corsOrigin =
    config?.corsOrigin ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";

  const dbConnectionManager = new DatabaseConnectionManager();
  const repo = new BubbleRepositoryPostgres(dbConnectionManager);
  let dbIsAvailable = true;
  let dbHealthMessage = "Database connection is healthy.";

  try {
    await repo.initialize();
  } catch (error) {
    dbIsAvailable = false;
    dbHealthMessage =
      "Database unavailable (primary and standby unreachable). The server is running in degraded mode.";
    console.error("[Startup] Failed to initialize database:", error);
  }

  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());
  app.use(
    "/api",
    buildHttpRoutes({
      healthProvider: () =>
        dbIsAvailable
          ? { status: "ok" }
          : { status: "degraded", message: dbHealthMessage },
    })
  );

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
  });

  const broadcaster = new SocketIoBroadcaster(io);

  registerWsGateway(io, {
    repo,
    addWordUseCase: new AddWordUseCase(repo, broadcaster),
    hitWordUseCase: new HitWordUseCase(repo, broadcaster),
    getLeaderboardUseCase: new GetLeaderboardUseCase(repo),
  });

  return { app, httpServer, io, repo };
}
