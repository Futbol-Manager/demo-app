import { Component, OnInit, OnDestroy, Output, EventEmitter, HostListener, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../../services/player-state.service';
import { AnalysisEvent, AnalysisCategory, AnalysisPlaylist } from '../../models/analysis.models';
import { VideoAnalysisService } from '../../../../core/services/video-analysis/video-analysis.service';
import { LoginService } from '../../../../core/services/login/login.service';
import { ClipExportService } from '../../services/clip-export.service';
import { LocalVideoService } from '../../services/local-video.service';
import { ScreenCaptureService } from '../../services/screen-capture.service';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss']
})
export class EventListComponent implements OnInit, OnDestroy {

  @Input() showHeader = true;

  /**
   * Cuando se proporciona, indica que el vídeo es de YouTube y los clips se
   * exportarán mediante grabación de pantalla en lugar de FFmpeg.
   */
  @Input() youtubeId: string | null = null;

  /** When set, checkboxes appear on each event row for one-click playlist addition. */
  @Input() quickPlaylistId: number | null = null;
  /** Map of eventId → playlistItemId for events already in the quick playlist. */
  @Input() quickPlaylistEventMap: Map<number, number> = new Map();

  @Output() eventDelete       = new EventEmitter<AnalysisEvent>();
  @Output() playlistItemAdded = new EventEmitter<number>();
  @Output() onEditClip        = new EventEmitter<AnalysisEvent>();
  /** Emitted when user checks an event checkbox (add to quick playlist). */
  @Output() quickAdd          = new EventEmitter<AnalysisEvent>();
  /** Emitted when user unchecks an event checkbox (remove from quick playlist). */
  @Output() quickRemove       = new EventEmitter<{ eventId: number; itemId: number }>();

  // ── Quick-add spinner per event ──
  quickAddingEventId: number | null = null;

  private destroy$ = new Subject<void>();

  events: AnalysisEvent[] = [];
  filteredEvents: AnalysisEvent[] = [];
  categories: AnalysisCategory[] = [];
  selectedEventId: number | null = null;

  filterCategoryId: number | null = null;
  searchQuery = '';

  // ── Detail panel state ──
  expandedEventId: number | null = null;
  editStartHms = '';
  editEndHms = '';
  editNotes = '';
  isSavingDetail = false;
  detailSavedFlash = false;
  private detailSavedTimer: any;

  // ── Download clip state ──
  downloadingEventId: number | null = null;
  downloadProgress = 0;
  downloadStep = '';

  // ── Add-to-playlist state ──
  playlistDropdownEventId: number | null = null;
  playlists: AnalysisPlaylist[] = [];
  playlistsLoaded = false;
  addingToPlaylistId: number | null = null;
  addedFlashEventId: number | null = null;
  private addedFlashTimer: any;

  // ── New playlist inline form ──
  showNewPlaylistForm = false;
  newPlaylistTitle = '';
  isCreatingPlaylist = false;

  private tagMap: Map<number, string> = new Map();
  private clubId = 0;
  private userId = 0;

  constructor(
    public ps: PlayerStateService,
    private analysisService: VideoAnalysisService,
    private loginService: LoginService,
    private clipExport: ClipExportService,
    private localVideo: LocalVideoService,
    private screenCapture: ScreenCaptureService
  ) {}

