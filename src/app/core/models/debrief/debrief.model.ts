// ═══════════════════════════════════════════════════
// DEBRIEF MODELS — Quick Debrief post-training / post-match
// ═══════════════════════════════════════════════════

// ── Tipos de pregunta soportados ──
export type DebriefQuestionType =
  | 'rating'       // 1-5 estrellas / emojis
  | 'scale'        // escala numérica (ej: 1-10)
  | 'select'       // selección múltiple / chips
  | 'text'         // campo de texto libre (+ voz)
  | 'players';     // selector de jugadores

export type DebriefType = 'training' | 'match';

// ── Pregunta ──
export interface DebriefQuestion {
  id: string;                      // ej: 'TQ1', 'MQ1', o UUID para custom
  textKey: string;                 // clave i18n → DEBRIEF.QUESTIONS.TQ1
  type: DebriefQuestionType;
  options?: string[];              // claves i18n para chips (select)
  min?: number;                    // para scale (ej: 1)
  max?: number;                    // para scale (ej: 10)
  required: boolean;
  isDefault: boolean;              // pregunta del sistema
  category?: string;               // agrupación visual (ej: 'rendimiento', 'táctica')
}

// ── Respuesta ──
export interface DebriefAnswer {
  questionId: string;
  quickValue?: string | number;         // chip seleccionado o rating
  textValue?: string;                   // texto libre
  audioTranscript?: string;             // transcripción de audio
  selectedPlayers?: number[];           // playerIds (para type 'players')
  skipped?: boolean;
}

// ── Datos de asistencia contextual ──
export interface AttendanceContext {
  totalPlayers: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;          // % (0-100)
  absentPlayerNames: string[];
  latePlayerNames: string[];
  weekScope: string;               // ej: "03/02 - 09/02"
  noRecordsAvailable: boolean;
}

// ── Debrief Entrenamiento ──
export interface DebriefTraining {
  debriefId?: number;
  trainingSessionId: number;
  teamId: number;
  coachUserId: number;
  date: string;                     // ISO string
  answers: DebriefAnswer[];
  attendanceContext?: AttendanceContext;
  customQuestions?: DebriefQuestion[];
  status: 'draft' | 'completed' | 'report-generated';
  createdAt?: string;
  updatedAt?: string;
}

// ── Debrief Partido ──
export interface DebriefMatch {
  debriefId?: number;
  matchPreparationId: number;
  teamId: number;
  coachUserId: number;
  date: string;
  rivalName?: string;
  result?: string;                  // ej: "2-1"
  answers: DebriefAnswer[];
  attendanceContext?: AttendanceContext;  // semana cercana al partido
  postMatchStatsId?: number;        // referencia a PostPartido
  customQuestions?: DebriefQuestion[];
  status: 'draft' | 'completed' | 'report-generated';
  createdAt?: string;
  updatedAt?: string;
}

// ── Sección del informe ──
export interface ReportSection {
  titleKey: string;                // clave i18n
  icon: string;                    // Bootstrap icon class
  content: string;                 // texto generado por IA
  highlights?: string[];           // puntos clave
  rating?: number;                 // nota si aplica
}

// ── Informe generado ──
export interface DebriefReport {
  reportId?: number;
  debriefId: number;
  type: DebriefType;
  generatedAt: string;
  sections: ReportSection[];
  summary: string;                 // resumen ejecutivo
  recommendations: string[];       // recomendaciones
  attendanceSummary?: string;      // resumen de asistencia
  rawAnswers: DebriefAnswer[];
}

// ── Configuración personalizada (por club/entrenador) ──
export interface DebriefConfig {
  configId?: number;
  userId: number;                  // coachUserId o clubUserId
  teamId?: number;
  customQuestions: DebriefQuestion[];
  removedDefaultQuestionIds: string[];  // IDs de preguntas default desactivadas
  updatedAt?: string;
}

// ── Historial item ──
export interface DebriefHistoryItem {
  debriefId: number;
  type: DebriefType;
  date: string;
  teamName?: string;
  rivalName?: string;              // solo para match
  status: 'draft' | 'completed' | 'report-generated';
  summary?: string;                // resumen corto
}

