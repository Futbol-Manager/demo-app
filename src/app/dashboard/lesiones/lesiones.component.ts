import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoginService } from 'src/app/core/services/login/login.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { PdfExportService } from 'src/app/core/services/pdf-export/pdf-export.service';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';
import { User } from 'src/app/core/models/users/user.model';
import {
  BodyZone, Injury, InjuryDocument, InjuryEvolutionNote, TimelineEntry,
  ZoneStat, TypeStat, SeverityStat, MonthTrend,
  RTP_PHASES, RTP_CATEGORIES, RtpCategoryDef,
  INJURY_TYPES_BASE, INJURY_TYPES_PRO,
  BODY_ZONES_BASE, BODY_ZONES_PRO_EXTRA,
  InjuryNotificationConfig, DOCUMENT_CATEGORIES, DocumentCategory,
  InjuryStatus, INJURY_STATUSES, InjuryStatusDef,
  TissueType, TISSUE_COLORS, TISSUE_LABELS, TISSUE_ICONS,
  getSuggestedStatus, migrateStatus, getStatusDef
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
  @Input() teamName: string = '';
  @Input() clubId: number = 0;
  @Input() embedded: boolean = false;
  @Input() readOnly: boolean = false;

  // ─── State ───────────────────────────────────────────────────────
  usuarioActual: User | null = null;
  profileId: number = 0;
  private subs: Subscription[] = [];

  // Base / Pro toggle — persisted in localStorage
  isPro: boolean = localStorage.getItem('lesiones_isPro') === 'true';

  // Body map
  selectedZone: BodyZone | null = null;
  hoveredZone: BodyZone | null = null;
  zones: BodyZone[] = [];

  // ─── Body map: tissue filter ─────────────────────────────────────
  activeTissueFilter: TissueType | 'all' = 'all';
  readonly tissueTypes: TissueType[] = ['muscular', 'articular', 'ligamentoso', 'tendinoso', 'oseo'];
  readonly tissueColors = TISSUE_COLORS;
  readonly tissueLabels = TISSUE_LABELS;
  readonly tissueIcons  = TISSUE_ICONS;

  // Injuries
  injuries: Injury[] = [];
  filteredInjuries: Injury[] = [];
  filterStatus: InjuryStatus | 'all' = 'all';

  // Status definitions for template
  readonly injuryStatuses: InjuryStatusDef[] = INJURY_STATUSES;

  // Form
  showForm: boolean = false;
  editingInjury: Injury | null = null;
  formData: Partial<Injury> = {};
  injuryTypes: string[] = localStorage.getItem('lesiones_isPro') === 'true' ? INJURY_TYPES_PRO : INJURY_TYPES_BASE;
  severities = ['leve', 'moderada', 'grave'];

  // RTP
  rtpPhases = RTP_PHASES;
  rtpCategories = RTP_CATEGORIES;
  showRtpPanel: boolean = false;
  rtpInjury: Injury | null = null;

  // Detail view
  showDetail: boolean = false;
  detailInjury: Injury | null = null;

  // Stats
  get totalInjuries(): number { return this.injuries.length; }
  get activeInjuries(): number {
    return this.injuries.filter(i => i.status === 'baja' || i.status === 'fisioterapia').length;
  }
  get recoveringInjuries(): number {
    return this.injuries.filter(i => i.status === 'readaptacion' || i.status === 'condicionado').length;
  }
  get closedInjuries(): number { return this.injuries.filter(i => i.status === 'alta').length; }

  // ─── Phase 2: Views & Panels ─────────────────────────────────
  activeView: 'bodymap' | 'timeline' | 'stats' | '3d' = 'bodymap';
  timelineEntries: TimelineEntry[] = [];
  zoneStats: ZoneStat[] = [];
  typeStats: TypeStat[] = [];
  severityStats: SeverityStat[] = [];
  monthTrend: MonthTrend[] = [];
  avgRecoveryDays: number = 0;
  mostAffectedZone: string = '—';
  recurrenceRate: number = 0;

  @ViewChild('exportArea') exportArea!: ElementRef;
  @ViewChild('reportPrintArea') reportPrintArea!: ElementRef<HTMLElement>;
  @ViewChild('evolutionPrintArea') evolutionPrintArea?: ElementRef<HTMLElement>;

  isExporting = false;
  isExportingEvolution = false;
  today = new Date();

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

  // ─── Medical documents ───────────────────────────────
  detailDocuments: InjuryDocument[] = [];
  loadingDocuments: boolean = false;
  showUploadForm: boolean = false;
  uploadDescription: string = '';
  uploadDocumentCategory: string = '';
  selectedFile: File | null = null;
  uploadingDocument: boolean = false;
  documentCategories: DocumentCategory[] = DOCUMENT_CATEGORIES;

  // ─── AI rewrite ──────────────────────────────────────
  aiRewrite: {
    field: string | null;
    loading: boolean;
    suggestion: string | null;
    error: string | null;
  } = { field: null, loading: false, suggestion: null, error: null };
  aiCreditsAvailable: number = 50;

  // ─── Evolution notes ─────────────────────────────────
  detailNotes: InjuryEvolutionNote[] = [];
  loadingNotes: boolean = false;
  showNoteForm: boolean = false;
  noteFormData: Partial<InjuryEvolutionNote> = {};
  editingNote: InjuryEvolutionNote | null = null;
  savingNote: boolean = false;

  constructor(
    private loginService: LoginService,
    private injuryService: InjuryService,
    private pdfExport: PdfExportService,
    private aiChatService: AiChatService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.loginService.usuarioActual.subscribe(user => {
        this.usuarioActual = user;
        this.profileId = user?.profileType?.profileId ?? 0;
        if (user?.userId) {
          this.aiChatService.getCredits(user.userId).subscribe(info => {
            this.aiCreditsAvailable = info.creditsAvailable;
          });
        }
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

  // ─── Tissue filter ──────────────────────────────────────────────
  setTissueFilter(tissue: TissueType | 'all'): void {
    this.activeTissueFilter = tissue;
  }

  isZoneDimmed(zone: BodyZone): boolean {
    if (this.activeTissueFilter === 'all') return false;
    const types: TissueType[] = zone.tissueTypes ?? [zone.tissueType];
    return !types.includes(this.activeTissueFilter as TissueType);
  }

  getZoneTissueColor(zone: BodyZone): string {
    const filter = this.activeTissueFilter;
    const primaryType = (filter !== 'all' && (zone.tissueTypes ?? [zone.tissueType]).includes(filter as TissueType))
      ? (filter as TissueType)
      : zone.tissueType;
    return TISSUE_COLORS[primaryType];
  }

  // ─── Heat-map density ───────────────────────────────────────────
  /** Returns 0–1 fill opacity based on number of active injuries in this zone */
  getZoneHeatOpacity(zoneId: string): number {
    const count = this.injuries.filter(i => i.zone === zoneId && i.status !== 'alta').length;
    if (count === 0) return 0;
    if (count === 1) return 0.35;
    if (count === 2) return 0.65;
    return 0.90;
  }

  getZoneHeatFill(zone: BodyZone): string {
    const opacity = this.getZoneHeatOpacity(zone.id);
    if (opacity === 0) return 'transparent';
    const hex = this.getZoneTissueColor(zone);
    return hex;
  }

  // ─── Body Map Interaction ───────────────────────────────────────
  selectZone(zone: BodyZone): void {
    if (this.readOnly) return;
    this.selectedZone = zone;
    this.openNewInjuryForm(zone);
  }

  on3dZoneSelected(zone: BodyZone): void {
    this.selectZone(zone);
    this.switchView('bodymap');
  }

  getZoneLabelById(zoneId: string): string {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return zoneId;
    return this.isPro ? zone.labelPro : zone.labelBase;
  }

  hoverZone(zone: BodyZone | null): void {
    this.hoveredZone = zone;
  }

  hasInjuryInZone(zoneId: string): boolean {
    return this.injuries.some(i => i.zone === zoneId && i.status !== 'alta');
  }

  getZoneInjuryCount(zoneId: string): number {
    return this.injuries.filter(i => i.zone === zoneId && i.status !== 'alta').length;
  }

  /** Returns the most severe active injury marker class for a zone */
  getZoneSeverityClass(zoneId: string): string {
    const active = this.injuries.filter(i => i.zone === zoneId && i.status !== 'alta');
    if (!active.length) return '';
    if (active.some(i => i.severity === 'grave')) return 'zone-grave';
    if (active.some(i => i.severity === 'moderada')) return 'zone-moderada';
    return 'zone-leve';
  }

  /** Returns CSS class for injury dot based on status */
  getInjuryDotClass(zoneId: string): string {
    const active = this.injuries.filter(i => i.zone === zoneId && i.status !== 'alta');
    if (!active.length) return '';
    if (active.some(i => i.status === 'baja' || i.status === 'fisioterapia')) return 'dot-critical';
    if (active.some(i => i.status === 'readaptacion')) return 'dot-readap';
    return 'dot-condic';
  }

  // ─── View switcher ──────────────────────────────────────────────
  switchView(view: 'bodymap' | 'timeline' | 'stats' | '3d'): void {
    this.activeView = view;
    if (view === 'timeline') this.buildTimeline();
    if (view === 'stats') this.buildStatistics();
  }

  // ─── Injuries CRUD (via InjuryService) ─────────────────────────
  private loadInjuries(): void {
    this.subs.push(
      this.injuryService.getInjuriesByPlayer(this.playerId, this.playerName).subscribe(injuries => {
        this.injuries = injuries.map(i => ({ ...i, status: migrateStatus(i.status) }));
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
    const statusOrder: Record<string, number> = {
      'baja': 0, 'fisioterapia': 1, 'readaptacion': 2, 'condicionado': 3, 'alta': 4
    };
    this.filteredInjuries.sort((a, b) => {
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return new Date(b.dateInjury).getTime() - new Date(a.dateInjury).getTime();
    });
  }

  setFilter(status: InjuryStatus | 'all'): void {
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
      status: 'baja',
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
      const newData: Partial<Injury> = {
        ...this.formData,
        playerId: this.playerId,
        playerName: this.playerName,
        teamId: this.teamId || undefined,
        teamName: this.teamName || undefined,
        clubId: this.clubId || undefined
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

    if (type === 'created' && this.notificationConfig.notifyOnCreate ||
        type === 'updated' && this.notificationConfig.notifyOnStatusChange) {
      if (this.notificationConfig.autoNotify) {
        this.doSendNotification(injury, type);
      } else {
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
    this.loadDocuments(injury.id);
    this.loadNotes(injury.id);
  }

  closeDetail(): void {
    this.showDetail = false;
    this.detailInjury = null;
    this.detailDocuments = [];
    this.detailNotes = [];
    this.showUploadForm = false;
    this.showNoteForm = false;
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
    const suggestedStatus = getSuggestedStatus(phase);
    this.rtpInjury.status = suggestedStatus;
    if (phase === 6) {
      this.rtpInjury.dateActualReturn = new Date().toISOString().split('T')[0];
    }

    this.subs.push(
      this.injuryService.updateRtpPhase(this.rtpInjury.id, phase).subscribe()
    );

    this.applyFilter();
    this.buildTimeline();
    this.buildStatistics();

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

  getRtpCategoryForPhase(phase: number): RtpCategoryDef | undefined {
    return this.rtpCategories.find(c => c.phases.includes(phase));
  }

  getRtpCategoryLabel(phase: number): string {
    const cat = this.getRtpCategoryForPhase(phase);
    return cat ? cat.label : '';
  }

  getRtpCategoryColor(phase: number): string {
    const cat = this.getRtpCategoryForPhase(phase);
    return cat ? cat.color : '#6c757d';
  }

  // ─── Suggested status from RTP ─────────────────────────────────
  getSuggestedStatusLabel(rtpPhase: number | undefined): string {
    if (!rtpPhase) return '';
    return getStatusDef(getSuggestedStatus(rtpPhase)).label;
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
        uploadedBy,
        this.uploadDocumentCategory || undefined
      ).subscribe(doc => {
        this.detailDocuments.push(doc);
        this.uploadingDocument = false;
        this.showUploadForm = false;
        this.selectedFile = null;
        this.uploadDescription = '';
        this.uploadDocumentCategory = '';
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

  getDocumentCategoryLabel(code: string | undefined): string {
    if (!code) return '';
    const cat = DOCUMENT_CATEGORIES.find(c => c.code === code);
    return cat ? cat.label : code;
  }

  // ═══════ EVOLUTION NOTES ════════════════════════════════════════
  private loadNotes(injuryId: number): void {
    this.loadingNotes = true;
    this.detailNotes = [];
    this.subs.push(
      this.injuryService.getEvolutionNotes(injuryId).subscribe(notes => {
        this.detailNotes = notes;
        this.loadingNotes = false;
      })
    );
  }

  openNewNoteForm(): void {
    this.editingNote = null;
    this.noteFormData = {
      noteDate: new Date().toISOString().split('T')[0],
      content: '',
      rtpPhaseAtTime: this.detailInjury?.rtpPhase,
      statusAtTime: this.detailInjury?.status,
      createdByName: this.usuarioActual
        ? `${this.usuarioActual.firstName || ''} ${this.usuarioActual.secondName || ''}`.trim() || 'Fisio'
        : 'Fisio'
    };
    this.showNoteForm = true;
  }

  openEditNoteForm(note: InjuryEvolutionNote): void {
    this.editingNote = note;
    this.noteFormData = { ...note };
    this.showNoteForm = true;
  }

  cancelNoteForm(): void {
    this.showNoteForm = false;
    this.editingNote = null;
    this.noteFormData = {};
  }

  saveNote(): void {
    if (!this.noteFormData.content || !this.detailInjury) return;
    this.savingNote = true;

    if (this.editingNote) {
      this.subs.push(
        this.injuryService.updateEvolutionNote(this.editingNote.noteId, this.noteFormData).subscribe(updated => {
          const idx = this.detailNotes.findIndex(n => n.noteId === this.editingNote!.noteId);
          if (idx !== -1) this.detailNotes[idx] = { ...this.detailNotes[idx], ...updated };
          this.savingNote = false;
          this.cancelNoteForm();
        })
      );
    } else {
      this.subs.push(
        this.injuryService.createEvolutionNote(this.detailInjury.id, this.noteFormData).subscribe(created => {
          this.detailNotes.unshift(created);
          this.savingNote = false;
          this.cancelNoteForm();
        })
      );
    }
  }

  deleteNote(note: InjuryEvolutionNote): void {
    this.subs.push(
      this.injuryService.deleteEvolutionNote(note.noteId).subscribe(success => {
        if (success) {
          this.detailNotes = this.detailNotes.filter(n => n.noteId !== note.noteId);
        }
      })
    );
  }

  getNoteStatusLabel(status: string | undefined): string {
    return status ? this.getStatusLabel(status) : '';
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

  // ─── Status Helpers ────────────────────────────────────────────
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'leve': return '#20c997';
      case 'moderada': return '#ffc107';
      case 'grave': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getStatusLabel(status: string): string {
    const def = INJURY_STATUSES.find(s => s.code === status);
    return def ? def.label : status;
  }

  getStatusLabelShort(status: string): string {
    const def = INJURY_STATUSES.find(s => s.code === status);
    return def ? def.labelShort : status;
  }

  getStatusIcon(status: string): string {
    const def = INJURY_STATUSES.find(s => s.code === status);
    return def ? def.icon : 'bi-question-circle';
  }

  getStatusColor(status: string): string {
    const def = INJURY_STATUSES.find(s => s.code === status);
    return def ? def.color : '#6c757d';
  }

  isAvailableForMatch(status: string): boolean {
    const def = INJURY_STATUSES.find(s => s.code === status);
    return def ? def.availableForMatch : false;
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

    const typeCounts: Record<string, number> = {};
    this.injuries.forEach(i => {
      typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
    });
    this.typeStats = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    const sevCounts: Record<string, number> = { leve: 0, moderada: 0, grave: 0 };
    this.injuries.forEach(i => sevCounts[i.severity] = (sevCounts[i.severity] || 0) + 1);
    this.severityStats = [
      { severity: 'Leve',     count: sevCounts['leve'],     pct: Math.round((sevCounts['leve'] / total) * 100),     color: '#20c997' },
      { severity: 'Moderada', count: sevCounts['moderada'], pct: Math.round((sevCounts['moderada'] / total) * 100), color: '#ffc107' },
      { severity: 'Grave',    count: sevCounts['grave'],    pct: Math.round((sevCounts['grave'] / total) * 100),    color: '#dc3545' },
    ];

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

    const closedWithReturn = this.injuries.filter(i => i.status === 'alta' && i.dateActualReturn);
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

  // ═══════ AI REWRITE ════════════════════════════════════════════

  /**
   * field: 'mechanism' | 'description' | 'treatment' | 'notes' (formData)
   *        'noteContent' (noteFormData)
   */
  rewriteWithAi(field: string): void {
    const currentText = field === 'noteContent'
      ? this.noteFormData.content
      : (this.formData as Record<string, any>)[field];

    if (!currentText?.trim()) return;

    if (this.aiCreditsAvailable <= 0) {
      this.aiRewrite = {
        field,
        loading: false,
        suggestion: null,
        error: 'Sin créditos de IA disponibles. Adquiere más créditos para usar esta función.'
      };
      return;
    }

    this.aiRewrite = { field, loading: true, suggestion: null, error: null };

    const zoneLabel = this.getZoneLabelById(this.formData.zone || '');
    const injuryCtx = [
      zoneLabel              ? `Zona: ${zoneLabel}`                  : '',
      this.formData.type     ? `Tipo: ${this.formData.type}`         : '',
      this.formData.severity ? `Gravedad: ${this.formData.severity}` : ''
    ].filter(Boolean).join(', ');

    const fieldLabels: Record<string, string> = {
      mechanism:   'Mecanismo de lesión',
      description: 'Descripción de la lesión',
      treatment:   'Tratamiento indicado',
      notes:       'Notas médicas',
      noteContent: 'Nota de evolución clínica'
    };

    const userId = this.usuarioActual?.userId ?? 0;

    this.aiChatService.rewriteText(userId, this.clubId || null, fieldLabels[field] ?? field, currentText, injuryCtx)
      .subscribe({
        next: resp => {
          if (resp.creditsRemaining !== undefined) {
            this.aiCreditsAvailable = resp.creditsRemaining;
          }
          if (resp.success) {
            this.aiRewrite = { field, loading: false, suggestion: resp.response?.trim() ?? null, error: null };
          } else {
            const errMsg = resp.error === 'NO_CREDITS'
              ? 'Sin créditos de IA disponibles. Adquiere más créditos para usar esta función.'
              : (resp.message ?? 'Error al contactar con la IA. Inténtalo de nuevo.');
            this.aiRewrite = { field, loading: false, suggestion: null, error: errMsg };
          }
        },
        error: () => {
          this.aiRewrite = { field, loading: false, suggestion: null, error: 'Error de conexión. Inténtalo de nuevo.' };
        }
      });
  }

  acceptAiRewrite(): void {
    if (!this.aiRewrite.suggestion || !this.aiRewrite.field) return;
    if (this.aiRewrite.field === 'noteContent') {
      this.noteFormData = { ...this.noteFormData, content: this.aiRewrite.suggestion };
    } else {
      this.formData = { ...this.formData, [this.aiRewrite.field]: this.aiRewrite.suggestion };
    }
    this.aiRewrite = { field: null, loading: false, suggestion: null, error: null };
  }

  discardAiRewrite(): void {
    this.aiRewrite = { field: null, loading: false, suggestion: null, error: null };
  }

  // ═══════ EXPORT / PRINT — PDF con branding Sphaira ═══════════
  async exportInjuryReport(): Promise<void> {
    if (this.isExporting) return;
    this.buildStatistics();
    this.isExporting = true;

    await new Promise(resolve => setTimeout(resolve, 100));

    const el = this.reportPrintArea?.nativeElement;
    if (!el) { this.isExporting = false; return; }

    const name = (this.playerName || 'jugador').replace(/\s+/g, '_');
    const today = new Date().toISOString().split('T')[0];

    try {
      await this.pdfExport.exportReport(el, {
        fileName: `Informe_Lesiones_${name}_${today}`,
        title: 'Informe de Lesiones',
        subtitle: this.playerName
          ? `${this.playerName}  ·  ${this.teamName || ''}`
          : (this.teamName || ''),
        type: 'default'
      });
    } finally {
      this.isExporting = false;
    }
  }

  printInjuryReport(): void {
    this.exportInjuryReport();
  }

  async exportEvolutionReport(injury: Injury): Promise<void> {
    if (this.isExportingEvolution) return;
    this.isExportingEvolution = true;

    // Allow DOM to render the hidden area with latest data
    await new Promise(resolve => setTimeout(resolve, 150));

    const el = this.evolutionPrintArea?.nativeElement;
    if (!el) { this.isExportingEvolution = false; return; }

    // Insert spacers to prevent note rows from being cut across pages
    const spacers = this.insertEvolutionPageBreaks(el);
    if (spacers.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 40));
    }

    const playerLabel = (injury.playerName || this.playerName || 'jugador').replace(/\s+/g, '_');
    const zoneLabel   = injury.zoneLabel.replace(/[\s/]+/g, '_');
    const today       = new Date().toISOString().split('T')[0];

    try {
      await this.pdfExport.exportReport(el, {
        fileName:  `Evolucion_${zoneLabel}_${playerLabel}_${today}`,
        title:     'Informe de Evolución de Lesión',
        subtitle:  `${injury.zoneLabel} – ${injury.type}  ·  ${injury.playerName || this.playerName || ''}`,
        type:      'default'
      });
    } finally {
      spacers.forEach(s => s.parentNode?.removeChild(s));
      this.isExportingEvolution = false;
    }
  }

  /**
   * Two-pass algorithm to prevent ugly page breaks in the evolution PDF:
   *
   * Pass 1 — note rows: if a note row spans a page boundary, insert a
   *           spacer before it to push the entire row to the next page.
   *
   * Pass 2 — section titles: after pass 1 has shifted content, re-measure
   *           every section title.  If less than MIN_WIDOW_PX remain on
   *           the current page after the title (orphaned heading), push the
   *           title (and everything that follows) to the next page too.
   *
   * Reading getBoundingClientRect() after DOM mutations forces a synchronous
   * layout reflow, so pass 2 sees positions already updated by pass 1.
   *
   * Math mirrors PdfExportService constants:
   *   227 mm content height × (760 px / 182 mm) ≈ 949 CSS px per page.
   */
  private insertEvolutionPageBreaks(container: HTMLElement): HTMLElement[] {
    const CONTENT_W_MM  = 182;
    const CONTENT_H_MM  = 227;
    const MIN_WIDOW_PX  = 120; // min px remaining after a section title before page end

    const containerW  = container.offsetWidth || 760;
    const pxPerMm     = containerW / CONTENT_W_MM;
    const pageH_px    = CONTENT_H_MM * pxPerMm;
    const spacers: HTMLElement[] = [];

    const containerTop = () => container.getBoundingClientRect().top;

    const addSpacer = (before: HTMLElement, heightPx: number): void => {
      const spacer = document.createElement('div');
      spacer.style.cssText = `height:${Math.ceil(heightPx)}px;width:100%;flex-shrink:0;`;
      before.parentNode!.insertBefore(spacer, before);
      spacers.push(spacer);
    };

    // ── Pass 1: note rows ──────────────────────────────────────────────
    container.querySelectorAll<HTMLElement>('.epa-note-row').forEach(row => {
      const top = row.getBoundingClientRect().top - containerTop();
      const bot = row.getBoundingClientRect().bottom - containerTop();
      const topPage = Math.floor(top / pageH_px);
      const botPage = Math.floor(bot / pageH_px);
      if (topPage < botPage) {
        addSpacer(row, (topPage + 1) * pageH_px - top);
      }
    });

    // ── Pass 2: section titles (orphan prevention) ────────────────────
    // getBoundingClientRect() here triggers reflow, giving updated positions.
    container.querySelectorAll<HTMLElement>('.epa-section-title').forEach(title => {
      const top        = title.getBoundingClientRect().top    - containerTop();
      const bot        = title.getBoundingClientRect().bottom - containerTop();
      const titlePage  = Math.floor(top / pageH_px);
      const spaceAfter = (titlePage + 1) * pageH_px - bot;
      if (spaceAfter < MIN_WIDOW_PX) {
        addSpacer(title, (titlePage + 1) * pageH_px - top);
      }
    });

    return spacers;
  }

  getRtpPhaseLabel(phase: number): string {
    return this.rtpPhases.find(p => p.phase === phase)?.label ?? `Fase ${phase}`;
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

  /** Decorative anatomy lines — front view (pectorals, abs, quads, etc.) */
  getAnatomyLinesFront(): string[] {
    return [
      // Clavicle L & R
      'M150,60 C145,58 138,59 134,63 C130,67 128,72 130,74',
      'M150,60 C155,58 162,59 166,63 C170,67 172,72 170,74',
      // Sternum top
      'M150,62 L150,74',
      // Pectoral boundary L & R
      'M134,74 C137,82 143,90 150,95',
      'M166,74 C163,82 157,90 150,95',
      // Linea alba (center)
      'M150,74 L150,148',
      // Abdominal horizontal notches
      'M147,108 L153,108',
      'M147,120 L153,120',
      'M147,132 L153,132',
      // Rectus abdominis lateral edges
      'M143,95 L139,148',
      'M157,95 L161,148',
      // Serratus anterior L
      'M130,98 L138,104', 'M129,108 L137,115', 'M130,118 L137,124',
      // Serratus anterior R
      'M170,98 L162,104', 'M171,108 L163,115', 'M170,118 L163,124',
      // Iliac crest L & R
      'M127,142 C131,138 140,136 148,140',
      'M173,142 C169,138 160,136 152,140',
      // Inguinal ligament L & R
      'M146,141 L135,163',
      'M154,141 L165,163',
      // Quad separation L & R
      'M143,165 L141,211',
      'M157,165 L159,211',
      // Kneecap (patella) L & R
      'M129,218 a7,5 0 1,0 14,0 a7,5 0 1,0 -14,0',
      'M157,218 a7,5 0 1,0 14,0 a7,5 0 1,0 -14,0',
      // Tibialis anterior L & R
      'M135,232 L134,278',
      'M165,232 L166,278',
      // Deltoid/bicep boundary L & R
      'M116,82 C118,92 120,104 122,118',
      'M184,82 C182,92 180,104 178,118',
      // Forearm lateral L & R
      'M109,130 C107,140 107,150 109,160',
      'M191,130 C193,140 193,150 191,160',
    ];
  }

  /** Decorative anatomy lines — back view (trapezius, scapulas, spine, etc.) */
  getAnatomyLinesBack(): string[] {
    return [
      // Spine line
      'M150,62 L150,235',
      // Trapezius L
      'M150,65 C146,70 140,74 134,80 C128,88 128,100 134,108 C139,114 148,112 150,108',
      // Trapezius R
      'M150,65 C154,70 160,74 166,80 C172,88 172,100 166,108 C161,114 152,112 150,108',
      // Scapula (shoulder blade) L
      'M120,84 C118,92 116,104 118,116 C120,124 126,128 132,126 C138,122 140,114 138,106',
      // Scapula R
      'M180,84 C182,92 184,104 182,116 C180,124 174,128 168,126 C162,122 160,114 162,106',
      // Latissimus dorsi L & R
      'M120,108 C115,122 113,138 116,150 C118,156 124,158 130,155',
      'M180,108 C185,122 187,138 184,150 C182,156 176,158 170,155',
      // Lumbar / lower back arch
      'M138,155 C142,162 148,165 150,165 C152,165 158,162 162,155',
      // Gluteal fold L & R
      'M130,196 C136,200 144,203 150,201',
      'M170,196 C164,200 156,203 150,201',
      // Hamstring separation L & R
      'M140,200 L138,260',
      'M160,200 L162,260',
      // Gastrocnemius (calf) heads L
      'M139,270 C140,280 140,288 139,296',
      'M143,270 C142,280 142,288 143,296',
      // Gastrocnemius heads R
      'M161,270 C160,280 160,288 161,296',
      'M157,270 C158,280 158,288 157,296',
      // Achilles tendon L & R
      'M140,290 L140,302',
      'M160,290 L160,302',
      // Deltoid back L & R
      'M115,78 C118,88 120,100 122,110',
      'M185,78 C182,88 180,100 178,110',
      // Tricep L & R
      'M108,123 C107,132 106,142 108,153',
      'M192,123 C193,132 194,142 192,153',
    ];
  }
}
