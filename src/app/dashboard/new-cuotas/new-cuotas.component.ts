import { Component, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubCuotas } from 'src/app/core/services/team/club.model';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { CuotasClub } from 'src/app/core/services/models/club.model';

@Component({
  selector: 'app-new-cuotas',
  templateUrl: './new-cuotas.component.html',
  styleUrls: ['./new-cuotas.component.scss']
})
export class NewCuotasComponent implements OnInit {

  datosCargados = false;
  temporadaStoredValue = '2025';
  clubId = 0;
  showModalBanco = false;
  bancoClubData: any = {};
  listaCuotas: any[] = [];
  showModalCuotas = false;
  filtroTitulo: string = '';
  filtroObligatoria: 'todas' | 'si' | 'no' = 'todas';
  showModalCuota = false;
  cuotaSeleccionada = false;
  nuevaCuota: any = {};

  listTeams: any[] = [];
  /*{ value: number; name: string }[] = [
    { value: 1, name: 'Alevín A' },
    { value: 2, name: 'Alevín B' },
    { value: 3, name: 'Infantil' }
  ];*/

  listTeamsSelecteds: number[] = [];
  filtro: string = '';
  listaPlayersFiltrados: any[] = [];
  listHistoryPagos: any[] = [];
  listaPlayers: any[] = [];
  ordenActual: string = '';
  ascendente: boolean = true;
  isLoading: boolean = true; // o false según el caso
  addPago: any = {};
  textoInfoTitlePagoPlayer = '';
  showModalAddPago = false;
  playerSelected = 0;
  showModalHistorialPagos = false;

  comentarioDevolucion = '';
  metodoDevolucion = '';
  pagoDevolucion: any = {};
  showConfirmDevolucion = false;
  listaCuotasAsignadas: any[] = [];
  showModalCuotasAsignadas = false;

  email: string = '';
  aceptStripe = false;
  showModalStripe = false;
  infoClub: any = {};

  // Modal state
  showModalCuotasJugador = false;
  // Combo de todas las cuotas disponibles para asignar
  listAllCuotas: Array<{ pagoClubId: number; titulo: string }> = [];
  // ID seleccionado en el combo
  cuotaSeleccionadaId: number | null = null;
  // Lista de cuotas ya asignadas al jugador
  listCuotasPlayerPersonal: any[] = []; // usa tu DTO si lo tienes
  showModalEditarCuotaPlayer = false;

  cuotaPlayerEdit: any = {
    // ejemplo de estructura; se sobreescribe al abrir
    pagoClubId: 0,
    titulo: '',
    descripcion: '',
    importe: '',
    fechaLimite: '',
    obligatorio: 0 // o boolean si lo manejas como boolean
  };

