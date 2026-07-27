// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – Injury Module Models
// These interfaces define the contract for the backend API.
// ═══════════════════════════════════════════════════════════════════

/** Tissue type classification for body zones – used for professional filtering */
export type TissueType = 'muscular' | 'articular' | 'ligamentoso' | 'tendinoso' | 'oseo';

/** Body zone for SVG 2D body map */
export interface BodyZone {
  id: string;
  labelBase: string;
  labelPro: string;
  svgPath: string;           // SVG path data with bezier curves
  view: 'front' | 'back';
  cx: number;                // center X for label/dot
  cy: number;                // center Y for label/dot
  tissueType: TissueType;    // primary tissue classification
  tissueTypes?: TissueType[]; // multi-tissue zones (e.g. knee: articular + ligamentoso)
}

// ─── Clinical Status System (5 levels – UEFA/FIFA professional standard) ──────
export type InjuryStatus = 'baja' | 'fisioterapia' | 'readaptacion' | 'condicionado' | 'alta';

export interface InjuryStatusDef {
  code: InjuryStatus;
  label: string;
  labelShort: string;
  description: string;       // what the player can do
  color: string;
  icon: string;
  rtpPhases: number[];       // suggested from RTP phase
  availableForMatch: boolean;
}

export const INJURY_STATUSES: InjuryStatusDef[] = [
  {
    code: 'baja',
    label: 'Baja médica',
    labelShort: 'Baja',
    description: 'Reposo absoluto — sin actividad deportiva',
    color: '#dc3545',
    icon: 'bi-hospital',
    rtpPhases: [1],
    availableForMatch: false
  },
  {
    code: 'fisioterapia',
    label: 'Fisioterapia',
    labelShort: 'Fisio',
    description: 'Tratamiento médico — sin carga deportiva',
    color: '#fd7e14',
    icon: 'bi-heart-pulse',
    rtpPhases: [2],
    availableForMatch: false
  },
  {
    code: 'readaptacion',
    label: 'Readaptación',
    labelShort: 'Readap.',
    description: 'Rehabilitación física individual en campo o gimnasio',
    color: '#ffc107',
    icon: 'bi-activity',
    rtpPhases: [3, 4],
    availableForMatch: false
  },
  {
    code: 'condicionado',
    label: 'Disponible condicionado',
    labelShort: 'Condic.',
    description: 'Entrenamiento diferenciado con el grupo — restricciones de carga',
    color: '#0d6efd',
    icon: 'bi-person-check',
    rtpPhases: [5],
    availableForMatch: true
  },
  {
    code: 'alta',
    label: 'Alta médica',
    labelShort: 'Alta',
    description: 'Sin restricciones — convocable',
    color: '#31b270',
    icon: 'bi-trophy',
    rtpPhases: [6],
    availableForMatch: true
  }
];

/** Get the status definition object for a given status code */
export function getStatusDef(status: InjuryStatus): InjuryStatusDef {
  return INJURY_STATUSES.find(s => s.code === status) ?? INJURY_STATUSES[0];
}

/** Suggest a clinical status based on current RTP phase */
export function getSuggestedStatus(rtpPhase: number): InjuryStatus {
  const def = INJURY_STATUSES.find(s => s.rtpPhases.includes(rtpPhase));
  return def ? def.code : 'baja';
}

/** Migrate legacy status values to the new 5-state system */
export function migrateStatus(oldStatus: string): InjuryStatus {
  switch (oldStatus) {
    case 'activa':      return 'baja';
    case 'recuperacion': return 'readaptacion';
    case 'cerrada':     return 'alta';
    default:
      if (INJURY_STATUSES.some(s => s.code === oldStatus)) return oldStatus as InjuryStatus;
      return 'baja';
  }
}

/**
 * Main Injury entity.
 * Backend endpoint should return/accept this structure.
 */
