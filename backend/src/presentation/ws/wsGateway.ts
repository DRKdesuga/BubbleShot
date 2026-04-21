import type { Server, Socket } from "socket.io";
import type { AddWordUseCase } from "../../application/usecases/addWord.js";
import type { GetLeaderboardUseCase } from "../../application/usecases/getLeaderboard.js";
import type { HitWordUseCase } from "../../application/usecases/hitWord.js";
import { DomainError } from "../../domain/errors/domainError.js";
import type { DatabaseStatus } from "../../infrastructure/db/connectionManager.js";
import type { BubbleRepository } from "../../infrastructure/repositories/bubbleRepository.js";

interface GatewayDeps {
  repo: BubbleRepository;
  addWordUseCase: AddWordUseCase;
  hitWordUseCase: HitWordUseCase;
  getLeaderboardUseCase: GetLeaderboardUseCase;
  getDatabaseStatus: () => DatabaseStatus;
}

type Ack = (response: {
  ok: boolean;
  code?: string;
  message?: string;
  data?: unknown;
}) => void;

function parseWordPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "word" in payload &&
    typeof (payload as { word: unknown }).word === "string"
  ) {
    return (payload as { word: string }).word;
  }

  throw new DomainError("INVALID_PAYLOAD", "Expected payload: { word: string }.");
}

function emitError(socket: Socket, error: unknown): void {
  if (error instanceof DomainError) {
    socket.emit("error", { code: error.code, message: error.message });
    return;
  }

  socket.emit("error", {
    code: "INTERNAL_ERROR",
    message: "Unexpected server error.",
  });
}

export function registerWsGateway(io: Server, deps: GatewayDeps): void {
  io.on("connection", async (socket) => {
    socket.emit("dbStatus", deps.getDatabaseStatus());

    socket.on("addWord", async (payload: unknown, ack?: Ack) => {
      try {
        const word = parseWordPayload(payload);
        await deps.addWordUseCase.execute(word);
        ack?.({ ok: true });
      } catch (error) {
        console.error("[WS] addWord failed:", error);
        emitError(socket, error);
        ack?.({
          ok: false,
          code: error instanceof DomainError ? error.code : "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unexpected server error.",
        });
      }
    });

    socket.on("hitWord", async (payload: unknown, ack?: Ack) => {
      try {
        const word = parseWordPayload(payload);
        await deps.hitWordUseCase.execute(word);
        ack?.({ ok: true });
      } catch (error) {
        console.error("[WS] hitWord failed:", error);
        emitError(socket, error);
        ack?.({
          ok: false,
          code: error instanceof DomainError ? error.code : "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unexpected server error.",
        });
      }
    });

    socket.on("leaderboard", async (_payload: unknown, ack?: Ack) => {
      try {
        const data = await deps.getLeaderboardUseCase.execute();
        if (ack) {
          ack({ ok: true, data });
          return;
        }

        socket.emit("leaderboard", data);
      } catch (_error) {
        ack?.({
          ok: false,
          code: "INTERNAL_ERROR",
          message: "Failed to fetch leaderboard.",
        });
      }
    });

    try {
      const [state, leaderboard] = await Promise.all([
        deps.repo.getAll(),
        deps.getLeaderboardUseCase.execute(),
      ]);

      socket.emit("state", state);
      socket.emit("leaderboard", leaderboard);
    } catch (error) {
      console.error("[WS] initial state failed:", error);

      if (deps.getDatabaseStatus().state !== "connected") {
        return;
      }

      emitError(socket, error);
    }
  });
}
