import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { LoginService } from '../../../core/services/login/login.service';
import { PlayerStateService } from '../services/player-state.service';
import { KeyboardShortcutsService, ShortcutAction } from '../services/keyboard-shortcuts.service';
import { LocalVideoService, FingerprintResult } from '../services/local-video.service';
import { ClipExportService } from '../services/clip-export.service';
import { ScreenCaptureService } from '../services/screen-capture.service';
import { AnalysisProject, AnalysisCategory, AnalysisTag, AnalysisEvent, AnalysisPlaylist, AnalysisPlaylistItem } from '../models/analysis.models';
import { TaggingEvent } from './tagging-panel/tagging-panel.component';
import { SaveDrawingEvent } from './drawing-overlay/drawing-overlay.component';
import { FieldPositionEvent } from './field-position/field-position.component';

@Component({
  selector: 'app-video-analysis-workspace',
  templateUrl: './video-analysis-workspace.component.html',
  styleUrls: ['./video-analysis-workspace.component.scss']
})
export class VideoAnalysisWorkspaceComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  projectId = 0;
  clubId = 0;
  userId = 0;
  project: AnalysisProject | null = null;
  isLoading = true;

  videoUrl = '';
  isHls = false;
  needsFileSelection = false;
  fingerprintError = '';

  /** YouTube ID extraído de project.externalVideoUrl (null si no es YouTube) */
  youtubeId: string | null = null;

  drawingMode = false;
  showFieldPicker = false;
  pendingFieldEvent: AnalysisEvent | null = null;

  fieldPositions: { x: number; y: number; color?: string }[] = [];

  savedToast = false;
  private savedToastTimer: any;

  taggerBlocked = false;

  // --- Right panel tabs ---
  rightPanelTab: 'events' | 'playlists' = 'events';

  // --- Playlists tab state ---
  playlists: AnalysisPlaylist[] = [];
  selectedPlaylist: AnalysisPlaylist | null = null;
  playlistItems: AnalysisPlaylistItem[] = [];
  isLoadingPlaylists = false;
  isLoadingPlaylistItems = false;
  playlistsLoadedOnce = false;
  projectLoadedOnce = false;
  showNewPlaylistForm = false;
  newPlaylistTitle = '';
  isCreatingPlaylist = false;
  expandedPlaylistItemId: number | null = null;
  deletingPlaylistItemId: number | null = null;

  // ── Playlist item edit (duration) ─────────────────────────────────────────
  editingPlaylistItemId: number | null = null;
  editItemStartHms = '';
  editItemEndHms   = '';
  editItemNotes    = '';
  isSavingPlaylistItem = false;
  playlistItemSavedFlash: number | null = null;
  private playlistItemSavedTimer: any;

  private tagMap: Map<number, string> = new Map();

  // ── Quick-add playlist (checkbox mode in Events tab) ─────────────────────
  quickPlaylistId: number | null = null;
  /** eventId → playlistItemId for events already in the quick playlist */
  quickPlaylistEventMap: Map<number, number> = new Map();
  isLoadingQuickPlaylist = false;

  // ── Playlist export (multi-clip selection) ────────────────────────────────
  selectedExportItemIds: Set<number> = new Set();
  isExportingPlaylist = false;
  exportPlaylistProgress = 0;
  exportPlaylistStep = '';

  // ── Clip annotation editor modal ─────────────────────────────────────────
  clipEditorEvent: AnalysisEvent | null = null;

  readonly speedSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

  private broadcastChannel: BroadcastChannel | null = null;
  private taggerWindow: Window | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analysisService: VideoAnalysisService,
    private loginService: LoginService,
    public ps: PlayerStateService,
    private shortcuts: KeyboardShortcutsService,
    public localVideoService: LocalVideoService,
    private clipExport: ClipExportService,
    private screenCapture: ScreenCaptureService
  ) {}

  ngOnInit(): void {
    this.projectId = +(this.route.snapshot.paramMap.get('projectId') || '0');
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.userId = user.userId;
      }
    });

    this.ps.categories$.pipe(takeUntil(this.destroy$)).subscribe(() => this.buildTagMap());
    this.ps.descriptors$.pipe(takeUntil(this.destroy$)).subscribe(() => this.buildTagMap());

    this.loadProject();
    this.loadPlaylists();
    this.setupKeyboardShortcuts();
    this.setupBroadcastChannel();
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(`sphaira-tagging-${this.projectId}`);
      this.broadcastChannel.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'tag') {
          this.onTagged(msg.event);
          this.ps.play();
          // After tagging, return focus to the tagger window
          setTimeout(() => this.refocusTagger(), 80);
        } else if (msg.type === 'pause') {
          this.ps.pause();
        } else if (msg.type === 'resume') {
          this.ps.play();
        }
      };
      // Broadcast current time every second so popup window can sync
      this.ps.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
        this.broadcastChannel?.postMessage({ type: 'time-update', timeMs: state.currentTimeMs });
      });
    }
  }

  /** Bring the tagger window to the front whenever this window gains focus. */
  @HostListener('window:focus')
  onWindowFocus(): void {
    this.refocusTagger();
  }

  private refocusTagger(): void {
    if (this.taggerWindow && !this.taggerWindow.closed) {
      this.taggerWindow.focus();
    }
  }

  openTaggerWindow(): void {
    const url = `/dashboard/video-analysis/canvas-tagger/${this.projectId}`;
    const features = 'width=820,height=560,resizable=yes,scrollbars=no,location=no,menubar=no,toolbar=no';
    const name = `sphaira-tagger-${this.projectId}`;

    if (this.taggerWindow && !this.taggerWindow.closed) {
      this.taggerWindow.focus();
      this.taggerBlocked = false;
      return;
    }
    this.taggerWindow = window.open(url, name, features);
    // Detect popup blocker
    if (!this.taggerWindow || this.taggerWindow.closed) {
      this.taggerBlocked = true;
    } else {
      this.taggerBlocked = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.shortcuts.disable();
    this.ps.reset();
    this.broadcastChannel?.close();
    clearTimeout(this.savedToastTimer);
  }

  private loadProject(): void {
    this.isLoading = true;

    this.analysisService.getProject(this.projectId, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.project = res.data;
          if (this.project) {
            this.tryLoadLocalVideo();
            this.loadTemplate(this.project.templateId);
            this.loadEvents();

            if (this.project.status === 'DRAFT') {
              // Primer acceso: cambiar estado y crear playlist automática con el nombre del proyecto
              this.analysisService.updateProjectStatus(this.projectId, 'IN_PROGRESS')
                .pipe(takeUntil(this.destroy$))
                .subscribe();

              this.analysisService.createPlaylist({
                clubId:    this.clubId,
                createdBy: this.userId,
                title:     this.project.title
              }).pipe(takeUntil(this.destroy$)).subscribe({
                next: (res: any) => {
                  if (res?.data) {
                    const newPlaylist = res.data;
                    this.playlists = [...this.playlists, newPlaylist];
                    // Vincular la playlist al proyecto para que siempre se auto-seleccione
                    this.project!.defaultPlaylistId = newPlaylist.id;
                    this.analysisService.updateProject(this.projectId, { defaultPlaylistId: newPlaylist.id })
                      .pipe(takeUntil(this.destroy$)).subscribe();
                    if (!this.selectedPlaylist) {
                      this.onPlaylistSelected(newPlaylist);
                    }
                  }
                }
              });
            }
          }
          this.isLoading = false;
          this.projectLoadedOnce = true;
          this.maybeAutoSelectPlaylist();
        },
        error: () => {
          this.isLoading = false;
          this.projectLoadedOnce = true;
        }
      });
  }

  private tryLoadLocalVideo(): void {
    // Si el proyecto tiene una URL de vídeo externa (YouTube), usamos YouTube IFrame
    if (this.project?.externalVideoUrl) {
      const ytId = this.extractYouTubeId(this.project.externalVideoUrl);
      if (ytId) {
        this.youtubeId = ytId;
        this.needsFileSelection = false;
        this.openTaggerWindow();
        return;
      }
    }

    if (this.localVideoService.hasFile()) {
      const result = this.localVideoService.verifyFingerprint(
        this.project?.localFileSize,
        this.project?.localFileDurationMs
      );

      if (result === 'match' || result === 'duration_warning') {
        this.videoUrl = this.localVideoService.blobUrl!;
        this.isHls = false;
        this.needsFileSelection = false;
        this.openTaggerWindow();
        return;
      }
    }
    this.needsFileSelection = true;
  }

  private extractYouTubeId(url: string): string | null {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  async onLocalFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.fingerprintError = '';

    try {
      const meta = await LocalVideoService.extractMeta(file);
      this.localVideoService.setFile(file, meta);

      const result: FingerprintResult = this.localVideoService.verifyFingerprint(
        this.project?.localFileSize,
        this.project?.localFileDurationMs
      );

      if (result === 'size_mismatch') {
        this.fingerprintError = `El archivo seleccionado (${this.localVideoService.formatFileSize(meta.fileSize)}) no coincide con el del análisis original (${this.localVideoService.formatFileSize(this.project?.localFileSize || 0)}). Selecciona el archivo correcto.`;
        this.localVideoService.revoke();
        return;
      }

      this.videoUrl = this.localVideoService.blobUrl!;
      this.isHls = false;
      this.needsFileSelection = false;
      // Video selected — open tagger now
      this.openTaggerWindow();
    } catch {
      this.fingerprintError = 'No se pudo leer el archivo. Asegúrate de que es un vídeo válido.';
    } finally {
      input.value = '';
    }
  }

  private loadTemplate(templateId: number): void {
    this.analysisService.getTemplate(templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.data) {
            const rawCategories: any[] = res.data.categories || [];
            const categories: AnalysisCategory[] = rawCategories.map((item: any) => {
              const cat = item.category ?? item;
              return { ...cat, tags: item.tags ?? [] } as AnalysisCategory;
            });
            const descriptors: AnalysisTag[] = res.data.descriptors || [];
            this.ps.setCategories(categories);
            this.ps.setDescriptors(descriptors);
            this.ps.setTemplate({ ...res.data.template, categories, descriptors } as any);
            this.shortcuts.registerCategories(categories);
            this.shortcuts.enable();
          }
        }
      });
  }

  private loadEvents(): void {
    this.analysisService.listEvents(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const events: AnalysisEvent[] = res.data || [];
          this.ps.setEvents(events);
          this.updateFieldPositions(events);
        }
      });
  }

  private setupKeyboardShortcuts(): void {
    this.shortcuts.action$.pipe(takeUntil(this.destroy$)).subscribe((action: ShortcutAction) => {
      switch (action.type) {
        case 'play_pause': this.ps.togglePlay(); break;
        case 'step_forward': this.ps.stepForward(); break;
        case 'step_backward': this.ps.stepBackward(); break;
        case 'skip_forward': this.ps.skipForward(10); break;
        case 'skip_backward': this.ps.skipBackward(10); break;
        case 'speed_up': this.cycleSpeed(1); break;
        case 'speed_down': this.cycleSpeed(-1); break;
        case 'fullscreen': break;
        case 'toggle_drawing': this.toggleDrawingMode(); break;
        case 'delete_event': this.deleteSelectedEvent(); break;
        case 'undo': break;
        case 'redo': break;
        case 'tag_category':
          if (action.categoryId) this.quickTag(action.categoryId);
          break;
      }
    });
  }

  private cycleSpeed(direction: number): void {
    const current = this.ps.state.playbackRate;
    const idx = this.speedSteps.indexOf(current);
    const nextIdx = Math.max(0, Math.min(this.speedSteps.length - 1, idx + direction));
    this.ps.setPlaybackRate(this.speedSteps[nextIdx]);
  }

  private quickTag(categoryId: number): void {
    const category = this.ps.categories$.value.find(c => c.id === categoryId);
    if (!category) return;

    const currentTimeMs = this.ps.state.currentTimeMs;
    const halfDuration = (category.defaultDurationSec * 1000) / 2;

    this.onTagged({
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      tagIds: [],
      startTimeMs: Math.max(0, currentTimeMs - halfDuration),
      endTimeMs: Math.min(this.ps.state.durationMs, currentTimeMs + halfDuration)
    });
  }

  onTagged(tagging: TaggingEvent): void {
    const body: any = {
      categoryId: tagging.categoryId,
      startTimeMs: tagging.startTimeMs,
      endTimeMs: tagging.endTimeMs,
      tagIds: tagging.tagIds,
      createdBy: this.userId
    };

    this.analysisService.createEvent(this.projectId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.data) {
            const event: AnalysisEvent = {
              ...res.data,
              categoryName: tagging.categoryName,
              categoryColor: tagging.categoryColor
            };
            this.ps.addEvent(event);
            this.updateFieldPositions(this.ps.events$.value);
          }
        }
      });
  }

  onEventDelete(event: AnalysisEvent): void {
    if (!confirm('¿Eliminar este evento?')) return;
    this.analysisService.deleteEvent(event.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ps.removeEvent(event.id);
          this.updateFieldPositions(this.ps.events$.value);
        }
      });
  }

  saveProject(): void {
    this.analysisService.updateProjectStatus(this.projectId, 'IN_PROGRESS')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('[VideoAnalysisWorkspace] saveProject error:', err)
      });
    this.savedToast = true;
    clearTimeout(this.savedToastTimer);
    this.savedToastTimer = setTimeout(() => { this.savedToast = false; }, 2800);
  }

  private deleteSelectedEvent(): void {
    const id = this.ps.selectedEventId$.value;
    if (id === null) return;
    const event = this.ps.events$.value.find(e => e.id === id);
    if (event) this.onEventDelete(event);
  }

  toggleDrawingMode(): void {
    this.drawingMode = !this.drawingMode;
    this.ps.toggleDrawingMode(this.drawingMode);
    if (this.drawingMode) {
      this.ps.pause();
    }
  }

  onDrawingSaved(drawing: SaveDrawingEvent): void {
    this.analysisService.saveDrawing(this.projectId, {
      ...drawing,
      createdBy: this.userId
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.data) {
            const drawings = [...this.ps.drawings$.value, res.data];
            this.ps.setDrawings(drawings);
          }
        }
      });
  }

  toggleFieldPicker(): void {
    this.showFieldPicker = !this.showFieldPicker;
  }

  onFieldPosition(position: FieldPositionEvent): void {
    const selectedId = this.ps.selectedEventId$.value;
    if (selectedId === null) return;

    this.analysisService.updateEvent(selectedId, {
      fieldX: position.x,
      fieldY: position.y
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const events = this.ps.events$.value.map(e => {
            if (e.id === selectedId) return { ...e, fieldX: position.x, fieldY: position.y };
            return e;
          });
          this.ps.setEvents(events);
          this.updateFieldPositions(events);
        }
      });
  }

  private updateFieldPositions(events: AnalysisEvent[]): void {
    this.fieldPositions = events
      .filter(e => e.fieldX !== undefined && e.fieldX !== null && e.fieldY !== undefined && e.fieldY !== null)
      .map(e => ({ x: e.fieldX!, y: e.fieldY!, color: e.categoryColor }));
  }

  completeProject(): void {
    this.analysisService.updateProjectStatus(this.projectId, 'COMPLETED')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard/video-analysis']);
        },
        error: (err) => {
          console.error('[VideoAnalysisWorkspace] completeProject error:', err);
          alert('Error al completar el análisis. Por favor, inténtalo de nuevo.');
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/video-analysis']);
  }

  // ─── Right panel tab helpers ────────────────────────────────────────────────

  switchRightTab(tab: 'events' | 'playlists'): void {
    this.rightPanelTab = tab;
    if (!this.playlistsLoadedOnce) {
      this.loadPlaylists();
    }
  }

  // ─── Playlist tab ───────────────────────────────────────────────────────────

  loadPlaylists(): void {
    if (!this.clubId) return;
    this.isLoadingPlaylists = true;
    this.analysisService.listPlaylists(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.playlists = res.data || [];
          this.playlistsLoadedOnce = true;
          this.isLoadingPlaylists = false;
          // Auto-select quick playlist if not set
          if (this.playlists.length > 0 && this.quickPlaylistId === null) {
            this.setQuickPlaylist(this.playlists[0].id);
          }
          this.maybeAutoSelectPlaylist();
        },
        error: () => { this.isLoadingPlaylists = false; }
      });
  }

  /**
   * Selecciona automáticamente la playlist vinculada al proyecto (defaultPlaylistId).
   * Solo actúa cuando AMBAS llamadas (loadProject + loadPlaylists) han terminado.
   * Si el proyecto no tiene playlist vinculada, coge la primera de la lista.
   */
  private maybeAutoSelectPlaylist(): void {
    if (!this.projectLoadedOnce || !this.playlistsLoadedOnce) return;
    if (this.selectedPlaylist) return;
    if (this.playlists.length === 0) return;

    const defaultId = this.project?.defaultPlaylistId;
    const linkedPlaylist = defaultId ? this.playlists.find(p => p.id === defaultId) : null;
    const toSelect = linkedPlaylist ?? this.playlists[0];
    this.onPlaylistSelected(toSelect);
  }

  // ── Quick-add playlist methods ────────────────────────────────────────────

  setQuickPlaylist(playlistId: number | null): void {
    this.quickPlaylistId = playlistId;
    this.quickPlaylistEventMap = new Map();
    if (!playlistId) return;

    this.isLoadingQuickPlaylist = true;
    this.analysisService.getPlaylist(playlistId, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const items: AnalysisPlaylistItem[] = res.data?.items || [];
          const map = new Map<number, number>();
          for (const item of items) {
            map.set(item.eventId, item.id);
          }
          this.quickPlaylistEventMap = map;
          this.isLoadingQuickPlaylist = false;
        },
        error: () => { this.isLoadingQuickPlaylist = false; }
      });
  }

  onQuickAdd(event: AnalysisEvent): void {
    if (!this.quickPlaylistId) return;
    this.analysisService.addPlaylistItems(this.quickPlaylistId, [{
      eventId: event.id,
      sortOrder: this.quickPlaylistEventMap.size,
      notes: '',
      customStartMs: event.startTimeMs,
      customEndMs: event.endTimeMs
    }]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const items: any[] = res.data || [];
          const newItem = items[0];
          if (newItem) {
            const updated = new Map(this.quickPlaylistEventMap);
            updated.set(event.id, newItem.id);
            this.quickPlaylistEventMap = updated;
          }
          // Keep playlist tab in sync
          const pl = this.playlists.find(p => p.id === this.quickPlaylistId);
          if (pl) pl.itemCount = (pl.itemCount || 0) + 1;
          if (this.selectedPlaylist?.id === this.quickPlaylistId) {
            this.onPlaylistSelected(this.selectedPlaylist);
          }
        }
      });
  }

  onQuickRemove(data: { eventId: number; itemId: number }): void {
    if (!this.quickPlaylistId) return;
    this.analysisService.removePlaylistItem(this.quickPlaylistId, data.itemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const updated = new Map(this.quickPlaylistEventMap);
          updated.delete(data.eventId);
          this.quickPlaylistEventMap = updated;
          const pl = this.playlists.find(p => p.id === this.quickPlaylistId);
          if (pl) pl.itemCount = Math.max(0, (pl.itemCount || 1) - 1);
          if (this.selectedPlaylist?.id === this.quickPlaylistId) {
            this.playlistItems = this.playlistItems.filter(i => i.id !== data.itemId);
          }
        }
      });
  }

  onPlaylistSelected(pl: AnalysisPlaylist): void {
    this.selectedPlaylist = pl;
    this.playlistItems = [];
    this.expandedPlaylistItemId = null;
    if (!pl) return;
    this.isLoadingPlaylistItems = true;
    this.analysisService.getPlaylist(pl.id, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const rawItems: AnalysisPlaylistItem[] = res.data?.items || [];
          // Merge with local events for resilience: if backend didn't enrich
          // an item (e.g. category lookup failed), fill from ps.events$ cache.
          this.playlistItems = rawItems.map(item => {
            if (!item.event || !item.event.categoryName) {
              const local = this.ps.events$.value.find(e => e.id === item.eventId);
              if (local) {
                return {
                  ...item,
                  event: local,
                  customStartMs: item.customStartMs ?? local.startTimeMs,
                  customEndMs: item.customEndMs ?? local.endTimeMs
                } as AnalysisPlaylistItem;
              }
            }
            return item;
          });
          this.isLoadingPlaylistItems = false;
        },
        error: () => { this.isLoadingPlaylistItems = false; }
      });
  }

  createNewPlaylist(): void {
    if (!this.newPlaylistTitle.trim() || !this.clubId || this.isCreatingPlaylist) return;
    this.isCreatingPlaylist = true;
    this.analysisService.createPlaylist({
      clubId: this.clubId,
      createdBy: this.userId,
      title: this.newPlaylistTitle.trim()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const created: AnalysisPlaylist = res.data;
          this.playlists = [...this.playlists, created];
          this.newPlaylistTitle = '';
          this.showNewPlaylistForm = false;
          this.isCreatingPlaylist = false;
          this.onPlaylistSelected(created);
        },
        error: () => { this.isCreatingPlaylist = false; }
      });
  }

  cancelNewPlaylist(): void {
    this.showNewPlaylistForm = false;
    this.newPlaylistTitle = '';
  }

  onPlaylistItemAdded(playlistId: number): void {
    // Update count in the selector list
    const pl = this.playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.itemCount = (pl.itemCount || 0) + 1;
    }
    // If this playlist is currently selected, reload its items
    if (this.selectedPlaylist?.id === playlistId) {
      this.onPlaylistSelected(this.selectedPlaylist);
    } else if (!this.selectedPlaylist && this.playlists.length > 0) {
      // Auto-select it if nothing selected
      const target = this.playlists.find(p => p.id === playlistId);
      if (target) this.onPlaylistSelected(target);
    }
  }

  // ── Playlist reorder (drag & drop) ───────────────────────────────────────

  onPlaylistItemDrop(event: CdkDragDrop<AnalysisPlaylistItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    if (!this.selectedPlaylist) return;

    // Optimistic update: reorder locally first
    moveItemInArray(this.playlistItems, event.previousIndex, event.currentIndex);

    // Persist to backend with the new sorted item IDs
    const itemIds = this.playlistItems.map(i => i.id);
    this.analysisService.reorderPlaylistItems(this.selectedPlaylist.id, itemIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => {
          // Rollback on failure
          moveItemInArray(this.playlistItems, event.currentIndex, event.previousIndex);
        }
      });
  }

  togglePlaylistItemDetail(item: AnalysisPlaylistItem, e: Event): void {
    e.stopPropagation();
    const closing = this.expandedPlaylistItemId === item.id;
    this.expandedPlaylistItemId = closing ? null : item.id;
    if (!closing) {
      // Populate edit fields
      this.editingPlaylistItemId = item.id;
      this.editItemStartHms = this.msToHms(this.getItemStartMs(item));
      this.editItemEndHms   = this.msToHms(this.getItemEndMs(item));
      this.editItemNotes    = item.notes || '';
    } else {
      this.editingPlaylistItemId = null;
    }
  }

  private msToHms(ms: number): string {
    const s   = Math.floor(ms / 1000);
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  }

  private hmsToMs(hms: string): number {
    const parts = hms.split(':').map(Number);
    if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    return 0;
  }

  savePlaylistItemEdit(item: AnalysisPlaylistItem, e: Event): void {
    e.stopPropagation();
    if (this.isSavingPlaylistItem) return;

    const startMs = this.hmsToMs(this.editItemStartHms);
    const endMs   = this.hmsToMs(this.editItemEndHms);

    if (endMs <= startMs) {
      alert('El tiempo de fin debe ser mayor que el de inicio.');
      return;
    }

    this.isSavingPlaylistItem = true;
    this.analysisService.updatePlaylistItem(item.id, {
      customStartMs: startMs,
      customEndMs:   endMs,
      notes:         this.editItemNotes
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update local state
          this.playlistItems = this.playlistItems.map(i => {
            if (i.id !== item.id) return i;
            return { ...i, customStartMs: startMs, customEndMs: endMs, notes: this.editItemNotes };
          });
          this.isSavingPlaylistItem = false;
          this.playlistItemSavedFlash = item.id;
          clearTimeout(this.playlistItemSavedTimer);
          this.playlistItemSavedTimer = setTimeout(() => {
            this.playlistItemSavedFlash = null;
          }, 2000);
        },
        error: (err) => {
          this.isSavingPlaylistItem = false;
          const msg = err?.error?.message || err?.message || `Error ${err?.status || ''}`;
          alert(`No se pudo guardar: ${msg}`);
        }
      });
  }

  removePlaylistItem(item: AnalysisPlaylistItem, e: Event): void {
    e.stopPropagation();
    if (this.deletingPlaylistItemId !== null) return;
    if (!this.selectedPlaylist) return;

    this.deletingPlaylistItemId = item.id;
    this.analysisService.removePlaylistItem(this.selectedPlaylist.id, item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.playlistItems = this.playlistItems.filter(i => i.id !== item.id);
          if (this.expandedPlaylistItemId === item.id) {
            this.expandedPlaylistItemId = null;
          }
          if (this.selectedPlaylist) {
            this.selectedPlaylist.itemCount = Math.max(0, (this.selectedPlaylist.itemCount || 1) - 1);
            const pl = this.playlists.find(p => p.id === this.selectedPlaylist!.id);
            if (pl) pl.itemCount = this.selectedPlaylist.itemCount;
          }
          this.deletingPlaylistItemId = null;
        },
        error: () => { this.deletingPlaylistItemId = null; }
      });
  }

  // ── Playlist export selection ─────────────────────────────────────────────

  toggleExportItem(item: AnalysisPlaylistItem): void {
    const id = item.id;
    const updated = new Set(this.selectedExportItemIds);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    this.selectedExportItemIds = updated;
  }

  selectAllExportItems(): void {
    this.selectedExportItemIds = new Set(
      this.playlistItems
        .filter(i => i.event?.projectId === this.projectId)
        .map(i => i.id)
    );
  }

  deselectAllExportItems(): void {
    this.selectedExportItemIds = new Set();
  }

  get exportableItems(): AnalysisPlaylistItem[] {
    return this.playlistItems.filter(
      i => this.selectedExportItemIds.has(i.id) && i.event?.projectId === this.projectId
    );
  }

  async exportSelectedPlaylistItems(): Promise<void> {
    const items = this.exportableItems;
    if (!items.length) return;
    if (this.isExportingPlaylist) return;

    // Modo YouTube → grabar pantalla clip a clip
    if (this.youtubeId) {
      this.isExportingPlaylist    = true;
      this.exportPlaylistProgress = 0;
      this.exportPlaylistStep     = 'Preparando grabación…';
      try {
        for (let i = 0; i < items.length; i++) {
          const item    = items[i];
          const startMs = item.customStartMs ?? item.event?.startTimeMs ?? 0;
          const endMs   = item.customEndMs   ?? item.event?.endTimeMs   ?? 0;
          const label   = `${this.selectedPlaylist?.title || 'clip'}_${i + 1}_${item.event?.categoryName || ''}`;
          this.exportPlaylistStep = `Grabando clip ${i + 1} de ${items.length}…`;
          await this.recordScreenClipForYoutube(
            startMs, endMs, label,
            (pct)  => { this.exportPlaylistProgress = pct; },
            (step) => { this.exportPlaylistStep = step; }
          );
        }
      } catch (err: any) {
        console.error('[PlaylistExport YouTube]', err);
        alert(`Error al exportar: ${err?.message || err}`);
      } finally {
        this.isExportingPlaylist    = false;
        this.exportPlaylistProgress = 0;
        this.exportPlaylistStep     = '';
      }
      return;
    }

    const file = this.localVideoService.file;
    if (!file) {
      alert('Carga el archivo de vídeo primero para poder exportar los clips.');
      return;
    }

    this.isExportingPlaylist    = true;
    this.exportPlaylistProgress = 0;
    this.exportPlaylistStep     = 'Preparando…';

    const clips: Array<{
      startMs: number; endMs: number; annotations: any[];
    }> = [];

    for (const item of items) {
      const startMs = item.customStartMs ?? item.event?.startTimeMs ?? 0;
      const endMs   = item.customEndMs   ?? item.event?.endTimeMs   ?? 0;
      let annotations: any[] = [];
      try {
        const res = await this.analysisService.listClipAnnotations(item.eventId).toPromise();
        annotations = (res?.data || res || []).map((a: any) => ({
          ...a,
          drawingData: typeof a.drawingData === 'string'
            ? (() => { try { return JSON.parse(a.drawingData); } catch { return []; } })()
            : (a.drawingData || [])
        }));
      } catch { /* skip annotations on error */ }
      clips.push({ startMs, endMs, annotations });
    }

    const label = this.selectedPlaylist?.title || 'playlist-export';

    try {
      await this.clipExport.exportMultipleClips(
        file, clips, label,
        (pct)  => { this.exportPlaylistProgress = pct; },
        (step) => { this.exportPlaylistStep = step; }
      );
    } catch (err: any) {
      console.error('[PlaylistExport]', err);
      alert(`Error al exportar: ${err?.message || err}`);
    } finally {
      this.isExportingPlaylist    = false;
      this.exportPlaylistProgress = 0;
      this.exportPlaylistStep     = '';
    }
  }

  // ── Screen recording para clips de YouTube ───────────────────────────────

  async recordScreenClipForYoutube(
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

    await this.runYouTubeRecording(stream, durationMs, label, prog, step);
  }

  private runYouTubeRecording(
    stream: MediaStream,
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

  getTagName(tagId: number): string {
    return this.tagMap.get(tagId) || `#${tagId}`;
  }

  // ── Clip annotation editor modal ──────────────────────────────────────────

  openClipEditor(event: AnalysisEvent): void {
    if (!this.localVideoService.file && !this.youtubeId) {
      alert('Carga el archivo de vídeo primero para poder editar los clips.');
      return;
    }
    this.clipEditorEvent = event;
  }

  closeClipEditor(): void {
    this.clipEditorEvent = null;
  }

  getEventById(eventId: number): AnalysisEvent | undefined {
    return this.ps.events$.value.find(e => e.id === eventId);
  }

  seekToClipInWorkspace(item: AnalysisPlaylistItem): void {
    const startMs = item.customStartMs ?? item.event?.startTimeMs ?? 0;
    if (item.event?.projectId === this.projectId) {
      this.ps.seekTo(startMs);
    }
  }

  getItemEventCategory(item: AnalysisPlaylistItem): string {
    return item.event?.categoryName || `Evento #${item.eventId}`;
  }

  getItemEventColor(item: AnalysisPlaylistItem): string {
    return item.event?.categoryColor || '#6c757d';
  }

  getItemStartMs(item: AnalysisPlaylistItem): number {
    return item.customStartMs ?? item.event?.startTimeMs ?? 0;
  }

  getItemEndMs(item: AnalysisPlaylistItem): number {
    return item.customEndMs ?? item.event?.endTimeMs ?? 0;
  }

  formatItemDuration(item: AnalysisPlaylistItem): string {
    const ms = this.getItemEndMs(item) - this.getItemStartMs(item);
    if (ms <= 0) return '-';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  formatMs(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
}
