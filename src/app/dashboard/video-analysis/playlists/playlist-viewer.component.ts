import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { VideoStorageService } from '../../../core/services/video-storage/video-storage.service';
import { LoginService } from '../../../core/services/login/login.service';
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
  videoUrl = '';
  isPlaying = false;
  autoAdvance = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analysisService: VideoAnalysisService,
    private videoService: VideoStorageService,
    private loginService: LoginService
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
            this.items = res.data.items || res.data.items || [];
          }
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  playItem(index: number): void {
    if (index < 0 || index >= this.items.length) return;
    this.currentItemIndex = index;
    this.isPlaying = true;
  }

  onClipEnded(): void {
    if (this.autoAdvance && this.currentItemIndex < this.items.length - 1) {
      this.currentItemIndex++;
    } else {
      this.isPlaying = false;
    }
  }

  nextClip(): void {
    if (this.currentItemIndex < this.items.length - 1) {
      this.currentItemIndex++;
    }
  }

  prevClip(): void {
    if (this.currentItemIndex > 0) {
      this.currentItemIndex--;
    }
  }

  removeItem(item: AnalysisPlaylistItem, event: Event): void {
    event.stopPropagation();
    this.analysisService.removePlaylistItem(this.playlistId, item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.items = this.items.filter(i => i.id !== item.id);
        }
      });
  }

  get currentItem(): AnalysisPlaylistItem | null {
    return this.items[this.currentItemIndex] || null;
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/video-analysis/playlists']);
  }
}
