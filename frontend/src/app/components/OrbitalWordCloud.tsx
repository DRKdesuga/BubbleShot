import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface WordEntry {
  word: string;
  count: number;
}

interface OrbitalWordCloudProps {
  words: WordEntry[];
}

interface BubbleData {
  word: string;
  count: number;
  orbitRadius: number;
  angle: number;
  speed: number;
  size: number;
  hue: number;
  zOffset: number;
}

function computeBubbles(words: WordEntry[], containerWidth: number, containerHeight: number): BubbleData[] {
  if (words.length === 0) return [];

  const maxCount = Math.max(...words.map((w) => w.count));
  const minCount = Math.min(...words.map((w) => w.count));
  const range = maxCount - minCount || 1;

  // Responsive sizing
  const minDim = Math.min(containerWidth, containerHeight);
  const maxOrbit = minDim * 0.38;
  const minOrbit = minDim * 0.08;

  // Sort by count descending - frequent words get inner orbits
  const sorted = [...words].sort((a, b) => b.count - a.count);

  return sorted.map((entry, index) => {
    const normalizedCount = (entry.count - minCount) / range;

    // Size: 44px to 120px based on frequency
    const minSize = 44;
    const maxSize = Math.min(120, minDim * 0.16);
    const size = minSize + normalizedCount * (maxSize - minSize);

    // Distribute orbits using golden angle for even spacing
    const goldenAngle = 137.508;
    const orbitProgress = index / Math.max(words.length - 1, 1);
    const orbitRadius = minOrbit + orbitProgress * (maxOrbit - minOrbit);

    // Starting angle spread using golden angle
    const angle = (index * goldenAngle * Math.PI) / 180;

    // Speed: larger bubbles orbit slower
    const speed = 0.12 + (1 - normalizedCount) * 0.3;

    // Hue variation within purple range
    const hue = 260 + (index % 5) * 8;

    // Deterministic z-depth based on word hash
    const hash = entry.word.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const zOffset = 0.85 + (hash % 30) / 100;

    return {
      word: entry.word,
      count: entry.count,
      orbitRadius,
      angle,
      speed,
      size,
      hue,
      zOffset,
    };
  });
}

export function OrbitalWordCloud({ words }: OrbitalWordCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute bubble layout when words or dimensions change
  useEffect(() => {
    setBubbles(computeBubbles(words, dimensions.width, dimensions.height));
  }, [words, dimensions]);

  // Animation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      setTime((t) => t + delta);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  return (
    <div
      ref={containerRef}
      className="relative z-10 w-full flex-1 overflow-hidden"
      style={{ minHeight: "400px" }}
    >
      {/* Center glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: centerX - 100,
          top: centerY - 100,
          width: 200,
          height: 200,
          background: "radial-gradient(circle, rgba(108,59,255,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Orbital rings (subtle) */}
      {[0.15, 0.25, 0.35].map((r, i) => {
        const radius = Math.min(dimensions.width, dimensions.height) * r;
        return (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: centerX - radius,
              top: centerY - radius,
              width: radius * 2,
              height: radius * 2,
              border: "1px solid rgba(108,59,255,0.04)",
            }}
          />
        );
      })}

      <AnimatePresence>
        {bubbles.map((bubble) => (
          <OrbitalBubble
            key={bubble.word}
            bubble={bubble}
            time={time}
            centerX={centerX}
            centerY={centerY}
          />
        ))}
      </AnimatePresence>

      {words.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.9rem",
            color: "rgba(154,107,255,0.4)",
          }}
        >
          Type a word to begin...
        </div>
      )}
    </div>
  );
}

interface OrbitalBubbleProps {
  bubble: BubbleData;
  time: number;
  centerX: number;
  centerY: number;
}

function OrbitalBubble({ bubble, time, centerX, centerY }: OrbitalBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate position on orbit
  const angle = bubble.angle + time * bubble.speed;
  const x = centerX + Math.cos(angle) * bubble.orbitRadius - bubble.size / 2;
  const y = centerY + Math.sin(angle) * bubble.orbitRadius * 0.6 - bubble.size / 2;

  // Floating offset
  const floatY = Math.sin(time * 0.8 + bubble.angle) * 4;
  const floatX = Math.cos(time * 0.5 + bubble.angle * 2) * 2;

  // Depth-based opacity
  const depthFactor = 0.5 + 0.5 * Math.sin(angle);
  const opacity = 0.7 + depthFactor * 0.3;
  const scale = bubble.zOffset * (0.9 + depthFactor * 0.1);

  // Font size scales with bubble size
  const fontSize = Math.max(10, Math.min(bubble.size * 0.22, 18));

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="absolute cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        left: x + floatX,
        top: y + floatY,
        width: bubble.size,
        height: bubble.size,
        zIndex: Math.round(depthFactor * 10),
        willChange: "transform",
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: `radial-gradient(circle, rgba(108,59,255,${isHovered ? 0.3 : 0.15}) 0%, transparent 70%)`,
          transform: `scale(${isHovered ? 1.8 : 1.4})`,
          filter: "blur(10px)",
        }}
      />

      {/* Bubble sphere */}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden"
        style={{
          background: `radial-gradient(circle at 35% 30%, 
            rgba(${bubble.hue === 260 ? "154,107,255" : "125,130,255"},${isHovered ? 0.35 : 0.2}) 0%, 
            rgba(108,59,255,${isHovered ? 0.25 : 0.12}) 40%, 
            rgba(20,10,53,${isHovered ? 0.7 : 0.5}) 100%)`,
          border: `1px solid rgba(108,59,255,${isHovered ? 0.5 : 0.2})`,
          boxShadow: isHovered
            ? `0 0 30px rgba(108,59,255,0.3), 
               0 0 60px rgba(108,59,255,0.1),
               inset 0 0 30px rgba(108,59,255,0.1)`
            : `0 0 15px rgba(108,59,255,0.1), 
               inset 0 0 20px rgba(108,59,255,0.05)`,
          opacity,
          transform: `scale(${isHovered ? 1.12 : scale})`,
          backdropFilter: "blur(4px)",
        }}
      >
        {/* Glass highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top: "12%",
            left: "18%",
            width: "35%",
            height: "25%",
            background: "linear-gradient(180deg, rgba(244,246,255,0.12) 0%, transparent 100%)",
            filter: "blur(2px)",
            borderRadius: "50%",
          }}
        />

        {/* Word text - NO numbers */}
        <span
          className="relative z-10 text-center select-none px-2"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: `${fontSize}px`,
            fontWeight: 500,
            color: isHovered ? "#F4F6FF" : `rgba(244,246,255,${0.7 + depthFactor * 0.3})`,
            textShadow: isHovered
              ? "0 0 20px rgba(108,59,255,0.6), 0 0 40px rgba(108,59,255,0.3)"
              : "0 0 10px rgba(108,59,255,0.3)",
            letterSpacing: "0.02em",
            lineHeight: 1.2,
            transition: "color 0.3s ease, text-shadow 0.3s ease",
            wordBreak: "break-word",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "90%",
          }}
        >
          {bubble.word}
        </span>
      </div>
    </motion.div>
  );
}