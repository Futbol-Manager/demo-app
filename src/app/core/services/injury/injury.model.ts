// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – Injury Module Models
// These interfaces define the contract for the backend API.
// ═══════════════════════════════════════════════════════════════════

/** Body zone for SVG 2D body map */
export interface BodyZone {
  id: string;
  labelBase: string;
  labelPro: string;
  svgPath: string;           // SVG path data
  view: 'front' | 'back';
  cx: number;                // center X for label
  cy: number;                // center Y for label
}

/**
 * Main Injury entity.
 * Backend endpoint should return/accept this structure.
 */
export interface Injury {
  id: number;
  playerId: number;
  playerName: string;
  zone: string;              // BodyZone.id
  zoneLabel: string;
  type: string;              // 'Muscular' | 'Articular' | 'Ósea' | 'Ligamentosa' | 'Tendinosa' | 'Meniscal' | 'Fractura por estrés' | 'Contusión' | 'Luxación' | 'Otra'
  severity: 'leve' | 'moderada' | 'grave';
  description: string;
  dateInjury: string;        // ISO date (YYYY-MM-DD)
  dateReturn?: string;       // ISO date estimated return
  dateActualReturn?: string; // ISO date actual return
  status: 'activa' | 'recuperacion' | 'cerrada';
  mechanism?: string;        // how it happened
  treatment?: string;
  notes?: string;
  rtpPhase?: number;         // 1-6 for RTP (Return To Play) progress
  createdBy: string;
  /** Phase 3: Medical documents attached to this injury */
  documents?: InjuryDocument[];
}

/**
 * Medical document attached to an injury.
 * Backend should store file in blob storage and return URL.
 */
