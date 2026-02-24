import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';

@Component({
  selector: 'app-admin-prospector',
  templateUrl: './admin-prospector.component.html',
  styleUrls: ['./admin-prospector.component.scss']
})
export class AdminProspectorComponent implements OnInit, OnDestroy {

  activeTab = 'campaigns';
  activeMode: 'auto' | 'manual' = 'auto';
  isLoading = false;

  // Campaigns
  campaigns: any[] = [];
  selectedCampaign: any = null;
  campaignStats: any = null;
  showNewCampaignModal = false;
  newCampaignName = '';
  newCampaignDesc = '';

  // Pipeline
  pipelineProvinces = '';
  pipelineMaxEnrich = 50;
  pipelineAbRatio = 0.5;
  currentJob: any = null;
  jobPollingInterval: any = null;
  stepResults: any = { discover: null, enrich: null, analyze: null, generate: null };

  // Continue modal (semi-automatic)
  showContinueModal = false;
  continueStep = '';
  continueStepLabel = '';
  continueMessage = '';

  // Prospects
  prospects: any[] = [];
  prospectsTotal = 0;
  prospectsPage = 0;
  prospectsSize = 50;
  prospectFilterStatus = '';
  prospectSearch = '';
  prospectSortBy = 'pain_score';
  prospectSortDir = 'desc';
  private searchDebounce: any = null;
  selectedProspect: any = null;
  showProspectModal = false;
  showDeleteProspectConfirm = false;
  prospectToDelete: any = null;

  // Emails
  emails: any[] = [];
  emailFilterVariant = '';
  showEmailPreviewModal = false;
  previewEmailUrl: SafeResourceUrl = '';
  previewEmailSubject = '';
  showSendConfirmModal = false;
  sendResult: any = null;

  // Email edit
  showEditEmailModal = false;
  editingEmail: any = null;
  editEmailSubject = '';
  editEmailBody = '';
  isRegenerating = false;
  isSavingEmail = false;

  // Add club manually
  showAddClubModal = false;
  isSavingClub = false;
  newClub = this.emptyClub();

  emptyClub() {
    return {
      name: '', city: '', province: '', community: '', category: '',
      website: '', email: '', phone: '',
      instagram: '', twitter: '', facebook: '',
      estimated_teams: null as number | null,
      has_youth_academy: false,
    };
  }

  openAddClubModal(): void {
    this.newClub = this.emptyClub();
    this.showAddClubModal = true;
  }

  saveNewClub(): void {
    if (!this.newClub.name.trim()) return;
    this.isSavingClub = true;
    const payload: any = {
      ...(this.selectedCampaign ? { campaign_id: this.selectedCampaign.campaign_id } : {}),
      ...this.newClub,
    };
    Object.keys(payload).forEach(k => {
      if (payload[k] === '' || payload[k] === null) delete payload[k];
    });
    this.prospectService.createProspect(payload).subscribe({
      next: () => {
        this.isSavingClub = false;
        this.showAddClubModal = false;
        if (this.activeTab === 'library') this.loadLibrary();
        if (this.selectedCampaign) { this.loadProspects(); this.loadCampaignStats(); }
      },
      error: () => { this.isSavingClub = false; }
    });
  }

  // ── Biblioteca global ──────────────────────────────────────────────────
  libraryProspects: any[] = [];
  libraryTotal = 0;
  libraryPage = 0;
  librarySize = 50;
  librarySearch = '';
  libraryFilterStatus = '';
  libraryFilterProvince = '';
  librarySortBy = 'pain_score';
  librarySortDir = 'desc';
  libraryLoading = false;
  private librarySearchDebounce: any = null;
  filteredLibrary: any[] = [];

  // ── Selección masiva en biblioteca ────────────────────────────────────
  selectedLibraryIds: Set<number> = new Set();

  // ── Añadir clubes a campaña desde biblioteca ───────────────────────────
  showAddToCampaignModal = false;
  addToCampaignProspect: any = null;
  addToCampaignList: any[] = [];         // campañas disponibles para añadir
  addToCampaignSelected: number[] = [];  // campaign_ids seleccionados
  isAddingToCampaign = false;
  prospectCampaigns: any[] = [];         // campañas del club seleccionado en el detalle

  // ── Eliminación masiva desde biblioteca ───────────────────────────────
  showBulkDeleteConfirm = false;
  isBulkDeleting = false;

  // ── Importar desde biblioteca (vista campaña) ──────────────────────────
  showImportFromLibraryModal = false;
  importSearch = '';
  importResults: any[] = [];
  importTotal = 0;
  importLoading = false;
  selectedImportIds: Set<number> = new Set();
  importCurrentProspectIds: Set<number> = new Set();
  isConfirmingImport = false;
  private importSearchDebounce: any = null;

  // ── Quitar club de campaña (vista de campaña) ──────────────────────────
  showRemoveFromCampaignConfirm = false;
  prospectToRemove: any = null;

  // ── Generar email individual ───────────────────────────────────────────
  isGeneratingEmail = false;
  generateEmailCampaignId: number | null = null;
  manualInstruction = '';

  // ── Selección masiva en modo manual (vista campaña) ───────────────────
  selectedManualIds: Set<number> = new Set();

