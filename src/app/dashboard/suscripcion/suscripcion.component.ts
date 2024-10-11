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
    });

    this.teamService.getTeamByPlayer(this.userId.toString()).subscribe(
      (response: Response) => {
        if (response.data !== null) {
          this.listHijos = response.data;
          if (this.listHijos.length == 1) {
            //si solo hay uno, dejar ya ese seleccionado.
            this.playerIdSelected = this.listHijos[0].playerId;
            this.obtenerSuscripcionActual();
          }
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );

    //ver primero si existe alguna suscripcion 
    //obtenerSuscripcionActual()

    //this.stripe = await loadStripe('pk_live_51PIUivHzMBDrutQn6OvgtO0aQ3ixFWwxRdsvdGfFlUVNH3nErHwoqXMhJ5lEfxF42Bdm9xplEuYOwAb8Iz1hVWTM00HKWC1CkL'); // Reemplaza con tu clave pública
    this.stripe = await loadStripe('pk_test_51PIUivHzMBDrutQnxB3X6RlNQ2DR65e3hoDglo8Vo8zU23tmRuviJcQWGrLLUqFP4LK9RPa6czfJSh2w6V3eW7iL008i311mCU'); // Reemplaza con tu clave pública
    const elements = this.stripe.elements();
    this.card = elements.create('card');
    this.card.mount('#card-element');

    this.paymentForm = this.fb.group({
      amount: ['']
    });
    //obtener el listado de hijos si tiene mas de uno y mostrarlo, 2 botones, que si escoge uno, se ve debajo el plan que tiene y 
    //si pulsa en el otro hijo, se busca el plan de ese otro hijo y se actualiza la info de la pantalla

    //obtener la sus actual por si quisiera cambiarla y mostrarle cual tiene
    //this.obtenerSuscripcionActual();
  }

  selectedHijo(playerId: number) {
    this.playerIdSelected = playerId;
    this.obtenerSuscripcionActual();
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

  // Enviar los datos al backend para crear la suscripción
  /*submitSubscription() {
    const paymentData = {
      userId: this.userId,
      subscriptionType: this.selected, // 1 = Mensual, 2 = Trimestral, 3 = Anual
      cardNumber: this.cardNumber,
      expiryDate: this.expiryDate,
      cvc: this.cvc
    };

    // Llamar al endpoint para crear la suscripción
    this.http.post('/api/create-subscription', paymentData)
      .subscribe(response => {
        console.log('Suscripción creada con éxito', response);
        this.showModalSus = false;
      }, error => {
        console.error('Error al crear la suscripción', error);
      });
  }*/

  async makePayment() {
    const { paymentMethod, error } = await this.stripe?.createPaymentMethod({
      type: 'card',
      card: this.card
    }) || {};

    if (error) {
      console.error(error);
    } else {
      // Crear objeto con la suscripción
      const susCripcion = {
        userId: this.userId,
        subscriptionType: { suscripcionTiposId: this.selected }, // El tipo de suscripción
        paymentMethodId: paymentMethod?.id // ID del PaymentMethod de Stripe
      };

      const susTipo: SuscripcionTipo = {
        suscripcionTiposId: this.selected,    // ID del tipo de suscripción seleccionado
        codigo: '',                           // Si no tienes el código, puedes dejarlo vacío
        descripcion: '',                      // Igual con la descripción
        priceId: '',                          // Deberás obtener el priceId si es necesario
        precio: '',                           // Puedes dejar el precio vacío o poner un valor predeterminado
        tiempo: this.tiempo                            // Igual para el tiempo
      };

      const subscriptionRequest: SubscriptionRequest = {
        userId: this.userId,
        email: this.usuarioActual?.mail === undefined ? '' : this.usuarioActual?.mail,
        name: this.usuarioActual?.firstName === undefined ? '' : this.usuarioActual?.firstName,
        priceId: this.precioId, // Aquí va el ID del plan de precios en Stripe
        paymentMethodId: paymentMethod.id, // ID del PaymentMethod obtenido de Stripe
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
          clienteStripeId: ''
        }
      };

      // Llamar a tu servicio para procesar la suscripción
      this.teamService.createSubscription(subscriptionRequest).subscribe(
        (response: Response) => {
          if (response.data) {
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
      subscriptionId: this.susInfo.subscriptionId,
      suscripcionTiposId: this.selected
    }

    // Llamar a tu servicio para procesar la suscripción
    this.teamService.cancelSubscription(this.cancelSus).subscribe(
      (response: Response) => {
        if (response.data) {
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
    const confirmacion = confirm('AVISO: Vas a cancelar la suscripción anterior y a establecer la suscripción seleccionada. ¿Estás seguro?');
    if (confirmacion) {
      this.cambiarSuscripcion();
    }
  }
}