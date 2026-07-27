import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';
import { ClubService } from 'src/app/core/services/club/club.service';

export interface NetworkConfig {
  network: string;
  topics: string;
  tone: string;
  audience: string;
  post_frequency: number;
  default_hashtags: string;
  extra_instructions: string;
  text_ai_model: string;
  image_ai_model: string;
  include_image: number;
}

const NETWORKS = ['instagram', 'facebook', 'linkedin', 'twitter'] as const;
type Network = typeof NETWORKS[number];

/** Redes que soportan imágenes generadas con IA */
const IMAGE_NETWORKS: Set<Network> = new Set(['instagram', 'facebook']);

const PRESET_TOPICS = [
  'Caso de éxito', 'Dato del sector', 'Comparativa', 'Tutorial', 'Pregunta',
];

const TONES = ['profesional', 'cercano', 'motivador', 'informativo'];

export interface SocialConnectionGroup {
  network: string;
  label: string;
  icon: string;
  color: string;
  fields: { key: string; label: string; hint: string; isSecret: boolean }[];
}

export interface ApiKeyConfig {
  key: string;
  label: string;
  provider: string;
  icon: string;
  hint: string;
  docUrl: string;
}

const SOCIAL_CONNECTIONS: SocialConnectionGroup[] = [
  {
    network: 'instagram',
    label: 'Instagram / Facebook',
    icon: 'bi-instagram',
    color: '#e1306c',
    fields: [
      { key: 'meta_access_token', label: 'Meta Access Token',   hint: 'Token de larga duración obtenido desde Meta for Developers.', isSecret: true },
      { key: 'meta_ig_user_id',   label: 'Instagram User ID',   hint: 'ID numérico de tu cuenta de Instagram Business/Creator.', isSecret: false },
      { key: 'meta_fb_page_id',   label: 'Facebook Page ID',    hint: 'ID numérico de tu página de Facebook asociada.', isSecret: false },
    ],
  },
  {
    network: 'linkedin',
    label: 'LinkedIn',
    icon: 'bi-linkedin',
    color: '#0a66c2',
    fields: [
      { key: 'linkedin_access_token', label: 'LinkedIn Access Token', hint: 'Token OAuth 2.0 con permisos w_member_social o r_organization_social.', isSecret: true },
      { key: 'linkedin_author_urn',   label: 'Author URN',            hint: 'URN de la persona u organización (ej. urn:li:person:ABC123).', isSecret: false },
    ],
  },
  {
    network: 'twitter',
    label: 'Twitter / X',
    icon: 'bi-twitter-x',
    color: '#000000',
    fields: [
      { key: 'twitter_api_key',       label: 'API Key',           hint: 'Consumer Key del proyecto en developer.twitter.com.',  isSecret: true },
      { key: 'twitter_api_secret',    label: 'API Secret',        hint: 'Consumer Secret del proyecto en developer.twitter.com.', isSecret: true },
      { key: 'twitter_access_token',  label: 'Access Token',      hint: 'Token de acceso OAuth 1.0a de tu cuenta.', isSecret: true },
      { key: 'twitter_access_secret', label: 'Access Token Secret', hint: 'Secreto del Access Token OAuth 1.0a.', isSecret: true },
    ],
  },
];

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    key: 'anthropic_api_key', label: 'Anthropic API Key', provider: 'Anthropic',
    icon: 'bi-stars', hint: 'Necesaria para Claude (Sonnet, Opus, Haiku). Es el motor de texto principal.',
    docUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    key: 'openai_api_key', label: 'OpenAI API Key', provider: 'OpenAI',
    icon: 'bi-cpu', hint: 'Necesaria para GPT-4 y DALL-E 3. También se usa como fallback de texto.',
    docUrl: 'https://platform.openai.com/api-keys',
  },
  {
    key: 'replicate_api_token', label: 'Replicate API Token', provider: 'Replicate',
    icon: 'bi-image', hint: 'Necesario para Flux, Recraft, Ideogram y Google Imagen 4 vía Replicate.',
    docUrl: 'https://replicate.com/account/api-tokens',
  },
  {
    key: 'gemini_api_key', label: 'Gemini API Key', provider: 'Google',
    icon: 'bi-google', hint: 'Opcional. Para modelos Gemini vía Google AI Studio.',
    docUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    key: 'gcp_project_id', label: 'GCP Project ID', provider: 'Google Cloud',
    icon: 'bi-cloud', hint: 'Proyecto de Google Cloud para Imagen 3 vía Vertex AI.',
    docUrl: 'https://console.cloud.google.com/',
  },
];

