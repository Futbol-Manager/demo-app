import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { VideoStorageService } from '../../../core/services/video-storage/video-storage.service';
import { LoginService } from '../../../core/services/login/login.service';
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
  clubVideos: any[] = [];
  isLoading = true;
  clubId = 0;
  userId = 0;

  activeFilter: ProjectStatus | 'ALL' = 'ALL';
  searchQuery = '';

  showNewProjectModal = false;
  newProject = {
    title: '',
    description: '',
    videoId: 0,
    templateId: 0,
    teamId: null as number | null,
    matchId: null as number | null,
    trainingId: null as number | null,
    contextType: 'free' as 'free' | 'match' | 'training'
  };
  isCreating = false;

  statusLabels = PROJECT_STATUS_LABELS;
  statusColors = PROJECT_STATUS_COLORS;

  constructor(
    private router: Router,
    private analysisService: VideoAnalysisService,
    private videoService: VideoStorageService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.userId = user.userId;
      }
    });
    this.loadData();
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

    this.videoService.listVideos(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.clubVideos = res.data || []; },
        error: () => { this.clubVideos = []; }
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
      title: '', description: '', videoId: 0, templateId: 0,
      teamId: null, matchId: null, trainingId: null, contextType: 'free'
    };
    if (this.templates.length > 0) {
      this.newProject.templateId = this.templates[0].id;
    }
    this.showNewProjectModal = true;
  }

  closeNewProjectModal(): void {
    this.showNewProjectModal = false;
  }

  createProject(): void {
    if (!this.newProject.title || !this.newProject.videoId || !this.newProject.templateId) return;
    this.isCreating = true;

    const body: any = {
      clubId: this.clubId,
      createdBy: this.userId,
      videoId: this.newProject.videoId,
      title: this.newProject.title,
      description: this.newProject.description,
      templateId: this.newProject.templateId
    };
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
          this.showNewProjectModal = false;
          if (res.data) {
            this.router.navigate(['/dashboard/video-analysis/workspace', res.data.id]);
          }
        },
        error: () => {
          this.isCreating = false;
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
