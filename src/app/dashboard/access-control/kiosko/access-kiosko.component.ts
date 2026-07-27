import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import {
  ClubModulesService,
  ClubModules,
} from 'src/app/core/services/club/club-modules.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import {
  AccessControlService,
  AccessPoint,
  AccessScanResultDto,
  AccessDirection,
  PointOccupancy,
  AccessLog,
} from 'src/app/core/services/access-control/access-control.service';
import { environment } from 'src/environments/environment';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Modo portero / kiosko full-screen para tablets en la entrada del club.
 *
 * Estrategia de escaneo (en cascada, según soporte del navegador):
 *  1. API nativa `BarcodeDetector` (Chrome/Edge desktop, Android Chromium):
 *     usa la cámara trasera y procesa frames a 4 fps. Es la opción más
 *     ligera y rápida, sin dependencias adicionales.
 *  2. Fallback `html5-qrcode` (iPad Safari, navegadores sin BarcodeDetector):
 *     librería WASM que decodifica QR usando ZXing. Más pesada (~30 KB) pero
 *     funciona en cualquier navegador moderno con `getUserMedia`.
 *  3. Input manual / lector USB tipo "pistola" (siempre disponible): la
 *     mayoría de lectores QR USB se comportan como un teclado y emiten el
 *     token + Enter, así que el input enfocado los procesa out-of-the-box.
 *
 * El resultado del scan se muestra a pantalla completa durante 3 segundos
 * (verde permitido, ámbar aviso, rojo denegado) y luego vuelve al estado idle
 * para evitar dobles escaneos.
 */
declare const BarcodeDetector: any;

type ScanFeedback = AccessScanResultDto | null;