export interface Injury {
  id: number;
  playerId: number;
  playerName: string;
  teamId?: number;
  teamName?: string;
  clubId?: number;
  zone: string;              // BodyZone.id
  zoneLabel: string;
  type: string;              // 'Muscular' | 'Articular' | 'Ósea' | 'Ligamentosa' | 'Tendinosa' | 'Meniscal' | 'Fractura por estrés' | 'Contusión' | 'Luxación' | 'Otra'
  severity: 'leve' | 'moderada' | 'grave';
  description: string;
  dateInjury: string;        // ISO date (YYYY-MM-DD)
  dateReturn?: string;       // ISO date estimated return
  dateActualReturn?: string; // ISO date actual return
  status: InjuryStatus;
  mechanism?: string;        // how it happened
  treatment?: string;
  notes?: string;
  rtpPhase?: number;         // 1-6 for RTP (Return To Play) progress
  rtpCategory?: 'return_to_train' | 'return_to_play' | 'return_to_competition';
  createdBy: string;
  /** Medical documents attached to this injury */
  documents?: InjuryDocument[];

  // ── Campos usados por la Agenda médica (planificación RTP por fases) ──
  /** Fin del rango de retorno estimado (además de dateReturn). */
  dateReturnEnd?: string;
  /** Fecha de inicio planificada de cada fase RTP (índice i → fase i+1). */
  rtpDates?: (string | null | undefined)[];
  /** Fecha de fin planificada de cada fase RTP (paralelo a rtpDates). */
  rtpDatesEnd?: (string | null | undefined)[];
  /** Distingue lesión ('injury') de incidencia ('incident', sin baja). */
  kind?: InjuryKind;
}

/** Distingue una lesión con baja de una incidencia sin RTP. */
export type InjuryKind = 'injury' | 'incident';

/**
 * Medical document attached to an injury.
 * Backend should store file in blob storage and return URL.
 */
export interface InjuryDocument {
  id: number;
  injuryId: number;
  fileName: string;
  fileType: 'pdf' | 'image' | 'other';  // MIME category
  documentCategory?: string;             // 'informe_resonancia' | 'imagen_resonancia' | 'imagen_ecografia' | 'informe_medico' | 'informe_fisio' | 'otro'
  fileUrl: string;                        // URL to download/view
  fileSize?: number;                      // bytes
  uploadedAt: string;                     // ISO datetime
  uploadedBy: string;                     // user name
  description?: string;
}

/**
 * Chronological evolution note for an injury.
 */
export interface InjuryEvolutionNote {
  noteId: number;
  injuryId: number;
  noteDate: string;        // YYYY-MM-DD
  content: string;
  rtpPhaseAtTime?: number;
  statusAtTime?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  attachments?: InjuryNoteAttachment[];
}

/** Attachment for an evolution note */
export interface InjuryNoteAttachment {
  attachmentId: number;
  noteId: number;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedAt?: string;
}

/** Timeline entry for timeline view */
export interface TimelineEntry {
  injury: Injury;
  monthLabel: string;
  dayLabel: string;
  isFirst: boolean;       // first injury in this month
}

/** Zone-based statistic */
export interface ZoneStat {
  zoneId: string;
  label: string;
  count: number;
  pct: number;
}

/** Type-based statistic */
export interface TypeStat {
  type: string;
  count: number;
  pct: number;
}

/** Severity distribution statistic */
export interface SeverityStat {
  severity: string;
  count: number;
  pct: number;
  color: string;
}

/** Monthly injury trend */
export interface MonthTrend {
  label: string;
  count: number;
  maxCount: number;   // for bar height calc
}

/** RTP phase definition */
export interface RtpPhase {
  phase: number;
  label: string;
  /** Clave i18n opcional para traducir la etiqueta de la fase. */
  labelKey?: string;
  icon: string;
  color: string;
}

/** Notification preference for injury alerts */
export interface InjuryNotificationConfig {
  autoNotify: boolean;           // if true, send notification automatically on save
  notifyOnCreate: boolean;       // notify when a new injury is created
  notifyOnStatusChange: boolean; // notify when status changes
  notifyOnRtpChange: boolean;    // notify when RTP phase advances
}

