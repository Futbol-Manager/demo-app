/**
 * Modelo del formulario dinámico de registro de ABONADOS por club.
 *
 * Espejo del modelo de padres pero con secciones y slots propios.
 */

/** Secciones fijas del formulario de abonados. */
export type AbonadoFormSectionId =
  | 'personales'
  | 'domicilio'
  | 'bancarios'
  | 'emergencia'
  | 'extras';

/** Tipos de campo soportados. */
export type AbonadoFormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'multi_check'
  | 'consent'
  | 'info'
  | 'document'
  | 'file_upload';

/** Slot canónico definido por Sphaira (mapea a una columna real de `abonados`). */
export interface AbonadoFormSlotCatalogItem {
  key: string;
  section: AbonadoFormSectionId;
  type: AbonadoFormFieldType;
  labelKey: string;
  options: string[];
}

/** Catálogo completo devuelto por `GET /rest/club-abonado-form/catalog`. */
export interface AbonadoFormCatalog {
  version: number;
  sections: AbonadoFormSectionId[];
  fieldTypes: AbonadoFormFieldType[];
  slots: AbonadoFormSlotCatalogItem[];
}

/** Definición de un campo en el schema del builder. */
export interface AbonadoFormField {
  id: string;
  type: AbonadoFormFieldType;
  label: string;
  text?: string;
  required?: boolean;
  options?: string[];
  fileUrl?: string;
  fileName?: string;
  binding?: string;
}

export interface AbonadoFormSection {
  id: AbonadoFormSectionId;
  title?: string;
  fields: AbonadoFormField[];
}

export interface AbonadoFormSchema {
  version: number;
  sections: AbonadoFormSection[];
}

export interface AbonadoFormTemplate {
  templateId: number | null;
  clubId: number;
  active: number;
  schema: AbonadoFormSchema;
  createdAt?: string;
  updatedAt?: string;
  /**
   * `true` cuando el schema devuelto por el backend es el predeterminado
   * de Sphaira (el club aún no ha personalizado su formulario).
   */
  default?: boolean;
}

/** Respuesta del abonado al form (lo que se guarda en answers_json). */
export interface AbonadoFormAnswers {
  personales?: { [key: string]: unknown };
  domicilio?: { [key: string]: unknown };
  bancarios?: { [key: string]: unknown };
  emergencia?: { [key: string]: unknown };
  extras?: { [key: string]: unknown };
  consents?: Array<{ id: string; accepted: boolean; ts: string }>;
}

/** Esqueleto inicial vacío para arrancar el builder cuando el club no tiene plantilla. */
export const EMPTY_ABONADO_FORM_SCHEMA: AbonadoFormSchema = {
  version: 1,
  sections: [
    { id: 'personales', title: 'Datos personales', fields: [] },
    { id: 'domicilio', title: 'Domicilio y contacto', fields: [] },
    { id: 'bancarios', title: 'Datos bancarios', fields: [] },
    { id: 'emergencia', title: 'Contacto de emergencia', fields: [] },
    { id: 'extras', title: 'Extras', fields: [] },
  ],
};
