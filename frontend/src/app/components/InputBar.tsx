import { useState } from "react";
import { motion } from "motion/react";
import { Send, Zap } from "lucide-react";

interface InputBarProps {
  onSubmit: (word: string) => void;
}

export function InputBar({ onSubmit }: InputBarProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toLowerCase().replace(/[^a-zA-ZÀ-ÿ\-]/g, "");
    if (!trimmed) return;

    setIsSubmitting(true);
    onSubmit(trimmed);
    setValue("");
    setTimeout(() => setIsSubmitting(false), 400);
  };

  return (
    <div className="relative z-10 flex justify-center px-6 py-4">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[80px] rounded-full pointer-events-none transition-opacity duration-500"
        style={{
          background: "radial-gradient(ellipse, rgba(108,59,255,0.12) 0%, transparent 70%)",
          filter: "blur(30px)",
          opacity: isFocused ? 1 : 0.4,
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative flex items-center w-full max-w-xl transition-all duration-300"
        style={{
          background: "rgba(20, 10, 53, 0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${isFocused ? "rgba(108,59,255,0.5)" : "rgba(108,59,255,0.15)"}`,
          borderRadius: "9999px",
          boxShadow: isFocused
            ? "0 0 30px rgba(108,59,255,0.15), 0 0 60px rgba(108,59,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        {/* Network icon */}
        <div className="flex items-center pl-5 pr-1">
          <Zap
            size={18}
            style={{
              color: isFocused ? "#7DF9FF" : "rgba(154,107,255,0.5)",
              transition: "color 0.3s ease",
            }}
          />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Enter a word..."
          maxLength={30}
          className="flex-1 bg-transparent outline-none py-4 px-3"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.95rem",
            fontWeight: 400,
            color: "#F4F6FF",
            caretColor: "#6C3BFF",
          }}
        />

        <motion.button
          type="submit"
          disabled={!value.trim()}
          whileHover={value.trim() ? { scale: 1.08 } : {}}
          whileTap={value.trim() ? { scale: 0.92 } : {}}
          className="flex items-center justify-center mr-2 cursor-pointer"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "9999px",
            background: value.trim()
              ? "linear-gradient(135deg, #6C3BFF 0%, #9A6BFF 100%)"
              : "rgba(108,59,255,0.15)",
            boxShadow: value.trim()
              ? "0 0 20px rgba(108,59,255,0.4), 0 0 40px rgba(108,59,255,0.1)"
              : "none",
            transition: "background 0.3s ease, box-shadow 0.3s ease",
          }}
        >
          <Send
            size={16}
            style={{
              color: value.trim() ? "#F4F6FF" : "rgba(154,107,255,0.4)",
              transform: "rotate(-45deg)",
              transition: "color 0.3s ease",
            }}
          />
        </motion.button>
      </form>
    </div>
  );
}