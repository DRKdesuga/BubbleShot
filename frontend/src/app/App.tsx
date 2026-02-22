import { useState, useCallback, useRef } from "react";
import { ParticleBackground } from "./components/ParticleBackground";
import { HeroHeader } from "./components/HeroHeader";
import { InputBar } from "./components/InputBar";
import { OrbitalWordCloud, WordEntry } from "./components/OrbitalWordCloud";
import { Leaderboard } from "./components/Leaderboard";
import logoImg from "../images/mind7_png_logo.png";

// Initial demo data to showcase the visualization
const INITIAL_WORDS: WordEntry[] = [
  { word: "ARCL", hp: 25 },
  { word: "Mathis", hp: 5 },
  { word: "Hugo", hp: 5 },
  { word: "Hamza", hp: 5 },
  { word: "Elyes", hp: 5 },
  { word: "Leandro", hp: 5 },
  { word: "Henri-Gabriel", hp: 5 },
];

export default function App() {
  const [words, setWords] = useState<WordEntry[]>(INITIAL_WORDS);
  const leaderboardRef = useRef<HTMLDivElement>(null);

  const handleAddWord = useCallback((word: string) => {
    if (word === "clearhugo") {
      setWords([]);
      return;
    }
    setWords((prev) => {
      const existing = prev.find((w) => w.word === word);
      if (existing) {
        const newHp = Math.min(existing.hp + 5, 25);
        return prev.map((w) =>
          w.word === word ? { ...w, hp: newHp } : w
        );
      }
      return [...prev, { word, hp: 5 }];
    });
  }, []);

  const handleBubbleClick = useCallback((word: string) => {
    setWords((prev) => {
      const entry = prev.find((w) => w.word === word);
      if (!entry) return prev;
      if (entry.hp <= 1) {
        // 💥 Bulle éclatée !
        return prev.filter((w) => w.word !== word);
      }
      return prev.map((w) =>
        w.word === word ? { ...w, hp: w.hp - 1 } : w
      );
    });
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
