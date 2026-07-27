import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ClubModulesService, ClubModules } from 'src/app/core/services/club/club-modules.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import {
  AccessControlService,
  AccessControlConfig,
  AccessPoint,
  AccessLog,
  AccessLogPage,
  AccessLogFilters,
  AccessQrPayload,
  AccessPaymentRule,
  AccessScanResult,
  AccessSubjectType,
  AccessDeviceKey,
  OfflineBehavior,
} from 'src/app/core/services/access-control/access-control.service';

type Section = 'config' | 'points' | 'logs' | 'preview';

interface PointEditModel {
  pointId: number | null;
  name: string;
  description: string;
  maxCapacity: number | null;
  dailyEntryLimit: number | null;
  active: boolean;
  offlineBehavior: OfflineBehavior | '';
  webhookUrl: string;
}

/**
 * Pantalla principal del módulo Control de accesos por QR (admin).
 * Ruta: /dashboard/access-control
 *
 * Solo se muestra si el club tiene activo el módulo {@code accessControlEnabled}
 * (toggle gobernado desde Permisos del club). Si llega aquí con el módulo OFF
 * mostramos un estado vacío con CTA al toggle.
 */
@Component({
  selector: 'app-access-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-control.component.html',
  styleUrls: ['./access-control.component.scss'],
})
export class AccessControlComponent implements OnInit {
  clubId = 0;
  loading = true;
  saving = false;
  modules: ClubModules | null = null;
  section: Section = 'config';

  config: AccessControlConfig | null = null;

  points: AccessPoint[] = [];
  pointEdit: PointEditModel | null = null;

  logs: AccessLog[] = [];
  logsLoading = false;
  logsFrom: string | null = null;
  logsTo: string | null = null;

  // Filtros + paginación de la tabla de logs (modo búsqueda avanzada).
  // Si el admin no toca nada, se queda con `reloadLogs()` simple (ventana
  // [from,to]) y la paginación se ignora. Cuando aplica algún filtro adicional
  // (sujeto / punto / resultado) o navega a una página >0, usamos searchLogs().
  logFilterSubjectType: AccessSubjectType | '' = '';
  logFilterPointId: number | null = null;
  logFilterResult: AccessScanResult | '' = '';
  logPageIndex = 0;
  logPageSize = 50;
  logTotalElements = 0;
  logTotalPages = 0;

  // Estado del modal de impresión de carnets PDF.
  printDialogOpen = false;
  printSubjectType: AccessSubjectType = 'ABONADO';
  printIds = '';
  printLoading = false;

  previewSubjectType: AccessSubjectType = 'PLAYER';
  previewSubjectId: number | null = null;
  previewQr: AccessQrPayload | null = null;
  previewCountdown = 0;
  private previewTimer: any = null;

  readonly paymentRules: AccessPaymentRule[] = ['BLOCK', 'WARN_GATEKEEPER', 'WARN_MEMBER', 'ALLOW'];
  readonly offlineBehaviors: OfflineBehavior[] = ['FAIL_CLOSED', 'FAIL_OPEN'];
  readonly qrModes: Array<'DYNAMIC' | 'STATIC'> = ['DYNAMIC', 'STATIC'];

  /** Estado del modal de confirmación de rotación de claves estáticas. */
  rotateDialogOpen = false;
  rotateLoading = false;

