import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormTemplateService } from 'src/app/core/services/form-template/form-template.service';
import {
  FormTemplate,
  FormTemplateTipo,
  FORM_TEMPLATE_TIPO_LABELS,
  FormTemplateCampo,
} from 'src/app/core/services/form-template/form-template.model';
import { FormField } from '../form-builder/form-builder.component';

export interface FormTemplateSelectorResult {
  type: 'standard' | 'custom';
  template?: FormTemplate;
}

@Component({
  selector: 'app-form-template-selector',
  templateUrl: './form-template-selector.component.html',
  styleUrls: ['./form-template-selector.component.scss'],
})
export class FormTemplateSelectorComponent implements OnChanges {
  @Input() show = false;
  @Input() tipo: FormTemplateTipo = 'post-match';
  @Input() clubId: number = 0;
  @Input() teamId: number = 0;
  @Input() entityId: number = 0;
  @Input() coachUserId: number = 0;

  @Output() selected = new EventEmitter<FormTemplateSelectorResult>();
  @Output() closed = new EventEmitter<void>();

  templates: FormTemplate[] = [];
  loading = false;

  // ── Modo creación/edición inline de template ───────────────────────────────
  showBuilder = false;
  editingTemplate: FormTemplate | null = null;
  savingTemplate = false;

  // ── Confirmación de eliminación ─────────────────────────────────────────────
  templateToDelete: FormTemplate | null = null;

  get tipoLabel(): string {
    return FORM_TEMPLATE_TIPO_LABELS[this.tipo] || this.tipo;
  }

  constructor(private ftService: FormTemplateService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['show'] && this.show) {
      this.loadTemplates();
    }
    if (changes['show'] && !this.show) {
      this.showBuilder = false;
      this.editingTemplate = null;
    }
  }

  loadTemplates(): void {
    if (!this.clubId) return;
    this.loading = true;
    this.ftService.getByClubAndTipo(this.clubId, this.tipo).subscribe(
      (res: any) => { this.templates = res?.data || []; this.loading = false; },
      () => { this.loading = false; }
    );
  }

  selectStandard(): void {
    this.selected.emit({ type: 'standard' });
  }

  selectTemplate(t: FormTemplate): void {
    this.selected.emit({ type: 'custom', template: t });
  }

  openCreate(): void {
    this.editingTemplate = null;
    this.showBuilder = true;
  }

  openEdit(t: FormTemplate, event: Event): void {
    event.stopPropagation();
    this.editingTemplate = { ...t };
    this.showBuilder = true;
  }

  onBuilderSaved(payload: { nombre: string; campos: FormField[] }): void {
    this.savingTemplate = true;
    const camposJson = JSON.stringify(payload.campos);

    if (this.editingTemplate?.formTemplateId) {
      this.ftService.updateTemplate(this.editingTemplate.formTemplateId, {
        nombre: payload.nombre,
        campos: camposJson,
      }).subscribe(
        (res: any) => { this.savingTemplate = false; this.showBuilder = false; this.loadTemplates(); },
        () => { this.savingTemplate = false; }
      );
    } else {
      this.ftService.createTemplate({
        clubId: this.clubId,
        nombre: payload.nombre,
        tipo: this.tipo,
        campos: camposJson,
      }).subscribe(
        (res: any) => { this.savingTemplate = false; this.showBuilder = false; this.loadTemplates(); },
        () => { this.savingTemplate = false; }
      );
    }
  }

  onBuilderClose(): void {
    this.showBuilder = false;
    this.editingTemplate = null;
  }

  confirmDelete(t: FormTemplate, event: Event): void {
    event.stopPropagation();
    this.templateToDelete = t;
  }

  doDelete(): void {
    if (!this.templateToDelete) return;
    this.ftService.deleteTemplate(this.templateToDelete.formTemplateId).subscribe(
      () => { this.templateToDelete = null; this.loadTemplates(); },
      () => { this.templateToDelete = null; }
    );
  }

  cancelDelete(): void {
    this.templateToDelete = null;
  }

  getInitialCampos(): FormField[] {
    if (!this.editingTemplate?.campos) return [];
    const raw = this.editingTemplate.campos as any;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (parsed as FormTemplateCampo[]).map((c: FormTemplateCampo) => ({
      formularioCampoId: 0,
      docClubesId: null,
      clubId: this.clubId,
      tipoCampo: c.tipo,
      etiqueta: c.etiqueta,
      opciones: JSON.stringify(c.opciones || []),
      orden: c.orden,
      obligatorio: c.obligatorio ? 1 : 0,
      contexto: 'TEMPLATE',
    }));
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fts-backdrop')) {
      this.close();
    }
  }
}