@Component({
  selector: 'app-access-kiosko',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-kiosko.component.html',
  styleUrls: ['./access-kiosko.component.scss'],
})
export class AccessKioskoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('manualInput') manualInput?: ElementRef<HTMLInputElement>;

  clubId = 0;
  loading = true;
  modules: ClubModules | null = null;
  points: AccessPoint[] = [];
  selectedPointId: number | null = null;
  direction: AccessDirection = 'IN';

  occupancy: PointOccupancy[] = [];

  /**
   * Últimos accesos del día (orden descendente por hora). Se muestra en el
   * aside del kiosko para que el portero tenga feedback persistente: quién ha
   * entrado/salido y a qué hora exactamente, sin depender del overlay efímero
   * de 3s. Se refresca tras cada scan y por polling cada 15s junto al aforo.
   */
  recentLogs: AccessLog[] = [];
  private readonly recentLogsLimit = 12;

  manualToken = '';

  feedback: ScanFeedback = null;
  feedbackResetMs = 3000;
  scanning = false;

  cameraSupported = false;
  cameraActive = false;
  cameraError: string | null = null;

  /**
   * Estrategia de escaneo en uso:
   *  - 'native':   API `BarcodeDetector` (más rápida, no requiere librería).
   *  - 'fallback': `html5-qrcode` (iPad Safari u otros sin BarcodeDetector).
   *  - 'none':     navegador sin `getUserMedia` o sin permiso → solo manual.
   *
   * Se calcula en `ngOnInit` y se muestra como hint al usuario.
   */
  scannerMode: 'native' | 'fallback' | 'none' = 'none';

  private detector: any = null;
  private mediaStream: MediaStream | null = null;
  private detectInterval: any = null;
  /** Decoder fallback (html5-qrcode). Se inicializa lazy en startCamera(). */
  private html5Decoder: Html5Qrcode | null = null;
  /** Id del contenedor DOM para el decoder fallback. */
  private readonly fallbackContainerId = 'kiosko-fallback-reader';
  private feedbackTimer: any = null;
  private occupancyTimer: any = null;
  private lastScannedToken: string | null = null;
  private lastScannedAt = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private clubService: ClubService,
    private clubModulesService: ClubModulesService,
    private accessService: AccessControlService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    const hasGetUserMedia =
      !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;

    if ('BarcodeDetector' in window && hasGetUserMedia) {
      this.scannerMode = 'native';
      this.cameraSupported = true;
    } else if (hasGetUserMedia) {
      // Sin BarcodeDetector pero con cámara: usamos html5-qrcode como
      // fallback (cubre iPad Safari y navegadores antiguos).
      this.scannerMode = 'fallback';
      this.cameraSupported = true;
    } else {
      this.scannerMode = 'none';
      this.cameraSupported = false;
    }

    const paramClubId = +this.route.snapshot.params['clubId'];
    if (paramClubId) {
      this.clubId = paramClubId;
      this.bootstrap();
      return;
    }
    const storedClubId = Number(sessionStorage.getItem('clubId') ?? '0');
    if (storedClubId > 0) {
      this.clubId = storedClubId;
      this.bootstrap();
      return;
    }
    this.loginService.usuarioActual.subscribe((user) => {
      const userId = user?.userId;
      if (!userId) {
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }
      this.clubService.getClubForEntrenador(userId).subscribe({
        next: (resp: any) => {
          this.clubId = resp?.data ?? 0;
          if (this.clubId) {
            sessionStorage.setItem('clubId', String(this.clubId));
            this.bootstrap();
          } else {
            this.loading = false;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
    });
  }

  ngAfterViewInit(): void {
    // Auto-focus en el input manual: la mayoría de lectores QR USB
    // emiten el token como teclado + Enter, así que con el input enfocado
    // funciona out-of-the-box.
    setTimeout(() => this.focusManualInput(), 300);
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.clearTimers();
  }

  private bootstrap(): void {
    this.clubModulesService.getModules(this.clubId).subscribe({
      next: (m) => {
        this.modules = m;
        if (!m.accessControlEnabled) {
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.loadPoints();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadPoints(): void {
    this.accessService.listPoints(this.clubId).subscribe({
      next: (list) => {
        this.points = (list ?? []).filter((p) => p.active);
        this.selectedPointId = this.points.length ? this.points[0].pointId : null;
        this.loading = false;
        this.refreshOccupancy();
        this.refreshRecentLogs();
        this.startOccupancyPolling();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Cámara
  // ---------------------------------------------------------------------------

  async startCamera(): Promise<void> {
    if (!this.cameraSupported || this.cameraActive) return;
    try {
      this.cameraError = null;
      // Activamos el flag ANTES de arrancar la cámara y forzamos el render
      // SÍNCRONO con `detectChanges()`. Esto es esencial en modo fallback
      // porque el div con id `kiosko-fallback-reader` debe existir en el DOM
      // ANTES de instanciar `new Html5Qrcode(id)` — de lo contrario la
      // librería lanza una excepción "HTML element with id X not found".
      // En modo nativo también necesitamos el <video #videoEl> renderizado
      // antes de asignarle el `srcObject` del MediaStream.
      this.cameraActive = true;
      this.cdr.detectChanges();

      if (this.scannerMode === 'native') {
        await this.startNativeCamera();
      } else if (this.scannerMode === 'fallback') {
        await this.startFallbackCamera();
      } else {
        this.cameraActive = false;
        this.cdr.markForCheck();
        return;
      }
      this.cdr.markForCheck();
    } catch (e) {
      this.cameraError =
        (e as Error)?.message ?? this.translate.instant('ACCESS_KIOSKO.CAMERA_ERROR');
      this.cameraActive = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Inicia escaneo usando la API nativa `BarcodeDetector` (Chromium).
   * Es el camino preferido por rendimiento.
   */
  private async startNativeCamera(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.detector = new (BarcodeDetector as any)({ formats: ['qr_code'] });
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
    const video = this.videoEl?.nativeElement;
    if (video) {
      video.srcObject = this.mediaStream;
      await video.play();
    }
    this.startDetectionLoop();
  }

  /**
   * Inicia escaneo con `html5-qrcode` cuando el navegador (típicamente
   * iPad Safari) no expone `BarcodeDetector`. La librería gestiona ella
   * misma el `<video>`, así que no usamos `videoEl` en este modo.
   */
  private async startFallbackCamera(): Promise<void> {
    if (!this.html5Decoder) {
      this.html5Decoder = new Html5Qrcode(this.fallbackContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
    }
    await this.html5Decoder.start(
      { facingMode: 'environment' },
      {
        // 4 frames por segundo: equilibrio entre fluidez y consumo de CPU
        // en tablets de gama baja.
        fps: 4,
        // Caja de escaneo cuadrada centrada al 60 % del menor lado del
        // contenedor; html5-qrcode ignora los QR fuera de esta zona.
        qrbox: (vw: number, vh: number) => {
          const minEdge = Math.min(vw, vh);
          const size = Math.floor(minEdge * 0.6);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      },
      (decodedText: string) => {
        if (decodedText) this.handleToken(decodedText);
      },
      // onScanFailure: silencioso, html5-qrcode lo invoca por cada frame
      // sin QR. Inundaría la consola.
      undefined,
    );
  }

  stopCamera(): void {
    if (this.detectInterval) {
      clearInterval(this.detectInterval);
      this.detectInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.videoEl?.nativeElement) {
      this.videoEl.nativeElement.srcObject = null;
    }
    if (this.html5Decoder) {
      // `stop()` puede rechazar si la cámara nunca llegó a iniciar (ej.
      // permiso denegado). Lo capturamos para no romper el flujo de salida.
      // Después de `clear()` el decoder no puede reutilizarse, así que lo
      // nullificamos para que un futuro `startCamera()` cree uno nuevo.
      const decoder = this.html5Decoder;
      this.html5Decoder = null;
      decoder.stop().catch(() => undefined).finally(() => {
        try { decoder.clear(); } catch { /* noop */ }
      });
    }
    this.cameraActive = false;
    this.cdr.markForCheck();
  }

  private startDetectionLoop(): void {
    if (this.detectInterval) clearInterval(this.detectInterval);
    this.detectInterval = setInterval(async () => {
      if (!this.cameraActive || this.scanning) return;
      const video = this.videoEl?.nativeElement;
      if (!video || video.readyState < 2) return;
      try {
        const codes = await this.detector.detect(video);
        if (codes && codes.length > 0) {
          const token = codes[0].rawValue;
          if (token) this.handleToken(token);
        }
      } catch {
        // Silencioso: detección puntual puede fallar entre frames
      }
    }, 250);
  }

  // ---------------------------------------------------------------------------
  // Entrada manual / lector USB
  // ---------------------------------------------------------------------------

  onManualSubmit(): void {
    const token = this.manualToken?.trim();
    if (!token) return;
    this.handleToken(token);
    this.manualToken = '';
    setTimeout(() => this.focusManualInput(), 50);
  }

  private focusManualInput(): void {
    this.manualInput?.nativeElement.focus();
  }

  // ---------------------------------------------------------------------------
  // Scan
  // ---------------------------------------------------------------------------

  private handleToken(token: string): void {
    if (this.scanning) return;
    // Anti-rebote: si el mismo token se acaba de procesar en los últimos 3s,
    // ignorar.
    const now = Date.now();
    if (this.lastScannedToken === token && now - this.lastScannedAt < 3000) {
      return;
    }
    this.lastScannedToken = token;
    this.lastScannedAt = now;
    this.scanning = true;
    this.cdr.markForCheck();

    this.accessService
      .scan({
        token,
        pointId: this.selectedPointId,
        direction: this.direction,
      })
      .subscribe({
        next: (res) => this.showFeedback(res),
        error: () => {
          const fallback: AccessScanResultDto = {
            allowed: false,
            result: 'DENIED',
            reason: 'NETWORK',
            message: this.translate.instant('ACCESS_KIOSKO.NETWORK_ERROR'),
            subjectId: null,
            subjectType: null,
            subjectName: null,
            subjectPicture: null,
            pointId: this.selectedPointId,
            pointName: null,
            paymentStatus: null,
            paymentWarning: false,
            paymentWarningMessage: null,
            logId: null,
          };
          this.showFeedback(fallback);
        },
      });
  }

  private showFeedback(res: AccessScanResultDto): void {
    this.feedback = res;
    this.cdr.markForCheck();
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      this.feedback = null;
      this.scanning = false;
      this.cdr.markForCheck();
      this.refreshOccupancy();
      this.refreshRecentLogs();
    }, this.feedbackResetMs);
  }

  // ---------------------------------------------------------------------------
  // Ocupación
  // ---------------------------------------------------------------------------

  refreshOccupancy(): void {
    if (this.clubId <= 0) return;
    this.accessService.getOccupancy(this.clubId).subscribe({
      next: (list) => {
        this.occupancy = list ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        // silencioso, no bloqueamos el kiosko si falla la ocupación
      },
    });
  }

  /**
   * Carga los logs del día actual y los muestra en el aside ordenados por
   * hora descendente, limitados a {@link recentLogsLimit}. Se invoca:
   *  - al arrancar el kiosko (loadPoints)
   *  - tras cada scan que finaliza el feedback (showFeedback)
   *  - por polling cada 15s junto al aforo
   *
   * IMPORTANTE: el backend (`AccessControlController.parseDate`) espera el
   * formato `yyyy-MM-dd`, NO ISO 8601 completo. Si enviamos `Date.toISOString()`
   * el parseo falla silenciosamente y el endpoint devuelve los recientes en
   * vez de filtrar por hoy.
   */
  refreshRecentLogs(): void {
    if (this.clubId <= 0) return;
    const today = this.toLocalYmd(new Date());
    this.accessService
      .getLogs(this.clubId, today, today)
      .subscribe({
        next: (list) => {
          const sorted = (list ?? []).slice().sort((a, b) => {
            const ta = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
            const tb = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
            return tb - ta;
          });
          this.recentLogs = sorted.slice(0, this.recentLogsLimit);
          this.cdr.markForCheck();
        },
        error: () => {
          // silencioso: la lista de logs no es crítica para operar el
          // kiosko. Si el backend está caído, el aforo y el feedback de
          // scan también fallarán y eso ya se ve, no hace falta mostrar
          // un error adicional aquí.
        },
      });
  }

  /** Formatea una fecha como `yyyy-MM-dd` en hora local (sin UTC shift). */
  private toLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private startOccupancyPolling(): void {
    if (this.occupancyTimer) clearInterval(this.occupancyTimer);
    this.occupancyTimer = setInterval(() => {
      this.refreshOccupancy();
      this.refreshRecentLogs();
    }, 15000);
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  setDirection(d: AccessDirection): void {
    this.direction = d;
    this.cdr.markForCheck();
  }

  setPoint(id: number | null): void {
    this.selectedPointId = id;
    this.cdr.markForCheck();
  }

  /**
   * Salir del Modo portero. Vuelve al menú principal del club
   * (`dashboard/inicio`) en vez de al panel de configuración de Control de
   * accesos: el portero típicamente no tiene permisos de admin sobre el módulo,
   * y el resto de roles esperan volver al home tras cerrar el kiosko.
   */
  exit(): void {
    this.stopCamera();
    this.clearTimers();
    this.router.navigate(['/dashboard/inicio']);
  }

  resolvePicture(p: string | null | undefined): string | null {
    if (!p) return null;
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    return `${environment.images}${p}`;
  }

  private clearTimers(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
    if (this.occupancyTimer) {
      clearInterval(this.occupancyTimer);
      this.occupancyTimer = null;
    }
  }
}
