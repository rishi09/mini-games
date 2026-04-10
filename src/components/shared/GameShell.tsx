"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { msUntilMidnight } from "@/lib/daily-seed";

interface GameShellProps {
  title: string;
  color: string;
  puzzleNumber?: number;
  children: React.ReactNode;
  onShowStats?: () => void;
  hideCountdown?: boolean;
}

function formatCountdown(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function GameShell({
  title,
  color,
  puzzleNumber,
  children,
  onShowStats,
  hideCountdown,
}: GameShellProps) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const update = () => setCountdown(formatCountdown(msUntilMidnight()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <Link
          href="/"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm">Games</span>
        </Link>

        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold" style={{ color }}>
            {title}
          </h1>
          {puzzleNumber && (
            <span className="text-xs text-gray-400">#{puzzleNumber}</span>
          )}
        </div>

        {onShowStats ? (
          <button
            onClick={onShowStats}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
          </button>
        ) : (
          <div className="w-5" />
        )}
      </header>

      <main className="flex-1 flex flex-col items-center w-full max-w-[500px] mx-auto px-4 py-4">
        {children}
      </main>

      {!hideCountdown && (
        <footer className="text-center text-xs text-gray-400 py-3 border-t border-gray-100">
          Next puzzle in {countdown}
        </footer>
      )}
    </div>
  );
}