// ─── Constants ─────────────────────────────────────────────────────

export interface DocumentCategory {
  code: string;
  label: string;
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  { code: 'informe_resonancia',  label: 'Informe resonancia' },
  { code: 'imagen_resonancia',   label: 'Imagen resonancia' },
  { code: 'imagen_ecografia',    label: 'Imagen ecografía' },
  { code: 'informe_medico',      label: 'Informe médico' },
  { code: 'informe_fisio',       label: 'Informe fisioterapia' },
  { code: 'otro',                label: 'Otro' },
];

export interface RtpCategoryDef {
  code: 'return_to_train' | 'return_to_play' | 'return_to_competition';
  label: string;
  phases: number[];   // which RTP phases belong to this category
  color: string;
}

export const RTP_CATEGORIES: RtpCategoryDef[] = [
  { code: 'return_to_train',       label: 'Return to Train',       phases: [1, 2], color: '#dc3545' },
  { code: 'return_to_play',        label: 'Return to Play',        phases: [3, 4], color: '#ffc107' },
  { code: 'return_to_competition', label: 'Return to Competition', phases: [5, 6], color: '#31b270' },
];

export const RTP_PHASES: RtpPhase[] = [
  { phase: 1, label: 'Reposo / Protección',  icon: 'bi-shield-check',    color: '#dc3545' },
  { phase: 2, label: 'Movilidad básica',      icon: 'bi-arrows-move',     color: '#fd7e14' },
  { phase: 3, label: 'Fortalecimiento',       icon: 'bi-lightning-charge', color: '#ffc107' },
  { phase: 4, label: 'Carrera / Agilidad',   icon: 'bi-speedometer2',    color: '#20c997' },
  { phase: 5, label: 'Entrenamiento grupal', icon: 'bi-people',           color: '#0d6efd' },
  { phase: 6, label: 'Alta competitiva',     icon: 'bi-trophy',           color: '#31b270' },
];

export const INJURY_TYPES_BASE: string[] = ['Muscular', 'Articular', 'Ósea', 'Contusión', 'Otra'];
export const INJURY_TYPES_PRO: string[] = [
  'Muscular', 'Articular', 'Ósea', 'Ligamentosa', 'Tendinosa',
  'Meniscal', 'Fractura por estrés', 'Contusión', 'Luxación', 'Otra'
];

// ─── Tissue type colour palette ─────────────────────────────────────
export const TISSUE_COLORS: Record<TissueType, string> = {
  muscular:    '#dc3545',
  articular:   '#0d6efd',
  ligamentoso: '#fd7e14',
  tendinoso:   '#6f42c1',
  oseo:        '#20c997'
};

export const TISSUE_LABELS: Record<TissueType, string> = {
  muscular:    'Muscular',
  articular:   'Articular',
  ligamentoso: 'Ligamentoso',
  tendinoso:   'Tendinoso',
  oseo:        'Óseo'
};

export const TISSUE_ICONS: Record<TissueType, string> = {
  muscular:    'bi-lightning-charge',
  articular:   'bi-circle-half',
  ligamentoso: 'bi-bezier2',
  tendinoso:   'bi-link-45deg',
  oseo:        'bi-diamond-fill'
};

// ─── SVG Body Map Zones ──────────────────────────────────────────────
// All paths use bezier curves for anatomical accuracy.
// ViewBox reference: 85 0 130 305  (visible x: 85–215, visible y: 0–305)

