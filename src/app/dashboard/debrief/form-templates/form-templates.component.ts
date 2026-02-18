import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  FormTemplate,
  FormTemplateTipo,
  FORM_TEMPLATE_TIPO_LABELS,
  FormTemplateCampo,
} from 'src/app/core/services/form-template/form-template.model';
import { FormTemplateService } from 'src/app/core/services/form-template/form-template.service';
import { FormField } from '../../shared/form-builder/form-builder.component';

type TabTipo = FormTemplateTipo;

@Component({
  selector: 'app-form-templates',
  templateUrl: './form-templates.component.html',
  styleUrls: ['./form-templates.component.scss'],
})
export class FormTemplatesComponent implements OnInit {
  clubId: number = 0;
  activeTab: TabTipo = 'pre-match';
  tipoLabels = FORM_TEMPLATE_TIPO_LABELS;
  tabs: TabTipo[] = ['pre-match', 'post-match', 'pre-training', 'post-training'];

  templatesByTipo: Partial<Record<TabTipo, FormTemplate[]>> = {};
  loading = false;

  // Builder
  showBuilder = false;
  editingTemplate: FormTemplate | null = null;
  savingTemplate = false;

  // Delete
  templateToDelete: FormTemplate | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ftService: FormTemplateService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.clubId = +params['clubId'];
      this.loadAll();
    });
  }

  loadAll(): void {
    if (!this.clubId) return;
    this.loading = true;
    this.ftService.getAllByClub(this.clubId).subscribe(
      (res: any) => {
        const all: FormTemplate[] = res?.data || [];
        this.tabs.forEach(t => {
          this.templatesByTipo[t] = all.filter(tp => tp.tipo === t);
        });
        this.loading = false;
      },
      () => { this.loading = false; }
    );
  }

  get activeTemplates(): FormTemplate[] {
    return this.templatesByTipo[this.activeTab] || [];
  }

  openCreate(): void {
    this.editingTemplate = null;
    this.showBuilder = true;
  }

  openEdit(t: FormTemplate): void {
    this.editingTemplate = { ...t };
    this.showBuilder = true;
  }

  getInitialCampos(t: FormTemplate | null): FormField[] {
    if (!t?.campos) return [];
    const raw = t.campos as any;
    const parsed: FormTemplateCampo[] = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed.map((c: FormTemplateCampo) => ({
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

  onBuilderSaved(payload: { nombre: string; campos: FormField[] }): void {
    this.savingTemplate = true;
    const camposJson = JSON.stringify(payload.campos);
    if (this.editingTemplate?.formTemplateId) {
      this.ftService.updateTemplate(this.editingTemplate.formTemplateId, {
        nombre: payload.nombre,
        campos: camposJson,
      }).subscribe(
        () => { this.savingTemplate = false; this.showBuilder = false; this.loadAll(); this.toastr.success('Formulario actualizado'); },
        () => { this.savingTemplate = false; this.toastr.error('Error al actualizar'); }
      );
    } else {
      this.ftService.createTemplate({
        clubId: this.clubId,
        nombre: payload.nombre,
        tipo: this.activeTab,
        campos: camposJson,
      }).subscribe(
        () => { this.savingTemplate = false; this.showBuilder = false; this.loadAll(); this.toastr.success('Formulario creado'); },
        () => { this.savingTemplate = false; this.toastr.error('Error al crear'); }
      );
    }
  }

  onBuilderClose(): void {
    this.showBuilder = false;
    this.editingTemplate = null;
  }

  confirmDelete(t: FormTemplate): void {
    this.templateToDelete = t;
  }

  doDelete(): void {
    if (!this.templateToDelete) return;
    this.ftService.deleteTemplate(this.templateToDelete.formTemplateId).subscribe(
      () => {
        this.toastr.success('Formulario eliminado');
        this.templateToDelete = null;
        this.loadAll();
      },
      () => { this.toastr.error('Error al eliminar'); this.templateToDelete = null; }
    );
  }

  cancelDelete(): void {
    this.templateToDelete = null;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
