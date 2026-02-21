import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { AnalysisCategory } from '../models/analysis.models';

export interface ShortcutAction {
  type: 'play_pause' | 'step_forward' | 'step_backward' | 'skip_forward' | 'skip_backward'
    | 'speed_up' | 'speed_down' | 'tag_category' | 'toggle_drawing' | 'undo' | 'redo'
    | 'fullscreen' | 'delete_event';
  categoryId?: number;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService implements OnDestroy {

  action$ = new Subject<ShortcutAction>();

  private enabled = false;
  private categoryShortcuts = new Map<string, number>();
  private boundHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.boundHandler = this.handleKeyDown.bind(this);
  }

  ngOnDestroy(): void {
    this.disable();
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    document.addEventListener('keydown', this.boundHandler);
  }

  disable(): void {
    this.enabled = false;
    document.removeEventListener('keydown', this.boundHandler);
  }

  registerCategories(categories: AnalysisCategory[]): void {
    this.categoryShortcuts.clear();
    for (const cat of categories) {
      if (cat.shortcutKey) {
        this.categoryShortcuts.set(cat.shortcutKey.toUpperCase(), cat.id);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      || target.isContentEditable;
    if (isInput) return;

    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;

    // Play/Pause
    if (key === ' ' || key === 'k' || key === 'K') {
      e.preventDefault();
      this.action$.next({ type: 'play_pause' });
      return;
    }

    // Frame step
    if (key === 'ArrowRight' && !ctrl) {
      e.preventDefault();
      this.action$.next({ type: 'step_forward' });
      return;
    }
    if (key === 'ArrowLeft' && !ctrl) {
      e.preventDefault();
      this.action$.next({ type: 'step_backward' });
      return;
    }

    // Skip 10s
    if (key === 'ArrowRight' && ctrl) {
      e.preventDefault();
      this.action$.next({ type: 'skip_forward' });
      return;
    }
    if (key === 'ArrowLeft' && ctrl) {
      e.preventDefault();
      this.action$.next({ type: 'skip_backward' });
      return;
    }

    // J/L for skip (YouTube style)
    if (key === 'j' || key === 'J') {
      e.preventDefault();
      this.action$.next({ type: 'skip_backward' });
      return;
    }
    if (key === 'l' || key === 'L') {
      e.preventDefault();
      this.action$.next({ type: 'skip_forward' });
      return;
    }

    // Speed
    if (key === '>' || key === '.') {
      e.preventDefault();
      this.action$.next({ type: 'speed_up' });
      return;
    }
    if (key === '<' || key === ',') {
      e.preventDefault();
      this.action$.next({ type: 'speed_down' });
      return;
    }

    // Undo/Redo
    if (ctrl && (key === 'z' || key === 'Z') && !e.shiftKey) {
      e.preventDefault();
      this.action$.next({ type: 'undo' });
      return;
    }
    if (ctrl && ((key === 'z' || key === 'Z') && e.shiftKey || key === 'y' || key === 'Y')) {
      e.preventDefault();
      this.action$.next({ type: 'redo' });
      return;
    }

    // Delete
    if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      this.action$.next({ type: 'delete_event' });
      return;
    }

    // Fullscreen
    if (key === 'f' || key === 'F') {
      e.preventDefault();
      this.action$.next({ type: 'fullscreen' });
      return;
    }

    // Drawing toggle
    if (key === 'p' || key === 'P') {
      e.preventDefault();
      this.action$.next({ type: 'toggle_drawing' });
      return;
    }

    // Category shortcuts (letter keys mapped to categories)
    const upperKey = key.toUpperCase();
    const categoryId = this.categoryShortcuts.get(upperKey);
    if (categoryId !== undefined) {
      e.preventDefault();
      this.action$.next({ type: 'tag_category', categoryId });
      return;
    }
  }
}
