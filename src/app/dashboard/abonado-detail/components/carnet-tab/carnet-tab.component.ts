import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { QRCodeComponent } from 'angularx-qrcode';
import {
  AbonadoCarnet,
  AbonadoDetailService,
  AbonadoPerkCanje,
  ClubPerk,
} from 'src/app/core/services/abonado-detail/abonado-detail.service';
import { Response } from 'src/app/core/services/models/response.model';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { environment } from 'src/environments/environment';

/**
 * Pestaña "Carnet" del detalle de abonado (extraída de
 * {@code AbonadoDetailComponent} para aligerar el componente padre).
 *
 * Se crea con el {@code *ngIf} de la pestaña activa, por lo que su
 * {@code ngOnInit} replica la carga que antes hacía
 * {@code setActiveTab('carnet')}: recarga el carnet en cada entrada a la
 * pestaña (para reflejar cambios recientes de foto, número de socio o
 * estado) y, solo si el bloque de Beneficios está visible
 * ({@link showPerks}), perks + canjes.
 *
 * El padre actualiza la foto del carnet tras subir un avatar desde la
 * cabecera invocando {@link applyUploadedPhoto} vía {@code @ViewChild}.
 */
@Component({
  selector: 'app-carnet-tab',
  templateUrl: './carnet-tab.component.html',
  styleUrls: ['./carnet-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarnetTabComponent implements OnInit, OnDestroy {
  @Input() abonadoId = 0;

  // -------- Pestaña Carnet + Beneficios (PR4) --------
  carnet: AbonadoCarnet | null = null;
  carnetLoading = false;

  perks: ClubPerk[] = [];
  perksLoading = false;
  /** Canjes ya realizados por este socio (para histórico debajo del carnet). */
  perkCanjes: AbonadoPerkCanje[] = [];

  /**
   * Feature flag para mostrar/ocultar el bloque de Beneficios y su
   * histórico de canjes en la pestaña del carnet. Decisión de producto
   * (2026-05-17): se oculta temporalmente hasta que se decida la forma
   * final del módulo. Toda la lógica (carga de perks, canjes, modal)
   * sigue intacta para reactivarlo con un solo cambio de `false` → `true`.
   */
  readonly showPerks = false;

  /** Modal de confirmación de canje. */
  showCanjeModal = false;
  canjeSelectedPerk: ClubPerk | null = null;
  canjeNota = '';
  canjeSaving = false;

  /**
   * Bandera de error de carga de la foto del abonado en el carnet. Si la
   * imagen no carga (404, CORS, etc.) caemos al avatar con iniciales.
   */
  carnetAvatarBroken = false;
  /** Bandera de error de carga del logo del club en el carnet. */
  carnetClubLogoBroken = false;

  private subs = new Subscription();

  constructor(
    private cdr: ChangeDetectorRef,
    private detailService: AbonadoDetailService,
    private notification: NotificationService,
    private translate: TranslateService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    // El carnet usa un QR fijo (no caduca), pero recargamos al
    // entrar para reflejar cambios recientes (foto, número socio,
    // estado del abonado).
    this.loadCarnet();
    // Perks/canjes solo si el bloque está visible. Evita llamadas
    // innecesarias mientras el módulo de Beneficios está oculto.
    if (this.showPerks) {
      this.loadPerks();
      this.loadCanjes();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /**
   * Hook para el padre: tras subir una foto nueva desde la cabecera del
   * detalle, el padre nos pasa el filename para refrescar la copia del
   * carnet (mismo efecto que tenía el handler único cuando todo vivía
   * en el mismo componente).
   */
  applyUploadedPhoto(filename: string): void {
    if (this.carnet) {
      this.carnet.imgPerfil = filename;
      this.carnetAvatarBroken = false;
    }
    this.cdr.markForCheck();
  }

  loadCarnet(): void {
    if (!this.abonadoId) return;
    this.carnetLoading = true;
    // Reseteamos las banderas de imágenes rotas para reintentar la carga
    // tras un refresh o cambio de abonado.
    this.carnetAvatarBroken = false;
    this.carnetClubLogoBroken = false;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService.getCarnet(this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.carnet = (resp?.data as AbonadoCarnet) || null;
          this.carnetLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.carnetLoading = false;
          this.notification.error('SUBS.DETAIL.CARD.LOAD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  loadPerks(): void {
    if (!this.abonadoId) return;
    this.perksLoading = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService.listAbonadoPerks(this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.perks = (resp?.data as ClubPerk[]) || [];
          this.perksLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.perksLoading = false;
          this.cdr.markForCheck();
        },
      }),
    );
  }

  loadCanjes(): void {
    if (!this.abonadoId) return;
    this.subs.add(
      this.detailService.listAbonadoCanjes(this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.perkCanjes = (resp?.data as AbonadoPerkCanje[]) || [];
          this.cdr.markForCheck();
        },
      }),
    );
  }

  // Decisión de producto (2026-05-17): el carnet usa un QR fijo, así
  // que ya no hay countdown ni renovación automática. Se eliminaron
  // `startCarnetCountdown()` y `formatCountdown()`. La validez real del
  // socio se comprueba en el scanner del club consultando el estado en
  // BD (no por caducidad del token).

  /**
   * Descarga el carnet como PNG con la siguiente composición vertical:
   *
   * <pre>
   *   ┌────────────────────────────────┐
   *   │  CLUB NAME                     │   header
   *   │  Carnet de socio               │
   *   ├────────────────────────────────┤
   *   │       ╭─────╮                  │
   *   │       │ FOTO │                  │   foto circular del socio
   *   │       ╰─────╯                  │   (fallback: iniciales)
   *   ├────────────────────────────────┤
   *   │  Nombre Apellidos              │
   *   │  Nº socio: SOC-2026-001        │
   *   │  ┌─────────┐                   │
   *   │  │   QR    │                   │
   *   │  └─────────┘                   │
   *   │  Muestra este QR en el control │
   *   └────────────────────────────────┘
   * </pre>
   *
   * <p>La foto se carga con {@code crossOrigin='anonymous'} para evitar
   * que el canvas quede "tainted" al exportar con {@code toDataURL}. Si
   * el servidor de imágenes no envía CORS o la foto falla, caemos al
   * fallback de iniciales sin romper la descarga.</p>
   *
   * <p>Sin dependencias externas (no html2canvas).</p>
   */
  downloadCarnet(): void {
    if (!this.carnet) return;
    const W = 720;
    const H = 1140;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo gradient navy → green (mismos colores Sphaira)
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#002c40');
    grad.addColorStop(1, '#31b270');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Tarjeta blanca interior
    const pad = 40;
    ctx.fillStyle = '#ffffff';
    this.roundedRect(ctx, pad, pad, W - 2 * pad, H - 2 * pad, 28);
    ctx.fill();

    // Header: nombre del club + label "Carnet de socio"
    ctx.fillStyle = '#002c40';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.carnet.clubName || 'SPHAIRA', W / 2, 110);

    ctx.fillStyle = '#31b270';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    const memberTitle = (this.translate.instant('SUBS.DETAIL.CARD.MEMBER_TITLE') || '')
      .toString().toUpperCase();
    ctx.fillText(memberTitle, W / 2, 138);

    // Capturamos el SVG del QR que la lib ya pintó en pantalla. Lo
    // serializamos y lo pasamos por un Image() para poder dibujarlo
    // como bitmap dentro del canvas.
    const qrSvg = document.querySelector('.sph-carnet-qr svg') as SVGElement | null;
    const fotoUrl = this.carnetAvatarUrl();

    let photoImg: HTMLImageElement | null = null;
    let qrImg: HTMLImageElement | null = null;
    let pending = 0;
    let revokeQrUrl: (() => void) | null = null;

    const tryFinish = () => {
      if (pending > 0) return;
      try {
        this.drawCarnetBody(ctx, W, H, photoImg, qrImg);
        const fname = `carnet-${this.carnet?.numeroSocio || this.carnet?.abonadoId}.png`;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = fname;
        link.click();
      } catch (e) {
        // Tainted canvas (CORS): reintenta sin foto y avisa al usuario.
        // Es raro porque las imágenes están en el mismo servidor que el
        // backend con CORS configurado, pero por si acaso protegemos.
        if (photoImg) {
          photoImg = null;
          this.drawCarnetBody(ctx, W, H, null, qrImg);
          try {
            const fname = `carnet-${this.carnet?.numeroSocio || this.carnet?.abonadoId}.png`;
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = fname;
            link.click();
          } catch (_) {
            this.notification.error('SUBS.DETAIL.CARD.LOAD_ERROR');
          }
        } else {
          this.notification.error('SUBS.DETAIL.CARD.LOAD_ERROR');
        }
      } finally {
        if (revokeQrUrl) revokeQrUrl();
      }
    };

    if (fotoUrl) {
      pending++;
      // El servidor de imágenes estático (Tomcat) NO envía cabeceras
      // CORS, así que cargar `fotoUrl` directamente con
      // crossOrigin='anonymous' falla siempre y contaminaría el canvas
      // sin él. Pasamos por el proxy `/rest/commons/download-image`
      // del backend Spring, que sí tiene CORS configurado globalmente
      // (`GlobalCorsConfigController`).
      //
      // Usamos `HttpClient` (no `fetch` nativo) porque el interceptor
      // de Angular añade automáticamente el header `Authorization:
      // Bearer ...` con el JWT del usuario logueado. Sin él la
      // petición pasaría como anónima y aunque el endpoint está en
      // `permitAll`, otros checks intermedios (rate limit, CORS
      // strict) pueden bloquearla con 403. Con HttpClient la
      // respuesta es un Blob que pasamos a ObjectURL (same-origin
      // `blob:`), así el canvas no se contamina y `toDataURL` siempre
      // funciona.
      const proxyUrl = environment.apiUrl + 'commons/download-image?url='
        + encodeURIComponent(fotoUrl);
      this.subs.add(
        this.http.get(proxyUrl, { responseType: 'blob' }).subscribe({
          next: (blob: Blob) => {
            const objUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              photoImg = img;
              URL.revokeObjectURL(objUrl);
              pending--;
              tryFinish();
            };
            img.onerror = () => {
              // eslint-disable-next-line no-console
              console.warn('[carnet PNG] Image decode failed for foto');
              URL.revokeObjectURL(objUrl);
              pending--;
              tryFinish();
            };
            img.src = objUrl;
          },
          error: (err) => {
            // eslint-disable-next-line no-console
            console.warn('[carnet PNG] No se pudo cargar la foto vía proxy:',
              err?.status, err?.message, '→', proxyUrl);
            pending--;
            tryFinish();
          },
        }),
      );
    }
    if (qrSvg) {
      pending++;
      const svgString = new XMLSerializer().serializeToString(qrSvg);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      revokeQrUrl = () => URL.revokeObjectURL(url);
      const img = new Image();
      img.onload = () => { qrImg = img; pending--; tryFinish(); };
      img.onerror = () => { pending--; tryFinish(); };
      img.src = url;
    }
    if (pending === 0) {
      // Ni foto ni QR: pintamos lo que haya y descargamos igualmente.
      tryFinish();
    }
  }

  /**
   * Dibuja la zona central del carnet (foto + nombre + Nº socio + QR +
   * hint). Separado de {@link downloadCarnet} para poder reusarlo en
   * el camino de error sin volver a programar el layout.
   */
  private drawCarnetBody(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    photoImg: HTMLImageElement | null,
    qrImg: HTMLImageElement | null,
  ): void {
    // ── Foto circular del socio (o iniciales) ────────────────────
    const photoCx = W / 2;
    const photoCy = 290;
    const photoR = 105;
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (photoImg) {
      // cover: escalamos manteniendo aspect ratio para que cubra todo
      // el círculo recortando lo que sobre por arriba/abajo o
      // izquierda/derecha.
      const ratio = Math.max((2 * photoR) / photoImg.width, (2 * photoR) / photoImg.height);
      const dw = photoImg.width * ratio;
      const dh = photoImg.height * ratio;
      ctx.drawImage(photoImg, photoCx - dw / 2, photoCy - dh / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(
        photoCx - photoR, photoCy - photoR, photoCx + photoR, photoCy + photoR,
      );
      g.addColorStop(0, '#c4e8d6');
      g.addColorStop(1, '#e8eef1');
      ctx.fillStyle = g;
      ctx.fillRect(photoCx - photoR, photoCy - photoR, 2 * photoR, 2 * photoR);
      ctx.fillStyle = '#002c40';
      ctx.font = 'bold 70px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.getCarnetInitials(), photoCx, photoCy);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    // Aro verde alrededor de la foto (marca Sphaira).
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#31b270';
    ctx.lineWidth = 4;
    ctx.stroke();

    // ── Nombre + Nº socio ────────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.fillStyle = '#002c40';
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    const fullName = `${this.carnet?.nombre || ''} ${this.carnet?.apellidos || ''}`.trim();
    ctx.fillText(fullName, W / 2, 460);

    ctx.fillStyle = '#636363';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    const numText = this.translate.instant('SUBS.DETAIL.CARD.NUMBER')
      + ': ' + (this.carnet?.numeroSocio || '—');
    ctx.fillText(numText, W / 2, 492);

    // ── QR ───────────────────────────────────────────────────────
    if (qrImg) {
      const qrSize = 360;
      const qrX = (W - qrSize) / 2;
      const qrY = 525;
      // Marco blanco con sombra suave alrededor del QR para que se vea
      // separado del fondo de la tarjeta.
      ctx.fillStyle = '#ffffff';
      this.roundedRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 16);
      ctx.fill();
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }

    // ── Hint al pie ──────────────────────────────────────────────
    ctx.fillStyle = '#636363';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(this.translate.instant('SUBS.DETAIL.CARD.SCAN_HINT'), W / 2, H - 90);
  }

  /** Helper para dibujar rectángulos con esquinas redondeadas en canvas. */
  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number,
      w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // -------- Beneficios: canje --------

  openCanjeModal(perk: ClubPerk): void {
    if (!perk.canCanjear) {
      this.notification.error('SUBS.DETAIL.PERKS.LIMIT_REACHED');
      return;
    }
    this.canjeSelectedPerk = perk;
    this.canjeNota = '';
    this.showCanjeModal = true;
    this.cdr.markForCheck();
  }

  closeCanjeModal(): void {
    this.showCanjeModal = false;
    this.canjeSelectedPerk = null;
    this.canjeNota = '';
    this.cdr.markForCheck();
  }

  confirmCanje(): void {
    if (!this.canjeSelectedPerk) return;
    const perkId = this.canjeSelectedPerk.perkId;
    this.canjeSaving = true;
    this.cdr.markForCheck();
    const userId = Number(localStorage.getItem('userId')) || null;
    this.subs.add(
      this.detailService.canjearPerk(this.abonadoId, perkId, userId, this.canjeNota).subscribe({
        next: () => {
          this.canjeSaving = false;
          this.notification.success('SUBS.DETAIL.PERKS.CANJE_OK');
          this.showCanjeModal = false;
          this.canjeSelectedPerk = null;
          // Refrescamos perks (para actualizar contador) y canjes históricos.
          this.loadPerks();
          this.loadCanjes();
          this.cdr.markForCheck();
        },
        error: () => {
          this.canjeSaving = false;
          this.notification.error('SUBS.DETAIL.PERKS.CANJE_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  /** True si el icono del perk es un emoji (1 carácter no-ASCII). */
  isEmojiIcon(icono: string): boolean {
    if (!icono) return false;
    return !icono.startsWith('fa-') && !icono.startsWith('bi-');
  }

  /** Color del badge de estado del socio para el carnet. */
  getCarnetEstadoLabel(estado: number | undefined): string {
    if (estado === 1) return 'SUBS.SUBSCRIBER_STATUS.ACTIVE';
    if (estado === 2) return 'SUBS.SUBSCRIBER_STATUS.PENDING';
    return 'SUBS.SUBSCRIBER_STATUS.INACTIVE';
  }

  getCarnetEstadoCss(estado: number | undefined): string {
    if (estado === 1) return 'status-pill--success';
    if (estado === 2) return 'status-pill--pending';
    return 'status-pill--danger';
  }

  // ─── Helpers de imágenes del carnet (PR4 rediseño horizontal) ───

  /**
   * Resuelve la URL real de la foto del abonado para el carnet del club.
   * Acepta URLs absolutas (https://...) o filenames servidos vía la CDN
   * de imágenes configurada en `environment.images`.
   */
  carnetAvatarUrl(): string | null {
    if (this.carnetAvatarBroken || !this.carnet) return null;
    const file = this.carnet.imgPerfil;
    if (!file) return null;
    if (/^https?:\/\//i.test(file)) return file;
    return `${environment.images}abonado/${file}`;
  }

  /**
   * Resuelve la URL del logo del club siguiendo la misma estrategia.
   *
   * Los logos del club están servidos físicamente en `/images/user/`
   * (no en `/images/club/`) — convención heredada del backend, donde
   * la carpeta `user/` se usa tanto para fotos de usuarios reales como
   * para logos de clubes y avatares de jugadores. El backend devuelve
   * solo el filename en {@code carnet.clubLogo} (ej. `61442645-imguser.jpg`)
   * y aquí lo prefijamos con la ruta correcta. Si llegase ya como URL
   * absoluta (futuras integraciones), se respeta tal cual.
   */
  carnetClubLogoUrl(): string | null {
    if (this.carnetClubLogoBroken || !this.carnet) return null;
    const file = this.carnet.clubLogo;
    if (!file) return null;
    if (/^https?:\/\//i.test(file)) return file;
    return `${environment.images}user/${file}`;
  }

  onCarnetAvatarError(): void {
    this.carnetAvatarBroken = true;
    this.cdr.markForCheck();
  }

  onCarnetClubLogoError(): void {
    this.carnetClubLogoBroken = true;
    this.cdr.markForCheck();
  }

  /** Iniciales del abonado para usar como fallback del avatar en el carnet. */
  getCarnetInitials(): string {
    if (!this.carnet) return '?';
    const n = (this.carnet.nombre || '').trim().charAt(0).toUpperCase();
    const a = (this.carnet.apellidos || '').trim().charAt(0).toUpperCase();
    return (n + a) || '?';
  }

  /**
   * Iniciales del club para usar como fallback del logo en el carnet
   * cuando {@code clubLogo} no existe o devuelve 404. Toma la primera
   * letra de cada palabra (ignorando preposiciones cortas «de», «del»,
   * «la», «las», «los», «e», «y») hasta un máximo de 3 letras para que
   * encaje en un círculo de 28-44 px.
   *
   * Ejemplos:
   *  - "Casino Mercantil e Industrial de Pontevedra" → "CMI"
   *  - "Real Madrid CF" → "RMC"
   *  - "Sphaira" → "SP"
   */
  getClubInitials(): string {
    const name = (this.carnet?.clubName || '').trim();
    if (!name) return 'SP';
    const stopWords = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'e', 'y', 'i']);
    const parts = name
      .split(/\s+/)
      .filter(w => w.length > 0 && !stopWords.has(w.toLowerCase()));
    const initials = parts
      .slice(0, 3)
      .map(w => w.charAt(0).toUpperCase())
      .join('');
    return initials || name.charAt(0).toUpperCase();
  }

  formatDate(value: string | undefined | null): string {
    if (!value) return '';
    // El backend devuelve "yyyy-MM-dd". Lo convertimos a "dd/MM/yyyy" para
    // mostrar al usuario sin tener que tirar de moment/date-fns en este
    // componente puntual.
    const parts = value.substring(0, 10).split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
}
