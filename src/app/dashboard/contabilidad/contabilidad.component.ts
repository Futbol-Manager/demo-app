import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { HttpClient } from '@angular/common/http';
import * as $ from 'jquery';
import 'datatables.net';
import { CuotasClub, HistoryCuotasClub } from 'src/app/core/services/models/club.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Component({
  selector: 'app-contabilidad',
  templateUrl: './contabilidad.component.html',
  styleUrls: ['./contabilidad.component.scss']
})
export class ContabilidadComponent implements OnInit {
  usuarioActual!: User | null;
  clubId!: number;  // Ajusta el valor según el clubId del equipo actual
  userId!: number;

  players: any[] = [];
  playerSelected: any;
  jugador: any =
    { playerId: 0, picturePlayer: '', nombre: 'Nombre1', apellido: 'Apellido1', nameTeam: 'Equipo1', verify: 0, cuota: 0, cuotaSinRopa: 0, teamId: 0 };
  cuota: CuotasClub = new CuotasClub({});

  datosCargados: boolean = false;

  showModal: boolean = false;
  showModalJugador: boolean = false;
  isFraccionado: boolean = false;
  showModalInvitar = false;
  showModalAgregarPago = false;

  nombreJugador: string = '';
  isMenor: boolean = false;
  correoElectronico: string = '';
  selectedPlayerId: number = 0;
  selectedTeamId: number = 0;

  userForm: FormGroup = this.fb.group({
    mail: ['', Validators.email],
  });

  showAlert: boolean = false;
  showAlertHistory: boolean = false;
  isFraccionadoPlayer: boolean = false;

  historyPlayer: HistoryCuotasClub = new HistoryCuotasClub({});
  showModalStripe = false;
  
