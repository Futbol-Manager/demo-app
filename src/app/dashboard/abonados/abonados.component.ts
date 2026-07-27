import { ChangeDetectorRef, Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Abonado, AbonadoPagoHistorico, AbonadoTemporada } from 'src/app/core/services/models/club.model';
import * as XLSX from "xlsx";
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';
import { combineLatest, Subject } from 'rxjs';
import { skip, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import { getSelectedSeason } from 'src/app/core/utils/season.utils';
import { SeasonStateService } from 'src/app/core/services/season/season-state.service';

@Component({
  selector: 'app-abonados',
  templateUrl: './abonados.component.html',
  styleUrls: ['./abonados.component.scss']
})
export class AbonadosComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  datosCargados = false;
  usuarioActual!: User | null;
  clubId!: number;  // Ajusta el valor según el clubId del equipo actual
  userId!: number;
  showModalCreateUpdateAbonado = false;
  showModalUpdateAbonado = false;
  abonadoObj: Abonado = new Abonado({});
  abonadoUpdate: AbonadoTemporada = new AbonadoTemporada({});
  cuotaReadOnly = false;
  cuotaAbonado = 0;
  indexAbonado = 0;
  showModalAgregarPago = false;
  textoInfoNameAbonado = '';
  agregarPago: AbonadoPagoHistorico = new AbonadoPagoHistorico({});
  showAlert = false;
  showModalVerHistorialPagos = false;
  historyPagosAbonado: any[] = [];
  abonadoSelected = 0;
  selectedFile!: File;
  showbtnupimg = false;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  showPreview: boolean = false;

  savingAbonado = false;
  savingUpdateAbonado = false;
  savingPago = false;
  savingReembolso = false;
  uploadingFoto = false;

  // ── Toggle "Aplicar pagos vigentes" al alta de abonado ─────────────
  // Por defecto encendido: en la mayoría de clubes, dar de alta a un
  // abonado implica que reciba los conceptos de pago vigentes (cuota
  // mensual, inscripción, etc.) sin tener que asignarlos uno a uno.
  // El club puede desactivarlo en el modal si solo quiere registrar
  // la persona sin cobrarle nada todavía.
  aplicarPagosVigentesAlta = true;
  /** Número de conceptos audiencia=ABONADOS vigentes en el club (para mostrar en el toggle). */
  pendingPagosCount = 0;
  loadingPendingPagosCount = false;

  listAT: any[] = [];
  imageBaseUrl: string = environment.images;
  imageBaseUrlAbonado: string = environment.images + 'abonado/';
  brokenAvatars = new Set<number>();

  onAvatarError(img: HTMLImageElement | EventTarget | null): void {
    if (!img || !(img as HTMLImageElement).dataset) return;
    (img as HTMLImageElement).style.display = 'none';
  }
  /*{
    abonadoId: 1 , nombre: 'Pedro', apellidos: 'Gómez Pérez', email: 'pedro@mail.com', telefono: '654745856', estado: 0, cuota: '50', pagado: '0', restante: '0'
  },{
    abonadoId: 2 , nombre: 'Juan', apellidos: 'Martín Pérez', email: 'juan@mail.com', telefono: '65856985', estado: 1, cuota: '50', pagado: '20', restante: '30'
  },{
    abonadoId: 3 , nombre: 'Raúl', apellidos: 'López Salguero', email: 'raul@mail.com', telefono: '65236547', estado: 2, cuota: '50', pagado: '50', restante: '0'
  }
];*/ //lista historial cuotas de los jugadores

  // Search & filter
  searchTerm = '';
  filteredList: any[] = [];
  /**
   * Filtro por estado del abonado (no de la temporada):
   * - 'all'      → todos
   * - 'pending'  → estado === 2 (auto-registros pendientes de aprobación)
   * - 'active'   → estado === 1
   * - 'inactive' → estado === 0 (baja / rechazado)
   */
  estadoFilter: 'all' | 'pending' | 'active' | 'inactive' = 'all';
  pendingCount = 0;
  approvingId: number | null = null;

  // ── Selección múltiple para acciones bulk (Bloque 5) ──
  /**
   * Ids de abonado seleccionados en la lista para aplicar acciones masivas
   * (aprobar / rechazar / baja / reactivar). Usamos {@link Set} para que
   * `toggleSelect` y `isSelected` sean O(1).
   */
  selectedIds = new Set<number>();
  /** Spinner global mientras corre la acción bulk. */
  bulkProcessing = false;

  // ── Recordatorio semanal de pendientes (Bloque 7) ──
  /** Estado actual del toggle (true=cron envía recordatorios a este club). */
  subsReminderEnabled = true;
  /** Mientras el toggle hace la petición ida/vuelta. */
  subsReminderLoading = false;

  // Sorting
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage = 1;
  pageSize = 50;
  pageSizeOptions = [25, 50, 100, 200];

  // ── QR de auto-registro (siempre la misma URL por club, imprimible) ──
  showInviteModal = false;
  inviteLinkCopied = false;
  qrReady = false;
  showWaConfirm = false;
  waConfirmImageCopied = false;
  private _waUrl = '';
  private _inviteCopyTimer: any;

  /** URL fija que se codifica en el QR: pre-rellena el clubId en el registro público. */
  get inviteLink(): string {
    // En desarrollo apuntamos al mismo origen del frontend (Angular dev server)
    // para poder probar el flujo end-to-end. En producción el frontend ya está
    // en appsphairatech.com, donde vive /registro-abonado.
    const base = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? window.location.origin
      : 'https://appsphairatech.com';
    return `${base}/registro-abonado?clubId=${this.clubId}`;
  }

  /**
   * URL de imagen del QR. En modo demo generamos el QR con un servicio
   * externo (api.qrserver.com) para no depender del componente
   * `angularx-qrcode`, que requeriría importar su módulo en
   * `dashboard.module.ts` (fuera del alcance del modo demo).
   */
  get inviteQrUrl(): string {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8'
      + '&color=002c40&bgcolor=ffffff&data=' + encodeURIComponent(this.inviteLink);
  }

  get canShareNative(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share;
  }

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private location: Location,
    private translate: TranslateService,
    private notification: NotificationService,
    private confirmationService: ConfirmationService,
    private seasonState: SeasonStateService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    // Combinamos `usuarioActual` (BehaviorSubject de larga vida) con
    // `route.params` para evitar subscripciones anidadas que escapan al
    // ciclo de vida del componente. `takeUntil(destroy$)` garantiza
    // limpieza cuando el componente se destruye.
    combineLatest([
      this.loginService.usuarioActual.pipe(filter(u => !!u)),
      this.route.params,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([user, params]) => {
        this.usuarioActual = user;
        this.userId = user!.userId;
        this.clubId = +params['clubId'];
        // setTimeout(0) difiere las mutaciones de `datosCargados` fuera del
        // ciclo de change detection actual. Sin esto, cuando login/route
        // (BehaviorSubject/snapshot) emiten síncrono al subscribe, el flag
        // muta durante el primer CD cycle y Angular lanza NG0100 contra
        // el `*ngIf="!datosCargados"` del template.
        setTimeout(() => {
          this.loadAbonados();
          this.loadSubsReminderFlag();
        }, 0);
      });

    // Recargar la lista al cambiar la temporada global. Antes el backend
    // tenía la temporada "2025" hardcodeada, así que ahora se envía
    // explícitamente la del selector del header.
    this.seasonState.season$.pipe(
      skip(1),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadAbonados());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Recordatorio semanal de pendientes (Bloque 7) ──

  /** Carga el flag actual del recordatorio para pintar el toggle correctamente. */
  private loadSubsReminderFlag(): void {
    if (!this.clubId) return;
    this.clubService.getSubsReminderEnabled(this.clubId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp: Response) => {
        const v = (resp?.data as any)?.subsReminderEnabled;
        // Por defecto asumimos activado si la BD no tiene fila o no responde.
        this.subsReminderEnabled = v === undefined || v === null ? true : v === 1 || v === true;
      },
      error: () => {
        // Si falla la lectura mantenemos el default optimista (activado).
        this.subsReminderEnabled = true;
      },
    });
  }

  /**
   * Invierte el toggle de recordatorio para este club. UX optimista:
   * cambiamos el flag local al instante; si la llamada falla, lo
   * revertimos y avisamos.
   */
  toggleSubsReminder(): void {
    if (this.subsReminderLoading || !this.clubId) return;
    const next = !this.subsReminderEnabled;
    this.subsReminderEnabled = next;
    this.subsReminderLoading = true;
    this.clubService.setSubsReminderEnabled(this.clubId, next).pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp: Response) => {
        this.subsReminderLoading = false;
        if (resp?.status !== 200) {
          this.subsReminderEnabled = !next;
          this.notification.error('SUBS.REMINDER.UPDATE_ERROR');
          return;
        }
        this.notification.success(next ? 'SUBS.REMINDER.ENABLED_OK' : 'SUBS.REMINDER.DISABLED_OK');
      },
      error: () => {
        this.subsReminderLoading = false;
        this.subsReminderEnabled = !next;
        this.notification.error('SUBS.REMINDER.UPDATE_ERROR');
      },
    });
  }

  /** Carga la lista de abonados de la temporada actualmente seleccionada. */
  private loadAbonados(): void {
    if (!this.clubId) return;
    this.datosCargados = false;
    this.clubService.getListAbonadosTemporadaByClub(this.clubId, getSelectedSeason())
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (response: Response) => {
          if (response.data !== null) {
            this.listAT = response.data;
            this.recomputeBuckets();
            this.applyFilter();
            this.datosCargados = true;
          }
        },
        () => {
          this.datosCargados = true;
        }
      );
  }

  /**
   * Recalcula contadores agregados (p.ej. cuántos abonados están
   * pendientes de aprobación). Se llama tras cargar la lista y tras
   * cualquier acción (aprobar / rechazar) para mantener el badge del tab
   * "Pendientes" sincronizado.
   */
  private recomputeBuckets(): void {
    this.pendingCount = this.listAT.filter(at => at?.abonado?.estado === 2).length;
  }

  /** Cambia el tab de estado y recalcula la lista filtrada. */
  setEstadoFilter(filter: 'all' | 'pending' | 'active' | 'inactive'): void {
    this.estadoFilter = filter;
    // Al cambiar de tab la selección anterior pierde sentido (las filas
    // que el usuario marcó pueden estar ahora ocultas). Limpiamos para
    // evitar acciones bulk "fantasma" sobre filas no visibles.
    this.clearSelection();
    this.applyFilter();
  }

  // ════════════════════════════════════════════════════════════════════
  // Selección múltiple y acciones bulk (Bloque 5)
  // ════════════════════════════════════════════════════════════════════

  /** {@code true} si el abonado está seleccionado. */
  isSelected(at: any): boolean {
    return !!at?.abonado?.abonadoId && this.selectedIds.has(at.abonado.abonadoId);
  }

  /** Marca o desmarca un abonado individual. */
  toggleSelect(at: any, ev?: Event): void {
    if (ev) ev.stopPropagation();
    const id = at?.abonado?.abonadoId;
    if (!id) return;
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  /**
   * {@code true} si TODAS las filas de la página actual están
   * seleccionadas. El checkbox del header solo refleja la página
   * visible para no confundir al usuario (no se selecciona en bloque
   * sobre páginas no visibles).
   */
  isAllVisibleSelected(): boolean {
    const rows = this.paginatedList;
    if (rows.length === 0) return false;
    return rows.every(r => r.abonado?.abonadoId && this.selectedIds.has(r.abonado.abonadoId));
  }

  /** {@code true} si hay al menos uno pero no todos seleccionados. Para mostrar el estado indeterminate. */
  isSomeVisibleSelected(): boolean {
    const rows = this.paginatedList;
    if (rows.length === 0) return false;
    let count = 0;
    for (const r of rows) {
      if (r.abonado?.abonadoId && this.selectedIds.has(r.abonado.abonadoId)) count++;
    }
    return count > 0 && count < rows.length;
  }

  /** Marca o desmarca todas las filas visibles. */
  toggleSelectAllVisible(): void {
    const rows = this.paginatedList;
    if (this.isAllVisibleSelected()) {
      for (const r of rows) {
        if (r.abonado?.abonadoId) this.selectedIds.delete(r.abonado.abonadoId);
      }
    } else {
      for (const r of rows) {
        if (r.abonado?.abonadoId) this.selectedIds.add(r.abonado.abonadoId);
      }
    }
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  /**
   * Acciones disponibles para la selección actual. Se calculan a partir
   * del estado de cada uno de los abonados seleccionados:
   * - approve   → si hay alguno en estado 2 (pendiente)
   * - reject    → si hay alguno en estado 2 (pendiente)
   * - deactivate→ si hay alguno en estado 1 (activo)
   * - reactivate→ si hay alguno en estado 0 (inactivo)
   *
   * La barra muestra solo los botones aplicables. Si el usuario tiene
   * mezclados (p. ej. 1 pendiente + 1 activo), verá approve/reject/deactivate
   * y al pulsar uno solo se aplicará a los que correspondan, los demás
   * se omitirán en el backend con la razón {@code invalid_transition}.
   */
  bulkAvailable(): { approve: boolean; reject: boolean; deactivate: boolean; reactivate: boolean } {
    const out = { approve: false, reject: false, deactivate: false, reactivate: false };
    if (this.selectedIds.size === 0) return out;
    for (const at of this.listAT) {
      const id = at?.abonado?.abonadoId;
      if (!id || !this.selectedIds.has(id)) continue;
      const e = at.abonado.estado;
      if (e === 2) { out.approve = true; out.reject = true; }
      if (e === 1) { out.deactivate = true; }
      if (e === 0) { out.reactivate = true; }
      if (out.approve && out.reject && out.deactivate && out.reactivate) break;
    }
    return out;
  }

  /**
   * Ejecuta una acción bulk. Pide confirmación, llama al endpoint y
   * actualiza el estado local en función del resultado. Cuando el backend
   * reporta fallos parciales se muestra un toast warning con el resumen.
   */
  applyBulkAction(action: 'approve' | 'reject' | 'deactivate' | 'reactivate'): void {
    if (this.selectedIds.size === 0 || this.bulkProcessing) return;

    const estadoNuevo =
      action === 'approve' || action === 'reactivate' ? 1
      : action === 'deactivate' || action === 'reject' ? 0
      : 2;

    const ids = Array.from(this.selectedIds);
    const confirmKey =
      action === 'approve'    ? 'SUBS.ALERTS.BULK_CONFIRM_APPROVE'
      : action === 'reject'   ? 'SUBS.ALERTS.BULK_CONFIRM_REJECT'
      : action === 'deactivate' ? 'SUBS.ALERTS.BULK_CONFIRM_DEACTIVATE'
      :                         'SUBS.ALERTS.BULK_CONFIRM_REACTIVATE';

    // ConfirmationDialogData solo entiende `message` o `messageKey`. Para
    // interpolar el {{count}} traducimos primero a mano y pasamos el texto
    // ya resuelto vía `message` para evitar tocar la interfaz compartida.
    this.confirmationService.confirm({
      message: this.translate.instant(confirmKey, { count: ids.length }),
      confirmStyle: (action === 'reject' || action === 'deactivate') ? 'warn' : 'primary',
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.bulkProcessing = true;
      this.clubService.bulkUpdateAbonadosEstado(this.clubId, ids, estadoNuevo)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (resp: Response) => {
          this.bulkProcessing = false;
          const data = resp?.data || {};
          const updated = Number(data.updated ?? 0);
          const failed = Array.isArray(data.failedIds) ? data.failedIds.length : 0;

          // Aplicar en local SOLO a los ids que NO han fallado, leyendo
          // el set de fallidos para no inventarnos transiciones que el
          // backend rechazó.
          const failedSet = new Set<number>(Array.isArray(data.failedIds) ? data.failedIds : []);
          for (const at of this.listAT) {
            const id = at?.abonado?.abonadoId;
            if (!id || !this.selectedIds.has(id) || failedSet.has(id)) continue;
            at.abonado.estado = estadoNuevo;
          }

          this.recomputeBuckets();
          this.applyFilter();
          this.clearSelection();

          if (updated > 0 && failed === 0) {
            this.notification.success(this.bulkSuccessKey(action));
          } else if (updated > 0 && failed > 0) {
            this.notification.warning(
              this.translate.instant('SUBS.MESSAGES.BULK_PARTIAL', { updated, failed }),
              false,
            );
          } else {
            this.notification.error('SUBS.MESSAGES.BULK_NONE');
          }
        },
        error: () => {
          this.bulkProcessing = false;
          this.notification.error('SUBS.MESSAGES.SAVE_ERROR');
        }
      });
    });
  }

  private bulkSuccessKey(action: 'approve' | 'reject' | 'deactivate' | 'reactivate'): string {
    switch (action) {
      case 'approve':    return 'SUBS.MESSAGES.BULK_APPROVED';
      case 'reject':     return 'SUBS.MESSAGES.BULK_REJECTED';
      case 'deactivate': return 'SUBS.MESSAGES.BULK_DEACTIVATED';
      case 'reactivate': return 'SUBS.MESSAGES.BULK_REACTIVATED';
    }
  }

  /**
   * Vuelve al inicio del dashboard. Antes usaba `location.back()` que
   * navega al historial del navegador (puede llevarte a cualquier
   * pantalla previa, no siempre al padre logico). El usuario espera
   * comportamiento JERARQUICO: desde esta pantalla top-level se sube
   * a `/dashboard/inicio`, que es la raiz del panel del club.
   */
  goBack(): void {
    this.router.navigate(['/dashboard/inicio']);
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/inicio']);
        break;
      case 2:
        this.router.navigate(['/dashboard/contabilidad', this.clubId]);
        break;
    }
  }

  // Search & filter methods
  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredList = this.listAT.filter(at => {
      const matchesEstado =
        this.estadoFilter === 'all' ||
        (this.estadoFilter === 'pending'  && at.abonado?.estado === 2) ||
        (this.estadoFilter === 'active'   && at.abonado?.estado === 1) ||
        (this.estadoFilter === 'inactive' && at.abonado?.estado === 0);
      if (!matchesEstado) return false;
      if (!term) return true;
      return (at.abonado?.nombre?.toLowerCase().includes(term)) ||
             (at.abonado?.apellidos?.toLowerCase().includes(term)) ||
             (at.abonado?.mail?.toLowerCase().includes(term)) ||
             (at.abonado?.telefono?.includes(term));
    });
    this.sortData();
    this.currentPage = 1;
  }

  // ── Modal de cambio de estado con motivo opcional (Bloque 6) ──
  /** Abonado-temporada sobre el que está abierto el modal. */
  estadoModalAt: any | null = null;
  /** Acción que va a confirmar el modal. */
  estadoModalAction: 'approve' | 'reject' | 'deactivate' | 'reactivate' = 'approve';
  /** Spinner local del modal mientras se llama al backend. */
  estadoModalSaving = false;
  /** Motivo opcional escrito en el modal (inline, sin componente hijo). */
  estadoMotivo = '';

  /**
   * Abre el modal con motivo opcional para una acción individual.
   * Antes era un `confirm()` directo (Bloque 3); ahora pasa siempre
   * por el modal para que el admin pueda dejar trazabilidad sobre
   * por qué rechazó o dio de baja a un socio.
   */
  changeAbonadoEstado(at: any, nuevoEstado: number): void {
    if (!at?.abonado?.abonadoId) return;
    const actual = at.abonado.estado;
    let action: 'approve' | 'reject' | 'deactivate' | 'reactivate';
    if (nuevoEstado === 1) {
      action = actual === 2 ? 'approve' : 'reactivate';
    } else if (nuevoEstado === 0) {
      action = actual === 2 ? 'reject' : 'deactivate';
    } else {
      return;
    }
    this.estadoModalAt = at;
    this.estadoModalAction = action;
    this.estadoModalSaving = false;
    this.estadoMotivo = '';
  }

  /** Cierre del modal sin guardar. */
  closeEstadoModal(): void {
    if (this.estadoModalSaving) return;
    this.estadoModalAt = null;
    this.estadoMotivo = '';
  }

  /** Cierra el modal al hacer click fuera del contenido. */
  onEstadoBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.closeEstadoModal();
  }

  /** Resuelve el nombre completo del abonado del modal para el copy. */
  get estadoModalAbonadoName(): string {
    const a = this.estadoModalAt?.abonado;
    if (!a) return '';
    return `${a.nombre ?? ''} ${a.apellidos ?? ''}`.trim();
  }

  /** El botón de confirmar usa color de advertencia para reject/deactivate. */
  get estadoModalIsWarn(): boolean {
    return this.estadoModalAction === 'reject' || this.estadoModalAction === 'deactivate';
  }

  /** Icono Bootstrap del header según la acción. */
  get estadoModalHeaderIcon(): string {
    switch (this.estadoModalAction) {
      case 'approve':    return 'bi-check-circle-fill';
      case 'reject':     return 'bi-x-circle-fill';
      case 'deactivate': return 'bi-pause-circle-fill';
      default:           return 'bi-arrow-counterclockwise';
    }
  }

  /** Clave i18n del título del modal según la acción. */
  get estadoModalTitleKey(): string {
    switch (this.estadoModalAction) {
      case 'approve':    return 'SUBS.REASON.TITLE_APPROVE';
      case 'reject':     return 'SUBS.REASON.TITLE_REJECT';
      case 'deactivate': return 'SUBS.REASON.TITLE_DEACTIVATE';
      default:           return 'SUBS.REASON.TITLE_REACTIVATE';
    }
  }

  /** Clave i18n del subtítulo del modal según la acción. */
  get estadoModalSubtitleKey(): string {
    switch (this.estadoModalAction) {
      case 'approve':    return 'SUBS.REASON.SUB_APPROVE';
      case 'reject':     return 'SUBS.REASON.SUB_REJECT';
      case 'deactivate': return 'SUBS.REASON.SUB_DEACTIVATE';
      default:           return 'SUBS.REASON.SUB_REACTIVATE';
    }
  }

  /** Clave i18n del CTA de confirmación según la acción. */
  get estadoModalConfirmKey(): string {
    switch (this.estadoModalAction) {
      case 'approve':    return 'SUBS.REASON.CTA_APPROVE';
      case 'reject':     return 'SUBS.REASON.CTA_REJECT';
      case 'deactivate': return 'SUBS.REASON.CTA_DEACTIVATE';
      default:           return 'SUBS.REASON.CTA_REACTIVATE';
    }
  }

  /** Confirma el cambio de estado con el motivo (puede ser vacío). */
  confirmEstadoChange(motivo: string): void {
    const at = this.estadoModalAt;
    if (!at?.abonado?.abonadoId) return;
    const nuevoEstado: number =
      this.estadoModalAction === 'approve' || this.estadoModalAction === 'reactivate' ? 1 : 0;
    this.estadoModalSaving = true;
    this.approvingId = at.abonado.abonadoId;
    this.clubService.updateAbonadoEstado(at.abonado.abonadoId, nuevoEstado, this.clubId, motivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response: Response) => {
        this.estadoModalSaving = false;
        this.approvingId = null;
        if (response?.data) {
          at.abonado.estado = response.data.estado ?? nuevoEstado;
        } else {
          at.abonado.estado = nuevoEstado;
        }
        this.recomputeBuckets();
        this.applyFilter();
        const okKey =
          this.estadoModalAction === 'approve'    ? 'SUBS.MESSAGES.APPROVED_SUCCESS'
          : this.estadoModalAction === 'reject'   ? 'SUBS.MESSAGES.REJECTED_SUCCESS'
          : this.estadoModalAction === 'deactivate' ? 'SUBS.MESSAGES.DEACTIVATED_SUCCESS'
          :                                         'SUBS.MESSAGES.REOPENED_SUCCESS';
        this.notification.success(okKey);
        this.estadoModalAt = null;
      },
      error: () => {
        this.estadoModalSaving = false;
        this.approvingId = null;
        this.notification.error('SUBS.MESSAGES.SAVE_ERROR');
      },
    });
  }

  /**
   * Devuelve la edad (años cumplidos) a partir de una fecha de
   * nacimiento en formato ISO (`YYYY-MM-DD`). Si la fecha es inválida,
   * vacía o futura devuelve `null` para que la celda muestre un guion.
   *
   * No se hace `new Date(string).getFullYear()` directo porque los
   * cumpleaños del año en curso aún no celebrados deben restar 1: se
   * compara mes y día del aniversario respecto a hoy.
   */
  getEdad(fechaNacimiento: string | null | undefined): number | null {
    if (!fechaNacimiento) return null;
    const fn = new Date(fechaNacimiento);
    if (Number.isNaN(fn.getTime())) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - fn.getFullYear();
    const m = hoy.getMonth() - fn.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) {
      edad--;
    }
    if (edad < 0 || edad > 130) return null;
    return edad;
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
    const col = this.sortColumn;
    this.filteredList.sort((a, b) => {
      let valA = col.startsWith('abonado.') ? a.abonado?.[col.split('.')[1]] : a[col];
      let valB = col.startsWith('abonado.') ? b.abonado?.[col.split('.')[1]] : b[col];
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
    const p: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) p.push(i);
    return p;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  openModalCreateUpdateAbonado() {
    this.abonadoObj = new Abonado({});
    // Estado=1 (Activo) por defecto: el admin del club está creando manualmente
    // a un abonado, así que entra activo y puede pagar cuotas. Los abonados que
    // se auto-registran por la app entran con estado=2 (Pendiente) directamente
    // desde el backend, y los de baja (estado=0) son rechazos o bajas manuales.
    this.abonadoObj.estado = 1;
    this.cuotaAbonado = 0;
    this.aplicarPagosVigentesAlta = true;
    this.showModalCreateUpdateAbonado = true;
    // Cargamos el N de conceptos vigentes para mostrarlo en el toggle.
    if (this.clubId) {
      this.loadingPendingPagosCount = true;
      this.clubService.countPendingPagosAbonados(this.clubId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (resp: any) => {
            this.loadingPendingPagosCount = false;
            this.pendingPagosCount = Number(resp?.data?.count ?? 0);
          },
          error: () => {
            this.loadingPendingPagosCount = false;
            this.pendingPagosCount = 0;
          },
        });
    }
  }

  cerrarModalCreateUpdateAbonado() {
    this.showModalCreateUpdateAbonado = false;
  }

  createUpdateAbonado() {
    this.savingAbonado = true;
    this.clubService.createUpdateAbonado(this.abonadoObj, this.clubId, this.cuotaAbonado, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response: Response) => {
        this.savingAbonado = false;
        if (response.data !== null) {
          this.listAT.push(response.data);
          this.filteredList = [...this.listAT];

          // Aplicar pagos vigentes si el club lo ha pedido y hay conceptos
          // vigentes con audiencia=1. Se hace en background para no bloquear
          // la UX (el toast de éxito se muestra inmediatamente).
          const newAbonadoTemporadaId = response.data?.abonadosTemporadaId;
          if (this.aplicarPagosVigentesAlta && this.pendingPagosCount > 0 && newAbonadoTemporadaId) {
            this.clubService.applyPendingPagosToAbonado(newAbonadoTemporadaId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {/* silencioso: ya hay toast de éxito del alta */},
                error: () => {
                  this.notification.warning('SUBS.MESSAGES.APPLY_PENDING_WARN');
                },
              });
          }
        }
        this.notification.success('SUBS.MESSAGES.CREATED_SUCCESS');
        this.cerrarModalCreateUpdateAbonado();
      },
      error: () => {
        this.savingAbonado = false;
        this.notification.error('SUBS.MESSAGES.SAVE_ERROR');
      }
    });
  }

  openModalUpdateAbonado(index: number) {
    this.indexAbonado = index;
    this.abonadoUpdate = this.listAT[index];
    if (this.abonadoUpdate.cuota.toString() != this.abonadoUpdate.restante) {
      this.cuotaReadOnly = true;
    } else {
      this.cuotaReadOnly = false;
    }

    this.showModalUpdateAbonado = true;
  }

  /**
   * Navega a la pantalla de detalle del abonado (ficha completa con
   * tabs: Datos personales, Pagos, etc.). Sustituye al modal de
   * edición clásico para todo lo que no sea cambiar el estado.
   */
  goToDetail(abonadoTemp: any): void {
    const abonadoId = abonadoTemp?.abonado?.abonadoId;
    if (!abonadoId || !this.clubId) return;
    this.router.navigate(['/dashboard/abonados', this.clubId, 'detail', abonadoId]);
  }

  cerrarModalUpdateAbonado() {
    this.showModalUpdateAbonado = false;
  }

  updateAbonado() {
    if (this.listAT[this.indexAbonado].restante === '0') {
      this.listAT[this.indexAbonado].restante = this.abonadoUpdate.cuota;
    }
    this.savingUpdateAbonado = true;
    this.clubService.createUpdateAbonado(this.abonadoUpdate.abonado, this.clubId, this.abonadoUpdate.cuota, this.abonadoUpdate.abonadosTemporadaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: () => {
        this.savingUpdateAbonado = false;
        this.showModalUpdateAbonado = false;
        this.notification.success('SUBS.MESSAGES.UPDATED_SUCCESS');
      },
      error: () => {
        this.savingUpdateAbonado = false;
        this.notification.error('SUBS.MESSAGES.SAVE_ERROR');
      },
    });
  }

  cerrarModalAgregarPago() {
    this.showModalAgregarPago = false;
  }

  openModalPagoAbonado(index: number) {
    this.indexAbonado = index;
    this.agregarPago.abonadosTemporadaId = this.listAT[this.indexAbonado].abonadosTemporadaId;
    this.textoInfoNameAbonado = this.listAT[index].abonado.nombre + ' ' + this.listAT[index].abonado.apellidos;
    this.showModalAgregarPago = true;
  }

  createPagoAbonado() {
    this.savingPago = true;
    const pagado = Number(this.listAT[this.indexAbonado].pagado) + Number(this.agregarPago.cantidad);
    this.listAT[this.indexAbonado].pagado = pagado;
    const restante = Number(this.listAT[this.indexAbonado].cuota) - pagado;
    this.clubService.createPagoAbonado(this.agregarPago, this.listAT[this.indexAbonado].cuota, pagado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response: Response) => {
        this.savingPago = false;
        this.listAT[this.indexAbonado].restante = restante;
        this.showAlert = true;
        this.agregarPago = new AbonadoPagoHistorico({});
        this.notification.success('SUBS.MESSAGES.PAYMENT_SUCCESS');
        this.cerrarModalAgregarPago();
      },
      error: () => {
        this.savingPago = false;
        this.notification.error('SUBS.MESSAGES.PAYMENT_ERROR');
      }
    });
  }

  openModalHistorialPagos(index: number) {
    this.abonadoSelected = index;
    this.clubService.getListPagosAbonadoHistorico(this.listAT[index].abonadosTemporadaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (response: Response) => {
          if (response.data !== null) {
            this.historyPagosAbonado = response.data;
          }
          this.showModalVerHistorialPagos = true;
        },
        () => {
          // Silencioso: si falla mantenemos el modal cerrado.
        }
      );
  }

  cerrarModalHistorialPagos() {
    this.showModalVerHistorialPagos = false;
  }

  confirmReturnPay(pago: any) {
    this.confirmationService.confirm({
      messageKey: 'SUBS.ALERTS.CONFIRM_REFUND',
      confirmStyle: 'warn',
    }).subscribe(confirmed => {
      if (confirmed) this.returnPay(pago);
    });
  }

  returnPay(pago: any) {
    this.savingReembolso = true;
    this.clubService.insertReembolsoAbonadoPagoHistorico(pago)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response: Response) => {
        this.savingReembolso = false;
        if (response.data !== null) {
          this.listAT[this.abonadoSelected].pagado = response.data.pagado;
          this.listAT[this.abonadoSelected].restante = response.data.restante;
          // `cuota` viaja como string desde el backend y `pagado` se
          // sobreescribe a `number` en `createPagoAbonado`. Usamos
          // Number() para evitar que la igualdad estricta string/number
          // sea siempre false y el estado no se marque como pagado-total.
          if (Number(this.listAT[this.abonadoSelected].cuota) === Number(this.listAT[this.abonadoSelected].pagado)) {
            this.listAT[this.abonadoSelected].estado = 2;
          }
        }
        this.notification.success('SUBS.MESSAGES.REFUND_SUCCESS');
        this.cerrarModalHistorialPagos();
      },
      error: () => {
        this.savingReembolso = false;
        this.notification.error('SUBS.MESSAGES.REFUND_ERROR');
      }
    });
  }

  onFileSelected(event: any) {
    if (event.target.files[0].type === 'image/png' || event.target.files[0].type === 'image/jpeg') {
      this.selectedFile = event.target.files[0];
      this.showbtnupimg = true;
      if (this.selectedFile) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrl = e.target.result;
          this.showPreview = true; // Mostrar vista previa
        };
        reader.readAsDataURL(this.selectedFile);
      }
    } else {
      this.showbtnupimg = false;
    }
  }

  onSubmit(playerId: number) {
    if (!this.selectedFile) return;
    this.uploadingFoto = true;
    this.clubService.subirImgAbonado(playerId.toString(), this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: () => {
        this.uploadingFoto = false;
        this.notification.success('SUBS.MESSAGES.PHOTO_SUCCESS');
        this.cerrarModalUpdateAbonado();
      },
      error: () => {
        this.uploadingFoto = false;
        this.notification.error('SUBS.MESSAGES.PHOTO_ERROR');
      }
    });
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
      this.notification.success('SUBS.MESSAGES.EXPORT_SUCCESS');
    } else {
      this.notification.error('SUBS.MESSAGES.EXPORT_ERROR');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // QR de auto-registro de abonados (idéntico patrón al de
  // EquiposComponent → invitación de padres). El QR codifica
  // una URL fija por club, lo que permite imprimirlo y pegarlo
  // físicamente en la sede.
  // ═══════════════════════════════════════════════════════════

  openInviteModal(): void {
    this.showInviteModal = true;
    this.inviteLinkCopied = false;
    this.qrReady = false;
  }

  /**
   * Navega al builder del formulario dinámico de abonados del club.
   * Lo abre en la misma pestaña (no en otra) para mantener el flujo
   * habitual del dashboard.
   */
  openFormBuilder(): void {
    if (!this.clubId) return;
    this.router.navigate(['/dashboard/club-abonado-form-builder', this.clubId]);
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
  }

  onQrCodeGenerated(): void {
    this.qrReady = true;
  }

  copyInviteLink(): void {
    navigator.clipboard
      .writeText(this.inviteLink)
      .then(() => {
        this.inviteLinkCopied = true;
        clearTimeout(this._inviteCopyTimer);
        this._inviteCopyTimer = setTimeout(() => {
          this.inviteLinkCopied = false;
          this.cdr.markForCheck();
        }, 2500);
      });
  }

  /**
   * Genera un canvas con el QR + el logo Sphaira superpuesto en el centro,
   * mismo que se ve en el modal. Usado para descargar y para share.
   */
  private async buildQrCanvas(): Promise<HTMLCanvasElement | null> {
    const qrImg = document.querySelector(
      '.invite-modal__qr-frame .invite-modal__qr-img'
    ) as HTMLImageElement | null;
    if (!qrImg?.src) return null;

    const qrSize = qrImg.naturalWidth || 240;
    const pad = 20;
    const total = qrSize + pad * 2;

    const canvas = document.createElement('canvas');
    canvas.width = total;
    canvas.height = total;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, total, total);

    ctx.drawImage(qrImg, pad, pad, qrSize, qrSize);

    const logoSz = Math.round(qrSize * 0.185);
    const lx = pad + (qrSize - logoSz) / 2;
    const ly = pad + (qrSize - logoSz) / 2;
    const ring = 5;
    const r = Math.round(logoSz * 0.23);

    ctx.fillStyle = '#ffffff';
    this._roundRect(ctx, lx - ring, ly - ring, logoSz + ring * 2, logoSz + ring * 2, r + 2);
    ctx.fill();

    try {
      const logo = await this._loadImg('assets/images/iconoSphaira.svg');
      ctx.save();
      this._roundRect(ctx, lx, ly, logoSz, logoSz, r);
      ctx.clip();
      ctx.drawImage(logo, lx, ly, logoSz, logoSz);
      ctx.restore();
    } catch { /* si falla el logo se descarga solo el QR */ }

    return canvas;
  }

  private _loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  }

  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  async downloadQr(): Promise<void> {
    const canvas = await this.buildQrCanvas();
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `abonados-club-${this.clubId}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  /**
   * Comparte por WhatsApp: copia el QR al portapapeles y muestra un
   * mini-modal con instrucciones, luego abre wa.me con texto prellenado.
   */
  async shareWhatsApp(): Promise<void> {
    if (!this.qrReady) return;

    const shareText = this.translate.instant('ABONADOS.INVITE_MODAL.WA_TEXT') + this.inviteLink;
    this._waUrl = 'https://wa.me/?text=' + encodeURIComponent(shareText);

    let imageCopied = false;
    try {
      const canvas = await this.buildQrCanvas();
      if (canvas) {
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
        if (blob && 'ClipboardItem' in window && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          imageCopied = true;
        }
      }
    } catch { /* portapapeles no disponible */ }

    this.waConfirmImageCopied = imageCopied;
    this.showWaConfirm = true;
    this.cdr.markForCheck();
  }

  goToWhatsApp(): void {
    window.open(this._waUrl, '_blank', 'noopener,noreferrer');
    this.showWaConfirm = false;
    this.cdr.markForCheck();
  }

  cancelWaConfirm(): void {
    this.showWaConfirm = false;
    this.cdr.markForCheck();
  }

  async shareNative(): Promise<void> {
    const shareData: ShareData = {
      title: this.translate.instant('ABONADOS.INVITE_MODAL.TITLE'),
      text: this.translate.instant('ABONADOS.INVITE_MODAL.WA_TEXT') + this.inviteLink,
      url: this.inviteLink,
    };

    if (navigator.canShare) {
      try {
        const canvas = await this.buildQrCanvas();
        if (canvas) {
          const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
          if (blob) {
            const file = new File([blob], `abonados-club-${this.clubId}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ ...shareData, files: [file] });
              return;
            }
          }
        }
      } catch { /* fallback a solo URL */ }
    }

    try { await navigator.share(shareData); } catch { /* cancelado */ }
  }

}
