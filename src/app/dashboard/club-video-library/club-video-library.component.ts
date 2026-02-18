import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';

@Component({
  selector: 'app-club-video-library',
  templateUrl: './club-video-library.component.html',
  styleUrls: ['./club-video-library.component.scss']
})
export class ClubVideoLibraryComponent implements OnInit {

  clubId = 0;
  loading = true;
  planLoading = true;

  plan: any = null;
  hasPlan = false;
  videos: any[] = [];
  filteredVideos: any[] = [];
  searchQuery = '';

  showPlansModal = false;
  showUploadModal = false;

  activeVideo: any = null;
  activeVideoUrl = '';
  videoUrlLoading = false;

  deleteConfirmId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private videoService: VideoStorageService
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')!
      || Number(sessionStorage.getItem('clubId'))
      || Number(localStorage.getItem('clubId'))
      || 0;
    this.loadPlan();
    this.loadVideos();
  }

  loadPlan(): void {
    this.planLoading = true;
    if (!this.clubId) { this.planLoading = false; return; }
    this.videoService.getPlan(this.clubId).subscribe({
      next: (res) => {
        this.hasPlan = res?.data?.hasPlan || false;
        this.plan    = res?.data || null;
        this.planLoading = false;
      },
      error: () => { this.planLoading = false; }
    });
  }

  loadVideos(): void {
    this.loading = true;
    if (!this.clubId) { this.loading = false; return; }
    this.videoService.listVideos(this.clubId).subscribe({
      next: (res) => {
        this.videos = res?.data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredVideos = q
      ? this.videos.filter(v =>
          (v.title || '').toLowerCase().includes(q) ||
          (v.playerName || '').toLowerCase().includes(q) ||
          (v.tags || '').toLowerCase().includes(q)
        )
      : [...this.videos];
  }

  playVideo(video: any): void {
    if (video.videoUrl) {
      this.activeVideo = video;
      this.activeVideoUrl = video.videoUrl;
      return;
    }
    this.videoUrlLoading = true;
    this.videoService.getVideoUrl(this.clubId, video.id).subscribe({
      next: (res) => {
        this.activeVideoUrl = res?.data?.url || '';
        this.activeVideo = video;
        this.videoUrlLoading = false;
      },
      error: () => { this.videoUrlLoading = false; }
    });
  }

  closePlayer(): void {
    this.activeVideo = null;
    this.activeVideoUrl = '';
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
  }

  deleteVideo(): void {
    if (!this.deleteConfirmId) return;
    this.videoService.deleteVideo(this.clubId, this.deleteConfirmId).subscribe({
      next: () => {
        this.videos = this.videos.filter(v => v.id !== this.deleteConfirmId);
        this.applyFilter();
        this.deleteConfirmId = null;
        this.loadPlan();
      },
      error: () => { this.deleteConfirmId = null; }
    });
  }

  onUploadSuccess(video: any): void {
    this.videos.unshift(video);
    this.applyFilter();
    this.showUploadModal = false;
    this.loadPlan();
  }

  usedPercent(): number { return this.plan?.usedPercent || 0; }

  barColor(): string {
    const p = this.usedPercent();
    if (p >= 90) return '#e74c3c';
    if (p >= 70) return '#f39c12';
    return '#002c40';
  }

  planLabel(): string {
    const map: Record<string, string> = {
      STARTER_1TB: 'Starter 1 TB', PRO_5TB: 'Pro 5 TB', ELITE_10TB: 'Elite 10 TB'
    };
    return map[this.plan?.planKey] || (this.plan?.planKey || '');
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + ' TB';
    if (bytes >= 1e9)  return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes >= 1e6)  return (bytes / 1e6).toFixed(1) + ' MB';
    return bytes + ' B';
  }

  goBack(): void { this.router.navigate(['/dashboard']); }
}
