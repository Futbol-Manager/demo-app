import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {RegisterService} from 'src/app/core/services/register/register.service';
import {TutorialService} from 'src/app/core/services/tutorial/tutorial.service';

const ASSISTANT_STORAGE_KEY = 'sphaira_tutorial_assistant_pos';
const ASSISTANT_WIDTH = 280;
const ASSISTANT_HEIGHT = 72;
const MARGIN = 24;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  screen: number = 1; // es 1 para el login, 2 para el registro y 3 para recordar contraseña
  rememberForm: FormGroup;
  /** URL de retorno pasada desde la app móvil para redirigir tras login */
  returnUrl: string = '';

  /** Posición del asistente (fixed en px); por defecto esquina superior derecha */
  assistantPosition = { left: 0, top: MARGIN };
  isDragging = false;
  private dragStart = { x: 0, y: 0, left: 0, top: 0 };
  private draggedThisTime = false;
  private justOpenedByTouch = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private registerService: RegisterService,
    private snackBar: MatSnackBar,
    private tutorial: TutorialService,
    private cdr: ChangeDetectorRef,
  ) {
    this.rememberForm = new FormGroup({
      mail: new FormControl('', [Validators.required, Validators.email]),
    });
  }

  get mailControl() {
    return this.rememberForm.get('mail');
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.returnUrl = params.get('returnUrl') ?? '';
    });
    this.loadAssistantPosition();
    // Tutorial automático al cargar la pantalla de login
    setTimeout(() => this.tutorial.start('login', true), 500);
  }

  private loadAssistantPosition(): void {
    try {
      const raw = localStorage.getItem(ASSISTANT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { left: number; top: number };
        if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
          this.assistantPosition = this.clampPosition(parsed.left, parsed.top);
          return;
        }
      }
    } catch (_) {}
    this.assistantPosition = {
      left: typeof window !== 'undefined' ? window.innerWidth - ASSISTANT_WIDTH - MARGIN : 400,
      top: MARGIN
    };
  }

  private clampPosition(left: number, top: number): { left: number; top: number } {
    if (typeof window === 'undefined') return { left, top };
    const maxLeft = window.innerWidth - ASSISTANT_WIDTH - MARGIN;
    const maxTop = window.innerHeight - ASSISTANT_HEIGHT - MARGIN;
    return {
      left: Math.max(MARGIN, Math.min(left, maxLeft)),
      top: Math.max(MARGIN, Math.min(top, maxTop))
    };
  }

  private saveAssistantPosition(): void {
    try {
      localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(this.assistantPosition));
    } catch (_) {}
  }

  onAssistantMouseDown(evt: MouseEvent): void {
    evt.preventDefault();
    this.isDragging = true;
    this.dragStart = {
      x: evt.clientX,
      y: evt.clientY,
      left: this.assistantPosition.left,
      top: this.assistantPosition.top
    };
    this.draggedThisTime = false;
  }

  onAssistantTouchStart(evt: TouchEvent): void {
    evt.preventDefault();
    const t = evt.touches[0];
    this.isDragging = true;
    this.dragStart = {
      x: t.clientX,
      y: t.clientY,
      left: this.assistantPosition.left,
      top: this.assistantPosition.top
    };
    this.draggedThisTime = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(evt: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = evt.clientX - this.dragStart.x;
    const dy = evt.clientY - this.dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.draggedThisTime = true;
    const next = this.clampPosition(this.dragStart.left + dx, this.dragStart.top + dy);
    this.assistantPosition = next;
    this.cdr.markForCheck();
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.draggedThisTime) this.saveAssistantPosition();
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(evt: TouchEvent): void {
    if (!this.isDragging || !evt.touches.length) return;
    const t = evt.touches[0];
    const dx = t.clientX - this.dragStart.x;
    const dy = t.clientY - this.dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.draggedThisTime = true;
    const next = this.clampPosition(this.dragStart.left + dx, this.dragStart.top + dy);
    this.assistantPosition = next;
    this.cdr.markForCheck();
  }

  @HostListener('document:touchend')
  onDocumentTouchEnd(): void {
    if (this.isDragging) {
      const didDrag = this.draggedThisTime;
      this.isDragging = false;
      if (this.draggedThisTime) this.saveAssistantPosition();
      this.cdr.markForCheck();
      if (!didDrag) {
        this.justOpenedByTouch = true;
        this.openLoginTutorial();
      }
    }
  }

  onAssistantClick(): void {
    if (this.justOpenedByTouch) {
      this.justOpenedByTouch = false;
      return;
    }
    if (this.draggedThisTime) {
      this.draggedThisTime = false;
      return;
    }
    this.openLoginTutorial();
  }

  get loginLogoSrc(): string {
    const isDark = typeof document !== 'undefined' && document.body.classList.contains('dark');
    return isDark ? 'assets/images/logosphairaw.png' : 'assets/images/Logo_SphairaTech1.png';
  }

  toRegister(event: Event) {
    event.preventDefault();
    this.router.navigate(['/registro']);
  }

  toRemember(event: Event) {
    event.preventDefault();
    this.screen = 3;
  }

  sendMail() {
    if (this.rememberForm.valid) {
      const fm = this.rememberForm.value;
      this.registerService.changePassByEmail(fm.mail).pipe().subscribe(
        res => {
          if (res) {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'top';
            this.snackBar.open('Correo electrónico enviado con éxito.', 'Cerrar', snackBarConfig);
            this.screen = 1;
          } else {
            const snackBarConfig = new MatSnackBarConfig();
            snackBarConfig.duration = 5000;
            snackBarConfig.horizontalPosition = 'center';
            snackBarConfig.verticalPosition = 'top';
            this.snackBar.open('Error en el envio del mail. Vuelve a intentarlo.', 'Cerrar', snackBarConfig);
          }
        }
      )
    }
  }

  toLogin(event: Event) {
    event.preventDefault();
    this.screen = 1;
  }

  openLoginTutorial(): void {
    this.tutorial.start('login', true);
  }

}
