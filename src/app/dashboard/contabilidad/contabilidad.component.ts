import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { CuotasClub, HistorialPagosPlayer, HistoryCuotasClub } from 'src/app/core/services/models/club.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ClubCuotas, HostoryPagosPlayer, PlayerCuotas, TotalesCuotas } from 'src/app/core/services/team/club.model';
import * as XLSX from "xlsx";
import { TranslateService } from '@ngx-translate/core';
import { getSeasons, getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';

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

  get imageBaseUrlUser(): string {
    return environment.images + 'user/';
  }

  showAlert: boolean = false;
  showAlertHistory: boolean = false;
  isFraccionadoPlayer: boolean = false;

  historyPlayer: any;
  showModalStripe = false;

  email: string = '';

  clubCuotas: ClubCuotas = new ClubCuotas({});

  listHCP: any[] = []; //lista historial cuotas de los jugadores
  showModalVerHistorialPagosPlayer = false;
  historyPagosPlayer: any[] = [];
  playerCuotas: PlayerCuotas = new PlayerCuotas({});
  infoClub: CuotasClub = new CuotasClub({});
  agregarPagoPlayer: HostoryPagosPlayer = new HostoryPagosPlayer({});
  textoInfoTitlePagoPlayer: string = '';
  indexPlayerSelected: number = 0;
  optionSelected: number = 0;

  selectedComboTitle: number = 0;
  comboTitle: string = 'Equipos';
  listTeamsForCombo: any[] = [];

  teamSelected: number = 0;
  categorySelected: number = 0;
  aceptStripe = false;
  totales: TotalesCuotas = new TotalesCuotas({});;
  hayRopa = false;
  recalcular = false;

  seasons = getSeasons();
  temporadaStoredValue = getCurrentSeasonString();
  botonDeshabilitado: boolean = false;
  numCuotas = 0;
  totalCuota = '';
  cuotaRopa = '';
  cuotaRopaDate = '';
  btnPagar = true;

  // Search & filter
  searchTerm = '';
  filteredList: any[] = [];

  // Sorting
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage = 1;
  pageSize = 50;
  pageSizeOptions = [25, 50, 100, 200];

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private clubService: ClubService,
    private registerService: RegisterService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private translate: TranslateService) { }

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

    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    //cargar aqui todos los jugadores que pertenezcan al equipo que pertyenezca a ese club

    this.teamService.GetPlayersByTeamByClub(this.clubId.toString(), this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listHCP = response.data.list;
          this.totales = response.data.totales;
          if (this.totales.cuotaRopa != '0€') this.hayRopa = true;
          this.filteredList = [...this.listHCP];
          this.datosCargados = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );

    this.teamService.getTeamsByClubForCombo(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listTeamsForCombo = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Angular table: filter, sort, pagination
  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredList = [...this.listHCP];
    } else {
      this.filteredList = this.listHCP.filter(p =>
        (p.nombre?.toLowerCase().includes(term)) ||
        (p.apellido?.toLowerCase().includes(term)) ||
        (p.teamName?.toLowerCase().includes(term))
      );
    }
    this.sortData();
    this.currentPage = 1;
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortData();
  }

  private sortData(): void {
    if (!this.sortColumn) return;
    this.filteredList.sort((a, b) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedList(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredList.length / this.pageSize);
  }

  get pages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/inicio']);
        break;
      case 2:
        this.router.navigate(['/dashboard/abonados', this.clubId]);
        break;
    }
  }

  cerrarModal() {
    this.showModal = false;
  }

  abrirModal() {
    let temporada = this.infoClub.temporada === '' ? this.temporadaStoredValue : this.infoClub.temporada;
    this.clubService.getClubCuota(this.clubId.toString(), temporada === null ? '2025' : temporada).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.infoClub = response.data.infoClub;
          this.clubCuotas = response.data.cuotaClub;
          this.numCuotas = this.clubCuotas.numCuotas;
          this.totalCuota = this.clubCuotas.totalCuota;
          //this.clubCuotas.temporada = response.data.temporada === null ? temporada : response.data.temporada;
        } else {
          this.clubCuotas = new ClubCuotas({});
        }
        this.showModal = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  getInfoClub() {
    let temporada = this.temporadaStoredValue;
    this.clubService.getClubCuota(this.clubId.toString(), temporada).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.infoClub = response.data.infoClub;
          if (this.infoClub.banco != null) {
            this.showModalStripe = true;
          } else {
            this.showModal = true;
          }
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  createUpdateSettings() {
    let option = this.selectedComboTitle;
    let value = option === 0 ? this.teamSelected : this.categorySelected;
    alert(this.translate.instant('ACCOUNTING.ALERTS.OPERATION_WAIT'));
    this.botonDeshabilitado = true;
    //esto actualiza la info del club, el IBAN, etc
    this.teamService.createUpdateCuotaClub(this.infoClub, option, value).subscribe(
      (response) => {
        this.infoClub = response.data;
        this.clubService.updateclubCuotas(this.clubCuotas, option, value).subscribe(
          (response) => {
            this.clubCuotas = response.data;
            this.recalcular = true;
            /*this.hayRopa = this.clubCuotas.cuotaRopa != '0€' ? true : false;
            
            this.totales.cuotaRopa = this.clubCuotas.cuotaRopa;
            this.totales.cuotaClub = this.clubCuotas.cuotaClub;
            this.totales.restante = this.clubCuotas.restante;
            this.totales.pagado = this.clubCuotas.pagado;*/

            this.teamService.GetPlayersByTeamByClub(this.clubId.toString(), this.temporadaStoredValue).subscribe(
              (response: Response) => {
                // Verifica que la propiedad 'data' exista en la respuesta
                if (response.data !== null) {
                  this.updateCuotaClub(response.data.list);
                  alert(this.translate.instant('ACCOUNTING.ALERTS.SAVED_OK'));
                  this.botonDeshabilitado = false;
                  //this.guardar();
                } else {
                  console.error('La respuesta del servicio no tiene la estructura esperada', response);
                }
              },
              (error) => {
                console.error('Error al cargar el listado de equipos', error);
              }
            );
          },
          (error) => {
            console.error('Error al crear el equipo:', error);
            // Puedes manejar el error según tus necesidades
          }
        );
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  updateCuotaClub(responseData: any[]): void {
    responseData.forEach((responsePlayer: any) => {
      const index = this.listHCP.findIndex((hcpPlayer: any) => hcpPlayer.playerId === responsePlayer.playerId);
      if (index !== -1) {
        this.listHCP[index].cuotaClub = responsePlayer.cuotaClub;
        this.listHCP[index].cuotaRopa = responsePlayer.cuotaRopa;
        this.listHCP[index].restante = responsePlayer.restante;
      }
    });
    this.applyFilter();
  }

  selecFraccionado() {
    //this.isFraccionado = this.cuota.fraccionado.toString() === "0" ? false : true;
  }

  selecFraccionadoPlayer() {
    //this.isFraccionadoPlayer = this.historyPlayer.fraccionado.toString() === "0" ? false : true;
  }

  invitarJugador(player: any): void {
    this.selectedPlayerId = player.playerId;
    this.selectedTeamId = player.teamId;
    this.nombreJugador = player.nombre + ' ' + player.apellido;

    // Calcular la fecha actual
    const fechaActual = new Date();

    // Calcular la fecha de nacimiento del jugador
    const fechaNacimiento = new Date(player.fechaDeNacimiento);

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
      let menor = 1;
      /*if (this.isMenor) {
        menor = 1;
      }*/

      const normalizedEmail = this.normalizeEmail(this.userForm.value.mail);

      this.registerService.invitePlayer(normalizedEmail, this.selectedPlayerId, menor, this.selectedTeamId).pipe().subscribe(
        res => {
          this.cerrarModalInvitar();
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'bottom';
          this.snackBar.open(this.translate.instant('ACCOUNTING.ALERTS.INVITE_SENT'), this.translate.instant('COMMON.CLOSE'), snackBarConfig);
        }
      )
    }
  }

  removeAccents(text: string) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  normalizeEmail(email: string) {
    // Elimina las tildes de toda la cadena de correo electrónico
    return this.removeAccents(email.toLowerCase());
  }

  openModalEditar(player: any, index: number) {
    this.indexPlayerSelected = index;
    this.clubService.getPlayerCuota(this.clubId, player.playerId, player.temporada).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.playerCuotas = response.data;
        } else {
          this.historyPlayer = new HistoryCuotasClub({});
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
    this.showModalJugador = true;
  }

  cerrarModalJugador() {
    this.showModalJugador = false;
  }

  createUpdateCuotaJugador() {
    this.clubService.updatePlayerCuotas(this.playerCuotas, this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          //actualizamos los campos de pagado y restante
          this.listHCP[this.indexPlayerSelected].cuotaClub = response.data.cuotaClub;
          this.listHCP[this.indexPlayerSelected].cuotaRopa = response.data.cuotaRopa;
          this.listHCP[this.indexPlayerSelected].restante = response.data.cuotaClub;
          this.agregarPagoPlayer = new HostoryPagosPlayer({});
          this.guardar();
          this.recalcular = true;
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
    /*this.showAlert = true;
    setTimeout(() => {
      this.showAlert = false;
    }, 2000);*/
    alert('Guardado correctamente');
    this.botonDeshabilitado = false;
  }

  openModalPago(player: any, index: number) {
    this.indexPlayerSelected = index;
    this.agregarPagoPlayer = new HostoryPagosPlayer({});
    this.agregarPagoPlayer.clubId = this.clubId;
    this.agregarPagoPlayer.playerId = player.playerId;
    this.textoInfoTitlePagoPlayer = player.nombre + ' ' + player.apellido;
    this.showModalAgregarPago = true;
  }

  cerrarModalAgregarPago() {
    this.showModalAgregarPago = false;
  }

  openModalVerPagosPlayer(player: any, index: number) {
    this.indexPlayerSelected = index;
    //this.playerSelected = player;
    this.clubService.getHistoryPagosPlayer(this.clubId, player.playerId, player.temporada).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null && response.data.length > 0) {
          this.historyPagosPlayer = response.data;
          /*this.historyPlayer = response.data;
          this.isFraccionadoPlayer = this.historyPlayer.fraccionado === '1' ? true : false;*/
        } else {
          this.historyPagosPlayer = [];
        }
        this.showModalVerHistorialPagosPlayer = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalVerPagosPlayer() {
    this.showModalVerHistorialPagosPlayer = false;
  }

  createUpdateHistoryCuotaJugador() {
    if (this.agregarPagoPlayer.cantidad == null || this.agregarPagoPlayer.fecha == null) {
      alert(this.translate.instant('ACCOUNTING.ALERTS.AMOUNT_DATE_REQUIRED'));
    } else {
      this.btnPagar = false;
      this.clubService.updatehistorypagosplayer(this.agregarPagoPlayer).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            //actualizamos los campos de pagado y restante
            this.listHCP[this.indexPlayerSelected].pagado = (Number(this.listHCP[this.indexPlayerSelected].pagado) + Number(this.agregarPagoPlayer.cantidad));
            this.listHCP[this.indexPlayerSelected].restante = (Number(this.listHCP[this.indexPlayerSelected].cuotaClub) - Number(this.listHCP[this.indexPlayerSelected].pagado));
            //this.agregarPagoPlayer = new HostoryPagosPlayer({});
            alert(this.translate.instant('ACCOUNTING.ALERTS.SAVED_OK'));
            this.btnPagar = true;
            this.recalcular = true;
            this.cerrarModalAgregarPago();
          } else {
            console.error('La respuesta del servicio no tiene la estructura esperada', response);
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
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

  openModalStripe() {
    this.getInfoClub();
  }

  cerrarModalStripe() {
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

  goStripeURL() {
    window.open('https://connect.stripe.com/login', '_blank');
  }

  toggleComboTitle() {
    this.selectedComboTitle = this.selectedComboTitle == 0 ? 1 : 0;
    this.comboTitle = this.selectedComboTitle == 0 ? 'Equipos' : 'Categorias';
  }

  loadCuotaClub() {
    let temporada = this.infoClub.temporada === '' ? this.temporadaStoredValue : this.infoClub.temporada;
    this.clubService.getClubCuotaForLoadTeam(this.clubId, temporada, this.teamSelected).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.infoClub = response.data.infoClub;
          this.clubCuotas = response.data.cuotaClub;
          //this.clubCuotas.temporada = response.data.temporada === null ? temporada : response.data.temporada;
        } else {
          this.clubCuotas = new ClubCuotas({});
        }
        this.showModal = true;
        console.log(this.clubCuotas);
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  validateNumber(event: any, key: number): void {
    // Obtener el valor actual del input
    const value = event.target.value;

    // Reemplazar cualquier carácter que no sea un dígito
    event.target.value = value.replace(/[^0-9]/g, '');

    switch (key) {
      case 1:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaUno = event.target.value;
        break;
      case 2:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaDos = event.target.value;
        break;
      case 3:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaTres = event.target.value;
        break;
      case 4:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaCuatro = event.target.value;
        break;
      case 5:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaCinco = event.target.value;
        break;
      case 6:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaSeis = event.target.value;
        break;
      case 7:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaSiete = event.target.value;
        break;
      case 8:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaOcho = event.target.value;
        break;
      case 9:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaNueve = event.target.value;
        break;
      case 10:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaDiez = event.target.value;
        break;
      case 11:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaOnce = event.target.value;
        break;
      case 12:
        // Actualizar el valor del ngModel
        this.clubCuotas.cuotaDoce = event.target.value;
        break;
      case 20:
        // Actualizar el valor del ngModel
        this.agregarPagoPlayer.cantidad = event.target.value;
        break;
    }
  }

  @ViewChild("table1") table: ElementRef | undefined;
  exportTableToExcel(): void {
    // Comprobar si el elemento existe antes de usar su ID
    const tableElement = document.getElementById('tablaExcel');

    if (tableElement) {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableElement);

      // Resto del código (asegurar formato de cadena, ancho de columnas, etc.)
      // ... (puedes copiar y pegar el código de la respuesta anterior)

      // Crear y guardar libro de trabajo
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      // Personalizar nombre de archivo y opciones de guardado (opcional)
      const fileName = "tabla_exportada.xlsx"; // Ajustar según tus necesidades
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
    } else {
      console.error("¡Elemento 'tablaExcel' no encontrado!");
      // Manejar el error de forma adecuada (opcional)
      // Por ejemplo, mostrar un mensaje de alerta al usuario
    }
  }

  confirmReturnPay(pago: any) {
    console.log(pago);
    const confirmacion = confirm(this.translate.instant('ACCOUNTING.ALERTS.CONFIRM_REFUND'));

    if (confirmacion) {
      this.returnPay(pago);
    }
  }

  returnPay(pago: any) {
    this.clubService.devolverHistoryPagosPlayer(pago).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          setTimeout(() => {
            this.listHCP[this.indexPlayerSelected].pagado = response.data.pagado;
            this.listHCP[this.indexPlayerSelected].restante = response.data.restante;
          }, 1000);
          this.showModalVerHistorialPagosPlayer = false;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }
}


