export function getDailySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export function getDayIndex(): number {
  return Math.floor(Date.now() / 86400000);
}

export function getPuzzleNumber(startDate: string = "2026-04-10"): number {
  const start = new Date(startDate).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.floor((now - start) / 86400000) + 1;
}

export function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}
