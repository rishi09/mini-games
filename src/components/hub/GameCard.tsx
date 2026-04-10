"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasPlayedToday } from "@/lib/storage";

interface GameCardProps {
  title: string;
  description: string;
  href: string;
  color: string;
  icon: string;
  gameId: string;
}

export default function GameCard({
  title,
  description,
  href,
  color,
  icon,
  gameId,
}: GameCardProps) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(hasPlayedToday(gameId));
  }, [gameId]);

  return (
    <Link
      href={href}
      className="relative block rounded-2xl p-5 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}30)`,
        border: `2px solid ${color}40`,
      }}
    >
      {completed && (
        <div
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: color }}
        >
          ✓
        </div>
      )}
      <div className="text-3xl mb-2">{icon}</div>
      <h2 className="text-lg font-bold mb-1" style={{ color }}>
        {title}
      </h2>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
