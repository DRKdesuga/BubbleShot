import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer, type Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { AddWordUseCase } from "./application/usecases/addWord.js";
import { GetLeaderboardUseCase } from "./application/usecases/getLeaderboard.js";
import { HitWordUseCase } from "./application/usecases/hitWord.js";
import { SocketIoBroadcaster } from "./infrastructure/realtime/socketIoBroadcaster.js";
import {
  DatabaseConnectionManager,
  type DatabaseStatus,
} from "./infrastructure/db/connectionManager.js";
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
  repo: BubbleRepository;
  getDatabaseStatus: () => DatabaseStatus;
}

export async function createAppServer(config?: Partial<ServerConfig>): Promise<AppServer> {
  const corsOrigin =
    config?.corsOrigin ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";

  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());
  app.use("/api", buildHttpRoutes());

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
  });

  let repo: BubbleRepository;
  let getDatabaseStatus: () => DatabaseStatus;

  if (config?.repo) {
    repo = config.repo;
    getDatabaseStatus =
      config.getDatabaseStatus ??
      (() => ({
        state: "connected",
        role: "primary",
        host: null,
        port: null,
        message: "In-memory repository active.",
      }));
  } else {
    const dbConnectionManager = new DatabaseConnectionManager();
    dbConnectionManager.subscribe((status: DatabaseStatus) => {
      io.emit("dbStatus", status);
    });

    const postgresRepo = new BubbleRepositoryPostgres(dbConnectionManager);
    await postgresRepo.initialize();
    repo = postgresRepo;
    getDatabaseStatus = () => dbConnectionManager.getStatus();
  }

  const broadcaster = new SocketIoBroadcaster(io);

  registerWsGateway(io, {
    repo,
    addWordUseCase: new AddWordUseCase(repo, broadcaster),
    hitWordUseCase: new HitWordUseCase(repo, broadcaster),
    getLeaderboardUseCase: new GetLeaderboardUseCase(repo),
    getDatabaseStatus,
  });

  return { app, httpServer, io, repo };
}
