import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ClubAbonadoFormService } from 'src/app/core/services/club-abonado-form/club-abonado-form.service';
import {
  AbonadoFormCatalog,
  AbonadoFormField,
  AbonadoFormFieldType,
  AbonadoFormSchema,
  AbonadoFormSection,
  AbonadoFormSectionId,
  AbonadoFormSlotCatalogItem,
  EMPTY_ABONADO_FORM_SCHEMA,
} from 'src/app/core/services/club-abonado-form/club-abonado-form.model';

interface SectionMeta {
  id: AbonadoFormSectionId;
  titleKey: string;
  subtitleKey: string;
  chipKey: string;
}

const SECTION_META: ReadonlyArray<SectionMeta> = [
  {
    id: 'personales',
    titleKey: 'ABONADO_FORM_BUILDER.SECTION_PERSONALES_TITLE',
    subtitleKey: 'ABONADO_FORM_BUILDER.SECTION_PERSONALES_SUBTITLE',
    chipKey: 'ABONADO_FORM_BUILDER.SECTION_PERSONALES_CHIP',
  },
  {
    id: 'domicilio',
    titleKey: 'ABONADO_FORM_BUILDER.SECTION_DOMICILIO_TITLE',
    subtitleKey: 'ABONADO_FORM_BUILDER.SECTION_DOMICILIO_SUBTITLE',
    chipKey: 'ABONADO_FORM_BUILDER.SECTION_DOMICILIO_CHIP',
  },
  {
    id: 'bancarios',
    titleKey: 'ABONADO_FORM_BUILDER.SECTION_BANCARIOS_TITLE',
    subtitleKey: 'ABONADO_FORM_BUILDER.SECTION_BANCARIOS_SUBTITLE',
    chipKey: 'ABONADO_FORM_BUILDER.SECTION_BANCARIOS_CHIP',
  },
  {
    id: 'emergencia',
    titleKey: 'ABONADO_FORM_BUILDER.SECTION_EMERGENCIA_TITLE',
    subtitleKey: 'ABONADO_FORM_BUILDER.SECTION_EMERGENCIA_SUBTITLE',
    chipKey: 'ABONADO_FORM_BUILDER.SECTION_EMERGENCIA_CHIP',
  },
  {
    id: 'extras',
    titleKey: 'ABONADO_FORM_BUILDER.SECTION_EXTRAS_TITLE',
    subtitleKey: 'ABONADO_FORM_BUILDER.SECTION_EXTRAS_SUBTITLE',
    chipKey: 'ABONADO_FORM_BUILDER.SECTION_EXTRAS_CHIP',
  },
];

/**
 * Builder del formulario dinámico de abonados.
 *
 * <p>UI minimal pero completa: 3 acordeones (uno por sección fija), lista
 * de campos seleccionados (canónicos + libres), botones de añadir y un
 * formulario inline para crear campos libres sin abrir un modal pesado.
 *
 * <p>Estado:
 * <ul>
 *   <li>{@code schema}: copia editable que el usuario manipula.</li>
 *   <li>{@code catalog}: slots disponibles desde Sphaira.</li>
 *   <li>{@code newFieldDraft}: borrador de campo libre por sección
 *       (formulario inline, se confirma con "Añadir").</li>
 * </ul>
 */
