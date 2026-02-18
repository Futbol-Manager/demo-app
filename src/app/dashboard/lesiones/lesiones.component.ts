import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoginService } from 'src/app/core/services/login/login.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { User } from 'src/app/core/models/users/user.model';
import {
  BodyZone, Injury, InjuryDocument, TimelineEntry,
  ZoneStat, TypeStat, SeverityStat, MonthTrend,
  RTP_PHASES, INJURY_TYPES_BASE, INJURY_TYPES_PRO,
  BODY_ZONES_BASE, BODY_ZONES_PRO_EXTRA,
  InjuryNotificationConfig
} from 'src/app/core/services/injury/injury.model';

// Re-export interfaces so existing imports from other components still work
export {
  BodyZone, Injury, InjuryDocument, TimelineEntry,
  ZoneStat, TypeStat, SeverityStat, MonthTrend
} from 'src/app/core/services/injury/injury.model';

@Component({
  selector: 'app-lesiones',
  templateUrl: './lesiones.component.html',
  styleUrls: ['./lesiones.component.scss']
})
export class LesionesComponent implements OnInit, OnChanges, OnDestroy {

  // ─── Inputs ──────────────────────────────────────────────────────
  @Input() playerId: number = 0;
  @Input() playerName: string = '';
  @Input() teamId: number = 0;
  @Input() embedded: boolean = false;
  @Input() readOnly: boolean = false;

  // ─── State ───────────────────────────────────────────────────────
  usuarioActual: User | null = null;
  profileId: number = 0;
  private subs: Subscription[] = [];

  // Base / Pro toggle — persisted in localStorage
  isPro: boolean = localStorage.getItem('lesiones_isPro') === 'true';

  // Body map
  bodyView: 'front' | 'back' = 'front';
  selectedZone: BodyZone | null = null;
  hoveredZone: BodyZone | null = null;
  zones: BodyZone[] = [];

  // Injuries
  injuries: Injury[] = [];
  filteredInjuries: Injury[] = [];
  filterStatus: 'all' | 'activa' | 'recuperacion' | 'cerrada' = 'all';

  // Form
  showForm: boolean = false;
  editingInjury: Injury | null = null;
  formData: Partial<Injury> = {};
  injuryTypes: string[] = localStorage.getItem('lesiones_isPro') === 'true' ? INJURY_TYPES_PRO : INJURY_TYPES_BASE;
  severities = ['leve', 'moderada', 'grave'];

  // RTP
  rtpPhases = RTP_PHASES;
  showRtpPanel: boolean = false;
  rtpInjury: Injury | null = null;

  // Detail view
  showDetail: boolean = false;
  detailInjury: Injury | null = null;

  // Stats
  get totalInjuries(): number { return this.injuries.length; }
  get activeInjuries(): number { return this.injuries.filter(i => i.status === 'activa').length; }
  get recoveringInjuries(): number { return this.injuries.filter(i => i.status === 'recuperacion').length; }
  get closedInjuries(): number { return this.injuries.filter(i => i.status === 'cerrada').length; }

  // ─── Phase 2: Views & Panels ─────────────────────────────────
  activeView: 'bodymap' | 'timeline' | 'stats' = 'bodymap';
  timelineEntries: TimelineEntry[] = [];
  zoneStats: ZoneStat[] = [];
  typeStats: TypeStat[] = [];
  severityStats: SeverityStat[] = [];
  monthTrend: MonthTrend[] = [];
  avgRecoveryDays: number = 0;
  mostAffectedZone: string = '—';
  recurrenceRate: number = 0;

  @ViewChild('exportArea') exportArea!: ElementRef;

  // ─── Phase 3: Notification dialog ─────────────────────────────
  showNotifyDialog: boolean = false;
  pendingNotificationType: 'created' | 'updated' | 'rtp_change' | 'status_change' = 'created';
  pendingNotifyInjury: Injury | null = null;
  notificationConfig: InjuryNotificationConfig = {
    autoNotify: false,
    notifyOnCreate: true,
    notifyOnStatusChange: true,
    notifyOnRtpChange: true
  };
  showNotifySettings: boolean = false;
  notificationSent: boolean = false;

