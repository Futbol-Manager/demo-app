import {
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TutorialService } from '../../core/services/tutorial/tutorial.service';
import { TranslateService } from '@ngx-translate/core';

const STORAGE_KEY_PREFIX = 'sphaira_tutorial_trigger_pos_';
const STORAGE_KEY_HIDDEN_PREFIX = 'sphaira_tutorial_trigger_hidden_';
const DEFAULT_MARGIN = 16;
const TRIGGER_WIDTH = 220;
const TRIGGER_HEIGHT = 48;

@Component({
  selector: 'app-tutorial-trigger',
  templateUrl: './tutorial-trigger.component.html',
  styleUrls: ['./tutorial-trigger.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TutorialTriggerComponent implements OnInit, OnDestroy {
  @Input() screenId!: string;
  @Input() set label(val: string) { this._label = val; }
  get label(): string { return this._label || this.translate.instant('TUTORIAL.BTN_OPEN'); }
  private _label = '';

  position = { left: 0, top: 12 };
  isDragging = false;
  dropdownOpen = false;
  visible = true;

  private dragStart = { x: 0, y: 0, left: 0, top: 0 };
  private draggedThisTime = false;

  constructor(
    private tutorial: TutorialService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadPosition();
    this.checkHidden();
    // Auto-arrancar el tutorial la primera vez que el usuario entra en esta pantalla.
    // Si ya marcó "No volver a mostrar", start() lo ignora automáticamente.
    setTimeout(() => this.tutorial.start(this.screenId), 300);
  }

  ngOnDestroy(): void {
    this.dropdownOpen = false;
  }

  private get storageKey(): string {
    return `${STORAGE_KEY_PREFIX}${this.screenId || 'default'}`;
  }

  private get hiddenKey(): string {
    return `${STORAGE_KEY_HIDDEN_PREFIX}${this.screenId || 'default'}`;
  }

  private checkHidden(): void {
    try {
      this.visible = localStorage.getItem(this.hiddenKey) !== '1';
      this.cdr.markForCheck();
    } catch {
      this.visible = true;
    }
  }

  private loadPosition(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { left: number; top: number };
        if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
          this.position = this.clampPosition(parsed.left, parsed.top);
          this.cdr.markForCheck();
          return;
        }
      }
    } catch {}
    this.position = {
      left: typeof window !== 'undefined' ? window.innerWidth - TRIGGER_WIDTH - DEFAULT_MARGIN : 200,
      top: 12,
    };
    this.cdr.markForCheck();
  }

  private clampPosition(left: number, top: number): { left: number; top: number } {
    if (typeof window === 'undefined') return { left, top };
    const maxLeft = window.innerWidth - TRIGGER_WIDTH - DEFAULT_MARGIN;
    const maxTop = window.innerHeight - TRIGGER_HEIGHT - DEFAULT_MARGIN;
    return {
      left: Math.max(DEFAULT_MARGIN, Math.min(left, maxLeft)),
      top: Math.max(DEFAULT_MARGIN, Math.min(top, maxTop)),
    };
  }

  private savePosition(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.position));
    } catch {}
  }

  /** Inicia arrastre desde cualquier parte del control (wrapper). */
  onWrapMouseDown(evt: MouseEvent): void {
    evt.preventDefault();
    this.isDragging = true;
    this.dragStart = {
      x: evt.clientX,
      y: evt.clientY,
      left: this.position.left,
      top: this.position.top,
    };
    this.draggedThisTime = false;
    this.cdr.markForCheck();
  }

  onWrapTouchStart(evt: TouchEvent): void {
    evt.preventDefault();
    const t = evt.touches[0];
    this.isDragging = true;
    this.dragStart = {
      x: t.clientX,
      y: t.clientY,
      left: this.position.left,
      top: this.position.top,
    };
    this.draggedThisTime = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(evt: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = evt.clientX - this.dragStart.x;
    const dy = evt.clientY - this.dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.draggedThisTime = true;
    this.position = this.clampPosition(this.dragStart.left + dx, this.dragStart.top + dy);
    this.cdr.markForCheck();
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (this.isDragging) {
      this.savePosition();
      this.isDragging = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(evt: TouchEvent): void {
    if (!this.isDragging) return;
    const t = evt.touches[0];
    const dx = t.clientX - this.dragStart.x;
    const dy = t.clientY - this.dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.draggedThisTime = true;
    this.position = this.clampPosition(this.dragStart.left + dx, this.dragStart.top + dy);
    this.cdr.markForCheck();
  }

  @HostListener('document:touchend')
  onDocumentTouchEnd(): void {
    if (this.isDragging) {
      this.savePosition();
      this.isDragging = false;
      this.cdr.markForCheck();
    }
  }

  onMainButtonClick(): void {
    if (this.draggedThisTime) return;
    this.dropdownOpen = false;
    this.tutorial.start(this.screenId, true);
  }

  onDropdownToggle(evt: Event): void {
    evt.stopPropagation();
    evt.preventDefault();
    if (this.draggedThisTime) return;
    this.dropdownOpen = !this.dropdownOpen;
    this.cdr.markForCheck();
  }

  openTutorial(): void {
    this.dropdownOpen = false;
    this.tutorial.start(this.screenId, true);
    this.cdr.markForCheck();
  }

  dontShowAgain(): void {
    try {
      localStorage.setItem(`sphaira_tutorial_done_${this.screenId}`, '1');
      localStorage.setItem(this.hiddenKey, '1');
      this.visible = false;
      this.dropdownOpen = false;
      this.cdr.markForCheck();
    } catch {}
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
    this.cdr.markForCheck();
  }
}
