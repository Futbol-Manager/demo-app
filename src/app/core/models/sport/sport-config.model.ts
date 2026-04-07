export interface StatField {
  key: string;
  labelKey: string;
  icon?: string;
}

export interface SportConfig {
  key: string;
  labelKey: string;
  emoji: string;
  fieldName: string;
  scoringUnit: string;
  scoringUnitPlural: string;
  hasGoalkeeper: boolean;
  positions: string[];
  matchStatsFields: StatField[];
  playerStatsColumns: string[];
  leagueOptions: string[];
  tacticalBoardBg: string;
  formations: string[];
  playersOnField: number;
  /** i18n key for "Pie/Mano/Brazo/Lado dominante" column label */
  dominantLimbKey: string;
  /** i18n key for "Habilidad con balón" / equivalent skill axis */
  skillLabelKey: string;
  /**
   * Opcional: clave i18n del título de la página de máximos anotadores.
   * Si no se define, se infiere en getSportConfig() según el deporte.
   */
  topScorersTitleKey?: string;
  /**
   * Opcional: subcadenas (minúsculas) para detectar portero en texto de posición.
   * Si no se define, se usa un valor por defecto cuando hasGoalkeeper es true.
   */
  goalkeeperMarkers?: string[];

  /** Contexto específico del deporte para el asistente IA */
  aiContextPrompt?: string;
  /** Estructura de periodos del partido */
  matchPeriods?: MatchPeriod;
  /** Reglas de alerta automática post-partido */
  alertRules?: SportAlertRule[];
  /** Zonas tácticas del campo/pista */
  tacticalZones?: TacticalZone[];
  /** Requisitos físicos del deporte (para compatibilidad cross-deporte) */
  physicalRequirements?: PhysicalRequirement[];
  /** Umbrales de bienestar para este deporte */
  wellnessThreshold?: WellnessThreshold;
  /** Plantilla de texto para auto-post RRSS post-partido */
  postTemplate?: string;
}

// --- Nuevas interfaces para mejoras multi-deporte ---

/** Periodo de un partido (cuartos, sets, innings, etc.) */
export interface MatchPeriod {
  label: string;
  labelKey: string;
  count: number;
  durationMin?: number;
  hasOvertime?: boolean;
}

/** Regla de alerta deportiva */
export interface SportAlertRule {
  id: string;
  fieldKey: string;
  threshold: number;
  direction: 'above' | 'below';
  messageKey: string;
  severity: 'info' | 'warning' | 'critical';
}

