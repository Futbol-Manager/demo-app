import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ClubRegisterFormService } from 'src/app/core/services/club-register-form/club-register-form.service';
import { PdfExportService } from 'src/app/core/services/pdf-export/pdf-export.service';
import {
  EMPTY_REGISTER_FORM_SCHEMA,
  FreeRegisterFormFieldType,
  FREE_REGISTER_FORM_FIELD_TYPES,
  RegisterFormBindingSlot,
  RegisterFormBindingType,
  RegisterFormField,
  RegisterFormFieldType,
  RegisterFormSchema,
  RegisterFormSection,
  RegisterFormSectionId,
  RegisterFormVariant,
} from 'src/app/core/services/club-register-form/club-register-form.model';
import { DynamicRegisterFieldsComponent } from 'src/app/pages/register/dynamic-register-fields/dynamic-register-fields.component';

interface SectionMeta {
  id: RegisterFormSectionId;
  defaultTitleKey: string;
  defaultSubtitleKey: string;
  /** Texto de ayuda visible bajo el título de la sección en el builder. */
  hintKey: string;
  chipKey: string;
}

/**
 * Campo libre añadido manualmente por el club. NO está en el catálogo de
 * slots canónicos, vive solo en answers_json (no se replica a `players`/`users`).
 *
 * Tipos soportados:
 *  - `info`:     bloque de texto estático (LOPD del club, IBAN, calendario…). No se persiste como respuesta.
 *  - `select`:   desplegable con opciones que el club define (modalidad de cuota, etc.).
 *  - `consent`:  consentimiento adicional con texto legal del club (LOPD, servicios médicos…).
 *  - `document`: archivo descargable subido por el club (PDF, Word, imagen). Solo lectura para el padre.
 */
interface FreeField {
  /** Id estable para tracking + nombre de control reactivo. */
  id: string;
  type: FreeRegisterFormFieldType;
  sectionId: RegisterFormSectionId;
  /** Texto del bloque info / texto legal del consent / descripción del documento. */
  text: string;
  /** Etiqueta (no aplica a info, sí a select, consent y document). */
  label: string;
  /** Opciones para select libre. */
  options: string[];
  required: boolean;
  /** Solo `document`: URL pública absoluta del archivo subido. Vacío hasta que la subida tiene éxito. */
  fileUrl?: string;
  /** Solo `document`: nombre del fichero en el servidor (saneado + uuid). */
  fileName?: string;
  /** Solo `document`: tamaño en bytes (para mostrar "1.2 MB"). */
  fileSize?: number;
  /** Solo `document`: MIME real (para elegir icono PDF/Word/imagen). */
  mimeType?: string;
  /** Solo `document`: indicador de subida en curso para feedback en la UI. */
  uploading?: boolean;
  /** Solo `document`: último error de subida para mostrar bajo el campo. */
  uploadError?: string | null;
}

/**
 * Estado completo del editor para una variante concreta (menores / adultos).
 * Cada pestaña conserva su propio estado en memoria para no perder cambios
 * sin guardar al alternar entre pestañas.
 */
interface VariantState {
  active: 0 | 1;
  selectedSlots: Set<string>;
  requiredSlots: Set<string>;
  slotOptionsOverride: Record<string, string[]>;
  slotTextOverride: Record<string, string>;
  freeFields: FreeField[];
  orderBySection: Record<RegisterFormSectionId, string[]>;
  freeFieldSeq: number;
  /** True cuando ya se ha cargado el schema de esta variante del backend. */
  loaded: boolean;
}

/** Formatos permitidos para campos `document` (deben coincidir con el backend). */
const DOCUMENT_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'];
const DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
/** Atributo `accept` para el input file (incluye MIME y extensiones por compatibilidad). */
const DOCUMENT_ACCEPT_ATTR =
  '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp';

// Orden visual fijado por producto: el club ve primero los datos del jugador,
// después los de los tutores y finalmente los datos generales del alta.
const SECTION_META: ReadonlyArray<SectionMeta> = [
  {
    id: 'child',
    defaultTitleKey: 'CLUB_REGISTER_FORM.BUILDER.CHILD_DEFAULT_TITLE',
    defaultSubtitleKey: 'CLUB_REGISTER_FORM.BUILDER.CHILD_DEFAULT_SUBTITLE',
    hintKey: 'CLUB_REGISTER_FORM.BUILDER.PICK_SECTION_CHILD_HINT',
    chipKey: 'CLUB_REGISTER_FORM.BUILDER.CHILD_CHIP',
  },
  {
    id: 'tutor',
    defaultTitleKey: 'CLUB_REGISTER_FORM.BUILDER.TUTOR_DEFAULT_TITLE',
    defaultSubtitleKey: 'CLUB_REGISTER_FORM.BUILDER.TUTOR_DEFAULT_SUBTITLE',
    hintKey: 'CLUB_REGISTER_FORM.BUILDER.PICK_SECTION_TUTOR_HINT',
    chipKey: 'CLUB_REGISTER_FORM.BUILDER.TUTOR_CHIP',
  },
  {
    id: 'general',
    defaultTitleKey: 'CLUB_REGISTER_FORM.BUILDER.GENERAL_DEFAULT_TITLE',
    defaultSubtitleKey: 'CLUB_REGISTER_FORM.BUILDER.GENERAL_DEFAULT_SUBTITLE',
    hintKey: 'CLUB_REGISTER_FORM.BUILDER.PICK_SECTION_GENERAL_HINT',
    chipKey: 'CLUB_REGISTER_FORM.BUILDER.GENERAL_CHIP',
  },
];