  // ── Generación masiva (modo manual) ───────────────────────────────────
  isBulkGenerating = false;
  bulkGenerateDone = 0;
  bulkGenerateTotal = 0;

  // ── Envío individual (modo manual) ────────────────────────────────────
  isSendingSingle = false;
  editSendRecipient = '';

  // ── Configuración de prompt de campaña ───────────────────────────────
  showPromptConfigModal = false;
  promptConfigCampaign: any = null;
  isLoadingPromptConfig = false;
  isSavingPromptConfig = false;
  promptConfigSaved = false;
  promptConfig = this.emptyPromptConfig();

  emptyPromptConfig() {
    return {
      sender_name: '',
      tone: '',
      target: '',
      features: '',
      objective: '',
      length: '',
      extra_context: '',
    };
  }

  openPromptConfigModal(campaign: any): void {
    this.promptConfigCampaign = campaign;
    this.promptConfig = this.emptyPromptConfig();
    this.promptConfigSaved = false;
    this.showPromptConfigModal = true;
    this.isLoadingPromptConfig = true;
    this.prospectService.getCampaignPromptConfig(campaign.campaign_id).subscribe({
      next: (cfg: any) => {
        if (cfg && Object.keys(cfg).length > 0) {
          this.promptConfig = { ...this.emptyPromptConfig(), ...cfg };
        }
        this.isLoadingPromptConfig = false;
      },
      error: () => { this.isLoadingPromptConfig = false; }
    });
  }

  savePromptConfig(): void {
    if (!this.promptConfigCampaign) return;
    this.isSavingPromptConfig = true;
    this.prospectService.updateCampaignPromptConfig(
      this.promptConfigCampaign.campaign_id, this.promptConfig
    ).subscribe({
      next: () => {
        this.isSavingPromptConfig = false;
        this.promptConfigSaved = true;
        setTimeout(() => { this.promptConfigSaved = false; }, 2500);
      },
      error: () => { this.isSavingPromptConfig = false; }
    });
  }

  setPromptChip(field: string, value: string): void {
    (this.promptConfig as any)[field] = value;
  }

  // ── Borrar campaña ────────────────────────────────────────────────────
  showDeleteCampaignConfirm = false;
  campaignToDelete: any = null;

  // Settings
  settings: Record<string, string> = {
    model_email: 'gpt-4o',
    model_analyze: 'gpt-4o',
    model_insights: 'gpt-4o',
    model_risk: 'gpt-4o-mini',
  };
  settingsLoading = false;
  savedKeys: Record<string, boolean> = {};

