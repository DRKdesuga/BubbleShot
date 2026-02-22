import { Cloud, ArrowRightLeft, Database } from "lucide-react";

export function HeroHeader() {
  return (
    <header className="relative z-10 pt-6 pb-3 px-6 text-center">
      {/* Glow behind title */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(108,59,255,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <h1
        className="relative tracking-tight"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 700,
          color: "#F4F6FF",
          letterSpacing: "-0.02em",
        }}
      >
        Hybrid Guestbook
      </h1>

      <p
        className="mt-2 relative"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
          fontWeight: 400,
          color: "rgba(154,107,255,0.9)",
          letterSpacing: "0.04em",
        }}
      >
        Hybrid Cloud Word Visualization
      </p>
    </header>
  );
}

function FlowChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: "rgba(108,59,255,0.08)",
        border: "1px solid rgba(108,59,255,0.2)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ color: "#7DF9FF" }}>{icon}</span>
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.7rem",
          fontWeight: 500,
          color: "rgba(244,246,255,0.7)",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
