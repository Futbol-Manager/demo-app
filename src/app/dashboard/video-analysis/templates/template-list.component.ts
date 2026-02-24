import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { LoginService } from '../../../core/services/login/login.service';
import { AnalysisTemplate } from '../models/analysis.models';

@Component({
  selector: 'app-template-list',
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.scss']
})
export class TemplateListComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  templates: AnalysisTemplate[] = [];
  isLoading = true;
  clubId = 0;
  userId = 0;
  defaultTemplateId: number | null = null;

  showCreateModal = false;
  newTemplateName = '';
  newTemplateDescription = '';
  isCreating = false;
  createError = '';

  // Edit description
  editingDescriptionId: number | null = null;
  editDescriptionValue = '';
  isSavingDescription = false;

  constructor(
    private router: Router,
    private analysisService: VideoAnalysisService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.userId = user.userId;
      }
    });
    const stored = localStorage.getItem(`defaultTemplate_${this.clubId}`);
    this.defaultTemplateId = stored ? Number(stored) : null;
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTemplates(): void {
    this.isLoading = true;
    this.analysisService.listTemplates(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.templates = (res.data || []).map((t: AnalysisTemplate) => ({
            ...t,
            isDefault: t.id === this.defaultTemplateId
          }));
          this.isLoading = false;
        },
        error: () => {
          this.templates = [];
          this.isLoading = false;
        }
      });
  }

  setAsDefault(template: AnalysisTemplate, event: Event): void {
    event.stopPropagation();
    this.defaultTemplateId = template.id;
    localStorage.setItem(`defaultTemplate_${this.clubId}`, String(template.id));
    this.templates = this.templates.map(t => ({ ...t, isDefault: t.id === template.id }));
  }

  isDefault(template: AnalysisTemplate): boolean {
    return template.id === this.defaultTemplateId;
  }

  openTemplate(template: AnalysisTemplate): void {
    this.router.navigate(['/dashboard/video-analysis/template', template.id]);
  }

  duplicateTemplate(template: AnalysisTemplate, event: Event): void {
    event.stopPropagation();
    this.analysisService.duplicateTemplate(template.id, this.clubId, this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadTemplates()
      });
  }

  deleteTemplate(template: AnalysisTemplate, event: Event): void {
    event.stopPropagation();
    if (template.isSystem) return;
    if (!confirm('¿Eliminar esta plantilla? Esta acción no se puede deshacer.')) return;
    this.analysisService.deleteTemplate(template.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.templates = this.templates.filter(t => t.id !== template.id);
        },
        error: (err) => {
          const msg = err?.error?.error?.msg || err?.error?.message || `Error ${err?.status || ''}`;
          alert(`No se pudo eliminar la plantilla: ${msg}`);
        }
      });
  }

  startEditDescription(template: AnalysisTemplate, event: Event): void {
    event.stopPropagation();
    if (template.isSystem) return;
    this.editingDescriptionId = template.id;
    this.editDescriptionValue = template.description || '';
  }

  saveDescription(template: AnalysisTemplate, event: Event): void {
    event.stopPropagation();
    if (this.isSavingDescription) return;
    this.isSavingDescription = true;
    this.analysisService.updateTemplate(template.id, { description: this.editDescriptionValue })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          template.description = this.editDescriptionValue;
          this.editingDescriptionId = null;
          this.isSavingDescription = false;
        },
        error: (err) => {
          this.isSavingDescription = false;
          alert('No se pudo guardar la descripción.');
        }
      });
  }

  cancelEditDescription(event: Event): void {
    event.stopPropagation();
    this.editingDescriptionId = null;
  }

  openCreateModal(): void {
    this.newTemplateName = '';
    this.newTemplateDescription = '';
    this.createError = '';
    this.showCreateModal = true;
  }

  createTemplate(): void {
    if (!this.newTemplateName.trim()) return;
    this.isCreating = true;
    this.createError = '';
    this.analysisService.createTemplate({
      clubId: this.clubId,
      createdBy: this.userId,
      name: this.newTemplateName,
      description: this.newTemplateDescription
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isCreating = false;
          this.showCreateModal = false;
          const templateId = res?.data?.id;
          if (templateId) {
            this.router.navigate(['/dashboard/video-analysis/template', templateId]);
          } else {
            this.loadTemplates();
          }
        },
        error: (err) => {
          this.isCreating = false;
          console.error('Error creating template:', err);
          this.createError = err?.error?.error?.msg || err?.message || 'Error al crear la plantilla. Revisa la consola del navegador.';
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/video-analysis']);
  }
}
