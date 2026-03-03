export interface AnalysisProject {
  id: number;
  clubId: number;
  teamId?: number;
  videoId?: number;
  matchId?: number;
  trainingId?: number;
  templateId: number;
  title: string;
  description?: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  eventCount?: number;
  videoTitle?: string;
  teamName?: string;
  localFileName?: string;
  localFileSize?: number;
  localFileDurationMs?: number;
  externalVideoUrl?: string;
  defaultPlaylistId?: number;
}

export interface AnalysisTemplate {
  id: number;
  clubId?: number;
  name: string;
  description?: string;
  isSystem: boolean;
  isDefault?: boolean;
  createdBy?: number;
  createdAt: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  bgColor?: string;
  bgImgX?: number;
  bgImgY?: number;
  bgImgW?: number;
  bgImgH?: number;
  bgImgLocked?: boolean;
  categories?: AnalysisCategory[];
  descriptors?: AnalysisTag[];
}

export interface AnalysisCategory {
  id: number;
  templateId: number;
  parentId?: number;
  name: string;
  color: string;
  icon?: string;
  shortcutKey?: string;
  defaultDurationSec: number;
  preTimeSec: number;
  postTimeSec: number;
  sortOrder: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  posX: number;
  posY: number;
  sizeW: number;
  sizeH: number;
  shape: 'RECTANGLE' | 'CIRCLE' | 'DIAMOND' | 'SQUARE';
  textSize: number;
  textColor: string;
  locked?: boolean;
  tags?: AnalysisTag[];
  children?: AnalysisCategory[];
}

export interface AnalysisTag {
  id: number;
  categoryId?: number;    // null for template-level descriptors
  templateId?: number;    // set for template-level descriptors
  name: string;
  color?: string;
  sortOrder: number;
  // Canvas position fields (used for descriptor buttons)
  posX?: number;
  posY?: number;
  sizeW?: number;
  sizeH?: number;
  shape?: 'RECTANGLE' | 'CIRCLE' | 'DIAMOND' | 'SQUARE';
  textSize?: number;
  textColor?: string;
  /** Opacity 0–1 for the descriptor button (default 1). */
  opacity?: number;
  locked?: boolean;
}

export interface AnalysisEvent {
  id: number;
  projectId: number;
  categoryId: number;
  startTimeMs: number;
  endTimeMs: number;
  notes?: string;
  fieldX?: number;
  fieldY?: number;
  playerId?: number;
  rating?: number;
  createdBy: number;
  createdAt: string;
  tagIds?: number[];
  categoryName?: string;
  categoryColor?: string;
  playerName?: string;
}

export interface AnalysisDrawing {
  id: number;
  projectId: number;
  eventId?: number;
  timestampMs: number;
  durationMs: number;
  drawingData: string;
  createdBy: number;
}

export interface AnalysisPlaylist {
  id: number;
  clubId: number;
  projectId?: number;
  title: string;
  description?: string;
  createdBy: number;
  createdAt: string;
  items?: AnalysisPlaylistItem[];
  itemCount?: number;
}

export interface AnalysisPlaylistItem {
  id: number;
  playlistId: number;
  eventId: number;
  sortOrder: number;
  notes?: string;
  customStartMs?: number;
  customEndMs?: number;
  event?: AnalysisEvent;
}

export interface AnalysisPresentation {
  id: number;
  clubId: number;
  playlistId: number;
  title: string;
  description?: string;
  shareType: 'TEAM' | 'PLAYERS' | 'ALL';
  shareTargetIds?: string;
  createdBy: number;
  createdAt: string;
  expiresAt?: string;
  playlist?: AnalysisPlaylist;
}

export interface AnalysisReport {
  id: number;
  projectId: number;
  reportType: 'FULL' | 'OFFENSIVE' | 'DEFENSIVE' | 'SUMMARY';
  content: string;
  statisticsJson?: string;
  modelUsed: string;
  createdAt: string;
}

// ─── Clip Annotations ────────────────────────────────────────────────────────

