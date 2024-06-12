import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { FormBuilder, FormGroup } from '@angular/forms';
import { loadStripe, Stripe } from '@stripe/stripe-js';
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
  cuota: any;
  combo: any;

  playerIdUserActual: any = 0;
  usuarioActual!: User | null;

  showModalStripe = false;
  paymentForm!: FormGroup;
  stripe: any;
  card: any;
  loading = false;
  amount: number = 99;
  historyCuotasPlayer: any[] = [];

  selectedText: string = '';
  conRopa = 'No';
  restante = 0;
  temporada = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private loginService: LoginService,
    private fb: FormBuilder,
    private elementRef: ElementRef,
    private http: HttpClient,) {
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
        console.log('teamId:', this.teamId);
      });
      this.teamService.getCuotaPlayer(this.playerIdUserActual, this.teamId).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.cuota = response.data;
            this.combo = this.cuota.combo;
            //ahora obtenemos la lista del historico de pagos
            this.teamService.getHistoryCuotaClubByPlayer(this.playerIdUserActual.toString()).subscribe(
              (response: Response) => {
                // Verifica que la propiedad 'data' exista en la respuesta
                if (response.data !== null) {
                  this.historyCuotasPlayer.push(response.data);
                  this.restante = Number(this.historyCuotasPlayer[0].totalCuota) - Number(this.historyCuotasPlayer[0].totalPagado);
                  this.conRopa = this.SIoNo(this.historyCuotasPlayer[0].pagoConRopa);
                  this.temporada = this.historyCuotasPlayer[0].temporada;
                  setTimeout(() => {
                    this.inicializarDataTable();
                    this.datosCargados = true;
                  }, 1000);
                } else {
                  this.datosCargados = true;
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

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId]);
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
        nameClub: this.cuota.nameClub
      };

      this.teamService.processPayment(paymentRequest).subscribe(
        (response: any) => {
          if (response.data) {
            switch (option) {
              case '1':
                this.historyCuotasPlayer[0].pagoUno = this.amount;
                this.historyCuotasPlayer[0].datePagoUno = 'Hoy';
                break;
              case '2':
                this.historyCuotasPlayer[0].pagoDos = this.amount;
                this.historyCuotasPlayer[0].datePagoDos = 'Hoy';
                break;
              case '3':
                this.historyCuotasPlayer[0].pagoTres = this.amount;
                this.historyCuotasPlayer[0].datePagoTres = 'Hoy';
                break;
              case '4':
                this.historyCuotasPlayer[0].pagoRopa = this.amount;
                this.historyCuotasPlayer[0].datePagoRopa = 'Hoy';
                this.conRopa = 'Si';
                break;
              default:
                this.historyCuotasPlayer[0].pagoUno = this.amount;
                this.historyCuotasPlayer[0].datePagoUno = 'Hoy';
                break;
            }
            this.historyCuotasPlayer[0].totalPagado = (Number(this.historyCuotasPlayer[0].totalPagado) + Number(this.amount)).toString();
            this.restante = Number(this.historyCuotasPlayer[0].totalCuota) - Number(this.historyCuotasPlayer[0].totalPagado);
            
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

  // Método para inicializar el DataTable
  inicializarDataTable(): void {
    // Destruir el DataTable si ya existe
    const $dataTable = $('#dataTable');
    if ($dataTable.hasClass('dataTable')) {
      $dataTable.DataTable().destroy();
    }

    this.http.get('assets/dataTable/Spanish.json').subscribe((translation) => {
      $(document).ready(function () {
        $('#dataTable').DataTable({
          paging: true,
          pageLength: 25,
          searching: true,
          ordering: true,
          order: [[0, 'desc']],
          columnDefs: [
            {
              targets: [0],
              visible: false
            }
          ],
          language: translation
        });
      });
    });

    this.moverElementosDataTable('dataTable');
  }


  moverElementosDataTable(name: string) {
    // **Move buttons outside the table after initialization**
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElements = this.elementRef.nativeElement.querySelectorAll('.dt-layout-row:not(.dt-layout-table)');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#button_datatable');

        if (layoutRowElements.length >= 2 && buttonDatatableElement) {
          const layoutRowElement = layoutRowElements[1]; // Obtener el segundo elemento
          $(layoutRowElement).appendTo(buttonDatatableElement);
          observer.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    observer.observe(this.elementRef.nativeElement, { childList: true, subtree: true });

    //esto es para agregar una clase
    const textcenter = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const dataTableElement = document.querySelector('#' + name);

        if (dataTableElement) {
          dataTableElement.classList.add('text-center');
          textcenter.disconnect(); // Detiene la observación después de encontrar el elemento
        }
      });
    });

    textcenter.observe(document.body, { childList: true, subtree: true });


    //esto es para la parte donde pones las filas a ver
    const length = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement = this.elementRef.nativeElement.querySelector('.dt-length');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#dt-length');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          length.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    length.observe(this.elementRef.nativeElement, { childList: true, subtree: true });

    //esto es para el input del buscador
    const search = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement = this.elementRef.nativeElement.querySelector('.dt-search');
        const buttonDatatableElement = this.elementRef.nativeElement.querySelector('#dt-search');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          search.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    search.observe(this.elementRef.nativeElement, { childList: true, subtree: true });
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

  onAmountChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    this.selectedText = selectedOption.text;
  }

}
