import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { FormBuilder, FormGroup } from '@angular/forms';
import { loadStripe } from '@stripe/stripe-js';
import { Location } from '@angular/common';
import { PlayerService } from 'src/app/core/services/player/player.service';

import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';
import { ClubService } from 'src/app/core/services/club/club.service';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

@Component({
  selector: 'app-cuotas',
  templateUrl: './cuotas.component.html',
  styleUrls: ['./cuotas.component.scss']
})
export class CuotasComponent implements OnInit {

  datosCargados: boolean = false;
  teamId!: number;
  cuota: any;

  playerIdUserActual: any = 0;
  usuarioActual!: User | null;

  showModalStripe = false;
  paymentForm!: FormGroup;
  stripe: any;
  card: any;
  loading = false;
  amount: number = 0;
  historyCuotasPlayer: any = {};
  playerId = 0;

  selectedText: string = '';
  banco = '';
  nameClub = '';
  stripeId = '';
  asunto = '';
  clubId = 0;
  contacto = '';
  bizum = 0;
  pagado = '0';
  pdte = '0';
  pagarOk = false;
  cantidadAPagar = 0;
  cuotasObligatorias: any[] = [];
  cuotasNoObligatorias: any[] = [];
  userId = 0;
  restante: number = 0;
  restanteCero: boolean = false;
  cuotas: any[] = [];
  temporadaStoredValue = getCurrentSeasonString();

  listAllCuotas: any[] = [];
  listCuotasLoading = false;

  stripeFeePct = 0;
  stripeFeeFix = 0;
  stripePct = 0;
  feeConfigLoaded = false;
  pagoClubIdSelected = 0;
  importeSelected = '';
  stripeBtoShow = false;

  selectedCuota: any = null; // { tipoPagoStripe: 0|1, stripePriceId?: string, pagoClubId?: number, ... }
  infoRecurrente = '';
  acceptedTerms = false;

  // “Hola <b>mundo</b>” en base64
  terminos: string = 'SG9sYSA8Yj5tdW5kbzwvYj4=';

  terminosHtmlSafe!: SafeHtml;

  savedCards: any[] = [];
  savedCardsLoading = false;
  showSaveCardSection = false;
  saveCardLoading = false;
  cardAuthAccepted = false;
  saveCard: any = null;
  saveCardError = '';
  saveCardSuccess = '';

  showModalTarjetas = false;

  showLinkAllPlayersDialog = false;
  pendingSetupIntentId: string | null = null;

  showDeleteCardDialog = false;
  cardToDelete: any = null;
  deleteCardLoading = false;
  deleteCardError = '';

  // --- Desistimiento de cuota ---
  showCancelCuotaDialog = false;
  cuotaToCancel: any = null;
  cancelCuotaLoading = false;
  cancelCuotaReason = '';
  cancelCuotaError = '';
  cancelCuotaSuccess = '';

  paymentMessage = '';
  paymentMessageType: 'success' | 'error' | 'info' = 'info';

  showPaymentFeedback(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    this.paymentMessage = msg;
    this.paymentMessageType = type;
    if (type === 'success') {
      setTimeout(() => { this.paymentMessage = ''; }, 5000);
    }
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private loginService: LoginService,
    private playerService: PlayerService,
    private fb: FormBuilder,
    private clubService: ClubService,
    private location: Location,
    private sanitizer: DomSanitizer) {
  }

  async ngOnInit(): Promise<void> {
    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }
    this.paymentForm = this.fb.group({
      amount: ['']
    });