export type DrawingTool =
  | 'select' | 'freeDraw' | 'circle' | 'arrow' | 'line' | 'dashedLine'
  | 'text' | 'spotlight'
  | 'playerLine'    // Círculos de jugadores conectados por líneas (táctica)
  | 'curvedArrow'   // Flecha curva (trayectorias)
  | 'filledZone'    // Zona sombreada semitransparente
  | 'topSpotlight'; // Cono de luz de estadio desde arriba (base elipse + cono hacia arriba)

export interface DrawingPoint {
  x: number;
  y: number;
  /** Radio individual del círculo (playerLine). Si undefined, usa el radio por defecto del elemento */
  r?: number;
}

export interface DrawingElement {
  type: DrawingTool;
  id: string;
  /** All coords are percentages (0–100) relative to canvas W/H */
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  /** Radio del círculo (circle, spotlight) O radio de los círculos en playerLine */
  radius?: number;
  /** Punto de control para curvedArrow (% coords) */
  cpx?: number;
  cpy?: number;
  /** Puntos: freeDraw usa DrawingPoint[], playerLine también */
  points?: DrawingPoint[];
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
  /**
   * Tamaño de fuente como porcentaje de la altura del canvas (0-100).
   * Independiente de resolución: se usa para renderizar en editor y en export
   * con el mismo tamaño visual. Si está presente tiene prioridad sobre fontSize.
   */
  fontSizePct?: number;
  /** Opacidad del relleno (0-1) para filledZone */
  fillOpacity?: number;
  /** Rotación en grados (0-360, sentido horario) */
  rotation?: number;
  /**
   * Ms relativos al inicio del clip en que el dibujo aparece durante la reproducción
   * en vivo (sin pausar el vídeo). Si undefined, el elemento solo se muestra en el
   * freeze-frame de su ClipAnnotation.
   */
  startMs?: number;
  /**
   * Cuánto tiempo (ms) permanece visible el dibujo durante la reproducción en vivo.
   * Requiere que startMs esté definido.
   */
  animDurationMs?: number;
}

export interface ClipAnnotation {
  id?: number;
  eventId: number;
  /** Absolute ms within the original video. */
  frameTimeMs: number;
  /** How long (ms) this freeze-frame lasts in the rendered clip. */
  frameDurationMs: number;
  drawingData: DrawingElement[];
  sortOrder: number;
  /** Local only – not persisted. Snapshot of the video frame with drawings. */
  thumbnailDataUrl?: string;
}

// ─── Clip Captions (texto superpuesto mientras el vídeo se reproduce) ────────

export type CaptionStyle = 'default' | 'highlight' | 'warning' | 'coach';

export interface ClipCaption {
  /** ID local (no persiste en backend en esta fase) */
  id: string;
  /** Texto de la nota/caption */
  text: string;
  /** Ms relativos al inicio del clip (event.startTimeMs) cuando aparece */
  startMs: number;
  /** Cuánto tiempo se muestra (ms). Por defecto 4000 */
  durationMs: number;
  /** Estilo visual */
  style: CaptionStyle;
}

export const CAPTION_STYLE_CONFIG: Record<CaptionStyle, { label: string; color: string; icon: string }> = {
  default:   { label: 'Normal',    color: '#ffffff', icon: 'bi-chat-text-fill' },
  highlight: { label: 'Destacado', color: '#ffd700', icon: 'bi-star-fill' },
  warning:   { label: 'Atención',  color: '#ff6b6b', icon: 'bi-exclamation-triangle-fill' },
  coach:     { label: 'Táctica',   color: '#00d4ff', icon: 'bi-lightbulb-fill' },
};

// ─── Animated Drawing Overlay (para export service) ──────────────────────────

/** PNG transparente de un dibujo animado + rango de tiempo absoluto en el vídeo */
export interface AnimatedDrawingOverlay {
  pngDataUrl:  string;   // data:image/png;base64,...
  startMsAbs:  number;   // ms absolutos en el vídeo original
  durationMs:  number;   // duración visible (ms)
  width:       number;   // anchura del vídeo (px) — igual a la del PNG
  height:      number;   // altura del vídeo (px) — igual a la del PNG
}

export type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  ARCHIVED: 'Archivado'
};

/** Colores Sphaira por estado */
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: '#64748b',
  IN_PROGRESS: '#0a4a6e',
  COMPLETED: '#31b270',
  ARCHIVED: '#f59e0b'
};