@Component({
  selector: 'app-rrss-settings',
  templateUrl: './rrss-settings.component.html',
  styleUrls: ['./rrss-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RrssSettingsComponent implements OnInit {
  networks    = NETWORKS;
  imageNetworks = IMAGE_NETWORKS;
  presetTopics = PRESET_TOPICS;
  tones        = TONES;
  activeNetwork: Network = 'instagram';

  // ── Section tabs ──────────────────────────────────────────────────────────
  activeSection: 'redes' | 'conexiones' | 'apikeys' | 'marca' = 'redes';

  // ── Club branding ──────────────────────────────────────────────────────────
  clubId = 0;
  clubLogoUrl: string | null = null;
  brandColor = '#31b270';
  altColor   = '#002c40';
  savingBranding = false;
  savedBranding  = false;
  uploadingLogo  = false;

  configs: Record<Network, NetworkConfig> = {
    instagram: this.defaultConfig('instagram'),
    facebook:  this.defaultConfig('facebook'),
    linkedin:  this.defaultConfig('linkedin'),
    twitter:   this.defaultConfig('twitter'),
  };

  topicInputs:   Record<Network, string> = { instagram: '', facebook: '', linkedin: '', twitter: '' };
  hashtagInputs: Record<Network, string> = { instagram: '', facebook: '', linkedin: '', twitter: '' };

  textModels:  { key: string; label: string; provider: string }[] = [];
  imageModels: { key: string; label: string }[] = [];

  saving = false;
  savedNetwork: string | null = null;

  // ── Conexiones RRSS ───────────────────────────────────────────────────────
  socialConnections = SOCIAL_CONNECTIONS;
  tokenStatus: Record<string, boolean> = {};
  tokenValues: Record<string, string> = {};
  showToken: Record<string, boolean> = {};
  savingToken: Record<string, boolean> = {};
  savedToken: Record<string, boolean> = {};

  // ── API Keys ──────────────────────────────────────────────────────────────
  apiKeyConfigs = API_KEY_CONFIGS;
  apiKeyStatus: Record<string, boolean> = {};
  apiKeyValues: Record<string, string> = {};
  showApiKey: Record<string, boolean> = {};
  savingApiKey: Record<string, boolean> = {};
  savedApiKey: Record<string, boolean> = {};

  constructor(private prospect: ProspectService, private clubService: ClubService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const userId = Number(sessionStorage.getItem('userId') || '0');
    if (userId) {
      this.clubService.getClubByUserId(userId).subscribe({
        next: (res: any) => {
          const club = res?.data || res;
          this.clubId      = club?.clubId || 0;
          this.clubLogoUrl = club?.picture || null;
          if (club?.brandColor) this.brandColor = club.brandColor;
          if (club?.altColor)   this.altColor   = club.altColor;
          this.cdr.markForCheck();
        },
      });
    }
    this.prospect.getAiModels().subscribe({
      next: data => {
        this.textModels  = data.text_models  || [];
        this.imageModels = data.image_models || [];
        this.cdr.markForCheck();
      },
    });
    NETWORKS.forEach(net => this.loadConfig(net));
    this.loadTokenStatus();
    this.loadApiKeyStatus();
  }

  // ── Helpers: trackBy ──────────────────────────────────────────────────────
  trackByKey(_i: number, item: { key: string }): string { return item.key; }

  // ── Helpers: agrupar modelos de texto por proveedor ───────────────────────
  get textModelsByProvider(): { provider: string; models: { key: string; label: string }[] }[] {
    const map = new Map<string, { key: string; label: string }[]>();
    for (const m of this.textModels) {
      const p = m.provider || 'Otros';
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push({ key: m.key, label: m.label });
    }
    return Array.from(map.entries()).map(([provider, models]) => ({ provider, models }));
  }

  // ── Conexiones ────────────────────────────────────────────────────────────
  loadTokenStatus(): void {
    this.prospect.getSocialTokens().subscribe({
      next: status => { this.tokenStatus = status; this.cdr.markForCheck(); },
    });
  }

  saveToken(key: string): void {
    const val = (this.tokenValues[key] || '').trim();
    if (!val) return;
    this.savingToken[key] = true;
    this.prospect.updateSocialToken(key, val).subscribe({
      next: () => {
        this.savingToken[key] = false;
        this.savedToken[key]  = true;
        this.tokenStatus[key] = true;
        this.tokenValues[key] = '';
        this.cdr.markForCheck();
        setTimeout(() => { this.savedToken[key] = false; this.cdr.markForCheck(); }, 2500);
      },
      error: () => { this.savingToken[key] = false; this.cdr.markForCheck(); },
    });
  }

  revokeToken(key: string): void {
    this.prospect.updateSocialToken(key, '').subscribe({
      next: () => { this.tokenStatus[key] = false; this.tokenValues[key] = ''; this.cdr.markForCheck(); },
    });
  }

  // ── API Keys ──────────────────────────────────────────────────────────────
  loadApiKeyStatus(): void {
    this.prospect.getAIKeys().subscribe({
      next: status => { this.apiKeyStatus = status; this.cdr.markForCheck(); },
    });
  }

  saveApiKey(key: string): void {
    const val = (this.apiKeyValues[key] || '').trim();
    if (!val) return;
    this.savingApiKey[key] = true;
    this.prospect.updateSetting(key, val).subscribe({
      next: () => {
        this.savingApiKey[key] = false;
        this.savedApiKey[key]  = true;
        this.apiKeyStatus[key] = true;
        this.apiKeyValues[key] = '';
        this.cdr.markForCheck();
        setTimeout(() => { this.savedApiKey[key] = false; this.cdr.markForCheck(); }, 2500);
      },
      error: () => { this.savingApiKey[key] = false; this.cdr.markForCheck(); },
    });
  }

  revokeApiKey(key: string): void {
    this.prospect.updateSetting(key, '').subscribe({
      next: () => { this.apiKeyStatus[key] = false; this.apiKeyValues[key] = ''; this.cdr.markForCheck(); },
    });
  }

  /** True si al menos uno de los campos del grupo de conexión está guardado */
  isConnected(conn: SocialConnectionGroup): boolean {
    return conn.fields.some(f => !!this.tokenStatus[f.key]);
  }

  private defaultConfig(network: string): NetworkConfig {
    const supportsImage = IMAGE_NETWORKS.has(network as Network);
    return {
      network,
      topics: '[]', tone: 'profesional', audience: '',
      post_frequency: 1, default_hashtags: '[]', extra_instructions: '',
      text_ai_model: 'claude-sonnet-4-6',
      image_ai_model: 'dalle3',
      include_image: supportsImage ? 1 : 0,
    };
  }

  loadConfig(network: Network): void {
    this.prospect.getNetworkConfigJava(network).subscribe({
      next: cfg => {
        this.configs[network] = {
          ...this.defaultConfig(network),
          ...cfg,
          topics:           cfg.topics           || '[]',
          default_hashtags: cfg.default_hashtags || '[]',
          text_ai_model:    cfg.text_ai_model    || 'claude-sonnet-4-6',
          image_ai_model:   cfg.image_ai_model   || 'dalle3',
          include_image:    cfg.include_image     ?? (IMAGE_NETWORKS.has(network) ? 1 : 0),
        };
        this.cdr.markForCheck();
      },
    });
  }

  getTopics(network: Network): string[] {
    try { return JSON.parse(this.configs[network].topics) || []; } catch { return []; }
  }

  getHashtags(network: Network): string[] {
    try { return JSON.parse(this.configs[network].default_hashtags) || []; } catch { return []; }
  }

  addTopic(network: Network, topic?: string): void {
    const val = (topic || this.topicInputs[network]).trim();
    if (!val) return;
    const existing = this.getTopics(network);
    if (!existing.includes(val)) {
      this.configs[network].topics = JSON.stringify([...existing, val]);
    }
    this.topicInputs[network] = '';
  }

  removeTopic(network: Network, topic: string): void {
    this.configs[network].topics = JSON.stringify(this.getTopics(network).filter(t => t !== topic));
  }

  addHashtag(network: Network): void {
    let val = this.hashtagInputs[network].trim();
    if (!val) return;
    if (!val.startsWith('#')) val = '#' + val;
    const existing = this.getHashtags(network);
    if (!existing.includes(val)) {
      this.configs[network].default_hashtags = JSON.stringify([...existing, val]);
    }
    this.hashtagInputs[network] = '';
  }

  removeHashtag(network: Network, tag: string): void {
    this.configs[network].default_hashtags = JSON.stringify(this.getHashtags(network).filter(t => t !== tag));
  }

  supportsImage(network: Network): boolean {
    return IMAGE_NETWORKS.has(network);
  }

  textModelLabel(key: string): string {
    return this.textModels.find(m => m.key === key)?.label || key;
  }

  imageModelLabel(key: string): string {
    return this.imageModels.find(m => m.key === key)?.label || key;
  }

  save(network: Network): void {
    this.saving = true;
    const cfg = this.configs[network];
    this.prospect.updateNetworkConfigJava(network, {
      topics:             cfg.topics,
      tone:               cfg.tone,
      audience:           cfg.audience,
      post_frequency:     cfg.post_frequency,
      default_hashtags:   cfg.default_hashtags,
      extra_instructions: cfg.extra_instructions,
      text_ai_model:      cfg.text_ai_model,
      image_ai_model:     cfg.image_ai_model,
      include_image:      cfg.include_image,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.savedNetwork = network;
        this.cdr.markForCheck();
        setTimeout(() => { this.savedNetwork = null; this.cdr.markForCheck(); }, 2500);
      },
      error: () => { this.saving = false; this.cdr.markForCheck(); },
    });
  }

  onTopicInputKeydown(event: KeyboardEvent, network: Network): void {
    if (event.key === 'Enter') { event.preventDefault(); this.addTopic(network); }
  }

  onHashtagInputKeydown(event: KeyboardEvent, network: Network): void {
    if (event.key === 'Enter') { event.preventDefault(); this.addHashtag(network); }
  }

  // ── Club branding ──────────────────────────────────────────────────────────

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.clubId) return;
    this.uploadingLogo = true;
    this.clubService.uploadClubLogo(this.clubId, file).subscribe({
      next: (res: any) => {
        const fileName = res?.data || null;
        if (fileName) this.clubLogoUrl = fileName;
        this.uploadingLogo = false;
        this.cdr.markForCheck();
      },
      error: () => { this.uploadingLogo = false; this.cdr.markForCheck(); },
    });
  }

  saveBranding(): void {
    if (!this.clubId || this.savingBranding) return;
    this.savingBranding = true;
    this.clubService.updateClubBranding(this.clubId, this.brandColor, this.altColor).subscribe({
      next: () => {
        this.savingBranding = false;
        this.savedBranding  = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.savedBranding = false; this.cdr.markForCheck(); }, 2500);
      },
      error: () => { this.savingBranding = false; this.cdr.markForCheck(); },
    });
  }

  networkIcon(network: Network): string {
    const icons: Record<Network, string> = {
      instagram: 'bi-instagram', facebook: 'bi-facebook',
      linkedin:  'bi-linkedin',  twitter:  'bi-twitter-x',
    };
    return icons[network] || 'bi-share';
  }
}
