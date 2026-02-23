import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { LoginService } from '../../../core/services/login/login.service';
import { LocalVideoService, LocalVideoMeta } from '../services/local-video.service';
import { AnalysisProject, AnalysisTemplate, ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../models/analysis.models';

@Component({
  selector: 'app-video-analysis-hub',
  templateUrl: './video-analysis-hub.component.html',
  styleUrls: ['./video-analysis-hub.component.scss']
})
export class VideoAnalysisHubComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  projects: AnalysisProject[] = [];
  filteredProjects: AnalysisProject[] = [];
  templates: AnalysisTemplate[] = [];
  isLoading = true;
  clubId = 0;
  userId = 0;

  activeFilter: ProjectStatus | 'ALL' = 'ALL';
  searchQuery = '';

  showNewProjectModal = false;
  newProject = {
    title: '',
    description: '',
    templateId: 0,
    teamId: null as number | null,
    matchId: null as number | null,
    trainingId: null as number | null,
    contextType: 'free' as 'free' | 'match' | 'training'
  };
  selectedFile: File | null = null;
  selectedFileMeta: LocalVideoMeta | null = null;
  isExtractingMeta = false;
  isCreating = false;
  createError = '';

  statusLabels = PROJECT_STATUS_LABELS;
  statusColors = PROJECT_STATUS_COLORS;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private analysisService: VideoAnalysisService,
    private loginService: LoginService,
    public localVideoService: LocalVideoService
  ) {}

  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) { this.userId = user.userId; }
    });
    this.loadData();

    // Si viene desde la biblioteca con un vídeo ya descargado, auto-abre el modal
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['fromLibrary'] && this.localVideoService.hasFile()) {
        const videoTitle = params['videoTitle'] || '';
        // Espera a que las plantillas carguen antes de abrir el modal
        const tryOpen = () => {
          if (this.templates.length > 0) {
            this.openNewProjectModal();
            if (videoTitle) {
              this.newProject.title = `Análisis – ${videoTitle}`;
            }
            // Marcar como pre-cargado para saltar el file picker
            this.selectedFile = this.localVideoService.file;
            this.selectedFileMeta = this.localVideoService.meta;
          } else {
            setTimeout(tryOpen, 200);
          }
        };
        setTimeout(tryOpen, 400);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.isLoading = true;

    this.analysisService.listProjects(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.projects = res.data || [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => {
          this.projects = [];
          this.applyFilters();
          this.isLoading = false;
        }
      });

    this.analysisService.listTemplates(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.templates = res.data || []; },
        error: () => { this.templates = []; }
      });
  }

  setFilter(filter: ProjectStatus | 'ALL'): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.projects];
    if (this.activeFilter !== 'ALL') {
      result = result.filter(p => p.status === this.activeFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    this.filteredProjects = result;
  }

  openNewProjectModal(): void {
    this.newProject = {
      title: '', description: '', templateId: 0,
      teamId: null, matchId: null, trainingId: null, contextType: 'free'
    };
    this.selectedFile = null;
    this.selectedFileMeta = null;
    this.createError = '';
    if (this.templates.length > 0) {
      this.newProject.templateId = this.templates[0].id;
    }
    this.showNewProjectModal = true;
  }

  closeNewProjectModal(): void {
    this.showNewProjectModal = false;
  }

  async onLocalFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isExtractingMeta = true;
    this.selectedFile = null;
    this.selectedFileMeta = null;

    try {
      const meta = await LocalVideoService.extractMeta(file);
      this.selectedFile = file;
      this.selectedFileMeta = meta;
      if (!this.newProject.title) {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
        this.newProject.title = `Análisis – ${nameWithoutExt}`;
      }
    } catch {
      alert('No se pudo leer la información del archivo. Asegúrate de que es un archivo de vídeo válido.');
    } finally {
      this.isExtractingMeta = false;
      input.value = '';
    }
  }

  createProject(): void {
    const missing: string[] = [];
    if (!this.newProject.title) missing.push('título');
    if (!this.selectedFileMeta) missing.push('archivo de vídeo');
    if (!this.selectedFile) missing.push('archivo de vídeo (objeto)');
    if (!this.newProject.templateId) missing.push('plantilla');

    if (missing.length > 0) {
      console.warn('createProject guard: faltan campos:', missing);
      return;
    }

    this.isCreating = true;
    this.createError = '';

    this.localVideoService.setFile(this.selectedFile!, this.selectedFileMeta!);

    const body: any = {
      clubId: this.clubId,
      createdBy: this.userId,
      videoId: null,
      title: this.newProject.title,
      description: this.newProject.description || '',
      templateId: this.newProject.templateId,
      localFileName: this.selectedFileMeta!.fileName,
      localFileSize: this.selectedFileMeta!.fileSize,
      localFileDurationMs: this.selectedFileMeta!.durationMs
    };
    if (this.newProject.contextType === 'match' && this.newProject.matchId) {
      body.matchId = this.newProject.matchId;
    }
    if (this.newProject.contextType === 'training' && this.newProject.trainingId) {
      body.trainingId = this.newProject.trainingId;
    }

    console.log('createProject body:', body);

    this.analysisService.createProject(body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isCreating = false;
          if (res?.data?.id) {
            this.showNewProjectModal = false;
            this.router.navigate(['/dashboard/video-analysis/workspace', res.data.id]);
          } else {
            this.createError = 'El servidor no devolvió el proyecto creado. Inténtalo de nuevo.';
          }
        },
        error: (err) => {
          this.isCreating = false;
          const msg = err?.error?.message || err?.error?.msg || err?.message || 'Error al crear el proyecto.';
          this.createError = msg;
          console.error('createProject error:', err);
        }
      });
  }

  openProject(project: AnalysisProject): void {
    this.router.navigate(['/dashboard/video-analysis/workspace', project.id]);
  }

  deleteProject(project: AnalysisProject, event: Event): void {
    event.stopPropagation();
    if (!confirm('¿Eliminar este análisis? Esta acción no se puede deshacer.')) return;

    this.analysisService.deleteProject(project.id, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.projects = this.projects.filter(p => p.id !== project.id);
          this.applyFilters();
        }
      });
  }

  archiveProject(project: AnalysisProject, event: Event): void {
    event.stopPropagation();
    this.analysisService.updateProjectStatus(project.id, 'ARCHIVED')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          project.status = 'ARCHIVED';
          this.applyFilters();
        }
      });
  }

  getStatusCount(status: ProjectStatus): number {
    return this.projects.filter(p => p.status === status).length;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  goBack(): void {
    window.history.back();
  }
}
