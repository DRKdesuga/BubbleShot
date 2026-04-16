import { useState, useCallback, useRef, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { ParticleBackground } from "./components/ParticleBackground";
import { HeroHeader } from "./components/HeroHeader";
import { InputBar } from "./components/InputBar";
import { OrbitalWordCloud, WordEntry } from "./components/OrbitalWordCloud";
import { Leaderboard } from "./components/Leaderboard";
import logoImg from "../images/mind7_png_logo.png";

// Backend URL is optionally injected via Vite for dev, otherwise we rely on relative paths (Nginx proxy)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

type DbStatus = {
  state: "connecting" | "connected" | "reconnecting" | "error";
  role: "primary" | "standby" | null;
  host: string | null;
  port: number | null;
  message?: string;
};

function isWordEntryArray(value: unknown): value is WordEntry[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      "word" in entry &&
      "hp" in entry &&
      typeof (entry as { word: unknown }).word === "string" &&
      typeof (entry as { hp: unknown }).hp === "number"
  );
}

function isDbStatus(value: unknown): value is DbStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const state = candidate.state;
  const role = candidate.role;

  return (
    (state === "connecting" ||
      state === "connected" ||
      state === "reconnecting" ||
      state === "error") &&
    (role === "primary" || role === "standby" || role === null)
  );
}

export default function App() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(BACKEND_URL || undefined, {
      path: "/api/socket.io",
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setDbStatus({
        state: "reconnecting",
        role: null,
        host: null,
        port: null,
        message: "Reconnecting to database...",
      });
    });

    socket.on("state", (payload: unknown) => {
      if (isWordEntryArray(payload)) {
        setWords(payload);
      }
    });

    socket.on("dbStatus", (payload: unknown) => {
      if (isDbStatus(payload)) {
        setDbStatus(payload);
      }
    });

    socket.on("error", (payload: unknown) => {
      console.error("Backend error:", payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const showReconnectBanner =
    dbStatus?.state === "reconnecting" || dbStatus?.state === "error";

  const handleAddWord = useCallback((word: string) => {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit(
      "addWord",
      { word },
      (ack: { ok: boolean; message?: string }) => {
        if (!ack?.ok) {
          console.error("addWord failed:", ack?.message ?? "Unknown error");
        }
      }
    );
  }, []);

  const handleBubbleClick = useCallback((word: string) => {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit(
      "hitWord",
      { word },
      (ack: { ok: boolean; message?: string }) => {
        if (!ack?.ok) {
          console.error("hitWord failed:", ack?.message ?? "Unknown error");
        }
      }
    );
  }, []);

  return (
    <div
      className="flex flex-col w-full h-full overflow-hidden relative"
      style={{
        background: "linear-gradient(180deg, #05010F 0%, #0A0420 30%, #140A35 70%, #07021A 100%)",
        minHeight: "100vh",
      }}
    >
      <ParticleBackground />

      {/* Ambient gradient orbs */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: "10%",
          right: "10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(108,59,255,0.06) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: "15%",
          left: "5%",
          width: "350px",
          height: "350px",
          background: "radial-gradient(circle, rgba(125,249,255,0.03) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* Leaderboard top-left */}
        <div ref={leaderboardRef} className="absolute top-4 left-4 z-40 p-0">
          <Leaderboard words={words} />
        </div>

        {showReconnectBanner ? (
          <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 px-4 py-2 rounded-full border border-red-300/40 bg-red-700/90 text-white shadow-lg backdrop-blur-sm">
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {dbStatus?.message ?? "Reconnecting to database..."}
            </span>
          </div>
        ) : null}

        {/* Team logo top-right */}
        <div className="absolute top-5 right-5 z-40 p-0">
          <img
            src={logoImg}
            alt="Mind7 Logo"
            style={{
              width: "100px",
              height: "100px",
              objectFit: "contain",
              opacity: 1,
              filter: "drop-shadow(0 0 10px rgba(108,59,255,0.4))",
            }}
          />
        </div>

      <HeroHeader />

      {/* Game area: fills everything below the header */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {/* Bubble cloud takes all available space */}
        <OrbitalWordCloud words={words} onBubbleClick={handleBubbleClick} excludeRef={leaderboardRef} />

        

        {/* Input + status pinned at the bottom, overlaying the cloud */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pb-10">
          {/* Status bar */}
          <div className="flex justify-center px-6 pb-2">
            <div
              className="flex items-center gap-4"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 400,
                color: "rgba(154,107,255,0.4)",
                letterSpacing: "0.05em",
              }}
            >
              <span>
                <span style={{ color: "rgba(125,249,255,0.5)" }}>
                  {words.length}
                </span>{" "}
                unique words
              </span>
              <span
                style={{
                  color: isConnected ? "rgba(125,249,255,0.6)" : "rgba(255,120,120,0.6)",
                }}
              >
                {isConnected ? "connected" : "offline"}
              </span>
            </div>
          </div>

          <InputBar onSubmit={handleAddWord} />
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to top, #07021A 0%, transparent 100%)",
        }}
      />

      {/* Footer */}
      <div
        className="fixed bottom-4 left-0 right-0 text-center z-20"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.65rem",
          fontWeight: 400,
          color: "rgba(154,107,255,0.25)",
          letterSpacing: "0.08em",
        }}
      >
        HYBRID CLOUD INFRASTRUCTURE DEMO
      </div>
    </div>
  );
}
