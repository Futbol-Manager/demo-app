import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { loadStripe } from '@stripe/stripe-js';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { CancelSubscriptionRequest, SubscriptionRequest, Suscripcion, SuscripcionTipo } from 'src/app/core/services/team/team.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';

@Component({
  selector: 'app-suscripcion',
  templateUrl: './suscripcion.component.html',
  styleUrls: ['./suscripcion.component.scss']
})

export class SuscripcionComponent implements OnInit {

  userId = 0;
  selected = 0;

  cardNumber = '';
  expiryDate = '';
  cvc = '';
  showModalSus = false;
  paymentForm!: FormGroup;
  stripe: any;
  card: any;
  loading = false;
  amount: number = 99;
  playerIdSelected = 0;
  listHijos: any[] = []; // Define una variable para almacenar el listado de hijos
  datosCargados = false;
  susCripcion: Suscripcion = new Suscripcion({});
  susTipo: SuscripcionTipo = new SuscripcionTipo({});
  usuarioActual!: User | null;
  precioId = '';
  tiempo = 'M';
  susInfo: any;
  yesSus = false;
  noSus = false;
  cancelSus: CancelSubscriptionRequest = new CancelSubscriptionRequest({});
  cambiarSus: SubscriptionRequest = new SubscriptionRequest({});
  //stripeKey = 'pk_live_51PIUivHzMBDrutQn6OvgtO0aQ3ixFWwxRdsvdGfFlUVNH3nErHwoqXMhJ5lEfxF42Bdm9xplEuYOwAb8Iz1hVWTM00HKWC1CkL';
  stripeKey = 'pk_test_51PIUivHzMBDrutQnxB3X6RlNQ2DR65e3hoDglo8Vo8zU23tmRuviJcQWGrLLUqFP4LK9RPa6czfJSh2w6V3eW7iL008i311mCU';
  datosCargadosScouting = false;
  datosCargadosPlayer = false;
  datosCargadosClub = false;
  unidades = 0;

  // Variables para manejar la lógica
  subscriptionType: string = 'monthly'; // Mensual por defecto
  numTeams: number = 1; // Número de equipos (por defecto 1)
  monthlyPrice: number = 9.99; // Precio mensual
  annualPricePerMonth: number = 4.99; // Precio mensual para la suscripción anual
  totalPrice: number = this.monthlyPrice; // Total inicial

