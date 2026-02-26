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
  videoSourceMode: 'local' | 'url' = 'local';

  newProject = {
    title: '',
    description: '',
    templateId: 0,
    teamId: null as number | null,
    matchId: null as number | null,
    trainingId: null as number | null,
    contextType: 'free' as 'free' | 'match' | 'training',
    externalVideoUrl: '' // URL de YouTube/Vimeo/VEO cuando viene desde la biblioteca
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

    // Detectar navegación desde la biblioteca (vídeo local descargado O YouTube)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const videoTitle  = params['videoTitle'] || '';
      const youtubeUrl  = params['youtubeUrl']  || '';

      if (youtubeUrl) {
        // Vídeo de YouTube → abrir modal con URL pre-rellenada y modo "url"
        const tryOpen = () => {
          if (this.templates.length > 0) {
            this.openNewProjectModal();
            this.videoSourceMode = 'url';
            this.newProject.externalVideoUrl = youtubeUrl;
            if (videoTitle) this.newProject.title = `Análisis – ${videoTitle}`;
          } else {
            setTimeout(tryOpen, 200);
          }
        };
        setTimeout(tryOpen, 400);

      } else if (params['fromLibrary'] && this.localVideoService.hasFile()) {
        // Vídeo local ya descargado desde B2
        const tryOpen = () => {
          if (this.templates.length > 0) {
            this.openNewProjectModal();
            if (videoTitle) this.newProject.title = `Análisis – ${videoTitle}`;
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
    this.videoSourceMode = 'local';
    this.newProject = {
      title: '', description: '', templateId: 0,
      teamId: null, matchId: null, trainingId: null, contextType: 'free',
      externalVideoUrl: ''
    };
    this.selectedFile = null;
    this.selectedFileMeta = null;
    this.createError = '';
    if (this.templates.length > 0) {
      const storedDefault = localStorage.getItem(`defaultTemplate_${this.clubId}`);
      const defaultId = storedDefault ? Number(storedDefault) : null;
      const defaultTpl = defaultId ? this.templates.find(t => t.id === defaultId) : null;
      this.newProject.templateId = (defaultTpl ?? this.templates[0]).id;
    }
    this.showNewProjectModal = true;
  }

  closeNewProjectModal(): void {
    this.showNewProjectModal = false;
  }

  setVideoSourceMode(mode: 'local' | 'url'): void {
    this.videoSourceMode = mode;
    if (mode === 'local') {
      this.newProject.externalVideoUrl = '';
    } else {
      this.selectedFile = null;
      this.selectedFileMeta = null;
    }
  }

  isYouTubeUrl(url: string): boolean {
    return /youtube\.com|youtu\.be/i.test(url || '');
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
    const isExternal = !!this.newProject.externalVideoUrl;

    const missing: string[] = [];
    if (!this.newProject.title) missing.push('título');
    if (!isExternal && !this.selectedFileMeta) missing.push('archivo de vídeo');
    if (!isExternal && !this.selectedFile)     missing.push('archivo de vídeo (objeto)');
    if (!this.newProject.templateId) missing.push('plantilla');

    if (missing.length > 0) {
      this.createError = `Faltan campos: ${missing.join(', ')}`;
      return;
    }

    this.isCreating = true;
    this.createError = '';

    if (!isExternal) {
      this.localVideoService.setFile(this.selectedFile!, this.selectedFileMeta!);
    }

    const body: any = {
      clubId: this.clubId,
      createdBy: this.userId,
      videoId: undefined,
      title: this.newProject.title,
      description: this.newProject.description || '',
      templateId: this.newProject.templateId
    };

    if (isExternal) {
      body.externalVideoUrl = this.newProject.externalVideoUrl;
    } else {
      body.localFileName      = this.selectedFileMeta!.fileName;
      body.localFileSize      = this.selectedFileMeta!.fileSize;
      body.localFileDurationMs = this.selectedFileMeta!.durationMs;
    }

    if (this.newProject.contextType === 'match' && this.newProject.matchId) {
      body.matchId = this.newProject.matchId;
    }
    if (this.newProject.contextType === 'training' && this.newProject.trainingId) {
      body.trainingId = this.newProject.trainingId;
    }

    this.analysisService.createProject(body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isCreating = false;
          if (res?.data?.id) {
            const project = res.data;
            this.showNewProjectModal = false;
            this.router.navigate(['/dashboard/video-analysis/workspace', project.id]);
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
