// ════════════════════════════════════════════════════════════════════════
// SPHAIRA – Wellness diario
// Modelo de plantilla y respuestas. Reusa la infraestructura de FormTemplate
// con tipo 'wellness-daily'.
// ════════════════════════════════════════════════════════════════════════

export type WellnessRiskLevel = 'green' | 'yellow' | 'red';

/**
 * Definición de un campo de la plantilla wellness.
 */
export interface WellnessField {
  id: string;
  label: string;
  type: 'scale' | 'text' | 'select';
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  alertLte?: number;
  required?: boolean;
  /** Opciones para campos de tipo 'select'. */
  options?: string[];
}

/**
 * Esquema de la plantilla de wellness almacenada en `club_form_templates.campos`.
 */
export interface WellnessTemplateSchema {
  version: number;
  globalAlertWhen?: string;
  fields: WellnessField[];
}

/**
 * Plantilla wellness tal como llega del endpoint.
 */
export interface WellnessTemplate {
  formTemplateId: number;
  clubId: number;
  nombre: string;
  tipo: 'wellness-daily' | string;
  /** JSON serializado en el backend (parsear con `JSON.parse`). */
  campos: string;
  activo: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Respuesta de wellness de un jugador en el equipo, con el semáforo calculado.
 */
export interface WellnessTeamEntry {
  formResponseId: number;
  formTemplateId: number | null;
  userId: number;
  teamId: number;
  respuestas: string;
  createdAt: string;
  nombre: string;
  riskLevel: WellnessRiskLevel;
}

/**
 * Item plano usado por la UI tras parsear `respuestas`.
 */
export interface WellnessTeamRow {
  formResponseId: number;
  userId: number;
  nombre: string;
  riskLevel: WellnessRiskLevel;
  values: Record<string, number | string>;
  comments?: string;
  createdAt: Date;
}

/**
 * Body que se envía al endpoint POST /rest/wellness/submit.
 */
export interface WellnessSubmissionPayload {
  clubId: number;
  teamId: number;
  userId: number;
  formTemplateId?: number;
  respuestas: string;
}

export function parseTemplateSchema(template: WellnessTemplate | null | undefined): WellnessTemplateSchema | null {
  if (!template?.campos) return null;
  try {
    const parsed = JSON.parse(template.campos);
    if (parsed && Array.isArray(parsed.fields)) {
      return parsed as WellnessTemplateSchema;
    }
  } catch {
    return null;
  }
  return null;
}
