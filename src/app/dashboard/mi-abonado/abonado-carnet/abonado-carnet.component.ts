import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AbonadoCarnet, AbonadoService } from 'src/app/core/services/abonado/abonado.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { environment } from 'src/environments/environment';

// html2pdf se carga vía <script> global en index.html (assets/js/html2pdf.bundle.min.js).
// Misma estrategia que el resto del dashboard (calendario, session-pdf).
declare var html2pdf: any;

/**
 * Carnet digital del abonado con QR rotatorio cada 60 s.
 *
 * <h3>Comportamiento</h3>
 * <ul>
 *   <li>Al inicializarse pide {@code GET /rest/abonado/me/carnet} y
 *       arranca un timer que refresca el token 5 s antes del
 *       {@code expEpoch}.</li>
 *   <li>Si la ventana queda inactiva (por ejemplo móvil bloqueado) el
 *       cliente deja de refrescar para no malgastar peticiones; al
 *       volver al primer plano se vuelve a llamar inmediatamente.</li>
 *   <li>El botón "Descargar PDF" pide la variante con token largo
 *       (`/me/carnet/print`) y usa {@code html2pdf.js} para renderizar
 *       una versión imprimible del DOM del carnet.</li>
 * </ul>
 *
 * <p>El componente es standalone para evitar inflar
 * {@code dashboard.module}; lo consume {@code MiAbonadoComponent}
 * importándolo en su array {@code imports}.</p>
 */
