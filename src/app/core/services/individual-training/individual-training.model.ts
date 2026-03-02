// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – Individual Training Models (Angular)
// ═══════════════════════════════════════════════════════════════════

export type SeasonMoment = 'PRETEMPORADA' | 'VERANO' | 'INICIO' | 'PLENA_COMPETICION' | 'FINAL_TEMPORADA';
export type PlanStatus   = 'BORRADOR' | 'ACTIVO' | 'FINALIZADO';
export type ActivityType = 'RUNNING' | 'GYM' | 'HIIT' | 'CYCLING' | 'SWIMMING' | 'FLEXIBILITY' | 'CUSTOM' | 'REST';

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  RUNNING:     'Carrera',
  GYM:         'Gimnasio',
  HIIT:        'HIIT',
  CYCLING:     'Ciclismo',
  SWIMMING:    'Natación',
  FLEXIBILITY: 'Flexibilidad',
  CUSTOM:      'Personalizado',
  REST:        'Descanso',
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  RUNNING:     '#0d6efd',
  GYM:         '#dc3545',
  HIIT:        '#fd7e14',
  CYCLING:     '#20c997',
  SWIMMING:    '#0dcaf0',
  FLEXIBILITY: '#6f42c1',
  CUSTOM:      '#6c757d',
  REST:        '#31b270',
};

export interface IndividualPlan {
  planId:           number;
  name:             string;
  description?:     string;
  startDate:        string;
  endDate:          string;
  teamId?:          number;
  clubId?:          number;
  createdByUserId:  number;
  createdByName?:   string;
  seasonMoment:     SeasonMoment;
  status:           PlanStatus;
  days?:            IndividualPlanDay[];
  assignedPlayerIds?: number[];
  createdAt?:       string;
}

export interface IndividualPlanDay {
  planDayId:              number;
  planId:                 number;
  weekNumber:             number;
  dayOfWeek:              string;
  activityType:           ActivityType;
  restDay:                boolean;
  targetDurationMinutes?: number;
  targetDistanceKm?:      number;
  targetSets?:            number;
  targetReps?:            number;
  description?:           string;
  videoUrl?:              string;
  preFormTemplateId?:     number | null;
  postFormTemplateId?:    number | null;
}

export interface TrainingLog {
  logId:                  number;
  playerId:               number;
  planDayId?:             number;
  planId?:                number;
  activityType:           ActivityType;
  logDate:                string;
  durationSeconds?:       number;
  distanceMeters?:        number;
  avgPaceSecondsPerKm?:   number;
  sets?:                  number;
  reps?:                  number;
  weightKg?:              number;
  calories?:              number;
  perceivedEffort?:       number;
  notes?:                 string;
  gpsTrackJson?:          string;
  completed:              boolean;
  createdAt?:             string;
}

export interface PlayerComplianceSummary {
  playerId:       number;
  playerName?:    string;
  totalDays:      number;
  completedDays:  number;
  compliancePct:  number;
}

export interface IndividualPlanGeneratorInput {
  userId:                 number;
  teamId?:                number;
  clubId?:                number;
  planName:               string;
  seasonMoment:           SeasonMoment;
  durationWeeks:          number;
  trainingDays:           string[];
  sessionDurationMinutes: number;
  fitnessLevel:           'BAJO' | 'MEDIO' | 'ALTO';
  physicalObjectives:     string[];
  availableActivities:    ActivityType[];
  notes?:                 string;
  startDate:              string;
}

// Helpers
export function durationFormatted(seconds: number | undefined): string {
  if (!seconds) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function paceFormatted(pace: number | undefined): string {
  if (!pace) return '--:-- /km';
  return `${Math.floor(pace / 60)}:${pad(pace % 60)}/km`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function statusLabel(status: PlanStatus): string {
  const map: Record<PlanStatus, string> = { BORRADOR: 'Borrador', ACTIVO: 'Activo', FINALIZADO: 'Finalizado' };
  return map[status] ?? status;
}

export function statusBadgeClass(status: PlanStatus): string {
  const map: Record<PlanStatus, string> = { BORRADOR: 'bg-warning', ACTIVO: 'bg-success', FINALIZADO: 'bg-secondary' };
  return map[status] ?? 'bg-secondary';
}
