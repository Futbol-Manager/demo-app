import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  AbonadoComunicacion,
  AbonadoDetailService,
  AbonadoExtendido,
} from 'src/app/core/services/abonado-detail/abonado-detail.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { Response } from 'src/app/core/services/models/response.model';

/**
 * Pestaña "Comunicaciones" del detalle de abonado (extraída de
 * {@code AbonadoDetailComponent} para aligerar el componente padre).
 *
 * El listado {@code comunicaciones} se comparte con el padre vía two-way
 * binding ({@code [(comunicaciones)]}): el padre lo conserva como caché
 * entre cambios de pestaña (para que el contador del tab siga visible y
 * no se repita la llamada HTTP al volver a entrar) y este hijo solo lo
 * recarga en {@code ngOnInit} cuando la caché está vacía — mismo lazy
 * load que hacía {@code setActiveTab}.
 */
@Component({
  selector: 'app-comunicaciones-tab',
  templateUrl: './comunicaciones-tab.component.html',
  styleUrls: ['./comunicaciones-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComunicacionesTabComponent implements OnInit, OnDestroy {
  @Input() abonadoId = 0;
  @Input() clubId = 0;
  /** Abonado cargado por el padre (por referencia, igual que antes). */
  @Input() abonado: AbonadoExtendido | null = null;

  /** Comunicaciones enviadas (caché compartida con el padre). */
  @Input() comunicaciones: AbonadoComunicacion[] = [];
  @Output() comunicacionesChange = new EventEmitter<AbonadoComunicacion[]>();

  comunicacionesLoading = false;
  showSendModal = false;
  sendCanal: 'EMAIL' | 'PUSH' | 'EMAIL_PUSH' | 'SMS' = 'EMAIL';
  sendAsunto = '';
  sendCuerpo = '';
  sending = false;

  /** Plantillas rápidas (welcome, reminder...) que prellenan asunto+cuerpo. */
  readonly templates: { key: string; asuntoKey: string; cuerpoKey: string }[] = [
    {
      key: 'WELCOME',
      asuntoKey: 'SUBS.DETAIL.COM.TEMPLATES.WELCOME_SUBJECT',
      cuerpoKey: 'SUBS.DETAIL.COM.TEMPLATES.WELCOME_BODY',
    },
    {
      key: 'REMINDER',
      asuntoKey: 'SUBS.DETAIL.COM.TEMPLATES.REMINDER_SUBJECT',
      cuerpoKey: 'SUBS.DETAIL.COM.TEMPLATES.REMINDER_BODY',
    },
    {
      key: 'EVENT',
      asuntoKey: 'SUBS.DETAIL.COM.TEMPLATES.EVENT_SUBJECT',
      cuerpoKey: 'SUBS.DETAIL.COM.TEMPLATES.EVENT_BODY',
    },
  ];

  private subs = new Subscription();

  constructor(
    private cdr: ChangeDetectorRef,
    private detailService: AbonadoDetailService,
    private notification: NotificationService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    // Lazy load de la pestaña: misma guarda que tenía `setActiveTab`
    // en el padre.
    if (this.comunicaciones.length === 0 && !this.comunicacionesLoading) {
      this.loadComunicaciones();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadComunicaciones(): void {
    if (!this.abonadoId) return;
    this.comunicacionesLoading = true;
    this.subs.add(
      this.detailService.listComunicaciones(this.abonadoId).subscribe({
        next: (resp: Response) => {
          this.comunicaciones = (resp?.data as AbonadoComunicacion[]) || [];
          this.comunicacionesChange.emit(this.comunicaciones);
          this.comunicacionesLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.comunicacionesLoading = false;
          this.notification.error('SUBS.DETAIL.COM.LOAD_ERROR');
          this.cdr.markForCheck();
        },
      }),
    );
  }

  openSendModal(): void {
    this.sendCanal = 'EMAIL';
    this.sendAsunto = '';
    this.sendCuerpo = '';
    this.showSendModal = true;
    this.cdr.markForCheck();
  }

  closeSendModal(): void {
    this.showSendModal = false;
    this.cdr.markForCheck();
  }

  applyTemplate(tplKey: string): void {
    const tpl = this.templates.find(t => t.key === tplKey);
    if (!tpl) return;
    const clubName = ''; // (futuro: cargar nombre del club si se necesita)
    const fullName = `${this.abonado?.nombre || ''} ${this.abonado?.apellidos || ''}`.trim();
    const params = { name: fullName, club: clubName };
    this.sendAsunto = this.translate.instant(tpl.asuntoKey, params);
    this.sendCuerpo = this.translate.instant(tpl.cuerpoKey, params);
    this.cdr.markForCheck();
  }

  send(): void {
    if (!this.sendAsunto?.trim() || !this.sendCuerpo?.trim()) {
      this.notification.error('SUBS.DETAIL.COM.MISSING_FIELDS');
      return;
    }
    if (this.sendCanal === 'EMAIL' && (!this.abonado?.mail || !this.abonado.mail.trim())) {
      this.notification.error('SUBS.DETAIL.COM.NO_EMAIL');
      return;
    }
    if ((this.sendCanal === 'PUSH' || this.sendCanal === 'EMAIL_PUSH') && !this.abonado?.userId) {
      // El backend lo bloquea igualmente, pero damos feedback inmediato.
      this.notification.error('SUBS.DETAIL.COM.PUSH_NEEDS_ACCOUNT');
      return;
    }
    this.sending = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.detailService
        .sendComunicacion(this.abonadoId, this.clubId, this.sendCanal, this.sendAsunto, this.sendCuerpo, null)
        .subscribe({
          next: (resp: Response) => {
            this.sending = false;
            const com = resp?.data as AbonadoComunicacion;
            if (com) {
              this.comunicaciones = [com, ...this.comunicaciones];
              this.comunicacionesChange.emit(this.comunicaciones);
            }
            // status 202 → backend dice intento pero no enviado (p.ej. PUSH no soportado).
            if (resp?.status === 202) {
              this.notification.error('SUBS.DETAIL.COM.NOT_DELIVERED');
            } else {
              this.notification.success('SUBS.DETAIL.COM.SENT');
            }
            this.showSendModal = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.sending = false;
            this.notification.error('SUBS.DETAIL.COM.SEND_ERROR');
            this.cdr.markForCheck();
          },
        }),
    );
  }

  getCanalIcon(canal: string | undefined): string {
    if (canal === 'PUSH') return '🔔';
    if (canal === 'SMS') return '💬';
    return '✉️';
  }

  getCanalCss(canal: string | undefined): string {
    if (canal === 'PUSH') return 'tl-channel--push';
    if (canal === 'SMS') return 'tl-channel--sms';
    return 'tl-channel--email';
  }

  getEstadoCom(estado: string | undefined): string {
    if (estado === 'SENT') return 'SUBS.DETAIL.COM.STATE.SENT';
    if (estado === 'FAILED') return 'SUBS.DETAIL.COM.STATE.FAILED';
    if (estado === 'QUEUED') return 'SUBS.DETAIL.COM.STATE.QUEUED';
    return estado || '';
  }

  getEstadoComCss(estado: string | undefined): string {
    if (estado === 'SENT') return 'state-pill--ok';
    if (estado === 'FAILED') return 'state-pill--ko';
    if (estado === 'QUEUED') return 'state-pill--pending';
    return 'state-pill--neutral';
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
