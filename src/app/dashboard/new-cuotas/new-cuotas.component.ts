import { Component, HostListener, OnInit } from '@angular/core';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ClubSubscriptionService } from 'src/app/core/services/subscription/club-subscription.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { PlayerInfoDialogComponent, PlayerInfoDialogData } from '../player-info-dialog/player-info-dialog.component';
import { combineLatest, forkJoin, of } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-new-cuotas',
  templateUrl: './new-cuotas.component.html',
  styleUrls: ['./new-cuotas.component.scss'],
})
export class NewCuotasComponent implements OnInit {

  /** IDs de modales en proceso de cierre (para animar la salida) */
  closingModals = new Set<string>();

  /** True cuando el tutorial muestra el modal Gestión de pagos (z-index por encima del overlay). */
  tutorialModalGestionPagos = false;
  /** True cuando el tutorial muestra el modal Cobros Sphaira Pay (z-index por encima del overlay). */
  tutorialModalCobrosSphaira = false;
  /** True cuando el tutorial muestra el modal Notificaciones de Cuotas (z-index por encima del overlay). */
  tutorialModalNotifConfig = false;

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

  /** Base URL para avatares de jugadores (en demo: assets/images/user/) */
  get imageBaseUrlUser(): string {
    return environment.images + 'user/';
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

  // ── Validación de variantes de precio por pago (lado club) ──────────
  showVarValidarModal = false;
  varValidarPago: any = null;
  varValidarPagoId = 0;
  varValidarLoading = false;
  varValidarSaving = false;
  varValidarVariantes: Array<{ id: number; nombre: string; importe: any }> = [];
  varValidarRows: Array<{ playerId: number; nombre: string; varianteId: number; estado: number; cobrar: boolean; seleccionado: boolean; familiaId: number }> = [];
  varValidarTab: 'pendientes' | 'validados' = 'pendientes';
  varValidarVencida = false;
  varValidarFecha = '';
  varValidarPedirTarjeta = false;
  varValidarSinVariantes = false;
  currencySymbol = '€';

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
  /** Jugador cuyo modal de pagos está abierto (para mostrar avatar/nombre en el header) */
  playerModal: any = null;
  /** Jugador cuyo historial de pagos está abierto */
  playerHistorial: any = null;

  email: string = '';
  aceptStripe = false;
  showModalStripe = false;
  infoClub: any = {};
  paginaActual = 1;
  itemsPorPagina = 20;

  // Modal state
  showModalCuotasJugador = false;
  // Combo de todas las cuotas disponibles para asignar
  listAllCuotas: Array<{ pagoClubId: number; titulo: string }> = [];
  // ID seleccionado en el combo
  cuotaSeleccionadaId: number | null = null;
  // Lista de cuotas ya asignadas al jugador
  listCuotasPlayerPersonal: any[] = []; // usa tu DTO si lo tienes
  showModalEditarCuotaPlayer = false;
  /** Jugador cuyo modal de gestión de pagos está abierto */
  playerEdit: any = null;

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
  /** Porcentaje de comisión del club desde el plan actual (club_plans.club_commission_percent) */
  clubCommissionPercentFromPlan = 2;
  importeCalculoPreview = 50;

  // ── Filtro por pago individual ──
  listaPagosClub: any[] = [];                 // Todos los pagos creados por el club
  pagosSeleccionados: number[] = [];          // IDs de pagos seleccionados (pagoClubId)
  vistaFiltroPago = false;                    // true = vista filtrada por pagos; false = vista general
  isLoadingDetalle = false;                   // Loading del desglose
  playerDetailCache: Map<number, any[]> = new Map(); // Cache: playerId -> array de cuotas asignadas
  listaPlayersFiltradosPorPago: any[] = [];   // Jugadores recalculados según pagos seleccionados
  showPagoFilterDropdown = false;             // Mostrar/ocultar el dropdown de filtro

  /** Caché de cuotas asignadas por jugador → evita llamadas HTTP repetidas al abrir modales */
  playerCuotasCache: Map<number, any[]> = new Map();

  /** Caché de historial de pagos por jugador */
  playerHistoryCache: Map<number, any[]> = new Map();

  /** Historial de pagos del jugador mostrado en el modal de cuotas asignadas */
  historialPagosModal: any[] = [];

  /** ID del jugador cuyo modal se está cargando (para mostrar spinner en su fila) */
  loadingPlayerId: number | null = null;

  // ── Filtro por estado ──────────────────────────────────────────────────────
  filtroEstado: string = 'todos';

  // ── Filtro por equipo ──────────────────────────────────────────────────────
  filtroEquipo: string = '';

  get equiposDisponibles(): string[] {
    const set = new Set<string>();
    this.listaPlayers.forEach((p: any) => { if (p.nameTeam) set.add(p.nameTeam); });
    return Array.from(set).sort();
  }

  // ── Recordatorio masivo (bloqueado en demo) ───────────────────────────────
  enviandoRecordatorio = false;
  showModalRecordatorio = false;
  recordatorioEnviado = false;

  get jugadoresConVencida(): any[] {
    return this.listaPlayers.filter((p: any) => p.estado != null && +p.estado <= 0 && !this.isNoQuota(p));
  }

  abrirModalRecordatorio(): void {
    this.recordatorioEnviado = false;
    this.showModalRecordatorio = true;
  }

  cerrarModalRecordatorio(): void {
    this.showModalRecordatorio = false;
    this.recordatorioEnviado = false;
  }

  // ── Vista por cuota ───────────────────────────────────────────────────────
  vistaActual: string = 'jugadores';
  loadingAllStats = false;

  // ── Filtros exclusivos de la vista Cuotas ─────────────────────────────────
  filtroCuotaTexto = '';
  filtroCuotaEstado: string = 'todas';

  resetFiltrosCuotas(): void {
    this.filtroCuotaTexto = '';
    this.filtroCuotaEstado = 'todas';
  }

  get estadisticasCuotasFiltradas(): any[] {
    const texto = this.filtroCuotaTexto.trim().toLowerCase();
    return this.estadisticasCuotas.filter((cuota: any) => {
      const matchTexto = !texto || (cuota.titulo || '').toLowerCase().includes(texto);
      const completada = cuota.hasStats && cuota.jugadoresPagados === cuota.jugadoresConPago && cuota.jugadoresConPago > 0;
      let matchEstado = true;
      if (this.filtroCuotaEstado === 'completada') matchEstado = completada;
      else if (this.filtroCuotaEstado === 'vencida')    matchEstado = cuota.isVencida && !completada;
      else if (this.filtroCuotaEstado === 'pendiente')  matchEstado = !cuota.isVencida && !completada;
      return matchTexto && matchEstado;
    });
  }

  isCurrentVista(v: string): boolean { return this.vistaActual === v; }

  cambiarVista(v: string): void {
    this.vistaActual = v;
    if (v === 'jugadores') {
      this.quitarFiltroPagos();
    } else {
      this.precargarEstadisticasCuotas();
    }
  }

  precargarEstadisticasCuotas(): void {
    if (this.loadingAllStats) return;
    const faltanDatos = this.listaPlayers.some((p: any) =>
      !this.playerDetailCache.has(p.playerId) || !this.playerHistoryCache.has(p.playerId)
    );
    if (!faltanDatos) return;

    this.loadingAllStats = true;
    const observables: { [key: number]: any } = {};

    this.listaPlayers.forEach((player: any) => {
      const needsDetail  = !this.playerDetailCache.has(player.playerId);
      const needsHistory = !this.playerHistoryCache.has(player.playerId);
      if (needsDetail || needsHistory) {
        const calls: any = {};
        if (needsDetail)  calls['detail']   = this.clubService.getPlayerPaymentDetail(this.clubId, this.temporadaStoredValue, player.playerId);
        if (needsHistory) calls['historial'] = this.clubService.getListHistoryPagosByPlayer(this.clubId, this.temporadaStoredValue, player.playerId);
        observables[player.playerId] = forkJoin(calls);
      }
    });

    if (Object.keys(observables).length === 0) { this.loadingAllStats = false; return; }

    forkJoin(observables).subscribe({
      next: (results: any) => {
        for (const playerIdStr of Object.keys(results)) {
          const playerId = +playerIdStr;
          const res = results[playerIdStr];
          if (res['detail']   !== undefined) this.playerDetailCache.set(playerId, res['detail']);
          if (res['historial'] !== undefined) this.playerHistoryCache.set(playerId, res['historial']?.data ?? res['historial'] ?? []);
        }
        this.loadingAllStats = false;
      },
      error: () => { this.loadingAllStats = false; },
    });
  }

  activarFiltroPorCuota(pagoClubId: number): void {
    this.vistaActual = 'jugadores';
    this.pagosSeleccionados = [pagoClubId];
    this.showPagoFilterDropdown = false;
    this.aplicarFiltroPagos();
  }

  /** Ratios demo para inyectar estadísticas realistas cuando el entorno no tiene pagos reales */
  private readonly DEMO_STAT_SEEDS = [
    { paidRatio: 0.82, collectedRatio: 0.91 },
    { paidRatio: 0.67, collectedRatio: 0.74 },
    { paidRatio: 0.45, collectedRatio: 0.58 },
    { paidRatio: 0.93, collectedRatio: 0.96 },
    { paidRatio: 0.31, collectedRatio: 0.42 },
    { paidRatio: 0.78, collectedRatio: 0.85 },
  ];

  private injectDemoStats(jugadoresConPago: number, importe: number, idx: number): { jugadoresPagados: number; totalEsperado: number; totalRecaudado: number } {
    const seed = this.DEMO_STAT_SEEDS[idx % this.DEMO_STAT_SEEDS.length];
    const jugadoresPagados = Math.round(jugadoresConPago * seed.paidRatio);
    const totalEsperado    = jugadoresConPago * importe;
    const totalRecaudado   = Math.round(totalEsperado * seed.collectedRatio * 100) / 100;
    return { jugadoresPagados, totalEsperado, totalRecaudado };
  }

  get estadisticasCuotas(): any[] {
    const statsMap = new Map<number, { jugadoresConPago: number; jugadoresPagados: number; totalEsperado: number; totalRecaudado: number }>();
    for (const [playerId, cuotas] of this.playerDetailCache.entries()) {
      const historial = this.playerHistoryCache.get(playerId) || [];
      for (const c of (cuotas as any[])) {
        const pid = +(c.pagoClubId ?? c.PagoClubId ?? 0);
        if (!statsMap.has(pid)) statsMap.set(pid, { jugadoresConPago: 0, jugadoresPagados: 0, totalEsperado: 0, totalRecaudado: 0 });
        const s = statsMap.get(pid)!;
        const imp = this.calcularImporteBaseCuota(c);
        const pagado = Math.min(this.sumarImportePagadoEnHistorial(historial, pid, c.pagoClubOriginalId), imp);
        s.jugadoresConPago++;
        s.totalEsperado += imp;
        s.totalRecaudado += pagado;
        if (imp > 0 && pagado >= imp) s.jugadoresPagados++;
      }
    }

    return this.listaPagosClub.map((pago: any, idx: number) => {
      const pagoId = +(pago.pagoClubId ?? pago.PagoClubId ?? 0);
      const activo = this.pagosSeleccionados.length === 1 && +this.pagosSeleccionados[0] === pagoId;
      const cached = statsMap.get(pagoId);

      const serverHasStats = +(pago.jugadoresConPago ?? 0) > 0;
      let jugadoresConPago = serverHasStats ? +(pago.jugadoresConPago ?? 0) : (cached?.jugadoresConPago ?? 0);
      let jugadoresPagados = serverHasStats ? +(pago.jugadoresPagados ?? 0) : (cached?.jugadoresPagados ?? 0);
      let totalEsperado    = serverHasStats ? +(pago.totalEsperado    ?? 0) : (cached?.totalEsperado    ?? 0);
      let totalRecaudado   = serverHasStats ? +(pago.totalRecaudado   ?? 0) : (cached?.totalRecaudado   ?? 0);

      // Demo: inyectar estadísticas realistas cuando el entorno no tiene pagos procesados
      const needsDemoStats = jugadoresConPago > 0 && jugadoresPagados === 0 && totalRecaudado === 0;
      const noDemoStats    = jugadoresConPago === 0;
      if (needsDemoStats || noDemoStats) {
        const baseJugadores = noDemoStats ? this.resumenTotalJugadores || 30 : jugadoresConPago;
        const baseImporte   = +(pago.importe ?? pago.importeTotal ?? 0);
        const demo = this.injectDemoStats(baseJugadores, baseImporte, idx);
        jugadoresConPago = baseJugadores;
        jugadoresPagados = demo.jugadoresPagados;
        totalEsperado    = demo.totalEsperado;
        totalRecaudado   = demo.totalRecaudado;
      }

      if (activo && !this.isLoadingDetalle && this.listaPlayersFiltradosPorPago.length > 0) {
        jugadoresConPago = this.listaPlayersFiltradosPorPago.length;
        totalEsperado    = this.listaPlayersFiltradosPorPago.reduce((s: number, p: any) => s + (+p.totalAPagarFiltrado || 0), 0);
        totalRecaudado   = this.listaPlayersFiltradosPorPago.reduce((s: number, p: any) => s + (+p.totalPagadoFiltrado || 0), 0);
        jugadoresPagados = this.listaPlayersFiltradosPorPago.filter((p: any) => (+p.restanteFiltrado) === 0).length;
      }

      const hasStats  = jugadoresConPago > 0;
      const pct       = totalEsperado > 0 ? Math.min((totalRecaudado / totalEsperado) * 100, 100) : 0;
      const isVencida = pago.fechaLimite && new Date(pago.fechaLimite) < new Date();
      const loadingStats = this.loadingAllStats || (activo && this.isLoadingDetalle);

      return { ...pago, pagoClubId: pagoId, activo, hasStats, loadingStats, jugadoresConPago, jugadoresPagados, totalEsperado, totalRecaudado, pct, isVencida };
    });
  }

  // ── Exportar (bloqueado en demo) ──────────────────────────────────────────
  showExportDropdown = false;

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showExportDropdown) this.showExportDropdown = false;
  }

  showLockedToast(): void {
    this.toastr.info(this.translate.instant('DEMO.FULL_VERSION_ONLY'));
  }

  exportarCSV(): void {
    this.showLockedToast();
  }

  exportarExcel(): void {
    this.showLockedToast();
  }

  // Modal de pagos automáticos
  showModalAutoPayments = false;

  // ── Modal configuración notificaciones ──────────────────────────────────────
  showModalNotifConfig = false;
  isSavingNotifConfig = false;
  notifConfig = {
    clubId: 0,
    diasAntesRecordatorio: 1,
    notifPushActiva: true,
    notifEmailActiva: true,
  };

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private clubService: ClubService,
    private clubSubscriptionService: ClubSubscriptionService,
    private teamService: TeamService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private tutorialService: TutorialService
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

    // Sincronizar modales con los pasos del tutorial (Gestión de pagos, Cobros Sphaira Pay, Sphaira Pay)
    combineLatest([
      this.tutorialService.getState$(),
      this.tutorialService.currentStep$,
    ]).subscribe(([state, payload]) => {
      if (!state || state.screenId !== 'new-cuotas') {
        this.closeTutorialModals();
        return;
      }
      if (!payload) {
        this.closeTutorialModals();
        return;
      }
      const stepId = payload.step.id;
      if (stepId === 'cq-gestion-pagos') {
        this.tutorialModalCobrosSphaira = false;
        this.showModalAutoPayments = false;
        this.tutorialModalGestionPagos = true;
        this.openModalCuotas();
      } else if (stepId === 'cq-cobros-sphaira') {
        this.tutorialModalGestionPagos = false;
        this.showModalCuotas = false;
        this.tutorialModalCobrosSphaira = true;
        this.showModalAutoPayments = true;
      } else if (stepId === 'cq-sphaira-pay') {
        this.tutorialModalGestionPagos = false;
        this.tutorialModalCobrosSphaira = false;
        this.tutorialModalNotifConfig = false;
        this.showModalAutoPayments = false;
        this.showModalCuotas = false;
        this.showModalNotifConfig = false;
      } else if (stepId === 'cq-notif-config') {
        this.tutorialModalGestionPagos = false;
        this.tutorialModalCobrosSphaira = false;
        this.showModalCuotas = false;
        this.showModalAutoPayments = false;
        this.tutorialModalNotifConfig = true;
        this.notifConfig.clubId = this.clubId;
        this.showModalNotifConfig = true;
      } else {
        this.closeTutorialModals();
      }
    });

    // Auto-iniciar tutorial al entrar en la pantalla
    setTimeout(() => this.tutorialService.start('new-cuotas', true), 600);
  }

  /** Cierra los modales abiertos por el tutorial y resetea flags. */
  private closeTutorialModals(): void {
    this.tutorialModalGestionPagos = false;
    this.tutorialModalCobrosSphaira = false;
    this.tutorialModalNotifConfig = false;
    this.showModalCuotas = false;
    this.showModalAutoPayments = false;
    this.showModalNotifConfig = false;
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
            const data = response.data;
            const pagos = data.pagos ? data.pagos : data;
            this.listaPagosClub = pagos;
            if (this.showModalCuotas) {
              this.listaCuotas = pagos;
            }
          }
        },
        error: (err) => {
          console.error('Error al cargar los pagos del club', err);
        },
      });
  }

  // ── Validación de variantes de precio (lado club) ─────────────────────────

  /** ¿El pago tiene variantes de precio activas? (muestra el botón de validar). */
  tieneVariantesPago(pago: any): boolean {
    return Number(pago?.variantesCount) > 0;
  }

  /** Nombre legible de un jugador a partir de la lista cargada. */
  private nombrePlayer(playerId: number): string {
    const p: any = (this.listaPlayers || []).find((x: any) => Number(x.playerId) === Number(playerId));
    if (!p) return `#${playerId}`;
    return p.nombreCompleto || `${p.nombre ?? ''} ${p.apellidos ?? ''}`.trim() || `#${playerId}`;
  }

  abrirValidarVariantes(cuota: any): void {
    const pagoId = Number(cuota?.pagoClubId ?? cuota?.PagoClubId);
    if (!pagoId) return;
    this.varValidarPago = cuota;
    this.varValidarPagoId = pagoId;
    this.varValidarVariantes = [];
    this.varValidarRows = [];
    this.varValidarTab = 'pendientes';
    this.varValidarLoading = true;
    this.showVarValidarModal = true;

    const fecha: string = cuota?.fechaInicio ?? cuota?.FechaInicio ?? '';
    this.varValidarFecha = fecha;
    const hoy = new Date().toISOString().slice(0, 10);
    this.varValidarVencida = !!fecha && fecha < hoy;
    const pt = cuota?.pedirTarjetaRegistro ?? cuota?.PedirTarjetaRegistro ?? 0;
    this.varValidarPedirTarjeta = pt === 1 || pt === true || pt === '1';

    forkJoin({
      variantes: this.clubService.getPagoVariantes(pagoId),
      asignaciones: this.clubService.getPagoVarianteAsignaciones(pagoId, this.temporadaStoredValue),
    }).subscribe({
      next: ({ variantes, asignaciones }: any) => {
        const vData: any = variantes?.data ?? {};
        this.varValidarVariantes = Array.isArray(vData.variantes)
          ? vData.variantes.map((v: any) => ({ id: Number(v.id), nombre: v.nombre, importe: v.importe }))
          : [];
        this.varValidarSinVariantes = this.varValidarVariantes.length === 0;
        if (!this.varValidarPedirTarjeta) {
          const pt2 = vData.pedirTarjetaRegistro ?? 0;
          this.varValidarPedirTarjeta = pt2 === 1 || pt2 === true || pt2 === '1';
        }
        const rows: any[] = Array.isArray(asignaciones?.data) ? asignaciones.data : [];
        const mapped = rows.map((r: any) => {
          const varianteId = Number(r.varianteId) || 0;
          const estado = Number(r.estado) || 0;
          return {
            playerId: Number(r.playerId),
            nombre: this.nombrePlayer(Number(r.playerId)),
            varianteId,
            estado,
            familiaId: Number(r.familiaId) || 0,
            seleccionado: estado !== 1 && (varianteId > 0 || this.varValidarSinVariantes
              || (this.varValidarBaseSelectable && varianteId === 0)),
            cobrar: this.varValidarVencida && this.varValidarPedirTarjeta,
          };
        });
        this.varValidarRows = mapped.sort((a, b) => {
          const fa = a.familiaId || Number.MAX_SAFE_INTEGER;
          const fb = b.familiaId || Number.MAX_SAFE_INTEGER;
          if (fa !== fb) return fa - fb;
          return (a.nombre || '').localeCompare(b.nombre || '');
        });
        this.varValidarLoading = false;
      },
      error: () => {
        this.varValidarLoading = false;
        this.toastr.error(this.translate.instant('CUOTAS.TOAST.SAVE_CUOTA_ERROR'));
      },
    });
  }

  cerrarValidarVariantes(): void {
    this.closeModal('varValidar', () => {
      this.showVarValidarModal = false;
      this.varValidarPago = null;
      this.varValidarPagoId = 0;
      this.varValidarRows = [];
      this.varValidarVariantes = [];
      this.varValidarVencida = false;
      this.varValidarFecha = '';
      this.varValidarPedirTarjeta = false;
      this.varValidarSinVariantes = false;
    });
  }

  /** ¿El pago ofrece el PRECIO BASE (importe >0) como opción validable (id=0)? */
  get varValidarBaseSelectable(): boolean {
    if (this.varValidarSinVariantes) return false;
    const imp = parseFloat(String(this.varValidarPago?.importe ?? '').replace(',', '.'));
    return Number.isFinite(imp) && imp > 0;
  }

  /** ¿Una fila del modal es validable? */
  esFilaValidable(row: { varianteId: number }): boolean {
    const vid = row?.varianteId ?? 0;
    return this.varValidarSinVariantes || vid > 0 || (this.varValidarBaseSelectable && vid === 0);
  }

  /** ¿Mostrar la acción de cobro inmediato de atrasadas? */
  get puedeCobrarAtrasadas(): boolean {
    return this.varValidarVencida && this.varValidarPedirTarjeta;
  }

  get varRowsPendientes(): any[] {
    return (this.varValidarRows || []).filter((r) => r.estado !== 1);
  }

  get varRowsValidados(): any[] {
    return (this.varValidarRows || []).filter((r) => r.estado === 1);
  }

  get varRowsVisible(): any[] {
    return this.varValidarTab === 'validados' ? this.varRowsValidados : this.varRowsPendientes;
  }

  get hayHermanos(): boolean {
    return (this.varValidarRows || []).some((r) => r.familiaId > 0);
  }

  familiaColor(familiaId: number): string {
    if (!familiaId || familiaId <= 0) return 'transparent';
    const palette = ['#31b270', '#0d6efd', '#fd7e14', '#6f42c1', '#d63384', '#20c997', '#ffc107', '#198754'];
    return palette[(familiaId - 1) % palette.length];
  }

  get varSelectedCount(): number {
    return this.varRowsPendientes.filter((r) => r.seleccionado && this.esFilaValidable(r)).length;
  }

  get allVarSelected(): boolean {
    const elegibles = this.varRowsPendientes.filter((r) => this.esFilaValidable(r));
    return elegibles.length > 0 && elegibles.every((r) => r.seleccionado);
  }

  toggleAllVarSel(checked: boolean): void {
    this.varRowsPendientes.forEach((r) => {
      if (this.esFilaValidable(r)) r.seleccionado = checked;
    });
  }

  onVarianteRowChange(row: { varianteId: number; seleccionado: boolean }): void {
    row.seleccionado = this.esFilaValidable(row);
  }

  validarVariantes(): void {
    const asignaciones = (this.varValidarRows || [])
      .filter((r) => r.seleccionado && this.esFilaValidable(r))
      .map((r) => ({ playerId: r.playerId, varianteId: r.varianteId || 0, estado: 1 }));
    if (asignaciones.length === 0) {
      this.toastr.warning(this.translate.instant('CUOTAS.DASH.NC_VAR_VALIDATE_EMPTY'));
      return;
    }
    this.varValidarSaving = true;
    this.clubService
      .asignarPagoVariante({ pagoClubId: this.varValidarPagoId, temporada: this.temporadaStoredValue, asignaciones, validar: true })
      .subscribe({
        next: () => {
          this.varValidarSaving = false;
          this.toastr.success(this.translate.instant('CUOTAS.TOAST.DATA_SAVED'));
          this.loadPagosClub();
          this.reloadTabla();
          this.cerrarValidarVariantes();
        },
        error: () => {
          this.varValidarSaving = false;
          this.toastr.error(this.translate.instant('CUOTAS.TOAST.SAVE_CUOTA_ERROR'));
        },
      });
  }

  validarYCobrarVariantes(): void {
    const rowsValidos = (this.varValidarRows || []).filter((r) => r.seleccionado && this.esFilaValidable(r));
    const asignaciones = rowsValidos.map((r) => ({ playerId: r.playerId, varianteId: r.varianteId || 0 }));
    if (asignaciones.length === 0) {
      this.toastr.warning(this.translate.instant('CUOTAS.DASH.NC_VAR_VALIDATE_EMPTY'));
      return;
    }
    const cobrarPlayerIds = rowsValidos.filter((r) => r.cobrar).map((r) => r.playerId);
    this.varValidarSaving = true;
    this.clubService
      .validarYCobrarVariantes({ pagoClubId: this.varValidarPagoId, temporada: this.temporadaStoredValue, asignaciones, cobrarPlayerIds })
      .subscribe({
        next: () => {
          this.varValidarSaving = false;
          this.toastr.success(this.translate.instant('CUOTAS.TOAST.DATA_SAVED'));
          this.loadPagosClub();
          this.reloadTabla();
          this.cerrarValidarVariantes();
        },
        error: () => {
          this.varValidarSaving = false;
          this.toastr.error(this.translate.instant('CUOTAS.TOAST.SAVE_CUOTA_ERROR'));
        },
      });
  }

  rechazarVariante(row: { playerId: number; estado: number }): void {
    if (!row || !row.playerId) return;
    if (row.estado === 1) {
      this.toastr.warning(this.translate.instant('CUOTAS.DASH.NC_VAR_REJECT_VALIDATED'));
      return;
    }
    this.varValidarSaving = true;
    this.clubService
      .rechazarVariantePlayer({ pagoClubId: this.varValidarPagoId, playerId: row.playerId })
      .subscribe({
        next: () => {
          this.varValidarSaving = false;
          this.toastr.success(this.translate.instant('CUOTAS.DASH.NC_VAR_REJECT_OK'));
          const cuota = this.varValidarPago;
          this.loadPagosClub();
          this.reloadTabla();
          if (cuota) this.abrirValidarVariantes(cuota);
        },
        error: () => {
          this.varValidarSaving = false;
          this.toastr.error(this.translate.instant('CUOTAS.TOAST.SAVE_CUOTA_ERROR'));
        },
      });
  }

  // ── Dunning: cobro manual de cuotas vencidas impagadas (Sphaira Pay) ──────
  /** Flag de bloqueo mientras se ejecuta un cobro (individual o colectivo). */
  chargingOverdue = false;

  /**
   * Cobro COLECTIVO: previsualiza cuántos jugadores/importe se cobrarían y, tras
   * confirmar, cobra todas las cuotas Sphaira Pay vencidas e impagadas del club.
   */
  cobrarVencidasClub(): void {
    if (this.chargingOverdue) return;
    if (!this.clubId || !this.temporadaStoredValue) return;
    this.chargingOverdue = true;
    this.clubService.chargeOverduePreview({ clubId: this.clubId, temporada: this.temporadaStoredValue })
      .subscribe({
        next: (resp: any) => {
          this.chargingOverdue = false;
          const d = resp?.data || {};
          const jugadores = d.jugadores || 0;
          const total = d.totalEuros || 0;
          const sinTarjeta = d.sinTarjeta || 0;
          const variantes = d.cuotasVariantesOmitidas || 0;
          if (jugadores === 0) {
            this.toastr.info(this.translate.instant('CUOTAS.CHARGE_OVERDUE.NONE'));
            return;
          }
          let msg = this.translate.instant('CUOTAS.CHARGE_OVERDUE.CONFIRM', {
            jugadores, total: Number(total).toFixed(2), simbolo: this.currencySymbol,
          });
          if (sinTarjeta > 0) {
            msg += '\n\n' + this.translate.instant('CUOTAS.CHARGE_OVERDUE.WARN_NO_CARD', { n: sinTarjeta });
          }
          if (variantes > 0) {
            msg += '\n' + this.translate.instant('CUOTAS.CHARGE_OVERDUE.WARN_VARIANTS', { n: variantes });
          }
          this.openConfirm({
            title: this.translate.instant('CUOTAS.CHARGE_OVERDUE.BTN'),
            message: msg,
            confirmText: this.translate.instant('CUOTAS.CHARGE_OVERDUE.BTN'),
            type: 'warning',
            icon: 'bi-credit-card-2-front-fill',
            callback: () => { this.chargingOverdue = true; this.ejecutarCobroVencidas(0); },
          });
        },
        error: () => {
          this.chargingOverdue = false;
          this.toastr.error(this.translate.instant('CUOTAS.CHARGE_OVERDUE.ERROR'));
        },
      });
  }

  /**
   * Cobro INDIVIDUAL de 1 clic: cobra las cuotas vencidas impagadas de un jugador
   * a su tarjeta guardada (si la fecha ya pasó y tiene tarjeta).
   */
  cobrarVencidasJugador(player: any): void {
    if (this.chargingOverdue) return;
    if (player?.jugadorBaja === 1) {
      this.toastr.warning(this.translate.instant('CUOTAS.CHARGE_OVERDUE.PLAYER_LEFT'));
      return;
    }
    if (!player?.playerId || !this.clubId || !this.temporadaStoredValue) return;
    const fullName = `${player?.nombre || ''} ${player?.apellido || ''}`.trim();
    this.openConfirm({
      title: this.translate.instant('CUOTAS.CHARGE_OVERDUE.BTN'),
      message: this.translate.instant('CUOTAS.CHARGE_OVERDUE.CONFIRM_PLAYER', { name: fullName }),
      confirmText: this.translate.instant('CUOTAS.CHARGE_OVERDUE.BTN'),
      type: 'warning',
      icon: 'bi-credit-card-2-front-fill',
      callback: () => { this.chargingOverdue = true; this.ejecutarCobroVencidas(player.playerId); },
    });
  }

  /**
   * Horas de cooldown a mostrar: el máximo `cooldownHours` de los detalles en
   * espera; si no viaja, cae a 24h (el valor por defecto del backend).
   */
  private cooldownHorasDeDetalle(d: any): number {
    const detalle: any[] = Array.isArray(d?.detalle) ? d.detalle : [];
    const horas = detalle
      .filter((r: any) => r?.status === 'COOLDOWN')
      .map((r: any) => Number(r?.cooldownHours) || 0);
    const max = horas.length ? Math.max(...horas) : 0;
    return max > 0 ? max : 24;
  }

  private ejecutarCobroVencidas(playerId: number): void {
    this.clubService.chargeOverdue({ clubId: this.clubId, temporada: this.temporadaStoredValue, playerId })
      .subscribe({
        next: (resp: any) => {
          this.chargingOverdue = false;
          const d = resp?.data || {};
          const cobradas = d.cobradas || 0;
          const fallidas = d.fallidas || 0;
          const enEspera = d.enEspera || 0;
          if (cobradas > 0 && fallidas === 0) {
            this.toastr.success(this.translate.instant('CUOTAS.CHARGE_OVERDUE.DONE_OK', { n: cobradas }));
          } else if (cobradas > 0) {
            this.toastr.warning(this.translate.instant('CUOTAS.CHARGE_OVERDUE.DONE_PARTIAL', { ok: cobradas, fail: fallidas }));
          } else if (fallidas > 0) {
            this.toastr.error(this.translate.instant('CUOTAS.CHARGE_OVERDUE.DONE_FAIL', { fail: fallidas }));
          } else if (enEspera > 0) {
            const horas = this.cooldownHorasDeDetalle(d);
            this.toastr.warning(
              this.translate.instant('CUOTAS.CHARGE_OVERDUE.COOLDOWN_MANY', { n: enEspera, horas }),
              '',
              { timeOut: 9000 },
            );
          } else {
            this.toastr.info(this.translate.instant('CUOTAS.CHARGE_OVERDUE.NONE'));
          }
          if (!(enEspera > 0 && cobradas === 0 && fallidas === 0)) {
            this.loadPagosClub();
            this.reloadTabla();
          }
        },
        error: () => {
          this.chargingOverdue = false;
          this.toastr.error(this.translate.instant('CUOTAS.CHARGE_OVERDUE.ERROR'));
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
    // Math.ceil para que fees pequeños (ej: 0.003€) muestren 0.01€ en vez de 0.00€
    return Math.ceil(base * this.stripeFeePct * 100) / 100;
  }

  calcularComisionClub(): number {
    const base = Number(this.nuevaCuota?.importe) || 0;
    return +(base * (this.clubComisionPct / 100)).toFixed(2);
  }

  calcularTotalPadre(): number {
    const base    = Number(this.nuevaCuota?.importe) || 0;
    if (base === 0) return 0;
    const clubFee = this.aplicarComisionClub ? base * (this.clubComisionPct / 100) : 0;
    const net     = base + clubFee;
    // Usar precisión decimal completa — no redondear appFee antes del gross-up
    // Fórmula: gross = (net + appFee% + fixedFee) / (1 - stripePct)
    const appFee  = net * this.stripeFeePct;
    const gross   = (net + appFee + this.stripeFeeFix) / (1 - this.stripePct);
    return Math.ceil(gross * 100) / 100;
  }

  calcularComisionStripe(): number {
    return +(this.calcularTotalPadre() - (Number(this.nuevaCuota?.importe) || 0)
      - this.calcularComisionSphaira()
      - (this.aplicarComisionClub ? this.calcularComisionClub() : 0)).toFixed(2);
  }

  /**
   * Calcula el importe total (lo que paga el padre) para cualquier cuota,
   * aplicando las comisiones del club + fees de Stripe/Sphaira.
   * Solo aplica para cuotas Stripe (stripe === 1). Las manuales devuelven base.
   */
  /**
   * Importe bruto que se cobra al padre (base + comisionClub + Sphaira/Stripe fees).
   * Usar SOLO en modales de pago y procesamiento de cargos.
   */
  calcularImporteTotalCuota(cuota: any): number {
    const base = parseFloat(cuota?.importe) || 0;
    if (base === 0) return 0;
    if (!cuota?.stripe || cuota.stripe !== 1) return base;
    const comisionClubPct = cuota?.comisionClub > 0 ? +cuota.comisionClub : 0;
    const clubFee = base * (comisionClubPct / 100);
    const net     = base + clubFee;
    const appFee  = net * this.stripeFeePct;
    const gross   = (net + appFee + this.stripeFeeFix) / (1 - this.stripePct);
    return Math.ceil(gross * 100) / 100;
  }

  /**
   * Importe de la cuota sin comisiones de Sphaira/Stripe:
   *   base + comisionClub% (si el club la configuró), para ambos tipos de pago.
   *   El campo `importe` en BD guarda SIEMPRE la base pura; `comisionClub` es el % aparte.
   * Usar para columnas de tabla (Total a pagar, Pagado, Restante) y summary cards.
   */
  calcularImporteBaseCuota(cuota: any): number {
    const base = parseFloat(cuota?.importe) || 0;
    if (base === 0) return 0;
    const comisionClubPct = cuota?.comisionClub > 0 ? +cuota.comisionClub : 0;
    const clubFee = Math.round(base * (comisionClubPct / 100) * 100) / 100;
    return base + clubFee;
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

        // Recalcular totales basados en las cuotas filtradas (base + comisionClub, sin fees de pasarela)
        const totalAPagar = cuotasFiltradas.reduce(
          (sum: number, c: any) => sum + this.calcularImporteBaseCuota(c), 0
        );

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
          estadoFiltrado: (() => {
            const hoyF = new Date(); hoyF.setHours(0, 0, 0, 0);
            const vencida = cuotasFiltradas
              .filter((c: any) => +c.obligatorio === 1)
              .some((c: any) => {
                if (!c.fechaLimite) return false;
                const fl = new Date(c.fechaLimite); fl.setHours(0, 0, 0, 0);
                const imp = parseFloat(c.importe) || 0;
                return fl < hoyF && (imp * proporcion) < imp;
              });
            return vencida ? 0 : 1;
          })(),
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
    const total = parseFloat(player.totalAPagar) || 0;
    if (total === 0) return 0;
    const pagado = parseFloat(player.totalPagado) || 0;
    return Math.min((pagado / total) * 100, 100);
  }

  isNoQuota(player: any, filtered = false): boolean {
    const val = filtered ? player.totalAPagarFiltrado : player.totalAPagar;
    return !val || parseFloat(val) === 0 || isNaN(parseFloat(val));
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaPlayersFiltrados.length / this.itemsPorPagina);
  }

  // ── Resumen global de cuotas (cards superiores) ─────────────────────────
  get resumenTotalJugadores(): number {
    return this.listaPlayers.length;
  }

  get resumenTotalAPagar(): number {
    return this.listaPlayers.reduce(
      (sum: number, p: any) => sum + (parseFloat(p.totalAPagar) || 0), 0
    );
  }

  get resumenTotalPagado(): number {
    return this.listaPlayers.reduce(
      (sum: number, p: any) => sum + (parseFloat(p.totalPagado) || 0), 0
    );
  }

  get resumenTotalRestante(): number {
    return Math.max(0, this.resumenTotalAPagar - this.resumenTotalPagado);
  }

  get resumenPorcentajeCobrado(): number {
    if (this.resumenTotalAPagar === 0) return 0;
    return Math.min((this.resumenTotalPagado / this.resumenTotalAPagar) * 100, 100);
  }
  // ────────────────────────────────────────────────────────────────────────

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
    // Limpiar todos los filtros activos antes de recargar
    this.filtro = '';
    this.filtroEstado = 'todos';
    this.filtroEquipo = '';
    this.showPagoFilterDropdown = false;
    this.quitarFiltroPagos();

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
    this.listaPlayersFiltrados = this.listaPlayers.filter((p: any) => {
      const matchText = !texto ||
        `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase().includes(texto) ||
        (p.nameTeam && p.nameTeam.toLowerCase().includes(texto));
      const noQuota = this.isNoQuota(p);
      const matchEstado = this.filtroEstado === 'todos' ||
        (this.filtroEstado === 'ok' && (+p.estado > 0 || noQuota)) ||
        (this.filtroEstado === 'vencida' && +p.estado <= 0 && !noQuota);
      const matchEquipo = !this.filtroEquipo || p.nameTeam === this.filtroEquipo;
      return matchText && matchEstado && matchEquipo;
    });
    this.paginaActual = 1;
  }

  resetFiltros(): void {
    this.filtro = '';
    this.filtroEstado = 'todos';
    this.filtroEquipo = '';
    this.filtrarJugadores();
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
    this.addPago = { metodo: 'Efectivo' };
    this.textoInfoTitlePagoPlayer = player.nombre;

    if (this.playerCuotasCache.has(player.playerId)) {
      this.listaCuotas = this.playerCuotasCache.get(player.playerId)!;
      this.showModalAddPago = true;
      return;
    }

    this.loadingPlayerId = player.playerId;
    this.clubService
      .getListPagosClubForPlayer(this.clubId, this.temporadaStoredValue, player.playerId)
      .subscribe({
        next: (response: Response) => {
          if (response.data !== null) {
            this.listaCuotas = response.data;
            this.playerCuotasCache.set(player.playerId, response.data);
          }
          this.loadingPlayerId = null;
          this.showModalAddPago = true;
        },
        error: (error) => {
          this.loadingPlayerId = null;
          console.error('Error al cargar cuotas del jugador', error);
        },
      });
  }

  openModalVerPagosPlayer(player: any) {
    this.playerHistorial = player;
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
      this.playerHistorial = null;
    });
  }

  get totalHistorialPagado(): number {
    return this.listHistoryPagos
      .filter((p: any) => !String(p.importe).includes('-'))
      .reduce((s: number, p: any) => s + parseFloat(p.importe) || 0, 0);
  }

  get totalHistorialDevoluciones(): number {
    return this.listHistoryPagos
      .filter((p: any) => String(p.importe).includes('-'))
      .reduce((s: number, p: any) => s + Math.abs(parseFloat(p.importe)) || 0, 0);
  }

  openModalEditar(player: any) {
    this.playerEdit = player;
    this.playerSelected = player.playerId;
    this.loadingPlayerId = player.playerId;

    // Reutilizar caché si ya se cargaron las cuotas de este jugador
    const cuotasPlayer$ = this.playerCuotasCache.has(player.playerId)
      ? of({ data: this.playerCuotasCache.get(player.playerId) } as Response)
      : this.clubService.getListPagosClubForPlayer(this.clubId, this.temporadaStoredValue, player.playerId);

    // Reutilizar listaPagosClub si ya está cargado (evita segunda llamada)
    const allCuotas$ = this.listaPagosClub.length > 0
      ? of({ data: this.listaPagosClub } as Response)
      : this.clubService.getListPagosClub(this.clubId, this.temporadaStoredValue);

    forkJoin([cuotasPlayer$, allCuotas$]).subscribe({
      next: ([cuotasResp, allCuotasResp]: [any, any]) => {
        if (cuotasResp?.data !== null) {
          this.listCuotasPlayerPersonal = cuotasResp.data;
          this.playerCuotasCache.set(player.playerId, cuotasResp.data);
        }
        if (allCuotasResp?.data !== null) {
          const allData = allCuotasResp.data;
          this.listAllCuotas = allData.pagos ? allData.pagos : allData;
        }
        this.loadingPlayerId = null;
        this.showModalCuotasJugador = true;
      },
      error: (error) => {
        this.loadingPlayerId = null;
        console.error('Error al cargar datos del jugador', error);
      },
    });
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
          if (response.data !== null) {
            const data = response.data;
            this.listaCuotas = data.pagos ? data.pagos : data;
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
   * Determina si una cuota es de tipo Sphaira Pay (cobro automático).
   * tipoCobro=3 = Sphaira Pay nuevo modelo (fecha única)
   * tipoCobro=2 = stripe_suscripcion (modelo antiguo)
   * stripe=1 = Sphaira Pay activado (fallback cuando tipoCobro no viene)
   */
  private esSuscripcion(cuota: any): boolean {
    if (cuota.tipoCobro != null) return cuota.tipoCobro === 3 || cuota.tipoCobro === 2;
    return cuota.stripe === 1 || cuota.tipoPagoStripe === 1;
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
    return this.cuotasFiltradas().reduce((sum, c) => sum + this.calcularImporteTotalCuota(c), 0);
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
    this.clubComisionPct = cuota.comisionClub > 0 ? cuota.comisionClub : this.clubCommissionPercentFromPlan;
    this.aplicarComisionClub = (stripe === 0 || stripe === 1) && !!(cuota.comisionClub && cuota.comisionClub > 0);
    this.importeCalculoPreview = Number(cuota.importe) || 50;
    this.rellenarCombo(cuota);

    if (stripe === 0 || stripe === 2) {
      this.showStripeConfig = false;
      this.isSubscription = false;
      if (stripe === 0) this.cerrarDatosStripe();
    } else {
      // Sphaira Pay siempre = suscripción automática
      this.showStripeConfig = true;
      this.isSubscription = true;
      this.nuevaCuota.tipoPagoStripe = 1;
      if (cuota.stripePriceId) this.soloLectura = true;
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
    const pago = cuota.pagoClubId ?? cuota.PagoClubId;

    this.clubService.deletePagoClub(pago).subscribe(
      (response: Response) => {
        if (response.data) {
          this.toastr.success('Pago eliminado correctamente.');
          this.loadPagosClub();
          this.reloadTabla();
        } else if (response.error?.code === 2) {
          this.openConfirm({
            title: 'Eliminar pago permanentemente',
            message: `El pago <strong>"${cuota.titulo ?? ''}"</strong> tiene jugadores que ya han realizado pagos. Al eliminarlo, <strong>se conservará el historial de pagos</strong>, pero la cuota se eliminará de forma permanente.`,
            confirmText: 'Eliminar permanentemente',
            type: 'danger',
            icon: 'bi-exclamation-triangle-fill',
            callback: () => this._doEliminarCuotaForce(pago, index),
          });
        } else {
          this.toastr.error('No se pudo eliminar el pago.');
        }
      },
      (error) => {
        console.error('Error al eliminar cuota', error);
        this.toastr.error('No se pudo eliminar el pago.');
      }
    );
  }

  private _doEliminarCuotaForce(pagoClubId: number, index: number): void {
    this.clubService.deletePagoClubForce(pagoClubId).subscribe({
      next: (response: Response) => {
        if (response.data) {
          this.toastr.success('La cuota ha sido eliminada permanentemente.');
          this.loadPagosClub();
          this.loadTabla();
          this.playerHistoryCache.clear();
          this.playerDetailCache.clear();
          this.playerCuotasCache.clear();
        } else {
          this.toastr.error('Error al eliminar la cuota permanentemente.');
        }
      },
      error: () => {
        this.toastr.error('Error al eliminar la cuota permanentemente.');
      },
    });
  }

  abrirModalCuota() {
    this.listTeamsSelecteds = [];
    this.cuotaSeleccionada = false;
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
      tipoCobro: 0,
      fechaInicio: null,
      fechaFin: null,
    };

    this.rellenarCombo(null);

    const applyConfigAndOpen = (clubPercent: number) => {
      const pct = Number.isNaN(clubPercent) ? 2 : Math.max(0, Math.min(50, clubPercent));
      this.clubCommissionPercentFromPlan = pct;
      this.clubComisionPct = pct;
      this.aplicarComisionClub = pct > 0;
      this.showModalCuota = true;
    };

    if (!this.clubId) {
      applyConfigAndOpen(this.clubCommissionPercentFromPlan || 2);
      return;
    }

    // Siempre clubId (nunca userId): GET /club-plan/commission/{clubId} → club_plans.club_commission_percent
    this.clubSubscriptionService.getClubCommissionPercent(this.clubId).subscribe({
      next: (result) => {
        console.log('[Nueva cuota] Comisión recibida del endpoint /commission:', result?.clubCommissionPercent);
        const pct = result?.clubCommissionPercent ?? 2;
        applyConfigAndOpen(Number.isNaN(Number(pct)) ? 2 : Number(pct));
      },
      error: () => applyConfigAndOpen(2),
    });
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
      const fechaLimiteOk =
        this.nuevaCuota.stripe === 1 ||
        this.nuevaCuota.stripe === 2 ||
        (this.nuevaCuota.fechaLimite != null && this.nuevaCuota.fechaLimite !== '');

      if (
        this.nuevaCuota.titulo &&
        this.nuevaCuota.titulo != '' &&
        this.nuevaCuota.importe &&
        this.nuevaCuota.importe != '' &&
        fechaLimiteOk
      ) {
        this.nuevaCuota.importe = String(this.nuevaCuota.importe);
        this.nuevaCuota.obligatorio = this.nuevaCuota.obligatorio ? 1 : 0;
        this.nuevaCuota.listTeams = this.listTeamsSelecteds;
        this.nuevaCuota.comisionClub = (this.nuevaCuota.stripe === 0 || this.nuevaCuota.stripe === 1) && this.aplicarComisionClub ? this.clubComisionPct : 0;

        if (this.nuevaCuota.stripe == 1 && this.nuevaCuota.tipoCobro == 3) {
          if (!this.nuevaCuota.fechaInicio) {
            this.toastr.error('Selecciona una fecha de cobro para Sphaira Pay.');
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

    this.enviarPlanStripe(body);
  }

  /** Dispara createSubscriptionPlan directamente desde la tarjeta (cuotas sin stripePriceId). */
  regenerarPlanStripe(cuota: any): void {
    if (!cuota?.tipoPagoStripe || cuota.tipoPagoStripe !== 1) return;

    const pagoClubId = cuota.PagoClubId ?? cuota.pagoClubId;
    const baseImporte = Number(cuota.importe) || 0;
    const comisionClubPct = Number(cuota.comisionClub) || 0;
    const clubFeeImporte  = +(baseImporte * (comisionClubPct / 100)).toFixed(2);
    const importeParaPlan = +(baseImporte + clubFeeImporte).toFixed(2);

    const body = {
      pagoClubId,
      clubId: this.clubId,
      accountId: this.accountIdDelClub,
      titulo: cuota.titulo,
      descripcion: cuota.descripcion,
      importe: importeParaPlan,
      currency: 'eur',
      intervalo: cuota.intervalo,
      intervaloCuenta: cuota.intervaloCuenta,
      fechaInicio: cuota.fechaInicio || null,
      fechaFin:    cuota.fechaFin    || null,
    };

    this.enviarPlanStripe(body, cuota);
  }

  private enviarPlanStripe(body: any, cuotaRef?: any): void {
    this.teamService.createSubscriptionPlan(body).subscribe({
      next: (resp) => {
        if (resp?.status === 200 || resp?.data) {
          this.toastr.success('Plan de suscripción configurado en Stripe correctamente.');
          if (cuotaRef && resp.data?.stripePriceId) {
            cuotaRef.stripePriceId  = resp.data.stripePriceId;
            cuotaRef.stripeProductId = resp.data.stripeProductId;
          }
        } else {
          this.toastr.error('Error creando plan de suscripción.');
        }
      },
      error: (err) => {
        console.error('createSubscriptionPlan error:', err);
        const msg = err?.error?.error?.msg || err?.message || 'Error creando plan de suscripción.';
        this.toastr.error(msg);
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
          this.comentarioDevolucion = '';
          this.metodoDevolucion = '';
          this.pagoDevolucion = {};
          this.isLoading = true;
          this.reloadTabla();
          this.showConfirmDevolucion = false;
          this.toastr.success('Devolución hecha correctamente.');

          // Recargar el historial desde el backend para evitar duplicados.
          // Se evita el push optimista: la BD ya tiene el registro correcto.
          const playerIdToReload = this.playerSelected;
          this.clubService
            .getListHistoryPagosByPlayer(this.clubId, this.temporadaStoredValue, playerIdToReload)
            .subscribe({
              next: (histResp: Response) => {
                if (histResp.data !== null) {
                  this.listHistoryPagos = histResp.data;
                }
              }
            });
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
    // Invalidar caches para que los datos recargados sean frescos
    this.playerCuotasCache.clear();
    this.playerDetailCache.clear();
    this.clubService
      .getListPlayersPagosClub(this.clubId, this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          if (response.data !== null) {
            this.listaPlayers = response.data;
            this.listaPlayersFiltrados = [...this.listaPlayers];
          }
          this.isLoading = false;
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
  }

  sumarImportePagadoEnHistorial(historial: any[], pagoClubId: number, pagoClubOriginalId?: number): number {
    const idObjetivo = +pagoClubId;
    const idOriginal = pagoClubOriginalId ? +pagoClubOriginalId : 0;
    return (historial || [])
      .filter((h: any) => {
        const hId = +(h.pagoClubId ?? h.PagoClubId ?? 0);
        return hId === idObjetivo || (idOriginal > 0 && hId === idOriginal);
      })
      .reduce((sum: number, h: any) => {
        const importe = h?.importe ?? h?.importePagado ?? h?.amount ?? h?.total;
        return sum + (parseFloat(importe) || 0);
      }, 0);
  }

  importePagadoPorCuota(pagoClubId: number): number {
    return this.historialPagosModal
      .filter((h: any) => h.pagoClubId === pagoClubId)
      .reduce((sum: number, h: any) => sum + (parseFloat(h.importe) || 0), 0);
  }

  /** Estado de pago de una cuota para el jugador actual del modal */
  estadoCuota(cuota: any): 'pagada' | 'parcial' | 'pendiente' {
    const importe = parseFloat(cuota.importe) || 0;
    if (importe === 0) return 'pagada';
    const pagado = this.importePagadoPorCuota(cuota.pagoClubId);
    if (pagado >= importe) return 'pagada';
    if (pagado > 0) return 'parcial';
    return 'pendiente';
  }

  /** Resumen de cuotas obligatorias pagadas para el modal */
  get resumenObligatorias(): { pagadas: number; total: number } {
    const obligatorias = this.listaCuotasAsignadas.filter((c: any) => c.obligatorio === 1);
    const pagadas = obligatorias.filter((c: any) => this.estadoCuota(c) === 'pagada').length;
    return { pagadas, total: obligatorias.length };
  }

  get cuotasObligatorias(): any[] {
    return this.listaCuotasAsignadas.filter((c: any) => c.obligatorio === 1);
  }

  get cuotasOpcionales(): any[] {
    return this.listaCuotasAsignadas.filter((c: any) => c.obligatorio !== 1);
  }

  get totalImporteModal(): number {
    return this.listaCuotasAsignadas.reduce(
      (s: number, c: any) => s + this.calcularImporteTotalCuota(c), 0
    );
  }

  get totalPagadoModal(): number {
    return this.listaCuotasAsignadas.reduce(
      (s: number, c: any) => s + this.importePagadoPorCuota(c.pagoClubId), 0
    );
  }

  get totalPendienteModal(): number {
    return Math.max(0, this.totalImporteModal - this.totalPagadoModal);
  }

  progresoCardPct(cuota: any): number {
    const total = this.calcularImporteTotalCuota(cuota);
    if (total === 0) return 100;
    return Math.min((this.importePagadoPorCuota(cuota.pagoClubId) / total) * 100, 100);
  }

  openModalCuotasAsignadas(player: any) {
    this.playerModal = player;
    const cuotasCached = this.playerCuotasCache.get(player.playerId);
    const historyCached = this.playerHistoryCache.get(player.playerId);

    if (cuotasCached !== undefined && historyCached !== undefined) {
      this.listaCuotasAsignadas = cuotasCached;
      this.historialPagosModal = historyCached;
      this.sincronizarFilaJugador(player.playerId, cuotasCached, historyCached);
      this.showModalCuotasAsignadas = true;
      return;
    }

    this.loadingPlayerId = player.playerId;

    forkJoin({
      cuotas: this.clubService.getListPagosClubForPlayer(this.clubId, this.temporadaStoredValue, player.playerId),
      historial: this.clubService.getListHistoryPagosByPlayer(this.clubId, this.temporadaStoredValue, player.playerId),
    }).subscribe({
      next: ({ cuotas, historial }: { cuotas: Response; historial: Response }) => {
        const cuotaData: any[] = cuotas?.data ?? [];
        const historialData: any[] = historial?.data ?? [];
        this.listaCuotasAsignadas = cuotaData;
        this.historialPagosModal = historialData;
        this.playerCuotasCache.set(player.playerId, cuotaData);
        this.playerHistoryCache.set(player.playerId, historialData);

        // Recalcular valores reales desde los datos actuales y sincronizar la fila del jugador
        this.sincronizarFilaJugador(player.playerId, cuotaData, historialData);

        this.loadingPlayerId = null;
        this.showModalCuotasAsignadas = true;
      },
      error: () => {
        this.loadingPlayerId = null;
      },
    });
  }

  cerrarModalCuotasAsignadas() {
    this.closeModal('cuotasAsignadas', () => {
      this.listaCuotasAsignadas = [];
      this.historialPagosModal = [];
      this.playerModal = null;
      this.showModalCuotasAsignadas = false;
    });
  }

  /**
   * Recalcula pagadas/totalAPagar/totalPagado/restante/estado a partir de los datos
   * reales actuales (cuotas asignadas + historial de pagos) y actualiza la fila del
   * jugador en todas las listas de la tabla para que la barra y el modal coincidan.
   */
  private sincronizarFilaJugador(playerId: number, cuotaData: any[], historialData: any[]): void {
    const obligatorias = cuotaData.filter((c: any) => c.obligatorio === 1);

    const calcPagadoCuota = (pagoClubId: number): number =>
      historialData
        .filter((h: any) => h.pagoClubId === pagoClubId)
        .reduce((s: number, h: any) => s + (parseFloat(h.importe) || 0), 0);

    // Para columnas de tabla usamos la base sin fees de pasarela (solo base + comisionClub)
    const totalAPagar = obligatorias.reduce(
      (s: number, c: any) => s + this.calcularImporteBaseCuota(c), 0
    );
    let totalPagado = obligatorias.reduce(
      (s: number, c: any) => s + calcPagadoCuota(c.pagoClubId), 0
    );
    const pagadoCuotasEliminadas = historialData
      .filter((h: any) => h.cuotaEliminada === 1)
      .reduce((s: number, h: any) => s + (parseFloat(h.importe) || 0), 0);
    totalPagado += pagadoCuotasEliminadas;
    const restante = Math.max(0, totalAPagar - totalPagado);
    const pagadasCount = obligatorias.filter((c: any) => {
      const imp = this.calcularImporteBaseCuota(c);
      return imp > 0 && calcPagadoCuota(c.pagoClubId) >= imp;
    }).length;
    const pagadasStr = `${pagadasCount}/${obligatorias.length}`;

    // Estado basado en vencimiento: rojo si hay al menos una obligatoria vencida sin pagar
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const tieneObligatoriaVencida = obligatorias.some((c: any) => {
      if (!c.fechaLimite) return false;
      const fechaLimite = new Date(c.fechaLimite);
      fechaLimite.setHours(0, 0, 0, 0);
      const pagado = calcPagadoCuota(c.pagoClubId);
      const importeBase = this.calcularImporteBaseCuota(c);
      return fechaLimite < hoy && pagado < importeBase;
    });
    const estado = tieneObligatoriaVencida ? 0 : 1;

    const patchPlayer = (p: any) => {
      p.pagadas       = pagadasStr;
      p.totalAPagar   = String(totalAPagar);
      p.totalPagado   = String(totalPagado);
      p.restante      = String(restante);
      p.estado        = estado;
    };

    [this.listaPlayers, this.listaPlayersFiltrados, this.listaPlayersFiltradosPorPago]
      .forEach(list => {
        const found = list.find((p: any) => p.playerId === playerId);
        if (found) patchPlayer(found);
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
    this.closeModal('cuotasJugador', () => {
      this.showModalCuotasJugador = false;
      this.playerEdit = null;
    });
  }

  get cuotasPersonalObligatorias(): any[] {
    return this.listCuotasPlayerPersonal.filter((c: any) => +c.obligatorio === 1);
  }

  get cuotasPersonalOpcionales(): any[] {
    return this.listCuotasPlayerPersonal.filter((c: any) => +c.obligatorio !== 1);
  }

  get totalImportePersonal(): number {
    return this.listCuotasPlayerPersonal.reduce(
      (s: number, c: any) => s + this.calcularImporteTotalCuota(c), 0
    );
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
  }
  trackByPlayerId(index: number, player: any) {
    return player.playerId;
  }

  /** Muestra el bloque de comisiones (Pago puntual o Sphaira Pay). */
  mostrarBloqueComisiones(): boolean {
    return this.nuevaCuota?.stripe === 0 || this.nuevaCuota?.stripe === 1;
  }

  seleccionarTipoPago(tipo: number): void {
    if (tipo === 0) {
      this.nuevaCuota.stripe = 0;
      this.nuevaCuota.tipoCobro = 0;
      this.nuevaCuota.tipoPagoStripe = 0;
      this.showStripeConfig = false;
      this.isSubscription = false;
      this.nuevaCuota.fechaInicio = null;
      this.nuevaCuota.fechaFin = null;
      this.aplicarComisionClub = true;
      this.clubComisionPct = this.clubCommissionPercentFromPlan;
      return;
    }

    if (tipo === 2) {
      this.nuevaCuota.stripe = 2;
      this.nuevaCuota.tipoCobro = 0;
      this.nuevaCuota.tipoPagoStripe = 0;
      this.showStripeConfig = false;
      this.isSubscription = false;
      this.nuevaCuota.fechaInicio = null;
      this.nuevaCuota.fechaFin = null;
      this.nuevaCuota.fechaLimite = null;
      return;
    }

    // tipo === 1: Sphaira Pay — verificar cuenta Stripe
    this.clubService
      .getBancoClub(this.clubId, this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          if (response.data !== null) {
            this.infoClub = response.data;
            if (this.infoClub.banco == null && this.infoClub.banco == undefined) {
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
              this.nuevaCuota.stripe = 1;
              this.nuevaCuota.fechaLimite = null;
              this.aplicarComisionClub = true;
              this.clubComisionPct = this.clubCommissionPercentFromPlan;
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
          console.error('Error al verificar cuenta Stripe', error);
        }
      );
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

    if (this.showStripeConfig) {
      // Sphaira Pay = cobro único en fecha con tarjeta guardada
      this.nuevaCuota.tipoCobro = 3;
      this.nuevaCuota.tipoPagoStripe = 0;
      this.isSubscription = false;
    } else {
      // Sin Stripe = pago puntual manual
      this.nuevaCuota.tipoCobro = 0;
      this.nuevaCuota.tipoPagoStripe = 0;
      this.isSubscription = false;
      this.nuevaCuota.fechaInicio = null;
    }
  }

  cerrarDatosStripe() {
    this.showModalStripe = false;
    this.showModalCuota = false;
    this.showModalCuotas = false;
    this.showStripeConfig = false;
    this.isSubscription = false;
    this.nuevaCuota.stripe = 0;
    this.nuevaCuota.tipoCobro = 0;
    this.nuevaCuota.tipoPagoStripe = 0;
    this.nuevaCuota.fechaInicio = null;
    this.nuevaCuota.fechaFin = null;
  }

  // ── Configuración de notificaciones ────────────────────────────────────────

  openModalNotifConfig(): void {
    this.notifConfig.clubId = this.clubId;
    this.clubService.getNotifConfig(this.clubId).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.notifConfig = {
            clubId: res.data.clubId ?? this.clubId,
            diasAntesRecordatorio: res.data.diasAntesRecordatorio ?? 1,
            notifPushActiva: res.data.notifPushActiva ?? true,
            notifEmailActiva: res.data.notifEmailActiva ?? true,
          };
        }
        this.showModalNotifConfig = true;
      },
      error: () => {
        this.notifConfig = { clubId: this.clubId, diasAntesRecordatorio: 1, notifPushActiva: true, notifEmailActiva: true };
        this.showModalNotifConfig = true;
      },
    });
  }

  closeModalNotifConfig(): void {
    this.closeModal('notifConfig', () => { this.showModalNotifConfig = false; });
  }

  increaseDias(): void {
    if (this.notifConfig.diasAntesRecordatorio < 30) {
      this.notifConfig.diasAntesRecordatorio++;
    }
  }

  decreaseDias(): void {
    if (this.notifConfig.diasAntesRecordatorio > 1) {
      this.notifConfig.diasAntesRecordatorio--;
    }
  }

  saveNotifConfig(): void {
    if (this.isSavingNotifConfig) return;
    this.isSavingNotifConfig = true;
    const payload = { ...this.notifConfig, clubId: this.clubId };
    this.clubService.saveNotifConfig(payload).subscribe({
      next: (res: any) => {
        this.isSavingNotifConfig = false;
        if (res?.status === 200) {
          this.toastr.success('Configuración de notificaciones guardada correctamente.');
          this.closeModalNotifConfig();
        } else {
          this.toastr.error('Error al guardar la configuración.');
        }
      },
      error: () => {
        this.isSavingNotifConfig = false;
        this.toastr.error('Error al guardar la configuración.');
      },
    });
  }

  // Cambiar tipo puntual/suscripción (llamado internamente)
  onTipoPagoChange(tipo: 0 | 1) {
    this.nuevaCuota.tipoPagoStripe = tipo;
    this.isSubscription = tipo === 1;

    if (tipo === 0) {
      this.nuevaCuota.tipoCobro = 0;
      this.nuevaCuota.fechaInicio = null;
      this.nuevaCuota.fechaFin = null;
    }
  }

  // Toggle del switch "Cobro recurrente" en el panel Sphaira Pay
  onToggleRecurrente(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.onTipoPagoChange(checked ? 1 : 0);
  }

  validarStripe(): string | null {
    if (this.nuevaCuota.stripe !== 1) return null;
    if (this.nuevaCuota.tipoCobro === 3 && !this.nuevaCuota.fechaInicio) {
      return 'Selecciona una fecha de cobro para Sphaira Pay.';
    }
    return null;
  }
}

