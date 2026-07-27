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

/** Genera el label de temporada (año cruzado por defecto: "2025/2026"). */
export function getSeasonLabel(year: number): string {
  if (year === null || year === undefined || isNaN(year) || !isFinite(year)) {
    return String(year);
  }
  return `${year}/${year + 1}`;
}

// ── Selección global de temporada (persiste durante la sesión) ────────────────

const SESSION_KEY = 'selectedTemporada';

/**
 * Devuelve la temporada seleccionada por el usuario en esta sesión.
 * En modo demo cae a la temporada actual si no hay selección almacenada.
 */
export function getSelectedSeason(): string {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    return stored;
  }
  return getCurrentSeasonString();
}

/** Devuelve el label visual de la temporada seleccionada (ej. "2025/2026"). */
export function getSelectedSeasonLabel(): string {
  const year = parseInt(getSelectedSeason(), 10);
  return isNaN(year) ? getSelectedSeason() : getSeasonLabel(year);
}

/** Guarda la temporada seleccionada en sessionStorage y localStorage. */
export function setSelectedSeason(year: string): void {
  sessionStorage.setItem(SESSION_KEY, year);
  localStorage.setItem('temporada', year);
}

/** Limpia la temporada seleccionada de la sesión (llamar al hacer logout). */
export function clearSelectedSeason(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('temporada');
}

// ── Caché del catálogo de temporadas del club ─────────────────────────────────

const CLUB_SEASONS_CACHE_KEY = 'clubSeasonsCache';

/** Entrada mínima del catálogo de temporadas del club cacheado. */
export interface CachedClubSeason {
  year: string;
  label: string;
  current: boolean;
}

/** Devuelve el catálogo de temporadas del club cacheado (o array vacío). */
export function getClubSeasonsCache(): CachedClubSeason[] {
  try {
    const raw = sessionStorage.getItem(CLUB_SEASONS_CACHE_KEY)
      ?? localStorage.getItem(CLUB_SEASONS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s: any) => s && typeof s.year === 'string');
  } catch {
    return [];
  }
}

/** Guarda el catálogo real de seasons del club en la caché de sesión. */
export function setClubSeasonsCache(seasons: CachedClubSeason[]): void {
  try {
    const payload = JSON.stringify(seasons || []);
    sessionStorage.setItem(CLUB_SEASONS_CACHE_KEY, payload);
    localStorage.setItem(CLUB_SEASONS_CACHE_KEY, payload);
  } catch {
    // sessionStorage puede no estar disponible; las pantallas caerán al legacy.
  }
}

/** Limpia la caché del catálogo (lo llama clearSelectedSeason en logout). */
export function clearClubSeasonsCache(): void {
  try {
    sessionStorage.removeItem(CLUB_SEASONS_CACHE_KEY);
    localStorage.removeItem(CLUB_SEASONS_CACHE_KEY);
  } catch { /* idem */ }
}