/**
 * Editor del formulario extendido de registro de padres del club.
 *
 * Modelo "checkbox-driven + extras":
 *  · Sphaira mantiene un catálogo cerrado de slots (datos canónicos con
 *    columna real en `players` o `users`). El club marca/desmarca y elige
 *    si cada slot es obligatorio.
 *  · Adicionalmente, el club puede añadir campos libres para casos no
 *    cubiertos por el catálogo: bloques informativos, desplegables con
 *    opciones propias del club (ej. modalidad de cuota) y consentimientos
 *    adicionales con texto legal personalizado.
 *
 * El esquema persistido en BD se reconstruye al guardar a partir de la
 * selección actual + los campos libres. Al cargar, el componente decodifica
 * el esquema viejo y rellena `selectedSlots`, `requiredSlots` y `freeFields`.
 */
@Component({
  selector: 'app-club-register-form-builder',
  templateUrl: './club-register-form-builder.component.html',
  styleUrls: ['./club-register-form-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubRegisterFormBuilderComponent implements OnInit {
  readonly sectionMeta = SECTION_META;
  readonly freeFieldTypes = FREE_REGISTER_FORM_FIELD_TYPES;

  /** Pestaña de variante activa del builder: menores/padres o mayores de edad. */
  formVariant: RegisterFormVariant = 'minor';

  /**
   * Estado del editor guardado en memoria para cada variante. Permite
   * alternar entre pestañas sin perder cambios pendientes de guardar.
   */
  private variantStates: Record<RegisterFormVariant, VariantState> = {
    minor: this.emptyVariantState(),
    adult: this.emptyVariantState(),
  };

  /** Clave i18n del título de la sección "Datos del jugador" en la variante adultos. */
  private readonly ADULT_CHILD_TITLE_KEY = 'CLUB_REGISTER_FORM.BUILDER.CHILD_ADULT_DEFAULT_TITLE';
  /**
   * Datos base del jugador que SIEMPRE se piden en el registro y son
   * obligatorios. No forman parte del catálogo configurable: se muestran
   * fijos y bloqueados en la cabecera de "Datos del jugador" como indicativo
   * para el club (no se pueden desmarcar ni reordenar).
   */
  readonly baseChildFields: ReadonlyArray<string> = [
    'CLUB_REGISTER_FORM.BUILDER.BASE_CHILD_NAME',
    'CLUB_REGISTER_FORM.BUILDER.BASE_CHILD_SURNAME',
    'CLUB_REGISTER_FORM.BUILDER.BASE_CHILD_BIRTHDATE',
    'CLUB_REGISTER_FORM.BUILDER.BASE_CHILD_DNI',
  ];
  /** Atributo `accept` para los inputs file de documentos. */
  readonly documentAcceptAttr = DOCUMENT_ACCEPT_ATTR;
  /** Tamaño máximo permitido por documento (5 MB). */
  readonly documentMaxSizeBytes = DOCUMENT_MAX_SIZE_BYTES;
  /**
   * Secciones en las que el club puede añadir documentos. Por decisión
   * de producto solo se permiten en "Datos generales del alta": ahí van
   * documentos comunes (bases del club, calendario, política LOPD, etc.)
   * y no datos específicos de un jugador/tutor concreto.
   */
  private readonly DOCUMENT_ALLOWED_SECTIONS: ReadonlyArray<RegisterFormSectionId> = ['general'];

  clubId = 0;
  loading = false;
  saving = false;
  active: 0 | 1 = 1;

  /** Catálogo de slots descargado del backend (orden tal cual lo devuelve). */
  bindingCatalog: RegisterFormBindingSlot[] = [];
  private bindingByKey = new Map<string, RegisterFormBindingSlot>();

  /** Slots actualmente marcados por el club. */
  selectedSlots = new Set<string>();
  /** Subset de selectedSlots con toggle "Obligatorio" activo. */
  requiredSlots = new Set<string>();

  /**
   * Opciones personalizadas por el club para slots canónicos de tipo
   * `select`. Si una key existe en este map, sus valores prevalecen sobre
   * las opciones por defecto del catálogo. Al marcar un slot por primera
   * vez se inicializa con las opciones del catálogo y a partir de ahí el
   * club puede editarlas (añadir, renombrar, eliminar).
   */
  slotOptionsOverride: Record<string, string[]> = {};

  /**
   * Texto legal personalizado por el club para slots canónicos de tipo
   * `consent`. Si existe, prevalece sobre la etiqueta traducida que se
   * usaba como texto por defecto. La columna canónica del backend sigue
   * guardando solo el booleano (aceptado / no aceptado).
   */
  slotTextOverride: Record<string, string> = {};

  /** Campos libres añadidos manualmente por el club, indexados por sección. */
  freeFields: FreeField[] = [];

  /**
   * Orden visible de los items dentro de cada sección.
   * Cada string es bien una `slot.key` (cuando el item es un slot canónico
   * marcado) o el `id` de un {@link FreeField} (cuando es un campo libre).
   * El orden de este array es el que se persiste en BD y el que verá el
   * padre en el formulario público — por eso es la fuente de verdad.
   */
  orderBySection: Record<RegisterFormSectionId, string[]> = {
    child: [],
    tutor: [],
    general: [],
  };

  /** Mensaje de error de validación local. */
  validationError: string | null = null;

  /** Toggle para mostrar la previsualización con el renderer real. */
  showPreview = false;

  /** Schema reconstruido on-demand para el preview. */
  previewSchema: RegisterFormSchema = { ...EMPTY_REGISTER_FORM_SCHEMA, sections: [] };

  /** Contador local para generar ids únicos de free fields. */
  private freeFieldSeq = 1;

  /** Exportación a PDF: menú desplegable y estado en curso. */
  exportMenuOpen = false;
  exporting = false;
  /** Versión que se está renderizando fuera de pantalla para capturar el PDF. */
  exportRenderMode: 'club' | 'parents' | null = null;

  /** Contenedor oculto que se captura con html2canvas al exportar. */
  @ViewChild('pdfStage') pdfStageRef?: ElementRef<HTMLElement>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly location: Location,
    private readonly api: ClubRegisterFormService,
    private readonly notification: NotificationService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly pdfExport: PdfExportService,
  ) {}

  /**
   * Vuelve a la pantalla de documentos del club. Si el usuario entró
   * directamente a esta URL (sin historial previo) navega explícitamente a
   * /dashboard/documentos-club/:clubId para no quedarse atascado.
   */
  goBack(): void {
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      this.location.back();
    } else if (this.clubId > 0) {
      this.router.navigate(['/dashboard/documentos-club', this.clubId]);
    } else {
      this.router.navigate(['/dashboard/inicio']);
    }
  }

  ngOnInit(): void {
    // El catálogo es la fuente de verdad de la UI: si falla la descarga
    // mostramos un aviso pero no rompemos la pantalla.
    this.api.getBindingCatalog().subscribe({
      next: res => {
        const slots = res?.data?.slots ?? [];
        this.bindingCatalog = slots;
        this.bindingByKey = new Map(slots.map(s => [s.key, s]));
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('[ClubRegisterFormBuilder] catalog error:', err);
        this.bindingCatalog = [];
      },
    });

    this.route.paramMap.subscribe(p => {
      const raw = p.get('clubId');
      this.clubId = raw ? +raw : 0;
      if (this.clubId > 0) {
        this.load();
      }
    });
  }

  private load(): void {
    this.loading = true;
    this.formVariant = 'minor';
    this.variantStates = { minor: this.emptyVariantState(), adult: this.emptyVariantState() };
    this.cdr.markForCheck();

    // Cargamos las dos variantes de golpe para que el cambio de pestaña sea
    // inmediato y conserve el estado. La variante activa (menores) se vuelca
    // al estado de trabajo; la de adultos queda en su bucket hasta que el
    // club abra su pestaña.
    forkJoin({
      minor: this.api.getAdminTemplate(this.clubId, 'minor'),
      adult: this.api.getAdminTemplate(this.clubId, 'adult'),
    }).subscribe({
      next: ({ minor, adult }) => {
        const minorSchema = minor?.data?.schema ?? { ...EMPTY_REGISTER_FORM_SCHEMA, sections: [] };
        const minorActive: 0 | 1 = (minor?.data?.active ?? 1) === 0 ? 0 : 1;
        this.variantStates.minor = this.buildStateFromSchema(minorSchema, minorActive);

        const adultSchema = adult?.data?.schema ?? { ...EMPTY_REGISTER_FORM_SCHEMA, sections: [] };
        const adultActive: 0 | 1 = (adult?.data?.active ?? 0) === 0 ? 0 : 1;
        this.variantStates.adult = this.buildStateFromSchema(adultSchema, adultActive);

        this.applyState(this.variantStates[this.formVariant]);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('[ClubRegisterFormBuilder] load error:', err);
        this.loading = false;
        this.notification.errorGeneric();
        this.cdr.markForCheck();
      },
    });
  }

  /** Estado vacío inicial para una variante. */
  private emptyVariantState(): VariantState {
    return {
      active: 1,
      selectedSlots: new Set<string>(),
      requiredSlots: new Set<string>(),
      slotOptionsOverride: {},
      slotTextOverride: {},
      freeFields: [],
      orderBySection: { child: [], tutor: [], general: [] },
      freeFieldSeq: 1,
      loaded: false,
    };
  }

  // ─── Cambio de pestaña de variante (menores / adultos) ────────────────

  /** Secciones visibles en la variante activa (adultos oculta "tutor"). */
  get visibleSectionMeta(): ReadonlyArray<SectionMeta> {
    if (this.formVariant === 'adult') {
      return this.sectionMeta.filter(m => m.id !== 'tutor');
    }
    return this.sectionMeta;
  }

  /** Clave i18n del título de una sección teniendo en cuenta la variante. */
  sectionTitleKey(meta: SectionMeta): string {
    if (this.formVariant === 'adult' && meta.id === 'child') {
      return this.ADULT_CHILD_TITLE_KEY;
    }
    return meta.defaultTitleKey;
  }

  /** Cambia de pestaña conservando en memoria el estado de la actual. */
  switchVariant(variant: RegisterFormVariant): void {
    if (variant === this.formVariant) return;
    this.captureCurrentVariant();
    this.formVariant = variant;
    this.validationError = null;
    this.showPreview = false;
    this.applyState(this.variantStates[variant]);
    this.cdr.markForCheck();
  }

  /** Vuelca el estado de trabajo actual al bucket de su variante. */
  private captureCurrentVariant(): void {
    this.variantStates[this.formVariant] = {
      active: this.active,
      selectedSlots: new Set(this.selectedSlots),
      requiredSlots: new Set(this.requiredSlots),
      slotOptionsOverride: this.cloneOptionsMap(this.slotOptionsOverride),
      slotTextOverride: { ...this.slotTextOverride },
      freeFields: this.freeFields.map(f => ({ ...f, options: [...f.options] })),
      orderBySection: {
        child: [...this.orderBySection.child],
        tutor: [...this.orderBySection.tutor],
        general: [...this.orderBySection.general],
      },
      freeFieldSeq: this.freeFieldSeq,
      loaded: true,
    };
  }

  /** Copia el estado de un bucket a los campos de trabajo del editor. */
  private applyState(state: VariantState): void {
    this.active = state.active;
    this.selectedSlots = new Set(state.selectedSlots);
    this.requiredSlots = new Set(state.requiredSlots);
    this.slotOptionsOverride = this.cloneOptionsMap(state.slotOptionsOverride);
    this.slotTextOverride = { ...state.slotTextOverride };
    this.freeFields = state.freeFields.map(f => ({ ...f, options: [...f.options] }));
    this.orderBySection = {
      child: [...state.orderBySection.child],
      tutor: [...state.orderBySection.tutor],
      general: [...state.orderBySection.general],
    };
    this.freeFieldSeq = state.freeFieldSeq;
  }

  private cloneOptionsMap(src: Record<string, string[]>): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(src)) out[k] = [...src[k]];
    return out;
  }

  /**
   * Recorre el schema persistido y rellena el estado de la UI:
   *  - Fields con `binding` → `selectedSlots`/`requiredSlots`.
   *  - Fields sin `binding` con tipo `info`/`select`/`consent` → `freeFields`.
   *  - Cualquier otro field libre se descarta (incompatible con el modelo actual).
   *
   * <p>Al mismo tiempo reconstruye {@link orderBySection} respetando
   * exactamente el orden en que aparecen los fields dentro de cada
   * sección (así la UI puede mostrarlos en el mismo orden que verá el
   * padre y permitir reordenarlos con flechas).
   *
   * <p>Si un binding del schema persistido NO está en el catálogo público
   * del backend, lo tratamos como "ghost legacy": creamos un slot fantasma
   * con {@code legacy: true} a partir de los datos del field para que el
   * club siga viendo el campo en el builder y pueda eliminarlo si quiere,
   * pero no se ofrece como nuevo en la lista de disponibles.
   */
  private buildStateFromSchema(schema: RegisterFormSchema, active: 0 | 1): VariantState {
    const state: VariantState = this.emptyVariantState();
    state.active = active;
    state.loaded = true;
    let seq = 1;
    const sections = Array.isArray(schema?.sections) ? schema.sections : [];
    for (const section of sections) {
      const sectionId = section?.id as RegisterFormSectionId | undefined;
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      for (const f of fields) {
        if (!f || typeof f !== 'object') continue;
        const ff = f as RegisterFormField;
        if (ff.binding) {
          state.selectedSlots.add(ff.binding);
          if (ff.required) state.requiredSlots.add(ff.binding);
          if (sectionId) {
            state.orderBySection[sectionId].push(ff.binding);
          }
          // Si el binding NO está en el catálogo público (porque el slot
          // fue deprecado tras este schema), reconstruimos un ghost slot
          // legacy desde los datos del field. Sin esto, resolveItem() no
          // encontraría el slot y la fila quedaría invisible — peor para
          // el club que no podría eliminarla.
          if (sectionId && !this.bindingByKey.has(ff.binding)) {
            const ghost: RegisterFormBindingSlot = {
              key: ff.binding,
              target: sectionId,
              type: this.fieldTypeToBindingType(ff.type),
              labelKey: `BUILDER.SLOTS.${ff.binding.toUpperCase()}`,
              options: Array.isArray(ff.options) ? [...ff.options] : [],
              legacy: true,
            };
            this.bindingCatalog = [...this.bindingCatalog, ghost];
            this.bindingByKey.set(ghost.key, ghost);
          }
          // Recuperamos las personalizaciones que el club haya guardado
          // en versiones anteriores del schema: opciones de selects y
          // texto legal de consents.
          if (ff.type === 'select' && Array.isArray(ff.options)) {
            state.slotOptionsOverride[ff.binding] = [...ff.options];
          }
          if (ff.type === 'consent' && typeof ff.text === 'string') {
            state.slotTextOverride[ff.binding] = ff.text;
          }
          continue;
        }
        if (!sectionId) continue;
        if (ff.type === 'info' || ff.type === 'select' || ff.type === 'consent' || ff.type === 'document') {
          const free: FreeField = {
            id: ff.id || `${ff.type}_${seq++}`,
            type: ff.type,
            sectionId,
            text: typeof ff.text === 'string' ? ff.text : '',
            label: typeof ff.label === 'string' ? ff.label : '',
            options: Array.isArray(ff.options) ? [...ff.options] : [],
            required: !!ff.required,
            fileUrl: typeof ff.fileUrl === 'string' ? ff.fileUrl : undefined,
            fileName: typeof ff.fileName === 'string' ? ff.fileName : undefined,
            fileSize: typeof ff.fileSize === 'number' ? ff.fileSize : undefined,
            mimeType: typeof ff.mimeType === 'string' ? ff.mimeType : undefined,
          };
          state.freeFields.push(free);
          state.orderBySection[sectionId].push(free.id);
        }
      }
    }
    state.freeFieldSeq = seq;
    return state;
  }

  // ─── UI helpers (slots canónicos) ─────────────────────────────────────

  slotsBySection(sectionId: RegisterFormSectionId): RegisterFormBindingSlot[] {
    return this.bindingCatalog.filter(s => s.target === sectionId);
  }

  isSelected(slot: RegisterFormBindingSlot): boolean {
    return this.selectedSlots.has(slot.key);
  }

  isRequired(slot: RegisterFormBindingSlot): boolean {
    return this.requiredSlots.has(slot.key);
  }

  toggleSelected(slot: RegisterFormBindingSlot): void {
    const order = this.orderBySection[slot.target];
    if (this.selectedSlots.has(slot.key)) {
      this.selectedSlots.delete(slot.key);
      this.requiredSlots.delete(slot.key);
      delete this.slotOptionsOverride[slot.key];
      delete this.slotTextOverride[slot.key];
      const idx = order.indexOf(slot.key);
      if (idx >= 0) order.splice(idx, 1);
    } else {
      this.selectedSlots.add(slot.key);
      // Nuevo slot va al final de su sección. El club puede subirlo con las
      // flechas de reordenamiento si quiere otra posición.
      order.push(slot.key);
      // Inicializa la personalización con los valores por defecto del
      // catálogo (para selects) o con la etiqueta traducida (para consents)
      // de modo que el editor empiece con contenido sensato.
      if (slot.type === 'select' && !this.slotOptionsOverride[slot.key]) {
        const def = Array.isArray(slot.options) ? slot.options : [];
        this.slotOptionsOverride[slot.key] = def.length > 0 ? [...def] : [''];
      }
      if (slot.type === 'consent' && this.slotTextOverride[slot.key] === undefined) {
        const labelKey = this.slotLabelKey(slot);
        const labelTranslated = this.translate.instant(labelKey);
        this.slotTextOverride[slot.key] = labelTranslated && labelTranslated !== labelKey
          ? labelTranslated
          : '';
      }
    }
    this.cdr.markForCheck();
  }

  // ─── Editor de slots canónicos personalizables (select / consent) ─────

  /** Opciones actuales mostradas en el editor para un select canónico. */
  getSlotOptions(slot: RegisterFormBindingSlot): string[] {
    if (!this.slotOptionsOverride[slot.key]) {
      this.slotOptionsOverride[slot.key] = Array.isArray(slot.options) && slot.options.length > 0
        ? [...slot.options]
        : [''];
    }
    return this.slotOptionsOverride[slot.key];
  }

  setSlotOption(slot: RegisterFormBindingSlot, idx: number, value: string): void {
    const arr = this.getSlotOptions(slot);
    if (idx >= 0 && idx < arr.length) arr[idx] = value;
    this.cdr.markForCheck();
  }

  addSlotOption(slot: RegisterFormBindingSlot): void {
    this.getSlotOptions(slot).push('');
    this.cdr.markForCheck();
  }

  removeSlotOption(slot: RegisterFormBindingSlot, idx: number): void {
    const arr = this.getSlotOptions(slot);
    if (idx >= 0 && idx < arr.length) arr.splice(idx, 1);
    this.cdr.markForCheck();
  }

  /** Texto legal actual para un consent canónico (con fallback a la etiqueta). */
  getSlotConsentText(slot: RegisterFormBindingSlot): string {
    return this.slotTextOverride[slot.key] ?? '';
  }

  setSlotConsentText(slot: RegisterFormBindingSlot, value: string): void {
    this.slotTextOverride[slot.key] = value;
    this.cdr.markForCheck();
  }

  toggleRequired(slot: RegisterFormBindingSlot): void {
    if (!this.selectedSlots.has(slot.key)) return;
    if (this.requiredSlots.has(slot.key)) {
      this.requiredSlots.delete(slot.key);
    } else {
      this.requiredSlots.add(slot.key);
    }
    this.cdr.markForCheck();
  }

  slotLabelKey(slot: RegisterFormBindingSlot): string {
    return `CLUB_REGISTER_FORM.${slot.labelKey}`;
  }

  get totalSelected(): number {
    return this.selectedSlots.size;
  }

  trackBySection(_i: number, m: SectionMeta): string {
    return m.id;
  }

  trackBySlot(_i: number, s: RegisterFormBindingSlot): string {
    return s.key;
  }

  // ─── UI helpers (campos libres) ───────────────────────────────────────

  freeFieldsBySection(sectionId: RegisterFormSectionId): FreeField[] {
    return this.freeFields.filter(f => f.sectionId === sectionId);
  }

  /** Añade un campo libre del tipo indicado a la sección dada. */
  addFreeField(sectionId: RegisterFormSectionId, type: FreeRegisterFormFieldType): void {
    const f: FreeField = {
      id: this.nextFreeFieldId(type),
      type,
      sectionId,
      text: '',
      label: '',
      options: type === 'select' ? [''] : [],
      required: false,
    };
    this.freeFields.push(f);
    this.orderBySection[sectionId].push(f.id);
    this.cdr.markForCheck();
  }

  removeFreeField(field: FreeField): void {
    this.freeFields = this.freeFields.filter(f => f !== field);
    const order = this.orderBySection[field.sectionId];
    const idx = order.indexOf(field.id);
    if (idx >= 0) order.splice(idx, 1);
    this.cdr.markForCheck();
  }

  addFreeOption(field: FreeField): void {
    if (field.type !== 'select') return;
    field.options = [...field.options, ''];
    this.cdr.markForCheck();
  }

  removeFreeOption(field: FreeField, idx: number): void {
    if (field.type !== 'select') return;
    field.options = field.options.filter((_, i) => i !== idx);
    this.cdr.markForCheck();
  }

  trackFreeField(_i: number, f: FreeField): string {
    return f.id;
  }

  trackByIndex(i: number): number {
    return i;
  }

  /** Ids estables del tipo `info_3`, `consent_2`, etc. */
  private nextFreeFieldId(type: FreeRegisterFormFieldType): string {
    return `${type}_${this.freeFieldSeq++}`;
  }

  // ─── UI helpers (documentos) ──────────────────────────────────────────

  /**
   * Indica si el botón "+ Documento" debe estar visible para una sección.
   * Solo permitimos documentos en "Datos generales del alta" (decisión de
   * producto). Si en el futuro se decide habilitarlos en otras secciones,
   * basta con añadir esos sectionId a `DOCUMENT_ALLOWED_SECTIONS`.
   */
  canAddDocumentTo(sectionId: RegisterFormSectionId): boolean {
    return this.DOCUMENT_ALLOWED_SECTIONS.indexOf(sectionId) >= 0;
  }

  /** Convierte un tamaño en bytes a una cadena legible (KB / MB). */
  formatFileSize(bytes: number | undefined | null): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Devuelve la clase Bootstrap Icons adecuada según el MIME o la
   * extensión del archivo. Útil para mostrar un icono representativo
   * en el builder y en la tarjeta del padre.
   */
  documentIconFor(field: FreeField): string {
    const mime = (field.mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return 'bi-file-earmark-image';
    if (mime === 'application/pdf') return 'bi-file-earmark-pdf';
    if (mime.includes('word') || mime.includes('msword')) return 'bi-file-earmark-word';
    const ext = this.extractExtension(field.fileName);
    if (ext === 'pdf') return 'bi-file-earmark-pdf';
    if (ext === 'doc' || ext === 'docx') return 'bi-file-earmark-word';
    if (['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) >= 0) return 'bi-file-earmark-image';
    return 'bi-file-earmark';
  }

  private extractExtension(name?: string): string {
    if (!name) return '';
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.substring(dot + 1).toLowerCase() : '';
  }

  /**
   * Maneja el evento `change` del input file de un campo `document`.
   * Valida tamaño/extensión en cliente antes de pegarle al backend para
   * dar feedback inmediato (5 MB y la whitelist coinciden con el server).
   */
  onDocumentFileSelected(field: FreeField, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) return;

    // Reset previo: si el club ya tenía un fichero asociado, lo
    // descartamos al elegir uno nuevo (el viejo queda huérfano en
    // hosting, asumimos que el coste es despreciable para 5MB max).
    field.uploadError = null;
    field.uploading = false;

    if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
      field.uploadError = this.translate.instant(
        'CLUB_REGISTER_FORM.BUILDER.DOC_ERR_TOO_LARGE',
        { max: this.formatFileSize(DOCUMENT_MAX_SIZE_BYTES) },
      );
      this.resetFileInput(input);
      this.cdr.markForCheck();
      return;
    }

    const ext = this.extractExtension(file.name);
    if (DOCUMENT_ALLOWED_EXTENSIONS.indexOf(ext) < 0) {
      field.uploadError = this.translate.instant(
        'CLUB_REGISTER_FORM.BUILDER.DOC_ERR_UNSUPPORTED',
        { formats: DOCUMENT_ALLOWED_EXTENSIONS.join(', ') },
      );
      this.resetFileInput(input);
      this.cdr.markForCheck();
      return;
    }

    field.uploading = true;
    this.cdr.markForCheck();

    this.api.uploadDocument(this.clubId, file).subscribe({
      next: res => {
        field.uploading = false;
        const data = res?.data;
        if (res?.status === 200 && data?.fileUrl) {
          field.fileUrl = data.fileUrl;
          field.fileName = data.fileName;
          field.fileSize = data.fileSize;
          field.mimeType = data.mimeType;
          field.uploadError = null;
          // Si el club aún no había puesto label, usamos el nombre
          // original sin extensión como sugerencia útil.
          if (!field.label?.trim()) {
            const original = data.originalName || file.name;
            const dot = original.lastIndexOf('.');
            field.label = dot > 0 ? original.substring(0, dot) : original;
          }
        } else {
          field.uploadError = res?.error?.msg
            || this.translate.instant('CLUB_REGISTER_FORM.BUILDER.DOC_ERR_GENERIC');
        }
        this.resetFileInput(input);
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('[ClubRegisterFormBuilder] uploadDocument error:', err);
        field.uploading = false;
        field.uploadError = err?.error?.error?.msg
          || this.translate.instant('CLUB_REGISTER_FORM.BUILDER.DOC_ERR_GENERIC');
        this.resetFileInput(input);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Limpia el documento asociado al campo (deja la fila por si el club
   * quiere subir otro). No borra del hosting: simplificación intencionada
   * para no acoplar el frontend a la gestión del FS del servidor.
   */
  clearDocument(field: FreeField): void {
    field.fileUrl = undefined;
    field.fileName = undefined;
    field.fileSize = undefined;
    field.mimeType = undefined;
    field.uploadError = null;
    this.cdr.markForCheck();
  }

  private resetFileInput(input: HTMLInputElement | null): void {
    if (input) input.value = '';
  }

  // ─── Reordenamiento ───────────────────────────────────────────────────

  /**
   * Item resuelto a partir de un id de {@link orderBySection}. Es slot
   * canónico cuando coincide con una `slot.key` del catálogo, y free field
   * cuando coincide con el `id` de un {@link FreeField}.
   */
  resolveItem(sectionId: RegisterFormSectionId, id: string):
      | { kind: 'slot'; slot: RegisterFormBindingSlot }
      | { kind: 'free'; free: FreeField }
      | null {
    const slot = this.bindingByKey.get(id);
    if (slot && slot.target === sectionId && this.selectedSlots.has(slot.key)) {
      return { kind: 'slot', slot };
    }
    const free = this.freeFields.find(f => f.id === id && f.sectionId === sectionId);
    if (free) return { kind: 'free', free };
    return null;
  }

  /** Resuelve los items de una sección en su orden actual, ya tipados. */
  itemsBySection(sectionId: RegisterFormSectionId): Array<
      { id: string; kind: 'slot'; slot: RegisterFormBindingSlot }
    | { id: string; kind: 'free'; free: FreeField }
  > {
    const out: Array<
        { id: string; kind: 'slot'; slot: RegisterFormBindingSlot }
      | { id: string; kind: 'free'; free: FreeField }
    > = [];
    for (const id of this.orderBySection[sectionId]) {
      const r = this.resolveItem(sectionId, id);
      if (!r) continue;
      if (r.kind === 'slot') out.push({ id, kind: 'slot', slot: r.slot });
      else out.push({ id, kind: 'free', free: r.free });
    }
    return out;
  }

  /**
   * Slots del catálogo aún no añadidos a la sección — para el panel "Añadir".
   *
   * <p>Excluye explícitamente los slots {@code legacy: true}: aunque el
   * club los tenga en su schema persistido, no se ofrecen como nuevos
   * porque están deprecados a favor de su equivalente moderno (ej.
   * {@code tutor_dni_usuario} → {@code tutor_dni_padre}/{@code tutor_dni_madre}).
   */
  availableSlotsBySection(sectionId: RegisterFormSectionId): RegisterFormBindingSlot[] {
    return this.slotsBySection(sectionId).filter(s => !this.selectedSlots.has(s.key) && !s.legacy);
  }

  /** True si el slot está deprecado (no se ofrece para nuevos clubes). */
  isLegacy(slot: RegisterFormBindingSlot): boolean {
    return !!slot.legacy;
  }

  /** Inverso de mapSlotTypeToFieldType, usado al reconstruir ghost slots. */
  private fieldTypeToBindingType(t: RegisterFormFieldType): RegisterFormBindingType {
    switch (t) {
      case 'select': return 'select';
      case 'consent': return 'consent';
      case 'textarea': return 'textarea';
      case 'date': return 'date';
      default: return 'text';
    }
  }

  moveItemUp(sectionId: RegisterFormSectionId, index: number): void {
    if (index <= 0) return;
    const order = this.orderBySection[sectionId];
    [order[index - 1], order[index]] = [order[index], order[index - 1]];
    this.cdr.markForCheck();
  }

  moveItemDown(sectionId: RegisterFormSectionId, index: number): void {
    const order = this.orderBySection[sectionId];
    if (index < 0 || index >= order.length - 1) return;
    [order[index + 1], order[index]] = [order[index], order[index + 1]];
    this.cdr.markForCheck();
  }

  /** Para distinguir slots de free fields desde el template sin downcast. */
  asSlot(item: { kind: 'slot'; slot: RegisterFormBindingSlot } | { kind: 'free'; free: FreeField }): RegisterFormBindingSlot | null {
    return item.kind === 'slot' ? item.slot : null;
  }
  asFree(item: { kind: 'slot'; slot: RegisterFormBindingSlot } | { kind: 'free'; free: FreeField }): FreeField | null {
    return item.kind === 'free' ? item.free : null;
  }

  trackByItemId(_i: number, item: { id: string }): string {
    return item.id;
  }

  // ─── Preview / activación / guardado ─────────────────────────────────

  togglePreview(): void {
    this.showPreview = !this.showPreview;
    if (this.showPreview) {
      this.previewSchema = this.buildSchemaFromSelection();
    }
    this.cdr.markForCheck();
  }

  // ─── Exportación a PDF ───────────────────────────────────────────────

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
    this.cdr.markForCheck();
  }

  /** Cierra el menú de exportación al hacer clic fuera de él. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.exportMenuOpen) return;
    const target = ev.target as HTMLElement | null;
    if (!target || !target.closest('.builder__export')) {
      this.exportMenuOpen = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Exporta el formulario a PDF en dos versiones:
   *  - `club`: resumen de la configuración (qué campos se piden y si son
   *    obligatorios / siempre obligatorios), tal y como lo ve el club.
   *  - `parents`: el formulario tal y como lo ven los padres (renderizado
   *    con el mismo componente del registro público).
   *
   * Renderiza la versión elegida en un contenedor oculto fuera de pantalla
   * y lo captura con {@link PdfExportService} (cabecera/pie de marca Sphaira).
   */
  async exportPdf(mode: 'club' | 'parents'): Promise<void> {
    if (this.exporting) return;
    this.exportMenuOpen = false;
    this.exporting = true;
    // La versión de padres usa el schema reconstruido (igual que el preview).
    this.previewSchema = this.buildSchemaFromSelection();
    this.exportRenderMode = mode;
    // OnPush: forzamos el render del contenedor oculto de forma síncrona.
    this.cdr.detectChanges();
    // Damos un margen para que el renderer dinámico construya su formulario
    // y el navegador calcule el layout antes de capturar.
    await new Promise<void>(resolve => setTimeout(resolve, 400));

    try {
      const el = this.pdfStageRef?.nativeElement;
      if (!el) throw new Error('export stage not found');
      const subtitleKey = mode === 'club'
        ? 'CLUB_REGISTER_FORM.BUILDER.EXPORT_PDF_CLUB'
        : 'CLUB_REGISTER_FORM.BUILDER.EXPORT_PDF_PARENTS';
      const namePart = mode === 'club' ? 'club' : 'padres';
      const dateStr = new Date().toISOString().slice(0, 10);
      await this.pdfExport.exportReport(el, {
        fileName: `formulario_registro_${this.clubId}_${namePart}_${dateStr}`,
        title: this.translate.instant('CLUB_REGISTER_FORM.BUILDER.TITLE'),
        subtitle: this.translate.instant(subtitleKey),
        type: 'default',
        clubId: this.clubId,
      });
    } catch (e) {
      console.error('[ClubRegisterFormBuilder] export pdf error:', e);
      this.notification.errorGeneric();
    } finally {
      this.exportRenderMode = null;
      this.exporting = false;
      this.cdr.markForCheck();
    }
  }

  toggleActive(): void {
    this.active = this.active === 1 ? 0 : 1;
  }

  save(): void {
    this.validationError = this.validate();
    if (this.validationError) {
      this.notification.warning(this.validationError, false);
      this.cdr.markForCheck();
      return;
    }
    const schemaToSave = this.buildSchemaFromSelection();
    this.saving = true;
    this.cdr.markForCheck();
    this.api.saveTemplate(this.clubId, schemaToSave, this.active, this.formVariant).subscribe({
      next: res => {
        this.saving = false;
        if (res?.status === 200) {
          // Sincroniza el bucket en memoria con lo persistido para no
          // arrastrar un estado "sucio" al cambiar de pestaña tras guardar.
          this.captureCurrentVariant();
          this.notification.success(
            this.translate.instant('CLUB_REGISTER_FORM.BUILDER.SAVE_OK'),
            false,
          );
        } else {
          this.notification.warning(res?.error?.msg || 'Error', false);
        }
        this.cdr.markForCheck();
      },
      error: err => {
        this.saving = false;
        console.error('[ClubRegisterFormBuilder] save error:', err);
        this.notification.errorGeneric();
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Validación local previa al PUT. Cubre los casos que el backend rechazaría
   * (catálogo vacío, free field mal configurado) para dar feedback inmediato.
   *
   * <p>Si en {@link selectedSlots} hay claves que ya no existen en el
   * catálogo (p.ej. tras eliminar slots de tallas) las purgamos en silencio
   * en lugar de bloquear el guardado: el club no eligió ese slot, lo
   * heredó de un schema histórico.
   */
  private validate(): string | null {
    if (!this.bindingCatalog || this.bindingCatalog.length === 0) {
      return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_NO_SCHEMA');
    }
    for (const key of [...this.selectedSlots]) {
      const slot = this.bindingByKey.get(key);
      if (!slot) {
        this.selectedSlots.delete(key);
        this.requiredSlots.delete(key);
        delete this.slotOptionsOverride[key];
        delete this.slotTextOverride[key];
        for (const sec of Object.keys(this.orderBySection) as RegisterFormSectionId[]) {
          const idx = this.orderBySection[sec].indexOf(key);
          if (idx >= 0) this.orderBySection[sec].splice(idx, 1);
        }
        continue;
      }
      if (slot.type === 'select') {
        const opts = (this.slotOptionsOverride[key] ?? []).map(o => o?.trim()).filter(Boolean);
        if (opts.length === 0) {
          return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_FREE_NO_OPTIONS');
        }
      }
      if (slot.type === 'consent') {
        const text = (this.slotTextOverride[key] ?? '').trim();
        if (!text) {
          return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_FREE_CONSENT_EMPTY');
        }
      }
    }
    for (const f of this.freeFields) {
      if (f.type === 'info') {
        if (!f.text?.trim()) {
          return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_FREE_INFO_EMPTY');
        }
        continue;
      }
      if (!f.label?.trim()) {
        return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_FREE_LABEL_EMPTY');
      }
      if (f.type === 'select') {
        const opts = f.options.map(o => o?.trim()).filter(Boolean);
        if (opts.length === 0) {
          return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_FREE_NO_OPTIONS');
        }
      }
      if (f.type === 'consent' && !f.text?.trim()) {
        return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_FREE_CONSENT_EMPTY');
      }
      if (f.type === 'document') {
        if (f.uploading) {
          return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_DOC_UPLOADING');
        }
        if (!f.fileUrl?.trim()) {
          return this.translate.instant('CLUB_REGISTER_FORM.BUILDER.ERR_DOC_MISSING');
        }
      }
    }
    return null;
  }

  /**
   * Reconstruye el `RegisterFormSchema` que se enviará al backend.
   *
   * <p>Recorre {@link orderBySection} en su orden actual (el que ha
   * fijado el club con los botones ▲/▼) y emite los fields en ese mismo
   * orden, mezclando slots canónicos y free fields. El orden persistido
   * se respeta luego en el formulario público que ven los padres porque
   * el renderer dinámico itera `section.fields[]` tal cual.
   */
  private buildSchemaFromSelection(): RegisterFormSchema {
    // Solo emitimos las secciones visibles de la variante activa: en
    // adultos se excluye "tutor" (el backend rechaza esa sección).
    const sections: RegisterFormSection[] = this.visibleSectionMeta.map(meta => {
      const fields: RegisterFormField[] = [];
      for (const item of this.itemsBySection(meta.id)) {
        if (item.kind === 'slot') {
          fields.push(this.slotToField(item.slot, this.requiredSlots.has(item.slot.key)));
        } else {
          fields.push(this.freeFieldToField(item.free));
        }
      }
      return {
        id: meta.id,
        title: this.translate.instant(this.sectionTitleKey(meta)),
        subtitle: this.translate.instant(meta.defaultSubtitleKey),
        fields,
      };
    });
    return { version: 1, sections };
  }

  /** Convierte un slot del catálogo en un `RegisterFormField` listo para guardar. */
  private slotToField(slot: RegisterFormBindingSlot, required: boolean): RegisterFormField {
    const labelKey = `CLUB_REGISTER_FORM.${slot.labelKey}`;
    const labelTranslated = this.translate.instant(labelKey);
    const label = labelTranslated && labelTranslated !== labelKey
      ? labelTranslated
      : slot.key.replace(/^[a-z]+_/, '').replace(/_/g, ' ');

    const field: RegisterFormField = {
      id: slot.key,
      type: this.mapSlotTypeToFieldType(slot.type),
      label,
      required,
      binding: slot.key,
    };

    if (slot.type === 'select') {
      // Prevalecen las opciones personalizadas por el club; si no hay,
      // caemos al catálogo. Filtramos vacíos por si el editor dejó alguno.
      const override = this.slotOptionsOverride[slot.key];
      const source = Array.isArray(override) && override.length > 0
        ? override
        : (Array.isArray(slot.options) ? slot.options : []);
      field.options = source.map(o => (o ?? '').trim()).filter(Boolean);
    }
    if (slot.type === 'consent') {
      // Texto legal personalizado del club; si no, la etiqueta como
      // fallback (mismo comportamiento que antes de permitir override).
      const override = (this.slotTextOverride[slot.key] ?? '').trim();
      field.text = override || label;
    }
    return field;
  }

  /** Convierte un free field del builder en un `RegisterFormField` para persistir. */
  private freeFieldToField(f: FreeField): RegisterFormField {
    if (f.type === 'info') {
      return {
        id: f.id,
        type: 'info',
        label: '',
        text: f.text.trim(),
      };
    }
    if (f.type === 'document') {
      return {
        id: f.id,
        type: 'document',
        label: f.label.trim(),
        text: f.text?.trim() || undefined,
        fileUrl: f.fileUrl,
        fileName: f.fileName,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
      };
    }
    const out: RegisterFormField = {
      id: f.id,
      type: f.type,
      label: f.label.trim(),
      required: !!f.required,
    };
    if (f.type === 'select') {
      out.options = f.options.map(o => o?.trim()).filter(Boolean);
    }
    if (f.type === 'consent') {
      out.text = f.text.trim();
    }
    return out;
  }

  private mapSlotTypeToFieldType(slotType: RegisterFormBindingType): RegisterFormFieldType {
    switch (slotType) {
      case 'select': return 'select';
      case 'consent': return 'consent';
      case 'textarea': return 'textarea';
      case 'date': return 'date';
      case 'text':
      default:
        return 'text';
    }
  }
}
