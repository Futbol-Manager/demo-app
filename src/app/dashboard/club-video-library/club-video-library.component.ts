import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VideoStorageService } from 'src/app/core/services/video-storage/video-storage.service';
import { DriveService } from 'src/app/core/services/drive/drive.service';
import { LocalVideoService } from 'src/app/dashboard/video-analysis/services/local-video.service';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { getSeasons, getCurrentSeasonString } from 'src/app/core/utils/season.utils';

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

  syncingFolders = false; // sync manual

  // ── Temporada ──────────────────────────────────────────────
  seasons = getSeasons();
  selectedTemporada = getCurrentSeasonString();

  // ── Google Drive ──────────────────────────────────────
  driveImporting = false;
  driveImportProgress = '';
  driveExporting = false;
  driveExportingVideoId: number | null = null;
  driveExportProgress = '';

  // ── Análisis de vídeo ────────────────────────────────────
  analyzeConfirmVideo: any = null;   // vídeo pendiente de confirmar descarga
  analyzeDownloading = false;
  analyzeDownloadProgress = 0;       // 0-100
  analyzeDownloadError = '';

  // ── Enlace externo ────────────────────────────────────────
  showLinkModal = false;
  newLinkUrl    = '';
  newLinkTitle  = '';
  newLinkTags   = '';
  linkSaving    = false;
  linkError     = '';

  // Player externo (iframe)
  activeIframeUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private videoService: VideoStorageService,
    private driveService: DriveService,
    private localVideoService: LocalVideoService
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')!
      || Number(sessionStorage.getItem('clubId'))
      || Number(localStorage.getItem('clubId'))
      || 0;
    // Inicializar temporada desde localStorage (coherencia con el resto de la app)
    this.selectedTemporada = localStorage.getItem('temporada') ?? getCurrentSeasonString();
    this.loadPlan();
    this.loadVideos();
    this.loadFolders();
  }

  syncMessage = '';

  manualSyncFolders(): void {
    if (this.syncingFolders) return;

    // Intentar recuperar clubId desde la URL si no lo tenemos aún
    if (!this.clubId) {
      const m = window.location.pathname.match(/club-videos\/(\d+)/);
      if (m) this.clubId = Number(m[1]);
    }

    if (!this.clubId) {
      this.syncMessage = 'No se pudo determinar el club.';
      setTimeout(() => this.syncMessage = '', 3000);
      return;
    }

    this.syncingFolders = true;
    this.syncMessage = '';
    this.videoService.syncTeamFolders(this.clubId, this.selectedTemporada).pipe(timeout(20000)).subscribe({
      next: (res) => {
        this.folders = res?.data || [];
        this.syncingFolders = false;
        this.syncMessage = this.folders.length > 0
          ? `${this.folders.length} carpeta(s) sincronizadas`
          : 'No se encontraron equipos';
        setTimeout(() => this.syncMessage = '', 3000);
      },
      error: (err) => {
        this.syncingFolders = false;
        this.syncMessage = 'Error al conectar con el servidor';
        setTimeout(() => this.syncMessage = '', 3000);
        this.loadFolders();
      }
    });
  }

  loadPlan(): void {
    this.planLoading = true;
    if (!this.clubId) { this.planLoading = false; return; }
    this.videoService.getPlan(this.clubId).pipe(timeout(12000)).subscribe({
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
    this.videoService.getFolders(this.clubId, this.selectedTemporada).pipe(timeout(12000)).subscribe({
      next: (res) => { this.folders = res?.data || []; },
      error: () => {}
    });
  }

  onSeasonChange(): void {
    this.selectFolder(null); // resetear carpeta activa al cambiar temporada
    this.loadFolders();
  }

  // ── Enlace externo ────────────────────────────────────────

  detectSourceType(url: string): string {
    const u = url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('vimeo.com')) return 'vimeo';
    if (u.includes('veo.me') || u.includes('veo.camera')) return 'veo';
    return 'external';
  }

  sourceIcon(video: any): string {
    switch (video.sourceType) {
      case 'youtube': return 'bi-youtube';
      case 'vimeo':   return 'bi-vimeo';
      case 'veo':     return 'bi-camera-video-fill';
      case 'external': return 'bi-link-45deg';
      default:         return 'bi-play-circle-fill';
    }
  }

  isExternal(video: any): boolean {
    return video.sourceType && video.sourceType !== 'native';
  }

  buildEmbedUrl(url: string, type: string): string {
    if (type === 'youtube') {
      const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
    }
    if (type === 'vimeo') {
      const m = url.match(/vimeo\.com\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}?byline=0&portrait=0`;
    }
    if (type === 'veo') {
      // VEO share URL → embed con parámetro
      return url.includes('?') ? url + '&embed=1' : url + '?embed=1';
    }
    return url; // para 'external' intentamos cargarlo directamente
  }

  addExternalLink(): void {
    if (!this.newLinkUrl.trim()) return;
    this.linkSaving = true;
    this.linkError  = '';
    const userId = Number(localStorage.getItem('userId')) || 0;
    this.videoService.addExternalLink(this.clubId, {
      url: this.newLinkUrl.trim(),
      title: this.newLinkTitle.trim() || this.newLinkUrl.trim(),
      tags: this.newLinkTags.trim(),
      folderId: typeof this.activeFolderId === 'number' ? this.activeFolderId : null,
      uploadedBy: userId
    }).subscribe({
      next: (res) => {
        if (res?.data) {
          this.videos.unshift(res.data);
          this.applyFilter();
        }
        this.linkSaving   = false;
        this.showLinkModal = false;
        this.newLinkUrl    = '';
        this.newLinkTitle  = '';
        this.newLinkTags   = '';
      },
      error: () => {
        this.linkSaving = false;
        this.linkError  = 'Error al guardar el enlace. Inténtalo de nuevo.';
      }
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

  // VEO no permite embedding: muestra un modal con enlace directo
  veoPreviewVideo: any = null;

  playVideo(video: any): void {
    if (this.isExternal(video)) {
      if (video.sourceType === 'veo') {
        // VEO bloquea iframes → abrir directamente en nueva pestaña
        window.open(video.externalUrl, '_blank', 'noopener');
        return;
      }
      const embedUrl = this.buildEmbedUrl(video.externalUrl, video.sourceType);
      this.activeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      this.activeVideo = video;
      this.activeVideoUrl = '';
      return;
    }
    if (video.videoUrl) {
      this.activeVideo = video;
      this.activeVideoUrl = video.videoUrl;
      this.activeIframeUrl = null;
      return;
    }
    this.videoUrlLoading = true;
    this.videoService.getVideoUrl(this.clubId, video.id).subscribe({
      next: (res) => {
        this.activeVideoUrl = res?.data?.url || '';
        this.activeIframeUrl = null;
        this.activeVideo = video;
        this.videoUrlLoading = false;
      },
      error: () => { this.videoUrlLoading = false; }
    });
  }

  closePlayer(): void {
    this.activeVideo = null;
    this.activeVideoUrl = '';
    this.activeIframeUrl = null;
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
      this.driveExportProgress = 'Conectando con Google Drive…';

      const accessToken = await this.driveService.getExportToken();

      const ext = (video.contentType || 'video/mp4').includes('mp4') ? '.mp4' : '';
      const filename = (video.title || 'video') + ext;

      this.driveExportProgress = `Exportando "${video.title || 'vídeo'}" a Google Drive (puede tardar unos minutos)…`;

      const res: any = await this.videoService
        .exportToDrive(this.clubId, video.id, accessToken, filename)
        .toPromise();

      if (res?.status !== 200) {
        throw new Error(res?.error?.msg || 'Error desconocido');
      }

      this.driveExportProgress = '¡Exportación completada!';
      setTimeout(() => {
        this.driveExporting = false;
        this.driveExportingVideoId = null;
        this.driveExportProgress = '';
      }, 1500);

    } catch (e: any) {
      if (e === 'cancelled') {
        this.driveExporting = false;
        this.driveExportingVideoId = null;
        this.driveExportProgress = '';
        return;
      }
      const msg = e?.error?.error?.msg
        || e?.error?.message
        || e?.message
        || (typeof e === 'string' ? e : JSON.stringify(e));
      console.error('[Drive export] Error completo:', e);
      alert('Error al exportar el vídeo a Google Drive.\n\nDetalle: ' + msg);
      this.driveExporting = false;
      this.driveExportingVideoId = null;
      this.driveExportProgress = '';
    }
  }

  analyzeVideo(video: any): void {
    if (this.isExternal(video)) {
      if (video.sourceType === 'youtube') {
        // YouTube → ir al hub de análisis con la URL pre-rellenada (mismo flujo que vídeo local)
        this.router.navigate(['/dashboard/video-analysis'], {
          queryParams: {
            youtubeUrl: video.externalUrl,
            videoTitle: video.title || ''
          }
        });
      } else {
        // Vimeo / VEO / externo → ir al workspace simplificado de marcado manual
        this.router.navigate(['/dashboard/video-analysis/external-workspace'], {
          queryParams: {
            videoUrl:   video.externalUrl,
            title:      video.title || 'Análisis de vídeo',
            sourceType: video.sourceType,
            clubId:     this.clubId
          }
        });
      }
      return;
    } else {
      // Vídeo nativo (B2) → descargar y abrir en workspace
      this.analyzeConfirmVideo = video;
      this.analyzeDownloadProgress = 0;
      this.analyzeDownloadError = '';
    }
  }

  confirmAnalyzeDownload(): void {
    const video = this.analyzeConfirmVideo;
    if (!video || this.analyzeDownloading) return;

    this.analyzeDownloading = true;
    this.analyzeDownloadError = '';
    this.analyzeDownloadProgress = 0;

    // Usar el endpoint proxy de la API para evitar problemas de CORS con B2.
    // El navegador no puede hacer fetch() directamente a dominios de B2 sin CORS configurado.
    const token = localStorage.getItem('token') || '';
    const proxyUrl = `${environment.apiUrl}video/club/${this.clubId}/video/${video.id}/stream`;
    const fileName = (video.title || `video-${video.id}`) + '.mp4';

    this.localVideoService.loadFromUrl(proxyUrl, fileName, video.contentType || 'video/mp4', token)
      .subscribe({
        next: (pct: number) => { this.analyzeDownloadProgress = pct; },
        error: (err: any) => {
          this.analyzeDownloading = false;
          this.analyzeDownloadError =
            'Error al descargar el vídeo. Comprueba tu conexión e inténtalo de nuevo.';
          console.error('[analyzeVideo] download error:', err);
        },
        complete: () => {
          this.analyzeDownloading = false;
          this.analyzeConfirmVideo = null;
          this.router.navigate(['/dashboard/video-analysis'], {
            queryParams: { fromLibrary: 1, videoTitle: video.title || video.name }
          });
        }
      });
  }

  goBack(): void { this.router.navigate(['/dashboard']); }
}
