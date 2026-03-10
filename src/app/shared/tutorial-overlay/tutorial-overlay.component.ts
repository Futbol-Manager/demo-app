import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { TutorialService } from '../../core/services/tutorial/tutorial.service';
import { ElevenlabsTtsService } from '../../core/services/elevenlabs-tts/elevenlabs-tts.service';

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
  /** Si el navegador bloqueó el play (falta gesto de usuario); al hacer clic en Reproducir se reintenta */
  audioPlayBlocked = false;
  /** Nombre del archivo de audio del paso actual (para reintentar tras gesto de usuario) */
  currentStepAudioFile: string | null = null;

  /** Rectángulo del "hueco" para efecto spotlight (resto de pantalla oscuro) */
  spotlightRect: SpotlightRect | null = null;
  /** Lado de la tarjeta desde el que sale la flecha hacia el elemento (null si centrado) */
  arrowSide: 'left' | 'right' | 'top' | 'bottom' | null = null;
  /** Estilo dinámico para que la flecha apunte al centro del elemento destacado (opcional) */
  arrowPositionStyle: { top?: string; left?: string; right?: string; bottom?: string; transform?: string } | null = null;
  /** Posición dinámica de la tarjeta para no superponer el elemento destacado */
  cardStyle: { left?: string; top?: string; right?: string; transform?: string } = this.getCenteredCardStyle();

  /** Drag de la tarjeta */
  isDragging = false;
  private draggedThisStep = false;
  private dragStart = { x: 0, y: 0, cardLeft: 0, cardTop: 0 };

  private currentTarget: Element | null = null;
  private sub = new Subscription();
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentScreenId: string | null = null;
  private currentTtsUrl: string | null = null;

  constructor(
    public tutorial: TutorialService,
    private cdr: ChangeDetectorRef,
    private elevenLabs: ElevenlabsTtsService
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
          this.arrowSide = null;
          this.arrowPositionStyle = null;
          this.currentStepAudioFile = null;
          this.audioPlayBlocked = false;
          this.updateCardPosition();
          return;
        }
        this.title = payload.step.title;
        this.text = payload.step.text;
        this.stepIndex = payload.index;
        this.stepTotal = payload.total;
        this.isFirst = payload.index === 1;
        this.isLast = payload.index === payload.total;
        this.currentStepAudioFile = payload.step.audioFile || null;
        this.audioPlayBlocked = false;
        // Al cambiar de paso, reseteamos la posición manual del drag
        this.draggedThisStep = false;
        // En el último paso no mostramos spotlight: fondo uniforme y modal centrado con check
        const selector = this.isLast ? undefined : payload.step.targetSelector;
        setTimeout(() => this.applyHighlight(selector), 150);
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
        this.currentScreenId = state?.screenId ?? null;
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
    audio.volume = 1;
    this.currentAudio = audio;
    this.audioPlaying = true;
    this.audioPlayBlocked = false;
    this.cdr.markForCheck();
    audio.play().catch(() => {
      // Navegadores bloquean audio sin gesto de usuario; permitir reintento con el botón Reproducir
      this.audioPlaying = false;
      this.audioPlayBlocked = true;
      this.cdr.markForCheck();
      if (!this.isLast) {
        this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), AUTO_ADVANCE_MS);
      }
    });
    audio.onended = () => {
      this.audioPlaying = false;
      this.cdr.markForCheck();
      if (!this.isLast) {
        this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), 800);
      }
    };
    audio.onerror = () => {
      this.audioPlaying = false;
      this.cdr.markForCheck();
      if (!this.isLast) {
        this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), AUTO_ADVANCE_MS);
      }
    };
  }

  /** Reproduce el texto del paso con ElevenLabs TTS (solo para demo-role). */
  private playTtsForStep(text: string): void {
    this.stopAudio();
    this.elevenLabs.speak(text).subscribe(blob => {
      if (!blob || blob.size === 0) {
        if (!this.isLast) {
          this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), AUTO_ADVANCE_MS);
        }
        this.cdr.markForCheck();
        return;
      }
      const url = URL.createObjectURL(blob);
      this.currentTtsUrl = url;
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.audioPlaying = true;
      this.cdr.markForCheck();
      audio.play().catch(() => {
        this.audioPlaying = false;
        this.revokeTtsUrl();
        this.cdr.markForCheck();
        if (!this.isLast) {
          this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), AUTO_ADVANCE_MS);
        }
      });
      audio.onended = () => {
        this.audioPlaying = false;
        this.revokeTtsUrl();
        this.cdr.markForCheck();
        if (!this.isLast) {
          this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), 800);
        }
      };
      audio.onerror = () => {
        this.audioPlaying = false;
        this.revokeTtsUrl();
        this.cdr.markForCheck();
        if (!this.isLast) {
          this.autoAdvanceTimer = setTimeout(() => this.tutorial.next(), AUTO_ADVANCE_MS);
        }
      };
    });
  }

  private revokeTtsUrl(): void {
    if (this.currentTtsUrl) {
      URL.revokeObjectURL(this.currentTtsUrl);
      this.currentTtsUrl = null;
    }
  }

  private stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    this.revokeTtsUrl();
    this.audioPlaying = false;
  }

  toggleAudio(): void {
    this.audioEnabled = !this.audioEnabled;
    if (!this.audioEnabled) {
      this.stopAudio();
    }
  }

  togglePlayPause(): void {
    // Reintentar reproducción si el navegador bloqueó por falta de gesto de usuario
    if (this.audioPlayBlocked && this.currentStepAudioFile) {
      this.audioPlayBlocked = false;
      this.playAudio(this.currentStepAudioFile);
      return;
    }
    if (!this.currentAudio) return;
    if (this.audioPlaying) {
      this.currentAudio.pause();
      this.audioPlaying = false;
    } else {
      this.currentAudio.volume = 1;
      this.currentAudio.play().catch(() => {});
      this.audioPlaying = true;
    }
    this.cdr.markForCheck();
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

  /** Tarjeta centrada en pantalla (usado en paso 1 y cuando no hay elemento a resaltar). */
  private getCenteredCardStyle(): { left: string; top: string; transform: string } {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }

  /** Posiciona la tarjeta: paso 1 y último paso siempre centrados; resto dinámico para no tapar el elemento. */
  private updateCardPosition(): void {
    if (this.stepIndex === 1 || this.isLast) {
      this.arrowSide = null;
      this.arrowPositionStyle = null;
      this.cardStyle = this.getCenteredCardStyle();
      this.cdr.markForCheck();
      return;
    }
    if (!this.spotlightRect) {
      this.arrowSide = null;
      this.arrowPositionStyle = null;
      this.cardStyle = this.getCenteredCardStyle();
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
      this.arrowSide = 'left';
      left = r.left + r.width + CARD_GAP;
      top = Math.max(VIEWPORT_PADDING, Math.min(r.top + r.height / 2 - CARD_HEIGHT_EST / 2, vh - CARD_HEIGHT_EST - VIEWPORT_PADDING));
      this.cardStyle = { left: left + 'px', top: top + 'px' };
      // Flecha apuntando al centro vertical del spotlight
      const arrowCenterY = r.top + r.height / 2;
      const arrowTopPx = arrowCenterY - top - 20; // 20 = mitad de la altura del SVG (40px)
      const clampedTop = Math.max(0, Math.min(CARD_HEIGHT_EST - 40, arrowTopPx));
      this.arrowPositionStyle = { top: clampedTop + 'px', transform: 'translateY(-50%)' };
    } else if (spaceLeft >= CARD_WIDTH + CARD_GAP) {
      this.arrowSide = 'right';
      left = r.left - CARD_WIDTH - CARD_GAP;
      top = Math.max(VIEWPORT_PADDING, Math.min(r.top + r.height / 2 - CARD_HEIGHT_EST / 2, vh - CARD_HEIGHT_EST - VIEWPORT_PADDING));
      this.cardStyle = { left: left + 'px', top: top + 'px' };
      const arrowCenterY = r.top + r.height / 2;
      const arrowTopPx = arrowCenterY - top - 20;
      const clampedTop = Math.max(0, Math.min(CARD_HEIGHT_EST - 40, arrowTopPx));
      this.arrowPositionStyle = { top: clampedTop + 'px', transform: 'translateY(-50%)' };
    } else if (spaceBottom >= CARD_HEIGHT_EST + CARD_GAP) {
      this.arrowSide = 'top';
      left = Math.max(VIEWPORT_PADDING, Math.min(r.left + r.width / 2 - CARD_WIDTH / 2, vw - CARD_WIDTH - VIEWPORT_PADDING));
      top = r.top + r.height + CARD_GAP;
      this.cardStyle = { left: left + 'px', top: top + 'px' };
      const arrowCenterX = r.left + r.width / 2;
      const arrowLeftPx = arrowCenterX - left - 20; // 20 = mitad del ancho del SVG (40px)
      const clampedLeft = Math.max(0, Math.min(CARD_WIDTH - 40, arrowLeftPx));
      this.arrowPositionStyle = { left: clampedLeft + 'px', transform: 'translateX(-50%)' };
    } else if (spaceTop >= CARD_HEIGHT_EST + CARD_GAP) {
      this.arrowSide = 'bottom';
      left = Math.max(VIEWPORT_PADDING, Math.min(r.left + r.width / 2 - CARD_WIDTH / 2, vw - CARD_WIDTH - VIEWPORT_PADDING));
      top = r.top - CARD_HEIGHT_EST - CARD_GAP;
      this.cardStyle = { left: left + 'px', top: top + 'px' };
      const arrowCenterX = r.left + r.width / 2;
      const arrowLeftPx = arrowCenterX - left - 20;
      const clampedLeft = Math.max(0, Math.min(CARD_WIDTH - 40, arrowLeftPx));
      this.arrowPositionStyle = { left: clampedLeft + 'px', transform: 'translateX(-50%)' };
    } else {
      this.arrowSide = 'left';
      left = Math.max(VIEWPORT_PADDING, Math.min(r.left + r.width + CARD_GAP, vw - CARD_WIDTH - VIEWPORT_PADDING));
      top = Math.max(VIEWPORT_PADDING, Math.min(r.top, vh - CARD_HEIGHT_EST - VIEWPORT_PADDING));
      this.cardStyle = { left: left + 'px', top: top + 'px' };
      const arrowCenterY = r.top + r.height / 2;
      const arrowTopPx = arrowCenterY - top - 20;
      const clampedTop = Math.max(0, Math.min(CARD_HEIGHT_EST - 40, arrowTopPx));
      this.arrowPositionStyle = { top: clampedTop + 'px', transform: 'translateY(-50%)' };
    }
    this.cdr.markForCheck();
  }

  private applyHighlight(selector?: string): void {
    if (!selector) {
      this.spotlightRect = null;
      this.updateCardPosition();
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

  /** Omitir tutorial (solo en paso 1). */
  onSkipTutorial(): void {
    this.tutorial.close();
  }

  /** Clic en la barra de progreso: ir al paso correspondiente (pasos 2 a N-1 saltables). */
  onProgressBarClick(evt: MouseEvent): void {
    if (this.stepTotal <= 1) return;
    const el = evt.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const step = Math.min(this.stepTotal, Math.max(1, Math.round(pct * this.stepTotal) || 1));
    if (step !== this.stepIndex) this.tutorial.goToStep(step);
  }

  /** Repetir tutorial desde el paso 1 (último paso). */
  onRepeatTutorial(): void {
    if (this.currentScreenId) this.tutorial.restart();
  }

  /** Para re-ejecutar animación de transición al cambiar de paso */
  trackByStepId(_idx: number, stepIndex: number): number {
    return stepIndex;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(evt: KeyboardEvent): void {
    if (!this.isOpen) return;
    const tag = (evt.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    switch (evt.key) {
      case 'Escape':
        evt.preventDefault();
        this.onClose();
        break;
      case 'Enter':
        evt.preventDefault();
        this.onNext();
        break;
      case 'ArrowLeft':
        evt.preventDefault();
        if (!this.isFirst) this.onPrevious();
        break;
      case 'ArrowRight':
        evt.preventDefault();
        this.onNext();
        break;
      default:
        break;
    }
  }
}