// ═══════════════════════════════════════════════════
// PREGUNTAS POR DEFECTO — ENTRENAMIENTO (7)
// ═══════════════════════════════════════════════════
export const DEFAULT_TRAINING_QUESTIONS: DebriefQuestion[] = [
  {
    id: 'TQ1',
    textKey: 'DEBRIEF.QUESTIONS.TQ1',
    type: 'rating',
    required: true,
    isDefault: true,
    category: 'general'
  },
  {
    id: 'TQ2',
    textKey: 'DEBRIEF.QUESTIONS.TQ2',
    type: 'select',
    options: [
      'DEBRIEF.OPTIONS.FULFILLED',
      'DEBRIEF.OPTIONS.PARTIALLY',
      'DEBRIEF.OPTIONS.NOT_FULFILLED'
    ],
    required: true,
    isDefault: true,
    category: 'objectives'
  },
  {
    id: 'TQ3',
    textKey: 'DEBRIEF.QUESTIONS.TQ3',
    type: 'select',
    options: [
      'DEBRIEF.OPTIONS.VERY_HIGH',
      'DEBRIEF.OPTIONS.HIGH',
      'DEBRIEF.OPTIONS.NORMAL',
      'DEBRIEF.OPTIONS.LOW',
      'DEBRIEF.OPTIONS.VERY_LOW'
    ],
    required: true,
    isDefault: true,
    category: 'intensity'
  },
  {
    id: 'TQ4',
    textKey: 'DEBRIEF.QUESTIONS.TQ4',
    type: 'players',
    required: false,
    isDefault: true,
    category: 'players'
  },
  {
    id: 'TQ5',
    textKey: 'DEBRIEF.QUESTIONS.TQ5',
    type: 'players',
    required: false,
    isDefault: true,
    category: 'players'
  },
  {
    id: 'TQ6',
    textKey: 'DEBRIEF.QUESTIONS.TQ6',
    type: 'text',
    required: false,
    isDefault: true,
    category: 'tactical'
  },
  {
    id: 'TQ7',
    textKey: 'DEBRIEF.QUESTIONS.TQ7',
    type: 'text',
    required: false,
    isDefault: true,
    category: 'notes'
  }
];

// ═══════════════════════════════════════════════════
// PREGUNTAS POR DEFECTO — PARTIDO (10)
// ═══════════════════════════════════════════════════
export const DEFAULT_MATCH_QUESTIONS: DebriefQuestion[] = [
  {
    id: 'MQ1',
    textKey: 'DEBRIEF.QUESTIONS.MQ1',
    type: 'rating',
    required: true,
    isDefault: true,
    category: 'general'
  },
  {
    id: 'MQ2',
    textKey: 'DEBRIEF.QUESTIONS.MQ2',
    type: 'select',
    options: [
      'DEBRIEF.OPTIONS.FULFILLED',
      'DEBRIEF.OPTIONS.PARTIALLY',
      'DEBRIEF.OPTIONS.NOT_FULFILLED'
    ],
    required: true,
    isDefault: true,
    category: 'plan'
  },
  {
    id: 'MQ3',
    textKey: 'DEBRIEF.QUESTIONS.MQ3',
    type: 'scale',
    min: 1,
    max: 10,
    required: true,
    isDefault: true,
    category: 'performance'
  },
  {
    id: 'MQ4',
    textKey: 'DEBRIEF.QUESTIONS.MQ4',
    type: 'scale',
    min: 1,
    max: 10,
    required: true,
    isDefault: true,
    category: 'performance'
  },
  {
    id: 'MQ5',
    textKey: 'DEBRIEF.QUESTIONS.MQ5',
    type: 'scale',
    min: 1,
    max: 10,
    required: true,
    isDefault: true,
    category: 'performance'
  },
  {
    id: 'MQ6',
    textKey: 'DEBRIEF.QUESTIONS.MQ6',
    type: 'players',
    required: false,
    isDefault: true,
    category: 'players'
  },
  {
    id: 'MQ7',
    textKey: 'DEBRIEF.QUESTIONS.MQ7',
    type: 'players',
    required: false,
    isDefault: true,
    category: 'players'
  },
  {
    id: 'MQ8',
    textKey: 'DEBRIEF.QUESTIONS.MQ8',
    type: 'text',
    required: false,
    isDefault: true,
    category: 'tactical'
  },
  {
    id: 'MQ9',
    textKey: 'DEBRIEF.QUESTIONS.MQ9',
    type: 'text',
    required: false,
    isDefault: true,
    category: 'tactical'
  },
  {
    id: 'MQ10',
    textKey: 'DEBRIEF.QUESTIONS.MQ10',
    type: 'text',
    required: true,
    isDefault: true,
    category: 'notes'
  }
];

// ═══════════════════════════════════════════════════
// CONTRATOS / INTERFACES PARA BACKEND API
// (Preparados para cuando se implemente el backend)
// ═══════════════════════════════════════════════════

/** POST /api/debrief/training — Guardar debrief de entrenamiento */
export interface SaveDebriefTrainingRequest {
  trainingSessionId: number;
  teamId: number;
  answers: DebriefAnswer[];
  customQuestions?: DebriefQuestion[];
}

/** POST /api/debrief/match — Guardar debrief de partido */
export interface SaveDebriefMatchRequest {
  matchPreparationId: number;
  teamId: number;
  answers: DebriefAnswer[];
  customQuestions?: DebriefQuestion[];
}

/** POST /api/debrief/{id}/generate-report — Generar informe IA */
export interface GenerateReportRequest {
  debriefId: number;
  type: DebriefType;
  includeAttendance: boolean;
  includeMatchStats: boolean;
  language: string;                // ej: 'es', 'en'
}

/** GET /api/debrief/history/{teamId} — Response item */
export type DebriefHistoryResponse = DebriefHistoryItem[];

/** PUT /api/debrief/config — Guardar configuración personalizada */
export interface SaveDebriefConfigRequest {
  teamId?: number;
  customQuestions: DebriefQuestion[];
  removedDefaultQuestionIds: string[];
}
