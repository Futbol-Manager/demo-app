import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { VideoStorageService } from '../../../core/services/video-storage/video-storage.service';
import { LoginService } from '../../../core/services/login/login.service';
import { PlayerStateService } from '../services/player-state.service';
import { KeyboardShortcutsService, ShortcutAction } from '../services/keyboard-shortcuts.service';
import { AnalysisProject, AnalysisCategory, AnalysisEvent } from '../models/analysis.models';
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

  drawingMode = false;
  showFieldPicker = false;
  pendingFieldEvent: AnalysisEvent | null = null;

  fieldPositions: { x: number; y: number; color?: string }[] = [];

  showEditModal = false;
  editingEvent: AnalysisEvent | null = null;
  editNotes = '';

  readonly speedSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analysisService: VideoAnalysisService,
    private videoService: VideoStorageService,
    private loginService: LoginService,
    public ps: PlayerStateService,
    private shortcuts: KeyboardShortcutsService
  ) {}

  ngOnInit(): void {
    this.projectId = +(this.route.snapshot.paramMap.get('projectId') || '0');
    this.clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.userId = user.userId;
      }
    });

    this.loadProject();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.shortcuts.disable();
    this.ps.reset();
  }

  private loadProject(): void {
    this.isLoading = true;

    this.analysisService.getProject(this.projectId, this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.project = res.data;
          if (this.project) {
            this.loadVideo(this.project.videoId);
            this.loadTemplate(this.project.templateId);
            this.loadEvents();

            if (this.project.status === 'DRAFT') {
              this.analysisService.updateProjectStatus(this.projectId, 'IN_PROGRESS')
                .pipe(takeUntil(this.destroy$))
                .subscribe();
            }
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  private loadVideo(videoId: number): void {
    this.videoService.getVideoUrl(this.clubId, videoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.data) {
            const url = typeof res.data === 'string' ? res.data : res.data.url;
            this.isHls = url.endsWith('.m3u8');
            this.videoUrl = url;
          }
        }
      });
  }

  private loadTemplate(templateId: number): void {
    this.analysisService.getTemplate(templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.data) {
            const template = res.data;
            const categories: AnalysisCategory[] = template.categories || [];
            this.ps.setCategories(categories);
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

  onEventEdit(event: AnalysisEvent): void {
    this.editingEvent = event;
    this.editNotes = event.notes || '';
    this.showEditModal = true;
  }

  saveEventEdit(): void {
    if (!this.editingEvent) return;
    this.analysisService.updateEvent(this.editingEvent.id, { notes: this.editNotes })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.editingEvent) {
            this.editingEvent.notes = this.editNotes;
          }
          this.showEditModal = false;
          this.editingEvent = null;
        }
      });
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
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/video-analysis']);
  }
}