  ngOnInit(): void {
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;

    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) this.userId = user.userId;
    });

    this.ps.events$.pipe(takeUntil(this.destroy$)).subscribe(events => {
      this.events = events;
      this.applyFilter();
      if (this.expandedEventId && !events.find(e => e.id === this.expandedEventId)) {
        this.expandedEventId = null;
      }
    });

    this.ps.categories$.pipe(takeUntil(this.destroy$)).subscribe(cats => {
      this.categories = cats;
      this.buildTagMap();
    });

    this.ps.descriptors$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.buildTagMap();
    });

    this.ps.selectedEventId$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      this.selectedEventId = id;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.detailSavedTimer);
    clearTimeout(this.addedFlashTimer);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.playlist-dropdown-anchor')) {
      this.playlistDropdownEventId = null;
    }
  }

  private buildTagMap(): void {
    this.tagMap = new Map();
    for (const cat of this.ps.categories$.value) {
      for (const tag of cat.tags || []) {
        this.tagMap.set(tag.id, tag.name);
      }
    }
    for (const desc of this.ps.descriptors$.value) {
      this.tagMap.set(desc.id, desc.name);
    }
  }

  applyFilter(): void {
    let result = [...this.events];
    if (this.filterCategoryId) {
      result = result.filter(e => e.categoryId === this.filterCategoryId);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.categoryName || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q) ||
        (e.playerName || '').toLowerCase().includes(q)
      );
    }
    this.filteredEvents = result;
  }

  selectEvent(evt: AnalysisEvent): void {
    this.ps.selectEvent(evt.id);
    this.ps.seekTo(evt.startTimeMs);
    this.toggleDetail(evt);
  }

  toggleDetail(evt: AnalysisEvent): void {
    if (this.expandedEventId === evt.id) {
      this.expandedEventId = null;
      return;
    }
    this.expandedEventId = evt.id;
    this.editStartHms = this.msToHms(evt.startTimeMs);
    this.editEndHms = this.msToHms(evt.endTimeMs);
    this.editNotes = evt.notes || '';
  }

  onDelete(evt: AnalysisEvent, e: Event): void {
    e.stopPropagation();
    this.eventDelete.emit(evt);
  }

  clearFilter(): void {
    this.filterCategoryId = null;
    this.searchQuery = '';
    this.applyFilter();
  }

  setFilterCategory(categoryId: number | null): void {
    this.filterCategoryId = categoryId;
    this.applyFilter();
  }

  // ── Time helpers ──

  msToHms(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  hmsToMs(hms: string): number | null {
    const parts = hms.trim().split(':');
    if (parts.length !== 3) return null;
    const [h, m, s] = parts.map(Number);
    if ([h, m, s].some(isNaN)) return null;
    return (h * 3600 + m * 60 + s) * 1000;
  }

  getCalcDurationMs(startHms: string, endHms: string): number {
    const s = this.hmsToMs(startHms);
    const e = this.hmsToMs(endHms);
    if (s === null || e === null || e <= s) return 0;
    return e - s;
  }

  formatDurationMs(ms: number): string {
    if (ms <= 0) return '-';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  getTagName(tagId: number): string {
    return this.tagMap.get(tagId) || `#${tagId}`;
  }

  // ── Save detail ──

  saveDetail(evt: AnalysisEvent): void {
    const startMs = this.hmsToMs(this.editStartHms);
    const endMs = this.hmsToMs(this.editEndHms);
    if (startMs === null || endMs === null) {
      alert('Formato de tiempo inválido. Usa hh:mm:ss');
      return;
    }
    if (startMs >= endMs) {
      alert('El tiempo de inicio debe ser anterior al fin');
      return;
    }

    this.isSavingDetail = true;
    this.analysisService.updateEvent(evt.id, {
      startTimeMs: startMs,
      endTimeMs: endMs,
      notes: this.editNotes
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const updated = this.ps.events$.value.map(e =>
            e.id === evt.id
              ? { ...e, startTimeMs: startMs, endTimeMs: endMs, notes: this.editNotes }
              : e
          );
          this.ps.setEvents(updated);
          this.isSavingDetail = false;
          this.triggerDetailSavedFlash();
        },
        error: () => {
          this.isSavingDetail = false;
          alert('Error al guardar los cambios');
        }
      });
  }

  seekToStart(evt: AnalysisEvent, e: Event): void {
    e.stopPropagation();
    this.ps.seekTo(evt.startTimeMs);
  }

  private triggerDetailSavedFlash(): void {
    this.detailSavedFlash = true;
    clearTimeout(this.detailSavedTimer);
    this.detailSavedTimer = setTimeout(() => {
      this.detailSavedFlash = false;
    }, 2000);
  }

  // ── Download clip ──

  async downloadClip(evt: AnalysisEvent, e: Event): Promise<void> {
    e.stopPropagation();
    if (this.downloadingEventId !== null) return;

    this.downloadingEventId = evt.id;
    this.downloadProgress   = 0;

    const label = `${evt.categoryName || 'clip'}_${this.msToHms(evt.startTimeMs).replace(/:/g, '-')}`;

    try {
      if (this.youtubeId) {
        // ── Modo YouTube: grabación de pantalla ──────────────────────────────
        this.downloadStep = 'Solicitando captura de pantalla…';
        await this.recordScreenClip(evt.startTimeMs, evt.endTimeMs, label,
          (pct) => { this.downloadProgress = pct; },
          (step) => { this.downloadStep = step; }
        );
      } else {
        // ── Modo local: FFmpeg ───────────────────────────────────────────────
        if (!this.localVideo.file) {
          alert('No hay vídeo cargado. Carga el archivo de vídeo primero.');
          return;
        }
        this.downloadStep = 'Cargando anotaciones…';

        const raw = await this.analysisService.listClipAnnotations(evt.id).toPromise().catch(() => null);
        let annotations: any[] = (raw?.data || raw || []);
        annotations = annotations.map((a: any) => ({
          ...a,
          drawingData: typeof a.drawingData === 'string'
            ? (() => { try { return JSON.parse(a.drawingData); } catch { return []; } })()
            : (a.drawingData || [])
        }));

        if (annotations.length === 0) {
          this.downloadStep = 'Exportando…';
          await this.clipExport.exportClip(
            this.localVideo.file!,
            evt.startTimeMs,
            evt.endTimeMs,
            label,
            (pct) => { this.downloadProgress = pct; }
          );
        } else {
          this.downloadStep = 'Preparando frames anotados…';
          const ready = await this.clipExport.prepareAnnotationThumbnails(this.localVideo.file!, annotations);
          await this.clipExport.exportClipWithAnnotations(
            this.localVideo.file!,
            evt.startTimeMs,
            evt.endTimeMs,
            label,
            ready,
            (pct)  => { this.downloadProgress = pct; },
            (step) => { this.downloadStep = step; }
          );
        }
      }
    } catch (err: any) {
      console.error('[ClipExport] Error:', err);
      const msg = err?.message || String(err);
      alert(`Error al exportar el clip:\n${msg}`);
    } finally {
      this.downloadingEventId = null;
      this.downloadProgress   = 0;
      this.downloadStep       = '';
    }
  }

  /**
   * Graba el clip de YouTube usando el ScreenCaptureService.
   * - El permiso se pide una sola vez; las siguientes llamadas reutilizan el stream.
   * - Si Region Capture está disponible (Chrome 104+), recorta al reproductor de YouTube.
   */
  private async recordScreenClip(
    startMs: number,
    endMs: number,
    label: string,
    onProgress?: (pct: number) => void,
    onStep?: (step: string) => void
  ): Promise<void> {
    const durationMs = Math.max(0, endMs - startMs);
    const step = (s: string) => { if (onStep) onStep(s); };
    const prog = (p: number) => { if (onProgress) onProgress(p); };

    step('Posicionando vídeo…');
    prog(5);
    this.ps.updateState({ isPlaying: false });
    this.ps.seekTo(startMs);
    await new Promise(r => setTimeout(r, 700));

    // Elemento del reproductor para Region Capture
    const cropEl = document.getElementById('yt-player-embed');

    if (!this.screenCapture.isActive) {
      step('Selecciona esta pestaña para compartir el vídeo…');
    }
    prog(10);

    let stream: MediaStream;
    try {
      stream = await this.screenCapture.acquireStream(cropEl);
    } catch {
      throw new Error('Se canceló la selección de pantalla.');
    }

    await this.runRecording(stream, startMs, durationMs, label, prog, step);
  }

  /** Graba durationMs ms del stream y descarga el resultado. */
  private runRecording(
    stream: MediaStream,
    startMs: number,
    durationMs: number,
    label: string,
    prog: (p: number) => void,
    step: (s: string) => void
  ): Promise<void> {
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    return new Promise<void>((resolve, reject) => {
      recorder.onstop = () => {
        prog(95);
        const blob = new Blob(chunks, { type: mimeType });
        const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${label.replace(/[\\/:*?"<>|]/g, '_')}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        prog(100);
        resolve();
      };
      recorder.onerror = (e: any) => reject(e.error || new Error('Error en MediaRecorder'));

      recorder.start(500);
      step('Grabando…');
      prog(20);
      this.ps.updateState({ isPlaying: true });

      const tickMs = 500;
      let elapsed  = 0;
      const interval = setInterval(() => {
        elapsed += tickMs;
        prog(20 + Math.min(73, Math.round((elapsed / durationMs) * 73)));
        step(`Grabando… ${Math.round(elapsed / 1000)}s / ${Math.round(durationMs / 1000)}s`);
      }, tickMs);

      setTimeout(() => {
        clearInterval(interval);
        this.ps.updateState({ isPlaying: false });
        step('Finalizando…');
        recorder.stop();
      }, durationMs + 300);
    });
  }

  // ── Quick add to playlist (checkbox mode) ──

  onQuickCheckboxChange(evt: AnalysisEvent, checked: boolean, e: Event): void {
    e.stopPropagation();
    if (this.quickAddingEventId === evt.id) return;
    this.quickAddingEventId = evt.id;

    if (checked) {
      this.quickAdd.emit(evt);
    } else {
      const itemId = this.quickPlaylistEventMap.get(evt.id);
      if (itemId !== undefined) {
        this.quickRemove.emit({ eventId: evt.id, itemId });
      }
    }

    // Clear spinner after a short delay (parent updates the map)
    setTimeout(() => { this.quickAddingEventId = null; }, 600);
  }

  isQuickChecked(eventId: number): boolean {
    return this.quickPlaylistEventMap.has(eventId);
  }

  // ── Add to playlist ──

  togglePlaylistDropdown(evt: AnalysisEvent, e: Event): void {
    e.stopPropagation();
    if (this.playlistDropdownEventId === evt.id) {
      this.playlistDropdownEventId = null;
      return;
    }
    this.playlistDropdownEventId = evt.id;
    this.showNewPlaylistForm = false;
    this.newPlaylistTitle = '';
    if (!this.playlistsLoaded) {
      this.loadPlaylists();
    }
  }

  private loadPlaylists(): void {
    this.analysisService.listPlaylists(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.playlists = res.data || [];
          this.playlistsLoaded = true;
        },
        error: () => { this.playlistsLoaded = true; }
      });
  }

  addToPlaylist(evt: AnalysisEvent, playlist: AnalysisPlaylist): void {
    if (this.addingToPlaylistId !== null) return;
    this.addingToPlaylistId = playlist.id;
    const sortOrder = (playlist.itemCount || 0) + 1;

    this.analysisService.addPlaylistItems(playlist.id, [{
      eventId: evt.id,
      sortOrder,
      customStartMs: evt.startTimeMs,
      customEndMs: evt.endTimeMs
    }]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.addingToPlaylistId = null;
          this.playlistDropdownEventId = null;
          playlist.itemCount = (playlist.itemCount || 0) + 1;
          this.triggerAddedFlash(evt.id);
          this.playlistItemAdded.emit(playlist.id);
        },
        error: (err) => {
          this.addingToPlaylistId = null;
          console.error('[Playlist] Error al añadir item:', err);
          alert('No se pudo añadir el clip a la playlist. Comprueba que el servidor está activo.');
        }
      });
  }

  createAndAddToPlaylist(evt: AnalysisEvent): void {
    if (!this.newPlaylistTitle.trim() || this.isCreatingPlaylist) return;
    if (!this.clubId) {
      alert('No se detectó el club. Recarga la página e inténtalo de nuevo.');
      return;
    }

    this.isCreatingPlaylist = true;

    this.analysisService.createPlaylist({
      clubId: this.clubId,
      createdBy: this.userId,
      title: this.newPlaylistTitle.trim()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isCreatingPlaylist = false;
          const newPl: AnalysisPlaylist = res.data;
          if (!newPl || !newPl.id) {
            alert('La playlist se creó pero la respuesta del servidor fue inesperada.');
            return;
          }
          this.playlists = [newPl, ...this.playlists];
          this.addToPlaylist(evt, newPl);
          this.showNewPlaylistForm = false;
          this.newPlaylistTitle = '';
        },
        error: (err) => {
          this.isCreatingPlaylist = false;
          console.error('[Playlist] Error al crear playlist:', err);
          alert('No se pudo crear la playlist. Comprueba que el servidor está activo.');
        }
      });
  }

  private triggerAddedFlash(eventId: number): void {
    this.addedFlashEventId = eventId;
    clearTimeout(this.addedFlashTimer);
    this.addedFlashTimer = setTimeout(() => {
      this.addedFlashEventId = null;
    }, 2000);
  }
}
