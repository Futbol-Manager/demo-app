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
  historyCuotasPlayer: any[] = [];
  playerCuotas: any;

  selectedText: string = '';
  conRopa = 'No';
  restante = 0;
  temporada = '';
  playerId = 0;
  restanteCero = false;
  tablasCargados = false;
  pagado = 0;
  pagarOk = false;
  cantidadAPagar = 0;
  cuotas: any[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private loginService: LoginService,
    private fb: FormBuilder,
    private elementRef: ElementRef,
    private http: HttpClient,
    private location: Location) {
  }

  async ngOnInit(): Promise<void> {
    this.paymentForm = this.fb.group({
      amount: ['']
    });

    this.stripe = await loadStripe('pk_live_51PIUivHzMBDrutQn6OvgtO0aQ3ixFWwxRdsvdGfFlUVNH3nErHwoqXMhJ5lEfxF42Bdm9xplEuYOwAb8Iz1hVWTM00HKWC1CkL'); // Reemplaza con tu clave pública
    //this.stripe = await loadStripe('pk_test_51PIUivHzMBDrutQnxB3X6RlNQ2DR65e3hoDglo8Vo8zU23tmRuviJcQWGrLLUqFP4LK9RPa6czfJSh2w6V3eW7iL008i311mCU'); // Reemplaza con tu clave pública
    const elements = this.stripe.elements();
    this.card = elements.create('card');
    this.card.mount('#card-element');

    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.playerIdUserActual = user?.playerId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de teamId de los parámetros
        this.teamId = +params['teamId'];  // El + convierte el valor a número
        this.playerId = +params['playerId'];  // El + convierte el valor a número
        console.log('teamId:', this.teamId);
        console.log('playerId:', this.playerId);
      });
      this.teamService.getCuotaPlayer(this.playerId, this.teamId).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.cuota = response.data;
            this.cuotaClub = this.cuota.cuota
            this.cuotaRopa = this.cuota.cuotaRopa
            //this.combo = this.cuota.combo;
            //ahora obtenemos la lista del historico de pagos
            this.teamService.getHistoryCuotaClubByPlayer(this.teamId, this.playerId).subscribe(
              (response: Response) => {
                // Verifica que la propiedad 'data' exista en la respuesta
                if (response.data !== null) {
                  this.historyCuotasPlayer = response.data.listP;
                  this.playerCuotas = response.data.listC;
                  this.restante = response.data.restante;
                  this.pagado = response.data.pagado;
                  this.getCuotas();
                  if (this.restante == 0) {
                    this.restanteCero = true;
                  } else {
                    this.datosCargados = true;
                  }
                  this.tablasCargados = true;
                  /*this.restante = Number(this.historyCuotasPlayer[0].totalCuota) - Number(this.historyCuotasPlayer[0].totalPagado);
                  this.conRopa = this.SIoNo(this.historyCuotasPlayer[0].pagoConRopa);
                  this.temporada = this.historyCuotasPlayer[0].temporada;*/
                } else {
                  console.log('No hay registros en la tabla');
                }
              },
              (error) => {
                console.error('Error al cargar el listado de equipos', error);
              }
            );
          } else {
            console.error('La respuesta del servicio no tiene la estructura esperada', response);
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
    this.showModalStripe = true;
  }

  closeModal(): void {
    this.showModalStripe = false;
  }

  async makePayment(): Promise<void> {
    //this.historyCuotasPlayer[0].temporada = '2030';
    if (this.paymentForm.valid) {
      const paymentRequest = this.paymentForm.value;

    }

    const { token, error } = await this.stripe.createToken(this.card);

    if (error) {
      console.error(error);
    } else {
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
        cantidadOriginal: this.cantidadAPagar
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
            this.closeModal();
          } else {
            alert('Tarjeta no válida, revise los datos o pruebe con otra tarjeta');
          }
        },
        (error) => {
          alert('An error occurred: ' + error.message);
        }
      );
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

  calcularComision(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    let cantidad = parseFloat(selectedValue);
    //console.log('Cuota seleccionada:', selectedValue);
    const comision = (cantidad * 1.8) / 100;
    this.amount = cantidad + comision + 0.25;
    this.pagarOk = true;
  }

  getCuotas() {
    const cuotas = [];

    // Cuota de ropa
    if (this.playerCuotas.cuotaRopa && this.playerCuotas.cuotaRopa != 0) {
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
    }

    this.cuotas = cuotas;
    return cuotas;
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


}
