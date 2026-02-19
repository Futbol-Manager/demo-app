import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';

@Component({
  selector: 'app-admin-prospector',
  templateUrl: './admin-prospector.component.html',
  styleUrls: ['./admin-prospector.component.scss']
})
export class AdminProspectorComponent implements OnInit, OnDestroy {

  activeTab = 'campaigns';
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
  selectedProspect: any = null;
  showProspectModal = false;

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

  constructor(
    private prospectService: ProspectService,
    private location: Location,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadCampaigns();
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
    if (tab === 'prospects' && this.selectedCampaign) this.loadProspects();
    if (tab === 'emails' && this.selectedCampaign) this.loadEmails();
  }

  // ── Campaigns ──

  loadCampaigns(): void {
    this.isLoading = true;
    this.prospectService.getCampaigns().subscribe({
      next: (data) => { this.campaigns = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  selectCampaign(c: any): void {
    this.selectedCampaign = c;
    this.stepResults = { discover: null, enrich: null, analyze: null, generate: null };
    this.loadCampaignStats();
    this.activeTab = 'pipeline';
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
    this.prospectService.getProspects(this.campaignId, status, this.prospectsPage, this.prospectsSize).subscribe({
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
    if (!this.prospectSearch.trim()) return this.prospects;
    const s = this.prospectSearch.toLowerCase();
    return this.prospects.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.city || '').toLowerCase().includes(s) ||
      (p.email || '').toLowerCase().includes(s)
    );
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
