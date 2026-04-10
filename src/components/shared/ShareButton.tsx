"use client";

import { useState } from "react";
import { shareResult } from "@/lib/share";

interface ShareButtonProps {
  text: string;
  color: string;
}

export default function ShareButton({ text, color }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  const handleShare = async () => {
    const result = await shareResult(text);
    if (result === "copied") {
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="px-6 py-3 rounded-full text-white font-semibold text-sm transition-all active:scale-95"
      style={{ backgroundColor: color }}
    >
      {status === "copied" ? "Copied!" : "Share Results"}
    </button>
  );
}
