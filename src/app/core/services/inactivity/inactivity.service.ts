import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, Subscription, merge, fromEvent, timer } from 'rxjs';
import { switchMap, startWith, takeUntil, throttleTime } from 'rxjs/operators';
import { LoginService } from '../login/login.service';

/** Tiempo total de inactividad antes del logout (20 minutos) */
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

/** Tiempo de aviso previo al logout (2 minutos antes) */
const WARNING_BEFORE_MS = 2 * 60 * 1000;

/** Intervalo mínimo entre eventos mousemove para no saturar el stream */
const MOUSEMOVE_THROTTLE_MS = 500;

@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private activityTrigger$ = new Subject<void>();
  private subscription?: Subscription;
  private countdownInterval?: ReturnType<typeof setInterval>;

  private _sessionWarningVisible = false;
  private _warningSecondsLeft = WARNING_BEFORE_MS / 1000;

  get sessionWarningVisible(): boolean {
    return this._sessionWarningVisible;
  }

  get warningSecondsLeft(): number {
    return this._warningSecondsLeft;
  }

  constructor(
    private ngZone: NgZone,
    private loginService: LoginService,
  ) {}

  /**
   * Inicia la monitorización de inactividad.
   * Debe llamarse cuando el usuario se autentica y entra al dashboard.
   */
  start(): void {
    this.stop();

    this.ngZone.runOutsideAngular(() => {
      const domActivity$ = merge(
        fromEvent(document, 'mousedown'),
        fromEvent(document, 'mousemove').pipe(throttleTime(MOUSEMOVE_THROTTLE_MS)),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'click'),
        fromEvent(document, 'touchstart', { passive: true }),
        fromEvent(document, 'scroll', { passive: true }),
      );

      this.subscription = domActivity$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.ngZone.run(() => {
            if (!this._sessionWarningVisible) {
              this.activityTrigger$.next();
            }
          });
        });
    });

    // Timer de aviso: se dispara (TIMEOUT - WARNING_BEFORE) después de la última actividad
    const warningStream$ = merge(this.activityTrigger$).pipe(
      startWith(undefined as void),
      switchMap(() => timer(INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS)),
      takeUntil(this.destroy$),
    );

    // Timer de logout: se dispara TIMEOUT después de la última actividad
    const logoutStream$ = merge(this.activityTrigger$).pipe(
      startWith(undefined as void),
      switchMap(() => timer(INACTIVITY_TIMEOUT_MS)),
      takeUntil(this.destroy$),
    );

    warningStream$.subscribe(() => this.ngZone.run(() => this.triggerWarning()));
    logoutStream$.subscribe(() => this.ngZone.run(() => this.performLogout()));
  }

  /**
   * Detiene la monitorización y limpia todos los recursos.
   * Debe llamarse al cerrar sesión o destruir el componente raíz.
   */
  stop(): void {
    this.destroy$.next();
    this.subscription?.unsubscribe();
    this.clearCountdown();
    this._sessionWarningVisible = false;
  }

  /**
   * Continúa la sesión desde el diálogo de advertencia.
   * Reinicia todos los timers.
   */
  continueSession(): void {
    this.clearCountdown();
    this._sessionWarningVisible = false;
    // Reiniciar timers emitiendo actividad manual
    this.activityTrigger$.next();
    // Reiniciamos también el stream de aviso/logout ya que startWith solo aplica al inicio
    this.stop();
    this.start();
  }

  private triggerWarning(): void {
    if (this._sessionWarningVisible) return;
    this._sessionWarningVisible = true;
    this._warningSecondsLeft = WARNING_BEFORE_MS / 1000;

    this.countdownInterval = setInterval(() => {
      this._warningSecondsLeft = Math.max(0, this._warningSecondsLeft - 1);
    }, 1000);
  }

  private performLogout(): void {
    this.stop();
    this.loginService.cerrarSesion(true);
  }

  private clearCountdown(): void {
    if (this.countdownInterval !== undefined) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stop();
    this.destroy$.complete();
  }
}
