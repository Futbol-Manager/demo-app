export type FormTemplateTipo = 'pre-match' | 'post-match' | 'pre-training' | 'post-training';

export type FormTemplateCampoTipo =
  | 'TEXT_SHORT'
  | 'TEXT_LONG'
  | 'NUMBER'
  | 'DATE'
  | 'CHECKBOX'
  | 'SELECT'
  | 'RATING'
  | 'SCALE';

export interface FormTemplateCampo {
  id: string;
  tipo: FormTemplateCampoTipo;
  etiqueta: string;
  opciones?: string[];
  obligatorio: boolean;
  orden: number;
}

export interface FormTemplate {
  formTemplateId: number;
  clubId: number;
  nombre: string;
  tipo: FormTemplateTipo;
  campos: FormTemplateCampo[];
  activo: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormTemplateRespuesta {
  campoId: string;
  valor: string;
}

export interface FormTemplateResponse {
  formResponseId?: number;
  formTemplateId?: number | null;
  coachUserId: number;
  teamId: number;
  tipo: FormTemplateTipo;
  matchPreparationId?: number | null;
  trainingSessionId?: number | null;
  respuestas: FormTemplateRespuesta[];
  isStandard: number;
  createdAt?: string;
  updatedAt?: string;
}

export const FORM_TEMPLATE_TIPO_LABELS: Record<FormTemplateTipo, string> = {
  'pre-match': 'Pre-Partido',
  'post-match': 'Post-Partido',
  'pre-training': 'Pre-Entrenamiento',
  'post-training': 'Post-Entrenamiento',
};

export const FORM_TEMPLATE_CAMPO_TIPO_LABELS: Record<FormTemplateCampoTipo, string> = {
  TEXT_SHORT: 'Texto corto',
  TEXT_LONG: 'Texto largo',
  NUMBER: 'Número',
  DATE: 'Fecha',
  CHECKBOX: 'Sí / No',
  SELECT: 'Desplegable',
  RATING: 'Valoración (1-5 estrellas)',
  SCALE: 'Escala (1-10)',
};
