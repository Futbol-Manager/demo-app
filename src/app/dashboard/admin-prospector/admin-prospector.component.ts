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
  crmTab: 'info' | 'edit' = 'info';
  crmEdit: any = {};
  isSavingCrm = false;
  crmSaveOk = false;
  showDeleteProspectConfirm = false;
  prospectToDelete: any = null;

  // Conversión a cliente
  showConvertModal = false;
  convertNote = '';
  isConverting = false;

  // Import CSV/Excel
  showImportModal = false;
  importFile: File | null = null;
  importFilename = '';
  importFileB64 = '';
  importPreviewCols: string[] = [];
  importMapping: Record<string, string | null> = {};
  importSample: Record<string, string>[] = [];
  importTotalRows = 0;
  importStep: 'upload' | 'map' | 'done' = 'upload';
  importResult: { inserted: number; duplicates: number; errors: string[]; total_processed: number } | null = null;
  csvImportLoading = false;
  importSkipDuplicates = true;

  readonly CRM_FIELDS: { key: string; label: string; type: string }[] = [
    { key: 'name',             label: 'Nombre del club',  type: 'text' },
    { key: 'city',             label: 'Ciudad',           type: 'text' },
    { key: 'province',         label: 'Provincia',        type: 'text' },
    { key: 'community',        label: 'Comunidad',        type: 'text' },
    { key: 'country',          label: 'País',             type: 'text' },
    { key: 'email',            label: 'Email',            type: 'email' },
    { key: 'phone',            label: 'Teléfono',         type: 'text' },
    { key: 'website',          label: 'Web',              type: 'url' },
    { key: 'instagram',        label: 'Instagram',        type: 'url' },
    { key: 'twitter',          label: 'Twitter / X',      type: 'url' },
    { key: 'facebook',         label: 'Facebook',         type: 'url' },
    { key: 'estimated_teams',  label: 'Nº equipos',       type: 'number' },
  ];

  readonly IMPORT_FIELD_OPTIONS: { value: string; label: string }[] = [
    { value: '',                label: '— Ignorar —' },
    { value: 'name',            label: 'Nombre' },
    { value: 'email',           label: 'Email' },
    { value: 'phone',           label: 'Teléfono' },
    { value: 'website',         label: 'Web' },
    { value: 'city',            label: 'Ciudad' },
    { value: 'province',        label: 'Provincia' },
    { value: 'community',       label: 'Comunidad' },
    { value: 'country',         label: 'País' },
    { value: 'instagram',       label: 'Instagram' },
    { value: 'twitter',         label: 'Twitter/X' },
    { value: 'facebook',        label: 'Facebook' },
    { value: 'estimated_teams', label: 'Nº equipos' },
    { value: 'has_youth_academy', label: 'Cantera (1/0)' },
    { value: 'category',        label: 'Categoría' },
    { value: 'notes',           label: 'Notas CRM' },
  ];

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

  // ── Follow-up config ──────────────────────────────────────────────────────
  showFollowupConfigModal = false;
  followupConfig = { enabled: false, delay_days_1: 4, delay_days_2: 8, max_followups: 1 };
  followupStats: any = null;
  isSavingFollowup = false;
  followupConfigSaved = false;

  // ── RRSS: Social posts ────────────────────────────────────────────────────
  socialPosts: any[] = [];
  socialLoading = false;
  socialNetworkFilter = '';
  socialStatusFilter = '';
  socialNetworks = ['instagram', 'linkedin', 'twitter', 'facebook'];
  socialContentTypes: string[] = [
    'caso_exito', 'tip_gestion', 'pain_point', 'feature',
    'pregunta', 'estadistica', 'cultura_club', 'comparacion',
  ];
  socialNetworkIcons: Record<string, string> = {
    instagram: 'bi-instagram',
    linkedin: 'bi-linkedin',
    twitter: 'bi-twitter-x',
    facebook: 'bi-facebook',
  };
  socialNetworkLabels: Record<string, string> = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    twitter: 'X / Twitter',
    facebook: 'Facebook',
  };
  socialContentTypeLabels: Record<string, string> = {
    caso_exito: 'Caso de éxito',
    tip_gestion: 'Consejo de gestión',
    pain_point: 'Pain point del sector',
    feature: 'Funcionalidad de Sphaira',
    pregunta: 'Pregunta de engagement',
    estadistica: 'Estadística impactante',
    cultura_club: 'Cultura de club',
    comparacion: 'Antes vs Después',
  };

  // Generador
  showSocialGeneratorModal = false;
  socialGenNetwork = 'instagram';
  socialGenContentType = 'tip_gestion';
  socialGenExtraContext = '';
  socialGenTone = 'cercano';
  socialGenObjective = 'demo_traffic';
  socialGenAudience = 'todos';
  socialGenFeature = 'ninguna';
  isGeneratingSocial = false;
  isOptimizingPrompt = false;

  readonly socialGenTones = [
    { value: 'cercano',    label: 'Cercano' },
    { value: 'formal',     label: 'Formal' },
    { value: 'inspirador', label: 'Inspirador' },
    { value: 'urgente',    label: 'Urgente' },
    { value: 'humor',      label: 'Con humor' },
  ];
  readonly socialGenObjectives = [
    { value: 'demo_traffic', label: 'Llevar a la demo' },
    { value: 'engagement',   label: 'Engagement / debate' },
    { value: 'awareness',    label: 'Dar a conocer Sphaira' },
    { value: 'captacion',    label: 'Captar leads' },
  ];
  readonly socialGenAudiences = [
    { value: 'todos',          label: 'Toda la comunidad' },
    { value: 'presidentes',    label: 'Presidentes / directivos' },
    { value: 'entrenadores',   label: 'Entrenadores' },
    { value: 'padres_familias',label: 'Padres y familias' },
    { value: 'directivos',     label: 'Coordinadores deportivos' },
  ];
  readonly socialGenFeatures = [
    { value: 'ninguna',        label: 'Sin funcionalidad específica' },
    { value: 'equipos',        label: 'Gestión de equipos y asistencias' },
    { value: 'cuotas',         label: 'Cobro automatizado de cuotas' },
    { value: 'comunicacion',   label: 'Comunicación centralizada' },
    { value: 'estadisticas',   label: 'Estadísticas de rendimiento' },
    { value: 'entrenamientos', label: 'Planificación de entrenamientos con IA' },
    { value: 'lesiones',       label: 'Gestión de lesiones (RTP)' },
    { value: 'scouting',       label: 'Scouting y cantera' },
    { value: 'presencia',      label: 'Presencia digital del club' },
  ];

  // ── Historial de posts publicados ─────────────────────────────────────────
  socialHistory: any[] = [];
  showHistoryPanel = false;
  isLoadingHistory = false;

  // ── Plan automático de contenido ──────────────────────────────────────────
  showAutoPlanModal = false;
  contentPlan: any[] = [];
  isGeneratingPlan = false;
  autoPlanNumPosts = 7;
  autoPlanGeneratingIdx: number | null = null;

  readonly networkColors: Record<string, string> = {
    instagram: '#E1306C',
    facebook:  '#1877F2',
    linkedin:  '#0A66C2',
    twitter:   '#000000',
  };

  // Editor de post
  showSocialEditModal = false;
  editingSocialPost: any = null;
  editSocialText = '';
  editSocialImagePrompt = '';
  editSocialHashtags = '';
  isSavingSocialPost = false;
  isPublishingSocialPost = false;
  publishResult: any = null;
  // Preview de imagen
  previewImageUrl: string | null = null;
  isGeneratingImage = false;
  imageGenError: string | null = null;
  // Modelo de imagen seleccionado para generación
  imageModels: {key: string, label: string}[] = [];
  selectedImageModel = 'dalle3';
  imageModelUsed = '';
  isGeneratingImagePrompt = false;

  // ── Guía de prompt por chips ──────────────────────────────────────────────
  showPromptGuide = false;
  activePromptChips: Set<string> = new Set();

  promptChips: Record<string, { key: string; label: string; text: string }[]> = {
    tipo: [
      { key: 'infografia',  label: '📊 Infografía',          text: 'infografía con diseño gráfico flat' },
      { key: 'foto',        label: '📸 Fotografía',           text: 'fotografía profesional cinematic' },
      { key: 'mockup',      label: '📱 Mockup app',           text: 'mockup de pantalla de app en smartphone' },
      { key: 'abstracto',   label: '✨ Abstracto / 3D',       text: 'diseño abstracto 3D moderno' },
      { key: 'ilustracion', label: '🎨 Ilustración vectorial', text: 'ilustración vectorial flat design' },
    ],
    composicion: [
      { key: 'dos-col',   label: '⬜⬜ Dos columnas',        text: 'dividida en dos columnas simétricas' },
      { key: 'vertical',  label: '↕ Layout vertical',        text: 'composición vertical de arriba abajo' },
      { key: 'centrado',  label: '◎ Elemento central',       text: 'elemento principal centrado con fondo' },
      { key: 'comparativa', label: '⚖ Comparativa lado a lado', text: 'comparativa lado izquierdo vs lado derecho' },
      { key: 'lista',     label: '≡ Lista con iconos',        text: 'lista vertical con iconos a la izquierda' },
    ],
    contenido: [
      { key: 'pros-contras',  label: '✅❌ Pros y contras',      text: 'lado malo (sin Sphaira) vs lado bueno (con Sphaira)' },
      { key: 'beneficios',    label: '🏆 Beneficios / ventajas', text: 'lista de beneficios y ventajas clave' },
      { key: 'estadisticas',  label: '📈 Datos y estadísticas',  text: 'gráfico con números y estadísticas destacadas' },
      { key: 'proceso',       label: '🔄 Pasos del proceso',     text: 'pasos del proceso numerados' },
      { key: 'pantalla-app',  label: '🖥 Pantalla del dashboard', text: 'pantalla del dashboard de Sphaira visible' },
      { key: 'personas',      label: '👥 Entrenador / director',  text: 'entrenador o director de club de fútbol' },
    ],
    estilo: [
      { key: 'corporativo',  label: '💼 Profesional',     text: 'estilo profesional corporativo' },
      { key: 'minimalista',  label: '◻ Minimalista',      text: 'minimalista, mucho espacio en blanco' },
      { key: 'vibrante',     label: '🎯 Vibrante / bold',  text: 'colores vibrantes y contrastes fuertes' },
      { key: 'oscuro',       label: '🌑 Dark mode',        text: 'dark mode, fondo oscuro navy predominante' },
      { key: 'moderno',      label: '🚀 Tech / futurista', text: 'estilo tech futurista moderno' },
    ],
    texto: [
      { key: 'titulos',    label: 'Títulos en la imagen',   text: 'con títulos grandes visibles en la imagen' },
      { key: 'bullets',    label: 'Bullet points',          text: 'con bullet points de texto legible' },
      { key: 'numeros',    label: 'Números / %',            text: 'con cifras y porcentajes destacados' },
      { key: 'sin-texto',  label: 'Sin texto visible',      text: 'sin texto escrito en la imagen' },
      { key: 'cta',        label: 'CTA / llamada a acción', text: 'con llamada a la acción visible' },
    ],
  };

  isChipActive(chip: { key: string }): boolean {
    return this.activePromptChips.has(chip.key);
  }

  togglePromptChip(chip: { key: string; text: string }): void {
    if (this.activePromptChips.has(chip.key)) {
      this.activePromptChips.delete(chip.key);
    } else {
      this.activePromptChips.add(chip.key);
    }
    this._rebuildPromptFromChips();
  }

  clearPromptChips(): void {
    this.activePromptChips.clear();
    this.editSocialImagePrompt = '';
  }

  applyChipsAndGenerate(): void {
    this._rebuildPromptFromChips();
    this.generateImagePrompt();
  }

  private _rebuildPromptFromChips(): void {
    const parts: string[] = [];
    for (const category of Object.values(this.promptChips)) {
      for (const chip of category) {
        if (this.activePromptChips.has(chip.key)) {
          parts.push(chip.text);
        }
      }
    }
    if (parts.length > 0) {
      this.editSocialImagePrompt = parts.join(', ');
    }
  }

  // Tokens de RRSS
  showSocialTokensModal = false;
  socialTokens: Record<string, boolean> = {};
  socialTokenValues: Record<string, string> = {};

  // Claves de IA (Anthropic, Replicate)
  aiKeys: Record<string, boolean> = {};
  aiKeyValues: Record<string, string> = { cta_demo_url: 'https://demo.sphairatech.com' };
  // Estado de guardado por clave: null | 'saving' | 'saved' | 'error'
  keyStatus: Record<string, string | null> = {};
  socialTokenKeys = [
    { key: 'meta_access_token', label: 'Meta Access Token (Instagram + Facebook)', network: 'meta' },
    { key: 'meta_ig_user_id', label: 'Instagram Business User ID', network: 'meta' },
    { key: 'meta_fb_page_id', label: 'Facebook Page ID', network: 'meta' },
    { key: 'linkedin_access_token', label: 'LinkedIn Access Token', network: 'linkedin' },
    { key: 'linkedin_author_urn', label: 'LinkedIn Author URN (urn:li:person:XXX)', network: 'linkedin' },
    { key: 'twitter_api_key', label: 'Twitter API Key', network: 'twitter' },
    { key: 'twitter_api_secret', label: 'Twitter API Secret', network: 'twitter' },
    { key: 'twitter_access_token', label: 'Twitter Access Token', network: 'twitter' },
    { key: 'twitter_access_secret', label: 'Twitter Access Secret', network: 'twitter' },
  ];

  // ── Prospect DMs ──────────────────────────────────────────────────────────
  showDMsModal = false;
  dmsProspect: any = null;
  prospectDMs: any[] = [];
  isDMsLoading = false;
  isGeneratingDMs = false;
  copiedDMId: number | null = null;

  // ── DM Templates ──────────────────────────────────────────────────────────
  showDMTemplatesModal = false;
  dmTemplates: any[] = [];
  dmTemplatesLoading = false;
  newTemplateName = '';
  newTemplateNetwork = 'instagram';
  newTemplateText = '';
  isSavingTemplate = false;

  // ── RRSS sub-tabs ─────────────────────────────────────────────────────────
  socialSubTab: 'posts' | 'comments' | 'templates' = 'posts';

  // ── Comment auto-reply ────────────────────────────────────────────────────
  commentGuidelines = {
    enabled: false,
    tone: 'profesional y amigable',
    topics_avoid: '',
    signature: '',
    custom_instructions: '',
    model: 'gpt-4o-mini',
  };
  isLoadingGuidelines = false;
  isSavingGuidelines = false;
  guidelinesSaved = false;
  webhookInfo: any = null;

  commentLogs: any[] = [];
  commentLogsLoading = false;
  commentLogPlatformFilter = '';
  commentLogStatusFilter = '';

  replyingLogId: number | null = null;
  replyText = '';
  isSendingReply = false;

  // ── Scheduled post ────────────────────────────────────────────────────────
  scheduleDateTime = '';
  isSchedulingPost = false;

  // ── Engagement ────────────────────────────────────────────────────────────
  isRecalculatingScores = false;

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
    this.loadSocialMeta();
    this.loadCommentGuidelines();
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
    if (tab === 'social') { this.socialSubTab = 'posts'; this.loadSocialPosts(); this.loadSocialHistory(); }
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
    this.selectedProspect = { ...p };
    this.crmTab = 'info';
    this.crmEdit = { ...p };
    this.crmSaveOk = false;
    this.showProspectModal = true;
  }

  saveCrmEdit(): void {
    if (!this.selectedProspect) return;
    this.isSavingCrm = true;
    this.crmSaveOk = false;

    // Solo enviamos los campos del formulario CRM + notes
    const payload: any = {};
    for (const f of this.CRM_FIELDS) {
      payload[f.key] = this.crmEdit[f.key] ?? null;
    }
    payload['has_youth_academy'] = this.crmEdit['has_youth_academy'] ? 1 : 0;
    payload['notes'] = this.crmEdit['notes'] ?? null;

    this.prospectService.updateProspect(this.selectedProspect.prospect_id, payload).subscribe({
      next: () => {
        // Actualizar el objeto local para reflejar cambios en la vista
        Object.assign(this.selectedProspect, payload);
        // Actualizar también en la lista de prospects si estaba cargada
        const idx = this.prospects.findIndex(p => p.prospect_id === this.selectedProspect.prospect_id);
        if (idx >= 0) Object.assign(this.prospects[idx], payload);
        this.isSavingCrm = false;
        this.crmSaveOk = true;
        setTimeout(() => this.crmSaveOk = false, 3000);
      },
      error: () => { this.isSavingCrm = false; }
    });
  }

  // ── Conversión a cliente ─────────────────────────────────────────────────

  openConvertModal(): void {
    this.convertNote = '';
    this.showConvertModal = true;
  }

  confirmConvert(): void {
    if (!this.selectedProspect) return;
    this.isConverting = true;
    this.prospectService.convertToClient(
      this.selectedProspect.prospect_id,
      this.convertNote.trim() || undefined,
    ).subscribe({
      next: (res) => {
        this.selectedProspect.status = 'CLIENT';
        this.selectedProspect.converted_at = res.converted_at;
        // Actualizar en la lista local
        const idx = this.prospects.findIndex(p => p.prospect_id === this.selectedProspect.prospect_id);
        if (idx >= 0) {
          this.prospects[idx].status = 'CLIENT';
          this.prospects[idx].converted_at = res.converted_at;
        }
        this.isConverting = false;
        this.showConvertModal = false;
        if (this.selectedCampaign) this.loadCampaignStats();
      },
      error: () => { this.isConverting = false; }
    });
  }

  revertToProspect(): void {
    if (!this.selectedProspect) return;
    if (!confirm(`¿Revertir a "${this.selectedProspect.name}" a estado de prospecto? Se perderá la fecha de conversión.`)) return;
    this.prospectService.revertToProspect(this.selectedProspect.prospect_id).subscribe({
      next: (res) => {
        this.selectedProspect.status = res.new_status;
        this.selectedProspect.converted_at = null;
        const idx = this.prospects.findIndex(p => p.prospect_id === this.selectedProspect.prospect_id);
        if (idx >= 0) {
          this.prospects[idx].status = res.new_status;
          this.prospects[idx].converted_at = null;
        }
      }
    });
  }

  // ── Import CSV/Excel ─────────────────────────────────────────────────────

  openImportModal(): void {
    this.showImportModal = true;
    this.importStep = 'upload';
    this.importFile = null;
    this.importFilename = '';
    this.importFileB64 = '';
    this.importPreviewCols = [];
    this.importMapping = {};
    this.importSample = [];
    this.importTotalRows = 0;
    this.importResult = null;
    this.csvImportLoading = false;
  }

  onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.importFile = file;
    this.importFilename = file.name;
  }

  uploadImportFile(): void {
    if (!this.importFile) return;
    this.csvImportLoading = true;

    // Leer como base64 para el paso de confirm
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.importFileB64 = dataUrl.split(',')[1] ?? '';
    };
    reader.readAsDataURL(this.importFile);

    this.prospectService.importPreview(this.importFile).subscribe({
      next: (res) => {
        this.importPreviewCols = res.columns;
        this.importMapping = { ...res.mapping };
        this.importSample = res.sample;
        this.importTotalRows = res.total_rows;
        this.importStep = 'map';
        this.csvImportLoading = false;
      },
      error: () => { this.csvImportLoading = false; }
    });
  }

  confirmCsvImport(): void {
    this.csvImportLoading = true;
    this.prospectService.importConfirm({
      campaign_id: this.selectedCampaign?.campaign_id ?? undefined,
      mapping: this.importMapping,
      file_b64: this.importFileB64,
      filename: this.importFilename,
      skip_duplicates: this.importSkipDuplicates,
    }).subscribe({
      next: (res) => {
        this.importResult = res;
        this.importStep = 'done';
        this.csvImportLoading = false;
        this.loadProspects();
        if (this.selectedCampaign) this.loadCampaignStats();
      },
      error: () => { this.csvImportLoading = false; }
    });
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
      'CLIENT': '★ Cliente',
    };
    return map[status] || status;
  }

  statusBadgeClass(status: string): string {
    const map: any = {
      'NEW': 'badge-st-new', 'ENRICHED': 'badge-st-enriched', 'ANALYZED': 'badge-st-analyzed',
      'EMAIL_READY': 'badge-st-ready', 'EMAIL_SENT': 'badge-st-sent',
      'DRAFT': 'bg-secondary', 'RUNNING': 'badge-st-running', 'COMPLETED': 'badge-st-sent', 'FAILED': 'bg-danger',
      'CLIENT': 'badge-st-client',
    };
    return map[status] || 'bg-secondary';
  }

  get totalPages(): number {
    return Math.ceil(this.prospectsTotal / this.prospectsSize);
  }

  // ── Follow-up config ──────────────────────────────────────────────────────

  openFollowupConfig(): void {
    if (!this.selectedCampaign) return;
    this.showFollowupConfigModal = true;
    this.prospectService.getFollowupConfig(this.selectedCampaign.campaign_id).subscribe({
      next: (cfg: any) => { this.followupConfig = { ...this.followupConfig, ...cfg }; },
      error: () => {}
    });
    this.prospectService.getFollowupStats(this.selectedCampaign.campaign_id).subscribe({
      next: (s: any) => { this.followupStats = s; },
      error: () => {}
    });
  }

  saveFollowupConfig(): void {
    if (!this.selectedCampaign) return;
    this.isSavingFollowup = true;
    this.prospectService.updateFollowupConfig(this.selectedCampaign.campaign_id, this.followupConfig).subscribe({
      next: () => {
        this.isSavingFollowup = false;
        this.followupConfigSaved = true;
        setTimeout(() => { this.followupConfigSaved = false; }, 2500);
      },
      error: () => { this.isSavingFollowup = false; }
    });
  }

  // ── Social posts ──────────────────────────────────────────────────────────

  loadSocialPosts(): void {
    this.socialLoading = true;
    const net = this.socialNetworkFilter || undefined;
    const st = this.socialStatusFilter || undefined;
    this.prospectService.getSocialPosts(net, st).subscribe({
      next: (posts: any[]) => { this.socialPosts = posts; this.socialLoading = false; },
      error: () => { this.socialLoading = false; }
    });
  }

  loadSocialMeta(): void {
    this.prospectService.getSocialMeta().subscribe({
      next: (meta: any) => { this.socialContentTypes = meta.content_types || []; },
      error: () => {}
    });
  }

  loadSocialHistory(): void {
    this.isLoadingHistory = true;
    this.prospectService.getSocialHistory(60).subscribe({
      next: (posts: any[]) => {
        this.socialHistory = posts;
        this.isLoadingHistory = false;
      },
      error: () => { this.isLoadingHistory = false; }
    });
  }

  openSocialGenerator(): void {
    this.socialGenExtraContext = '';
    this.socialGenTone = 'cercano';
    this.socialGenObjective = 'demo_traffic';
    this.socialGenAudience = 'todos';
    this.socialGenFeature = 'ninguna';
    this.showSocialGeneratorModal = true;
  }

  // ── Plan automático ──────────────────────────────────────────────────────

  openAutoPlan(): void {
    this.contentPlan = [];
    this.showAutoPlanModal = true;
    this.runAutoPlan();
  }

  runAutoPlan(): void {
    this.isGeneratingPlan = true;
    this.contentPlan = [];
    this.prospectService.autoplanSocialContent(this.autoPlanNumPosts).subscribe({
      next: (res) => {
        this.isGeneratingPlan = false;
        this.contentPlan = res.plan || [];
      },
      error: (err: any) => {
        this.isGeneratingPlan = false;
        alert(err?.error?.detail || 'Error generando el plan de contenido');
      }
    });
  }

  generateFromPlan(item: any, idx: number): void {
    this.autoPlanGeneratingIdx = idx;
    this.prospectService.generateSocialPost({
      network:          item.network,
      content_type:     item.content_type,
      extra_context:    item.angle + (item.why ? ' — ' + item.why : ''),
      campaign_id:      null,
      tone:             item.tone || 'cercano',
      objective:        'demo_traffic',
      target_audience:  item.target_audience || 'todos',
      specific_feature: item.suggested_feature || 'ninguna',
    }).subscribe({
      next: (post: any) => {
        this.autoPlanGeneratingIdx = null;
        // Marcar el item como generado
        this.contentPlan[idx] = { ...item, _generated: true, _postId: post.post_id };
        this.socialPosts = [post, ...this.socialPosts];
        this.showAutoPlanModal = false;
        this.openSocialEdit(post);
      },
      error: (err: any) => {
        this.autoPlanGeneratingIdx = null;
        alert(err?.error?.detail || 'Error generando el post');
      }
    });
  }

  generateAllPlan(): void {
    if (!this.contentPlan.length) return;
    const pending = this.contentPlan.filter((item: any) => !item._generated);
    if (!pending.length) return;
    if (!confirm(`¿Generar los ${pending.length} posts del plan? Esto puede tardar unos minutos.`)) return;

    let idx = 0;
    const generateNext = () => {
      if (idx >= this.contentPlan.length) {
        this.showAutoPlanModal = false;
        this.loadSocialPosts();
        return;
      }
      const item = this.contentPlan[idx];
      if (item._generated) { idx++; generateNext(); return; }
      this.autoPlanGeneratingIdx = idx;
      this.prospectService.generateSocialPost({
        network:          item.network,
        content_type:     item.content_type,
        extra_context:    item.angle + (item.why ? ' — ' + item.why : ''),
        campaign_id:      null,
        tone:             item.tone || 'cercano',
        objective:        'demo_traffic',
        target_audience:  item.target_audience || 'todos',
        specific_feature: item.suggested_feature || 'ninguna',
      }).subscribe({
        next: (post: any) => {
          this.contentPlan[idx] = { ...item, _generated: true, _postId: post.post_id };
          idx++;
          setTimeout(generateNext, 1200); // pausa para no saturar la API
        },
        error: () => { idx++; generateNext(); }
      });
    };
    generateNext();
  }

  optimizePrompt(): void {
    this.isOptimizingPrompt = true;
    this.prospectService.optimizeSocialPrompt({
      raw_context:     this.socialGenExtraContext,
      network:         this.socialGenNetwork,
      content_type:    this.socialGenContentType,
      tone:            this.socialGenTone,
      objective:       this.socialGenObjective,
      target_audience: this.socialGenAudience,
      specific_feature:this.socialGenFeature,
    }).subscribe({
      next: (res) => {
        this.isOptimizingPrompt = false;
        this.socialGenExtraContext = res.optimized_prompt;
      },
      error: (err: any) => {
        this.isOptimizingPrompt = false;
        alert(err?.error?.detail || 'Error optimizando el prompt');
      }
    });
  }

  generateSocialPost(): void {
    this.isGeneratingSocial = true;
    this.prospectService.generateSocialPost({
      network:          this.socialGenNetwork,
      content_type:     this.socialGenContentType,
      extra_context:    this.socialGenExtraContext,
      campaign_id:      null,
      tone:             this.socialGenTone,
      objective:        this.socialGenObjective,
      target_audience:  this.socialGenAudience,
      specific_feature: this.socialGenFeature,
    }).subscribe({
      next: (post: any) => {
        this.isGeneratingSocial = false;
        this.showSocialGeneratorModal = false;
        this.socialPosts = [post, ...this.socialPosts];
        this.openSocialEdit(post);
      },
      error: (err: any) => {
        this.isGeneratingSocial = false;
        alert(err?.error?.detail || 'Error generando el post');
      }
    });
  }

  openSocialEdit(post: any): void {
    this.editingSocialPost = post;
    this.editSocialText = post.text_content || '';
    this.editSocialImagePrompt = post.image_prompt || '';
    this.editSocialHashtags = post.hashtags || '';
    this.publishResult = null;
    const raw = post.image_url || null;
    this.previewImageUrl = raw?.startsWith('/static/')
      ? `http://localhost:8001${raw}`
      : raw;
    this.isGeneratingImage = false;
    this.imageGenError = null;
    this.imageModelUsed = '';
    this.showSocialEditModal = true;
    if (this.imageModels.length === 0) {
      this.loadImageModels();
    }
  }

  loadImageModels(): void {
    this.prospectService.getImageModels().subscribe({
      next: (data) => {
        this.imageModels = data.models;
        this.selectedImageModel = data.current || data.default || 'ideogram';
      },
      error: () => {
        this.imageModels = [
          { key: 'dalle3',      label: 'DALL-E 3 ⭐ (mejor texto legible, OpenAI)' },
          { key: 'recraft',     label: 'Recraft v3 (diseño gráfico / ilustración)' },
          { key: 'flux-pro',    label: 'Flux 1.1 Pro (fotorrealista)' },
          { key: 'ideogram',    label: 'Ideogram v3 Turbo (infografías)' },
          { key: 'imagen4',     label: 'Google Imagen 4 via Replicate (ultra realista)' },
          { key: 'flux-schnell',label: 'Flux Schnell (rápido, económico)' },
        ];
        this.selectedImageModel = 'dalle3';
      }
    });
  }

  onImageModelChange(modelKey: string): void {
    this.selectedImageModel = modelKey;
    this.prospectService.setImageModel(modelKey).subscribe();
  }

  generatePostImage(): void {
    if (!this.editingSocialPost || this.isGeneratingImage) return;
    this.isGeneratingImage = true;
    this.imageGenError = null;
    this.imageModelUsed = '';
    this.prospectService.generatePostImage(
      this.editingSocialPost.post_id,
      this.editSocialImagePrompt,
      this.editingSocialPost.network,
      this.editingSocialPost.content_type,
      this.selectedImageModel,
    ).subscribe({
      next: (res) => {
        this.isGeneratingImage = false;
        this.imageModelUsed = res.model_used || this.selectedImageModel;
        const rawUrl = res.image_url;
        this.previewImageUrl = rawUrl?.startsWith('/static/')
          ? `http://localhost:8001${rawUrl}`
          : rawUrl;
        this.editingSocialPost = { ...this.editingSocialPost, image_url: res.image_url };
        const idx = this.socialPosts.findIndex(p => p.post_id === this.editingSocialPost.post_id);
        if (idx >= 0) this.socialPosts[idx] = this.editingSocialPost;
      },
      error: (err) => {
        this.isGeneratingImage = false;
        if (err?.name === 'TimeoutError' || err?.message?.includes('Timeout')) {
          this.imageGenError = `Tiempo de espera agotado. ${this.selectedImageModel} puede tardar hasta 60 seg. Inténtalo de nuevo.`;
        } else if (err?.status === 0) {
          this.imageGenError = 'No se pudo conectar con el servidor. Comprueba que el backend está corriendo.';
        } else {
          this.imageGenError = err?.error?.detail || err?.message || 'Error desconocido al generar la imagen.';
        }
      }
    });
  }

  generateImagePrompt(): void {
    if (!this.editingSocialPost || this.isGeneratingImagePrompt) return;
    this.isGeneratingImagePrompt = true;
    this.prospectService.generateImagePrompt(
      this.editSocialText,
      this.editingSocialPost.network,
      this.editingSocialPost.content_type,
      this.selectedImageModel,
      this.editSocialImagePrompt,  // descripción que el usuario haya escrito ya
    ).subscribe({
      next: (res) => {
        this.isGeneratingImagePrompt = false;
        this.editSocialImagePrompt = res.image_prompt;
      },
      error: () => {
        this.isGeneratingImagePrompt = false;
      }
    });
  }

  saveSocialPost(): void {
    if (!this.editingSocialPost) return;
    this.isSavingSocialPost = true;
    this.prospectService.updateSocialPost(this.editingSocialPost.post_id, {
      text_content: this.editSocialText,
      image_prompt: this.editSocialImagePrompt,
      hashtags: this.editSocialHashtags,
    }).subscribe({
      next: (updated: any) => {
        this.isSavingSocialPost = false;
        const idx = this.socialPosts.findIndex(p => p.post_id === updated.post_id);
        if (idx >= 0) this.socialPosts[idx] = updated;
        this.editingSocialPost = updated;
      },
      error: () => { this.isSavingSocialPost = false; }
    });
  }

  approveSocialPost(post: any): void {
    this.prospectService.approveSocialPost(post.post_id).subscribe({
      next: (updated: any) => {
        const idx = this.socialPosts.findIndex(p => p.post_id === updated.post_id);
        if (idx >= 0) this.socialPosts[idx] = updated;
        if (this.editingSocialPost?.post_id === updated.post_id) this.editingSocialPost = updated;
      }
    });
  }

  rejectSocialPost(post: any): void {
    this.prospectService.rejectSocialPost(post.post_id).subscribe({
      next: () => {
        const idx = this.socialPosts.findIndex(p => p.post_id === post.post_id);
        if (idx >= 0) this.socialPosts[idx] = { ...this.socialPosts[idx], status: 'REJECTED' };
        if (this.editingSocialPost?.post_id === post.post_id) {
          this.editingSocialPost = { ...this.editingSocialPost, status: 'REJECTED' };
        }
      }
    });
  }

  publishSocialPost(): void {
    if (!this.editingSocialPost || this.isPublishingSocialPost) return;
    this.isPublishingSocialPost = true;
    this.publishResult = null;
    this.prospectService.publishSocialPost(this.editingSocialPost.post_id).subscribe({
      next: (res: any) => {
        this.isPublishingSocialPost = false;
        this.publishResult = res;
        const updated = res.post;
        if (updated) {
          const idx = this.socialPosts.findIndex(p => p.post_id === updated.post_id);
          if (idx >= 0) this.socialPosts[idx] = updated;
          this.editingSocialPost = updated;
        }
      },
      error: (err: any) => {
        this.isPublishingSocialPost = false;
        this.publishResult = { ok: false, error: err?.error?.detail || 'Error' };
      }
    });
  }

  deleteSocialPost(post: any): void {
    if (!confirm(`¿Borrar el post de ${post.network}? Esta acción no se puede deshacer.`)) return;
    this.prospectService.deleteSocialPost(post.post_id).subscribe({
      next: () => {
        this.socialPosts = this.socialPosts.filter(p => p.post_id !== post.post_id);
        if (this.editingSocialPost?.post_id === post.post_id) this.showSocialEditModal = false;
      }
    });
  }

  copyPostText(post: any): void {
    navigator.clipboard?.writeText(post.text_content || '').catch(() => {});
  }

  socialStatusLabel(status: string): string {
    const map: any = {
      DRAFT: 'Borrador', APPROVED: 'Aprobado', SCHEDULED: 'Programado',
      PUBLISHED: 'Publicado', REJECTED: 'Rechazado',
    };
    return map[status] || status;
  }

  socialStatusClass(status: string): string {
    const map: any = {
      DRAFT: 'badge-st-new', APPROVED: 'badge-st-enriched', PUBLISHED: 'badge-st-sent',
      REJECTED: 'bg-danger', SCHEDULED: 'badge-st-analyzed',
    };
    return map[status] || 'bg-secondary';
  }

  // ── Social tokens ─────────────────────────────────────────────────────────

  openSocialTokens(): void {
    this.socialTokenValues = {};
    this.aiKeyValues = { cta_demo_url: this.aiKeyValues['cta_demo_url'] || 'https://demo.sphairatech.com' };
    this.showSocialTokensModal = true;
    this.prospectService.getSocialTokens().subscribe({
      next: (tokens: any) => { this.socialTokens = tokens; },
      error: () => {}
    });
    this.prospectService.getAIKeys().subscribe({
      next: (keys: any) => { this.aiKeys = keys; },
      error: () => {}
    });
    // Cargar la CTA URL guardada
    this.prospectService.getSettings().subscribe({
      next: (s: any) => {
        if (s['cta_demo_url']) this.aiKeyValues['cta_demo_url'] = s['cta_demo_url'];
      },
      error: () => {}
    });
  }

  keyBtnClass(key: string, base = 'btn-outline-success'): string {
    const s = this.keyStatus[key];
    if (s === 'saved')  return 'btn-success';
    if (s === 'error')  return 'btn-danger';
    return base;
  }

  saveAIKey(key: string): void {
    const val = this.aiKeyValues[key];
    if (!val?.trim() || this.keyStatus[key] === 'saving') return;
    this.keyStatus[key] = 'saving';
    this.prospectService.updateSetting(key, val.trim()).subscribe({
      next: () => {
        if (key !== 'cta_demo_url') this.aiKeys[key] = true;
        this.aiKeyValues[key] = key !== 'cta_demo_url' ? '' : val.trim();
        this.keyStatus[key] = 'saved';
        setTimeout(() => { this.keyStatus[key] = null; }, 2500);
      },
      error: () => {
        this.keyStatus[key] = 'error';
        setTimeout(() => { this.keyStatus[key] = null; }, 3000);
      }
    });
  }

  saveSocialToken(key: string): void {
    const val = this.socialTokenValues[key];
    if (!val?.trim() || this.keyStatus[key] === 'saving') return;
    this.keyStatus[key] = 'saving';
    this.prospectService.updateSocialToken(key, val.trim()).subscribe({
      next: () => {
        this.socialTokens[key] = true;
        this.socialTokenValues[key] = '';
        this.keyStatus[key] = 'saved';
        setTimeout(() => { this.keyStatus[key] = null; }, 2500);
      },
      error: () => {
        this.keyStatus[key] = 'error';
        setTimeout(() => { this.keyStatus[key] = null; }, 3000);
      }
    });
  }

  // ── Prospect DMs ──────────────────────────────────────────────────────────

  openDMsModal(prospect: any): void {
    this.dmsProspect = prospect;
    this.prospectDMs = [];
    this.showDMsModal = true;
    this.isDMsLoading = true;
    this.prospectService.getProspectDMs(prospect.prospect_id).subscribe({
      next: (dms: any[]) => { this.prospectDMs = dms; this.isDMsLoading = false; },
      error: () => { this.isDMsLoading = false; }
    });
  }

  generateDMs(): void {
    if (!this.dmsProspect || this.isGeneratingDMs) return;
    this.isGeneratingDMs = true;
    this.prospectService.generateProspectDMs(this.dmsProspect.prospect_id).subscribe({
      next: (res: any) => {
        this.isGeneratingDMs = false;
        this.prospectService.getProspectDMs(this.dmsProspect.prospect_id).subscribe({
          next: (dms: any[]) => { this.prospectDMs = dms; }
        });
      },
      error: (err: any) => {
        this.isGeneratingDMs = false;
        alert(err?.error?.detail || 'Error generando DMs');
      }
    });
  }

  copyDM(dm: any): void {
    navigator.clipboard?.writeText(dm.dm_text || '').catch(() => {});
    this.copiedDMId = dm.dm_id;
    setTimeout(() => { this.copiedDMId = null; }, 2000);
    if (dm.status === 'DRAFT') {
      this.prospectService.updateDMStatus(this.dmsProspect.prospect_id, dm.dm_id, 'COPIED').subscribe({
        next: () => {
          const idx = this.prospectDMs.findIndex(d => d.dm_id === dm.dm_id);
          if (idx >= 0) this.prospectDMs[idx] = { ...this.prospectDMs[idx], status: 'COPIED' };
        }
      });
    }
  }

  markDMSent(dm: any): void {
    this.prospectService.updateDMStatus(this.dmsProspect.prospect_id, dm.dm_id, 'SENT_MANUAL').subscribe({
      next: () => {
        const idx = this.prospectDMs.findIndex(d => d.dm_id === dm.dm_id);
        if (idx >= 0) this.prospectDMs[idx] = { ...this.prospectDMs[idx], status: 'SENT_MANUAL' };
      }
    });
  }

  dmNetworkIcon(network: string): string {
    return this.socialNetworkIcons[network] || 'bi-chat-dots';
  }

  dmStatusLabel(status: string): string {
    const map: any = { DRAFT: 'Borrador', COPIED: 'Copiado', SENT_MANUAL: 'Enviado' };
    return map[status] || status;
  }

  // ── DM Templates ──────────────────────────────────────────────────────────

  openDMTemplatesModal(): void {
    this.showDMTemplatesModal = true;
    this.newTemplateName = '';
    this.newTemplateText = '';
    this.loadDMTemplates();
  }

  loadDMTemplates(): void {
    this.dmTemplatesLoading = true;
    this.prospectService.getDMTemplates().subscribe({
      next: (t: any[]) => { this.dmTemplates = t; this.dmTemplatesLoading = false; },
      error: () => { this.dmTemplatesLoading = false; },
    });
  }

  saveDMTemplate(): void {
    if (!this.newTemplateName.trim() || !this.newTemplateText.trim()) return;
    this.isSavingTemplate = true;
    this.prospectService.createDMTemplate(
      this.newTemplateNetwork, this.newTemplateName.trim(), this.newTemplateText.trim()
    ).subscribe({
      next: () => {
        this.isSavingTemplate = false;
        this.newTemplateName = '';
        this.newTemplateText = '';
        this.loadDMTemplates();
      },
      error: () => { this.isSavingTemplate = false; },
    });
  }

  deleteDMTemplate(t: any): void {
    if (!confirm(`¿Eliminar la plantilla "${t.template_name}"?`)) return;
    this.prospectService.deleteDMTemplate(t.template_id).subscribe({
      next: () => { this.dmTemplates = this.dmTemplates.filter(x => x.template_id !== t.template_id); },
    });
  }

  useTemplate(t: any): void {
    if (!this.dmsProspect) return;
    this.prospectService.useDMTemplate(t.template_id).subscribe();
    navigator.clipboard?.writeText(t.template_text || '').catch(() => {});
    this.copiedDMId = t.template_id;
    setTimeout(() => { this.copiedDMId = null; }, 2000);
  }

  // ── Comment auto-reply ────────────────────────────────────────────────────

  loadCommentGuidelines(): void {
    this.isLoadingGuidelines = true;
    this.prospectService.getCommentGuidelines().subscribe({
      next: (cfg: any) => { this.commentGuidelines = { ...this.commentGuidelines, ...cfg }; this.isLoadingGuidelines = false; },
      error: () => { this.isLoadingGuidelines = false; },
    });
    this.prospectService.getWebhookInfo().subscribe({
      next: (info: any) => { this.webhookInfo = info; },
      error: () => {},
    });
  }

  saveCommentGuidelines(): void {
    this.isSavingGuidelines = true;
    this.prospectService.updateCommentGuidelines(this.commentGuidelines).subscribe({
      next: (res: any) => {
        this.isSavingGuidelines = false;
        this.guidelinesSaved = true;
        if (res.verify_token && this.webhookInfo) {
          this.webhookInfo = { ...this.webhookInfo, verify_token: res.verify_token };
        }
        setTimeout(() => { this.guidelinesSaved = false; }, 2500);
      },
      error: () => { this.isSavingGuidelines = false; },
    });
  }

  loadCommentLogs(): void {
    this.commentLogsLoading = true;
    this.prospectService.getCommentLogs(
      this.commentLogPlatformFilter || undefined,
      this.commentLogStatusFilter || undefined,
    ).subscribe({
      next: (logs: any[]) => { this.commentLogs = logs; this.commentLogsLoading = false; },
      error: () => { this.commentLogsLoading = false; },
    });
  }

  openReply(log: any): void {
    this.replyingLogId = log.log_id;
    this.replyText = log.suggested_reply || '';
  }

  sendReply(log: any): void {
    if (!this.replyText.trim()) return;
    this.isSendingReply = true;
    this.prospectService.replyComment(log.log_id, this.replyText.trim()).subscribe({
      next: () => {
        this.isSendingReply = false;
        this.replyingLogId = null;
        const idx = this.commentLogs.findIndex(l => l.log_id === log.log_id);
        if (idx >= 0) this.commentLogs[idx] = { ...this.commentLogs[idx], status: 'REPLIED', our_reply: this.replyText.trim() };
      },
      error: () => { this.isSendingReply = false; },
    });
  }

  skipCommentLog(log: any): void {
    this.prospectService.skipComment(log.log_id).subscribe({
      next: () => {
        const idx = this.commentLogs.findIndex(l => l.log_id === log.log_id);
        if (idx >= 0) this.commentLogs[idx] = { ...this.commentLogs[idx], status: 'SKIPPED' };
      },
    });
  }

  commentStatusLabel(status: string): string {
    const map: any = { PENDING: 'Pendiente', REPLIED: 'Respondido', SKIPPED: 'Ignorado', ERROR: 'Error' };
    return map[status] || status;
  }

  commentStatusClass(status: string): string {
    const map: any = { PENDING: 'badge-st-new', REPLIED: 'badge-st-sent', SKIPPED: 'bg-secondary', ERROR: 'bg-danger' };
    return map[status] || 'bg-secondary';
  }

  copyWebhookToken(): void {
    navigator.clipboard?.writeText(this.webhookInfo?.verify_token || '').catch(() => {});
  }

  copyWebhookUrl(): void {
    navigator.clipboard?.writeText(this.webhookInfo?.webhook_url || '').catch(() => {});
  }

  // ── Scheduled posts ────────────────────────────────────────────────────────

  schedulePost(): void {
    if (!this.editingSocialPost || !this.scheduleDateTime) return;
    this.isSchedulingPost = true;
    this.prospectService.schedulePost(this.editingSocialPost.post_id, this.scheduleDateTime).subscribe({
      next: (updated: any) => {
        this.isSchedulingPost = false;
        const idx = this.socialPosts.findIndex(p => p.post_id === updated.post_id);
        if (idx >= 0) this.socialPosts[idx] = updated;
        this.editingSocialPost = updated;
        this.scheduleDateTime = '';
      },
      error: () => { this.isSchedulingPost = false; },
    });
  }

  // ── Engagement scores ─────────────────────────────────────────────────────

  recalculateScores(): void {
    if (!this.selectedCampaign || this.isRecalculatingScores) return;
    this.isRecalculatingScores = true;
    this.prospectService.recalculateCampaignScores(this.selectedCampaign.campaign_id).subscribe({
      next: () => {
        setTimeout(() => {
          this.isRecalculatingScores = false;
          this.loadProspects();
        }, 3000);
      },
      error: () => { this.isRecalculatingScores = false; },
    });
  }

  engagementScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 35) return 'score-medium';
    return 'score-low';
  }

  engagementScoreLabel(score: number): string {
    if (score >= 70) return 'Caliente';
    if (score >= 35) return 'Templado';
    if (score > 0)   return 'Frío';
    return '';
  }
}
