import type { Server, Socket } from "socket.io";
import type { AddWordUseCase } from "../../application/usecases/addWord.js";
import type { GetLeaderboardUseCase } from "../../application/usecases/getLeaderboard.js";
import type { HitWordUseCase } from "../../application/usecases/hitWord.js";
import { DomainError } from "../../domain/errors/domainError.js";
import type { BubbleRepository } from "../../infrastructure/repositories/bubbleRepository.js";

interface GatewayDeps {
  repo: BubbleRepository;
  addWordUseCase: AddWordUseCase;
  hitWordUseCase: HitWordUseCase;
  getLeaderboardUseCase: GetLeaderboardUseCase;
}

type Ack = (response: {
  ok: boolean;
  code?: string;
  message?: string;
  data?: unknown;
}) => void;

function isDatabaseUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return [
    "Database connection failed for both primary and standby",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "ENOTFOUND",
  ].some((pattern) => message.includes(pattern));
}

function toClientError(error: unknown): { code: string; message: string } {
  if (error instanceof DomainError) {
    return { code: error.code, message: error.message };
  }

  if (isDatabaseUnavailableError(error)) {
    return {
      code: "DB_UNAVAILABLE",
      message: "Database unavailable (primary and standby unreachable).",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Unexpected server error.",
  };
}

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
  socket.emit("error", toClientError(error));
}

export function registerWsGateway(io: Server, deps: GatewayDeps): void {
  io.on("connection", async (socket) => {
    socket.on("addWord", async (payload: unknown, ack?: Ack) => {
      try {
        const word = parseWordPayload(payload);
        await deps.addWordUseCase.execute(word);
        ack?.({ ok: true });
      } catch (error) {
        emitError(socket, error);
        const clientError = toClientError(error);
        ack?.({ ok: false, ...clientError });
      }
    });

    socket.on("hitWord", async (payload: unknown, ack?: Ack) => {
      try {
        const word = parseWordPayload(payload);
        await deps.hitWordUseCase.execute(word);
        ack?.({ ok: true });
      } catch (error) {
        emitError(socket, error);
        const clientError = toClientError(error);
        ack?.({ ok: false, ...clientError });
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
      emitError(socket, error);
    }
  });
}
