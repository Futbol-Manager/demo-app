import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { AnalysisEvent, AnalysisCategory, AnalysisDrawing, AnalysisTemplate, AnalysisTag } from '../models/analysis.models';

export interface PlayerState {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  videoReady: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlayerStateService {

  private readonly initialState: PlayerState = {
    currentTimeMs: 0,
    durationMs: 0,
    isPlaying: false,
    playbackRate: 1,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    videoReady: false
  };

  state$ = new BehaviorSubject<PlayerState>({ ...this.initialState });

  events$ = new BehaviorSubject<AnalysisEvent[]>([]);
  categories$ = new BehaviorSubject<AnalysisCategory[]>([]);
  descriptors$ = new BehaviorSubject<AnalysisTag[]>([]);
  drawings$ = new BehaviorSubject<AnalysisDrawing[]>([]);
  template$ = new BehaviorSubject<AnalysisTemplate | null>(null);

  seekTo$ = new Subject<number>();
  eventCreated$ = new Subject<AnalysisEvent>();
  eventDeleted$ = new Subject<number>();
  drawingModeToggle$ = new Subject<boolean>();

  selectedEventId$ = new BehaviorSubject<number | null>(null);
  activeDrawingTool$ = new BehaviorSubject<string | null>(null);

  get state(): PlayerState {
    return this.state$.value;
  }

  updateState(partial: Partial<PlayerState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }

  seekTo(timeMs: number): void {
    this.seekTo$.next(timeMs);
  }

  play(): void {
    this.updateState({ isPlaying: true });
  }

  pause(): void {
    this.updateState({ isPlaying: false });
  }

  togglePlay(): void {
    this.updateState({ isPlaying: !this.state.isPlaying });
  }

  setPlaybackRate(rate: number): void {
    this.updateState({ playbackRate: rate });
  }

  stepForward(frames: number = 1): void {
    const frameMs = 1000 / 30;
    const newTime = Math.min(this.state.currentTimeMs + frames * frameMs, this.state.durationMs);
    this.seekTo(newTime);
  }

  stepBackward(frames: number = 1): void {
    const frameMs = 1000 / 30;
    const newTime = Math.max(this.state.currentTimeMs - frames * frameMs, 0);
    this.seekTo(newTime);
  }

  skipForward(seconds: number = 10): void {
    const newTime = Math.min(this.state.currentTimeMs + seconds * 1000, this.state.durationMs);
    this.seekTo(newTime);
  }

  skipBackward(seconds: number = 10): void {
    const newTime = Math.max(this.state.currentTimeMs - seconds * 1000, 0);
    this.seekTo(newTime);
  }

  setEvents(events: AnalysisEvent[]): void {
    this.events$.next(events);
  }

  addEvent(event: AnalysisEvent): void {
    const current = this.events$.value;
    this.events$.next([...current, event].sort((a, b) => a.startTimeMs - b.startTimeMs));
    this.eventCreated$.next(event);
  }

  removeEvent(eventId: number): void {
    this.events$.next(this.events$.value.filter(e => e.id !== eventId));
    this.eventDeleted$.next(eventId);
  }

  setCategories(categories: AnalysisCategory[]): void {
    this.categories$.next(categories);
  }

  setDescriptors(descriptors: AnalysisTag[]): void {
    this.descriptors$.next(descriptors);
  }

  setTemplate(template: AnalysisTemplate | null): void {
    this.template$.next(template);
  }

  setDrawings(drawings: AnalysisDrawing[]): void {
    this.drawings$.next(drawings);
  }

  selectEvent(eventId: number | null): void {
    this.selectedEventId$.next(eventId);
  }

  toggleDrawingMode(active: boolean): void {
    this.drawingModeToggle$.next(active);
  }

  setDrawingTool(tool: string | null): void {
    this.activeDrawingTool$.next(tool);
  }

  reset(): void {
    this.state$.next({ ...this.initialState });
    this.events$.next([]);
    this.categories$.next([]);
    this.descriptors$.next([]);
    this.drawings$.next([]);
    this.template$.next(null);
    this.selectedEventId$.next(null);
    this.activeDrawingTool$.next(null);
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