export const BODY_ZONES_BASE: BodyZone[] = [
  // ── FRONT VIEW ──
  {
    id: 'head', labelBase: 'Cabeza', labelPro: 'Región Craneal',
    svgPath: 'M150,10 C138,9 126,19 126,32 C126,45 137,55 150,55 C163,55 174,45 174,32 C174,19 162,9 150,10 Z',
    view: 'front', cx: 150, cy: 32, tissueType: 'articular'
  },
  {
    id: 'neck', labelBase: 'Cuello', labelPro: 'Región Cervical',
    svgPath: 'M143,55 C143,57 142,60 142,62 L158,62 C158,60 157,57 157,55 Z',
    view: 'front', cx: 150, cy: 58, tissueType: 'articular'
  },
  {
    id: 'shoulder_r', labelBase: 'Hombro Der.', labelPro: 'Articulación Glenohumeral Der.',
    svgPath: 'M120,58 C114,60 108,67 106,76 L126,76 C127,70 130,64 143,62 L143,58 Z',
    view: 'front', cx: 125, cy: 67, tissueType: 'articular', tissueTypes: ['articular', 'tendinoso']
  },
  {
    id: 'shoulder_l', labelBase: 'Hombro Izq.', labelPro: 'Articulación Glenohumeral Izq.',
    svgPath: 'M157,58 L157,62 C170,64 173,70 174,76 L194,76 C192,67 186,60 180,58 Z',
    view: 'front', cx: 175, cy: 67, tissueType: 'articular', tissueTypes: ['articular', 'tendinoso']
  },
  {
    id: 'chest', labelBase: 'Pecho', labelPro: 'Región Torácica Anterior',
    svgPath: 'M130,62 C128,69 127,79 127,89 C127,97 134,103 142,105 L158,105 C166,103 173,97 173,89 C173,79 172,69 170,62 Z',
    view: 'front', cx: 150, cy: 83, tissueType: 'muscular'
  },
  {
    id: 'abdomen', labelBase: 'Abdomen', labelPro: 'Región Abdominal',
    svgPath: 'M129,105 C127,113 127,121 127,129 C127,137 133,141 143,142 L157,142 C167,141 173,137 173,129 C173,121 173,113 171,105 Z',
    view: 'front', cx: 150, cy: 123, tissueType: 'muscular'
  },
  {
    id: 'hip_r', labelBase: 'Cadera Der.', labelPro: 'Articulación Coxofemoral Der.',
    svgPath: 'M108,128 C106,135 105,143 107,151 L130,151 C129,143 131,135 138,130 L140,122 L118,122 Z',
    view: 'front', cx: 119, cy: 137, tissueType: 'articular'
  },
  {
    id: 'hip_l', labelBase: 'Cadera Izq.', labelPro: 'Articulación Coxofemoral Izq.',
    svgPath: 'M192,128 C194,135 195,143 193,151 L170,151 C171,143 169,135 162,130 L160,122 L182,122 Z',
    view: 'front', cx: 181, cy: 137, tissueType: 'articular'
  },
  {
    id: 'groin', labelBase: 'Ingle', labelPro: 'Región Inguinal / Pubis',
    svgPath: 'M138,136 C135,141 134,147 134,153 L166,153 C166,147 165,141 162,136 Z',
    view: 'front', cx: 150, cy: 145, tissueType: 'muscular'
  },
  {
    id: 'arm_r', labelBase: 'Brazo Der.', labelPro: 'Bíceps / Tríceps Braquial Der.',
    svgPath: 'M104,76 C100,85 98,97 98,109 C98,115 100,121 106,123 L120,123 C118,117 116,109 116,99 C116,87 118,79 122,76 Z',
    view: 'front', cx: 111, cy: 99, tissueType: 'muscular'
  },
  {
    id: 'arm_l', labelBase: 'Brazo Izq.', labelPro: 'Bíceps / Tríceps Braquial Izq.',
    svgPath: 'M196,76 C200,85 202,97 202,109 C202,115 200,121 194,123 L180,123 C182,117 184,109 184,99 C184,87 182,79 178,76 Z',
    view: 'front', cx: 189, cy: 99, tissueType: 'muscular'
  },
  {
    id: 'forearm_r', labelBase: 'Antebrazo Der.', labelPro: 'Antebrazo Der.',
    svgPath: 'M98,123 C95,133 94,145 95,157 L112,157 C112,145 112,133 120,123 Z',
    view: 'front', cx: 104, cy: 140, tissueType: 'muscular'
  },
  {
    id: 'forearm_l', labelBase: 'Antebrazo Izq.', labelPro: 'Antebrazo Izq.',
    svgPath: 'M202,123 C205,133 206,145 205,157 L188,157 C188,145 188,133 180,123 Z',
    view: 'front', cx: 196, cy: 140, tissueType: 'muscular'
  },
  {
    id: 'quad_r', labelBase: 'Muslo Der.', labelPro: 'Cuádriceps Femoral Der.',
    svgPath: 'M126,151 C122,163 120,177 120,191 C120,199 124,207 130,211 L148,211 C148,203 147,193 147,179 C147,165 148,157 150,151 Z',
    view: 'front', cx: 135, cy: 181, tissueType: 'muscular'
  },
  {
    id: 'quad_l', labelBase: 'Muslo Izq.', labelPro: 'Cuádriceps Femoral Izq.',
    svgPath: 'M174,151 C178,163 180,177 180,191 C180,199 176,207 170,211 L152,211 C152,203 153,193 153,179 C153,165 152,157 150,151 Z',
    view: 'front', cx: 165, cy: 181, tissueType: 'muscular'
  },
  {
    id: 'knee_r', labelBase: 'Rodilla Der.', labelPro: 'Articulación Femorotibial Der.',
    svgPath: 'M120,211 C118,215 118,223 120,229 L150,229 C149,223 148,215 148,211 Z',
    view: 'front', cx: 134, cy: 220, tissueType: 'articular', tissueTypes: ['articular', 'ligamentoso']
  },
  {
    id: 'knee_l', labelBase: 'Rodilla Izq.', labelPro: 'Articulación Femorotibial Izq.',
    svgPath: 'M180,211 C182,215 182,223 180,229 L150,229 C151,223 152,215 152,211 Z',
    view: 'front', cx: 166, cy: 220, tissueType: 'articular', tissueTypes: ['articular', 'ligamentoso']
  },
  {
    id: 'shin_r', labelBase: 'Espinilla Der.', labelPro: 'Tibia / Peroné Der.',
    svgPath: 'M120,229 C118,243 118,257 120,271 C122,277 124,281 128,283 L146,283 C143,277 142,265 142,251 C142,237 143,231 150,229 Z',
    view: 'front', cx: 135, cy: 256, tissueType: 'oseo'
  },
  {
    id: 'shin_l', labelBase: 'Espinilla Izq.', labelPro: 'Tibia / Peroné Izq.',
    svgPath: 'M180,229 C182,243 182,257 180,271 C178,277 176,281 172,283 L154,283 C157,277 158,265 158,251 C158,237 157,231 150,229 Z',
    view: 'front', cx: 165, cy: 256, tissueType: 'oseo'
  },
  {
    id: 'ankle_r', labelBase: 'Tobillo Der.', labelPro: 'Articulación Tibiotarsiana Der.',
    svgPath: 'M120,283 C118,287 118,293 120,297 L150,297 C148,293 147,287 146,283 Z',
    view: 'front', cx: 133, cy: 290, tissueType: 'ligamentoso', tissueTypes: ['articular', 'ligamentoso']
  },
  {
    id: 'ankle_l', labelBase: 'Tobillo Izq.', labelPro: 'Articulación Tibiotarsiana Izq.',
    svgPath: 'M180,283 C182,287 182,293 180,297 L150,297 C153,293 153,287 154,283 Z',
    view: 'front', cx: 167, cy: 290, tissueType: 'ligamentoso', tissueTypes: ['articular', 'ligamentoso']
  },
  {
    id: 'foot_r', labelBase: 'Pie Der.', labelPro: 'Metatarso / Pie Der.',
    svgPath: 'M116,297 C113,301 113,305 119,305 L149,305 C148,302 148,299 150,297 Z',
    view: 'front', cx: 133, cy: 301, tissueType: 'oseo'
  },
  {
    id: 'foot_l', labelBase: 'Pie Izq.', labelPro: 'Metatarso / Pie Izq.',
    svgPath: 'M184,297 C187,301 187,305 181,305 L151,305 C152,299 152,302 150,297 Z',
    view: 'front', cx: 167, cy: 301, tissueType: 'oseo'
  },

  // ── BACK VIEW ──
  {
    id: 'upper_back', labelBase: 'Espalda Alta', labelPro: 'Región Dorsal / Trapecio',
    svgPath: 'M128,60 C126,68 124,79 124,89 C124,99 130,105 138,108 L162,108 C170,105 176,99 176,89 C176,79 174,68 172,60 Z',
    view: 'back', cx: 150, cy: 84, tissueType: 'muscular'
  },
  {
    id: 'lower_back', labelBase: 'Espalda Baja', labelPro: 'Región Lumbar',
    svgPath: 'M126,108 C124,117 123,125 124,131 C125,139 130,144 137,145 L163,145 C170,144 175,139 176,131 C177,125 176,117 174,108 Z',
    view: 'back', cx: 150, cy: 126, tissueType: 'muscular'
  },
  {
    id: 'glute_r', labelBase: 'Glúteo Der.', labelPro: 'Glúteo Mayor Der.',
    svgPath: 'M108,131 C106,137 106,147 108,157 L150,157 C149,149 147,139 143,133 Z',
    view: 'back', cx: 129, cy: 144, tissueType: 'muscular'
  },
  {
    id: 'glute_l', labelBase: 'Glúteo Izq.', labelPro: 'Glúteo Mayor Izq.',
    svgPath: 'M192,131 C194,137 194,147 192,157 L150,157 C151,149 153,139 157,133 Z',
    view: 'back', cx: 171, cy: 144, tissueType: 'muscular'
  },
  {
    id: 'hamstring_r', labelBase: 'Isquio Der.', labelPro: 'Isquiotibiales Der.',
    svgPath: 'M108,157 C106,169 105,183 106,197 C107,205 111,213 117,217 L150,217 C149,209 148,197 148,183 C148,169 149,161 150,157 Z',
    view: 'back', cx: 129, cy: 187, tissueType: 'muscular'
  },
  {
    id: 'hamstring_l', labelBase: 'Isquio Izq.', labelPro: 'Isquiotibiales Izq.',
    svgPath: 'M192,157 C194,169 195,183 194,197 C193,205 189,213 183,217 L150,217 C151,209 152,197 152,183 C152,169 151,161 150,157 Z',
    view: 'back', cx: 171, cy: 187, tissueType: 'muscular'
  },
  {
    id: 'calf_r', labelBase: 'Gemelo Der.', labelPro: 'Gastrocnemio / Sóleo Der.',
    svgPath: 'M117,217 C114,229 113,243 114,255 C115,265 118,273 122,277 L146,277 C143,271 141,261 141,247 C141,233 143,223 150,217 Z',
    view: 'back', cx: 131, cy: 247, tissueType: 'muscular'
  },
  {
    id: 'calf_l', labelBase: 'Gemelo Izq.', labelPro: 'Gastrocnemio / Sóleo Izq.',
    svgPath: 'M183,217 C186,229 187,243 186,255 C185,265 182,273 178,277 L154,277 C157,271 159,261 159,247 C159,233 157,223 150,217 Z',
    view: 'back', cx: 169, cy: 247, tissueType: 'muscular'
  },
  {
    id: 'achilles_r', labelBase: 'Tendón Aquiles Der.', labelPro: 'Tendón de Aquiles Der.',
    svgPath: 'M120,277 C118,281 118,287 120,293 L146,293 C144,287 143,281 146,277 Z',
    view: 'back', cx: 133, cy: 285, tissueType: 'tendinoso'
  },
  {
    id: 'achilles_l', labelBase: 'Tendón Aquiles Izq.', labelPro: 'Tendón de Aquiles Izq.',
    svgPath: 'M180,277 C182,281 182,287 180,293 L154,293 C157,281 156,287 154,277 Z',
    view: 'back', cx: 167, cy: 285, tissueType: 'tendinoso'
  },
];

