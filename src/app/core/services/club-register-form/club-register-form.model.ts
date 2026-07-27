/**
 * Modelos del formulario extendido de registro de padres por club.
 *
 * Espejo del schema validado por el backend
 * (ClubRegisterFormServiceImpl#validateSchema). Mantener sincronizado:
 *  - tipos permitidos: text | textarea | number | date | select | checkbox | multi_check | consent | info
 *  - secciones permitidas: general | tutor | child
 *
 * `general` se usa para datos comunes al alta (no específicos del padre ni
 * del menor). `info` es un bloque de texto estático (sin entrada del usuario)
 * que el club inserta para mostrar IBAN, calendario de pagos, política LOPD
 * o cualquier información contextual entre los demás campos.
 */

export type RegisterFormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'multi_check'
  | 'consent'
  | 'info'
  | 'document';

export type RegisterFormSectionId = 'general' | 'tutor' | 'child';

/**
 * Variante del formulario de registro del club:
 * - `minor`: flujo estándar (un adulto registra a hijos menores). Incluye
 *   secciones child + tutor + general.
 * - `adult`: flujo para jugadores mayores de edad que se registran a sí
 *   mismos. Solo secciones child (datos del jugador) + general.
 */
export type RegisterFormVariant = 'minor' | 'adult';

export interface RegisterFormField {
  /** Id alfanumérico (a-z, 0-9, _). Usado como nombre del control reactivo. */
  id: string;
  type: RegisterFormFieldType;
  /** Etiqueta literal mostrada al padre (texto del club, sin i18n). */
  label: string;
  /** Texto de ayuda opcional bajo el label. */
  helpText?: string;
  required?: boolean;
  /** Texto del placeholder en inputs de texto/número/date. */
  placeholder?: string;
  /** Opciones para tipos select y multi_check. */
  options?: string[];
  /** Texto legal completo para tipos consent (LOPD, cesión imagen, etc.). */
  text?: string;
  /**
   * Slot del catálogo al que está enlazado este campo. Si está presente,
   * el valor se aplica además a la columna canónica de Player en backend
   * (ej. `tutor_dni_padre` → `players.dni_padre`). Si está ausente, el
   * campo es libre y solo vive en answers_json.
   */
  binding?: string;

  /**
   * Solo para campos tipo `document`: URL pública absoluta del archivo
   * subido por el club (PDF, Word, imagen). Se genera al hacer upload
   * desde el builder y se persiste dentro del schema. El padre la usa
   * directamente como `href` del botón "Descargar".
   */
  fileUrl?: string;
  /** Nombre del archivo tal y como queda almacenado en el servidor. */
  fileName?: string;
  /** Tamaño en bytes del archivo. Usado para mostrar "1.2 MB" en la UI. */
  fileSize?: number;
  /** Tipo MIME del archivo. Usado para elegir el icono correcto. */
  mimeType?: string;
}

/** Identificadores conocidos de slots del catálogo. */
export type RegisterFormBindingKey =
  | 'player_direccion'
  | 'player_altura'
  | 'player_peso'
  | 'player_posicion'
  | 'player_pierna_natural'
  | 'tutor_dni_padre'
  | 'tutor_dni_madre';

export type RegisterFormBindingTarget = 'child' | 'tutor' | 'general';
export type RegisterFormBindingType = 'text' | 'textarea' | 'select' | 'consent' | 'date';
/**
 * Indica a qué entidad va el valor cuando el club activa el slot:
 *  - `child`: persiste en `players` (uno por hijo o replicado a todos según target).
 *  - `user`:  persiste en `users` (la cuenta del padre/tutor que se registra).
 */
export type RegisterFormBindingAppliesTo = 'child' | 'user';

/** Slot del catálogo de campos enlazables (mirror del backend). */
export interface RegisterFormBindingSlot {
  /** Identificador único del slot. */
  key: RegisterFormBindingKey | string;
  /** Sección a la que pertenece (child = jugador, tutor = padres). */
  target: RegisterFormBindingTarget;
  /** Tipo de control que el frontend debe forzar para este slot. */
  type: RegisterFormBindingType;
  /** Clave i18n con la etiqueta sugerida del slot. */
  labelKey: string;
  /** Opciones predefinidas para slots de tipo select (ej. posiciones). */
  options: string[];
  /** Entidad destino al persistir. */
  appliesTo?: RegisterFormBindingAppliesTo;
  /**
   * Slot deprecado. El backend devuelve `false` para slots vigentes y solo
   * marca `true` cuando expone los slots legacy (ej. `tutor_*_usuario`,
   * sustituidos por `tutor_*_padre` / `tutor_*_madre`). El builder
   * normalmente no los recibe en el catálogo público; cuando sí los recibe
   * (porque el club los tenía activos en una plantilla anterior), debe
   * renderizarlos con un aviso "deprecated".
   */
  legacy?: boolean;
}

export interface RegisterFormBindingCatalog {
  version: number;
  slots: RegisterFormBindingSlot[];
}

export interface RegisterFormSection {
  id: RegisterFormSectionId;
  /** Título mostrado encima de la sección. */
  title: string;
  /** Subtítulo opcional. */
  subtitle?: string;
  fields: RegisterFormField[];
}

export interface RegisterFormSchema {
  version: number;
  sections: RegisterFormSection[];
}

