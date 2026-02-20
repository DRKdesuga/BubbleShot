import { useState, useCallback } from "react";
import { ParticleBackground } from "./components/ParticleBackground";
import { HeroHeader } from "./components/HeroHeader";
import { InputBar } from "./components/InputBar";
import { OrbitalWordCloud, WordEntry } from "./components/OrbitalWordCloud";

// Initial demo data to showcase the visualization
const INITIAL_WORDS: WordEntry[] = [
  { word: "kubernetes", count: 5 },
  { word: "terraform", count: 4 },
  { word: "docker", count: 6 },
  { word: "cloud", count: 7 },
  { word: "hybrid", count: 4 },
  { word: "devops", count: 3 },
  { word: "api", count: 5 },
  { word: "microservice", count: 2 },
  { word: "pipeline", count: 3 },
  { word: "infrastructure", count: 2 },
  { word: "network", count: 3 },
  { word: "secure", count: 2 },
];

export default function App() {
  const [words, setWords] = useState<WordEntry[]>(INITIAL_WORDS);

  const handleAddWord = useCallback((word: string) => {
    setWords((prev) => {
      const existing = prev.find((w) => w.word === word);
      if (existing) {
        return prev.map((w) =>
          w.word === word ? { ...w, count: w.count + 1 } : w
        );
      }
      return [...prev, { word, count: 1 }];
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

      <HeroHeader />
      <InputBar onSubmit={handleAddWord} />

      {/* Status bar */}
      <div className="relative z-10 flex justify-center px-6 pb-2">
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
          <span style={{ color: "rgba(108,59,255,0.2)" }}>|</span>
          <span>
            <span style={{ color: "rgba(125,249,255,0.5)" }}>
              {words.reduce((sum, w) => sum + w.count, 0)}
            </span>{" "}
            total entries
          </span>
        </div>
      </div>

      <OrbitalWordCloud words={words} />

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
