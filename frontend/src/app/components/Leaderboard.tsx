import type { WordEntry } from "./OrbitalWordCloud";

interface LeaderboardProps {
  words: WordEntry[];
}

export function Leaderboard({ words }: LeaderboardProps) {
  const sorted = [...words].sort((a, b) => b.hp - a.hp).slice(0, 10);

  return (
    <div
      className="flex flex-col gap-1"
      style={{
        background: "rgba(10, 4, 32, 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(108,59,255,0.12)",
        borderRadius: "0 0 12px 0",
        padding: "14px 18px",
        minWidth: "200px",
        maxWidth: "250px",
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "rgba(154,107,255,0.7)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}
      >
        🏆 Leaderboard
      </div>

      {sorted.length === 0 && (
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.7rem",
            color: "rgba(154,107,255,0.3)",
          }}
        >
          No words yet
        </div>
      )}

      {sorted.map((entry, i) => (
          <div
            key={entry.word}
            className="flex items-center justify-between gap-2"
            style={{
              padding: "3px 0",
              borderBottom:
                i < sorted.length - 1
                  ? "1px solid rgba(108,59,255,0.06)"
                  : "none",
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color:
                    i === 0
                      ? "rgba(255,215,0,0.8)"
                      : i === 1
                        ? "rgba(200,200,200,0.7)"
                        : i === 2
                          ? "rgba(205,127,50,0.7)"
                          : "rgba(154,107,255,0.4)",
                  width: "14px",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  color: "rgba(244,246,255,0.8)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.word}
              </span>
            </div>

            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "rgba(125,249,255,0.85)",
                flexShrink: 0,
              }}
            >
              {entry.hp}
            </span>
          </div>
      ))}
    </div>
  );
}
