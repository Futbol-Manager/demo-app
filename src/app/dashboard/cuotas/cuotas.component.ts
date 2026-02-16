import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { FormBuilder, FormGroup } from '@angular/forms';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Location } from '@angular/common';
import * as $ from 'jquery';
import 'datatables.net';
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
  cuotaClub = 0;
  cuotaRopa = 0;
  cuota: any;
  combo = {
    cuotaUno: '',
    cuotaDos: '',
    cuotaTres: '',
    cuotaRopa: '',
    cuotaTotalSinRopa: '',
    cuotaTotalConRopa: ''
  }

  playerIdUserActual: any = 0;
  usuarioActual!: User | null;

  showModalStripe = false;
  paymentForm!: FormGroup;
  stripe: any;
  card: any;
  loading = false;
  amount: number = 0;
  historyCuotasPlayer: any = {};
  playerCuotas: any;
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

  stripeFeePct = 0.018;
  stripeFeeFix = 0.25;
  pagoClubIdSelected = 0;
  importeSelected = '';
  stripeBtoShow = false;

  selectedCuota: any = null; // { tipoPagoStripe: 0|1, stripePriceId?: string, pagoClubId?: number, ... }
  infoRecurrente = '';
  acceptedTerms = false;

  // “Hola <b>mundo</b>” en base64
  terminos: string = 'SG9sYSA8Yj5tdW5kbzwvYj4=';

  terminosHtmlSafe!: SafeHtml;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private loginService: LoginService,
    private playerService: PlayerService,
    private fb: FormBuilder,
    private elementRef: ElementRef,
    private http: HttpClient,
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

    console.log(environment.stripePublicKey);
    this.stripe = await loadStripe(environment.stripePublicKey);

    //this.stripe = await loadStripe('pk_live_51PIUivHzMBDrutQn6OvgtO0aQ3ixFWwxRdsvdGfFlUVNH3nErHwoqXMhJ5lEfxF42Bdm9xplEuYOwAb8Iz1hVWTM00HKWC1CkL'); // Reemplaza con tu clave pública
    //this.stripe = await loadStripe('pk_test_51PIUivHzMBDrutQnxB3X6RlNQ2DR65e3hoDglo8Vo8zU23tmRuviJcQWGrLLUqFP4LK9RPa6czfJSh2w6V3eW7iL008i311mCU'); // Reemplaza con tu clave pública
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

      this.playerService.getPagoCuotasPlayer(this.teamId, this.playerId).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.historyCuotasPlayer = response.data;
            this.pagado = this.historyCuotasPlayer.totalPagado;
            this.pdte = this.historyCuotasPlayer.pendiente;

            this.cuotasObligatorias = this.historyCuotasPlayer.obligatorios;
            this.cuotasNoObligatorias = this.historyCuotasPlayer.noObligatorios;

            this.stripeBtoShow = this.historyCuotasPlayer.stripeId != null && this.historyCuotasPlayer.stripeId != undefined
              && this.historyCuotasPlayer.stripeId != '' ? true : false;
            this.stripeId = this.historyCuotasPlayer.stripeId;
            this.banco = this.historyCuotasPlayer.banco;
            this.nameClub = this.historyCuotasPlayer.nameClub;
            this.clubId = this.historyCuotasPlayer.clubId;
            this.asunto = this.historyCuotasPlayer.asunto;
            this.contacto = this.historyCuotasPlayer.contacto;
            this.bizum = this.historyCuotasPlayer.bizum;
            this.terminos = this.historyCuotasPlayer.terminos;
            this.decodeAndSanitizeTerminos();

            //el club 83 ha pedido que los padres no lo vean
            if (this.historyCuotasPlayer.clubId == 83) this.stripeBtoShow = false;

            this.datosCargados = true;
          } else {
            console.log('No hay registros en la tabla');
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
    });
  }

  goBack(): void {
    this.location.back();
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId, this.playerId]);
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
    if (!this.pagarOk || !this.stripe || !this.card) {
      alert('Selecciona una cuota e introduce la tarjeta.');
      return;
    }

    try {
      this.loading = true;

      const option = this.selectedText?.split('.')?.[0] || null;

      if (this.isSubscriptionSelected()) {
        const priceId = this.selectedCuota?.stripePriceId;
        if (!priceId) { alert('Esta cuota es de suscripción pero no tiene priceId configurado.'); return; }
        if (!this.stripeId?.startsWith('acct_')) { alert('El club no tiene configurada su cuenta de Stripe (acct_...).'); return; }

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
          alert('Suscripción iniciada. No es necesario confirmar un pago ahora.');
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

          if (error) { alert(error.message || 'No se pudo confirmar el primer cobro de la suscripción.'); return; }

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

          alert('Primer cobro confirmado correctamente.');
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

          if (error) { alert(error.message || 'No se pudo guardar el método de pago.'); return; }

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

          alert('Tarjeta guardada. Se cobrará automáticamente cuando empiece la suscripción.');
          this.closeModal();
          this.goBack();
          return;
        }

        // Fallback
        alert('Suscripción creada correctamente.');
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
        alert(error.message || 'No se pudo confirmar el pago.');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        try {
          await firstValueFrom(this.teamService.verifyPayment({ paymentIntentId }));
        } catch { /* el webhook también lo registrará */ }

        // Actualiza UI local
        this.restante = this.restante - this.cantidadAPagar;
        this.pagado = (parseFloat(this.pagado as any) + this.cantidadAPagar).toFixed(2);
        this.restanteCero = this.restante === 0;

        alert('Pago realizado con éxito');
        this.closeModal();
        this.goBack();
      } else if (paymentIntent?.status === 'processing') {
        alert('El pago está procesándose. Te avisaremos al confirmarse.');
      } else {
        alert('Estado del pago: ' + paymentIntent?.status);
      }

    } catch (ex: any) {
      console.error('Error en makePayment():', ex);
      alert(ex?.message || 'Error inesperado al procesar el pago.');
    } finally {
      this.loading = false;
    }
  }

  /*async makePayment(): Promise<void> {
    if (!this.pagarOk || !this.stripe || !this.card) {
      alert('Selecciona una cuota e introduce la tarjeta.');
      return;
    }

    try {
      this.loading = true;

      // 1) Pide el clientSecret a tu API (NO mandes token de tarjeta)
      const option = this.selectedText?.split('.')?.[0] || null;

      const payload = {
        userId: this.usuarioActual?.userId,
        clubId: this.clubId,
        teamId: this.teamId,
        playerId: this.playerIdUserActual,
        nameClub: this.nameClub,
        cantidadOriginal: this.cantidadAPagar,     // base sin fee
        accountId: this.stripeId,          // acct_xxx del club
        option: option,
        pagoClubId: this.pagoClubIdSelected,
        importe: this.importeSelected
      };

      const createResp: any = await firstValueFrom(this.teamService.createIntent(payload));
      const clientSecret = createResp?.data?.clientSecret;
      const paymentIntentId = createResp?.data?.paymentIntentId;

      if (!clientSecret) {
        throw new Error('No se pudo iniciar el pago (sin clientSecret).');
      }

      // 2) Confirmar el pago en el FRONT (gestiona 3DS automáticamente)
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
        // Error del banco / 3DS no superado / tarjeta inválida
        alert(error.message || 'No se pudo confirmar el pago.');
        return;
      }

      // 3) UI inmediata + (opcional) verificar con tu API
      if (paymentIntent?.status === 'succeeded') {
        // (Opcional) Verificar/registrar ya en tu API — si tienes /payments/verify
        try {
          await firstValueFrom(this.teamService.verify({ paymentIntentId }));
        } catch {  }

        // Actualiza tu UI
        this.restante = this.restante - this.cantidadAPagar;
        this.pagado = (parseFloat(this.pagado as any) + this.cantidadAPagar).toFixed(2);
        this.restanteCero = this.restante === 0;

        alert('Pago realizado con éxito');
        this.closeModal();
        this.goBack();
      } else if (paymentIntent?.status === 'processing') {
        alert('El pago está procesándose. Te avisaremos al confirmarse.');
        // Puedes hacer polling con /payments/verify cada X segundos si quieres.
      } else {
        alert('Estado del pago: ' + paymentIntent?.status);
      }
    } catch (ex: any) {
      console.error('Error en makePayment():', ex);
      alert(ex?.message || 'Error inesperado al procesar el pago.');
    } finally {
      this.loading = false;
    }
  }*/

  async makePaymentOld(): Promise<void> {
    if (this.paymentForm.valid) {
      const paymentRequest = this.paymentForm.value;
      this.pagarOk = false;
    }

    //console.log(this.stripe, this.card);
    try {
      const { token, error } = await this.stripe.createToken(this.card);
      if (error) {
        //console.error('Stripe token error:', error);
        alert(error.message);
        this.closeModal();
      } else {
        //console.log('Stripe token:', token);
        // Sigue con la lógica normal
        const option = this.selectedText.split('.')[0];
        const paymentRequest = {
          token: token.id,
          amount: this.amount,
          clubId: this.cuota.clubId,
          teamId: this.teamId,
          playerId: this.playerIdUserActual,
          option: option,
          accountId: this.cuota.accountId,
          nameClub: this.cuota.nameClub,
          cantidadOriginal: this.cantidadAPagar,
          userId: this.usuarioActual?.userId
        };

        this.teamService.processPayment(paymentRequest).subscribe(
          (response: any) => {
            if (response.data) {
              this.historyCuotasPlayer.push(response.data);

              this.restante = this.restante - this.cantidadAPagar;
              this.pagado = this.pagado + this.cantidadAPagar;
              if (this.restante == 0) {
                this.restanteCero = true;
                this.datosCargados = false;
              } else {
                this.datosCargados = true;
                this.restanteCero = false;
              }

              alert('Pago realizado con éxito');
            } else {
              alert('Tarjeta no válida, revise los datos o pruebe con otra tarjeta');
            }
            this.closeModal();
            this.goBack();
          },
          (error) => {
            alert('An error occurred: ' + error.message);
            this.goBack();
          }
        );
      }
    } catch (ex) {
      console.error('Error inesperado al crear token Stripe:', ex);
      alert('Error inesperado al procesar la tarjeta');
      this.closeModal();
      this.goBack();
    }
  }

  estadoPago(estado: string): number {
    let resp = 0;
    switch (estado) {
      case 'No ha pagado nada':
        resp = 0;
        break;
      case 'Al corriente':
        resp = 3;
        break;
      case 'Pago completado':
        resp = 2;
        break;
      case 'PDTE':
        resp = 1;
        break;
    }
    return resp;
  }

  SIoNo(value: any): string {
    let valueString = value.toString()
    let resp = 'No';
    switch (valueString) {
      case '1':
        resp = 'Si';
        break;
    }
    return resp;
  }

  calcularComisionOld(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    let cantidad = parseFloat(selectedValue);
    //console.log('Cuota seleccionada:', selectedValue);
    const comision = (cantidad * 1.8) / 100;
    this.amount = cantidad + comision + 0.25;
    this.pagarOk = true;
  }

  calcularComision(event: Event) {
    // Base que debe recibir el club
    const base = parseFloat((event.target as HTMLSelectElement).value) || 0;

    // === parámetros ===
    const APP_PCT = this.stripeFeePct;   // tu fee 1,8%
    const APP_FIX = this.stripeFeeFix;    // 0,25 €
    const STRIPE_PCT = 0.035; // 3,5%  <-- AJUSTA a tu contrato real
    const STRIPE_FIX = 0.00;  // 0,00 € <-- AJUSTA (p.ej. 0.25 si aplica)

    const toCents = (x: number) => Math.round(x * 100);
    const fromC = (c: number) => +(c / 100).toFixed(2);

    const B = toCents(base);
    const appFeeC = Math.round(B * APP_PCT) + toCents(APP_FIX);
    const denom = 1 - STRIPE_PCT;

    // A = (B + appFee + STRIPE_FIX) / (1 - STRIPE_PCT)
    const A = Math.ceil((B + appFeeC + toCents(STRIPE_FIX)) / denom);

    this.cantidadAPagar = fromC(B);   // base que se envía al backend (club)
    this.amount = fromC(A);           // total que paga el padre (lo que muestras)
    this.pagarOk = this.cantidadAPagar > 0;
  }

  getCuotas() {
    const cuotas = [];
    // Cuota de ropa
    /*if (this.playerCuotas.cuotaRopa && this.playerCuotas.cuotaRopa != 0) {
      cuotas.push({
        value: this.playerCuotas.cuotaRopa,
        text: `${this.playerCuotas.cuotaRopa}€`
      });
    }

    // Cuotas dinámicas
    for (let i = 1; i <= this.playerCuotas.numCuotas; i++) {
      const cuotaValue = this.playerCuotas[`cuota${this.numeroEnTexto(i)}`];
      //const cuotaAlias = this.playerCuotas[`cuota${this.numeroEnTexto(i)}Alias`];
      if (cuotaValue != null) {
        cuotas.push({
          value: cuotaValue,
          text: `${cuotaValue}€` //+  ' ' + cuotaAlias
        });
      }
    }*/

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

  // Función para convertir número a texto (1 -> 'Uno', 2 -> 'Dos', etc.)
  numeroEnTexto(num: number): string {
    const numerosTexto = [
      'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis',
      'Siete', 'Ocho', 'Nueve', 'Diez', 'Once', 'Doce'
    ];
    return numerosTexto[num - 1] || '';
  }

  calcularComisionDirecto() {
    console.log('Nueva cuota seleccionada:', this.cantidadAPagar);
    // Lógica para manejar la nueva cuota
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

    // === Parámetros de fee ===
    const APP_PCT = 0.003;   // tu fee 1,8%
    const APP_FIX = 0.25;    // tu fijo 0,25 €
    // ⬇️ AJUSTA a tu contrato real con Stripe:
    const STRIPE_PCT = 0.015; // ejemplo 3,5% (por tu captura)
    const STRIPE_FIX = 0.00;  // ejemplo 0,00 € (usa 0.25 si aplica)

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
      // atob para base64 -> binario; decodeURIComponent para UTF-8 correcto si viniera con escape
      return decodeURIComponent(escape(window.atob(b64)));
    } catch {
      // Fallback simple si hay caracteres fuera de ASCII
      return atob(b64);
    }
  }


}
