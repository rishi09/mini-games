export function getDayIndex(): number {
  return Math.floor(Date.now() / 86400000);
}

// Use the same UTC epoch-day as getDayIndex so puzzle selection and
// hasPlayedToday() always agree on where "today" begins.
export function getDailySeed(): number {
  return getDayIndex();
}

export function getPuzzleNumber(startDate: string = "2026-04-10"): number {
  const startEpochDay = Math.floor(new Date(startDate).getTime() / 86400000);
  return getDayIndex() - startEpochDay + 1;
}

export function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}
