import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { LoginService } from '../../../core/services/login/login.service';
import { AnalysisPlaylist } from '../models/analysis.models';

@Component({
  selector: 'app-playlist-builder',
  templateUrl: './playlist-builder.component.html',
  styleUrls: ['./playlist-builder.component.scss']
})
export class PlaylistBuilderComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  playlists: AnalysisPlaylist[] = [];
  isLoading = true;
  clubId = 0;
  userId = 0;

  showCreateModal = false;
  newTitle = '';
  newDescription = '';
  isCreating = false;

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
    this.loadPlaylists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPlaylists(): void {
    this.isLoading = true;
    this.analysisService.listPlaylists(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.playlists = res.data || [];
          this.isLoading = false;
        },
        error: () => {
          this.playlists = [];
          this.isLoading = false;
        }
      });
  }

  openPlaylist(playlist: AnalysisPlaylist): void {
    this.router.navigate(['/dashboard/video-analysis/playlist', playlist.id]);
  }

  deletePlaylist(playlist: AnalysisPlaylist, event: Event): void {
    event.stopPropagation();
    if (!confirm('¿Eliminar esta playlist?')) return;
    this.analysisService.deletePlaylist(playlist.id, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.playlists = this.playlists.filter(p => p.id !== playlist.id);
        }
      });
  }

  openCreateModal(): void {
    this.newTitle = '';
    this.newDescription = '';
    this.showCreateModal = true;
  }

  createPlaylist(): void {
    if (!this.newTitle.trim()) return;
    this.isCreating = true;
    this.analysisService.createPlaylist({
      clubId: this.clubId,
      createdBy: this.userId,
      title: this.newTitle,
      description: this.newDescription
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isCreating = false;
          this.showCreateModal = false;
          if (res.data) {
            this.router.navigate(['/dashboard/video-analysis/playlist', res.data.id]);
          }
        },
        error: () => { this.isCreating = false; }
      });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/video-analysis']);
  }
}