/** Zona táctica en el campo/pista */
export interface TacticalZone {
  id: string;
  labelKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Habilidad física requerida para comparativa cross-deporte */
export interface PhysicalRequirement {
  skill: 'speed' | 'strength' | 'endurance' | 'agility' | 'height' | 'coordination';
  weight: number;
}

/** Umbrales de bienestar del jugador */
export interface WellnessThreshold {
  low: number;
  medium: number;
}

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  futbol: {
    key: 'futbol',
    labelKey: 'EQUIPOS.SPORTS.futbol',
    emoji: '⚽',
    fieldName: 'Campo',
    scoringUnit: 'Gol',
    scoringUnitPlural: 'Goles',
    hasGoalkeeper: true,
    positions: [
      'Portero', 'Defensa Central', 'Lateral Derecho', 'Lateral Izquierdo',
      'Defensa', 'Mediocentro Defensivo', 'Mediocentro', 'Mediocentro Ofensivo',
      'Centrocampista', 'Extremo Derecho', 'Extremo Izquierdo',
      'Mediapunta', 'Delantero Centro', 'Delantero'
    ],
    matchStatsFields: [
      { key: 'golesAFavor',        labelKey: 'CALENDARIO.GOALS_FOR',        icon: 'bi-trophy' },
      { key: 'golesEnContra',      labelKey: 'CALENDARIO.GOALS_AGAINST',    icon: 'bi-shield' },
      { key: 'paradasPortero',     labelKey: 'CALENDARIO.SAVES',            icon: 'bi-hand-thumbs-up' },
      { key: 'disparosAFavor',     labelKey: 'CALENDARIO.SHOTS_FOR',        icon: 'bi-bullseye' },
      { key: 'disparosEnContra',   labelKey: 'CALENDARIO.SHOTS_AGAINST',    icon: 'bi-bullseye' },
      { key: 'cornersAFavor',      labelKey: 'CALENDARIO.CORNERS_FOR',      icon: 'bi-flag' },
      { key: 'cornersEnContra',    labelKey: 'CALENDARIO.CORNERS_AGAINST',  icon: 'bi-flag' },
      { key: 'faltasRecibidas',    labelKey: 'CALENDARIO.FOULS_RECEIVED',   icon: 'bi-exclamation-circle' },
      { key: 'faltasCometidas',    labelKey: 'CALENDARIO.FOULS_COMMITTED',  icon: 'bi-exclamation-circle' },
      { key: 'tarjetasAmarillas',  labelKey: 'CALENDARIO.YELLOW_CARDS',     icon: 'bi-square-fill' },
      { key: 'tarjetasRojas',      labelKey: 'CALENDARIO.RED_CARDS',        icon: 'bi-square-fill' },
      { key: 'penaltisAFavor',     labelKey: 'CALENDARIO.PENALTIES_FOR',    icon: 'bi-p-circle' },
      { key: 'penaltisEnContra',   labelKey: 'CALENDARIO.PENALTIES_AGAINST',icon: 'bi-p-circle' },
      { key: 'llegadasPeligroAFavor',   labelKey: 'CALENDARIO.ARRIVALS_FOR',   icon: 'bi-lightning' },
      { key: 'llegadasPeligroEnContra', labelKey: 'CALENDARIO.ARRIVALS_AGAINST',icon: 'bi-lightning' },
    ],
    playerStatsColumns: ['goles', 'asistencias', 'golesPenalti', 'tarjetasAmarillas', 'tarjetasRojas'],
    leagueOptions: [
      'LaLiga EA Sports', 'Liga F', 'LaLiga Hypermotion', 'Segunda RFEF Femenina',
      'Primera RFEF', 'Segunda RFEF', 'Tercera RFEF', 'Tercera RFEF Femenina',
      'Preferente Autonómica', 'Preferente Autonómica Femenina',
      'Primera Autonómica', 'Primera Autonómica Femenina',
      'Segunda Autonómica', 'Tercera Autonómica',
      'División de Honor', 'Liga Nacional', 'Liga Sub-23',
      'Superliga', 'Autonómica', 'Preferente',
      'Primera', 'Segunda', 'Tercera', 'Fútbol 5', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/futbol.svg',
    formations: ['4-4-2', '4-3-3', '4-2-3-1', '4-5-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1'],
    playersOnField: 11,
    dominantLimbKey: 'PLAYER.TBL_FOOT',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En fútbol, los KPIs clave son: goles, asistencias, xG (expected goals), presión alta, posesión y línea defensiva. Analiza tácticamente usando conceptos de: presión, bloque medio/bajo, transiciones, jugadas a balón parado. La formación titular influye en las zonas de presión.',
    matchPeriods: { label: 'Tiempos', labelKey: 'MATCH.PERIODS_HALVES', count: 2, durationMin: 45, hasOvertime: true },
    alertRules: [
      { id: 'low-goals', fieldKey: 'golesAFavor', threshold: 1, direction: 'below', messageKey: 'ALERTS.LOW_SCORING', severity: 'info' },
      { id: 'high-cards', fieldKey: 'tarjetasAmarillas', threshold: 3, direction: 'above', messageKey: 'ALERTS.HIGH_CARDS', severity: 'warning' },
    ],
    physicalRequirements: [
      { skill: 'speed', weight: 8 },
      { skill: 'endurance', weight: 9 },
      { skill: 'agility', weight: 7 },
      { skill: 'strength', weight: 6 },
      { skill: 'coordination', weight: 8 },
      { skill: 'height', weight: 4 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
    postTemplate: '{{emoji}} {{resultado}} | {{rivalName}}\n🏟️ {{competition}}\n⚽ Goleadores: {{scorers}}\n#{{clubHashtag}}',
  },

  baloncesto: {
    key: 'baloncesto',
    labelKey: 'EQUIPOS.SPORTS.baloncesto',
    emoji: '🏀',
    fieldName: 'Cancha',
    scoringUnit: 'Punto',
    scoringUnitPlural: 'Puntos',
    hasGoalkeeper: false,
    positions: ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'],
    matchStatsFields: [
      { key: 'golesAFavor',     labelKey: 'CALENDARIO.POINTS_FOR',     icon: 'bi-trophy' },
      { key: 'golesEnContra',   labelKey: 'CALENDARIO.POINTS_AGAINST', icon: 'bi-shield' },
      { key: 'rebotes',         labelKey: 'CALENDARIO.REBOUNDS',       icon: 'bi-arrow-repeat' },
      { key: 'asistencias',     labelKey: 'CALENDARIO.ASSISTS',        icon: 'bi-arrow-right-circle' },
      { key: 'tapones',         labelKey: 'CALENDARIO.BLOCKS',         icon: 'bi-hand-index' },
      { key: 'robos',           labelKey: 'CALENDARIO.STEALS',         icon: 'bi-scissors' },
      { key: 'triples',         labelKey: 'CALENDARIO.THREE_POINTERS', icon: 'bi-3-circle' },
      { key: 'faltasRecibidas', labelKey: 'CALENDARIO.FOULS_RECEIVED', icon: 'bi-exclamation-circle' },
      { key: 'faltasCometidas', labelKey: 'CALENDARIO.FOULS_COMMITTED',icon: 'bi-exclamation-circle' },
    ],
    playerStatsColumns: ['puntos', 'rebotes', 'asistencias', 'tapones', 'robos'],
    leagueOptions: [
      'ACB', 'LEB Oro', 'LEB Plata', 'EBA',
      'Liga Femenina Endesa', 'Liga Femenina 2',
      'Liga Autonómica', 'Liga Local', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/baloncesto.svg',
    formations: ['bas-2-3', 'bas-3-2', 'bas-1-3-1', 'bas-2-1-2'],
    playersOnField: 5,
    dominantLimbKey: 'PLAYER.TBL_HAND',
    skillLabelKey: 'PLAYER.SKILL_BALL_BASK',
    aiContextPrompt: 'En baloncesto, los KPIs clave son: puntos, rebotes (ofensivos/defensivos), asistencias, tapones, robos, +/- por cuarto, porcentaje de triples y tiros libres. Analiza por cuartos (Q1-Q4), rotaciones, foul trouble y momentum. Las jugadas clave son: pick & roll, transición rápida, sets defensivos.',
    matchPeriods: { label: 'Cuartos', labelKey: 'MATCH.PERIODS_QUARTERS', count: 4, durationMin: 10, hasOvertime: true },
    physicalRequirements: [
      { skill: 'speed', weight: 7 },
      { skill: 'endurance', weight: 7 },
      { skill: 'agility', weight: 8 },
      { skill: 'strength', weight: 6 },
      { skill: 'coordination', weight: 9 },
      { skill: 'height', weight: 9 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  balonmano: {
    key: 'balonmano',
    labelKey: 'EQUIPOS.SPORTS.balonmano',
    emoji: '🤾',
    fieldName: 'Pista',
    scoringUnit: 'Gol',
    scoringUnitPlural: 'Goles',
    hasGoalkeeper: true,
    positions: [
      'Portero', 'Extremo Derecho', 'Extremo Izquierdo',
      'Lateral Derecho', 'Lateral Izquierdo', 'Central', 'Pivote'
    ],
    matchStatsFields: [
      { key: 'golesAFavor',    labelKey: 'CALENDARIO.GOALS_FOR',      icon: 'bi-trophy' },
      { key: 'golesEnContra',  labelKey: 'CALENDARIO.GOALS_AGAINST',  icon: 'bi-shield' },
      { key: 'paradasPortero', labelKey: 'CALENDARIO.SAVES',          icon: 'bi-hand-thumbs-up' },
      { key: 'penaltisAFavor', labelKey: 'CALENDARIO.SEVEN_METERS_FOR',   icon: 'bi-p-circle' },
      { key: 'penaltisEnContra',labelKey: 'CALENDARIO.SEVEN_METERS_AGAINST', icon: 'bi-p-circle' },
      { key: 'tarjetasAmarillas', labelKey: 'CALENDARIO.YELLOW_CARDS', icon: 'bi-square-fill' },
      { key: 'tarjetasRojas',    labelKey: 'CALENDARIO.RED_CARDS',    icon: 'bi-square-fill' },
      { key: 'exclusiones',      labelKey: 'CALENDARIO.EXCLUSIONS',   icon: 'bi-clock' },
    ],
    playerStatsColumns: ['goles', 'asistencias', 'penaltis', 'exclusiones'],
    leagueOptions: [
      'Liga Sacyr ASOBAL', 'Primera Nacional', 'División de Honor Femenina',
      'Primera División Femenina', 'División de Honor Juvenil',
      'Liga Autonómica', 'Liga Local', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/balonmano.svg',
    formations: ['bm-6-0', 'bm-5-1', 'bm-4-2', 'bm-3-3'],
    playersOnField: 7,
    dominantLimbKey: 'PLAYER.TBL_HAND',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En balonmano, los KPIs clave son: goles, asistencias, exclusiones (2 min), paradas del portero (%), tiros a portería, eficiencia atacante. Analiza por: sistema defensivo (5:1, 6:0, 3:2:1), contraataques y juego en superioridad numérica.',
    matchPeriods: { label: 'Tiempos', labelKey: 'MATCH.PERIODS_HALVES', count: 2, durationMin: 30, hasOvertime: true },
    physicalRequirements: [
      { skill: 'speed', weight: 8 },
      { skill: 'endurance', weight: 8 },
      { skill: 'strength', weight: 9 },
      { skill: 'agility', weight: 7 },
      { skill: 'coordination', weight: 8 },
      { skill: 'height', weight: 7 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  voley: {
    key: 'voley',
    labelKey: 'EQUIPOS.SPORTS.voley',
    emoji: '🏐',
    fieldName: 'Pista',
    scoringUnit: 'Punto',
    scoringUnitPlural: 'Puntos',
    hasGoalkeeper: false,
    positions: ['Colocador', 'Opuesto', 'Central', 'Receptor-Atacante', 'Líbero'],
    matchStatsFields: [
      { key: 'golesAFavor',    labelKey: 'CALENDARIO.SETS_WON',      icon: 'bi-trophy' },
      { key: 'golesEnContra',  labelKey: 'CALENDARIO.SETS_LOST',     icon: 'bi-shield' },
      { key: 'puntos',         labelKey: 'CALENDARIO.POINTS',        icon: 'bi-123' },
      { key: 'aces',           labelKey: 'CALENDARIO.ACES',          icon: 'bi-lightning' },
      { key: 'bloqueos',       labelKey: 'CALENDARIO.BLOCKS',        icon: 'bi-hand-index' },
      { key: 'errores',        labelKey: 'CALENDARIO.ERRORS',        icon: 'bi-x-circle' },
    ],
    playerStatsColumns: ['puntos', 'aces', 'bloqueos', 'errores'],
    leagueOptions: [
      'Superliga', 'Superliga 2', 'División de Honor', 'Primera Nacional',
      'Liga Autonómica', 'Liga Local', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/voley.svg',
    formations: ['vol-5-1', 'vol-6-2', 'vol-4-2'],
    playersOnField: 6,
    dominantLimbKey: 'PLAYER.TBL_HAND',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En voleibol, los KPIs clave son: puntos, aces, errores, eficiencia de recepción (%), ataques exitosos, bloqueos. Analiza por sets (S1-S5), rotaciones de servicio, y posiciones (líbero, central, opuesto, receptor, colocador).',
    matchPeriods: { label: 'Sets', labelKey: 'MATCH.PERIODS_SETS', count: 5, hasOvertime: false },
    physicalRequirements: [
      { skill: 'speed', weight: 7 },
      { skill: 'endurance', weight: 7 },
      { skill: 'agility', weight: 9 },
      { skill: 'strength', weight: 6 },
      { skill: 'coordination', weight: 9 },
      { skill: 'height', weight: 8 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  'futbol-americano': {
    key: 'futbol-americano',
    labelKey: 'EQUIPOS.SPORTS.futbol-americano',
    emoji: '🏈',
    fieldName: 'Campo',
    scoringUnit: 'Punto',
    scoringUnitPlural: 'Puntos',
    hasGoalkeeper: false,
    positions: [
      'Quarterback', 'Running Back', 'Wide Receiver', 'Tight End',
      'Offensive Line', 'Linebacker', 'Cornerback', 'Safety',
      'Defensive End', 'Defensive Tackle', 'Kicker', 'Punter'
    ],
    matchStatsFields: [
      { key: 'golesAFavor',   labelKey: 'CALENDARIO.POINTS_FOR',     icon: 'bi-trophy' },
      { key: 'golesEnContra', labelKey: 'CALENDARIO.POINTS_AGAINST', icon: 'bi-shield' },
      { key: 'touchdowns',    labelKey: 'CALENDARIO.TOUCHDOWNS',     icon: 'bi-flag' },
      { key: 'fieldGoals',    labelKey: 'CALENDARIO.FIELD_GOALS',    icon: 'bi-bullseye' },
      { key: 'yardas',        labelKey: 'CALENDARIO.YARDS',          icon: 'bi-arrow-right' },
    ],
    playerStatsColumns: ['puntos', 'touchdowns', 'yardas', 'intercepciones'],
    leagueOptions: ['LNFA', 'Liga Autonómica', 'Liga Local', 'No federado'],
    tacticalBoardBg: 'assets/tactical/futbol-americano.svg',
    formations: ['af-shotgun', 'af-i-form', 'af-spread'],
    playersOnField: 11,
    dominantLimbKey: 'PLAYER.TBL_HAND',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En fútbol americano, los KPIs clave son: touchdowns, yardas por tierra/aire, field goals, turnovers, sacks. Analiza por: downs, situaciones de red zone, 4th down conversions, y presión al quarterback.',
    matchPeriods: { label: 'Cuartos', labelKey: 'MATCH.PERIODS_QUARTERS', count: 4, durationMin: 15, hasOvertime: true },
    physicalRequirements: [
      { skill: 'strength', weight: 9 },
      { skill: 'speed', weight: 9 },
      { skill: 'agility', weight: 8 },
      { skill: 'coordination', weight: 7 },
      { skill: 'endurance', weight: 6 },
      { skill: 'height', weight: 6 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  rugby: {
    key: 'rugby',
    labelKey: 'EQUIPOS.SPORTS.rugby',
    emoji: '🏉',
    fieldName: 'Campo',
    scoringUnit: 'Punto',
    scoringUnitPlural: 'Puntos',
    hasGoalkeeper: false,
    positions: [
      'Prop', 'Talonador', 'Segunda Línea', 'Flanker', 'Número 8',
      'Medio Melé', 'Apertura', 'Centro', 'Ala', 'Zaguero'
    ],
    matchStatsFields: [
      { key: 'golesAFavor',    labelKey: 'CALENDARIO.POINTS_FOR',    icon: 'bi-trophy' },
      { key: 'golesEnContra',  labelKey: 'CALENDARIO.POINTS_AGAINST',icon: 'bi-shield' },
      { key: 'ensayos',        labelKey: 'CALENDARIO.TRIES',         icon: 'bi-flag' },
      { key: 'transformaciones',labelKey: 'CALENDARIO.CONVERSIONS',  icon: 'bi-check-circle' },
      { key: 'penaltisAFavor', labelKey: 'CALENDARIO.PENALTY_GOALS', icon: 'bi-p-circle' },
      { key: 'tarjetasAmarillas',labelKey: 'CALENDARIO.YELLOW_CARDS',icon: 'bi-square-fill' },
      { key: 'tarjetasRojas',  labelKey: 'CALENDARIO.RED_CARDS',     icon: 'bi-square-fill' },
    ],
    playerStatsColumns: ['puntos', 'ensayos', 'transformaciones', 'tarjetas'],
    leagueOptions: [
      'División de Honor', 'Liga Nacional', 'Primera Autonómica',
      'Liga Autonómica', 'Liga Local', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/rugby.svg',
    formations: ['rug-standard', 'rug-expansivo'],
    playersOnField: 15,
    dominantLimbKey: 'PLAYER.TBL_HAND',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En rugby, los KPIs clave son: ensayos, transformaciones, penales de campo, placajes, metros ganados. Analiza por: fases de juego (ruck, maul, scrum, line-out), posición (delanteros vs tres-cuartos), y disciplina (tarjetas).',
    matchPeriods: { label: 'Tiempos', labelKey: 'MATCH.PERIODS_HALVES', count: 2, durationMin: 40, hasOvertime: false },
    physicalRequirements: [
      { skill: 'strength', weight: 10 },
      { skill: 'endurance', weight: 9 },
      { skill: 'speed', weight: 8 },
      { skill: 'agility', weight: 6 },
      { skill: 'coordination', weight: 7 },
      { skill: 'height', weight: 7 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  'futbol-sala': {
    key: 'futbol-sala',
    labelKey: 'EQUIPOS.SPORTS.futbol-sala',
    emoji: '👟',
    fieldName: 'Pista',
    scoringUnit: 'Gol',
    scoringUnitPlural: 'Goles',
    hasGoalkeeper: true,
    positions: ['Portero', 'Cierre', 'Ala Derecho', 'Ala Izquierdo', 'Pívot'],
    matchStatsFields: [
      { key: 'golesAFavor',      labelKey: 'CALENDARIO.GOALS_FOR',       icon: 'bi-trophy' },
      { key: 'golesEnContra',    labelKey: 'CALENDARIO.GOALS_AGAINST',   icon: 'bi-shield' },
      { key: 'paradasPortero',   labelKey: 'CALENDARIO.SAVES',           icon: 'bi-hand-thumbs-up' },
      { key: 'faltasRecibidas',  labelKey: 'CALENDARIO.FOULS_RECEIVED',  icon: 'bi-exclamation-circle' },
      { key: 'faltasCometidas',  labelKey: 'CALENDARIO.FOULS_COMMITTED', icon: 'bi-exclamation-circle' },
      { key: 'tarjetasAmarillas',labelKey: 'CALENDARIO.YELLOW_CARDS',    icon: 'bi-square-fill' },
      { key: 'tarjetasRojas',    labelKey: 'CALENDARIO.RED_CARDS',       icon: 'bi-square-fill' },
      { key: 'penaltisAFavor',   labelKey: 'CALENDARIO.PENALTIES_FOR',   icon: 'bi-p-circle' },
    ],
    playerStatsColumns: ['goles', 'asistencias', 'golesPenalti', 'tarjetasAmarillas', 'tarjetasRojas'],
    leagueOptions: [
      'Primera División LNFS', 'Segunda División LNFS', 'Segunda División B',
      'Tercera División', 'Liga Autonómica', 'Liga Local', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/futbol-sala.svg',
    formations: ['fs-2-2', 'fs-3-1', 'fs-1-2-1'],
    playersOnField: 5,
    dominantLimbKey: 'PLAYER.TBL_FOOT',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En fútbol sala, los KPIs clave son: goles, asistencias, rotaciones del portero-jugador (portero universal), faltas acumuladas (penalti doble a partir de la 5ª). Analiza: presión alta, sistema 4:0 o 3:1, y jugadas de saque de esquina.',
    matchPeriods: { label: 'Tiempos', labelKey: 'MATCH.PERIODS_HALVES', count: 2, durationMin: 20, hasOvertime: true },
    physicalRequirements: [
      { skill: 'speed', weight: 9 },
      { skill: 'agility', weight: 9 },
      { skill: 'endurance', weight: 8 },
      { skill: 'coordination', weight: 9 },
      { skill: 'strength', weight: 5 },
      { skill: 'height', weight: 3 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  hockey: {
    key: 'hockey',
    labelKey: 'EQUIPOS.SPORTS.hockey',
    emoji: '🏑',
    fieldName: 'Campo',
    scoringUnit: 'Gol',
    scoringUnitPlural: 'Goles',
    hasGoalkeeper: true,
    positions: ['Portero', 'Defensa', 'Centrocampista', 'Delantero'],
    matchStatsFields: [
      { key: 'golesAFavor',    labelKey: 'CALENDARIO.GOALS_FOR',      icon: 'bi-trophy' },
      { key: 'golesEnContra',  labelKey: 'CALENDARIO.GOALS_AGAINST',  icon: 'bi-shield' },
      { key: 'paradasPortero', labelKey: 'CALENDARIO.SAVES',          icon: 'bi-hand-thumbs-up' },
      { key: 'penaltisAFavor', labelKey: 'CALENDARIO.PENALTY_CORNERS_FOR',   icon: 'bi-p-circle' },
      { key: 'penaltisEnContra',labelKey: 'CALENDARIO.PENALTY_CORNERS_AGAINST',icon: 'bi-p-circle' },
      { key: 'tarjetasAmarillas',labelKey: 'CALENDARIO.GREEN_CARDS',  icon: 'bi-square-fill' },
      { key: 'tarjetasRojas',  labelKey: 'CALENDARIO.RED_CARDS',      icon: 'bi-square-fill' },
    ],
    playerStatsColumns: ['goles', 'asistencias', 'penaltyCorners', 'tarjetas'],
    leagueOptions: [
      'División de Honor', 'Primera Nacional', 'Liga Autonómica', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/hockey.svg',
    formations: ['hoc-4-3-3', 'hoc-3-4-3', 'hoc-4-2-3-1'],
    playersOnField: 11,
    dominantLimbKey: 'PLAYER.TBL_SIDE',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En hockey hierba/sala, los KPIs clave son: goles, asistencias, penalty corners (a favor/contra), tarjetas (amarilla/verde/roja), paradas del portero. Analiza: presión en penalty corners, circulación del disco, y pressing defensivo.',
    matchPeriods: { label: 'Tiempos', labelKey: 'MATCH.PERIODS_HALVES', count: 2, durationMin: 35, hasOvertime: false },
    physicalRequirements: [
      { skill: 'speed', weight: 8 },
      { skill: 'endurance', weight: 9 },
      { skill: 'agility', weight: 8 },
      { skill: 'coordination', weight: 9 },
      { skill: 'strength', weight: 5 },
      { skill: 'height', weight: 4 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  waterpolo: {
    key: 'waterpolo',
    labelKey: 'EQUIPOS.SPORTS.waterpolo',
    emoji: '🤽',
    fieldName: 'Piscina',
    scoringUnit: 'Gol',
    scoringUnitPlural: 'Goles',
    hasGoalkeeper: true,
    positions: ['Portero', 'Defensa', 'Centrocampista', 'Extremo', 'Boya'],
    matchStatsFields: [
      { key: 'golesAFavor',    labelKey: 'CALENDARIO.GOALS_FOR',      icon: 'bi-trophy' },
      { key: 'golesEnContra',  labelKey: 'CALENDARIO.GOALS_AGAINST',  icon: 'bi-shield' },
      { key: 'paradasPortero', labelKey: 'CALENDARIO.SAVES',          icon: 'bi-hand-thumbs-up' },
      { key: 'penaltisAFavor', labelKey: 'CALENDARIO.PENALTIES_FOR',  icon: 'bi-p-circle' },
      { key: 'penaltisEnContra',labelKey: 'CALENDARIO.PENALTIES_AGAINST',icon: 'bi-p-circle' },
      { key: 'exclusiones',    labelKey: 'CALENDARIO.EXCLUSIONS',     icon: 'bi-clock' },
      { key: 'tarjetasRojas',  labelKey: 'CALENDARIO.RED_CARDS',      icon: 'bi-square-fill' },
    ],
    playerStatsColumns: ['goles', 'asistencias', 'penaltis', 'exclusiones'],
    leagueOptions: [
      'División de Honor', 'Primera División', 'Liga Autonómica', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/waterpolo.svg',
    formations: ['wp-3-3', 'wp-2-4', 'wp-4-2'],
    playersOnField: 7,
    dominantLimbKey: 'PLAYER.TBL_HAND',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En waterpolo, los KPIs clave son: goles, asistencias, exclusiones (20 seg), paradas del portero, penaltis. Analiza: superioridad numérica (6:5), contraataques, y eficiencia del lanzador.',
    matchPeriods: { label: 'Cuartos', labelKey: 'MATCH.PERIODS_QUARTERS', count: 4, durationMin: 8, hasOvertime: true },
    physicalRequirements: [
      { skill: 'endurance', weight: 10 },
      { skill: 'strength', weight: 8 },
      { skill: 'agility', weight: 7 },
      { skill: 'coordination', weight: 8 },
      { skill: 'speed', weight: 8 },
      { skill: 'height', weight: 7 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  beisbol: {
    key: 'beisbol',
    labelKey: 'EQUIPOS.SPORTS.beisbol',
    emoji: '⚾',
    fieldName: 'Campo',
    scoringUnit: 'Carrera',
    scoringUnitPlural: 'Carreras',
    hasGoalkeeper: false,
    positions: [
      'Lanzador', 'Receptor', 'Primera Base', 'Segunda Base',
      'Tercera Base', 'Shortstop', 'Jardinero Izquierdo',
      'Jardinero Central', 'Jardinero Derecho', 'Bateador Designado'
    ],
    matchStatsFields: [
      { key: 'golesAFavor',   labelKey: 'CALENDARIO.RUNS_FOR',     icon: 'bi-trophy' },
      { key: 'golesEnContra', labelKey: 'CALENDARIO.RUNS_AGAINST', icon: 'bi-shield' },
      { key: 'hits',          labelKey: 'CALENDARIO.HITS',         icon: 'bi-bullseye' },
      { key: 'errores',       labelKey: 'CALENDARIO.ERRORS',       icon: 'bi-x-circle' },
      { key: 'ponches',       labelKey: 'CALENDARIO.STRIKEOUTS',   icon: 'bi-dash-circle' },
    ],
    playerStatsColumns: ['carreras', 'hits', 'ponches', 'errores'],
    leagueOptions: [
      'Liga Nacional de Béisbol', 'Liga Autonómica', 'Liga Local', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/beisbol.svg',
    formations: ['bb-standard'],
    playersOnField: 9,
    dominantLimbKey: 'PLAYER.TBL_ARM',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En béisbol, los KPIs clave son: carreras, hits, errores, OBP (on-base percentage), ERA (earned run average), slugging percentage, WHIP del lanzador. Analiza por innings (1-9), cuenta (bolas/strikes), y situaciones con corredores en base.',
    matchPeriods: { label: 'Innings', labelKey: 'MATCH.PERIODS_INNINGS', count: 9, hasOvertime: true },
    physicalRequirements: [
      { skill: 'speed', weight: 7 },
      { skill: 'coordination', weight: 10 },
      { skill: 'strength', weight: 8 },
      { skill: 'agility', weight: 7 },
      { skill: 'endurance', weight: 5 },
      { skill: 'height', weight: 5 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },

  'hockey-hielo': {
    key: 'hockey-hielo',
    labelKey: 'EQUIPOS.SPORTS.hockey-hielo',
    emoji: '🏒',
    fieldName: 'Pista de hielo',
    scoringUnit: 'Gol',
    scoringUnitPlural: 'Goles',
    hasGoalkeeper: true,
    positions: ['Portero', 'Defensa', 'Delantero Centro', 'Ala Derecha', 'Ala Izquierda'],
    matchStatsFields: [
      { key: 'golesAFavor',    labelKey: 'CALENDARIO.GOALS_FOR',      icon: 'bi-trophy' },
      { key: 'golesEnContra',  labelKey: 'CALENDARIO.GOALS_AGAINST',  icon: 'bi-shield' },
      { key: 'paradasPortero', labelKey: 'CALENDARIO.SAVES',          icon: 'bi-hand-thumbs-up' },
      { key: 'penaltisAFavor', labelKey: 'CALENDARIO.POWER_PLAYS_FOR',   icon: 'bi-lightning' },
      { key: 'exclusiones',    labelKey: 'CALENDARIO.PENALTY_MINUTES',icon: 'bi-clock' },
      { key: 'tarjetasRojas',  labelKey: 'CALENDARIO.MAJOR_PENALTIES',icon: 'bi-square-fill' },
    ],
    playerStatsColumns: ['goles', 'asistencias', 'penalizaciones', 'plusMinus'],
    leagueOptions: [
      'FEDH División de Honor', 'Primera División', 'Liga Autonómica', 'No federado',
    ],
    tacticalBoardBg: 'assets/tactical/hockey-hielo.svg',
    formations: ['ih-2-1-2', 'ih-1-2-2'],
    playersOnField: 6,
    dominantLimbKey: 'PLAYER.TBL_SIDE',
    skillLabelKey: 'PLAYER.SKILL_BALL',
    aiContextPrompt: 'En hockey sobre hielo, los KPIs clave son: goles, asistencias, minutos de penalti, power plays, paradas del portero (%), +/-. Analiza por periodos (1-3), unidades de power play/penalty kill, y rotaciones de líneas (cada 45 seg).',
    matchPeriods: { label: 'Periodos', labelKey: 'MATCH.PERIODS_THIRDS', count: 3, durationMin: 20, hasOvertime: true },
    physicalRequirements: [
      { skill: 'speed', weight: 10 },
      { skill: 'agility', weight: 9 },
      { skill: 'endurance', weight: 9 },
      { skill: 'strength', weight: 7 },
      { skill: 'coordination', weight: 9 },
      { skill: 'height', weight: 6 },
    ],
    wellnessThreshold: { low: 2.5, medium: 3.5 },
  },
};

function inferTopScorersTitleKey(sportKey: string): string {
  if (sportKey === 'beisbol') {
    return 'GOLEADORES.TITLE_MAX_SCORERS_RUNS';
  }
  if (['baloncesto', 'voley', 'rugby', 'futbol-americano'].includes(sportKey)) {
    return 'GOLEADORES.TITLE_MAX_SCORERS_POINTS';
  }
  return 'GOLEADORES.TITLE_MAX_SCORERS_GOALS';
}

function defaultGoalkeeperMarkers(cfg: SportConfig): string[] {
  if (!cfg.hasGoalkeeper) {
    return [];
  }
  return ['portero', 'goalkeeper', 'goalie', 'guardameta'];
}

/** Completa claves opcionales para uso en UI (títulos dinámicos, detección de portero). */
export function enrichSportConfig(base: SportConfig): SportConfig {
  return {
    ...base,
    topScorersTitleKey: base.topScorersTitleKey ?? inferTopScorersTitleKey(base.key),
    goalkeeperMarkers: base.goalkeeperMarkers ?? defaultGoalkeeperMarkers(base),
  };
}

export function getSportConfig(sport?: string): SportConfig {
  const base = SPORT_CONFIGS[sport || 'futbol'] ?? SPORT_CONFIGS['futbol'];
  return enrichSportConfig(base);
}
