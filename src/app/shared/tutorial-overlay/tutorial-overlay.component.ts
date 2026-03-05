import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { TutorialService } from '../../core/services/tutorial/tutorial.service';

const HIGHLIGHT_CLASS = 'sphaira-tutorial-highlight';
const SPOTLIGHT_PADDING = 10;
/** Duración en ms de cada paso en la reproducción automática */
const AUTO_ADVANCE_MS = 5000;

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
  /** Rectángulo del "hueco" para efecto spotlight (resto de pantalla oscuro) */
  spotlightRect: SpotlightRect | null = null;
  private currentTarget: Element | null = null;
  private sub = new Subscription();
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(public tutorial: TutorialService) {}

  ngOnInit(): void {
    this.sub.add(
      this.tutorial.isOpen$.subscribe(open => {
        this.isOpen = open;
        if (!open) this.clearHighlight();
      })
    );
    this.sub.add(
      this.tutorial.currentStep$.subscribe(payload => {
        this.clearAutoAdvance();
        this.clearHighlight();
        if (!payload) {
          this.title = '';
          this.text = '';
          this.stepIndex = 0;
          this.stepTotal = 0;
          this.isFirst = true;
          this.isLast = false;
          this.spotlightRect = null;
          return;
        }
        this.title = payload.step.title;
        this.text = payload.step.text;
        this.stepIndex = payload.index;
        this.stepTotal = payload.total;
        this.isFirst = payload.index === 1;
        this.isLast = payload.index === payload.total;
        setTimeout(() => this.applyHighlight(payload.step.targetSelector), 150);
        // Reproducción automática: avanzar al siguiente paso en ~10 s si no es el último
        if (!this.isLast) {
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
    this.sub.unsubscribe();
  }

  private clearAutoAdvance(): void {
    if (this.autoAdvanceTimer != null) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
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

  onBackdropClick(): void {
    this.tutorial.close();
  }

  onNext(): void {
    this.clearAutoAdvance();
    this.tutorial.next();
  }

  onPrevious(): void {
    this.clearAutoAdvance();
    this.tutorial.previous();
  }

  onClose(): void {
    this.clearAutoAdvance();
    this.tutorial.close();
  }

  onDontShowAgainChange(checked: boolean): void {
    this.tutorial.setDontShowAgain(checked);
  }
}
