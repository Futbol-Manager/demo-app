import { Component, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-new-cuotas',
  templateUrl: './new-cuotas.component.html',
  styleUrls: ['./new-cuotas.component.scss'],
})
export class NewCuotasComponent implements OnInit {
  datosCargados = true;
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
  columnaActual: string = '';
  ordenAscendente: boolean = true;

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
  paginaActual = 1;
  itemsPorPagina = 50;

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
    obligatorio: 0, // o boolean si lo manejas como boolean
  };

  playerIndex = 0;

  // Campos de apoyo para mostrar/ocultar
  showStripeConfig = false;
  isSubscription = false;
  accountIdDelClub = '';

  periodos = [
    { value: 'day', label: 'Día' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
  ];

  soloLectura = false;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private clubService: ClubService,
    private teamService: TeamService,
    private translate: TranslateService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user) => {
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe((params) => {
        // Obtener el valor de clubId de los parámetros
        this.clubId = +params['clubId']; // El + convierte el valor a número
        //console.log('clubId:', this.clubId);
      });
    });

    if (
      localStorage.getItem('temporada') != null &&
      localStorage.getItem('temporada') != undefined
    ) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    this.loadTabla();
  }

  loadTabla() {
    this.isLoading = true;
    this.clubService
      .getListPlayersPagosClub(this.clubId, this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          console.log(response.data);
          // eliminar duplicados por playerId
          const uniquePlayers = Array.from(
            new Map(response.data.map((p: any) => [p.playerId, p])).values()
          );

          this.listaPlayers = uniquePlayers;
          this.listaPlayersFiltrados = [...this.listaPlayers];
          this.isLoading = false;
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
  }
  calcularProgreso(player: any): number {
    if (!player.totalAPagar || player.totalAPagar === 0) {
      return 0;
    }

    return Math.min((player.totalPagado / player.totalAPagar) * 100, 100);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaPlayersFiltrados.length / this.itemsPorPagina);
  }

  get paginaInicio(): number {
    return (this.paginaActual - 1) * this.itemsPorPagina;
  }

  get paginaFin(): number {
    const fin = this.paginaInicio + this.itemsPorPagina;
    return fin > this.listaPlayersFiltrados.length
      ? this.listaPlayersFiltrados.length
      : fin;
  }

  get playersPaginados() {
    return this.listaPlayersFiltrados.slice(this.paginaInicio, this.paginaFin);
  }
  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
    }
  }

  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
    }
  }

  cambiarItemsPorPagina() {
    this.itemsPorPagina = Number(this.itemsPorPagina);
    this.paginaActual = 1;
  }

  resetPagosPlayers() {
    this.isLoading = true;
    this.clubService
      .updateInfoPagosPlayer(this.clubId, this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data) {
            this.loadTabla();
            this.toastr.success('Datos actualzados.');
          }
          this.isLoading = false;
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
          this.toastr.error('Error al cargar el listado de equipos');
        }
      );
  }

  filtrarJugadores() {
    const texto = this.filtro.toLowerCase();
    this.listaPlayersFiltrados = this.listaPlayers.filter(
      (p) =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(texto) ||
        p.nameTeam.toLowerCase().includes(texto)
    );
  }

  ordenarPor(campo: string) {
    if (this.columnaActual === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaActual = campo;
      this.ordenAscendente = true;
    }

    this.listaPlayersFiltrados.sort((a: any, b: any) => {
      const valorA = a[campo];
      const valorB = b[campo];

      // Si ambos son números
      if (!isNaN(valorA) && !isNaN(valorB)) {
        return this.ordenAscendente ? valorA - valorB : valorB - valorA;
      }

      // Comparación como texto
      const textoA = valorA?.toString().toLowerCase() || '';
      const textoB = valorB?.toString().toLowerCase() || '';

      if (textoA < textoB) return this.ordenAscendente ? -1 : 1;
      if (textoA > textoB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });

    // IMPORTANTE: volver a la primera página
    this.paginaActual = 1;
  }

  openModalPago(player: any) {
    this.playerSelected = player.playerId;
    this.addPago = {};
    this.textoInfoTitlePagoPlayer = player.nombre;
    this.clubService
      .getListPagosClubForPlayer(
        this.clubId,
        this.temporadaStoredValue,
        player.playerId
      )
      .subscribe(
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

  openModalVerPagosPlayer(player: any) {
    this.clubService
      .getListHistoryPagosByPlayer(
        this.clubId,
        this.temporadaStoredValue,
        player.playerId
      )
      .subscribe(
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
    this.clubService
      .getListPagosClubForPlayer(
        this.clubId,
        this.temporadaStoredValue,
        player.playerId
      )
      .subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.listCuotasPlayerPersonal = response.data;
          }
          this.clubService
            .getListPagosClub(this.clubId, this.temporadaStoredValue)
            .subscribe(
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

  goHistorial() {
    this.router.navigate(['/dashboard/historial-pagos-club', this.clubId]);
  }

  openModalBancoClub() {
    this.clubService
      .getBancoClub(this.clubId, this.temporadaStoredValue)
      .subscribe(
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
          this.toastr.success('Datos guardados correctamente.');
        }
      },
      (error) => {
        this.toastr.error('Error al cargar el listado de equipos.');
        console.error('', error);
      }
    );
  }

  openModalCuotas() {
    this.cerrarDatosStripe();
    this.soloLectura = false;
    this.clubService
      .getListPagosClub(this.clubId, this.temporadaStoredValue)
      .subscribe(
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
    return this.listaCuotas.filter((cuota) => {
      const coincideTitulo =
        this.filtroTitulo.trim() === '' ||
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

  editarCuota(cuota: any, stripe: number) {
    this.soloLectura = false;
    this.cuotaSeleccionada = true;
    this.nuevaCuota = cuota;
    this.nuevaCuota.stripe = stripe;
    this.nuevaCuota.tipoPagoStripe = cuota.tipoPagoStripe;
    this.rellenarCombo(cuota);

    if (stripe == 0) {
      this.cerrarDatosStripe();
    } else {
      this.showStripeConfig = true;
      if (cuota.tipoPagoStripe == 1) {
        this.isSubscription = true;
        this.soloLectura = true;
      } else this.isSubscription = false;
    }
    this.showModalCuota = true;
  }

  eliminarCuota(cuota: any, index: number): void {
    const ok = confirm(`¿Eliminar el pago "${cuota.titulo}"?`);
    if (!ok) return;

    let pago =
      cuota.PagoClubId != null && cuota.PagoClubId != undefined
        ? cuota.PagoClubId
        : cuota.pagoClubId;

    this.clubService.deletePagoClub(pago).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data) {
          this.listaCuotas.splice(index, 1);
          this.reloadTabla();
        } else {
          this.toastr.error('Error: ', response.error.msg);
          console.error(
            'La respuesta del servicio no tiene la estructura esperada',
            response
          );
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
      pagoClubId: 0,
      clubId: this.clubId,
      temporada: this.temporadaStoredValue,
      dateCreate: null,
      dateEdit: null,
      titulo: null,
      descripcion: null,
      obligatorio: 0,
      importe: null,
      fechaLimite: null,
      stripe: null,
    };

    this.rellenarCombo(null);
  }

  cerrarModalCuota() {
    this.showModalCuota = false;
  }

  guardarCuota() {
    const err = this.validarStripe();
    if (err) {
      this.toastr.error('Error: ', err);

      return;
    }

    if (this.listTeamsSelecteds.length == 0) {
       this.toastr.error('Por favor, selecciona mínimo un equipo.');
      return;
    } else {
      if (
        this.nuevaCuota.titulo &&
        this.nuevaCuota.titulo != '' &&
        this.nuevaCuota.descripcion &&
        this.nuevaCuota.descripcion != '' &&
        this.nuevaCuota.importe &&
        this.nuevaCuota.importe != '' &&
        this.nuevaCuota.fechaLimite &&
        this.nuevaCuota.fechaLimite != ''
      ) {
        // 🔁 Conversión explícita
        this.nuevaCuota.importe = String(this.nuevaCuota.importe);
        this.nuevaCuota.obligatorio = this.nuevaCuota.obligatorio ? 1 : 0;
        this.nuevaCuota.listTeams = this.listTeamsSelecteds;

        if (
          this.nuevaCuota.stripe == 1 &&
          this.nuevaCuota.tipoPagoStripe == 1
        ) {
          if (
            this.nuevaCuota.fechaInicio == null ||
            this.nuevaCuota.fechaInicio == undefined ||
            this.nuevaCuota.fechaInicio == '' ||
            this.nuevaCuota.fechaFin == null ||
            this.nuevaCuota.fechaFin == undefined ||
            this.nuevaCuota.fechaFin == ''
          ) {
             this.toastr.error(
              'Por favor, Para una suscripción con Stripe, es obligatorio poner las fechas de inicio y de fin.'
            );
            return;
          }
        }
        this.clubService.createUpdatePagoClub(this.nuevaCuota).subscribe(
          (response: Response) => {
            // Verifica que la propiedad 'data' exista en la respuesta
            if (response.data !== null) {
              this.crearSuscripcion();
              if (!this.cuotaSeleccionada) this.listaCuotas.push(response.data);

              this.reloadTabla();
              this.toastr.success('Datos guardados correctamente.');
              this.cerrarModalCuota();
            }
          },
          (error) => {
            this.toastr.error('Error al cargar el listado de equipos.', error);
            console.error('Error al cargar el listado de equipos', error);
          }
        );
      } else {
         this.toastr.error('Rellena todos los campos.');
      }
    }
  }

  crearSuscripcion() {
    if (this.nuevaCuota?.stripe !== 1 || this.nuevaCuota?.tipoPagoStripe !== 1)
      return;

    let pago =
      this.nuevaCuota.PagoClubId != null &&
      this.nuevaCuota.PagoClubId != undefined
        ? this.nuevaCuota.PagoClubId
        : this.nuevaCuota.pagoClubId;

    const body = {
      pagoClubId: pago, // el ID devuelto al guardar
      clubId: this.clubId, // o desde la cuota
      accountId: this.accountIdDelClub, // acct_xxx del club
      titulo: this.nuevaCuota.titulo,
      descripcion: this.nuevaCuota.descripcion,
      importe: Number(this.nuevaCuota.importe),
      currency: 'eur',
      intervalo: this.nuevaCuota.intervalo, // 'month' por defecto
      intervaloCuenta: this.nuevaCuota.intervaloCuenta, // 1 por defecto
      fechaInicio: this.nuevaCuota.fechaInicio || null,
      fechaFin: this.nuevaCuota.fechaFin || null,
    };

    this.teamService.createSubscriptionPlan(body).subscribe({
      next: (resp) => {
        if (resp.status === 200) {
          // puedes guardar stripePriceId/productId en tu modelo si te los devuelve también el clubService
          console.log('Plan creado:', resp.data);
        } else {
          this.toastr.error('Error creando plan de suscripción.');
        }
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Error creando plan de suscripción.');
      },
    });
  }

  rellenarCombo(cuota: any) {
    this.teamService
      .getTeamsByClubForCombo(this.clubId, this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.listTeams = response.data;
            if (cuota) {
              this.listTeamsSelecteds = cuota.listTeams;
            }
            this.showModalCuota = true;
          } else {
            console.error(
              'La respuesta del servicio no tiene la estructura esperada',
              response
            );
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
  }

  // Opcional: para mostrar los nombres de los equipos seleccionados
  getTeamNameById(id: number): string {
    const found = this.listTeams.find((t) => t.value === id);
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
      this.listTeamsSelecteds = this.listTeams.map((t) => t.value);
    }
  }

  createUpdateHistoryCuotaJugador() {
    if (this.addPago) {
      if (
        this.addPago.importe &&
        this.addPago.metodo &&
        this.addPago.datePago
      ) {
        this.addPago.temporada = this.temporadaStoredValue;
        this.addPago.playerId = this.playerSelected;
        this.addPago.clubId = this.clubId;
        this.clubService.createPagoHistoryPlayer(this.addPago).subscribe(
          (response: Response) => {
            // Verifica que la propiedad 'data' exista en la respuesta
            if (response.data !== null && response.status == 200) {
              this.addPago = {};
              this.reloadTabla();
              this.toastr.success('Datos guardados correctamente.');

            } else {
              this.toastr.error('Error: ',response.error.msg);
            }
          },
          (error) => {
            console.error('Error al cargar el listado de equipos', error);
          }
        );
      } else {
         this.toastr.error('Rellena minimo el importe, la fecha y el método de pago.');
      }
    } else {
       this.toastr.error('Rellena los campos.');
    }
  }

  cerrarModalAddPago() {
    this.showModalAddPago = false;
  }

  actualizarImporte(): void {
    const cuotaSeleccionada = this.listaCuotas.find(
      (c) => c.pagoClubId === +this.addPago.pagoClubId
    );
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
    if (
      !this.metodoDevolucion ||
      this.comentarioDevolucion == null ||
      this.comentarioDevolucion == undefined ||
      this.comentarioDevolucion == ''
    ) {
       this.toastr.error('Debes seleccionar un método de devolución y explicar por qué.');
      return;
    }

    const pago = {
      clubId: this.clubId,
      temporada: this.temporadaStoredValue,
      playerId: this.playerSelected,
      pagoClubId: this.pagoDevolucion.pagoClubId,
      comentario: this.comentarioDevolucion,
      metodo: this.metodoDevolucion,
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
          this.toastr.success('Devolución hecha correctamente.');
        } else {
          this.toastr.error('Error: ', response.error.msg);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  reloadTabla() {
    this.isLoading = true;
    this.clubService
      .getListPlayersPagosClub(this.clubId, this.temporadaStoredValue)
      .subscribe(
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
    this.clubService
      .getListPagosClubForPlayer(
        this.clubId,
        this.temporadaStoredValue,
        player.playerId
      )
      .subscribe(
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
            this.toastr.error('Error: ' + response.error);
          }
        },
        (error) => {
           this.toastr.error('An error occurred: ' + error.message);
          console.log(error);
        }
      );
    }
  }

  goStripeURL() {
    window.open('https://connect.stripe.com/login', '_blank');
  }

  getInfoClub() {
    this.clubService
      .getBancoClub(this.clubId, this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.infoClub = response.data;
            if (this.infoClub.banco != null && this.infoClub.banco != '') {
              this.showModalStripe = true;
            } else {
               this.toastr.error(
                'Por favor, completa esta información para poder acceder a Stripe.'
              );
              this.showModalBanco = true;
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
       this.toastr.error('Selecciona una cuota primero.');
      return;
    }

    const ok = confirm(`¿Añadir el pago del jugador?`);
    if (!ok) return;

    this.clubService
      .addPagoClubForPlayer(
        this.cuotaSeleccionadaId,
        this.playerSelected,
        this.temporadaStoredValue
      )
      .subscribe(
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
    console.log(
      'Añadir cuota al jugador -> pagoClubId:',
      this.cuotaSeleccionadaId
    );

    // Aquí haces la llamada al servicio para asignar la cuota al jugador.
    // this.tuService.asignarCuotaAJugador(playerId, this.cuotaSeleccionadaId).subscribe(...)
  }

  editarCuotaPlayer(pago: any, index: number): void {
    const msg =
      'Esto no modifica el pago, crea uno nuevo con los datos modificados para poder usar los 2 en un futuro. ' +
      'Para modificar un pago, ir al menú de Pagos.';

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

    this.clubService
      .deletePagoClubForPlayer(
        cuota.pagoClubId,
        this.temporadaStoredValue,
        this.playerSelected
      )
      .subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data) {
            this.listCuotasPlayerPersonal.splice(this.playerIndex, 1);
            this.reloadTabla();
          } else {
            const mensaje = this.translate.instant('CAL.TEXT_363');
             this.toastr.error(mensaje);
            this.listCuotasPlayerPersonal.splice(this.playerIndex, 1);
            this.reloadTabla();
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
    this.clubService
      .createUpdatePagoClubForPlayer(this.cuotaPlayerEdit, this.playerSelected)
      .subscribe({
        next: (res) => {
          this.reloadTabla();
           this.toastr.success('Pago modificado correctamente');
          this.showModalEditarCuotaPlayer = false;
          // refrescar lista si hace falta
        },
        error: (err) => {
          console.error(err);
           this.toastr.error('Error al subir el documento');
        },
      });
  }

  cerrarModalEditarCuotaPlayer() {
    this.showModalEditarCuotaPlayer = false;
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  // Llama a esto cuando abras el modal para editar/crear, para sincronizar el UI
  initStripeUIFromModel() {
    this.showStripeConfig = this.nuevaCuota?.stripe === 1;
    this.isSubscription =
      this.showStripeConfig && this.nuevaCuota?.tipoPagoStripe === 1;

    // Defaults sensatos si vienen nulos
    if (!this.nuevaCuota) return;
    if (
      this.nuevaCuota.tipoPagoStripe === undefined ||
      this.nuevaCuota.tipoPagoStripe === null
    ) {
      this.nuevaCuota.tipoPagoStripe = 0; // puntual por defecto
    }
    if (!this.nuevaCuota.intervalo) {
      this.nuevaCuota.intervalo = 'month';
    }
    if (
      !this.nuevaCuota.intervaloCuenta ||
      this.nuevaCuota.intervaloCuenta < 1
    ) {
      this.nuevaCuota.intervaloCuenta = 1;
    }
  }
  trackByPlayerId(index: number, player: any) {
    return player.playerId;
  }

  // Toggle principal: 0/1 en el modelo
  onToggleStripe(ev: Event) {
    if (this.nuevaCuota.pagoClubId == 0) {
       this.toastr.error(
        'Para habilitar Stripe sobre este pago, primero créalo y después lo buscas y desde edición, lo habilitas.'
      );
      this.nuevaCuota.stripe = 0;
      return;
    }

    const checked = (ev.target as HTMLInputElement).checked;
    if (!checked) {
      //this.cerrarDatosStripe();
      return;
    }

    //vamos a comprobar que tiene stripe configurado
    this.clubService
      .getBancoClub(this.clubId, this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            this.infoClub = response.data;
            //si no hay datos bancarios, que los ponga
            if (
              this.infoClub.banco == null &&
              this.infoClub.banco == undefined
            ) {
               this.toastr.error(
                'Por favor, completa esta información para poder acceder a Stripe.'
              );
              this.cerrarDatosStripe();
              this.showModalBanco = true;
              return;
            }

            if (
              this.infoClub.stripeId !== null &&
              this.infoClub.stripeId !== undefined &&
              this.infoClub.stripeId !== ''
            ) {
              this.accountIdDelClub = this.infoClub.stripeId;
              //carga bien
              this.nuevaCuota.stripe = checked ? 1 : 0;
              this.mostrarDatosStripe();
            } else {
              this.cerrarDatosStripe();
               this.toastr.error('Por favor, crea primero la cuenta en Stripe.');
              this.showModalStripe = true;
            }
          } else {
            this.cerrarDatosStripe();
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
  }

  // Pediste que al cambiar llame a este método
  mostrarDatosStripe() {
    this.showStripeConfig = this.nuevaCuota.stripe === 1;
    this.isSubscription =
      this.showStripeConfig && this.nuevaCuota.tipoPagoStripe === 1;

    // Si desactivas Stripe, limpia campos de suscripción
    if (!this.showStripeConfig) {
      this.nuevaCuota.tipoPagoStripe = 0;
      this.nuevaCuota.intervalo = 'month';
      this.nuevaCuota.intervaloCuenta = 1;
      this.nuevaCuota.fechaInicio = null;
      this.nuevaCuota.fechaFin = null;
    }
  }

  cerrarDatosStripe() {
    this.showModalStripe = false;
    this.showModalCuota = false;
    this.showModalCuotas = false;
    this.showStripeConfig = false;
    this.isSubscription = false;
    this.nuevaCuota.stripe = 0;

    // Si desactivas Stripe, limpia campos de suscripción
    this.nuevaCuota.tipoPagoStripe = 0;
    this.nuevaCuota.intervalo = 'month';
    this.nuevaCuota.intervaloCuenta = 1;
    this.nuevaCuota.fechaInicio = null;
    this.nuevaCuota.fechaFin = null;
  }

  // Cambiar tipo puntual/suscripción
  onTipoPagoChange(tipo: 0 | 1) {
    this.nuevaCuota.tipoPagoStripe = tipo;
    this.isSubscription = tipo === 1;

    if (tipo === 0) {
      // Si vuelven a puntual, oculta y limpia fechas/periodicidad
      this.nuevaCuota.intervalo = 'month';
      this.nuevaCuota.intervaloCuenta = 1;
      this.nuevaCuota.fechaInicio = null;
      this.nuevaCuota.fechaFin = null;
    }
  }

  // (Opcional) al guardar, puedes validar si falta algo cuando es suscripción
  validarStripe(): string | null {
    if (this.nuevaCuota.stripe !== 1) return null;
    if (this.nuevaCuota.tipoPagoStripe === 1) {
      if (!this.nuevaCuota.intervalo || !this.nuevaCuota.intervaloCuenta) {
        return 'Selecciona el periodo y la cantidad de periodos para la suscripción.';
      }
      if (this.nuevaCuota.intervaloCuenta < 1) {
        return 'La “cantidad de periodos” debe ser al menos 1.';
      }
      // Fechas son opcionales; si las usas, asegúrate de que inicio <= fin
      if (
        this.nuevaCuota.fechaInicio &&
        this.nuevaCuota.fechaFin &&
        this.nuevaCuota.fechaInicio > this.nuevaCuota.fechaFin
      ) {
        return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
      }
    }
    return null;
  }
}