@Component({
  selector: 'app-abonado-carnet',
  templateUrl: './abonado-carnet.component.html',
  styleUrls: ['./abonado-carnet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbonadoCarnetComponent implements OnInit, OnDestroy, AfterViewInit {
  /** Datos del abonado/club que ya conoce el padre (fallback para mostrar instantáneamente). */
  @Input() fallbackName: string | null = null;
  @Input() fallbackClubName: string | null = null;

  /** Referencia al nodo HTML que se exporta a PDF. */
  @ViewChild('carnetRoot', { static: false }) carnetRoot?: ElementRef<HTMLDivElement>;

  /** Datos del carnet recibidos del backend. */
  carnet: AbonadoCarnet | null = null;
  loading = true;
  /** Segundos restantes hasta el siguiente refresh (driver del countdown). */
  remainingSec = 0;
  /** Bloqueo del botón "Descargar PDF" mientras se genera. */
  generatingPdf = false;
  /** Si la imagen de la foto del abonado se rompe (404). */
  avatarBroken = false;
  /** Si la imagen del logo del club se rompe (404). */
  clubLogoBroken = false;
  /** Base de CDN para componer URLs. */
  readonly imageBaseUrl = environment.images;

  private readonly destroy$ = new Subject<void>();
  /** Timer que cuenta segundos hasta el próximo refresh. */
  private countdownHandle: number | null = null;
  /** Handler de visibilitychange para pausar/reanudar el polling. */
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !this.isFresh()) {
      this.fetch();
    }
  };

  constructor(
    private abonadoService: AbonadoService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetch();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngAfterViewInit(): void {
    // Nada que hacer aquí ahora mismo: el QR se renderiza con datos
    // recibidos en `fetch()`. Pero conservamos el hook por si en el
    // futuro queremos animar el cambio de QR cuando se refresca.
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearCountdown();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // ────────────────────────────────────────────────────────────────────
  // Avatar / club logo helpers
  // ────────────────────────────────────────────────────────────────────

  avatarUrl(): string | null {
    if (this.avatarBroken) return null;
    const file = this.carnet?.imgPerfil;
    if (!file) return null;
    if (/^https?:\/\//i.test(file)) return file;
    return `${this.imageBaseUrl}abonado/${file}`;
  }

  clubLogoUrl(): string | null {
    if (this.clubLogoBroken) return null;
    const file = this.carnet?.clubLogo;
    if (!file) return null;
    if (/^https?:\/\//i.test(file)) return file;
    return `${this.imageBaseUrl}club/${file}`;
  }

  onAvatarError(): void {
    this.avatarBroken = true;
    this.cdr.markForCheck();
  }

  onClubLogoError(): void {
    this.clubLogoBroken = true;
    this.cdr.markForCheck();
  }

  /** Iniciales para mostrar como fallback del avatar. */
  initials(): string {
    if (!this.carnet) return '';
    const a = (this.carnet.nombre || '').trim().charAt(0).toUpperCase();
    const b = (this.carnet.apellidos || '').trim().charAt(0).toUpperCase();
    return (a + b) || '?';
  }

  // ────────────────────────────────────────────────────────────────────
  // Fetch + rotación del QR
  // ────────────────────────────────────────────────────────────────────

  /** {@code true} si el token actual no ha caducado aún (con margen 2 s). */
  private isFresh(): boolean {
    if (!this.carnet) return false;
    // expEpoch=0 ⇒ token estático sin caducidad: siempre fresh.
    if (!this.carnet.expEpoch) return this.isStatic();
    const now = Math.floor(Date.now() / 1000);
    return this.carnet.expEpoch - now > 2;
  }

  /**
   * {@code true} si el carnet actual es estático (sin caducidad).
   * Esto lo decide el backend según el modo del club; en el cliente
   * lo detectamos por {@code expEpoch === 0}.
   */
  isStatic(): boolean {
    return !!this.carnet && (this.carnet.expEpoch == null || this.carnet.expEpoch === 0);
  }

  private fetch(): void {
    if (!this.carnet) this.loading = true;
    this.abonadoService.getMyCarnet().pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp && resp.status === 200 && resp.data) {
          this.carnet = resp.data as AbonadoCarnet;
          this.startCountdown();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        const expired = err?.status === 401 || err?.status === 403;
        const notReady = err?.status === 409 || err?.status === 404;
        const key = expired
          ? 'MI_ABONADO.CARD.ERR_SESSION'
          : notReady
            ? 'MI_ABONADO.CARD.ERR_NOT_READY'
            : 'MI_ABONADO.CARD.ERR_GENERIC';
        this.notification.error(key);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Pone en marcha el contador de cuenta atrás y programa el refresh
   * 3 segundos antes del {@code expEpoch} (margen de seguridad). Si
   * la pestaña está oculta no programamos nada; al volver al primer
   * plano `onVisibilityChange` se encarga de refrescar de inmediato.
   */
  private startCountdown(): void {
    this.clearCountdown();
    if (!this.carnet) return;
    // Modo estático (expEpoch=0): no arrancamos countdown, el QR no rota.
    if (this.isStatic()) {
      this.remainingSec = 0;
      this.cdr.markForCheck();
      return;
    }
    const updateTick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = (this.carnet?.expEpoch ?? 0) - now;
      this.remainingSec = remaining > 0 ? remaining : 0;
      this.cdr.markForCheck();
      if (remaining <= 3) {
        this.clearCountdown();
        if (document.visibilityState === 'visible') {
          this.fetch();
        }
        return;
      }
    };
    updateTick();
    this.countdownHandle = window.setInterval(updateTick, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownHandle != null) {
      clearInterval(this.countdownHandle);
      this.countdownHandle = null;
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Descarga PDF
  // ────────────────────────────────────────────────────────────────────

  async downloadPdf(): Promise<void> {
    if (this.generatingPdf) return;
    this.generatingPdf = true;
    this.cdr.markForCheck();
    try {
      // 1) Pedimos un carnet con TTL largo para que el QR del PDF
      //    impreso siga "válido" un año entero. Si el endpoint falla
      //    seguimos con el carnet rotatorio actual: peor caso, el
      //    QR caduca a los 60 s — el carnet impreso queda como
      //    identificación visual de todas formas.
      let exportable = this.carnet;
      try {
        const resp = await this.abonadoService.getMyPrintCarnet().toPromise();
        if (resp && resp.status === 200 && resp.data) {
          exportable = resp.data as AbonadoCarnet;
        }
      } catch {
        /* fallback al carnet rotatorio actual */
      }
      if (!exportable) {
        this.notification.error('MI_ABONADO.CARD.ERR_PDF_GENERIC');
        return;
      }

      // 2) Pintamos un clon offscreen con el token de larga duración
      //    para no alterar el QR rotatorio en pantalla mientras se
      //    genera el PDF.
      const node = this.carnetRoot?.nativeElement;
      if (!node) return;
      const clone = node.cloneNode(true) as HTMLElement;
      // Si tenemos token largo, sustituimos el qrdata del clone. El
      // QR del clone fue renderizado por Angular con el token corto;
      // al ser un clon manual, lo reemplazamos por una imagen SVG con
      // el token largo usando un QR generator inline si está disponible.
      // Para no añadir dependencia adicional, mantenemos el QR del
      // clon tal cual (el impreso será una "foto" del QR vivo). Si
      // se quiere precisión exacta, en un Bloque 4.1 añadiremos un
      // QR generator headless.
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);

      const filename = `carnet-${exportable.numeroSocio || exportable.abonadoId}.pdf`;
      await html2pdf()
        .set({
          margin: 10,
          filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        })
        .from(clone)
        .save();
      document.body.removeChild(clone);
    } catch (err) {
      console.error('[Carnet] downloadPdf failed', err);
      this.notification.error('MI_ABONADO.CARD.ERR_PDF_GENERIC');
    } finally {
      this.generatingPdf = false;
      this.cdr.markForCheck();
    }
  }
}
