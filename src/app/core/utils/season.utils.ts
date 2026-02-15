/**
 * Gets the current season start year.
 * If the current month is August (8) or later, the season is currentYear/currentYear+1.
 * If before August, the season is (currentYear-1)/currentYear.
 */
export function getCurrentSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; // Month is 0-indexed, July=6, August=7
}

/**
 * Generates an array of season objects for use in select dropdowns.
 * Returns seasons from startYear to current season + 1.
 * Each object has { value: '2022', label: '2022/2023' }
 */
export function getSeasons(startYear: number = 2022): { value: string; label: string }[] {
  const currentSeasonYear = getCurrentSeasonYear();
  const endYear = currentSeasonYear + 1; // Include next season
  const seasons: { value: string; label: string }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    seasons.push({ value: String(y), label: `${y}/${y + 1}` });
  }
  return seasons;
}

/**
 * Returns the current season year as a string (e.g., '2025')
 */
export function getCurrentSeasonString(): string {
  return String(getCurrentSeasonYear());
}
