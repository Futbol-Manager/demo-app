import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';
import { DriveService } from 'src/app/core/services/drive/drive.service';

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

  // ── Carpetas ──────────────────────────────────────────────
  folders: any[] = [];
  activeFolderId: number | null | 'uncategorized' = null; // null = todas, 'uncategorized' = sin carpeta
  showCreateFolder = false;
  newFolderName = '';
  newFolderColor = '#3b82f6';
  folderSaving = false;
  folderError = '';

  editingFolder: any = null;  // carpeta que se está renombrando inline
  editFolderName = '';
  editFolderColor = '';

  movingVideo: any = null;  // vídeo al que se le está cambiando la carpeta

  folderColors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];

  // ── Google Drive ──────────────────────────────────────
  driveImporting = false;
  driveImportProgress = '';
  driveExporting = false;
  driveExportingVideoId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private videoService: VideoStorageService,
    private driveService: DriveService
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')!
      || Number(sessionStorage.getItem('clubId'))
      || Number(localStorage.getItem('clubId'))
      || 0;
    this.loadPlan();
    this.loadVideos();
    this.loadFolders();
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
    let base = this.videos;

    if (this.activeFolderId === 'uncategorized') {
      base = base.filter(v => !v.folderId);
    } else if (this.activeFolderId !== null) {
      base = base.filter(v => v.folderId === this.activeFolderId);
    }

    this.filteredVideos = q
      ? base.filter(v =>
          (v.title || '').toLowerCase().includes(q) ||
          (v.playerName || '').toLowerCase().includes(q) ||
          (v.tags || '').toLowerCase().includes(q)
        )
      : [...base];
  }

  selectFolder(id: number | null | 'uncategorized'): void {
    this.activeFolderId = id;
    this.applyFilter();
  }

  videoCountInFolder(folderId: number | null | 'uncategorized'): number {
    if (folderId === 'uncategorized') return this.videos.filter(v => !v.folderId).length;
    if (folderId === null) return this.videos.length;
    return this.videos.filter(v => v.folderId === folderId).length;
  }

  loadFolders(): void {
    if (!this.clubId) return;
    this.videoService.getFolders(this.clubId).subscribe({
      next: (res) => { this.folders = res?.data || []; },
      error: () => {}
    });
  }

  createFolder(): void {
    if (!this.newFolderName.trim()) return;
    this.folderSaving = true;
    this.folderError = '';
    this.videoService.createFolder(this.clubId, this.newFolderName.trim(), this.newFolderColor).subscribe({
      next: (res) => {
        if (res?.data) this.folders.push(res.data);
        this.folders.sort((a, b) => a.name.localeCompare(b.name));
        this.newFolderName = '';
        this.newFolderColor = '#3b82f6';
        this.showCreateFolder = false;
        this.folderSaving = false;
      },
      error: () => { this.folderSaving = false; this.folderError = 'Error al crear la carpeta.'; }
    });
  }

  startEditFolder(folder: any): void {
    this.editingFolder = folder;
    this.editFolderName = folder.name;
    this.editFolderColor = folder.color || '#3b82f6';
  }

  saveEditFolder(): void {
    if (!this.editingFolder || !this.editFolderName.trim()) return;
    this.videoService.updateFolder(this.clubId, this.editingFolder.id, {
      name: this.editFolderName.trim(), color: this.editFolderColor
    }).subscribe({
      next: (res) => {
        if (res?.data) {
          const idx = this.folders.findIndex(f => f.id === this.editingFolder.id);
          if (idx >= 0) this.folders[idx] = res.data;
          this.folders.sort((a, b) => a.name.localeCompare(b.name));
        }
        this.editingFolder = null;
      },
      error: () => {}
    });
  }

  deleteFolder(folder: any): void {
    if (!confirm(`¿Eliminar la carpeta "${folder.name}"? Los vídeos quedarán sin carpeta.`)) return;
    this.videoService.deleteFolder(this.clubId, folder.id).subscribe({
      next: () => {
        this.folders = this.folders.filter(f => f.id !== folder.id);
        this.videos.forEach(v => { if (v.folderId === folder.id) v.folderId = null; });
        if (this.activeFolderId === folder.id) this.selectFolder(null);
        this.applyFilter();
      },
      error: () => {}
    });
  }

  moveVideoToFolder(video: any, folderId: number | null): void {
    this.videoService.assignVideoFolder(this.clubId, video.id, folderId).subscribe({
      next: () => {
        video.folderId = folderId;
        this.movingVideo = null;
        this.applyFilter();
      },
      error: () => {}
    });
  }

  folderName(folderId: number | null): string {
    if (!folderId) return 'Sin carpeta';
    return this.folders.find(f => f.id === folderId)?.name || 'Sin carpeta';
  }

  getFolderProp(folderId: any, prop: string): string {
    if (!folderId || folderId === 'uncategorized') return '';
    return this.folders.find(f => f.id === folderId)?.[prop] || '';
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

  // ── Google Drive import ─────────────────────────────────
  async importFromDrive(): Promise<void> {
    try {
      this.driveImportProgress = 'Conectando con Google Drive…';
      this.driveImporting = true;

      const accessToken = await this.driveService.getImportToken();
      this.driveImportProgress = 'Selecciona un vídeo…';

      const file = await this.driveService.openFilePicker(accessToken);
      this.driveImportProgress = `Importando "${file.name}" (${this.formatSize(file.sizeBytes)})…`;

      const userId = Number(localStorage.getItem('userId')) || 0;
      this.videoService.importFromDrive(this.clubId, file.id, accessToken, {
        title: file.name,
        uploadedBy: userId,
        folderId: typeof this.activeFolderId === 'number' ? this.activeFolderId : undefined
      }).subscribe({
        next: (res) => {
          if (res?.data) {
            this.videos.unshift(res.data);
            this.applyFilter();
            this.loadPlan();
          }
          this.driveImporting = false;
          this.driveImportProgress = '';
        },
        error: (err) => {
          console.error('Error importando desde Drive:', err);
          this.driveImportProgress = 'Error al importar el vídeo.';
          setTimeout(() => { this.driveImporting = false; this.driveImportProgress = ''; }, 3000);
        }
      });
    } catch (e) {
      if (e === 'cancelled') {
        this.driveImporting = false;
        this.driveImportProgress = '';
        return;
      }
      console.error('Error en flujo Drive:', e);
      this.driveImportProgress = 'Error al conectar con Google Drive.';
      setTimeout(() => { this.driveImporting = false; this.driveImportProgress = ''; }, 3000);
    }
  }

  // ── Google Drive export ─────────────────────────────────
  async exportToDrive(video: any): Promise<void> {
    try {
      this.driveExporting = true;
      this.driveExportingVideoId = video.id;

      let videoUrl = video.videoUrl;
      if (!videoUrl) {
        const urlRes: any = await this.videoService.getVideoUrl(this.clubId, video.id).toPromise();
        videoUrl = urlRes?.data?.url;
      }
      if (!videoUrl) {
        alert('No se pudo obtener la URL del vídeo.');
        this.driveExporting = false;
        this.driveExportingVideoId = null;
        return;
      }

      const accessToken = await this.driveService.getExportToken();

      const response = await fetch(videoUrl);
      const blob = await response.blob();

      const filename = (video.title || 'video') + (video.contentType === 'video/mp4' ? '.mp4' : '');
      await this.driveService.uploadToDrive(accessToken, blob, filename, video.contentType || 'video/mp4');

      alert('Vídeo exportado a Google Drive correctamente.');
      this.driveExporting = false;
      this.driveExportingVideoId = null;
    } catch (e) {
      if (e === 'cancelled') {
        this.driveExporting = false;
        this.driveExportingVideoId = null;
        return;
      }
      console.error('Error exportando a Drive:', e);
      alert('Error al exportar el vídeo a Google Drive.');
      this.driveExporting = false;
      this.driveExportingVideoId = null;
    }
  }

  analyzeVideo(video: any): void {
    this.router.navigate(['/dashboard/video-analysis'], {
      queryParams: { videoId: video.id, videoTitle: video.title || video.name }
    });
  }

  goBack(): void { this.router.navigate(['/dashboard']); }
}
