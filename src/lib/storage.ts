import { getDayIndex } from "./daily-seed";

export interface GameStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDay: number;
  distribution: number[];
  todayResult?: {
    completed: boolean;
    score: number;
    shareText: string;
  };
}

const DEFAULT_STATS: GameStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDay: 0,
  distribution: [],
};

function getKey(gameId: string): string {
  return `mini-games-${gameId}`;
}

export function getStats(gameId: string): GameStats {
  if (typeof window === "undefined") return { ...DEFAULT_STATS };
  try {
    const raw = localStorage.getItem(getKey(gameId));
    if (!raw) return { ...DEFAULT_STATS };
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveResult(
  gameId: string,
  score: number,
  shareText: string,
  won: boolean = true
): void {
  const stats = getStats(gameId);
  const today = getDayIndex();

  stats.played++;
  if (won) stats.won++;

  if (stats.lastPlayedDay === today - 1) {
    stats.currentStreak = won ? stats.currentStreak + 1 : 0;
  } else if (stats.lastPlayedDay !== today) {
    stats.currentStreak = won ? 1 : 0;
  }

  stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  stats.lastPlayedDay = today;

  while (stats.distribution.length <= score) {
    stats.distribution.push(0);
  }
  stats.distribution[score]++;

  stats.todayResult = { completed: true, score, shareText };

  localStorage.setItem(getKey(gameId), JSON.stringify(stats));
}

export function hasPlayedToday(gameId: string): boolean {
  const stats = getStats(gameId);
  return stats.lastPlayedDay === getDayIndex();
}

export function saveHighScore(gameId: string, score: number): void {
  const key = `mini-games-${gameId}-highscore`;
  if (typeof window === "undefined") return;
  const current = parseInt(localStorage.getItem(key) || "0", 10);
  if (score > current) {
    localStorage.setItem(key, score.toString());
  }
}

export function getHighScore(gameId: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`mini-games-${gameId}-highscore`) || "0", 10);
}
