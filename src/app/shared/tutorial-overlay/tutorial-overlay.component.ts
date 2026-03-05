import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { TutorialService } from '../../core/services/tutorial/tutorial.service';

const HIGHLIGHT_CLASS = 'sphaira-tutorial-highlight';
const SPOTLIGHT_PADDING = 10;
/** Duración en ms de cada paso en la reproducción automática (se usa solo si no hay audio) */
const AUTO_ADVANCE_MS = 5000;
/** Ruta base de los audios del tutorial */
const AUDIO_BASE = 'assets/audio/tutorial/';

/** Tamaño estimado de la tarjeta para calcular posición sin superponer al spotlight */
const CARD_WIDTH = 420;
const CARD_HEIGHT_EST = 320;
const CARD_GAP = 20;
const VIEWPORT_PADDING = 24;

export interface SpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-tutorial-overlay',
  templateUrl: './tutorial-overlay.component.html',
  styleUrls: ['./tutorial-overlay.component.scss']
})
export class TutorialOverlayComponent implements OnInit, OnDestroy {
  isOpen = false;
  title = '';
  text = '';
  stepIndex = 0;
  stepTotal = 0;
  isFirst = true;
  isLast = false;
  dontShowAgain = false;

  /** Estado del audio */
  audioPlaying = false;
  audioEnabled = true;

  /** Rectángulo del "hueco" para efecto spotlight (resto de pantalla oscuro) */
  spotlightRect: SpotlightRect | null = null;
  /** Posición dinámica de la tarjeta para no superponer el elemento destacado */
  cardStyle: { left?: string; top?: string; right?: string; transform?: string } = this.getDefaultCardStyle();

  /** Drag de la tarjeta */
  isDragging = false;
  private draggedThisStep = false;
  private dragStart = { x: 0, y: 0, cardLeft: 0, cardTop: 0 };