  playerIndex = 0;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private clubService: ClubService,
    private teamService: TeamService,) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de clubId de los parámetros
        this.clubId = +params['clubId'];  // El + convierte el valor a número
        //console.log('clubId:', this.clubId);
      });
    });

    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    this.clubService.getListPlayersPagosClub(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaPlayers = response.data;
          this.listaPlayersFiltrados = [...this.listaPlayers];
        }
        this.isLoading = false;
        //this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  filtrarJugadores() {
    const texto = this.filtro.toLowerCase();
    this.listaPlayersFiltrados = this.listaPlayers.filter(p =>
    (`${p.nombre} ${p.apellido}`.toLowerCase().includes(texto) ||
      p.nameTeam.toLowerCase().includes(texto))
    );
  }

  ordenarPor(campo: string) {
    if (this.ordenActual === campo) {
      this.ascendente = !this.ascendente;
    } else {
      this.ordenActual = campo;
      this.ascendente = true;
    }

    this.listaPlayersFiltrados.sort((a, b) => {
      const valA = a[campo] || '';
      const valB = b[campo] || '';
      return this.ascendente ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  openModalPago(player: any, index: number) {
    this.playerSelected = player.playerId;
    this.addPago = {};
    this.textoInfoTitlePagoPlayer = player.nombre;
    this.clubService.getListPagosClubForPlayer(this.clubId, this.temporadaStoredValue, player.playerId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaCuotas = response.data;
        }
        this.showModalAddPago = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openModalVerPagosPlayer(player: any, index: number) {
    this.clubService.getListHistoryPagosByPlayer(this.clubId, this.temporadaStoredValue, player.playerId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listHistoryPagos = response.data;
          this.showModalHistorialPagos = true;
        }
        this.isLoading = false;
        //this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalHistorialPagos() {
    this.listHistoryPagos = [];
    this.showModalHistorialPagos = false;
  }

  openModalEditar(player: any) {
    this.playerSelected = player.playerId;
    this.clubService.getListPagosClubForPlayer(this.clubId, this.temporadaStoredValue, player.playerId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listCuotasPlayerPersonal = response.data;
        }
        this.clubService.getListPagosClub(this.clubId, this.temporadaStoredValue).subscribe(
          (response: Response) => {
            // Verifica que la propiedad 'data' exista en la respuesta
            if (response.data !== null) {
              this.listAllCuotas = response.data;
            }
            this.showModalCuotasJugador = true;
          },
          (error) => {
            console.error('Error al cargar el listado de equipos', error);
          }
        );
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  goBack(): void {
    this.location.back();
  }

  openModalBancoClub() {
    this.clubService.getBancoClub(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.bancoClubData = response.data;
          //this.infoClub = response.data.infoClub;
          //this.clubCuotas.temporada = response.data.temporada === null ? temporada : response.data.temporada;
        }
        this.showModalBanco = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalBancoClub() {
    this.showModalBanco = false;
  }

  guardarBancoClubData() {
    this.clubService.updateBancoClub(this.bancoClubData).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.bancoClubData = response.data;
          alert('Datos guardados correctamente');
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openModalCuotas() {
    this.clubService.getListPagosClub(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaCuotas = response.data;
        }
        this.showModalCuotas = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cuotasFiltradas(): any[] {
    return this.listaCuotas.filter(cuota => {
      const coincideTitulo = this.filtroTitulo.trim() === '' ||
        cuota.titulo.toLowerCase().includes(this.filtroTitulo.toLowerCase());

      const coincideObligatoria =
        this.filtroObligatoria === 'todas' ||
        (this.filtroObligatoria === 'si' && cuota.obligatorio) ||
        (this.filtroObligatoria === 'no' && !cuota.obligatorio);

      return coincideTitulo && coincideObligatoria;
    });
  }

  cerrarModalCuotas() {
    this.showModalCuotas = false;
  }

  editarCuota(cuota: any) {
    this.showModalCuota = true;
    this.cuotaSeleccionada = true;
    this.nuevaCuota = cuota;
    this.rellenarCombo(cuota);
  }

  eliminarCuota(cuota: any, index: number): void {
    const ok = confirm(`¿Eliminar el pago "${cuota.titulo}"?`);
    if (!ok) return;

    this.clubService.deletePagoClub(cuota.pagoClubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data) {
          this.listaCuotas.splice(index, 1);
          this.reloadTabla();
        } else {
          alert(response.error.msg);
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  abrirModalCuota() {
    this.listTeamsSelecteds = [];
    this.cuotaSeleccionada = false;
    this.nuevaCuota = {
      PagoClubId: 0, clubId: this.clubId, temporada: this.temporadaStoredValue,
      dateCreate: null, dateEdit: null, titulo: null, descripcion: null, obligatorio: 0, importe: null,
      fechaLimite: null, stripe: null
    };

    this.rellenarCombo(null);
  }

  cerrarModalCuota() {
    this.showModalCuota = false;
  }

  guardarCuota() {
    if (this.listTeamsSelecteds.length == 0) {
      alert('Por favor, selecciona mínimo un equipo.');
    } else {
      if (this.nuevaCuota.titulo && this.nuevaCuota.titulo != ''
        && this.nuevaCuota.descripcion && this.nuevaCuota.descripcion != ''
        && this.nuevaCuota.importe && this.nuevaCuota.importe != ''
        && this.nuevaCuota.fechaLimite && this.nuevaCuota.fechaLimite != '') {

        // 🔁 Conversión explícita
        this.nuevaCuota.importe = String(this.nuevaCuota.importe);
        this.nuevaCuota.obligatorio = this.nuevaCuota.obligatorio ? 1 : 0;
        this.nuevaCuota.listTeams = this.listTeamsSelecteds;
        this.clubService.createUpdatePagoClub(this.nuevaCuota).subscribe(
          (response: Response) => {
            // Verifica que la propiedad 'data' exista en la respuesta
            if (response.data !== null) {
              if (!this.cuotaSeleccionada) this.listaCuotas.push(response.data);

              this.reloadTabla();
              alert('Datos guardados correctamente');
              this.cerrarModalCuota();
            }
          },
          (error) => {
            console.error('Error al cargar el listado de equipos', error);
          }
        );
      } else {
        alert('Rellena todos los campos.');
      }
    }
  }

  rellenarCombo(cuota: any) {
    this.teamService.getTeamsByClubForCombo(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listTeams = response.data;
          if (cuota) {
            this.listTeamsSelecteds = cuota.listTeams;
          }
          this.showModalCuota = true;

        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Opcional: para mostrar los nombres de los equipos seleccionados
  getTeamNameById(id: number): string {
    const found = this.listTeams.find(t => t.value === id);
    return found ? found.name : 'Desconocido';
  }

  toggleTeamSelection(teamId: number): void {
    const index = this.listTeamsSelecteds.indexOf(teamId);
    if (index >= 0) {
      this.listTeamsSelecteds.splice(index, 1);
    } else {
      this.listTeamsSelecteds.push(teamId);
    }
  }

  isAllSelected(): boolean {
    return this.listTeamsSelecteds.length === this.listTeams.length;
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.listTeamsSelecteds = [];
    } else {
      this.listTeamsSelecteds = this.listTeams.map(t => t.value);
    }
  }

  createUpdateHistoryCuotaJugador() {
    if (this.addPago) {
      if (this.addPago.importe && this.addPago.metodo && this.addPago.datePago) {
        this.addPago.temporada = this.temporadaStoredValue;
        this.addPago.playerId = this.playerSelected;
        this.addPago.clubId = this.clubId;
        this.clubService.createPagoHistoryPlayer(this.addPago).subscribe(
          (response: Response) => {
            // Verifica que la propiedad 'data' exista en la respuesta
            if (response.data !== null && response.status == 200) {
              this.addPago = {};
              this.reloadTabla();
              alert('Datos guardados correctamente');
            } else {
              alert(response.error.msg);
            }
          },
          (error) => {
            console.error('Error al cargar el listado de equipos', error);
          }
        );
      } else {
        alert('Rellena minimo el importe, la fecha y el método de pago.');
      }
    } else {
      alert('Rellena los campos.');
    }
  }

  cerrarModalAddPago() {
    this.showModalAddPago = false;
  }

  actualizarImporte(): void {
    const cuotaSeleccionada = this.listaCuotas.find(c => c.pagoClubId === +this.addPago.pagoClubId);
    if (cuotaSeleccionada) {
      this.addPago.importe = cuotaSeleccionada.importe;
      this.addPago.totalPagado = cuotaSeleccionada.importe;
    }
  }

  cancelarDevolucion() {
    this.comentarioDevolucion = '';
    this.metodoDevolucion = '';
    this.pagoDevolucion = {};
    this.showConfirmDevolucion = false;
  }

  devolverPagoClub(historyPago: any) {
    this.pagoDevolucion = historyPago;
    this.showConfirmDevolucion = true;
    this.playerSelected = historyPago.playerId;
  }

  okDevolverPagoClub() {
    if (!this.metodoDevolucion || this.comentarioDevolucion == null || this.comentarioDevolucion == undefined || this.comentarioDevolucion == '') {
      alert('Debes seleccionar un método de devolución y explicar por qué.');
      return;
    }

    const pago = {
      clubId: this.clubId,
      temporada: this.temporadaStoredValue,
      playerId: this.playerSelected,
      pagoClubId: this.pagoDevolucion.pagoClubId,
      comentario: this.comentarioDevolucion,
      metodo: this.metodoDevolucion
    };

    this.clubService.devolverPagoClubById(pago).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null && response.status == 200) {
          console.log(response.data);
          this.listHistoryPagos.push(response.data);
          this.comentarioDevolucion = '';
          this.metodoDevolucion = '';
          this.pagoDevolucion = {};
          this.isLoading = true;
          this.reloadTabla();
          this.showConfirmDevolucion = false;
          alert('Devolución hecha correctamente');
        } else {
          alert(response.error.msg);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  reloadTabla() {
    this.isLoading = true;
    this.clubService.getListPlayersPagosClub(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaPlayers = response.data;
          this.listaPlayersFiltrados = [...this.listaPlayers];
        }
        this.isLoading = false;
        //this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  openModalCuotasAsignadas(player: any) {
    this.clubService.getListPagosClubForPlayer(this.clubId, this.temporadaStoredValue, player.playerId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaCuotasAsignadas = response.data;
        }
        this.showModalCuotasAsignadas = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalCuotasAsignadas() {
    this.listaCuotasAsignadas = [];
    this.showModalCuotasAsignadas = false;
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

  getInfoClub() {
    this.clubService.getBancoClub(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.infoClub = response.data;
          if (this.infoClub.banco != null && this.infoClub.banco != '') {
            this.showModalStripe = true;
          } else {
            this.showModalCuotas = true;
          }
          console.log(this.infoClub.urlStripe);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalCuotasJugador(): void {
    this.showModalCuotasJugador = false;
  }

  addCuotaPlayer(): void {
    if (!this.cuotaSeleccionadaId) {
      alert('Selecciona una cuota primero.');
      return;
    }

    const ok = confirm(`¿Añadir el pago del jugador?`);
    if (!ok) return;

    this.clubService.addPagoClubForPlayer(this.cuotaSeleccionadaId, this.playerSelected, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data) {
          this.listCuotasPlayerPersonal.push(response.data);
          this.reloadTabla();
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
    console.log('Añadir cuota al jugador -> pagoClubId:', this.cuotaSeleccionadaId);

    // Aquí haces la llamada al servicio para asignar la cuota al jugador.
    // this.tuService.asignarCuotaAJugador(playerId, this.cuotaSeleccionadaId).subscribe(...)
  }

  editarCuotaPlayer(pago: any, index: number): void {
    const msg = 'Esto no modifica el pago, crea uno nuevo con los datos modificados para poder usar los 2 en un futuro. '
      + 'Para modificar un pago, ir al menú de Pagos.';

    const ok = confirm(`"${msg}" ¿Ok?`);
    if (!ok) return;

    this.playerIndex = index;
    this.cuotaPlayerEdit = pago;
    this.showModalEditarCuotaPlayer = true;
    console.log('Editar cuota del jugador:', pago);
    // Abre tu modal de edición o navega a la vista de edición
  }

  eliminarCuotaPlayer(cuota: any, index: number): void {
    const ok = confirm(`¿Eliminar el pago "${cuota.titulo}" del jugador?`);
    if (!ok) return;
    this.playerIndex = index;

    this.clubService.deletePagoClubForPlayer(cuota.pagoClubId, this.temporadaStoredValue, this.playerSelected).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data) {
          this.listCuotasPlayerPersonal.splice(this.playerIndex, 1);
          this.reloadTabla();
        } else {
          alert(response.error.msg);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );

    console.log('Eliminar cuota del jugador:', cuota);
    // this.tuService.eliminarCuotaDeJugador(playerId, cuota.pagoClubId).subscribe(...)
  }

  guardarEdicionCuotaPlayer() {
    this.clubService.createUpdatePagoClubForPlayer(this.cuotaPlayerEdit, this.playerSelected).subscribe({
      next: (res) => {
        this.reloadTabla();
        alert('Pago modificado correctamente');
        this.showModalEditarCuotaPlayer = false;
        // refrescar lista si hace falta
      },
      error: (err) => {
        console.error(err);
        alert('Error al subir el documento');
      }
    });
  }

  cerrarModalEditarCuotaPlayer() {
    this.showModalEditarCuotaPlayer = false;
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

}