  // ─── Phase 3: Medical documents ───────────────────────────────
  detailDocuments: InjuryDocument[] = [];
  loadingDocuments: boolean = false;
  showUploadForm: boolean = false;
  uploadDescription: string = '';
  selectedFile: File | null = null;
  uploadingDocument: boolean = false;

  constructor(
    private loginService: LoginService,
    private injuryService: InjuryService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.loginService.usuarioActual.subscribe(user => {
        this.usuarioActual = user;
        this.profileId = user?.profileType?.profileId ?? 0;
      })
    );
    this.notificationConfig = this.injuryService.getNotificationConfig();
    this.updateZones();
    this.loadInjuries();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['playerId']) {
      this.loadInjuries();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ─── Base / Pro Toggle ──────────────────────────────────────────
  toggleMode(): void {
    this.isPro = !this.isPro;
    localStorage.setItem('lesiones_isPro', String(this.isPro));
    this.updateZones();
    this.injuryTypes = this.isPro ? INJURY_TYPES_PRO : INJURY_TYPES_BASE;
  }

  private updateZones(): void {
    this.zones = this.injuryService.getBodyZones(this.isPro);
  }

  getZonesForView(view: 'front' | 'back'): BodyZone[] {
    return this.zones.filter(z => z.view === view);
  }

  getZoneLabel(zone: BodyZone): string {
    return this.isPro ? zone.labelPro : zone.labelBase;
  }

  // ─── Body Map Interaction ───────────────────────────────────────
  selectZone(zone: BodyZone): void {
    if (this.readOnly) return;
    this.selectedZone = zone;
    this.openNewInjuryForm(zone);
  }

  hoverZone(zone: BodyZone | null): void {
    this.hoveredZone = zone;
  }

  hasInjuryInZone(zoneId: string): boolean {
    return this.injuries.some(i => i.zone === zoneId && i.status !== 'cerrada');
  }

  getZoneInjuryCount(zoneId: string): number {
    return this.injuries.filter(i => i.zone === zoneId && i.status !== 'cerrada').length;
  }

  getZoneSeverityClass(zoneId: string): string {
    const active = this.injuries.filter(i => i.zone === zoneId && i.status !== 'cerrada');
    if (!active.length) return '';
    if (active.some(i => i.severity === 'grave')) return 'zone-grave';
    if (active.some(i => i.severity === 'moderada')) return 'zone-moderada';
    return 'zone-leve';
  }

  // ─── View switcher ──────────────────────────────────────────────
  switchView(view: 'bodymap' | 'timeline' | 'stats'): void {
    this.activeView = view;
    if (view === 'timeline') this.buildTimeline();
    if (view === 'stats') this.buildStatistics();
  }

  // ─── Injuries CRUD (via InjuryService) ─────────────────────────
  private loadInjuries(): void {
    this.subs.push(
      this.injuryService.getInjuriesByPlayer(this.playerId, this.playerName).subscribe(injuries => {
        this.injuries = injuries;
        this.applyFilter();
        this.buildTimeline();
        this.buildStatistics();
      })
    );
  }

  applyFilter(): void {
    if (this.filterStatus === 'all') {
      this.filteredInjuries = [...this.injuries];
    } else {
      this.filteredInjuries = this.injuries.filter(i => i.status === this.filterStatus);
    }
    const statusOrder: Record<string, number> = { 'activa': 0, 'recuperacion': 1, 'cerrada': 2 };
    this.filteredInjuries.sort((a, b) => {
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return new Date(b.dateInjury).getTime() - new Date(a.dateInjury).getTime();
    });
  }

  setFilter(status: 'all' | 'activa' | 'recuperacion' | 'cerrada'): void {
    this.filterStatus = status;
    this.applyFilter();
  }

  // ─── Form ──────────────────────────────────────────────────────
  openNewInjuryForm(zone?: BodyZone): void {
    if (this.readOnly) return;
    this.editingInjury = null;
    this.formData = {
      zone: zone?.id || '',
      zoneLabel: zone ? this.getZoneLabel(zone) : '',
      type: '',
      severity: 'leve',
      description: '',
      dateInjury: new Date().toISOString().split('T')[0],
      dateReturn: '',
      mechanism: '',
      treatment: '',
      notes: '',
      status: 'activa',
      rtpPhase: 1,
      createdBy: 'Entrenador'
    };
    this.showForm = true;
    this.showDetail = false;
    this.showRtpPanel = false;
  }

  openEditInjuryForm(injury: Injury): void {
    if (this.readOnly) return;
    this.editingInjury = injury;
    this.formData = { ...injury };
    this.showForm = true;
    this.showDetail = false;
    this.showRtpPanel = false;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingInjury = null;
    this.selectedZone = null;
  }

  saveInjury(): void {
    if (!this.formData.zone || !this.formData.type || !this.formData.dateInjury) return;

    if (this.editingInjury) {
      // Update existing via service
      this.subs.push(
        this.injuryService.updateInjury(this.editingInjury.id, this.formData).subscribe(updated => {
          const idx = this.injuries.findIndex(i => i.id === this.editingInjury!.id);
          if (idx !== -1) {
            this.injuries[idx] = { ...this.injuries[idx], ...this.formData } as Injury;
          }
          this.afterSave(this.injuries[idx] || updated, 'updated');
        })
      );
    } else {
      // Create new via service
      const newData: Partial<Injury> = {
        ...this.formData,
        playerId: this.playerId,
        playerName: this.playerName
      };
      this.subs.push(
        this.injuryService.createInjury(newData).subscribe(created => {
          this.injuries.push(created);
          this.afterSave(created, 'created');
        })
      );
    }
  }

  private afterSave(injury: Injury, type: 'created' | 'updated'): void {
    this.showForm = false;
    this.editingInjury = null;
    this.selectedZone = null;
    this.applyFilter();
    this.buildTimeline();
    this.buildStatistics();

    // Phase 3: Notification logic
    if (type === 'created' && this.notificationConfig.notifyOnCreate ||
        type === 'updated' && this.notificationConfig.notifyOnStatusChange) {
      if (this.notificationConfig.autoNotify) {
        // Auto-send without asking
        this.doSendNotification(injury, type);
      } else {
        // Ask user first
        this.pendingNotifyInjury = injury;
        this.pendingNotificationType = type;
        this.showNotifyDialog = true;
      }
    }
  }

  deleteInjury(injury: Injury): void {
    if (this.readOnly) return;
    this.subs.push(
      this.injuryService.deleteInjury(injury.id).subscribe(success => {
        if (success) {
          this.injuries = this.injuries.filter(i => i.id !== injury.id);
          this.applyFilter();
          this.buildTimeline();
          this.buildStatistics();
          if (this.detailInjury?.id === injury.id) {
            this.showDetail = false;
            this.detailInjury = null;
          }
        }
      })
    );
  }

  // ─── Detail View ───────────────────────────────────────────────
  viewDetail(injury: Injury): void {
    this.detailInjury = injury;
    this.showDetail = true;
    this.showForm = false;
    this.showRtpPanel = false;
    // Phase 3: Load medical documents
    this.loadDocuments(injury.id);
  }

  closeDetail(): void {
    this.showDetail = false;
    this.detailInjury = null;
    this.detailDocuments = [];
    this.showUploadForm = false;
  }

  // ─── RTP Panel ─────────────────────────────────────────────────
  openRtp(injury: Injury): void {
    this.rtpInjury = injury;
    this.showRtpPanel = true;
    this.showForm = false;
    this.showDetail = false;
  }

  closeRtp(): void {
    this.showRtpPanel = false;
    this.rtpInjury = null;
  }

  setRtpPhase(phase: number): void {
    if (this.readOnly || !this.rtpInjury) return;
    const oldPhase = this.rtpInjury.rtpPhase;
    this.rtpInjury.rtpPhase = phase;
    if (phase === 6) {
      this.rtpInjury.status = 'cerrada';
      this.rtpInjury.dateActualReturn = new Date().toISOString().split('T')[0];
    } else if (phase >= 1) {
      this.rtpInjury.status = 'recuperacion';
    }

    // Update via service
    this.subs.push(
      this.injuryService.updateRtpPhase(this.rtpInjury.id, phase).subscribe()
    );

    this.applyFilter();
    this.buildTimeline();
    this.buildStatistics();

    // Phase 3: RTP notification
    if (this.notificationConfig.notifyOnRtpChange && oldPhase !== phase) {
      if (this.notificationConfig.autoNotify) {
        this.doSendNotification(this.rtpInjury, 'rtp_change');
      } else {
        this.pendingNotifyInjury = this.rtpInjury;
        this.pendingNotificationType = 'rtp_change';
        this.showNotifyDialog = true;
      }
    }
  }

  getRtpProgress(injury: Injury): number {
    return ((injury.rtpPhase || 1) / 6) * 100;
  }

  // ═══════ PHASE 3: NOTIFICATION DIALOG ═══════════════════════════
  confirmSendNotification(): void {
    if (this.pendingNotifyInjury) {
      this.doSendNotification(this.pendingNotifyInjury, this.pendingNotificationType);
    }
    this.showNotifyDialog = false;
    this.pendingNotifyInjury = null;
  }

  cancelNotification(): void {
    this.showNotifyDialog = false;
    this.pendingNotifyInjury = null;
  }

  private doSendNotification(injury: Injury, type: 'created' | 'updated' | 'rtp_change' | 'status_change'): void {
    const messages: Record<string, string> = {
      created: `Nueva lesión registrada: ${injury.zoneLabel} (${injury.severity}) para ${injury.playerName}`,
      updated: `Lesión actualizada: ${injury.zoneLabel} de ${injury.playerName}`,
      rtp_change: `Avance RTP: ${injury.playerName} – ${injury.zoneLabel} → Fase ${injury.rtpPhase}/6`,
      status_change: `Cambio de estado: ${injury.zoneLabel} de ${injury.playerName} → ${this.getStatusLabel(injury.status)}`
    };
    this.subs.push(
      this.injuryService.sendNotification({
        injuryId: injury.id,
        playerId: injury.playerId,
        teamId: this.teamId,
        type,
        message: messages[type]
      }).subscribe(sent => {
        if (sent) {
          this.notificationSent = true;
          setTimeout(() => this.notificationSent = false, 3000);
        }
      })
    );
  }

  toggleNotifySettings(): void {
    this.showNotifySettings = !this.showNotifySettings;
  }

  saveNotifySettings(): void {
    this.injuryService.setNotificationConfig(this.notificationConfig);
    this.showNotifySettings = false;
  }

  // ═══════ PHASE 3: MEDICAL DOCUMENTS ═════════════════════════════
  private loadDocuments(injuryId: number): void {
    this.loadingDocuments = true;
    this.detailDocuments = [];
    this.subs.push(
      this.injuryService.getDocuments(injuryId).subscribe(docs => {
        this.detailDocuments = docs;
        this.loadingDocuments = false;
      })
    );
  }

  toggleUploadForm(): void {
    this.showUploadForm = !this.showUploadForm;
    this.selectedFile = null;
    this.uploadDescription = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
    }
  }

  uploadDocument(): void {
    if (!this.selectedFile || !this.detailInjury) return;
    this.uploadingDocument = true;
    const uploadedBy = this.usuarioActual
      ? `${this.usuarioActual.firstName || ''} ${this.usuarioActual.secondName || ''}`.trim() || 'Entrenador'
      : 'Entrenador';
    this.subs.push(
      this.injuryService.uploadDocument(
        this.detailInjury.id,
        this.selectedFile,
        this.uploadDescription,
        uploadedBy
      ).subscribe(doc => {
        this.detailDocuments.push(doc);
        this.uploadingDocument = false;
        this.showUploadForm = false;
        this.selectedFile = null;
        this.uploadDescription = '';
      })
    );
  }

  deleteDocument(doc: InjuryDocument): void {
    if (!this.detailInjury) return;
    this.subs.push(
      this.injuryService.deleteDocument(this.detailInjury.id, doc.id).subscribe(success => {
        if (success) {
          this.detailDocuments = this.detailDocuments.filter(d => d.id !== doc.id);
        }
      })
    );
  }

  getDocumentIcon(fileType: string): string {
    switch (fileType) {
      case 'pdf': return 'bi-file-earmark-pdf-fill';
      case 'image': return 'bi-file-earmark-image-fill';
      default: return 'bi-file-earmark-fill';
    }
  }

  getDocumentIconColor(fileType: string): string {
    switch (fileType) {
      case 'pdf': return '#dc3545';
      case 'image': return '#0d6efd';
      default: return '#6c757d';
    }
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ─── Helpers ───────────────────────────────────────────────────
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'leve': return '#20c997';
      case 'moderada': return '#ffc107';
      case 'grave': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'activa': return 'Activa';
      case 'recuperacion': return 'En recuperación';
      case 'cerrada': return 'Cerrada';
      default: return status;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'activa': return 'bi-exclamation-circle-fill';
      case 'recuperacion': return 'bi-arrow-repeat';
      case 'cerrada': return 'bi-check-circle-fill';
      default: return 'bi-question-circle';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'activa': return '#dc3545';
      case 'recuperacion': return '#ffc107';
      case 'cerrada': return '#31b270';
      default: return '#6c757d';
    }
  }

  getDaysSinceInjury(dateInjury: string): number {
    const diff = new Date().getTime() - new Date(dateInjury).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  onZoneSelected(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const zoneId = select.value;
    const zone = this.zones.find(z => z.id === zoneId);
    if (zone) {
      this.formData.zone = zone.id;
      this.formData.zoneLabel = this.getZoneLabel(zone);
    }
  }

  // ═══════ PHASE 2: TIMELINE ═══════════════════════════════════════
  private buildTimeline(): void {
    const sorted = [...this.injuries].sort(
      (a, b) => new Date(b.dateInjury).getTime() - new Date(a.dateInjury).getTime()
    );
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let lastMonth = '';
    this.timelineEntries = sorted.map(injury => {
      const d = new Date(injury.dateInjury);
      const monthLabel = months[d.getMonth()] + ' ' + d.getFullYear();
      const isFirst = monthLabel !== lastMonth;
      lastMonth = monthLabel;
      return {
        injury,
        monthLabel,
        dayLabel: d.getDate().toString().padStart(2, '0'),
        isFirst
      };
    });
  }

  // ═══════ PHASE 2: STATISTICS ═══════════════════════════════════
  private buildStatistics(): void {
    const total = this.injuries.length;
    if (total === 0) {
      this.zoneStats = [];
      this.typeStats = [];
      this.severityStats = [];
      this.monthTrend = [];
      this.avgRecoveryDays = 0;
      this.mostAffectedZone = '—';
      this.recurrenceRate = 0;
      return;
    }

    // Zone distribution
    const zoneCounts: Record<string, { label: string; count: number }> = {};
    this.injuries.forEach(i => {
      if (!zoneCounts[i.zone]) zoneCounts[i.zone] = { label: i.zoneLabel || i.zone, count: 0 };
      zoneCounts[i.zone].count++;
    });
    this.zoneStats = Object.entries(zoneCounts)
      .map(([zoneId, v]) => ({ zoneId, label: v.label, count: v.count, pct: Math.round((v.count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    this.mostAffectedZone = this.zoneStats.length ? this.zoneStats[0].label : '—';

    const zonesWithMultiple = this.zoneStats.filter(z => z.count > 1).length;
    this.recurrenceRate = this.zoneStats.length ? Math.round((zonesWithMultiple / this.zoneStats.length) * 100) : 0;

    // Type distribution
    const typeCounts: Record<string, number> = {};
    this.injuries.forEach(i => {
      typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
    });
    this.typeStats = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    // Severity distribution
    const sevCounts: Record<string, number> = { leve: 0, moderada: 0, grave: 0 };
    this.injuries.forEach(i => sevCounts[i.severity] = (sevCounts[i.severity] || 0) + 1);
    this.severityStats = [
      { severity: 'Leve', count: sevCounts['leve'], pct: Math.round((sevCounts['leve'] / total) * 100), color: '#20c997' },
      { severity: 'Moderada', count: sevCounts['moderada'], pct: Math.round((sevCounts['moderada'] / total) * 100), color: '#ffc107' },
      { severity: 'Grave', count: sevCounts['grave'], pct: Math.round((sevCounts['grave'] / total) * 100), color: '#dc3545' },
    ];

    // Month trend (last 12 months)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const trendMap: Record<string, number> = {};
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      trendMap[key] = 0;
    }
    this.injuries.forEach(i => {
      const d = new Date(i.dateInjury);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (trendMap[key] !== undefined) trendMap[key]++;
    });
    const maxCount = Math.max(1, ...Object.values(trendMap));
    this.monthTrend = Object.entries(trendMap).map(([key, count]) => {
      const [y, m] = key.split('-');
      return { label: months[+m - 1] + ' ' + y.slice(2), count, maxCount };
    });

    // Average recovery days
    const closedWithReturn = this.injuries.filter(i => i.status === 'cerrada' && i.dateActualReturn);
    if (closedWithReturn.length) {
      const totalDays = closedWithReturn.reduce((sum, i) => {
        return sum + Math.max(0, Math.floor(
          (new Date(i.dateActualReturn!).getTime() - new Date(i.dateInjury).getTime()) / (1000 * 60 * 60 * 24)
        ));
      }, 0);
      this.avgRecoveryDays = Math.round(totalDays / closedWithReturn.length);
    } else {
      this.avgRecoveryDays = 0;
    }
  }

  // ═══════ PHASE 2: EXPORT / PRINT ══════════════════════════════
  exportInjuryReport(): void {
    this.buildStatistics();
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════');
    lines.push('  INFORME DE LESIONES – SPHAIRA');
    lines.push('═══════════════════════════════════════════');
    lines.push('');
    lines.push(`Jugador: ${this.playerName || 'N/A'}`);
    lines.push(`Fecha del informe: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`);
    lines.push('');
    lines.push('──── RESUMEN ────');
    lines.push(`Total de lesiones: ${this.totalInjuries}`);
    lines.push(`Activas: ${this.activeInjuries} | Recuperación: ${this.recoveringInjuries} | Cerradas: ${this.closedInjuries}`);
    lines.push(`Zona más afectada: ${this.mostAffectedZone}`);
    lines.push(`Días promedio de recuperación: ${this.avgRecoveryDays}`);
    lines.push(`Tasa de recurrencia: ${this.recurrenceRate}%`);
    lines.push('');
    lines.push('──── DETALLE DE LESIONES ────');
    this.injuries.forEach((inj, idx) => {
      lines.push('');
      lines.push(`${idx + 1}. ${inj.zoneLabel} – ${inj.type} (${inj.severity})`);
      lines.push(`   Estado: ${this.getStatusLabel(inj.status)}`);
      lines.push(`   Fecha: ${inj.dateInjury}${inj.dateReturn ? ' → Retorno est.: ' + inj.dateReturn : ''}`);
      if (inj.dateActualReturn) lines.push(`   Retorno real: ${inj.dateActualReturn}`);
      if (inj.mechanism) lines.push(`   Mecanismo: ${inj.mechanism}`);
      lines.push(`   Descripción: ${inj.description}`);
      if (inj.treatment) lines.push(`   Tratamiento: ${inj.treatment}`);
      if (inj.notes && this.isPro) lines.push(`   Notas: ${inj.notes}`);
      if (inj.rtpPhase) lines.push(`   Fase RTP: ${inj.rtpPhase}/6`);
    });

    if (this.zoneStats.length) {
      lines.push('');
      lines.push('──── DISTRIBUCIÓN POR ZONA ────');
      this.zoneStats.forEach(z => lines.push(`  ${z.label}: ${z.count} (${z.pct}%)`));
    }
    if (this.typeStats.length) {
      lines.push('');
      lines.push('──── DISTRIBUCIÓN POR TIPO ────');
      this.typeStats.forEach(t => lines.push(`  ${t.type}: ${t.count} (${t.pct}%)`));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Lesiones_${(this.playerName || 'jugador').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  printInjuryReport(): void {
    const printContents = document.querySelector('.lesiones-print-area');
    if (!printContents) {
      this.exportInjuryReport();
      return;
    }
    const w = window.open('', '', 'width=800,height=600');
    if (w) {
      w.document.write(`
        <html><head><title>Informe de Lesiones – ${this.playerName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
          h1 { font-size: 1.3rem; border-bottom: 2px solid #002c40; padding-bottom: 0.5rem; }
          h2 { font-size: 1rem; color: #002c40; margin-top: 1.5rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.85rem; }
          th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
          th { background: #f4f7fa; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
          .b-leve { background: #d1f5ea; color: #0f7b5f; }
          .b-moderada { background: #fff3cd; color: #856404; }
          .b-grave { background: #f8d7da; color: #842029; }
          .stat-row { display: flex; gap: 2rem; margin-top: 0.5rem; flex-wrap: wrap; }
          .stat-item { font-size: 0.85rem; }
          .stat-item strong { font-size: 1.1rem; }
          @media print { body { padding: 0; } }
        </style></head><body>
        <h1>🏥 Informe de Lesiones – ${this.playerName || 'Jugador'}</h1>
        <p style="color:#666;font-size:0.85rem;">Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <div class="stat-row">
          <div class="stat-item"><strong>${this.totalInjuries}</strong> Total</div>
          <div class="stat-item"><strong>${this.activeInjuries}</strong> Activas</div>
          <div class="stat-item"><strong>${this.recoveringInjuries}</strong> Recuperación</div>
          <div class="stat-item"><strong>${this.closedInjuries}</strong> Cerradas</div>
          <div class="stat-item"><strong>${this.avgRecoveryDays}d</strong> Recup. media</div>
        </div>
        <h2>Detalle de lesiones</h2>
        <table>
          <thead><tr><th>#</th><th>Zona</th><th>Tipo</th><th>Gravedad</th><th>Fecha</th><th>Estado</th><th>Mecanismo</th></tr></thead>
          <tbody>
            ${this.injuries.map((inj, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${inj.zoneLabel}</td>
                <td>${inj.type}</td>
                <td><span class="badge b-${inj.severity}">${inj.severity}</span></td>
                <td>${inj.dateInjury}</td>
                <td>${this.getStatusLabel(inj.status)}</td>
                <td>${inj.mechanism || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </body></html>
      `);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); w.close(); }, 500);
    }
  }

  getBodyOutlineFront(): string {
    return `M150,8 C134,8 125,18 125,32 C125,46 134,55 145,57 L145,58 L122,58 C115,58 108,65 106,72
            L102,115 L98,155 L93,165 L91,180 L95,182 L110,165 L116,115 L122,72 L130,72 L130,100
            L133,130 L138,148 L128,148 L126,198 L126,215 L128,215 L130,268 L128,282 L123,296 L148,296
            L147,282 L144,268 L144,215 L146,198 L148,148 L150,148
            L152,148 L154,198 L156,215 L156,268 L153,282 L152,296 L177,296 L175,282 L172,268 L172,215
            L174,215 L174,198 L172,148 L162,148 L167,130 L170,100 L170,72 L178,72 L184,115 L190,165
            L209,180 L207,182 L202,165 L198,155 L195,115 L192,72 C190,65 185,58 178,58 L155,58 L155,57
            C166,55 175,46 175,32 C175,18 166,8 150,8 Z`;
  }

  getBodyOutlineBack(): string {
    return this.getBodyOutlineFront();
  }
}