  private currentTarget: Element | null = null;
  private sub = new Subscription();
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(
    public tutorial: TutorialService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.tutorial.isOpen$.subscribe(open => {
        this.isOpen = open;
        if (!open) {
          this.clearHighlight();
          this.stopAudio();
        }
      })
    );
    this.sub.add(
      this.tutorial.currentStep$.subscribe(payload => {
        this.clearAutoAdvance();
        this.clearHighlight();
        this.stopAudio();
        if (!payload) {
          this.title = '';
          this.text = '';
          this.stepIndex = 0;
          this.stepTotal = 0;
          this.isFirst = true;
          this.isLast = false;
          this.spotlightRect = null;
          this.updateCardPosition();
          return;
        }
        this.title = payload.step.title;
        this.text = payload.step.text;
        this.stepIndex = payload.index;
        this.stepTotal = payload.total;
        this.isFirst = payload.index === 1;
        this.isLast = payload.index === payload.total;
        // Al cambiar de paso, reseteamos la posición manual del drag
        this.draggedThisStep = false;
        setTimeout(() => this.applyHighlight(payload.step.targetSelector), 150);
        if (this.audioEnabled && payload.step.audioFile) {
          this.playAudio(payload.step.audioFile);
        } else if (!this.isLast) {
          this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), AUTO_ADVANCE_MS);
        }
      })
    );
    this.sub.add(
      this.tutorial.getState$().subscribe(state => {
        this.dontShowAgain = state?.dontShowAgain ?? false;
      })
    );
  }

  ngOnDestroy(): void {
    this.clearAutoAdvance();
    this.clearHighlight();
    this.stopAudio();
    this.sub.unsubscribe();
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  private playAudio(filename: string): void {
    this.stopAudio();
    const audio = new Audio(AUDIO_BASE + filename);
    this.currentAudio = audio;
    this.audioPlaying = true;
    audio.play().catch(() => {
      // El navegador bloqueó el autoplay: fallback a avance automático
      this.audioPlaying = false;
      if (!this.isLast) {
        this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), AUTO_ADVANCE_MS);
      }
    });
    audio.onended = () => {
      this.audioPlaying = false;
      if (!this.isLast) {
        this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), 800);
      }
    };
    audio.onerror = () => {
      this.audioPlaying = false;
      if (!this.isLast) {
        this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), AUTO_ADVANCE_MS);
      }
    };
  }

  private stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    this.audioPlaying = false;
  }

  toggleAudio(): void {
    this.audioEnabled = !this.audioEnabled;
    if (!this.audioEnabled) {
      this.stopAudio();
    }
  }

  togglePlayPause(): void {
    if (!this.currentAudio) return;
    if (this.audioPlaying) {
      this.currentAudio.pause();
      this.audioPlaying = false;
    } else {
      this.currentAudio.play().catch(() => {});
      this.audioPlaying = true;
    }
  }

  // ── Spotlight ──────────────────────────────────────────────────────────────

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (this.isDragging) return;
    if (this.currentTarget && this.spotlightRect) {
      this.updateSpotlightRect();
    }
  }

  private updateSpotlightRect(): void {
    if (!this.currentTarget) return;
    const rect = this.currentTarget.getBoundingClientRect();
    this.spotlightRect = {
      left: rect.left - SPOTLIGHT_PADDING,
      top: rect.top - SPOTLIGHT_PADDING,
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2
    };
    this.updateCardPosition();
  }

  private getDefaultCardStyle(): { right: string; top: string; transform: string } {
    return { right: VIEWPORT_PADDING + 'px', top: '50%', transform: 'translateY(-50%)' };
  }

  /** Calcula la posición de la tarjeta para no superponer el elemento en spotlight (UX: modal dinámico). */
  private updateCardPosition(): void {
    if (!this.spotlightRect) {
      this.cardStyle = this.getDefaultCardStyle();
      this.cdr.markForCheck();
      return;
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
    const r = this.spotlightRect;
    const spaceRight = vw - (r.left + r.width) - VIEWPORT_PADDING;
    const spaceLeft = r.left - VIEWPORT_PADDING;
    const spaceBottom = vh - (r.top + r.height) - VIEWPORT_PADDING;
    const spaceTop = r.top - VIEWPORT_PADDING;

    let left: number;
    let top: number;

    if (spaceRight >= CARD_WIDTH + CARD_GAP) {
      left = r.left + r.width + CARD_GAP;
      top = Math.max(VIEWPORT_PADDING, Math.min(r.top + r.height / 2 - CARD_HEIGHT_EST / 2, vh - CARD_HEIGHT_EST - VIEWPORT_PADDING));
      this.cardStyle = { left: left + 'px', top: top + 'px' };
    } else if (spaceLeft >= CARD_WIDTH + CARD_GAP) {
      left = r.left - CARD_WIDTH - CARD_GAP;
      top = Math.max(VIEWPORT_PADDING, Math.min(r.top + r.height / 2 - CARD_HEIGHT_EST / 2, vh - CARD_HEIGHT_EST - VIEWPORT_PADDING));
      this.cardStyle = { left: left + 'px', top: top + 'px' };
    } else if (spaceBottom >= CARD_HEIGHT_EST + CARD_GAP) {
      left = Math.max(VIEWPORT_PADDING, Math.min(r.left + r.width / 2 - CARD_WIDTH / 2, vw - CARD_WIDTH - VIEWPORT_PADDING));
      top = r.top + r.height + CARD_GAP;
      this.cardStyle = { left: left + 'px', top: top + 'px' };
    } else if (spaceTop >= CARD_HEIGHT_EST + CARD_GAP) {
      left = Math.max(VIEWPORT_PADDING, Math.min(r.left + r.width / 2 - CARD_WIDTH / 2, vw - CARD_WIDTH - VIEWPORT_PADDING));
      top = r.top - CARD_HEIGHT_EST - CARD_GAP;
      this.cardStyle = { left: left + 'px', top: top + 'px' };
    } else {
      left = Math.max(VIEWPORT_PADDING, Math.min(r.left + r.width + CARD_GAP, vw - CARD_WIDTH - VIEWPORT_PADDING));
      top = Math.max(VIEWPORT_PADDING, Math.min(r.top, vh - CARD_HEIGHT_EST - VIEWPORT_PADDING));
      this.cardStyle = { left: left + 'px', top: top + 'px' };
    }
    this.cdr.markForCheck();
  }

  private applyHighlight(selector?: string): void {
    if (!selector) {
      this.spotlightRect = null;
      return;
    }
    const el = document.querySelector(selector);
    if (el) {
      el.classList.add(HIGHLIGHT_CLASS);
      this.currentTarget = el;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.updateSpotlightRect();
    } else {
      this.spotlightRect = null;
      this.updateCardPosition();
    }
  }

  private clearHighlight(): void {
    if (this.currentTarget) {
      this.currentTarget.classList.remove(HIGHLIGHT_CLASS);
      this.currentTarget = null;
    }
    this.spotlightRect = null;
    document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach(e => e.classList.remove(HIGHLIGHT_CLASS));
  }

  private clearAutoAdvance(): void {
    if (this.autoAdvanceTimer != null) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  // ── Drag de la tarjeta ────────────────────────────────────────────────────

  onCardMouseDown(evt: MouseEvent): void {
    const target = evt.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('label')) return;
    evt.preventDefault();
    this.startDrag(evt.clientX, evt.clientY);
  }

  onCardTouchStart(evt: TouchEvent): void {
    const target = evt.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('label')) return;
    const t = evt.touches[0];
    this.startDrag(t.clientX, t.clientY);
  }

  private startDrag(clientX: number, clientY: number): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Convertir la posición actual (puede tener right/transform) a left/top absolutas
    const cardEl = document.querySelector('.tutorial-card') as HTMLElement | null;
    let cardLeft = cardEl ? cardEl.getBoundingClientRect().left : vw - CARD_WIDTH - VIEWPORT_PADDING;
    let cardTop  = cardEl ? cardEl.getBoundingClientRect().top  : vh / 2 - CARD_HEIGHT_EST / 2;
    this.isDragging = true;
    this.dragStart = { x: clientX, y: clientY, cardLeft, cardTop };
    this.cdr.markForCheck();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(evt: MouseEvent): void {
    if (this.currentTarget && this.spotlightRect && !this.isDragging) {
      this.updateSpotlightRect();
    }
    if (!this.isDragging) return;
    this.applyDragMove(evt.clientX, evt.clientY);
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(evt: TouchEvent): void {
    if (!this.isDragging || !evt.touches.length) return;
    const t = evt.touches[0];
    this.applyDragMove(t.clientX, t.clientY);
  }

  @HostListener('document:touchend')
  onDocumentTouchEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.cdr.markForCheck();
    }
  }

  private applyDragMove(clientX: number, clientY: number): void {
    const dx = clientX - this.dragStart.x;
    const dy = clientY - this.dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.draggedThisStep = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(VIEWPORT_PADDING, Math.min(this.dragStart.cardLeft + dx, vw - CARD_WIDTH - VIEWPORT_PADDING));
    const top  = Math.max(VIEWPORT_PADDING, Math.min(this.dragStart.cardTop  + dy, vh - CARD_HEIGHT_EST - VIEWPORT_PADDING));
    this.cardStyle = { left: left + 'px', top: top + 'px' };
    this.cdr.markForCheck();
  }

  // ── Acciones del usuario ───────────────────────────────────────────────────

  onBackdropClick(): void {
    this.tutorial.close();
  }

  onNext(): void {
    this.clearAutoAdvance();
    this.stopAudio();
    this.tutorial.next();
  }

  onPrevious(): void {
    this.clearAutoAdvance();
    this.stopAudio();
    this.tutorial.previous();
  }

  onClose(): void {
    this.clearAutoAdvance();
    this.stopAudio();
    this.tutorial.close();
  }

  onDontShowAgainChange(checked: boolean): void {
    this.tutorial.setDontShowAgain(checked);
  }
}
