/**
 * Modelos del feature "Mi temporada".
 *
 * El backend mantiene un catálogo `seasons` por club, donde una sola temporada
 * está marcada como "actual" (`current=true`). El club_id de la temporada actual
 * vive además en `clubs.current_season_id` para acceso rápido.
 *
 * IMPORTANTE: las tablas existentes (teams, matches, etc.) siguen usando el
 * campo `temporada` (VARCHAR ahora hasta 50 chars; históricamente "YYYY") —
 * la entidad Season es solo un catálogo + flag de "actual". El club puede
 * usar texto libre como nombre de temporada ("Liga 25-26", "Pretemporada
 * 2026"…), siempre que no supere los 50 caracteres.
 *
 * NOTA: El backend serializa el campo Java `private boolean current` como
 * `current: boolean` (Jackson omite el prefijo `is`). Por eso el cliente
 * usa `current: boolean`, NO `isCurrent: number`.
 */

/** Una temporada del catálogo del club. */
export interface Season {
  /** PK en la tabla seasons. */
  seasonId: number;
  clubId: number;
  /**
   * Identificador/nombre de la temporada (texto libre, máx. 50 chars).
   * Coincide con el valor guardado en `teams.temporada` y demás tablas
   * relacionadas. Históricamente era "YYYY" (ej. "2025"); desde la v.X
   * puede ser cualquier cadena ("Liga 25-26", "Pretemporada 2026", "2025/26"…).
   */
  year: string;
  /** Fecha ISO ("YYYY-MM-DD") en la que empieza esta temporada para el club. */
  startDate: string;
  /**
   * Fecha de fin de la temporada en formato ISO. Si el admin la editó, refleja
   * ese valor explícito; si no, el backend la calcula como
   * `startDate + 1 año - 1 día`.
   */
  endDate?: string;
  /**
   * Etiqueta visual ya formateada por el backend. Para nombres "YYYY" puede
   * ser "2025/2026" según la config del club; para nombres libres coincide
   * con `year`.
   */
  label: string;
  /** true si es la temporada actual del club. Tal como lo serializa el backend. */
  current: boolean;
  /** "active" | "archived". */
  status: string;
  /** Fecha de creación ISO (puede no venir en todos los endpoints). */
  createdAt?: string;
}

/** Resultado del rollover de jugadores entre dos temporadas del mismo club. */
export interface SeasonRolloverResult {
  fromSeasonYear: string;
  toSeasonYear: string;
  /** Jugadores movidos efectivamente al equipo "Renovaciones". */
  playersMoved: number;
  /** Jugadores excluidos por `pago_teams_players.jugador_baja=1`. */
  playersSkippedBaja: number;
  /** team_id del equipo "Renovaciones" de la temporada destino. */
  renovationsTeamId: number;
}

/**
 * Estado del banner que aparece al admin del club cuando el fin de la
 * temporada actual está próximo y todavía no hay una temporada del año
 * siguiente.
 */
export interface SeasonBannerStatus {
  /** Si true, mostrar el banner "Crea la nueva temporada". */
  showBanner: boolean;
  /**
   * Sugerencia de la próxima temporada. Solo se rellena cuando la actual es
   * exactamente un entero (formato legacy "YYYY"); para nombres libres el
   * backend devuelve `undefined`/null y el cliente deja al usuario teclearlo.
   */
  suggestedNextYear?: string;
  /** Días que faltan para el fin de la temporada actual (puede ser negativo si ya pasó). */
  daysToSeasonEnd?: number;
  /** Identificador de la temporada actual (texto libre) si existe. */
  currentSeasonYear?: string;
}

/** Body para `POST /rest/club/{clubId}/seasons`. */
export interface CreateSeasonRequest {
  /**
   * Identificador/nombre de la temporada (texto libre, máx. 50 chars).
   * Si se omite, el backend calcula el siguiente número (solo si la
   * temporada actual del club tenía formato numérico).
   */
  year?: string;
  /** Fecha de inicio ISO; si se omite, el backend usa la config del club. */
  startDate?: string;
  /** Fecha de fin ISO; si se omite, el backend la calculará como start + 1y - 1d. */
  endDate?: string;
  /** Si true, marca la nueva temporada como actual de inmediato. */
  setAsCurrent?: boolean;
}

/** Body para `PUT /rest/club/{clubId}/seasons/{seasonId}` (dueño del club o admin). */
export interface UpdateSeasonRequest {
  /** Nuevo nombre/identificador (texto libre, máx. 50 chars). Si se omite, no se cambia. */
  year?: string;
  /** Nueva fecha de inicio ISO. Si se omite, no se cambia. */
  startDate?: string;
  /** Nueva fecha de fin ISO. Si se omite, no se cambia. */
  endDate?: string;
}

/** Body para `POST /rest/club/{clubId}/seasons/rollover`. */
export interface RolloverPlayersRequest {
  fromSeasonId: number;
  toSeasonId: number;
}

/**
 * Resumen de los datos asociados a una temporada concreta. Devuelto por:
 *  - `GET /rest/club/{clubId}/seasons/{seasonId}/usage` (200 OK).
 *  - `DELETE /rest/club/{clubId}/seasons/{seasonId}` cuando devuelve 409 con
 *    `error.msg = "season_has_data"`, en cuyo caso el `data` del wrapper
 *    contiene el detalle de qué impide el archivado.
 *
 * Una temporada se considera "vacía y archivable" si `realTeams === 0` y
 * `players === 0`. Los placeholders (`Renovaciones`, `Nuevas inscripciones`,
 * `Sin equipo`) sin jugadores se borran automáticamente al archivar.
 */
export interface SeasonUsage {
  /** Equipos no placeholder con `deleted=0` en la temporada. */
  realTeams: number;
  /** Equipos placeholder con `deleted=0` en la temporada. */
  placeholderTeams: number;
  /** Jugadores únicos vinculados a algún equipo de la temporada. */
  players: number;
}

/** Body para `POST /rest/club/{clubId}/seasons/initialize` (admin Sphaira). */
export interface InitializeSeasonRequest {
  /**
   * Identificador/nombre de la temporada (texto libre, máx. 50 chars).
   * Si se omite, el backend usa la temporada calculada vía
   * `Utils.getTemporadaActual` (siempre formato "YYYY").
   */
  year?: string;
  /** Fecha de inicio ISO. Si se omite, el backend la deriva de la config del club. */
  startDate?: string;
  /** Fecha de fin ISO. Si se omite, el backend la calcula como start + 1y - 1d. */
  endDate?: string;
}
