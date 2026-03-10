import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { AnalysisPlaylist, AnalysisPlaylistItem } from '../models/analysis.models';

@Component({
  selector: 'app-playlist-viewer',
  templateUrl: './playlist-viewer.component.html',
  styleUrls: ['./playlist-viewer.component.scss']
})
export class PlaylistViewerComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  playlistId = 0;
  clubId = 0;
  playlist: AnalysisPlaylist | null = null;
  items: AnalysisPlaylistItem[] = [];
  isLoading = true;
  currentItemIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analysisService: VideoAnalysisService
  ) {}

  ngOnInit(): void {
    this.playlistId = +(this.route.snapshot.paramMap.get('id') || '0');
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    this.loadPlaylist();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPlaylist(): void {
    this.isLoading = true;
    this.analysisService.getPlaylist(this.playlistId, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.playlist = res.data.playlist || res.data;
            this.items   = res.data.items || [];
          }
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  selectItem(index: number): void {
    if (index < 0 || index >= this.items.length) return;
    this.currentItemIndex = index;
  }

  nextClip(): void {
    if (this.currentItemIndex < this.items.length - 1) this.currentItemIndex++;
  }

  prevClip(): void {
    if (this.currentItemIndex > 0) this.currentItemIndex--;
  }

  removeItem(item: AnalysisPlaylistItem, e: Event): void {
    e.stopPropagation();
    if (!confirm('¿Quitar este clip de la playlist?')) return;
    this.analysisService.removePlaylistItem(this.playlistId, item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.items = this.items.filter(i => i.id !== item.id);
          if (this.currentItemIndex >= this.items.length) {
            this.currentItemIndex = Math.max(0, this.items.length - 1);
          }
        }
      });
  }

  goToWorkspace(item: AnalysisPlaylistItem, e: Event): void {
    e.stopPropagation();
    const projectId = item.event?.projectId;
    if (projectId) {
      this.router.navigate(['/dashboard/video-analysis/workspace', projectId]);
    }
  }

  get currentItem(): AnalysisPlaylistItem | null {
    return this.items[this.currentItemIndex] || null;
  }

  // ── Helpers to read enriched data safely ──

  getEventCategory(item: AnalysisPlaylistItem): string {
    return (item.event as any)?.categoryName || `Evento #${item.eventId}`;
  }

  getEventColor(item: AnalysisPlaylistItem): string {
    return (item.event as any)?.categoryColor || '#6c757d';
  }

  getStartMs(item: AnalysisPlaylistItem): number {
    return item.customStartMs ?? item.event?.startTimeMs ?? 0;
  }

  getEndMs(item: AnalysisPlaylistItem): number {
    return item.customEndMs ?? item.event?.endTimeMs ?? 0;
  }

  formatTime(ms: number): string {
    if (!ms || ms < 0) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '-';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/video-analysis/playlists']);
  }
}