  susIsNew = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private teamService: TeamService,
    private loginService: LoginService,
    private fb: FormBuilder,) { }

  async ngOnInit(): Promise<void> {
    this.route.params.subscribe(params => {
      // Obtener el valor de userId de los parámetros
      this.userId = params['userId'];
    });

    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;

      if (user?.profileType.profileId == 4 || user?.profileType.profileId == 3) {
        this.teamService.getTeamByPlayer(this.userId.toString()).subscribe(
          (response: Response) => {
            if (response.data !== null) {
              this.listHijos = response.data;
              if (this.listHijos.length == 1) {
                //si solo hay uno, dejar ya ese seleccionado.
                this.playerIdSelected = this.listHijos[0].playerId;
                //this.obtenerSuscripcionActual();
              }
            } else {
              console.error('La respuesta del servicio no tiene la estructura esperada', response);
            }
          },
          (error) => {
            console.error('Error al cargar el listado de equipos', error);
          }
        );
      } else if (user?.profileType.profileId == 5) {
        this.obtenerSuscripcionActual();
        this.datosCargadosScouting = true;
      } else if (user?.profileType.profileId == 1) {
        this.obtenerSuscripcionActual();
        this.datosCargadosClub = true;
      }
    });

    this.stripe = await loadStripe(this.stripeKey); // Reemplaza con tu clave pública
    const elements = this.stripe.elements();
    this.card = elements.create('card');
    this.card.mount('#card-element');

    this.paymentForm = this.fb.group({
      amount: ['']
    });
  }

  selectedHijo(playerId: number) {
    this.playerIdSelected = playerId;
    this.obtenerSuscripcionActual();
    this.datosCargadosPlayer = true;
  }

  obtenerSuscripcionActual() {
    this.teamService.getSubscriptionByPlayerId(this.playerIdSelected, this.userId).subscribe(
      (response: Response) => {
        console.log(response.data);
        if (response.data.suscripcionId != 0) {
          this.susInfo = response.data;
          this.yesSus = true;
          this.noSus = false;
        } else {
          this.susInfo = null;
          this.susIsNew = true;
          this.noSus = true;
          this.yesSus = false;
        }
        //si tiene una sus, dejarla seleccionada
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el los datos', error);
      }
    );
  }

  // Abrir el modal cuando se selecciona una opción de suscripción
  select(option: number, precioId: string) {
    this.unidades = 1;
    this.precioId = precioId;
    this.selected = option;
    switch (option) {
      case 2:
        this.tiempo = 'T';
        break;
      case 3:
        this.tiempo = 'A';
        break;
    }

    if (this.susInfo != null) {
      this.confirmCambiarSuscripcion();
    } else {
      this.showModalSus = true;
    }
  }

  async makePayment() {
    // Crear el PaymentMethod con la tarjeta
    const { paymentMethod, error } = await this.stripe?.createPaymentMethod({
      type: 'card',
      card: this.card
    }) || {};

    if (error) {
      console.error(error);
      return;
    }

    // Crear objeto con la suscripción
    const susTipo: SuscripcionTipo = {
      suscripcionTiposId: this.selected,    // ID del tipo de suscripción seleccionado
      codigo: '',                           // Si no tienes el código, puedes dejarlo vacío
      descripcion: '',                      // Igual con la descripción
      priceId: this.precioId,               // Asegúrate de obtener el priceId correcto para la suscripción
      precio: '',                           // Precio (puedes usar el valor predeterminado si es necesario)
      tiempo: this.tiempo                   // El tiempo de la suscripción
    };

    const subscriptionRequest: SubscriptionRequest = {
      userId: this.userId,
      email: this.usuarioActual?.mail || '',
      name: this.usuarioActual?.firstName || '',
      priceId: this.precioId,               // Aquí va el ID del plan de precios en Stripe
      paymentMethodId: paymentMethod?.id || '', // ID del PaymentMethod obtenido de Stripe
      suscripcion: {
        suscripcionId: 0,
        userId: this.userId,
        playerId: this.playerIdSelected,
        suscripcionTipo: susTipo,
        dateCreate: '',
        dateFinal: '',
        suscripcionStripeId: '',
        valido: '',
        renueva: 0,
        clienteStripeId: '',
        numeroEquipos: this.unidades //1 solo parascouting y jugador, pero para club y entrenador, va el numero que pongan
      },
    };

    // Llamar al backend para crear la suscripción y obtener el clientSecret
    this.teamService.createSubscription(subscriptionRequest).subscribe(
      async (response: Response) => {
        if (response.data) {
          // Verificar si el pago requiere acción adicional (SCA)
          const clientSecret = response.data;
          const { error: confirmError } = await this.stripe?.confirmCardPayment(clientSecret) || {};

          if (confirmError) {
            console.error('Error al confirmar el pago:', confirmError);
            alert('Error al confirmar el pago: ' + confirmError.message);
          } else {
            alert('Suscripción creada y pago confirmado con éxito.');
            this.obtenerSuscripcionActual();
            this.cerrarModalSus();
          }
        }
      },
      (error) => {
        console.error('Error al crear la suscripción:', error);
      }
    );
  }

  cerrarModalSus() {
    this.showModalSus = false;
  }

  cancelarSuscripcion() {
    this.cancelSus = {
      playerId: this.susInfo.playerId,
      userId: this.susInfo.userId,
      nuevo: 2,
      suscripcionStripeId: this.susInfo.suscripcionStripeId,
      subscriptionId: this.susInfo.suscripcionId,
      suscripcionTiposId: this.susInfo.suscripcionTipo.suscripcionTiposId
    }

    // Llamar a tu servicio para procesar la suscripción
    this.teamService.cancelSubscription(this.cancelSus).subscribe(
      (response: Response) => {
        if (response.data) {
          this.obtenerSuscripcionActual();
          alert('Suscripción creada con éxito:');
          this.cerrarModalSus();
          console.log('Suscripción creada con éxito:', response);
        }
      },
      (error) => {
        console.error('Error al crear la suscripción:', error);
      }
    );
  }

  reactivarSuscripcion() {
    const subscriptionRequest: SubscriptionRequest = {
      userId: this.userId,
      email: this.usuarioActual?.mail === undefined ? '' : this.usuarioActual?.mail,
      name: this.usuarioActual?.firstName === undefined ? '' : this.usuarioActual?.firstName,
      priceId: '', // Aquí va el ID del plan de precios en Stripe
      paymentMethodId: '', // ID del PaymentMethod obtenido de Stripe
      suscripcion: this.susInfo
    };

    // Llamar a tu servicio para procesar la suscripción
    this.teamService.reactivarSubscription(subscriptionRequest).subscribe(
      (response: Response) => {
        if (response.data) {
          this.obtenerSuscripcionActual();
          alert('Suscripción reactivada con éxito:');
          //this.cerrarModalSus();
          //console.log('Suscripción creada con éxito:', response);
        }
      },
      (error) => {
        console.error('Error al crear la suscripción:', error);
      }
    );
  }

  cambiarSuscripcion() {
    /*this.cambiarSus = {
      email: this.susInfo.email
    }*/

    // Crear objeto con la suscripción
    const susTipo: SuscripcionTipo = {
      suscripcionTiposId: this.selected,    // ID del tipo de suscripción seleccionado
      codigo: '',                           // Si no tienes el código, puedes dejarlo vacío
      descripcion: '',                      // Igual con la descripción
      priceId: '',                          // Deberás obtener el priceId si es necesario
      precio: '',                           // Puedes dejar el precio vacío o poner un valor predeterminado
      tiempo: this.tiempo                            // Igual para el tiempo
    };

    this.susInfo.suscripcionTipo = susTipo;
    this.susInfo.numeroEquipos = this.unidades;

    const subscriptionRequest: SubscriptionRequest = {
      userId: this.userId,
      email: this.usuarioActual?.mail === undefined ? '' : this.usuarioActual?.mail,
      name: this.usuarioActual?.firstName === undefined ? '' : this.usuarioActual?.firstName,
      priceId: this.precioId, // Aquí va el ID del plan de precios en Stripe
      paymentMethodId: '', // ID del PaymentMethod obtenido de Stripe
      suscripcion: this.susInfo
    };

    // Llamar a tu servicio para procesar la suscripción
    this.teamService.updateSubscription(subscriptionRequest).subscribe(
      (response: Response) => {
        if (response.data) {
          this.obtenerSuscripcionActual();
          alert('Suscripción creada con éxito:');
          this.cerrarModalSus();
          console.log('Suscripción creada con éxito:', response);
        }
      },
      (error) => {
        console.error('Error al crear la suscripción:', error);
      }
    );

    //cambiar sus
  }

  confirmCambiarSuscripcion() {
    const confirmacion = confirm('AVISO: Vas a cambiar la suscripción que tenias, se cobrará una pequeña comisión de hasta un máximno de 1% ¿Estás seguro?');
    if (confirmacion) {
      this.cambiarSuscripcion();
    }
  }

  confirmCancelarSuscripcion() {
    const confirmacion = confirm('AVISO: Vas a cancelar la suscripción, la cual no se renovará, tienes hasta entonces para seguir disfrutando, ¿Estás seguro?');
    if (confirmacion) {
      this.cancelarSuscripcion();
    }
  }

  // Método para calcular el total en función del tipo de suscripción y el número de equipos
  calculateTotal() {
    if (this.subscriptionType === 'monthly') {
      this.totalPrice = this.monthlyPrice * this.numTeams;
      this.precioId = 'price_1Q67EUHzMBDrutQn0ToeV5OT';
      this.selected = 7;
      this.tiempo = 'M';
    } else if (this.subscriptionType === 'annual') {
      this.totalPrice = this.annualPricePerMonth * this.numTeams * 12; // Precio anual multiplicado por 12 meses
      this.precioId = 'price_1QBBQuHzMBDrutQn5lZDwQsZ';
      this.selected = 8;
      this.tiempo = 'A';
    }
  }

  // Método para confirmar la suscripción
  confirmSubscription() {
    this.unidades = this.numTeams;
    this.showModalSus = true;
    //alert(`Has seleccionado una suscripción de tipo ${this.subscriptionType} para ${this.numTeams} equipo(s). El total a pagar es de ${this.totalPrice} €.`);
    // Aquí puedes realizar la lógica para enviar la suscripción
  }

  confirmSubscription2() {
    if (this.susInfo.renueva == 0) {
      alert('Primero debes de reactivar la cuenta para poder cambiar o aplicar una nueva suscripción.');
    } else {
      this.unidades = this.numTeams;
      this.confirmCambiarSuscripcion();
    }
  }

  confirmReactivarSubscription() {
    const confirmacion = confirm('AVISO: Vas a reactivar la suscripción, ¿Estás seguro?');
    if (confirmacion) {
      this.reactivarSuscripcion();
    }
  }
}