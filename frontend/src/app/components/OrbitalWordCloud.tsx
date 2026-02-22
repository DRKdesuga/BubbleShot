import { useEffect, useRef, useState, useReducer } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface WordEntry {
  word: string;
  hp: number;
}

interface BubbleWordCloudProps {
  words: WordEntry[];
  onBubbleClick?: (word: string) => void;
  excludeRef?: React.RefObject<HTMLElement | null>;
}

interface BubblePhysics {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function getBubbleSize(hp: number, minDim: number): number {
  // Size grows with HP: 5hp = decent, 25hp = big
  const baseSize = 80;
  const growth = 4;
  const maxSize = Math.min(180, minDim * 0.25);
  return Math.min(baseSize + (hp - 1) * growth, maxSize);
}

export function OrbitalWordCloud({ words, onBubbleClick, excludeRef }: BubbleWordCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const physicsRef = useRef<Map<string, BubblePhysics>>(new Map());
  const wordsRef = useRef(words);
  const dimsRef = useRef(dimensions);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  // Mouse tracking
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0, y: 0, active: false,
  });

  // Keep refs in sync
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);
  useEffect(() => {
    dimsRef.current = dimensions;
  }, [dimensions]);

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

  // Mouse tracking on container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onLeave = () => { mouseRef.current.active = false; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Sync physics state when words change
  useEffect(() => {
    const physics = physicsRef.current;
    const currentWords = new Set(words.map((w) => w.word));
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const minD = Math.min(dimensions.width, dimensions.height);

    // Remove deleted words
    for (const key of physics.keys()) {
      if (!currentWords.has(key)) physics.delete(key);
    }

    // Add new words with tangential velocity for orbital motion
    for (const entry of words) {
      if (!physics.has(entry.word)) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * minD * 0.25;
        // Strong tangential velocity for real orbits
        const speed = 70 + Math.random() * 50;
        physics.set(entry.word, {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          vx: -Math.sin(angle) * speed,
          vy: Math.cos(angle) * speed,
        });
      }
    }
  }, [words, dimensions]);

  // Physics simulation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      let dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      dt = Math.min(dt, 0.033);

      const currentWords = wordsRef.current;
      const dims = dimsRef.current;
      const physics = physicsRef.current;
      const cx = dims.width / 2;
      const cy = dims.height / 2;
      const minD = Math.min(dims.width, dims.height);
      const padding = 20;

      // Build items array
      const items: { word: string; size: number; mass: number; phys: BubblePhysics }[] = [];
      for (const entry of currentWords) {
        const phys = physics.get(entry.word);
        if (phys) {
          const size = getBubbleSize(entry.hp, minD);
          items.push({
            word: entry.word,
            size,
            mass: size * size, // mass proportional to area
            phys,
          });
        }
      }

      // Find the biggest mass value, then collect all anchors (ties included)
      let biggestMass = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].mass > biggestMass) biggestMass = items[i].mass;
      }
      const anchors = items.filter((it) => it.mass === biggestMass);
      const anchorSet = new Set(anchors.map((a) => a.word));

      const mouse = mouseRef.current;

      // Compute and apply forces
      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        const isAnchor = anchorSet.has(a.word);

        let fx = 0;
        let fy = 0;

        if (isAnchor) {
          // Anchors locked to screen center — strong pull + heavy damping
          const dxC = cx - a.phys.x;
          const dyC = cy - a.phys.y;
          fx += dxC * 1.5;
          fy += dyC * 1.5;
          // Extra damping so anchors barely move
          a.phys.vx *= 0.85;
          a.phys.vy *= 0.85;
        } else {
          // Non-anchors: gravity toward each anchor, scaled by anchor size
          for (const anchor of anchors) {
            const dx = anchor.phys.x - a.phys.x;
            const dy = anchor.phys.y - a.phys.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq) || 0.1;
            const minDist = (a.size + anchor.size) / 2 + 8;

            // anchorPower: how massive the anchor is (1 = smallest possible, ~3-4 = max 25hp)
            const anchorPower = Math.sqrt(anchor.mass) / 200;

            // Gravity scales with anchor power → bigger anchor pulls harder & closer
            const G = 0.3 + anchorPower * 0.432;
            const softDist = Math.max(distSq, minDist * minDist * 0.5);
            const gravForce = (G * anchor.mass) / softDist;
            fx += (dx / dist) * gravForce * (60 + anchorPower * 60);
            fy += (dy / dist) * gravForce * (60 + anchorPower * 60);

            // Clockwise vortex scales with anchor power → bigger = faster spin
            const vortexStrength = 25 + anchorPower * 35;
            // Tangent clockwise: (dy, -dx) normalized
            fx += (dy / dist) * vortexStrength;
            fy += (-dx / dist) * vortexStrength;
          }

          // Very light center pull as safety net
          const dxC = cx - a.phys.x;
          const dyC = cy - a.phys.y;
          fx += dxC * 0.02;
          fy += dyC * 0.02;
        }

        // Bubble-bubble repulsion — enough to prevent overlap but not push away
        for (let j = 0; j < items.length; j++) {
          if (i === j) continue;
          const b = items[j];
          const dx = b.phys.x - a.phys.x;
          const dy = b.phys.y - a.phys.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const minDist = (a.size + b.size) / 2 + 12;

          if (dist < minDist) {
            const overlap = minDist - dist;
            const repulse = 500 * (overlap / minDist);
            fx -= (dx / dist) * repulse;
            fy -= (dy / dist) * repulse;
          }
        }

        // Mouse cursor repulsion (gentle push)
        if (mouse.active) {
          const mdx = a.phys.x - mouse.x;
          const mdy = a.phys.y - mouse.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy) || 0.1;
          const repulseRadius = a.size * 0.8 + 60;
          if (mDist < repulseRadius) {
            const strength = 200 * (1 - mDist / repulseRadius);
            fx += (mdx / mDist) * strength;
            fy += (mdy / mDist) * strength;
          }
        }

        // Boundary repulsion (soft)
        const hs = a.size / 2;
        if (a.phys.x - hs < padding)
          fx += 350 * ((padding - a.phys.x + hs) / padding);
        if (a.phys.x + hs > dims.width - padding)
          fx -= 350 * ((a.phys.x + hs - dims.width + padding) / padding);
        if (a.phys.y - hs < padding)
          fy += 350 * ((padding - a.phys.y + hs) / padding);
        if (a.phys.y + hs > dims.height - padding)
          fy -= 350 * ((a.phys.y + hs - dims.height + padding) / padding);

        // Exclusion zone repulsion (leaderboard / UI elements)
        if (excludeRef?.current && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const exRect = excludeRef.current.getBoundingClientRect();
          // Convert to local coordinates with margin
          const margin = 20;
          const zoneLeft = exRect.left - containerRect.left - margin;
          const zoneTop = exRect.top - containerRect.top - margin;
          const zoneRight = exRect.right - containerRect.left + margin;
          const zoneBottom = exRect.bottom - containerRect.top + margin;

          // Check if bubble overlaps the exclusion zone
          const bLeft = a.phys.x - hs;
          const bRight = a.phys.x + hs;
          const bTop = a.phys.y - hs;
          const bBottom = a.phys.y + hs;

          if (bRight > zoneLeft && bLeft < zoneRight && bBottom > zoneTop && bTop < zoneBottom) {
            // Find the shortest escape direction
            const escapeLeft = bRight - zoneLeft;   // push left
            const escapeRight = zoneRight - bLeft;   // push right
            const escapeUp = bBottom - zoneTop;      // push up
            const escapeDown = zoneBottom - bTop;    // push down
            const minEscape = Math.min(escapeLeft, escapeRight, escapeUp, escapeDown);
            const pushStrength = 1000;

            if (minEscape === escapeLeft) {
              fx -= pushStrength * (escapeLeft / (hs * 2 + margin));
            } else if (minEscape === escapeRight) {
              fx += pushStrength * (escapeRight / (hs * 2 + margin));
            } else if (minEscape === escapeUp) {
              fy -= pushStrength * (escapeUp / (hs * 2 + margin));
            } else {
              fy += pushStrength * (escapeDown / (hs * 2 + margin));
            }
          }
        }

        // Semi-implicit Euler + very light damping (preserves orbital motion)
        const damping = 0.997;
        a.phys.vx = (a.phys.vx + fx * dt) * damping;
        a.phys.vy = (a.phys.vy + fy * dt) * damping;

        // Clamp max velocity to prevent explosions
        const maxVel = 300;
        const vel = Math.sqrt(a.phys.vx * a.phys.vx + a.phys.vy * a.phys.vy);
        if (vel > maxVel) {
          a.phys.vx = (a.phys.vx / vel) * maxVel;
          a.phys.vy = (a.phys.vy / vel) * maxVel;
        }

        a.phys.x += a.phys.vx * dt;
        a.phys.y += a.phys.vy * dt;

        // Hard clamp to bounds
        a.phys.x = Math.max(
          hs + 2,
          Math.min(dims.width - hs - 2, a.phys.x)
        );
        a.phys.y = Math.max(
          hs + 2,
          Math.min(dims.height - hs - 2, a.phys.y)
        );
      }

      forceRender();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const minDim = Math.min(dimensions.width, dimensions.height);

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
          left: centerX - 120,
          top: centerY - 120,
          width: 240,
          height: 240,
          background:
            "radial-gradient(circle, rgba(108,59,255,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <AnimatePresence>
        {words.map((entry) => {
          const phys = physicsRef.current.get(entry.word);
          if (!phys) return null;
          const size = getBubbleSize(entry.hp, minDim);
          return (
            <PhysicsBubble
              key={entry.word}
              entry={entry}
              x={phys.x}
              y={phys.y}
              size={size}
              onClick={() => onBubbleClick?.(entry.word)}
            />
          );
        })}
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
          Tape un mot pour commencer...
        </div>
      )}
    </div>
  );
}