@Component({
  selector: 'app-club-abonado-form-builder',
  templateUrl: './club-abonado-form-builder.component.html',
  styleUrls: ['./club-abonado-form-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubAbonadoFormBuilderComponent implements OnInit {
  readonly sections = SECTION_META;
  /** Tipos disponibles al añadir campo libre. {@code file_upload} solo para slots; los libres lo escriben los abonados. */
  readonly freeFieldTypes: AbonadoFormFieldType[] = [
    'text', 'textarea', 'number', 'date', 'select', 'checkbox', 'multi_check', 'consent', 'info',
  ];

  clubId = 0;
  loading = true;
  saving = false;
  active = 1;
  schema: AbonadoFormSchema = JSON.parse(JSON.stringify(EMPTY_ABONADO_FORM_SCHEMA));
  catalog: AbonadoFormCatalog | null = null;
  /**
   * `true` cuando el schema cargado proviene del default de Sphaira
   * (todavía no está persistido en BD). Sirve para pintar un banner
   * informativo al club: "este es el formulario por defecto, guárdalo
   * para activarlo o edítalo antes". Tras el primer save se vuelve a
   * false porque el backend devuelve la plantilla persistida.
   */
  isUsingDefault = false;

  /** Acordeón abierto por defecto. */
  openSection: AbonadoFormSectionId = 'personales';

  /** Borradores de campo libre por sección. */
  newFieldDraft: { [k in AbonadoFormSectionId]: AbonadoFormField | null } = {
    personales: null,
    domicilio: null,
    bancarios: null,
    emergencia: null,
    extras: null,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ClubAbonadoFormService,
    private translate: TranslateService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('clubId');
    this.clubId = idParam ? Number(idParam) : 0;
    if (!this.clubId) {
      this.notification.error('ABONADO_FORM_BUILDER.MISSING_CLUB_ID');
      this.router.navigateByUrl('/dashboard/inicio');
      return;
    }
    forkJoin({
      catalog: this.service.getCatalog(),
      template: this.service.getAdminTemplate(this.clubId),
    }).subscribe({
      next: ({ catalog, template }) => {
        this.catalog = catalog;
        if (template && template.schema && template.schema.sections) {
          this.schema = this.mergeWithEmpty(template.schema);
          this.active = template.active ?? 1;
          // Detectamos si el schema viene del default: el backend marca
          // explícitamente `default: true` cuando no existe plantilla
          // persistida y nos ha devuelto el seed predeterminado.
          this.isUsingDefault = template.default === true;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[abonado-form-builder] init error', err);
        this.notification.error('ABONADO_FORM_BUILDER.LOAD_ERROR');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Garantiza que el schema cargado tenga TODAS las secciones del catálogo
   * actual y reubica los slots canónicos a su sección correcta.
   *
   * <p>Retrocompat: los schemas v1/v2 persistidos pueden tener slots en
   * secciones que ya no son las suyas (p. ej. {@code abonado_telefono} en
   * {@code personales} cuando ahora va en {@code domicilio}). En vez de
   * forzar una migración de BD, hacemos una "migración suave" aquí: al
   * cargar comparamos el {@code binding} de cada field con el catálogo y
   * lo movemos a la sección que diga el catálogo. Al guardar, queda
   * persistido en el sitio correcto y la migración deja de aplicarse.
   *
   * <p>Los campos libres (sin {@code binding}) se respetan tal cual en su
   * sección original — el club los puso ahí deliberadamente.
   */
  private mergeWithEmpty(s: AbonadoFormSchema): AbonadoFormSchema {
    const slotSectionByKey = new Map<string, AbonadoFormSectionId>();
    if (this.catalog) {
      for (const slot of this.catalog.slots) {
        slotSectionByKey.set(slot.key, slot.section);
      }
    }

    const fieldsBySection = new Map<AbonadoFormSectionId, AbonadoFormField[]>();
    for (const sec of (s.sections || [])) {
      for (const f of (sec.fields || [])) {
        const canonical = f.binding ? slotSectionByKey.get(f.binding) : undefined;
        const target = canonical ?? (sec.id as AbonadoFormSectionId);
        const arr = fieldsBySection.get(target) || [];
        arr.push(f);
        fieldsBySection.set(target, arr);
      }
    }

    const out: AbonadoFormSchema = {
      version: s.version || 1,
      sections: SECTION_META.map((m) => {
        const found = (s.sections || []).find((sec) => sec.id === m.id);
        return {
          id: m.id,
          title: found?.title,
          fields: fieldsBySection.get(m.id) || [],
        };
      }),
    };
    return out;
  }

  toggleSection(id: AbonadoFormSectionId): void {
    this.openSection = this.openSection === id ? ('' as AbonadoFormSectionId) : id;
  }

  /** Slots del catálogo disponibles en una sección (los que aún no están en el schema). */
  availableSlotsFor(sectionId: AbonadoFormSectionId): AbonadoFormSlotCatalogItem[] {
    if (!this.catalog) return [];
    const usedBindings = new Set(
      this.schema.sections.flatMap((s) => s.fields.map((f) => f.binding).filter(Boolean) as string[])
    );
    return this.catalog.slots.filter((s) => s.section === sectionId && !usedBindings.has(s.key));
  }

  fieldsOf(sectionId: AbonadoFormSectionId): AbonadoFormField[] {
    const sec = this.schema.sections.find((s) => s.id === sectionId);
    return sec ? sec.fields : [];
  }

  /** Añade un slot canónico al schema. */
  addCanonicalSlot(sectionId: AbonadoFormSectionId, slot: AbonadoFormSlotCatalogItem): void {
    const sec = this.schema.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const label = this.translate.instant(slot.labelKey) || slot.key;
    sec.fields.push({
      id: this.generateId(),
      type: slot.type,
      label,
      required: false,
      binding: slot.key,
      options: slot.options && slot.options.length ? [...slot.options] : undefined,
    });
    this.cdr.markForCheck();
  }

  /** Inicia un borrador de campo libre para una sección (UI inline). */
  startFreeFieldDraft(sectionId: AbonadoFormSectionId): void {
    this.newFieldDraft[sectionId] = {
      id: this.generateId(),
      type: 'text',
      label: '',
      required: false,
      options: [''],
      text: '',
    };
    this.cdr.markForCheck();
  }

  cancelFreeFieldDraft(sectionId: AbonadoFormSectionId): void {
    this.newFieldDraft[sectionId] = null;
    this.cdr.markForCheck();
  }

  /** Confirma el campo libre y lo añade al schema. */
  confirmFreeFieldDraft(sectionId: AbonadoFormSectionId): void {
    const draft = this.newFieldDraft[sectionId];
    if (!draft) return;
    if (!draft.label?.trim() && draft.type !== 'info') {
      this.notification.error('ABONADO_FORM_BUILDER.ERROR_LABEL_REQUIRED');
      return;
    }
    if (draft.type === 'info' && !draft.text?.trim()) {
      this.notification.error('ABONADO_FORM_BUILDER.ERROR_INFO_TEXT_REQUIRED');
      return;
    }
    if ((draft.type === 'select' || draft.type === 'multi_check') &&
        (!draft.options || draft.options.filter((o) => o?.trim()).length < 1)) {
      this.notification.error('ABONADO_FORM_BUILDER.ERROR_OPTIONS_REQUIRED');
      return;
    }
    // Limpia opciones vacías.
    if (draft.options) draft.options = draft.options.map((o) => o.trim()).filter(Boolean);
    const sec = this.schema.sections.find((s) => s.id === sectionId);
    if (sec) sec.fields.push({ ...draft });
    this.newFieldDraft[sectionId] = null;
    this.cdr.markForCheck();
  }

  removeField(sectionId: AbonadoFormSectionId, fieldId: string): void {
    const sec = this.schema.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    sec.fields = sec.fields.filter((f) => f.id !== fieldId);
    this.cdr.markForCheck();
  }

  moveField(sectionId: AbonadoFormSectionId, fieldId: string, dir: -1 | 1): void {
    const sec = this.schema.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const idx = sec.fields.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= sec.fields.length) return;
    const [moved] = sec.fields.splice(idx, 1);
    sec.fields.splice(target, 0, moved);
    this.cdr.markForCheck();
  }

  addOptionToDraft(sectionId: AbonadoFormSectionId): void {
    const draft = this.newFieldDraft[sectionId];
    if (!draft) return;
    draft.options = [...(draft.options || []), ''];
    this.cdr.markForCheck();
  }

  removeOptionFromDraft(sectionId: AbonadoFormSectionId, i: number): void {
    const draft = this.newFieldDraft[sectionId];
    if (!draft || !draft.options) return;
    draft.options.splice(i, 1);
    this.cdr.markForCheck();
  }

  trackByFieldId(_: number, f: AbonadoFormField): string {
    return f.id;
  }

  trackOption(i: number): number {
    return i;
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;
    this.service.saveTemplate(this.clubId, this.schema, this.active).subscribe({
      next: (saved) => {
        if (saved && saved.schema) {
          this.schema = this.mergeWithEmpty(saved.schema);
        }
        // Tras el primer save ya existe plantilla persistida — el banner
        // "estás viendo el predeterminado" deja de tener sentido.
        this.isUsingDefault = false;
        this.saving = false;
        this.notification.success('ABONADO_FORM_BUILDER.SAVED');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[abonado-form-builder] save error', err);
        const backendMsg = err?.error?.error?.msg;
        if (backendMsg) {
          this.notification.error(backendMsg, false);
        } else {
          this.notification.error('ABONADO_FORM_BUILDER.SAVE_ERROR');
        }
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/abonados', this.clubId]);
  }

  private generateId(): string {
    return 'f_' + Math.random().toString(36).slice(2, 10);
  }

  /** Helpers para template. */
  hasFreeDraft(sectionId: AbonadoFormSectionId): boolean {
    return !!this.newFieldDraft[sectionId];
  }

  /**
   * Clave i18n para el tipo de campo (mostrado en el type-pill de la
   * tarjeta y en el select del borrador de campo libre). Convierte el
   * tipo en formato snake_case a UPPER_CASE para casar con la convención
   * de claves: `ABONADO_FORM_BUILDER.FIELD_TYPES.MULTI_CHECK`.
   */
  typeLabelKey(type: AbonadoFormFieldType): string {
    return `ABONADO_FORM_BUILDER.FIELD_TYPES.${type.toUpperCase()}`;
  }

  iconForType(type: AbonadoFormFieldType): string {
    switch (type) {
      case 'text': return 'bi-pencil';
      case 'textarea': return 'bi-text-paragraph';
      case 'number': return 'bi-hash';
      case 'date': return 'bi-calendar';
      case 'select': return 'bi-chevron-down';
      case 'checkbox': return 'bi-check-square';
      case 'multi_check': return 'bi-ui-checks';
      case 'consent': return 'bi-shield-check';
      case 'info': return 'bi-info-circle';
      case 'document': return 'bi-file-earmark';
      case 'file_upload': return 'bi-cloud-upload';
      default: return 'bi-circle';
    }
  }
}
