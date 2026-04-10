"use client";

import { GameStats } from "@/lib/storage";

interface StatsModalProps {
  stats: GameStats;
  gameTitle: string;
  color: string;
  onClose: () => void;
}

export default function StatsModal({
  stats,
  gameTitle,
  color,
  onClose,
}: StatsModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color }}>
            {gameTitle} Stats
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.played}</div>
            <div className="text-xs text-gray-500">Played</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {stats.played ? Math.round((stats.won / stats.played) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500">Win %</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.currentStreak}</div>
            <div className="text-xs text-gray-500">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.maxStreak}</div>
            <div className="text-xs text-gray-500">Best</div>
          </div>
        </div>
      </div>
    </div>
  );
}
