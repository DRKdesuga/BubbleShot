import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer, type Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { AddWordUseCase } from "./application/usecases/addWord.js";
import { GetLeaderboardUseCase } from "./application/usecases/getLeaderboard.js";
import { HitWordUseCase } from "./application/usecases/hitWord.js";
import { SocketIoBroadcaster } from "./infrastructure/realtime/socketIoBroadcaster.js";
import { InMemoryBubbleRepository } from "./infrastructure/repositories/inMemoryBubbleRepository.js";
import { buildHttpRoutes } from "./presentation/http/routes.js";
import { registerWsGateway } from "./presentation/ws/wsGateway.js";

export interface AppServer {
  app: express.Express;
  httpServer: HttpServer;
  io: SocketIOServer;
}

export interface ServerConfig {
  corsOrigin: string;
}

export function createAppServer(config?: Partial<ServerConfig>): AppServer {
  const corsOrigin =
    config?.corsOrigin ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";

  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());
  app.use(buildHttpRoutes());

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
  });

  const repo = new InMemoryBubbleRepository();
  const broadcaster = new SocketIoBroadcaster(io);

  registerWsGateway(io, {
    repo,
    addWordUseCase: new AddWordUseCase(repo, broadcaster),
    hitWordUseCase: new HitWordUseCase(repo, broadcaster),
    getLeaderboardUseCase: new GetLeaderboardUseCase(repo),
  });

  return { app, httpServer, io };
}