  email: string = '';

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private elementRef: ElementRef,
    private http: HttpClient,
    private registerService: RegisterService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de clubId de los parámetros
        this.clubId = +params['clubId'];  // El + convierte el valor a número
        console.log('clubId:', this.clubId);
      });
    });

    //cargar aqui todos los jugadores que pertenezcan al equipo que pertyenezca a ese club

    this.teamService.GetPlayersByTeamByClub(this.clubId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.players = response.data.players !== null ? response.data.players : [];
          this.cuota = response.data.cuotas !== null ? response.data.cuotas : new CuotasClub({});
          this.isFraccionado = this.cuota.fraccionado === 1 ? true : false;
          setTimeout(() => {
            this.inicializarDataTable();
            this.datosCargados = true;
          }, 1000);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
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
          pageLength: 100,
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

  irAPantalla(id: number): void {
    if (id === 1) {
      this.router.navigate(['/dashboard/inicio']);
    }
  }

  cerrarModal() {
    this.showModal = false;
  }

  abrirModal() {
    this.showModal = true;
  }

  createUpdateSettings() {
    this.cuota.clubId = this.clubId;
    this.teamService.createUpdateCuotaClub(this.cuota,).subscribe(
      (response) => {
        this.cuota = response.data;
        // Cerrar el modal después de crear el equipo
        this.cerrarModal();
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  selecFraccionado() {
    this.isFraccionado = this.cuota.fraccionado.toString() === "0" ? false : true;
  }

  selecFraccionadoPlayer() {
    this.isFraccionadoPlayer = this.historyPlayer.fraccionado.toString() === "0" ? false : true;
  }

  invitarJugador(playerId: number, teamId: number): void {
    this.selectedPlayerId = playerId;
    this.selectedTeamId = teamId;
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);

    this.nombreJugador = jugadorSeleccionado.nombre;

    // Calcular la fecha actual
    const fechaActual = new Date();

    // Calcular la fecha de nacimiento del jugador
    const fechaNacimiento = new Date(jugadorSeleccionado.fechaDeNacimiento);

    // Calcular la edad del jugador
    let edad = fechaActual.getFullYear() - fechaNacimiento.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;
    const mesNacimiento = fechaNacimiento.getMonth() + 1;

    // Si el mes actual es menor que el mes de nacimiento o si es el mismo mes pero el día actual es menor que el día de nacimiento,
    // entonces el jugador no ha cumplido años todavía
    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && fechaActual.getDate() < fechaNacimiento.getDate())) {
      edad--;
    }

    // Comprobar si el jugador es menor de 14 años
    this.isMenor = edad < 14;
    this.showModalInvitar = true;
  }

  cerrarModalInvitar() {
    this.showModalInvitar = false;
  }

  enviarMailJugador() {
    if (this.userForm.valid) {
      let menor = 0;
      if (this.isMenor) {
        menor = 1;
      }
      this.registerService.invitePlayer(this.userForm.value.mail, this.selectedPlayerId, menor, this.selectedTeamId).pipe().subscribe(
        res => {
          this.cerrarModalInvitar();
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'bottom';
          this.snackBar.open('Invitación enviada correctamente.', 'Cerrar', snackBarConfig);
        }
      )
    }
  }

  openModalEditar(playerId: any) {
    this.jugador = this.players.find(player => player.playerId === playerId);
    this.showModalJugador = true;
  }

  cerrarModalJugador() {
    this.showModalJugador = false;
  }

  createUpdateCuotaJugador() {
    this.teamService.createUpdateCuotaPlayer(this.jugador.playerId.toString(), this.jugador.cuota, this.jugador.cuotaSinRopa).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.guardar();
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  guardar() {
    this.showAlert = true;
    setTimeout(() => {
      this.showAlert = false;
    }, 2000);
  }

  openModalPago(player: any) {
    this.playerSelected = player;
    this.teamService.getHistoryCuotaClubByPlayer(player.playerId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.historyPlayer = response.data;
          this.isFraccionadoPlayer = this.historyPlayer.fraccionado === '1' ? true : false;
        } else {
          this.historyPlayer = new HistoryCuotasClub({});
        }
        this.showModalAgregarPago = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalAgregarPago() {
    this.showModalAgregarPago = false;
  }

  createUpdateHistoryCuotaJugador() {
    this.historyPlayer.clubId = this.clubId;
    this.historyPlayer.teamId = this.playerSelected.teamId;
    this.historyPlayer.playerId = this.playerSelected.playerId;
    let p1 = 0;
    let p2 = 0;
    let p3 = 0;
    p1 = this.historyPlayer.pagoUno !== null ? parseInt(this.historyPlayer.pagoUno) : 0;
    p2 = this.historyPlayer.pagoDos !== null ? parseInt(this.historyPlayer.pagoDos) : 0;
    p3 = this.historyPlayer.pagoTres !== null ? parseInt(this.historyPlayer.pagoTres) : 0;
    let total = p1 + p2 + p3;
    this.historyPlayer.totalPagado = total.toString();
    if (this.historyPlayer.estado === null) {
      this.historyPlayer.estado = 'No ha pagado nada';
    }

    if(this.historyPlayer.pagoConRopa === '0'){
      this.historyPlayer.totalCuota = this.playerSelected.cuota;
    }
    this.teamService.createUpdateHistoryCuotasClub(this.historyPlayer).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.historyPlayer = response.data;
          if (this.historyPlayer.datePagoUno !== null && this.historyPlayer.datePagoUno !== undefined && this.historyPlayer.datePagoUno.length > 10) {
            this.historyPlayer.datePagoUno = response.data.datePagoUno.substring(0, 10)
          }
          if (this.historyPlayer.datePagoDos !== null && this.historyPlayer.datePagoDos !== undefined && this.historyPlayer.datePagoDos.length > 10) {
            this.historyPlayer.datePagoDos = response.data.datePagoDos.substring(0, 10)
          }
          if (this.historyPlayer.datePagoTres !== null && this.historyPlayer.datePagoTres !== undefined && this.historyPlayer.datePagoTres.length > 10) {
            this.historyPlayer.datePagoTres = response.data.datePagoTres.substring(0, 10)
          }
          //TODO recuperar el player de la tabla y modificar su restante y demas, de paso echarle un ojo para corregir esa parte
          this.showAlertHistory = true;
          setTimeout(() => {
            this.showAlertHistory = false;
          }, 2000);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
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

  openModalStripe(){
    this.showModalStripe = true;
  }

  cerrarModalStripe(){
    this.showModalStripe = false;
  }

  onSubmit() {
    if (this.email) {
      this.teamService.createAccountStripe(this.email, this.clubId).subscribe(
        (response: any) => {
          if (response.data) {
            window.open(response.data.url, '_blank');
          } else {
            alert('Error: ' + response.error);
          }
        },
        (error) => {
          alert('An error occurred: ' + error.message);
          console.log(error);
        }
      );
    }
  }

}
