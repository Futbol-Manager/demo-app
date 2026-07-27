import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

import { Response } from 'src/app/core/services/models/response.model';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import {
  AbonadoDetailService,
  CarnetValidationResult,
  ClubPerk,
} from 'src/app/core/services/abonado-detail/abonado-detail.service';

/**
 * Pantalla del validador del club (staff). Abre la cámara del
 * dispositivo, detecta el QR del carnet de un socio y muestra:
 *
 * <ol>
 *   <li>Estado de validez (firma + caducidad del token).</li>
 *   <li>Ficha mínima del socio (foto, nombre, estado, nº socio).</li>
 *   <li>Beneficios canjeables. Cada perk se puede canjear con un click.</li>
 * </ol>
 *
 * <p>Se libera la cámara al destruir el componente, y se pausa la
 * detección durante el modal de canje para evitar disparar
 * validaciones en bucle si el QR sigue en la imagen.</p>
 */
@Component({
  selector: 'app-scan-carnet',
  templateUrl: './scan-carnet.component.html',
  styleUrls: ['./scan-carnet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanCarnetComponent implements AfterViewInit, OnDestroy {

  @ViewChild('qrReader', { static: true }) qrReader!: ElementRef<HTMLDivElement>;

  scanner: Html5Qrcode | null = null;
  scanning = false;
  scanError: string | null = null;

  /** Resultado de la última validación. */
  result: CarnetValidationResult | null = null;
  validating = false;

  /** Token "escaneado por última vez" para no disparar la misma validación seguida. */
  private lastToken: string | null = null;

  /** Estado del modal de canje desde el resultado. */
  selectedPerk: ClubPerk | null = null;
  redeemNota = '';
  redeeming = false;

  /** True si la cámara está pausada temporalmente (por modal abierto). */
  paused = false;

  constructor(
    private detailService: AbonadoDetailService,
    private notification: NotificationService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.startScanner();
  }

  async ngOnDestroy(): Promise<void> {
    await this.stopScanner();
  }

  /* ─────────────── Scanner control ─────────────── */

  async startScanner(): Promise<void> {
    this.scanError = null;
    try {
      // Reseteamos cualquier instancia previa (por si el usuario pulsa
      // "reintentar" después de un error).
      if (this.scanner) {
        await this.stopScanner();
      }
      this.scanner = new Html5Qrcode(this.qrReader.nativeElement.id);
      await this.scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => this.onQrDecoded(decodedText),
        () => { /* parse error en frame puntual, lo ignoramos */ },
      );
      this.scanning = true;
      this.cdr.markForCheck();
    } catch (e: any) {
      this.scanning = false;
      this.scanError = e?.message || 'SCAN.ERROR_CAMERA';
      this.cdr.markForCheck();
    }
  }

  async stopScanner(): Promise<void> {
    if (!this.scanner) return;
    try {
      if (this.scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        await this.scanner.stop();
      }
      this.scanner.clear();
    } catch {
      // El usuario puede haber cambiado de tab antes de que el escáner
      // arranque; en ese caso .stop() lanza. Lo ignoramos.
    }
    this.scanner = null;
    this.scanning = false;
  }

  private onQrDecoded(token: string): void {
    if (!token || token === this.lastToken || this.validating || this.paused) return;
    this.lastToken = token;
    this.validating = true;
    this.cdr.markForCheck();
    this.detailService.validateCarnet(token).subscribe({
      next: (resp: Response) => {
        this.validating = false;
        this.result = (resp?.data as CarnetValidationResult) || null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.validating = false;
        this.notification.error('SCAN.ERROR_VALIDATE');
        this.cdr.markForCheck();
      },
    });
  }

  /** Reset del resultado para volver a escanear otro carnet. */
  resetScan(): void {
    this.lastToken = null;
    this.result = null;
    this.cdr.markForCheck();
  }

  /* ─────────────── Canje desde el validador ─────────────── */

  openRedeem(perk: ClubPerk): void {
    if (!perk.canCanjear) return;
    this.selectedPerk = perk;
    this.redeemNota = '';
    this.paused = true;
    this.cdr.markForCheck();
  }

  cancelRedeem(): void {
    this.selectedPerk = null;
    this.paused = false;
    this.cdr.markForCheck();
  }

  confirmRedeem(): void {
    if (!this.selectedPerk || !this.result?.abonado) return;
    this.redeeming = true;
    this.cdr.markForCheck();
    const userId = Number(localStorage.getItem('userId')) || null;
    this.detailService.canjearPerk(
      this.result.abonado.abonadoId,
      this.selectedPerk.perkId,
      userId,
      this.redeemNota,
    ).subscribe({
      next: () => {
        this.redeeming = false;
        this.notification.success('SUBS.DETAIL.PERKS.CANJE_OK');
        // Actualizamos el contador del perk localmente para no volver a
        // pegar al backend; basta con incrementar usados y recalcular
        // canCanjear y canjesRestantes.
        if (this.result && this.selectedPerk) {
          const perk = this.result.perks.find(p => p.perkId === this.selectedPerk!.perkId);
          if (perk) {
            perk.canjesUsados++;
            if (perk.maxCanjesPorSocio !== null) {
              perk.canjesRestantes = Math.max(0, perk.maxCanjesPorSocio - perk.canjesUsados);
              perk.canCanjear = perk.canjesRestantes > 0;
            }
          }
        }
        this.selectedPerk = null;
        this.paused = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.redeeming = false;
        this.notification.error('SUBS.DETAIL.PERKS.CANJE_ERROR');
        this.cdr.markForCheck();
      },
    });
  }

  /* ─────────────── Helpers UI ─────────────── */

  isEmojiIcon(icono: string | undefined): boolean {
    if (!icono) return false;
    return !icono.startsWith('fa-') && !icono.startsWith('bi-');
  }

  getInitials(): string {
    const a = this.result?.abonado;
    if (!a) return '?';
    return `${(a.nombre?.[0] || '').toUpperCase()}${(a.apellidos?.[0] || '').toUpperCase()}` || '?';
  }

  /** Etiqueta i18n para el motivo de invalidez del token. */
  getReasonLabel(): string {
    if (!this.result?.reason) return 'SCAN.INVALID_GENERIC';
    switch (this.result.reason) {
      case 'EXPIRED':     return 'SCAN.EXPIRED';
      case 'INVALID_SIG': return 'SCAN.INVALID_SIG';
      case 'MALFORMED':   return 'SCAN.MALFORMED';
      case 'NOT_FOUND':   return 'SCAN.NOT_FOUND';
      case 'WRONG_CLUB':  return 'SCAN.WRONG_CLUB';
      default:            return 'SCAN.INVALID_GENERIC';
    }
  }

  getEstadoLabel(estado: number | undefined): string {
    if (estado === 1) return 'SUBS.SUBSCRIBER_STATUS.ACTIVE';
    if (estado === 2) return 'SUBS.SUBSCRIBER_STATUS.PENDING';
    return 'SUBS.SUBSCRIBER_STATUS.INACTIVE';
  }

  getEstadoCss(estado: number | undefined): string {
    if (estado === 1) return 'status-pill--success';
    if (estado === 2) return 'status-pill--pending';
    return 'status-pill--danger';
  }
}