// --- Physics Bubble ---

interface PhysicsBubbleProps {
  entry: WordEntry;
  x: number;
  y: number;
  size: number;
  onClick: () => void;
}

function PhysicsBubble({ entry, x, y, size, onClick }: PhysicsBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const fontSize = Math.max(10, Math.min(size * 0.2, 16));
  const hue = 260 + (entry.word.charCodeAt(0) % 5) * 8;
  const dotSize = Math.max(4, size * 0.06);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHit(true);
    setTimeout(() => setIsHit(false), 300);
    onClick();
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        scale: [1, 1.5, 0],
        opacity: [1, 0.5, 0],
        filter: ["blur(0px)", "blur(0px)", "blur(8px)"],
        transition: { duration: 0.45, times: [0, 0.25, 1] },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="absolute cursor-pointer select-none"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        zIndex: isHovered ? 50 : 10,
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(108,59,255,${isHovered ? 0.3 : 0.15}) 0%, transparent 70%)`,
          transform: `scale(${isHovered ? 1.8 : 1.4})`,
          filter: "blur(10px)",
          transition: "transform 0.4s ease, background 0.4s ease",
        }}
      />

      {/* Bubble sphere */}
      <div
        className="absolute inset-0 rounded-full flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: `radial-gradient(circle at 35% 30%, 
            rgba(${hue === 260 ? "154,107,255" : "125,130,255"},${isHovered ? 0.35 : 0.2}) 0%, 
            rgba(108,59,255,${isHovered ? 0.25 : 0.12}) 40%, 
            rgba(20,10,53,${isHovered ? 0.7 : 0.5}) 100%)`,
          border: `1px solid rgba(${isHit ? "255,100,100" : "108,59,255"},${isHit ? 0.7 : isHovered ? 0.5 : 0.2})`,
          boxShadow: isHit
            ? "0 0 25px rgba(255,80,80,0.5), inset 0 0 20px rgba(255,80,80,0.15)"
            : isHovered
              ? "0 0 30px rgba(108,59,255,0.3), 0 0 60px rgba(108,59,255,0.1), inset 0 0 30px rgba(108,59,255,0.1)"
              : "0 0 15px rgba(108,59,255,0.1), inset 0 0 20px rgba(108,59,255,0.05)",
          backdropFilter: "blur(4px)",
          transform: `scale(${isHit ? 0.88 : isHovered ? 1.08 : 1})`,
          transition:
            "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
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
            background:
              "linear-gradient(180deg, rgba(244,246,255,0.12) 0%, transparent 100%)",
            filter: "blur(2px)",
            borderRadius: "50%",
          }}
        />

        {/* Word text */}
        <span
          className="relative z-10 text-center select-none px-2"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: `${fontSize}px`,
            fontWeight: 500,
            color: isHovered ? "#F4F6FF" : "rgba(244,246,255,0.85)",
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
          {entry.word}
        </span>

        {/* HP dots: red = 5hp, blue = 1hp */}
        <div className="relative z-10 flex gap-[2px] mt-1 flex-wrap justify-center" style={{ maxWidth: '80%' }}>
          {(() => {
            const redDots = Math.floor(entry.hp / 5);
            const blueDots = entry.hp % 5;
            const dots: React.ReactNode[] = [];
            for (let i = 0; i < redDots; i++) {
              dots.push(
                <div
                  key={`r${i}`}
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: "50%",
                    background: "rgba(255,80,80,0.9)",
                    boxShadow: "0 0 4px rgba(255,80,80,0.5)",
                    transition: "background 0.3s ease, box-shadow 0.3s ease",
                  }}
                />
              );
            }
            for (let i = 0; i < blueDots; i++) {
              dots.push(
                <div
                  key={`b${i}`}
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: "50%",
                    background: "rgba(125,249,255,0.8)",
                    boxShadow: "0 0 4px rgba(125,249,255,0.4)",
                    transition: "background 0.3s ease, box-shadow 0.3s ease",
                  }}
                />
              );
            }
            return dots;
          })()}
        </div>
      </div>
    </motion.div>
  );
}