  // Claves de dispositivo (Fase 2.5)
  deviceKeys: AccessDeviceKey[] = [];
  deviceKeysLoading = false;
  newKeyName = '';
  /** Clave en plano recién creada (mostrar UNA sola vez al admin). */
  freshApiKey: string | null = null;
  freshApiKeyName: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private loginService: LoginService,
    private clubService: ClubService,
    private clubModulesService: ClubModulesService,
    private accessService: AccessControlService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    const paramClubId = +this.route.snapshot.params['clubId'];
    if (paramClubId) {
      this.clubId = paramClubId;
      this.bootstrap();
      return;
    }
    const storedClubId = Number(sessionStorage.getItem('clubId') ?? '0');
    if (storedClubId > 0) {
      this.clubId = storedClubId;
      this.bootstrap();
      return;
    }
    this.loginService.usuarioActual.subscribe((user) => {
      const userId = user?.userId;
      if (!userId) {
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }
      this.clubService.getClubForEntrenador(userId).subscribe({
        next: (resp: any) => {
          this.clubId = resp?.data ?? 0;
          if (this.clubId) {
            sessionStorage.setItem('clubId', String(this.clubId));
            this.bootstrap();
          } else {
            this.loading = false;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
    });
  }

  private bootstrap(): void {
    this.loading = true;
    this.clubModulesService.getModules(this.clubId).subscribe({
      next: (m) => {
        this.modules = m;
        if (!m.accessControlEnabled) {
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.loadAll();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadAll(): void {
    this.accessService.getConfig(this.clubId).subscribe({
      next: (cfg) => {
        this.config = cfg;
        this.cdr.markForCheck();
      },
      error: () => this.notifyErr(),
    });
    this.accessService.listPoints(this.clubId).subscribe({
      next: (list) => {
        this.points = list ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.notifyErr();
        this.cdr.markForCheck();
      },
    });
  }

  setSection(s: Section): void {
    this.section = s;
    if (s === 'logs' && this.logs.length === 0) {
      this.reloadLogs();
    }
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------------

  saveConfig(): void {
    if (!this.config) return;
    this.saving = true;
    this.accessService.saveConfig(this.clubId, this.config).subscribe({
      next: (cfg) => {
        this.config = cfg;
        this.saving = false;
        this.notification.success(this.translate.instant('ACCESS_CONTROL.NOTIF_CFG_OK'), false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.notifyErr();
        this.cdr.markForCheck();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Puntos de acceso
  // ---------------------------------------------------------------------------

  startNewPoint(): void {
    this.pointEdit = {
      pointId: null,
      name: this.translate.instant('ACCESS_CONTROL.POINTS.DEFAULT_NAME'),
      description: '',
      maxCapacity: null,
      dailyEntryLimit: null,
      active: true,
      offlineBehavior: '',
      webhookUrl: '',
    };
    this.deviceKeys = [];
    this.cdr.markForCheck();
  }

  startEditPoint(p: AccessPoint): void {
    this.pointEdit = {
      pointId: p.pointId,
      name: p.name,
      description: p.description ?? '',
      maxCapacity: p.maxCapacity,
      dailyEntryLimit: p.dailyEntryLimit,
      active: p.active,
      offlineBehavior: (p.offlineBehavior ?? '') as OfflineBehavior | '',
      webhookUrl: p.webhookUrl ?? '',
    };
    this.loadDeviceKeys(p.pointId);
    this.cdr.markForCheck();
  }

  cancelEditPoint(): void {
    this.pointEdit = null;
    this.deviceKeys = [];
    this.freshApiKey = null;
    this.freshApiKeyName = null;
    this.newKeyName = '';
    this.cdr.markForCheck();
  }

  savePoint(): void {
    if (!this.pointEdit) return;
    const body: Partial<AccessPoint> = {
      name: this.pointEdit.name?.trim() || 'Acceso principal',
      description: this.pointEdit.description?.trim() || null,
      maxCapacity: this.pointEdit.maxCapacity,
      dailyEntryLimit: this.pointEdit.dailyEntryLimit,
      active: this.pointEdit.active,
      offlineBehavior: this.pointEdit.offlineBehavior
        ? (this.pointEdit.offlineBehavior as OfflineBehavior)
        : null,
      webhookUrl: this.pointEdit.webhookUrl?.trim() || null,
    };
    this.saving = true;
    const obs = this.pointEdit.pointId
      ? this.accessService.updatePoint(this.pointEdit.pointId, body)
      : this.accessService.createPoint(this.clubId, body);
    obs.subscribe({
      next: () => {
        this.saving = false;
        this.pointEdit = null;
        this.notification.success(this.translate.instant('ACCESS_CONTROL.NOTIF_POINT_OK'), false);
        this.accessService.listPoints(this.clubId).subscribe({
          next: (list) => {
            this.points = list ?? [];
            this.cdr.markForCheck();
          },
          error: () => this.cdr.markForCheck(),
        });
      },
      error: () => {
        this.saving = false;
        this.notifyErr();
        this.cdr.markForCheck();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Claves de dispositivo (Fase 2.5)
  // ---------------------------------------------------------------------------

  loadDeviceKeys(pointId: number): void {
    this.deviceKeysLoading = true;
    this.freshApiKey = null;
    this.freshApiKeyName = null;
    this.accessService.listDeviceKeys(this.clubId, pointId).subscribe({
      next: (keys) => {
        this.deviceKeys = keys ?? [];
        this.deviceKeysLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.deviceKeysLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  createDeviceKey(): void {
    if (!this.pointEdit?.pointId) return;
    const name = this.newKeyName?.trim()
      || this.translate.instant('ACCESS_CONTROL.DEVICES.DEFAULT_NAME');
    this.saving = true;
    this.accessService.createDeviceKey(this.clubId, this.pointEdit.pointId, name)
      .subscribe({
        next: (resp) => {
          this.saving = false;
          this.freshApiKey = resp.apiKey;
          this.freshApiKeyName = resp.key.name;
          this.newKeyName = '';
          this.notification.success(
            this.translate.instant('ACCESS_CONTROL.DEVICES.NOTIF_CREATED'), false);
          this.loadDeviceKeys(this.pointEdit!.pointId!);
        },
        error: () => {
          this.saving = false;
          this.notifyErr();
          this.cdr.markForCheck();
        },
      });
  }

  revokeDeviceKey(k: AccessDeviceKey): void {
    if (!this.pointEdit?.pointId) return;
    if (!confirm(this.translate.instant('ACCESS_CONTROL.DEVICES.CONFIRM_REVOKE'))) return;
    this.saving = true;
    this.accessService.revokeDeviceKey(this.clubId, this.pointEdit.pointId, k.deviceKeyId)
      .subscribe({
        next: () => {
          this.saving = false;
          this.notification.success(
            this.translate.instant('ACCESS_CONTROL.DEVICES.NOTIF_REVOKED'), false);
          this.loadDeviceKeys(this.pointEdit!.pointId!);
        },
        error: () => {
          this.saving = false;
          this.notifyErr();
          this.cdr.markForCheck();
        },
      });
  }

  copyApiKey(): void {
    if (!this.freshApiKey) return;
    navigator.clipboard.writeText(this.freshApiKey).then(() => {
      this.notification.success(
        this.translate.instant('ACCESS_CONTROL.DEVICES.COPIED'), false);
    });
  }

  dismissFreshKey(): void {
    this.freshApiKey = null;
    this.freshApiKeyName = null;
    this.cdr.markForCheck();
  }

  deactivatePoint(p: AccessPoint): void {
    if (!confirm(this.translate.instant('ACCESS_CONTROL.POINTS.CONFIRM_DEACTIVATE'))) return;
    this.saving = true;
    this.accessService.deactivatePoint(p.pointId).subscribe({
      next: () => {
        this.saving = false;
        this.notification.success(this.translate.instant('ACCESS_CONTROL.NOTIF_POINT_OFF'), false);
        this.accessService.listPoints(this.clubId).subscribe({
          next: (list) => {
            this.points = list ?? [];
            this.cdr.markForCheck();
          },
          error: () => this.cdr.markForCheck(),
        });
      },
      error: () => {
        this.saving = false;
        this.notifyErr();
        this.cdr.markForCheck();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Logs
  // ---------------------------------------------------------------------------

  reloadLogs(): void {
    this.logPageIndex = 0;
    this.searchLogsPaged();
  }

  /**
   * Busca logs con todos los filtros activos. Si no hay filtros adicionales
   * y la página solicitada es la 0, conserva el mismo comportamiento que el
   * antiguo {@code reloadLogs} (devuelve hasta {@code logPageSize} filas).
   */
  searchLogsPaged(): void {
    this.logsLoading = true;
    const filters: AccessLogFilters = {
      from: this.logsFrom,
      to: this.logsTo,
      subjectType: this.logFilterSubjectType || null,
      pointId: this.logFilterPointId,
      result: this.logFilterResult || null,
      page: this.logPageIndex,
      size: this.logPageSize,
    };
    this.accessService.searchLogs(this.clubId, filters).subscribe({
      next: (page: AccessLogPage) => {
        this.logs = page?.content ?? [];
        this.logTotalElements = page?.totalElements ?? 0;
        this.logTotalPages = page?.totalPages ?? 0;
        this.logPageIndex = page?.page ?? 0;
        this.logsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.logsLoading = false;
        this.notifyErr();
        this.cdr.markForCheck();
      },
    });
  }

  goToLogPage(idx: number): void {
    if (idx < 0 || idx >= this.logTotalPages) return;
    this.logPageIndex = idx;
    this.searchLogsPaged();
  }

  clearLogFilters(): void {
    this.logsFrom = null;
    this.logsTo = null;
    this.logFilterSubjectType = '';
    this.logFilterPointId = null;
    this.logFilterResult = '';
    this.logPageIndex = 0;
    this.searchLogsPaged();
  }

  // ---------------------------------------------------------------------------
  // PDF de carnets imprimibles
  // ---------------------------------------------------------------------------

  openPrintDialog(): void {
    this.printDialogOpen = true;
    this.printSubjectType = 'ABONADO';
    this.printIds = '';
    this.cdr.markForCheck();
  }

  closePrintDialog(): void {
    this.printDialogOpen = false;
    this.printLoading = false;
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------------
  // Rotación de la clave de QRs estáticos
  // -------------------------------------------------------------------------

  openRotateDialog(): void {
    this.rotateDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeRotateDialog(): void {
    if (this.rotateLoading) return;
    this.rotateDialogOpen = false;
    this.cdr.markForCheck();
  }

  /**
   * Confirma la rotación. Llama al backend, refresca la config (con la nueva
   * `staticQrKeyVersion`) y muestra un toast con el resultado. Esta acción
   * invalida todos los QRs estáticos previamente emitidos.
   */
  confirmRotateKeys(): void {
    if (this.rotateLoading) return;
    this.rotateLoading = true;
    this.cdr.markForCheck();
    this.accessService.rotateStaticKeys(this.clubId).subscribe({
      next: (cfg) => {
        this.config = cfg;
        this.rotateLoading = false;
        this.rotateDialogOpen = false;
        this.notification.success('ACCESS_CONTROL.CFG.ROTATE_OK');
        this.cdr.markForCheck();
      },
      error: () => {
        this.rotateLoading = false;
        this.notifyErr();
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Descarga el PDF de carnets para los IDs introducidos. Acepta una lista
   * separada por comas o espacios. Si está vacío, no hace nada.
   */
  downloadCarnets(): void {
    const ids = this.printIds
      .split(/[,\s]+/)
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (!ids.length) {
      this.notification.warning('ACCESS_CONTROL.PRINT.NO_IDS');
      return;
    }
    this.printLoading = true;
    this.accessService.downloadCarnetsPdf(this.clubId, this.printSubjectType, ids).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carnets-club-${this.clubId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.printLoading = false;
        this.printDialogOpen = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.printLoading = false;
        this.notifyErr();
        this.cdr.markForCheck();
      },
    });
  }

  exportLogsCsv(): void {
    if (!this.logs.length) return;
    const header = ['scannedAt', 'subjectType', 'subjectId', 'subjectName', 'pointName', 'direction', 'result', 'reason', 'paymentStatus'];
    const rows = this.logs.map(l => [
      l.scannedAt,
      l.subjectType,
      l.subjectId,
      this.csvEscape(l.subjectName ?? ''),
      this.csvEscape(l.pointName ?? ''),
      l.direction,
      l.result,
      this.csvEscape(l.reason ?? ''),
      l.paymentStatus ?? '',
    ].join(','));
    const csv = [header.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access-logs-club-${this.clubId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private csvEscape(v: string): string {
    if (v == null) return '';
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  }

  // ---------------------------------------------------------------------------
  // Preview QR (utilidad para que el club genere y pruebe un QR de un member)
  // ---------------------------------------------------------------------------

  generatePreview(): void {
    if (!this.previewSubjectId) return;
    this.stopPreviewTimer();
    this.accessService.getQr(this.clubId, this.previewSubjectType, this.previewSubjectId).subscribe({
      next: (q) => {
        this.previewQr = q;
        this.previewCountdown = q.expiresInSeconds;
        this.startPreviewTimer();
        this.cdr.markForCheck();
      },
      error: () => this.notifyErr(),
    });
  }

  private startPreviewTimer(): void {
    this.previewTimer = setInterval(() => {
      this.previewCountdown = Math.max(0, this.previewCountdown - 1);
      if (this.previewCountdown <= 0) {
        this.stopPreviewTimer();
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private stopPreviewTimer(): void {
    if (this.previewTimer) {
      clearInterval(this.previewTimer);
      this.previewTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private notifyErr(): void {
    this.notification.error(this.translate.instant('ACCESS_CONTROL.NOTIF_ERR'), false);
  }

  goBack(): void {
    this.stopPreviewTimer();
    this.location.back();
  }
}
