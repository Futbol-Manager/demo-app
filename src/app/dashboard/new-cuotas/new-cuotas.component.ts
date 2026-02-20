import { Component, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { PlayerInfoDialogComponent, PlayerInfoDialogData } from '../player-info-dialog/player-info-dialog.component';
import { combineLatest, forkJoin } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

@Component({
  selector: 'app-new-cuotas',
  templateUrl: './new-cuotas.component.html',
  styleUrls: ['./new-cuotas.component.scss'],
})
export class NewCuotasComponent implements OnInit {

  /** IDs de modales en proceso de cierre (para animar la salida) */
  closingModals = new Set<string>();

  /** Diálogo de confirmación premium — reemplaza window.confirm() */
  confirmDialog = {
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'danger' as 'danger' | 'warning',
    icon: 'bi-exclamation-triangle-fill',
    callback: () => {},
  };

  /** Cierra un modal con animación de salida antes de ocultarlo */
  private closeModal(id: string, hideFn: () => void, ms = 260): void {
    this.closingModals.add(id);
    setTimeout(() => {
      hideFn();
      this.closingModals.delete(id);
    }, ms);
  }

  /** Abre el diálogo de confirmación premium */
  openConfirm(cfg: {
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'warning';
    icon?: string;
    callback: () => void;
  }): void {
    this.confirmDialog = {
      show: true,
      title: cfg.title,
      message: cfg.message,
      confirmText: cfg.confirmText ?? 'Confirmar',
      cancelText: 'Cancelar',
      type: cfg.type ?? 'danger',
      icon: cfg.icon ?? (cfg.type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-trash3-fill'),
      callback: cfg.callback,
    };
  }

  onConfirmOk(): void {
    const fn = this.confirmDialog.callback;
    this.closeModal('confirm', () => { this.confirmDialog.show = false; fn(); });
  }

  onConfirmCancel(): void {
    this.closeModal('confirm', () => { this.confirmDialog.show = false; });
  }
  datosCargados = true;
  temporadaStoredValue = getCurrentSeasonString();
  clubId = 0;
  showModalBanco = false;
  bancoClubData: any = {};
  listaCuotas: any[] = [];
  showModalCuotas = false;
  filtroTitulo: string = '';
  filtroObligatoria: 'todas' | 'si' | 'no' = 'todas';
  filtroTipoCobro: 'todos' | 'puntual' | 'suscripcion' = 'todos';
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

  // ── Comisiones ──
  stripeFeePct = 0.015;   // Sphaira %  (decimal, ej: 0.015 = 1.5%)
  stripePct    = 0.015;   // Stripe %   (decimal, para gross-up)
  stripeFeeFix = 0.25;    // Stripe fijo (€)
  aplicarComisionClub = false;
  clubComisionPct = 2;
  importeCalculoPreview = 50;

  // ── Filtro por pago individual ──
  listaPagosClub: any[] = [];                 // Todos los pagos creados por el club
  pagosSeleccionados: number[] = [];          // IDs de pagos seleccionados (pagoClubId)
  vistaFiltroPago = false;                    // true = vista filtrada por pagos; false = vista general
  isLoadingDetalle = false;                   // Loading del desglose
  playerDetailCache: Map<number, any[]> = new Map(); // Cache: playerId -> array de cuotas asignadas
  listaPlayersFiltradosPorPago: any[] = [];   // Jugadores recalculados según pagos seleccionados
  showPagoFilterDropdown = false;             // Mostrar/ocultar el dropdown de filtro

  // Modal de pagos automáticos
  showModalAutoPayments = false;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private clubService: ClubService,
    private teamService: TeamService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (
      localStorage.getItem('temporada') != null &&
      localStorage.getItem('temporada') != undefined
    ) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    combineLatest([
      this.route.params.pipe(take(1)),
      this.loginService.usuarioActual.pipe(filter((u) => !!u), take(1)),
    ]).subscribe(([params]) => {
      this.clubId = +params['clubId'];

      const cached = this.clubService.getNewCuotasCache(this.clubId, this.temporadaStoredValue);
      if (cached?.listaPlayers?.length) {
        this.listaPlayers = [...cached.listaPlayers];
        this.listaPlayersFiltrados = [...this.listaPlayers];
        this.isLoading = false;
      }

      this.loadTabla();
      this.loadPagosClub();
      this.loadStripeFeeConfig();
    });
  }

  loadTabla() {
    this.isLoading = true;
    this.clubService
      .getListPlayersPagosClub(this.clubId, this.temporadaStoredValue)
      .subscribe({
        next: (response: Response) => {
          const uniquePlayers = Array.from(
            new Map(response.data.map((p: any) => [p.playerId, p])).values()
          );
          this.listaPlayers = uniquePlayers;
          this.listaPlayersFiltrados = [...this.listaPlayers];
          this.clubService.setNewCuotasCache(this.clubId, this.temporadaStoredValue, {
            listaPlayers: this.listaPlayers,
          });
          this.enrichPlayersWithTeamId();
          this.isLoading = false;

          // Si hay filtro de pagos activo, recalcular
          if (this.vistaFiltroPago && this.pagosSeleccionados.length > 0) {
            this.aplicarFiltroPagos();
          }
        },
        error: (error) => {
          console.error('Error al cargar el listado de equipos', error);
          this.isLoading = false;
        },
      });
  }

  /** Carga la lista de todos los pagos creados por el club (para el filtro de chips) */
  loadPagosClub() {
    this.clubService
      .getListPagosClub(this.clubId, this.temporadaStoredValue)
      .subscribe({
        next: (response: Response) => {
          if (response.data) {
            this.listaPagosClub = response.data;
          }
        },
        error: (err) => {
          console.error('Error al cargar los pagos del club', err);
        },
      });
  }

  // ── Comisiones: carga, cálculo y helpers ──────────────────────────────────

  loadStripeFeeConfig(): void {
    this.teamService.getFeeConfig(this.clubId).subscribe({
      next: (res: any) => {
        if (res?.data) {
          // appPct y stripePct ya vienen como decimales (0.015 = 1.5%)
          this.stripeFeePct = res.data.appPct    ?? 0.015;
          this.stripePct    = res.data.stripePct ?? 0.015;
          this.stripeFeeFix = (res.data.fixedFeeCents ?? 25) / 100;
        }
      },
      error: () => {
        this.stripeFeePct = 0.015;
        this.stripePct    = 0.015;
        this.stripeFeeFix = 0.25;
      },
    });
  }

  calcularComisionSphaira(): number {
    const base = Number(this.nuevaCuota?.importe) || 0;
    return +(base * this.stripeFeePct).toFixed(2);
  }

  calcularComisionClub(): number {
    const base = Number(this.nuevaCuota?.importe) || 0;
    return +(base * (this.clubComisionPct / 100)).toFixed(2);
  }

  calcularTotalPadre(): number {
    const base      = Number(this.nuevaCuota?.importe) || 0;
    if (base === 0) return 0;
    const clubFee   = this.aplicarComisionClub ? base * (this.clubComisionPct / 100) : 0;
    const net       = base + clubFee;
    const netCents  = Math.round(net * 100);
    const appFeeC   = Math.round(netCents * this.stripeFeePct) + Math.round(this.stripeFeeFix * 100);
    const denom     = 1 - this.stripePct;
    return Math.ceil((netCents + appFeeC) / denom) / 100;
  }

  calcularComisionStripe(): number {
    return +(this.calcularTotalPadre() - (Number(this.nuevaCuota?.importe) || 0)
      - this.calcularComisionSphaira()
      - (this.aplicarComisionClub ? this.calcularComisionClub() : 0)).toFixed(2);
  }

  // ── Toggle de selección de un pago en el filtro ──────────────────────────

  /** Toggle de selección de un pago en el filtro */
  togglePagoFilter(pagoClubId: number): void {
    const idx = this.pagosSeleccionados.indexOf(pagoClubId);
    if (idx >= 0) {
      this.pagosSeleccionados.splice(idx, 1);
    } else {
      this.pagosSeleccionados.push(pagoClubId);
    }

    if (this.pagosSeleccionados.length === 0) {
      this.quitarFiltroPagos();
    } else {
      this.aplicarFiltroPagos();
    }
  }

  /** Quita todos los filtros de pagos y vuelve a la vista general */
  quitarFiltroPagos(): void {
    this.pagosSeleccionados = [];
    this.vistaFiltroPago = false;
    this.listaPlayersFiltradosPorPago = [];
    this.filtrarJugadores(); // re-aplica el filtro de texto si hay
  }

  /** Selecciona todos los pagos */
  seleccionarTodosPagos(): void {
    if (this.pagosSeleccionados.length === this.listaPagosClub.length) {
      this.quitarFiltroPagos();
    } else {
      this.pagosSeleccionados = this.listaPagosClub.map((p: any) => p.pagoClubId);
      this.aplicarFiltroPagos();
    }
  }

  /** Aplica el filtro por pagos seleccionados: carga el desglose de cada jugador */
  aplicarFiltroPagos(): void {
    this.vistaFiltroPago = true;
    this.isLoadingDetalle = true;

    // Obtener la lista de jugadores base (aplica filtro de texto también)
    const jugadoresBase = this.filtro
      ? this.listaPlayers.filter(
          (p: any) =>
            `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase().includes(this.filtro.toLowerCase()) ||
            (p.nameTeam && p.nameTeam.toLowerCase().includes(this.filtro.toLowerCase()))
        )
      : [...this.listaPlayers];

    // Para cada jugador, obtener sus cuotas asignadas (usar caché si existe)
    const observables: { [key: number]: any } = {};
    const uncachedPlayers: any[] = [];

    jugadoresBase.forEach((player: any) => {
      if (this.playerDetailCache.has(player.playerId)) {
        // Ya está en caché
      } else {
        uncachedPlayers.push(player);
        observables[player.playerId] = this.clubService.getPlayerPaymentDetail(
          this.clubId,
          this.temporadaStoredValue,
          player.playerId
        );
      }
    });

    if (Object.keys(observables).length === 0) {
      // Todo en caché, recalcular directamente
      this.recalcularVistaPagos(jugadoresBase);
      this.isLoadingDetalle = false;
      return;
    }

    // Cargar los detalles faltantes en batch
    forkJoin(observables).subscribe({
      next: (results: any) => {
        for (const playerIdStr of Object.keys(results)) {
          const playerId = +playerIdStr;
          this.playerDetailCache.set(playerId, results[playerIdStr]);
        }
        this.recalcularVistaPagos(jugadoresBase);
        this.isLoadingDetalle = false;
      },
      error: (err) => {
        console.error('Error al cargar desglose de pagos', err);
        this.isLoadingDetalle = false;
        this.toastr.error('Error al cargar el desglose de pagos.');
      },
    });
  }

  /** Recalcula la lista filtrada según los pagos seleccionados */
  private recalcularVistaPagos(jugadoresBase: any[]): void {
    this.listaPlayersFiltradosPorPago = jugadoresBase
      .map((player: any) => {
        const cuotasDelJugador: any[] = this.playerDetailCache.get(player.playerId) || [];

        // Filtrar solo las cuotas que coinciden con los pagos seleccionados
        const cuotasFiltradas = cuotasDelJugador.filter((c: any) =>
          this.pagosSeleccionados.includes(c.pagoClubId)
        );

        if (cuotasFiltradas.length === 0) return null; // Este jugador no tiene estos pagos

        // Recalcular totales basados en las cuotas filtradas
        const totalAPagar = cuotasFiltradas.reduce((sum: number, c: any) => sum + (parseFloat(c.importe) || 0), 0);

        // Para saber cuánto ha pagado de estos pagos concretos, usamos los datos del historial
        // si están disponibles. Si no, usamos la proporción del total.
        // Como el API no devuelve pagado por cuota individual, estimamos con la proporción
        // o mostramos el importe de la cuota como "a pagar"
        const totalPagadoGeneral = parseFloat(player.totalPagado) || 0;
        const totalGeneralAPagar = parseFloat(player.totalAPagar) || 0;
        const proporcion = totalGeneralAPagar > 0 ? totalPagadoGeneral / totalGeneralAPagar : 0;
        const totalPagadoEstimado = Math.round(totalAPagar * proporcion * 100) / 100;
        const restante = Math.round((totalAPagar - totalPagadoEstimado) * 100) / 100;

        return {
          ...player,
          totalAPagarFiltrado: totalAPagar.toFixed(2),
          totalPagadoFiltrado: totalPagadoEstimado.toFixed(2),
          restanteFiltrado: Math.max(0, restante).toFixed(2),
          cuotasFiltradas,
          estadoFiltrado: restante <= 0 ? 1 : 0,
          pagadasFiltrado: `${cuotasFiltradas.filter((c: any) => {
            const imp = parseFloat(c.importe) || 0;
            const pagEst = imp * proporcion;
            return pagEst >= imp;
          }).length}/${cuotasFiltradas.length}`,
        };
      })
      .filter((p: any) => p !== null);

    this.paginaActual = 1;
  }

  /** Obtiene el nombre de un pago por su ID */
  getPagoName(pagoClubId: number): string {
    const pago = this.listaPagosClub.find((p: any) => p.pagoClubId === pagoClubId);
    return pago ? pago.titulo : '';
  }

  /** Nombres de los pagos seleccionados para mostrar en el resumen */
  get pagosSeleccionadosNombres(): string[] {
    return this.pagosSeleccionados.map((id) => this.getPagoName(id)).filter((n) => n);
  }

  /** Suma total de los importes de los pagos seleccionados */
  get sumaPagosSeleccionados(): number {
    return this.listaPagosClub
      .filter((p: any) => this.pagosSeleccionados.includes(p.pagoClubId))
      .reduce((sum: number, p: any) => sum + (parseFloat(p.importe) || 0), 0);
  }

  /** Players paginados en vista filtrada */
  get playersPaginadosFiltrados() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.listaPlayersFiltradosPorPago.slice(
      inicio,
      fin > this.listaPlayersFiltradosPorPago.length
        ? this.listaPlayersFiltradosPorPago.length
        : fin
    );
  }

  get totalPaginasFiltrado(): number {
    return Math.ceil(this.listaPlayersFiltradosPorPago.length / this.itemsPorPagina);
  }

  calcularProgresoFiltrado(player: any): number {
    const total = parseFloat(player.totalAPagarFiltrado) || 0;
    if (total === 0) return 0;
    const pagado = parseFloat(player.totalPagadoFiltrado) || 0;
    return Math.min((pagado / total) * 100, 100);
  }

  /** Asegura que cada jugador tenga teamId (para navegar a Ver información). Si la API de pagos no lo devuelve, se obtiene del listado por club. */
  private enrichPlayersWithTeamId(): void {
    const sinTeamId = this.listaPlayers.filter((p: any) => p.teamId == null || p.teamId === undefined);
    if (sinTeamId.length === 0) return;
    this.clubService
      .getListJugadoresByClubForTemp(this.clubId, this.temporadaStoredValue)
      .subscribe((res: Response) => {
        if (!res?.data?.teams) return;
        const mapPlayerToTeamId: Record<number, number> = {};
        for (const team of res.data.teams) {
          const tid = team.teamId;
          for (const pl of team.players || []) {
            if (pl.playerId != null) mapPlayerToTeamId[pl.playerId] = tid;
          }
        }
        this.listaPlayers.forEach((p: any) => {
          if ((p.teamId == null || p.teamId === undefined) && mapPlayerToTeamId[p.playerId] != null) {
            p.teamId = mapPlayerToTeamId[p.playerId];
          }
        });
        this.listaPlayersFiltrados = [...this.listaPlayers];
      });
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

  /** Abre el modal de ver información del jugador en esta misma página con la pestaña Información financiera. */
  abrirModalInfoJugador(player: any): void {
    const teamId = player.teamId;
    if (teamId == null) {
      this.toastr.warning(this.translate.instant('CUOTAS.NO_TEAM') || 'Sin equipo asignado');
      return;
    }
    const data: PlayerInfoDialogData = { player, teamId, initialTab: 'financiera' };
    this.dialog.open(PlayerInfoDialogComponent, {
      data,
      width: '95%',
      maxWidth: '900px',
      maxHeight: '90vh',
      panelClass: 'player-info-dialog-panel',
      backdropClass: 'player-info-dialog-backdrop',
    });
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
            this.toastr.success('Datos actualizados.');
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
        `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase().includes(texto) ||
        (p.nameTeam && p.nameTeam.toLowerCase().includes(texto))
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
    this.closeModal('historial', () => {
      this.listHistoryPagos = [];
      this.showModalHistorialPagos = false;
    });
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

  openModalAutoPayments(): void {
    this.showModalAutoPayments = true;
  }

  closeAutoPaymentsModal(): void {
    this.closeModal('autoPayments', () => { this.showModalAutoPayments = false; });
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
    this.closeModal('banco', () => { this.showModalBanco = false; });
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

      const esSuscripcion = this.esSuscripcion(cuota);
      const coincideTipo =
        this.filtroTipoCobro === 'todos' ||
        (this.filtroTipoCobro === 'suscripcion' &&  esSuscripcion) ||
        (this.filtroTipoCobro === 'puntual'     && !esSuscripcion);

      return coincideTitulo && coincideObligatoria && coincideTipo;
    });
  }

  /**
   * Determina si una cuota es de tipo suscripción recurrente.
   * Soporta tanto el DTO (tipoPagoStripe) como la entidad directa (tipoCobro).
   */
  private esSuscripcion(cuota: any): boolean {
    // tipoCobro === 2 → stripe_suscripcion  (si la entidad se devuelve directamente)
    if (cuota.tipoCobro != null) return cuota.tipoCobro === 2;
    // tipoPagoStripe === 1 → recurrente  (campo del PagoClubDTO)
    return cuota.tipoPagoStripe === 1;
  }

  contarPorTipo(tipo: 'puntual' | 'suscripcion'): number {
    return this.listaCuotas.filter(c =>
      tipo === 'suscripcion' ? this.esSuscripcion(c) : !this.esSuscripcion(c)
    ).length;
  }

  contarObligatorias(): number {
    return this.cuotasFiltradas().filter(c => c.obligatorio === 1 || c.obligatorio === true).length;
  }

  importeTotalCuotas(): number {
    return this.cuotasFiltradas().reduce((sum, c) => sum + (parseFloat(c.importe) || 0), 0);
  }

  cerrarModalCuotas() {
    this.closeModal('cuotas', () => { this.showModalCuotas = false; });
  }

  editarCuota(cuota: any, stripe: number) {
    this.soloLectura = false;
    this.cuotaSeleccionada = true;
    this.nuevaCuota = cuota;
    this.nuevaCuota.stripe = stripe;
    this.nuevaCuota.tipoPagoStripe = cuota.tipoPagoStripe;
    this.clubComisionPct = cuota.comisionClub > 0 ? cuota.comisionClub : 2;
    this.aplicarComisionClub = !!(cuota.comisionClub && cuota.comisionClub > 0);
    this.importeCalculoPreview = Number(cuota.importe) || 50;
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
    this.openConfirm({
      title: 'Eliminar pago',
      message: `¿Seguro que quieres eliminar el pago <strong>"${cuota.titulo}"</strong>? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      type: 'danger',
      icon: 'bi-trash3-fill',
      callback: () => this._doEliminarCuota(cuota, index),
    });
  }

  private _doEliminarCuota(cuota: any, index: number): void {
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
    this.aplicarComisionClub = false;
    this.clubComisionPct = 2;
    this.importeCalculoPreview = 50;
    this.showStripeConfig = false;
    this.isSubscription = false;
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
      stripe: 0,
      tipoPagoStripe: 0,
      intervalo: 'month',
      intervaloCuenta: 1,
      fechaInicio: null,
      fechaFin: null,
    };

    this.rellenarCombo(null);
  }

  cerrarModalCuota() {
    this.closeModal('cuota', () => { this.showModalCuota = false; });
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
        this.nuevaCuota.importe = String(this.nuevaCuota.importe);
        this.nuevaCuota.obligatorio = this.nuevaCuota.obligatorio ? 1 : 0;
        this.nuevaCuota.listTeams = this.listTeamsSelecteds;
        this.nuevaCuota.comisionClub = this.aplicarComisionClub ? this.clubComisionPct : 0;

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
            if (response.data !== null) {
              // Sincronizamos el ID para que crearSuscripcion() lo use correctamente
              const idGuardado =
                response.data?.PagoClubId ??
                response.data?.pagoClubId ??
                this.nuevaCuota.pagoClubId;
              this.nuevaCuota.pagoClubId = idGuardado;
              this.nuevaCuota.PagoClubId  = idGuardado;

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

    const baseImporte     = Number(this.nuevaCuota.importe) || 0;
    const comisionClubPct = this.aplicarComisionClub ? this.clubComisionPct : 0;
    const clubFeeImporte  = +(baseImporte * (comisionClubPct / 100)).toFixed(2);
    // El importe enviado a create-plan es lo que recibirá el club (base + comisión del club)
    const importeParaPlan = +(baseImporte + clubFeeImporte).toFixed(2);

    const body = {
      pagoClubId: pago,
      clubId: this.clubId,
      accountId: this.accountIdDelClub,
      titulo: this.nuevaCuota.titulo,
      descripcion: this.nuevaCuota.descripcion,
      importe: importeParaPlan,
      currency: 'eur',
      intervalo: this.nuevaCuota.intervalo,
      intervaloCuenta: this.nuevaCuota.intervaloCuenta,
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
    this.closeModal('addPago', () => { this.showModalAddPago = false; });
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
    this.closeModal('devolucion', () => {
      this.comentarioDevolucion = '';
      this.metodoDevolucion = '';
      this.pagoDevolucion = {};
      this.showConfirmDevolucion = false;
    });
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
    this.closeModal('cuotasAsignadas', () => {
      this.listaCuotasAsignadas = [];
      this.showModalCuotasAsignadas = false;
    });
  }

  openModalStripe() {
    this.getInfoClub();
  }

  cerrarModalStripe() {
    this.closeModal('stripe', () => { this.showModalStripe = false; });
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
    this.closeModal('cuotasJugador', () => { this.showModalCuotasJugador = false; });
  }

  addCuotaPlayer(): void {
    if (!this.cuotaSeleccionadaId) {
      this.toastr.error('Selecciona una cuota primero.');
      return;
    }

    this.openConfirm({
      title: 'Añadir pago al jugador',
      message: '¿Confirmas que quieres asignar este pago al jugador?',
      confirmText: 'Sí, añadir',
      type: 'warning',
      icon: 'bi-plus-circle-fill',
      callback: () => this._doAddCuotaPlayer(),
    });
  }

  private _doAddCuotaPlayer(): void {
    this.clubService
      .addPagoClubForPlayer(
        this.cuotaSeleccionadaId!,
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
    this.openConfirm({
      title: 'Editar cuota del jugador',
      message:
        'Al editar se creará una <strong>nueva versión</strong> del pago, manteniendo el historial anterior. ' +
        'Para modificar el pago global, usa el menú <em>Pagos</em>.',
      confirmText: 'Entendido, editar',
      type: 'warning',
      icon: 'bi-pencil-square',
      callback: () => {
        this.playerIndex = index;
        this.cuotaPlayerEdit = pago;
        this.showModalEditarCuotaPlayer = true;
      },
    });
  }

  eliminarCuotaPlayer(cuota: any, index: number): void {
    this.openConfirm({
      title: 'Eliminar pago del jugador',
      message: `¿Seguro que quieres eliminar el pago <strong>"${cuota.titulo}"</strong> de este jugador?`,
      confirmText: 'Sí, eliminar',
      type: 'danger',
      icon: 'bi-trash3-fill',
      callback: () => this._doEliminarCuotaPlayer(cuota, index),
    });
  }

  private _doEliminarCuotaPlayer(cuota: any, index: number): void {
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
    this.closeModal('editarCuota', () => { this.showModalEditarCuotaPlayer = false; });
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