export interface ClubRegisterFormTemplate {
  templateId: number | null;
  clubId: number;
  active: 0 | 1;
  schema: RegisterFormSchema;
  createdAt?: string;
  updatedAt?: string;
}

/** Bloque de respuestas que el frontend manda al guardar. */
export interface ClubRegisterFormAnswers {
  general?: Record<string, unknown>;
  tutor?: Record<string, unknown>;
  child?: Record<string, unknown>;
  /** Lista de consentimientos firmados con timestamp ISO. */
  consents?: Array<{ id: string; accepted: boolean; ts: string }>;
}

export interface ClubRegisterFormResponsePayload {
  clubId: number;
  userId: number;
  playerId?: number | null;
  answers: ClubRegisterFormAnswers;
  /**
   * Variante del formulario contra la que se responde. `minor` (por
   * defecto) usa el schema de padres; `adult` usa el de jugadores mayores
   * de edad para aplicar los bindings correctos en el backend.
   */
  variant?: RegisterFormVariant;
}

/**
 * Perfil dinámico de un jugador devuelto por
 * `GET /rest/club-register-form/player-profile?teamId=...&playerId=...`.
 *
 * Combina el schema activo del club resuelto desde el `teamId` con los
 * valores actuales mezclados de Player + User + último `answers_json`
 * guardado. Si el club no tiene plantilla, `hasCustomForm` es `false` y
 * la pantalla debe pintar el layout legacy.
 */
export interface PlayerDynamicProfile {
  hasCustomForm: boolean;
  clubId: number | null;
  schema: RegisterFormSchema | null;
  values: ClubRegisterFormAnswers;
  /** Id del usuario padre dueño del player (si se ha podido resolver). */
  ownerUserId?: number | null;
  /**
   * Firmas/consentimientos del formulario con su estado y fecha de
   * aceptación. `accepted=null` significa que aún no hay respuesta guardada
   * (nunca firmado). `ts` es la fecha ISO en que el padre lo aceptó/rechazó.
   */
  consents?: PlayerConsentStatus[];
}

/**
 * Estado de una firma/consentimiento del formulario de registro para un
 * jugador concreto, tal y como lo devuelve el backend en
 * `player-profile.consents[]`.
 */
export interface PlayerConsentStatus {
  id: string;
  /** Etiqueta del consentimiento (texto del club). */
  label: string;
  /** Texto legal completo del consentimiento. */
  text?: string;
  required?: boolean;
  /** `true` aceptado, `false` rechazado, `null` sin respuesta todavía. */
  accepted: boolean | null;
  /** Fecha ISO de aceptación/rechazo (o `null` si nunca se firmó). */
  ts: string | null;
}

/** Forma de respuesta del backend (envoltorio Response<T>). */
export interface ApiEnvelope<T> {
  status: number;
  data: T;
  error: { code: number; msg: string };
}

/**
 * Configuración por club de la tabla "Información de jugadores"
 * (`/dashboard/info-jugadores`). Permite al admin elegir qué columnas
 * son visibles y en qué orden.
 */
export interface PlayersTableColumnConfig {
  id: string;
  visible: boolean;
}

export interface PlayersTableConfig {
  columns: PlayersTableColumnConfig[];
}

export interface PlayersTableConfigDto {
  configId: number;
  clubId: number;
  config: PlayersTableConfig | null;
  updatedAt?: string;
}

/** Catálogo cerrado de tipos de campo para el builder. */
export const REGISTER_FORM_FIELD_TYPES: ReadonlyArray<RegisterFormFieldType> = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'checkbox',
  'multi_check',
  'consent',
  'info',
  'document',
] as const;

/** Tipos de campo "libre" que el club puede añadir en el builder sin pasar por slots canónicos. */
export type FreeRegisterFormFieldType = 'info' | 'select' | 'consent' | 'document';

export const FREE_REGISTER_FORM_FIELD_TYPES: ReadonlyArray<FreeRegisterFormFieldType> = [
  'info',
  'select',
  'consent',
  'document',
] as const;

/** Una variante de precio dentro de un pago (Fase 2/3 de variantes). */
export interface RegisterPaymentVariant {
  id: number;
  nombre: string;
  importe: string;
}

/**
 * Pago del club marcado para mostrarse en el registro, con sus variantes.
 * El padre elige una variante por hijo en el último paso del wizard.
 */
export interface RegisterPaymentVariantGroup {
  pagoClubId: number;
  titulo: string;
  /** Descripción opcional del pago configurada por el club. */
  descripcion?: string | null;
  importe: string;
  /** Fecha límite del pago (string del backend). Usada en el resumen y para detectar pagos vencidos. */
  fechaLimite?: string | null;
  pedirTarjetaRegistro: number;
  variantes: RegisterPaymentVariant[];
}

/** Selección de variante del padre para un hijo concreto (envío al backend). */
export interface RegisterPaymentVariantSelection {
  pagoClubId: number;
  playerId: number;
  varianteId: number;
}

/** Respuesta del endpoint de subida de documentos del builder. */
export interface UploadedDocumentInfo {
  fileUrl: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Esquema vacío usado cuando el club aún no ha configurado nada. El
 * builder arranca desde aquí.
 */
export const EMPTY_REGISTER_FORM_SCHEMA: RegisterFormSchema = {
  version: 1,
  sections: [],
};