/** Pro-only zones (10 extra detailed zones) */
export const BODY_ZONES_PRO_EXTRA: BodyZone[] = [
  {
    id: 'wrist_r', labelBase: 'Muñeca Der.', labelPro: 'Articulación Radiocarpiana Der.',
    svgPath: 'M91,157 C89,161 88,167 90,173 L112,173 C112,167 112,161 112,157 Z',
    view: 'front', cx: 101, cy: 165, tissueType: 'articular'
  },
  {
    id: 'wrist_l', labelBase: 'Muñeca Izq.', labelPro: 'Articulación Radiocarpiana Izq.',
    svgPath: 'M209,157 C212,161 213,167 210,173 L188,173 C188,167 188,161 188,157 Z',
    view: 'front', cx: 199, cy: 165, tissueType: 'articular'
  },
  {
    id: 'hand_r', labelBase: 'Mano Der.', labelPro: 'Mano / Metacarpo Der.',
    svgPath: 'M86,173 C83,179 82,185 85,191 L112,191 C112,185 112,179 112,173 Z',
    view: 'front', cx: 99, cy: 182, tissueType: 'oseo'
  },
  {
    id: 'hand_l', labelBase: 'Mano Izq.', labelPro: 'Mano / Metacarpo Izq.',
    svgPath: 'M188,173 C188,179 188,185 188,191 L215,191 C218,185 217,179 214,173 Z',
    view: 'front', cx: 201, cy: 182, tissueType: 'oseo'
  },
  {
    id: 'adductor_r', labelBase: 'Aductor Der.', labelPro: 'Aductores Der.',
    svgPath: 'M138,151 C134,163 133,177 134,189 L150,189 C150,177 150,163 150,151 Z',
    view: 'front', cx: 142, cy: 170, tissueType: 'muscular'
  },
  {
    id: 'adductor_l', labelBase: 'Aductor Izq.', labelPro: 'Aductores Izq.',
    svgPath: 'M162,151 C166,163 167,177 166,189 L150,189 C150,177 150,163 150,151 Z',
    view: 'front', cx: 158, cy: 170, tissueType: 'muscular'
  },
  {
    id: 'rotator_cuff_r', labelBase: 'Manguito Rotador Der.', labelPro: 'Manguito Rotador Der.',
    svgPath: 'M108,58 C105,63 104,71 107,79 L128,79 C127,71 127,63 122,58 Z',
    view: 'back', cx: 118, cy: 68, tissueType: 'tendinoso'
  },
  {
    id: 'rotator_cuff_l', labelBase: 'Manguito Rotador Izq.', labelPro: 'Manguito Rotador Izq.',
    svgPath: 'M192,58 C195,63 196,71 193,79 L172,79 C173,71 173,63 178,58 Z',
    view: 'back', cx: 182, cy: 68, tissueType: 'tendinoso'
  },
  {
    id: 'it_band_r', labelBase: 'Cintilla IT Der.', labelPro: 'Banda Iliotibial Der.',
    svgPath: 'M106,157 C103,171 102,187 103,201 C104,207 108,213 112,215 L122,215 C118,209 116,201 117,187 C118,171 118,161 120,157 Z',
    view: 'back', cx: 112, cy: 186, tissueType: 'ligamentoso'
  },
  {
    id: 'it_band_l', labelBase: 'Cintilla IT Izq.', labelPro: 'Banda Iliotibial Izq.',
    svgPath: 'M194,157 C197,171 198,187 197,201 C196,207 192,213 188,215 L178,215 C182,209 184,201 183,187 C182,171 182,161 180,157 Z',
    view: 'back', cx: 188, cy: 186, tissueType: 'ligamentoso'
  },
];
