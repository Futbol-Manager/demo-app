import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  RegisterFormField,
  RegisterFormSchema,
  RegisterFormSection,
  RegisterFormSectionId,
} from 'src/app/core/services/club-register-form/club-register-form.model';

/**
 * Renderiza una sección del formulario extendido configurado por el club
 * (`tutor` o `child`) dentro del flujo `/registro-padres/{clubId}`.
 *
 * Crea internamente un FormGroup con un control por cada campo del schema.
 * El componente padre (`ParentChildrenComponent`) referencia esta instancia
 * con `@ViewChild` y consulta:
 *  - `validate()` antes de enviar (marca touched + retorna validez)
 *  - `getValues()` para obtener `{ [fieldId]: valor }` listo para JSON
 *  - `getConsents()` para obtener la lista firmada con timestamp
 */
@Component({
  selector: 'app-dynamic-register-fields',

  templateUrl: './dynamic-register-fields.component.html',
  styleUrls: ['./dynamic-register-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicRegisterFieldsComponent implements OnChanges {
  /** Schema completo de la plantilla del club. */
  @Input() schema!: RegisterFormSchema | null | undefined;

  /** Identificador de la sección que se va a renderizar. */
  @Input() sectionId!: RegisterFormSectionId;

  /**
   * Si el padre quiere ocultar el título por estar ya integrado en su layout,
   * pasar `false`. Por defecto se muestra.
   */
  @Input() showHeader = true;

  /**
   * Discriminador opcional cuando hay VARIAS instancias de la misma sección
   * en el mismo formulario padre (caso típico: la sección `child` que se
   * repite una vez por hijo en `parent-children`).
   */
  @Input() instanceId: number | string | null = null;

  /**
   * Valores iniciales para precargar el FormGroup. Mapa
   * `{ [fieldId]: valor }` con el mismo shape que devuelve `getValues()`.
   */
  @Input() initialValues: Record<string, unknown> | null | undefined = null;

  /**
   * Si está activo, los campos de tipo `document` no se renderizan en este
   * componente.
   */
  @Input() hideDocuments = false;

  /**
   * Cuando es `true`, los campos `required` del schema NO se añaden como
   * Validators.required.
   */
  @Input() relaxRequired = false;

  /** FormGroup interno con un control por cada campo del schema. */
  formGroup: FormGroup = this.fb.group({});

  /** Sección actual derivada del schema + sectionId. */
  section: RegisterFormSection | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly translate: TranslateService,
  ) {}

  /**
   * Etiqueta a mostrar para un campo. Para campos con `binding` (slots del
   * catálogo) intenta traducir la clave i18n viva
   * `CLUB_REGISTER_FORM.BUILDER.SLOTS.<BINDING_UPPER>`.
   */
  displayLabel(field: RegisterFormField): string {
    if (field.binding) {
      const key = `CLUB_REGISTER_FORM.BUILDER.SLOTS.${String(field.binding).toUpperCase()}`;
      const translated = this.translate.instant(key);
      if (typeof translated === 'string' && translated && translated !== key) {
        return translated;
      }
    }
    return field.label || field.id;
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.rebuildForm();
  }

  /** Reconstruye los controles cada vez que cambia el schema o la sección. */
  private rebuildForm(): void {
    const section = this.findSection();
    this.section = section;

    const group: Record<string, FormControl | FormArray> = {};
    if (!section) {
      this.formGroup = this.fb.group(group);
      return;
    }

    const initial = this.initialValues ?? {};

    for (const field of section.fields) {
      if (field.type === 'info' || field.type === 'document') {
        continue;
      }

      const enforceRequired = field.required && !this.relaxRequired;
      const validators = enforceRequired ? [Validators.required] : [];
      const seed = initial[field.id];

      switch (field.type) {
        case 'multi_check': {
          const opts = field.options ?? [];
          const checkedFlags: boolean[] = Array.isArray(seed)
            ? opts.map((opt, i) => {
                const arr = seed as unknown[];
                if (typeof arr[0] === 'boolean') return !!arr[i];
                return arr.includes(opt);
              })
            : opts.map(() => false);
          const controls = opts.map((_, i) =>
            new FormControl(checkedFlags[i] ?? false)
          );
          const arr = this.fb.array(controls);
          if (enforceRequired) {
            arr.addValidators(this.atLeastOneCheckedValidator);
          }
          group[field.id] = arr;
          break;
        }
        case 'checkbox':
        case 'consent': {
          const consentValidators = enforceRequired ? [Validators.requiredTrue] : [];
          group[field.id] = new FormControl(this.coerceBool(seed), consentValidators);
          break;
        }
        case 'number': {
          const numSeed = seed === null || seed === undefined || seed === '' ? null : Number(seed);
          group[field.id] = new FormControl(
            Number.isFinite(numSeed as number) ? (numSeed as number) : null,
            validators
          );
          break;
        }
        case 'textarea':
        default: {
          group[field.id] = new FormControl(
            seed === null || seed === undefined ? '' : String(seed),
            validators
          );
        }
      }
    }

    this.formGroup = this.fb.group(group);
  }

  /** Convierte cualquier seed razonable a booleano (consent / checkbox). */
  private coerceBool(v: unknown): boolean {
    if (v === true || v === 1 || v === '1' || v === 'true') return true;
    if (typeof v === 'string') return v.toLowerCase() === 'true';
    return false;
  }

  private findSection(): RegisterFormSection | null {
    if (!this.schema || !Array.isArray(this.schema.sections)) {
      return null;
    }
    return this.schema.sections.find(s => s.id === this.sectionId) ?? null;
  }

  /** Validador para FormArray de checkboxes: al menos uno marcado. */
  private readonly atLeastOneCheckedValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormArray)) return null;
    const anyChecked = (control.value as boolean[]).some(v => !!v);
    return anyChecked ? null : { atLeastOne: true };
  };

  /**
   * Devuelve `true` si todo es válido. Si no, marca touched para que se
   * vean los errores en pantalla.
   */
  validate(): boolean {
    if (this.formGroup.valid) return true;
    this.formGroup.markAllAsTouched();
    return false;
  }

  /**
   * Devuelve los `label` de los campos requeridos que están sin rellenar.
   */
  getMissingLabels(): string[] {
    if (!this.section) return [];
    const out: string[] = [];
    for (const field of this.section.fields) {
      if (field.type === 'info' || field.type === 'document') continue;
      const ctrl = this.formGroup.get(field.id);
      if (ctrl && ctrl.invalid) {
        out.push(this.displayLabel(field));
      }
    }
    return out;
  }

  /**
   * Devuelve la clase Bootstrap Icons adecuada para un documento según
   * su MIME o extensión (PDF, Word o imagen).
   */
  documentIconFor(field: RegisterFormField): string {
    const mime = (field.mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return 'bi-file-earmark-image';
    if (mime === 'application/pdf') return 'bi-file-earmark-pdf';
    if (mime.includes('word') || mime.includes('msword')) return 'bi-file-earmark-word';
    const name = (field.fileName || field.fileUrl || '').toLowerCase();
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.substring(dot + 1) : '';
    if (ext === 'pdf') return 'bi-file-earmark-pdf';
    if (ext === 'doc' || ext === 'docx') return 'bi-file-earmark-word';
    if (['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) >= 0) return 'bi-file-earmark-image';
    return 'bi-file-earmark';
  }

  /** Formatea un tamaño en bytes a "1.2 MB" o "240 KB". */
  formatFileSize(bytes: number | undefined | null): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Devuelve los campos visibles de la sección actual, aplicando los filtros
   * activos (p.ej. `hideDocuments`).
   */
  visibleFields(): RegisterFormField[] {
    if (!this.section) return [];
    if (!this.hideDocuments) return this.section.fields;
    return this.section.fields.filter(f => f.type !== 'document');
  }

  /**
   * ¿Tiene esta sección al menos un campo visible (tras aplicar filtros)?
   */
  hasFields(): boolean {
    return this.visibleFields().length > 0;
  }

  /**
   * Convierte el FormGroup a un objeto plano `{ fieldId: valor }` listo para
   * persistir como JSON.
   */
  getValues(): Record<string, unknown> {
    if (!this.section) return {};
    const out: Record<string, unknown> = {};
    for (const field of this.section.fields) {
      if (field.type === 'info' || field.type === 'document') continue;
      const ctrl = this.formGroup.get(field.id);
      if (!ctrl) continue;
      if (field.type === 'multi_check') {
        const flags = (ctrl.value as boolean[]) ?? [];
        const opts = field.options ?? [];
        out[field.id] = opts.filter((_, i) => !!flags[i]);
      } else {
        out[field.id] = ctrl.value;
      }
    }
    return out;
  }

  /** Lista de consentimientos firmados con timestamp ISO actual. */
  getConsents(): Array<{ id: string; accepted: boolean; ts: string }> {
    if (!this.section) return [];
    const ts = new Date().toISOString();
    return this.section.fields
      .filter(f => f.type === 'consent')
      .map(f => ({
        id: f.id,
        accepted: !!this.formGroup.get(f.id)?.value,
        ts,
      }));
  }

  trackByFieldId(_index: number, field: RegisterFormField): string {
    return field.id;
  }

  trackByOption(_index: number, opt: string): string {
    return opt;
  }

  /** Indica si un campo tiene error visible. */
  fieldHasError(fieldId: string): boolean {
    const ctrl = this.formGroup.get(fieldId);
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  /** Cast al FormArray de un campo `multi_check` para el template. */
  asArray(fieldId: string): FormArray {
    return this.formGroup.get(fieldId) as FormArray;
  }

  /**
   * Devuelve la clase Bootstrap Icons que mejor representa la sección actual.
   */
  getSectionIcon(): string {
    switch (this.sectionId) {
      case 'child':
        return 'bi-person-badge';
      case 'tutor':
        return 'bi-people-fill';
      case 'general':
        return 'bi-clipboard-data';
      default:
        return 'bi-list-ul';
    }
  }
}