export interface InjuryDocument {
  id: number;
  injuryId: number;
  fileName: string;
  fileType: 'pdf' | 'image' | 'other';  // MIME category
  fileUrl: string;                        // URL to download/view
  fileSize?: number;                      // bytes
  uploadedAt: string;                     // ISO datetime
  uploadedBy: string;                     // user name
  description?: string;
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

export const RTP_PHASES: RtpPhase[] = [
  { phase: 1, label: 'Reposo / Protección', icon: 'bi-shield-check', color: '#dc3545' },
  { phase: 2, label: 'Movilidad básica', icon: 'bi-arrows-move', color: '#fd7e14' },
  { phase: 3, label: 'Fortalecimiento', icon: 'bi-lightning-charge', color: '#ffc107' },
  { phase: 4, label: 'Carrera / Agilidad', icon: 'bi-speedometer2', color: '#20c997' },
  { phase: 5, label: 'Entrenamiento grupal', icon: 'bi-people', color: '#0d6efd' },
  { phase: 6, label: 'Alta competitiva', icon: 'bi-trophy', color: '#31b270' },
];

export const INJURY_TYPES_BASE: string[] = ['Muscular', 'Articular', 'Ósea', 'Contusión', 'Otra'];
export const INJURY_TYPES_PRO: string[] = [
  'Muscular', 'Articular', 'Ósea', 'Ligamentosa', 'Tendinosa',
  'Meniscal', 'Fractura por estrés', 'Contusión', 'Luxación', 'Otra'
];

/** SVG Body Map Zones – Front & Back views (33 base zones) */
export const BODY_ZONES_BASE: BodyZone[] = [
  // ── FRONT VIEW ──
  { id: 'head', labelBase: 'Cabeza', labelPro: 'Región Craneal', svgPath: 'M140,30 C140,13 160,13 160,30 C160,47 140,47 140,30 Z', view: 'front', cx: 150, cy: 30 },
  { id: 'neck', labelBase: 'Cuello', labelPro: 'Región Cervical', svgPath: 'M145,47 L155,47 L155,58 L145,58 Z', view: 'front', cx: 150, cy: 52 },
  { id: 'shoulder_r', labelBase: 'Hombro Der.', labelPro: 'Articulación Glenohumeral Der.', svgPath: 'M122,58 L145,58 L145,72 L120,72 Z', view: 'front', cx: 133, cy: 65 },
  { id: 'shoulder_l', labelBase: 'Hombro Izq.', labelPro: 'Articulación Glenohumeral Izq.', svgPath: 'M155,58 L178,58 L180,72 L155,72 Z', view: 'front', cx: 167, cy: 65 },
  { id: 'chest', labelBase: 'Pecho', labelPro: 'Región Torácica Anterior', svgPath: 'M130,72 L170,72 L170,100 L130,100 Z', view: 'front', cx: 150, cy: 86 },
  { id: 'abdomen', labelBase: 'Abdomen', labelPro: 'Región Abdominal', svgPath: 'M133,100 L167,100 L167,130 L133,130 Z', view: 'front', cx: 150, cy: 115 },
  { id: 'hip_r', labelBase: 'Cadera Der.', labelPro: 'Articulación Coxofemoral Der.', svgPath: 'M120,120 L140,120 L138,145 L118,140 Z', view: 'front', cx: 129, cy: 132 },
  { id: 'hip_l', labelBase: 'Cadera Izq.', labelPro: 'Articulación Coxofemoral Izq.', svgPath: 'M160,120 L180,120 L182,140 L162,145 Z', view: 'front', cx: 171, cy: 132 },
  { id: 'groin', labelBase: 'Ingle', labelPro: 'Región Inguinal / Pubis', svgPath: 'M138,130 L162,130 L160,148 L140,148 Z', view: 'front', cx: 150, cy: 139 },
  { id: 'arm_r', labelBase: 'Brazo Der.', labelPro: 'Bíceps / Tríceps Braquial Der.', svgPath: 'M108,72 L122,72 L118,115 L105,115 Z', view: 'front', cx: 113, cy: 93 },
  { id: 'arm_l', labelBase: 'Brazo Izq.', labelPro: 'Bíceps / Tríceps Braquial Izq.', svgPath: 'M178,72 L192,72 L195,115 L182,115 Z', view: 'front', cx: 187, cy: 93 },
  { id: 'forearm_r', labelBase: 'Antebrazo Der.', labelPro: 'Antebrazo Der.', svgPath: 'M102,115 L116,115 L112,155 L98,155 Z', view: 'front', cx: 107, cy: 135 },
  { id: 'forearm_l', labelBase: 'Antebrazo Izq.', labelPro: 'Antebrazo Izq.', svgPath: 'M184,115 L198,115 L202,155 L188,155 Z', view: 'front', cx: 193, cy: 135 },
  { id: 'quad_r', labelBase: 'Muslo Der.', labelPro: 'Cuádriceps Femoral Der.', svgPath: 'M128,148 L148,148 L146,198 L126,198 Z', view: 'front', cx: 137, cy: 173 },
  { id: 'quad_l', labelBase: 'Muslo Izq.', labelPro: 'Cuádriceps Femoral Izq.', svgPath: 'M152,148 L172,148 L174,198 L154,198 Z', view: 'front', cx: 163, cy: 173 },
  { id: 'knee_r', labelBase: 'Rodilla Der.', labelPro: 'Articulación Femorotibial Der.', svgPath: 'M126,198 L146,198 L146,215 L126,215 Z', view: 'front', cx: 136, cy: 206 },
  { id: 'knee_l', labelBase: 'Rodilla Izq.', labelPro: 'Articulación Femorotibial Izq.', svgPath: 'M154,198 L174,198 L174,215 L154,215 Z', view: 'front', cx: 164, cy: 206 },
  { id: 'shin_r', labelBase: 'Espinilla Der.', labelPro: 'Tibia / Peroné Der.', svgPath: 'M128,215 L144,215 L142,268 L130,268 Z', view: 'front', cx: 136, cy: 241 },
  { id: 'shin_l', labelBase: 'Espinilla Izq.', labelPro: 'Tibia / Peroné Izq.', svgPath: 'M156,215 L172,215 L170,268 L158,268 Z', view: 'front', cx: 164, cy: 241 },
  { id: 'ankle_r', labelBase: 'Tobillo Der.', labelPro: 'Articulación Tibiotarsiana Der.', svgPath: 'M128,268 L144,268 L144,282 L128,282 Z', view: 'front', cx: 136, cy: 275 },
  { id: 'ankle_l', labelBase: 'Tobillo Izq.', labelPro: 'Articulación Tibiotarsiana Izq.', svgPath: 'M156,268 L172,268 L172,282 L156,282 Z', view: 'front', cx: 164, cy: 275 },
  { id: 'foot_r', labelBase: 'Pie Der.', labelPro: 'Metatarso / Pie Der.', svgPath: 'M125,282 L147,282 L148,296 L123,296 Z', view: 'front', cx: 136, cy: 289 },
  { id: 'foot_l', labelBase: 'Pie Izq.', labelPro: 'Metatarso / Pie Izq.', svgPath: 'M153,282 L175,282 L177,296 L152,296 Z', view: 'front', cx: 164, cy: 289 },
  // ── BACK VIEW ──
  { id: 'upper_back', labelBase: 'Espalda Alta', labelPro: 'Región Dorsal / Trapecio', svgPath: 'M130,72 L170,72 L170,100 L130,100 Z', view: 'back', cx: 150, cy: 86 },
  { id: 'lower_back', labelBase: 'Espalda Baja', labelPro: 'Región Lumbar', svgPath: 'M133,100 L167,100 L167,130 L133,130 Z', view: 'back', cx: 150, cy: 115 },
  { id: 'glute_r', labelBase: 'Glúteo Der.', labelPro: 'Glúteo Mayor Der.', svgPath: 'M125,130 L150,130 L148,155 L123,152 Z', view: 'back', cx: 137, cy: 142 },
  { id: 'glute_l', labelBase: 'Glúteo Izq.', labelPro: 'Glúteo Mayor Izq.', svgPath: 'M150,130 L175,130 L177,152 L152,155 Z', view: 'back', cx: 163, cy: 142 },
  { id: 'hamstring_r', labelBase: 'Isquio Der.', labelPro: 'Isquiotibiales Der.', svgPath: 'M128,155 L148,155 L146,198 L126,198 Z', view: 'back', cx: 137, cy: 176 },
  { id: 'hamstring_l', labelBase: 'Isquio Izq.', labelPro: 'Isquiotibiales Izq.', svgPath: 'M152,155 L172,155 L174,198 L154,198 Z', view: 'back', cx: 163, cy: 176 },
  { id: 'calf_r', labelBase: 'Gemelo Der.', labelPro: 'Gastrocnemio / Sóleo Der.', svgPath: 'M128,215 L144,215 L142,260 L130,260 Z', view: 'back', cx: 136, cy: 237 },
  { id: 'calf_l', labelBase: 'Gemelo Izq.', labelPro: 'Gastrocnemio / Sóleo Izq.', svgPath: 'M156,215 L172,215 L170,260 L158,260 Z', view: 'back', cx: 164, cy: 237 },
  { id: 'achilles_r', labelBase: 'Tendón Aquiles Der.', labelPro: 'Tendón de Aquiles Der.', svgPath: 'M132,260 L142,260 L142,278 L132,278 Z', view: 'back', cx: 137, cy: 269 },
  { id: 'achilles_l', labelBase: 'Tendón Aquiles Izq.', labelPro: 'Tendón de Aquiles Izq.', svgPath: 'M158,260 L168,260 L168,278 L158,278 Z', view: 'back', cx: 163, cy: 269 },
];

/** Pro-only zones (10 extra detailed zones) */
export const BODY_ZONES_PRO_EXTRA: BodyZone[] = [
  { id: 'wrist_r', labelBase: 'Muñeca Der.', labelPro: 'Articulación Radiocarpiana Der.', svgPath: 'M98,155 L112,155 L110,165 L96,165 Z', view: 'front', cx: 104, cy: 160 },
  { id: 'wrist_l', labelBase: 'Muñeca Izq.', labelPro: 'Articulación Radiocarpiana Izq.', svgPath: 'M188,155 L202,155 L204,165 L190,165 Z', view: 'front', cx: 196, cy: 160 },
  { id: 'hand_r', labelBase: 'Mano Der.', labelPro: 'Mano / Metacarpo Der.', svgPath: 'M93,165 L110,165 L108,180 L91,180 Z', view: 'front', cx: 101, cy: 172 },
  { id: 'hand_l', labelBase: 'Mano Izq.', labelPro: 'Mano / Metacarpo Izq.', svgPath: 'M190,165 L207,165 L209,180 L192,180 Z', view: 'front', cx: 199, cy: 172 },
  { id: 'adductor_r', labelBase: 'Aductor Der.', labelPro: 'Aductores Der.', svgPath: 'M138,148 L150,148 L150,180 L140,180 Z', view: 'front', cx: 144, cy: 164 },
  { id: 'adductor_l', labelBase: 'Aductor Izq.', labelPro: 'Aductores Izq.', svgPath: 'M150,148 L162,148 L160,180 L150,180 Z', view: 'front', cx: 156, cy: 164 },
  { id: 'rotator_cuff_r', labelBase: 'Manguito Rotador Der.', labelPro: 'Manguito Rotador Der.', svgPath: 'M115,58 L130,58 L130,75 L115,75 Z', view: 'back', cx: 122, cy: 66 },
  { id: 'rotator_cuff_l', labelBase: 'Manguito Rotador Izq.', labelPro: 'Manguito Rotador Izq.', svgPath: 'M170,58 L185,58 L185,75 L170,75 Z', view: 'back', cx: 178, cy: 66 },
  { id: 'it_band_r', labelBase: 'Cintilla IT Der.', labelPro: 'Banda Iliotibial Der.', svgPath: 'M120,155 L128,155 L126,198 L118,198 Z', view: 'back', cx: 123, cy: 176 },
  { id: 'it_band_l', labelBase: 'Cintilla IT Izq.', labelPro: 'Banda Iliotibial Izq.', svgPath: 'M172,155 L180,155 L182,198 L174,198 Z', view: 'back', cx: 177, cy: 176 },
];
