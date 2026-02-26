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

export type DrawingTool = 'select' | 'freeDraw' | 'circle' | 'arrow' | 'line' | 'dashedLine' | 'text' | 'spotlight';

export interface DrawingPoint { x: number; y: number; }

export interface DrawingElement {
  type: DrawingTool;
  id: string;
  /** All coords are percentages (0–100) relative to canvas W/H */
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  radius?: number;
  points?: DrawingPoint[];
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
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

export type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  ARCHIVED: 'Archivado'
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: '#6c757d',
  IN_PROGRESS: '#0d6efd',
  COMPLETED: '#198754',
  ARCHIVED: '#ffc107'
};