  readonly aiModels = [
    // ── GPT-5 (Frontier) ──────────────────────────────────────────
    { id: 'gpt-5.2',       label: 'GPT-5.2',        tier: 'frontier',  description: 'El mejor modelo de OpenAI. Ideal para análisis complejos y redacción de alta calidad.' },
    { id: 'gpt-5.2-pro',   label: 'GPT-5.2 Pro',    tier: 'frontier',  description: 'Versión aún más precisa de GPT-5.2. Máxima calidad.' },
    { id: 'gpt-5.1',       label: 'GPT-5.1',        tier: 'frontier',  description: 'GPT-5.1 con esfuerzo de razonamiento configurable.' },
    { id: 'gpt-5',         label: 'GPT-5',          tier: 'frontier',  description: 'Generación anterior de GPT-5, excelente para tareas complejas.' },
    { id: 'gpt-5-mini',    label: 'GPT-5 Mini',     tier: 'fast',      description: 'Versión rápida y económica de GPT-5 para tareas bien definidas.' },
    { id: 'gpt-5-nano',    label: 'GPT-5 Nano',     tier: 'fast',      description: 'La versión más rápida y barata de GPT-5.' },
    // ── GPT-4.1 ───────────────────────────────────────────────────
    { id: 'gpt-4.1',       label: 'GPT-4.1',        tier: 'smart',     description: 'Modelo más inteligente no-reasoning. Gran equilibrio para análisis.' },
    { id: 'gpt-4.1-mini',  label: 'GPT-4.1 Mini',  tier: 'fast',      description: 'Versión más pequeña y rápida de GPT-4.1.' },
    { id: 'gpt-4.1-nano',  label: 'GPT-4.1 Nano',  tier: 'fast',      description: 'La versión más rápida y económica de GPT-4.1.' },
    // ── GPT-4o ────────────────────────────────────────────────────
    { id: 'gpt-4o',        label: 'GPT-4o',         tier: 'balanced',  description: 'Rápido, inteligente y flexible. Opción equilibrada probada.' },
    { id: 'gpt-4o-mini',   label: 'GPT-4o Mini',   tier: 'fast',      description: 'Rápido y económico. Ideal para tareas de alto volumen.' },
    // ── Reasoning (o-series) ──────────────────────────────────────
    { id: 'o3-pro',        label: 'o3 Pro',         tier: 'reasoning', description: 'Razonamiento máximo. Más cómputo que o3 para respuestas más precisas.' },
    { id: 'o3',            label: 'o3',             tier: 'reasoning', description: 'Modelo de razonamiento para tareas muy complejas. Sucesor de o1.' },
    { id: 'o4-mini',       label: 'o4-mini',        tier: 'reasoning', description: 'Razonamiento rápido y económico. Sucesor de o3-mini.' },
    { id: 'o3-mini',       label: 'o3-mini',        tier: 'reasoning', description: 'Alternativa compacta a o3. Buena relación calidad/precio en reasoning.' },
    { id: 'o1-pro',        label: 'o1 Pro',         tier: 'reasoning', description: 'Versión pro de o1 con más cómputo. Generación anterior.' },
    { id: 'o1',            label: 'o1',             tier: 'reasoning', description: 'Modelo de razonamiento full de la serie o. Generación anterior.' },
    // ── Legacy ────────────────────────────────────────────────────
    { id: 'gpt-4-turbo',   label: 'GPT-4 Turbo',   tier: 'legacy',    description: 'Modelo GPT-4 rápido. Generación anterior.' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', tier: 'legacy',    description: 'Modelo heredado. Muy barato pero menor calidad.' },
  ];

  constructor(
    private prospectService: ProspectService,
    private location: Location,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadCampaigns();
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.stopJobPolling();
  }

  goBack(): void {
    this.location.back();
  }

  // ── Tab navigation ──

  selectTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'prospects' && this.selectedCampaign) {
      this.loadProspects();
      if (this.activeMode === 'manual') this.loadEmails();
    }
    if (tab === 'emails' && this.selectedCampaign) this.loadEmails();
    if (tab === 'library') this.loadLibrary();
  }

  // ── Biblioteca global ──────────────────────────────────────────────────

  loadLibrary(): void {
    this.libraryLoading = true;
    this.selectedLibraryIds.clear();
    this.prospectService.getProspects(
      undefined, this.libraryFilterStatus || undefined,
      undefined, this.librarySize,
      this.librarySearch || undefined, this.librarySortBy, this.librarySortDir
    ).subscribe({
      next: (data: any) => {
        this.libraryProspects = data.items || [];
        this.libraryTotal = data.total || 0;
        this.filteredLibrary = this.libraryProspects;
        this.libraryLoading = false;
      },
      error: () => { this.libraryLoading = false; }
    });
  }

  onLibrarySearchChange(): void {
    clearTimeout(this.librarySearchDebounce);
    this.librarySearchDebounce = setTimeout(() => this.loadLibrary(), 350);
  }

  librarySortBy2(col: string): void {
    if (this.librarySortBy === col) {
      this.librarySortDir = this.librarySortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.librarySortBy = col;
      this.librarySortDir = col === 'pain_score' ? 'desc' : 'asc';
    }
    this.loadLibrary();
  }

  librarySortIcon(col: string): string {
    if (this.librarySortBy !== col) return 'bi-arrow-down-up text-muted';
    return this.librarySortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  // ── Selección masiva en biblioteca ────────────────────────────────────

  toggleLibrarySelection(id: number): void {
    if (this.selectedLibraryIds.has(id)) this.selectedLibraryIds.delete(id);
    else this.selectedLibraryIds.add(id);
  }

  get allLibrarySelected(): boolean {
    return this.libraryProspects.length > 0
      && this.libraryProspects.every(p => this.selectedLibraryIds.has(p.prospect_id));
  }

  toggleAllLibrary(): void {
    if (this.allLibrarySelected) {
      this.libraryProspects.forEach(p => this.selectedLibraryIds.delete(p.prospect_id));
    } else {
      this.libraryProspects.forEach(p => this.selectedLibraryIds.add(p.prospect_id));
    }
  }

  openBulkAddToCampaign(): void {
    this.addToCampaignProspect = null;
    this.addToCampaignSelected = [];
    this.addToCampaignList = this.visibleCampaigns;
    this.showAddToCampaignModal = true;
  }

  bulkDelete(): void {
    if (!this.selectedLibraryIds.size) return;
    this.isBulkDeleting = true;
    this.prospectService.bulkDeleteProspects([...this.selectedLibraryIds]).subscribe({
      next: () => {
        this.isBulkDeleting = false;
        this.showBulkDeleteConfirm = false;
        this.selectedLibraryIds.clear();
        this.loadLibrary();
        this.loadCampaigns();
      },
      error: () => { this.isBulkDeleting = false; }
    });
  }

  // ── Añadir club de biblioteca a campaña ───────────────────────────────

  openAddToCampaign(prospect: any): void {
    this.addToCampaignProspect = prospect;
    this.addToCampaignSelected = [];
    this.addToCampaignList = this.visibleCampaigns;
    this.showAddToCampaignModal = true;
  }

  toggleCampaignSelection(campaignId: number): void {
    const idx = this.addToCampaignSelected.indexOf(campaignId);
    if (idx >= 0) this.addToCampaignSelected.splice(idx, 1);
    else this.addToCampaignSelected.push(campaignId);
  }

  confirmAddToCampaign(): void {
    const ids = this.addToCampaignProspect
      ? [this.addToCampaignProspect.prospect_id]
      : [...this.selectedLibraryIds];
    if (!ids.length || !this.addToCampaignSelected.length) return;
    this.isAddingToCampaign = true;
    const calls = this.addToCampaignSelected.map(cid =>
      this.prospectService.addClubsToCampaign(cid, ids)
    );
    forkJoin(calls).subscribe({
      next: () => {
        this.isAddingToCampaign = false;
        this.showAddToCampaignModal = false;
        if (!this.addToCampaignProspect) this.selectedLibraryIds.clear();
        this.addToCampaignProspect = null;
        this.loadCampaigns();
        if (this.selectedCampaign && this.addToCampaignSelected.includes(this.selectedCampaign.campaign_id)) {
          this.loadProspects();
          this.loadCampaignStats();
        }
      },
      error: () => { this.isAddingToCampaign = false; }
    });
  }

  // ── Importar desde biblioteca (vista campaña) ──────────────────────────

  openImportFromLibrary(): void {
    if (!this.selectedCampaign) return;
    this.selectedImportIds.clear();
    this.importSearch = '';
    this.importCurrentProspectIds = new Set(this.prospects.map((p: any) => p.prospect_id));
    this.showImportFromLibraryModal = true;
    this.loadImportResults();
  }

  loadImportResults(): void {
    this.importLoading = true;
    this.prospectService.getProspects(
      undefined, undefined, undefined, 100,
      this.importSearch || undefined, 'pain_score', 'desc'
    ).subscribe({
      next: (data: any) => {
        this.importResults = data.items || [];
        this.importTotal = data.total || 0;
        this.importLoading = false;
      },
      error: () => { this.importLoading = false; }
    });
  }

  onImportSearchChange(): void {
    clearTimeout(this.importSearchDebounce);
    this.selectedImportIds.clear();
    this.importSearchDebounce = setTimeout(() => this.loadImportResults(), 350);
  }

  toggleImportSelection(id: number): void {
    if (this.importCurrentProspectIds.has(id)) return;
    if (this.selectedImportIds.has(id)) this.selectedImportIds.delete(id);
    else this.selectedImportIds.add(id);
  }

  get allImportSelected(): boolean {
    const selectable = this.importResults.filter(p => !this.importCurrentProspectIds.has(p.prospect_id));
    return selectable.length > 0 && selectable.every(p => this.selectedImportIds.has(p.prospect_id));
  }

  toggleAllImport(): void {
    const selectable = this.importResults.filter(p => !this.importCurrentProspectIds.has(p.prospect_id));
    if (this.allImportSelected) {
      selectable.forEach(p => this.selectedImportIds.delete(p.prospect_id));
    } else {
      selectable.forEach(p => this.selectedImportIds.add(p.prospect_id));
    }
  }

  confirmImport(): void {
    if (!this.selectedCampaign || !this.selectedImportIds.size) return;
    this.isConfirmingImport = true;
    this.prospectService.addClubsToCampaign(
      this.selectedCampaign.campaign_id, [...this.selectedImportIds]
    ).subscribe({
      next: () => {
        this.isConfirmingImport = false;
        this.showImportFromLibraryModal = false;
        this.loadProspects();
        this.loadCampaignStats();
        this.loadCampaigns();
      },
      error: () => { this.isConfirmingImport = false; }
    });
  }

  // ── Asignar grupo A/B (vista de campaña) ──────────────────────────────

  setAbGroup(prospect: any, group: 'A' | 'B' | null): void {
    if (!this.selectedCampaign) return;
    const prev = prospect.ab_group;
    prospect.ab_group = group;  // optimistic update
    this.prospectService.setClubAbGroup(
      this.selectedCampaign.campaign_id, prospect.prospect_id, group
    ).subscribe({
      error: () => { prospect.ab_group = prev; }  // rollback on error
    });
  }

  // ── Quitar club de campaña (vista de campaña) ──────────────────────────

  confirmRemoveFromCampaign(p: any): void {
    this.prospectToRemove = p;
    this.showRemoveFromCampaignConfirm = true;
  }

  removeFromCampaign(): void {
    if (!this.prospectToRemove || !this.selectedCampaign) return;
    this.prospectService.removeClubFromCampaign(
      this.selectedCampaign.campaign_id, this.prospectToRemove.prospect_id
    ).subscribe({
      next: () => {
        this.showRemoveFromCampaignConfirm = false;
        this.prospectToRemove = null;
        this.loadProspects();
        this.loadCampaignStats();
      }
    });
  }

  // ── Generar email individual ───────────────────────────────────────────

  generateEmailForProspect(prospect: any, instruction?: string): void {
    if (!this.selectedCampaign || this.isGeneratingEmail) return;
    this.isGeneratingEmail = true;
    this.generateEmailCampaignId = this.selectedCampaign.campaign_id;
    this.prospectService.generateEmailForProspect(
      prospect.prospect_id, this.selectedCampaign.campaign_id, instruction
    ).subscribe({
      next: (res: any) => {
        this.isGeneratingEmail = false;
        this.generateEmailCampaignId = null;
        this.loadCampaignStats();
        this.loadProspects();
        if (this.showProspectModal) {
          this.selectedProspect = { ...this.selectedProspect, status: 'EMAIL_READY' };
        }
        // Actualizar el array local de emails con el recién generado para que
        // la tabla muestre el estado correcto y la preview use el email_id correcto.
        if (res?.email_id) {
          const generatedEmail = {
            email_id: res.email_id,
            subject: res.subject,
            body_html: res.body_html || '',
            club_name: prospect.name,
            club_email: prospect.email || res.club_email || '',
            prospect_id: prospect.prospect_id,
            status: 'DRAFT',
            ab_variant: prospect.ab_group || 'B',
          };
          // Reemplazar o insertar en el array local para que emailsByProspectId quede actualizado
          const idx = this.emails.findIndex(e => e.prospect_id === prospect.prospect_id);
          if (idx >= 0) {
            this.emails[idx] = generatedEmail;
          } else {
            this.emails = [...this.emails, generatedEmail];
          }
          this.showProspectModal = false;
          this.manualInstruction = '';
          this.openEditEmail(generatedEmail);
        }
        this.loadEmails();
      },
      error: (err: any) => {
        this.isGeneratingEmail = false;
        this.generateEmailCampaignId = null;
        alert(err?.error?.detail || 'Error generando el email');
      }
    });
  }

  sendFromEdit(): void {
    if (!this.editingEmail || !this.editSendRecipient.trim() || this.isSendingSingle) return;
    this.isSendingSingle = true;
    this.prospectService.sendSingleEmail(this.editingEmail.email_id, this.editSendRecipient).subscribe({
      next: () => {
        this.isSendingSingle = false;
        this.editingEmail = { ...this.editingEmail, status: 'SENT' };
        this.loadEmails();
        this.loadCampaignStats();
        this.loadProspects();
      },
      error: (err: any) => {
        this.isSendingSingle = false;
        alert(err?.error?.detail || 'Error al enviar el email');
      }
    });
  }

  // ── Emails por prospect (modo manual) ────────────────────────────────

  get emailsByProspectId(): Record<number, any> {
    const map: Record<number, any> = {};
    this.emails.forEach(e => { map[e.prospect_id] = e; });
    return map;
  }

  // ── Selección masiva modo manual ──────────────────────────────────────

  get allManualSelected(): boolean {
    return this.prospects.length > 0
      && this.prospects.every(p => this.selectedManualIds.has(p.prospect_id));
  }

  toggleManualSelection(id: number): void {
    if (this.selectedManualIds.has(id)) this.selectedManualIds.delete(id);
    else this.selectedManualIds.add(id);
  }

  toggleAllManual(): void {
    if (this.allManualSelected) {
      this.prospects.forEach(p => this.selectedManualIds.delete(p.prospect_id));
    } else {
      this.prospects.forEach(p => this.selectedManualIds.add(p.prospect_id));
    }
  }

  // ── Generación masiva modo manual ─────────────────────────────────────

  generateSelected(): void {
    const targets = this.prospects.filter(p => this.selectedManualIds.has(p.prospect_id));
    if (!targets.length) return;
    this.generateBulkQueue(targets);
  }

  generateAllPending(): void {
    const targets = this.prospects.filter(p => !this.emailsByProspectId[p.prospect_id]);
    if (!targets.length) return;
    this.generateBulkQueue(targets);
  }

  private generateBulkQueue(targets: any[]): void {
    this.isBulkGenerating = true;
    this.bulkGenerateTotal = targets.length;
    this.bulkGenerateDone = 0;
    this.selectedManualIds.clear();

    const next = (i: number) => {
      if (i >= targets.length) {
        this.isBulkGenerating = false;
        this.loadProspects();
        this.loadEmails();
        this.loadCampaignStats();
        return;
      }
      const p = targets[i];
      this.prospectService.generateEmailForProspect(p.prospect_id, this.campaignId).subscribe({
        next: () => { this.bulkGenerateDone++; next(i + 1); },
        error: () => { this.bulkGenerateDone++; next(i + 1); },
      });
    };
    next(0);
  }

  // ── Borrar / Archivar campaña ────────────────────────────────────────

  confirmDeleteCampaign(c: any): void {
    this.campaignToDelete = c;
    this.showDeleteCampaignConfirm = true;
  }

  deleteCampaign(): void {
    if (!this.campaignToDelete) return;
    this.prospectService.deleteCampaign(this.campaignToDelete.campaign_id).subscribe({
      next: () => {
        this.showDeleteCampaignConfirm = false;
        if (this.selectedCampaign?.campaign_id === this.campaignToDelete.campaign_id) {
          this.selectedCampaign = null;
          this.activeTab = 'campaigns';
        }
        this.campaignToDelete = null;
        this.loadCampaigns();
      },
      error: (err: any) => {
        this.showDeleteCampaignConfirm = false;
        alert(err?.error?.detail || 'Error al borrar la campaña');
      }
    });
  }

  archiveCampaign(): void {
    if (!this.campaignToDelete) return;
    this.prospectService.archiveCampaign(this.campaignToDelete.campaign_id).subscribe({
      next: () => {
        this.showDeleteCampaignConfirm = false;
        if (this.selectedCampaign?.campaign_id === this.campaignToDelete.campaign_id) {
          this.selectedCampaign = null;
          this.activeTab = 'campaigns';
        }
        this.campaignToDelete = null;
        this.loadCampaigns();
      }
    });
  }

  // ── Settings ──

  loadSettings(): void {
    this.settingsLoading = true;
    this.prospectService.getSettings().subscribe({
      next: (data) => { this.settings = { ...this.settings, ...data }; this.settingsLoading = false; },
      error: () => { this.settingsLoading = false; }
    });
  }

  saveSetting(key: string, value: string): void {
    this.prospectService.updateSetting(key, value).subscribe({
      next: () => {
        this.savedKeys[key] = true;
        setTimeout(() => { this.savedKeys[key] = false; }, 2000);
      }
    });
  }

  // ── Campaigns ──
  showArchivedCampaigns = false;
  get visibleCampaigns(): any[] {
    return this.showArchivedCampaigns
      ? this.campaigns
      : this.campaigns.filter(c => c.status !== 'ARCHIVED');
  }
  get hasArchivedCampaigns(): boolean {
    return this.campaigns.some(c => c.status === 'ARCHIVED');
  }

  loadCampaigns(): void {
    this.isLoading = true;
    this.prospectService.getCampaigns().subscribe({
      next: (data) => { this.campaigns = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  selectMode(mode: 'auto' | 'manual'): void {
    this.activeMode = mode;
    if (mode === 'manual') {
      if (this.activeTab === 'pipeline') {
        this.selectTab(this.selectedCampaign ? 'prospects' : 'campaigns');
      } else if (this.activeTab === 'prospects' && this.selectedCampaign) {
        // Ya en prospects: cargar emails para tener datos en la vista unificada
        this.loadEmails();
      }
    }
  }

  selectCampaign(c: any): void {
    this.selectedCampaign = c;
    this.stepResults = { discover: null, enrich: null, analyze: null, generate: null };
    this.loadCampaignStats();
    // En modo manual se va directamente a Clubes; en automático al Pipeline
    this.activeTab = this.activeMode === 'manual' ? 'prospects' : 'pipeline';
    if (this.activeMode === 'manual') this.loadProspects();
  }

  loadCampaignStats(): void {
    if (!this.selectedCampaign) return;
    this.prospectService.getCampaignStats(this.selectedCampaign.campaign_id).subscribe({
      next: (data) => { this.campaignStats = data; }
    });
  }

  openNewCampaignModal(): void {
    this.newCampaignName = '';
    this.newCampaignDesc = '';
    this.showNewCampaignModal = true;
  }

  createCampaign(): void {
    if (!this.newCampaignName.trim()) return;
    this.prospectService.createCampaign(this.newCampaignName, this.newCampaignDesc).subscribe({
      next: () => {
        this.showNewCampaignModal = false;
        this.loadCampaigns();
      }
    });
  }

  // ── Campaign status (computed from real data) ──

  campaignStatusLabel(c: any): string {
    if (!c.total_prospects) return 'Sin iniciar';
    const emails = (c.group_a_count || 0) + (c.group_b_count || 0);
    if (emails > 0) return 'Emails listos';
    if (c.total_prospects > 0) return 'En progreso';
    return 'Borrador';
  }

  campaignStatusClass(c: any): string {
    const label = this.campaignStatusLabel(c);
    if (label === 'Sin iniciar') return 'badge-status-draft';
    if (label === 'Emails listos') return 'badge-status-ready';
    return 'badge-status-progress';
  }

  // ── Pipeline ──

  get campaignId(): number {
    return this.selectedCampaign?.campaign_id;
  }

  // Computed pipeline state from real stats
  get pipelineStepStates(): { [key: string]: 'done' | 'partial' | 'pending' | 'running' } {
    const s = this.campaignStats;
    if (!s) return { discover: 'pending', enrich: 'pending', analyze: 'pending', generate: 'pending' };

    const total = s.total || 0;
    const enrichedOrMore = (s.status_enriched || 0) + (s.status_analyzed || 0) + (s.status_email_ready || 0) + (s.status_sent || 0);
    const analyzedOrMore = (s.status_analyzed || 0) + (s.status_email_ready || 0) + (s.status_sent || 0);
    const generated = (s.status_email_ready || 0) + (s.status_sent || 0);

    const runningStep = this.currentJob?.status === 'RUNNING' ? this.currentJob?.step : null;

    return {
      discover: runningStep === 'discover' ? 'running' : (total > 0 ? 'done' : 'pending'),
      enrich: runningStep === 'enrich' ? 'running'
        : enrichedOrMore > 0 ? (s.status_new > 0 ? 'partial' : 'done') : (total > 0 ? 'pending' : 'pending'),
      analyze: runningStep === 'analyze' ? 'running'
        : analyzedOrMore > 0 ? (enrichedOrMore - analyzedOrMore > 0 ? 'partial' : 'done') : (enrichedOrMore > 0 ? 'pending' : 'pending'),
      generate: runningStep === 'generate' ? 'running'
        : generated > 0 ? (analyzedOrMore - generated > 0 ? 'partial' : 'done') : (analyzedOrMore > 0 ? 'pending' : 'pending'),
    };
  }

  stepPendingCount(step: string): number {
    const s = this.campaignStats;
    if (!s) return 0;
    if (step === 'discover') return 0;
    if (step === 'enrich') return s.status_new || 0;
    if (step === 'analyze') return (s.status_enriched || 0);
    if (step === 'generate') return (s.status_analyzed || 0);
    return 0;
  }

  stepDoneCount(step: string): number {
    const s = this.campaignStats;
    if (!s) return 0;
    if (step === 'discover') return s.total || 0;
    if (step === 'enrich') return (s.status_enriched || 0) + (s.status_analyzed || 0) + (s.status_email_ready || 0) + (s.status_sent || 0);
    if (step === 'analyze') return (s.status_analyzed || 0) + (s.status_email_ready || 0) + (s.status_sent || 0);
    if (step === 'generate') return (s.status_email_ready || 0) + (s.status_sent || 0);
    return 0;
  }

  canRunStep(step: string): boolean {
    const s = this.campaignStats;
    if (!s) return step === 'discover';
    if (step === 'discover') return true;
    if (step === 'enrich') return (s.total || 0) > 0;
    if (step === 'analyze') return ((s.status_enriched || 0) + (s.status_analyzed || 0) + (s.status_email_ready || 0)) > 0;
    if (step === 'generate') return ((s.status_analyzed || 0) + (s.status_email_ready || 0)) > 0;
    return false;
  }

  runDiscover(): void {
    const provinces = this.pipelineProvinces.trim()
      ? this.pipelineProvinces.split(',').map(p => p.trim())
      : undefined;
    this.prospectService.discover(this.campaignId, provinces).subscribe({
      next: (res) => { this.startJobPolling(res.job_id, 'discover'); }
    });
  }

  runEnrich(): void {
    this.prospectService.enrich(this.campaignId, this.pipelineMaxEnrich).subscribe({
      next: (res) => { this.startJobPolling(res.job_id, 'enrich'); }
    });
  }

  runAnalyze(): void {
    this.prospectService.analyze(this.campaignId, this.pipelineMaxEnrich).subscribe({
      next: (res) => { this.startJobPolling(res.job_id, 'analyze'); }
    });
  }

  runGenerate(): void {
    this.prospectService.generate(this.campaignId, this.pipelineAbRatio).subscribe({
      next: (res) => {
        this.stepResults['generate'] = { status: 'COMPLETED', processed: res.generated };
        this.loadCampaignStats();
      },
      error: (err) => {
        this.stepResults['generate'] = { status: 'FAILED', error_msg: err.error?.detail || 'Error al generar emails' };
      }
    });
  }

  startJobPolling(jobId: string, step: string): void {
    this.currentJob = { job_id: jobId, status: 'RUNNING', progress: 0, step };
    this.stopJobPolling();
    this.jobPollingInterval = setInterval(() => {
      this.prospectService.getJob(jobId).subscribe({
        next: (job) => {
          this.currentJob = { ...job, step };
          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            this.stopJobPolling();
            this.stepResults[step] = job;
            this.loadCampaignStats();
            if (job.status === 'COMPLETED') {
              if (this.activeTab === 'prospects') this.loadProspects();
              if (this.activeTab === 'emails') this.loadEmails();
              this.offerNextStep(step, job);
            }
          }
        }
      });
    }, 2500);
  }

  offerNextStep(completedStep: string, job: any): void {
    const nextMap: any = {
      discover: { step: 'enrich', label: 'Enriquecer datos', msg: `${job.processed || 0} clubes encontrados. ¿Quieres enriquecer sus datos (webs y RRSS) ahora?` },
      enrich: { step: 'analyze', label: 'Analizar con IA', msg: `${job.processed || 0} clubes enriquecidos. ¿Quieres analizarlos con IA para detectar pain points?` },
      analyze: { step: 'generate', label: 'Generar emails', msg: `${job.processed || 0} clubes analizados. ¿Quieres generar los emails A/B personalizados ahora?` },
    };
    const next = nextMap[completedStep];
    if (next && this.canRunStep(next.step)) {
      this.continueStep = next.step;
      this.continueStepLabel = next.label;
      this.continueMessage = next.msg;
      this.showContinueModal = true;
    }
  }

  confirmContinue(): void {
    this.showContinueModal = false;
    if (this.continueStep === 'enrich') this.runEnrich();
    else if (this.continueStep === 'analyze') this.runAnalyze();
    else if (this.continueStep === 'generate') this.runGenerate();
  }

  stopJobPolling(): void {
    if (this.jobPollingInterval) {
      clearInterval(this.jobPollingInterval);
      this.jobPollingInterval = null;
    }
  }

  get isJobRunning(): boolean {
    return this.currentJob?.status === 'RUNNING';
  }

  // ── Prospects ──

  loadProspects(): void {
    this.isLoading = true;
    const status = this.prospectFilterStatus || undefined;
    const search = this.prospectSearch.trim() || undefined;
    this.prospectService.getProspects(
      this.campaignId, status, this.prospectsPage, this.prospectsSize,
      search, this.prospectSortBy, this.prospectSortDir
    ).subscribe({
      next: (data) => {
        this.prospects = data.items || [];
        this.prospectsTotal = data.total || 0;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  filterProspects(): void {
    this.prospectsPage = 0;
    this.loadProspects();
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.prospectsPage = 0;
      this.loadProspects();
    }, 400);
  }

  sortBy(col: string): void {
    if (this.prospectSortBy === col) {
      this.prospectSortDir = this.prospectSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.prospectSortBy = col;
      this.prospectSortDir = col === 'pain_score' ? 'desc' : 'asc';
    }
    this.prospectsPage = 0;
    this.loadProspects();
  }

  sortIcon(col: string): string {
    if (this.prospectSortBy !== col) return 'bi-arrow-down-up text-muted opacity-50';
    return this.prospectSortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  confirmDeleteProspect(p: any): void {
    this.prospectToDelete = p;
    this.showDeleteProspectConfirm = true;
  }

  deleteProspect(): void {
    if (!this.prospectToDelete) return;
    this.prospectService.deleteProspect(this.prospectToDelete.prospect_id).subscribe({
      next: () => {
        this.showDeleteProspectConfirm = false;
        this.prospectToDelete = null;
        this.loadProspects();
        this.loadCampaignStats();
      }
    });
  }

  nextPage(): void {
    if ((this.prospectsPage + 1) * this.prospectsSize < this.prospectsTotal) {
      this.prospectsPage++;
      this.loadProspects();
    }
  }

  prevPage(): void {
    if (this.prospectsPage > 0) {
      this.prospectsPage--;
      this.loadProspects();
    }
  }

  openProspectDetail(p: any): void {
    this.selectedProspect = p;
    this.showProspectModal = true;
  }

  get filteredProspects(): any[] {
    return this.prospects;
  }

  digitalizationLevel(p: any): { label: string; cssClass: string } {
    let score = 0;
    if (p.website) score++;
    if (p.instagram) score++;
    if (p.twitter) score++;
    if (p.facebook) score++;
    if (score >= 3) return { label: 'Alta', cssClass: 'digit-alta' };
    if (score >= 1) return { label: 'Media', cssClass: 'digit-media' };
    return { label: 'Baja', cssClass: 'digit-baja' };
  }

  // ── Delete email ──

  deleteEmail(e: any): void {
    if (!confirm(`¿Borrar el email para ${e.club_name}? Esta acción no se puede deshacer.`)) return;
    this.prospectService.deleteEmail(e.email_id).subscribe({
      next: () => {
        this.emails = this.emails.filter(em => em.email_id !== e.email_id);
        this.loadCampaignStats();
      }
    });
  }

  // ── Emails ──

  loadEmails(): void {
    this.isLoading = true;
    const variant = this.emailFilterVariant || undefined;
    this.prospectService.getEmails(this.campaignId, variant).subscribe({
      next: (data) => { this.emails = data || []; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  openEmailPreview(e: any): void {
    const url = this.prospectService.getEmailPreviewUrl(e.email_id);
    this.previewEmailUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.previewEmailSubject = e.subject;
    this.showEmailPreviewModal = true;
  }

  openEditEmail(e: any): void {
    this.editingEmail = e;
    this.editEmailSubject = e.subject;
    this.editEmailBody = e.body_html || '';
    this.editSendRecipient = e.club_email || '';
    this.showEditEmailModal = true;
  }

  saveEmail(): void {
    if (!this.editingEmail) return;
    this.isSavingEmail = true;
    this.prospectService.updateEmail(this.editingEmail.email_id, this.editEmailSubject, this.editEmailBody).subscribe({
      next: () => {
        this.isSavingEmail = false;
        // Update local email
        const idx = this.emails.findIndex(e => e.email_id === this.editingEmail.email_id);
        if (idx >= 0) {
          this.emails[idx].subject = this.editEmailSubject;
          this.emails[idx].body_html = this.editEmailBody;
        }
        this.showEditEmailModal = false;
      },
      error: () => { this.isSavingEmail = false; }
    });
  }

  regenerateEmail(): void {
    if (!this.editingEmail) return;
    this.isRegenerating = true;
    this.prospectService.regenerateEmail(this.editingEmail.email_id).subscribe({
      next: (res) => {
        this.editEmailSubject = res.subject;
        this.editEmailBody = res.body_html;
        this.isRegenerating = false;
      },
      error: () => { this.isRegenerating = false; }
    });
  }

  filterEmails(): void {
    this.loadEmails();
  }

  openSendConfirm(): void {
    this.sendResult = null;
    this.showSendConfirmModal = true;
  }

  dryRun(): void {
    this.prospectService.sendEmails(this.campaignId, true).subscribe({
      next: (res) => { this.sendResult = res; }
    });
  }

  confirmSend(): void {
    this.prospectService.sendEmails(this.campaignId, false).subscribe({
      next: (res) => {
        this.sendResult = res;
        this.loadEmails();
        this.loadCampaignStats();
      }
    });
  }

  // ── Helpers ──

  painScoreColor(score: number): string {
    if (score >= 8) return '#dc3545';
    if (score >= 6) return '#fd7e14';
    if (score >= 4) return '#ffc107';
    return '#6c757d';
  }

  statusLabel(status: string): string {
    const map: any = {
      'NEW': 'Nuevo', 'ENRICHED': 'Enriquecido', 'ANALYZED': 'Analizado',
      'EMAIL_READY': 'Email listo', 'EMAIL_SENT': 'Enviado',
      'DRAFT': 'Borrador', 'RUNNING': 'En progreso', 'COMPLETED': 'Completado', 'FAILED': 'Error',
    };
    return map[status] || status;
  }

  statusBadgeClass(status: string): string {
    const map: any = {
      'NEW': 'badge-st-new', 'ENRICHED': 'badge-st-enriched', 'ANALYZED': 'badge-st-analyzed',
      'EMAIL_READY': 'badge-st-ready', 'EMAIL_SENT': 'badge-st-sent',
      'DRAFT': 'bg-secondary', 'RUNNING': 'badge-st-running', 'COMPLETED': 'badge-st-sent', 'FAILED': 'bg-danger',
    };
    return map[status] || 'bg-secondary';
  }

  get totalPages(): number {
    return Math.ceil(this.prospectsTotal / this.prospectsSize);
  }
}