    this.stripe = await loadStripe(environment.stripePublicKey);
    this.loadFeeConfig();
    const elements = this.stripe.elements();
    this.card = elements.create('card');
    this.card.mount('#card-element');

    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user!.userId;
      //this.playerIdUserActual = user?.playerId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de teamId de los parámetros
        this.teamId = +params['teamId'];  // El + convierte el valor a número
        this.playerId = +params['playerId'];  // El + convierte el valor a número
        this.playerIdUserActual = this.playerId;
        console.log('teamId:', this.teamId);
        console.log('playerId:', this.playerId);
        console.log('userId:', this.userId);
      });

      this.loadCuotasData();
    });
  }

  loadCuotasData(): void {
    this.playerService.getPagoCuotasPlayer(this.teamId, this.playerId).subscribe(
      (response: Response) => {
        if (response.data !== null) {
          this.historyCuotasPlayer = response.data;
          this.pagado = this.historyCuotasPlayer.totalPagado;
          this.pdte = this.historyCuotasPlayer.pendiente;
          this.cuotasObligatorias   = (this.historyCuotasPlayer.obligatorios   || []).filter((c: any) => !c.desistido);
          this.cuotasNoObligatorias = (this.historyCuotasPlayer.noObligatorios || []).filter((c: any) => !c.desistido);
          this.stripeBtoShow = !!(this.historyCuotasPlayer.stripeId);
          this.stripeId = this.historyCuotasPlayer.stripeId;
          this.banco = this.historyCuotasPlayer.banco;
          this.nameClub = this.historyCuotasPlayer.nameClub;
          this.clubId = this.historyCuotasPlayer.clubId;
          this.asunto = this.historyCuotasPlayer.asunto;
          this.contacto = this.historyCuotasPlayer.contacto;
          this.bizum = this.historyCuotasPlayer.bizum;
          this.terminos = this.historyCuotasPlayer.terminos;
          this.decodeAndSanitizeTerminos();
          if (this.historyCuotasPlayer.clubId == 83) this.stripeBtoShow = false;
          this.datosCargados = true;
        }
      },
      (error) => { console.error('Error al cargar cuotas', error); }
    );
  }

  loadFeeConfig(): void {
    this.teamService.getFeeConfig().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.stripeFeePct = res.data.appPct ?? 0;
          this.stripePct = res.data.stripePct ?? 0;
          this.stripeFeeFix = (res.data.fixedFeeCents ?? 0) / 100;
          this.feeConfigLoaded = true;
        }
      },
      error: () => {
        this.stripeFeePct = 0.015;
        this.stripePct = 0.015;
        this.stripeFeeFix = 0.25;
        this.feeConfigLoaded = true;
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  openModalStripe(): void {
    this.selectedCuota = null;
    this.pagarOk = false;
    this.infoRecurrente = '';
    this.getCuotas();
  }

  closeModal(): void {
    this.showModalStripe = false;
    this.cantidadAPagar = 0;
    this.amount = 0;
    this.acceptedTerms = false;
    this.selectedCuota = null;
    this.listCuotasLoading = false;
  }

  // Helper opcional
  private isSubscriptionSelected(): boolean {
    return this.selectedCuota?.tipoPagoStripe === 1;
  }

  async makePayment(): Promise<void> {
    this.paymentMessage = '';
    if (!this.pagarOk || !this.stripe || !this.card) {
      this.showPaymentFeedback('Selecciona una cuota e introduce los datos de la tarjeta.', 'error');
      return;
    }

    try {
      this.loading = true;

      const option = this.selectedText?.split('.')?.[0] || null;

      if (this.isSubscriptionSelected()) {
        const priceId = this.selectedCuota?.stripePriceId;
        if (!priceId) { this.showPaymentFeedback('Esta cuota es de suscripción pero no tiene configuración de precio.', 'error'); return; }
        if (!this.stripeId?.startsWith('acct_')) { this.showPaymentFeedback('El club no tiene configurada su cuenta de cobro. Contacta con el club.', 'error'); return; }

        const body = {
          userId: this.usuarioActual?.userId,
          priceId,
          accountId: this.stripeId, // acct_xxx del club
          clubId: this.clubId,
          teamId: this.teamId ?? undefined,
          playerId: this.playerIdUserActual ?? undefined,
          pagoClubId: this.selectedCuota?.pagoClubId ?? this.pagoClubIdSelected ?? undefined,
          option,
          fechaInicio: this.selectedCuota?.fechaInicio || undefined,
          fechaFin: this.selectedCuota?.fechaFin || undefined,
          // si no lo mandas, el backend lo lee de BD por pagoClubId
          applicationFeePercent: this.selectedCuota?.applicationFeePercent ?? undefined
        };

        const resp: any = await firstValueFrom(this.teamService.subscribeToPlan(body));
        const data = resp?.data || {};
        const subscriptionId: string | undefined = data.subscriptionId;
        const latestInvoiceId: string | undefined = data.latestInvoiceId;
        let clientSecret: string | undefined = data.clientSecret;
        let confirmationMode: 'payment' | 'setup' | undefined = data.confirmationMode;

        // Fallback si el backend aún no envía confirmationMode:
        if (!confirmationMode && clientSecret) {
          confirmationMode = latestInvoiceId ? 'payment' : 'setup';
        }

        // Nada que confirmar ahora (p. ej. trial futuro sin capturar)
        if (!confirmationMode || !clientSecret) {
          try {
            await firstValueFrom(
              this.teamService.verifySubscription({
                subscriptionId: subscriptionId ?? '',
                // sin paymentIntentId ni invoiceId en este caso
                clubId: this.clubId,
                teamId: this.teamId ?? undefined,
                playerId: this.playerIdUserActual ?? undefined,
                pagoClubId: this.selectedCuota?.pagoClubId ?? undefined
              })
            );
          } catch { }
          this.showPaymentFeedback('Suscripción iniciada correctamente.', 'success');
          this.closeModal();
          this.goBack();
          return;
        }

        if (confirmationMode === 'payment') {
          const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: this.card,
              billing_details: {
                name: `${this.usuarioActual?.firstName || ''} ${this.usuarioActual?.secondName || ''}`.trim(),
                email: this.usuarioActual?.mail || undefined,
                phone: this.usuarioActual?.mobile || undefined
              }
            }
          });

          if (error) { this.showPaymentFeedback(error.message || 'No se pudo confirmar el primer cobro de la suscripción.', 'error'); return; }

          // Registrar en backend (payment)
          try {
            await firstValueFrom(this.teamService.verifySubscription({
              subscriptionId: subscriptionId ?? '',
              paymentIntentId: paymentIntent?.id ?? undefined,
              invoiceId: latestInvoiceId ?? undefined, // opcional
              clubId: this.clubId,
              teamId: this.teamId ?? undefined,
              playerId: this.playerIdUserActual ?? undefined,
              pagoClubId: this.selectedCuota?.pagoClubId ?? undefined
            }));
          } catch { }

          this.showPaymentFeedback('Primer cobro confirmado correctamente.', 'success');
          this.closeModal();
          this.goBack();
          return;
        }

        if (confirmationMode === 'setup') {
          const { error, setupIntent } = await this.stripe.confirmCardSetup(clientSecret, {
            payment_method: {
              card: this.card,
              billing_details: {
                name: `${this.usuarioActual?.firstName || ''} ${this.usuarioActual?.secondName || ''}`.trim(),
                email: this.usuarioActual?.mail || undefined,
                phone: this.usuarioActual?.mobile || undefined
              }
            }
          });

          if (error) { this.showPaymentFeedback(error.message || 'No se pudo guardar el método de pago.', 'error'); return; }

          // Registrar en backend (setup)
          try {
            await firstValueFrom(
              this.teamService.verifySubscription({
                subscriptionId: subscriptionId ?? '',
                setupIntentId: setupIntent?.id ?? undefined,
                // NO invoiceId en setup
                clubId: this.clubId,
                teamId: this.teamId ?? undefined,
                playerId: this.playerIdUserActual ?? undefined,
                pagoClubId: this.selectedCuota?.pagoClubId ?? undefined
              })
            );
          } catch { }

          this.showPaymentFeedback('Tarjeta guardada. Se cobrará automáticamente cuando empiece la suscripción.', 'success');
          this.closeModal();
          this.goBack();
          return;
        }

        this.showPaymentFeedback('Suscripción creada correctamente.', 'success');
        this.closeModal();
        this.goBack();
        return;
      }

      // ======== PAGO PUNTUAL ========
      const payload = {
        userId: this.usuarioActual?.userId,
        clubId: this.clubId,
        teamId: this.teamId,
        playerId: this.playerIdUserActual,
        nameClub: this.nameClub,
        cantidadOriginal: this.cantidadAPagar,   // base sin fee (lo que debe recibir el club)
        accountId: this.stripeId,                // acct_xxx del club
        option: option,
        pagoClubId: this.pagoClubIdSelected ?? this.selectedCuota?.pagoClubId ?? null,
        importe: this.importeSelected ?? this.cantidadAPagar
      };

      const createResp: any = await firstValueFrom(this.teamService.createIntent(payload));
      const clientSecret = createResp?.data?.clientSecret;
      const paymentIntentId = createResp?.data?.paymentIntentId;
      if (!clientSecret) throw new Error('No se pudo iniciar el pago (sin clientSecret).');

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.card,
          billing_details: {
            name: `${this.usuarioActual?.firstName || ''} ${this.usuarioActual?.secondName || ''}`.trim(),
            email: this.usuarioActual?.mail || undefined,
            phone: this.usuarioActual?.mobile || undefined
          }
        }
      });

      if (error) {
        this.showPaymentFeedback(error.message || 'No se pudo confirmar el pago. Revisa los datos de tu tarjeta.', 'error');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        try {
          await firstValueFrom(this.teamService.verifyPayment({ paymentIntentId }));
        } catch { }

        this.restante = this.restante - this.cantidadAPagar;
        this.pagado = (parseFloat(this.pagado as any) + this.cantidadAPagar).toFixed(2);
        this.restanteCero = this.restante === 0;

        this.showPaymentFeedback('¡Pago realizado con éxito!', 'success');
        this.closeModal();
        this.goBack();
      } else if (paymentIntent?.status === 'processing') {
        this.showPaymentFeedback('El pago está procesándose. Recibirás una notificación cuando se confirme.', 'info');
      } else {
        this.showPaymentFeedback('Estado del pago: ' + paymentIntent?.status, 'info');
      }

    } catch (ex: any) {
      console.error('Error en makePayment():', ex);
      this.showPaymentFeedback(ex?.message || 'Error inesperado al procesar el pago. Inténtalo de nuevo.', 'error');
    } finally {
      this.loading = false;
    }
  }



  getCuotas() {
    this.listCuotasLoading = true;
    this.listAllCuotas = [];

    this.clubService.getListPagosClubForStripe(
      this.clubId,
      this.temporadaStoredValue,
      this.teamId,
      this.playerId
    ).subscribe({
      next: (response: Response) => {
        const raw = response?.data;
        if (Array.isArray(raw)) {
          this.listAllCuotas = raw;
        } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).list)) {
          this.listAllCuotas = (raw as any).list;
        } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).pagos)) {
          this.listAllCuotas = (raw as any).pagos;
        } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).content)) {
          this.listAllCuotas = (raw as any).content;
        } else {
          this.listAllCuotas = [];
        }
        this.listCuotasLoading = false;
        this.showModalStripe = true;
      },
      error: (err) => {
        console.error('Error al cargar opciones de pago', err);
        this.listAllCuotas = [];
        this.listCuotasLoading = false;
        this.showModalStripe = true;
      }
    });
  }

  formatText(c: any): string {
    // formatea 'yyyy-MM-dd' -> 'dd-MM-yyyy'
    const formatDate = (s?: string): string => {
      if (!s || typeof s !== 'string') return '';
      const parts = s.split('-'); // [yyyy, MM, dd]
      return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : s;
      // si no viene en el formato esperado, lo devolvemos tal cual
    };

    const start = formatDate(c?.fechaInicio);
    const end = formatDate(c?.fechaFin);

    // mapa de unidades al español
    const units: Record<string, { sing: string; plur: string }> = {
      day: { sing: 'día', plur: 'días' },
      week: { sing: 'semana', plur: 'semanas' },
      month: { sing: 'mes', plur: 'meses' },
      year: { sing: 'año', plur: 'años' }
    };

    const count = Number(c?.intervaloCuenta ?? 1);
    const key = String(c?.intervalo ?? '').toLowerCase();

    const unit = units[key] ?? { sing: key || 'periodo', plur: (key ? key + 's' : 'periodos') };
    const unitWord = count === 1 ? unit.sing : unit.plur;

    const inicioTxt = start ? `fecha de inicio el ${start}` : 'sin fecha de inicio';
    const finTxt = end ? `hasta el ${end}` : 'sin fecha de fin';

    return `${inicioTxt} ${finTxt} y los plazos son cada ${count} ${unitWord}.`;
  }

  onCuotaChange(c: any) {
    this.pagoClubIdSelected = c.pagoClubId;
    this.importeSelected = c.importe;
    this.selectedCuota = c;

    if (!c) {
      this.pagarOk = false;
      this.cantidadAPagar = 0;
      this.amount = 0;
      return;
    }

    // Base que debe recibir el club (ajusta el nombre del campo si no es 'importe')
    const base = Number(c.importe ?? 0);

    const APP_PCT = this.stripeFeePct;
    const APP_FIX = this.stripeFeeFix;
    const STRIPE_PCT = this.stripePct;
    const STRIPE_FIX = 0;

    // Helpers en céntimos para evitar errores de redondeo
    const toCents = (x: number) => Math.round(x * 100);
    const fromC = (cents: number) => +(cents / 100).toFixed(2);

    // Cálculo:
    const B = toCents(base);                                       // club neto deseado
    const appFeeC = Math.round(B * APP_PCT) + toCents(APP_FIX);    // tu fee sobre B
    const denom = 1 - STRIPE_PCT;

    // Gross-up: (1 - STRIPE_PCT) * A = B + appFeeC + STRIPE_FIX
    const A = Math.ceil((B + appFeeC + toCents(STRIPE_FIX)) / denom); // total a cobrar al padre

    // Actualiza UI
    this.cantidadAPagar = fromC(B); // base que enviarás al backend como cantidadOriginal
    this.amount = fromC(A); // total que verá/pagará el padre
    this.pagarOk = B > 0;

    // Guarda datos de la cuota que usarás en makePayment()
    this.cuota = {
      clubId: c.clubId,
      accountId: c.accountId, // acct_xxx
      nameClub: c.nameClub
    };

    // (Opcional) si quieres mostrar desglose en la UI:
    // const stripeFeeEst = Math.ceil(A * STRIPE_PCT + toCents(STRIPE_FIX));
    // this.desglose = { club: fromC(B), tuFee: fromC(appFeeC), stripe: fromC(stripeFeeEst), total: this.amount };


    if (c.tipoPagoStripe == 1) {
      //significa que laq cuota es recurrente, mostrar div info
      this.infoRecurrente = `El pago se realizará automaticamente. Las cuotas son de ${this.amount}€ y son de ` + this.formatText(c);
    } else {
      this.infoRecurrente = '';
    }
  }

  isRecurrente(c: any) {
    if (c.tipoPagoStripe == 1) {
      //significa que laq cuota es recurrente
      return ' - Recurrente';
    }
    return '';
  }

  private decodeAndSanitizeTerminos(): void {
    // Decodifica base64 a string HTML
    const html = this.base64Decode(this.terminos);
    // Marca como HTML seguro (asumes que el contenido viene de una fuente de confianza)
    this.terminosHtmlSafe = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private base64Decode(b64: string): string {
    try {
      return decodeURIComponent(escape(window.atob(b64)));
    } catch {
      return atob(b64);
    }
  }

  // --- Saved Cards ---
  openSaveCardSection(): void {
    this.cardAuthAccepted = false;
    this.saveCardError = '';
    this.saveCardSuccess = '';
    this.showSaveCardSection = true;
    setTimeout(() => this.initSaveCardElement(), 120);
  }

  closeSaveCardSection(): void {
    this.showSaveCardSection = false;
    this.saveCardError = '';
    this.saveCardSuccess = '';
    if (this.saveCard) {
      this.saveCard.destroy();
      this.saveCard = null;
    }
  }

  private parseSaveCardError(err: any): string {
    // Estructura del error del backend: { error: { code, msg }, data, status }
    const backendErr   = err?.error?.error;          // { code: 0, msg: "..." }
    const backendCode  = backendErr?.code;           // 0 = error Stripe no capturado
    const httpStatus   = err?.status;                // código HTTP (0, 400, 500…)

    const raw: string = (
      backendErr?.msg      ||   // path normal desde backend
      err?.error?.msg      ||   // path alternativo
      err?.message         ||   // fallback HttpErrorResponse
      ''
    );

    console.error('[SaveCard] HTTP status:', httpStatus,
                  '| backend code:', backendCode,
                  '| msg:', raw);

    // ── Sin conexión ──────────────────────────────────────────
    if (httpStatus === 0 || (!raw && httpStatus === 0)) {
      return 'Sin conexión. Comprueba tu red e inténtalo de nuevo.';
    }

    // ── Error code 0 del backend = excepción Stripe sin capturar ──
    if (backendCode === 0) {

      // Caso más frecuente: desajuste de claves live/test
      if (raw.includes('live mode') || raw.includes('test mode')) {
        return 'Error de configuración del servidor: las claves de Stripe no corresponden al entorno de los datos (live/test). El administrador debe revisar las claves en el backend y reiniciarlo.';
      }

      // Cliente Stripe no existe en este entorno
      if (raw.includes('No such customer') || raw.includes('resource_missing')) {
        const custId = raw.match(/'(cus_[^']+)'/)?.[1] || '';
        return `El cliente de Stripe${custId ? ' (' + custId + ')' : ''} no existe en este entorno. Seguramente el backend usa claves test con datos live. Reinicia el backend con la clave correcta.`;
      }

      // Cuenta conectada inválida
      if (raw.includes('No such account') || raw.includes('acct_')) {
        return 'La cuenta Stripe del club no existe en este entorno. Comprueba la configuración del club.';
      }

      // Otros errores de Stripe (code 0 genérico)
      const cleanCode0 = raw.split(';')[0].replace(/^setup-intent\/[^:]+:\s*/i, '').trim();
      return cleanCode0 || 'Error interno del servidor al procesar la tarjeta (code 0). Revisa los logs del backend.';
    }

    // ── Errores de tarjeta (Stripe.js devuelve estos en el frontend) ──
    if (raw.includes('card_declined'))      return 'Tarjeta rechazada. Comprueba los datos o usa otra tarjeta.';
    if (raw.includes('insufficient_funds')) return 'Fondos insuficientes. Usa otra tarjeta.';
    if (raw.includes('expired_card'))       return 'La tarjeta ha caducado. Introduce una tarjeta válida.';
    if (raw.includes('incorrect_cvc'))      return 'CVV incorrecto. Revisa el código de seguridad.';
    if (raw.includes('incorrect_number') || raw.includes('invalid_number'))
                                            return 'Número de tarjeta incorrecto. Revísalo.';

    // ── Mensaje legible genérico ──────────────────────────────
    if (raw) {
      const clean = raw.split(';')[0].replace(/^setup-intent\/[^:]+:\s*/i, '').trim();
      return clean.length > 0 ? clean : 'Error al guardar la tarjeta. Inténtalo de nuevo.';
    }
    return 'Error inesperado. Inténtalo de nuevo más tarde.';
  }

  initSaveCardElement(): void {
    if (this.saveCard) {
      this.saveCard.destroy();
      this.saveCard = null;
    }
    const elements = this.stripe.elements();
    this.saveCard = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#1a2332',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          '::placeholder': { color: '#8fa0b3' },
          iconColor: '#0fa3e8'
        },
        invalid: { color: '#e53e3e', iconColor: '#e53e3e' }
      }
    });
    this.saveCard.mount('#save-card-element');
  }

  loadSavedCards() {
    if (!this.playerId || !this.clubId) return;
    this.savedCardsLoading = true;
    this.teamService.getSavedCards(this.playerId, this.clubId).subscribe({
      next: (resp: any) => {
        this.savedCards = resp.data || [];
        this.savedCardsLoading = false;
      },
      error: () => { this.savedCardsLoading = false; }
    });
  }

  async startSaveCard() {
    if (!this.cardAuthAccepted) return;
    this.saveCardLoading = true;
    this.saveCardError = '';
    this.saveCardSuccess = '';

    this.teamService.createSetupIntent({
      userId: this.userId,
      clubId: this.clubId,
      playerId: this.playerId,
      accountId: this.stripeId
    }).subscribe({
      next: async (resp: any) => {
        const clientSecret = resp.data?.clientSecret;
        if (!clientSecret) {
          this.saveCardLoading = false;
          this.saveCardError = 'No se pudo iniciar el proceso de guardado. Inténtalo de nuevo.';
          return;
        }

        const cardForSetup = this.saveCard || this.card;
        const { setupIntent, error } = await this.stripe.confirmCardSetup(clientSecret, {
          payment_method: { card: cardForSetup }
        });

        if (error) {
          this.saveCardLoading = false;
          this.saveCardError = error.message || 'Error al verificar la tarjeta. Comprueba los datos.';
          return;
        }

        this.saveCardLoading = false;
        this.pendingSetupIntentId = setupIntent?.id;
        this.showLinkAllPlayersDialog = true;
      },
      error: (err: any) => {
        this.saveCardLoading = false;
        this.saveCardError = this.parseSaveCardError(err);
      }
    });
  }

  confirmLinkAllPlayers(linkToAll: boolean): void {
    if (!this.pendingSetupIntentId) return;
    this.showLinkAllPlayersDialog = false;
    this.saveCardLoading = true;

    this.teamService.confirmSetupIntent({
      setupIntentId: this.pendingSetupIntentId,
      userId: this.userId,
      clubId: this.clubId,
      playerId: this.playerId,
      linkToAllPlayers: linkToAll
    }).subscribe({
      next: (resp: any) => {
        this.saveCardLoading = false;
        const alreadyExists = resp?.data?.alreadyExists === true;
        this.saveCardSuccess = alreadyExists
          ? 'Esta tarjeta ya estaba guardada para todos tus jugadores.'
          : linkToAll
            ? '¡Tarjeta guardada y asociada a todos tus jugadores!'
            : '¡Tarjeta guardada correctamente!';
        this.pendingSetupIntentId = null;
        setTimeout(() => {
          this.closeSaveCardSection();
          this.loadSavedCards();
        }, 1800);
      },
      error: (err: any) => {
        this.saveCardLoading = false;
        this.saveCardError = this.parseSaveCardError(err);
        this.pendingSetupIntentId = null;
      }
    });
  }

  requestDeleteCard(card: any): void {
    this.cardToDelete = card;
    this.deleteCardError = '';
    this.showDeleteCardDialog = true;
  }

  confirmDeleteCard(): void {
    if (!this.cardToDelete) return;
    this.deleteCardLoading = true;
    this.deleteCardError = '';
    this.teamService.deleteSavedCard(this.cardToDelete.id).subscribe({
      next: () => {
        this.deleteCardLoading = false;
        this.showDeleteCardDialog = false;
        this.cardToDelete = null;
        this.loadSavedCards();
      },
      error: (err: any) => {
        this.deleteCardLoading = false;
        this.deleteCardError = err?.error?.error?.msg || err?.message || 'Error al eliminar la tarjeta. Inténtalo de nuevo.';
      }
    });
  }

  cancelDeleteCard(): void {
    this.showDeleteCardDialog = false;
    this.cardToDelete = null;
    this.deleteCardError = '';
  }

  openModalTarjetas(): void {
    this.showModalTarjetas = true;
    this.loadSavedCards();
  }

  closeModalTarjetas(): void {
    this.showModalTarjetas = false;
    if (this.showSaveCardSection) {
      this.closeSaveCardSection();
    }
  }

  // ── Desistimiento de cuota ────────────────────────────────────────

  canCancelCuota(cuota: any): boolean {
    if (!cuota) return false;
    if (cuota.desistido) return false;
    const pagado = parseFloat(cuota.pagado) || 0;
    const importe = parseFloat(cuota.importe) || 0;
    return pagado < importe;
  }

  requestCancelCuota(cuota: any): void {
    this.cuotaToCancel = cuota;
    this.cancelCuotaReason = '';
    this.cancelCuotaError = '';
    this.cancelCuotaSuccess = '';
    this.showCancelCuotaDialog = true;
  }

  dismissCancelCuota(): void {
    this.showCancelCuotaDialog = false;
    this.cuotaToCancel = null;
    this.cancelCuotaReason = '';
    this.cancelCuotaError = '';
  }

  confirmCancelCuota(): void {
    if (!this.cuotaToCancel) return;
    this.cancelCuotaLoading = true;
    this.cancelCuotaError = '';

    this.teamService.desistirCuota({
      pagoClubId: this.cuotaToCancel.pagoClubId,
      playerId: this.playerId,
      userId: this.userId,
      clubId: this.clubId,
      temporada: this.temporadaStoredValue,
      reason: this.cancelCuotaReason.trim()
    }).subscribe({
      next: () => {
        this.cancelCuotaLoading = false;
        this.cancelCuotaSuccess =
          `Tu solicitud de cancelación para "${this.cuotaToCancel.nombre}" ha sido registrada. El club recibirá la notificación.`;
        this.cuotaToCancel = null;
        // Recargar tablas para reflejar el estado desistido inmediatamente
        this.loadCuotasData();
        setTimeout(() => {
          this.showCancelCuotaDialog = false;
          this.cancelCuotaSuccess = '';
        }, 3000);
      },
      error: (err: any) => {
        this.cancelCuotaLoading = false;
        this.cancelCuotaError =
          err?.error?.error?.msg || err?.message || 'No se pudo registrar el desistimiento. Inténtalo de nuevo.';
      }
    });
  }
}
