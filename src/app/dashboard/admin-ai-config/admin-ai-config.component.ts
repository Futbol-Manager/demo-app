import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { AiConfig, AiConfigService, AiCreditConfig } from 'src/app/core/services/ai-config/ai-config.service';

interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

/** Precio por millón de tokens en euros (entrada / salida). null = sin datos oficiales. */
interface ModelPricing {
  in: number | null;
  out: number | null;
  note?: string;   // ej. "Gratis (experimental)"
}

@Component({
  selector: 'app-admin-ai-config',
  templateUrl: './admin-ai-config.component.html',
  styleUrls: ['./admin-ai-config.component.scss']
})
export class AdminAiConfigComponent implements OnInit {

  activeTab: 'models' | 'credits' = 'models';

  configs: AiConfig[] = [];
  isLoading = true;
  error = false;

  savingKey: string | null = null;
  savedKey: string | null = null;
  saveError: string | null = null;

  /** Mapa: configKey → modelo seleccionado en el dropdown */
  selectedModels: Record<string, string> = {};

  // ── Credit config ────────────────────────────────────────────────────────
  creditConfigs: AiCreditConfig[] = [];
  isLoadingCredits = false;
  creditError = false;

  /** Mapa: model → baseCredits editado (antes de guardar) */
  editedCredits: Record<string, number> = {};

  savingCreditModel: string | null = null;
  savedCreditModel: string | null = null;
  saveCreditError: string | null = null;

  /** Multiplicadores de tokens (sólo informativo, fijos en backend) */
  readonly tokenTiers = [
    { label: '< 2.000 tokens',       multiplier: '×1', example: 'Saludo, consulta simple' },
    { label: '2.000 – 9.999 tokens', multiplier: '×2', example: 'Consulta con contexto de equipo' },
    { label: '10.000 – 49.999',      multiplier: '×4', example: 'Análisis de plantilla completa' },
    { label: '≥ 50.000 tokens',      multiplier: '×8', example: 'Análisis masivo de temporada' },
  ];

  readonly openaiModels: ModelOption[] = [
    // ── GPT-5 ──
    { value: 'gpt-5',           label: '★ GPT-5',            provider: 'openai' },
    { value: 'gpt-5-mini',      label: '★ GPT-5 mini',       provider: 'openai' },
    { value: 'gpt-5-nano',      label: '★ GPT-5 nano',       provider: 'openai' },
    // ── Razonamiento (o-series) ──
    { value: 'o4-mini',         label: '★ o4 mini',          provider: 'openai' },
    { value: 'o3',              label: '★ o3',               provider: 'openai' },
    { value: 'o3-pro',          label: '★ o3 pro',           provider: 'openai' },
    { value: 'o3-mini',         label: 'o3 mini',            provider: 'openai' },
    { value: 'o1-pro',          label: 'o1 pro',             provider: 'openai' },
    { value: 'o1',              label: 'o1',                 provider: 'openai' },
    { value: 'o1-mini',         label: 'o1 mini',            provider: 'openai' },
    // ── GPT-4.1 (2025) ──
    { value: 'gpt-4.1',         label: 'GPT-4.1',            provider: 'openai' },
    { value: 'gpt-4.1-mini',    label: 'GPT-4.1 mini',       provider: 'openai' },
    { value: 'gpt-4.1-nano',    label: 'GPT-4.1 nano',       provider: 'openai' },
    // ── GPT-4o ──
    { value: 'gpt-4o',          label: 'GPT-4o',             provider: 'openai' },
    { value: 'gpt-4o-mini',     label: 'GPT-4o mini',        provider: 'openai' },
    // ── Legado ──
    { value: 'gpt-4-turbo',     label: 'GPT-4 Turbo',        provider: 'openai' },
    { value: 'gpt-4',           label: 'GPT-4',              provider: 'openai' },
    { value: 'gpt-3.5-turbo',   label: 'GPT-3.5 Turbo',      provider: 'openai' },
  ];

  readonly geminiModels: ModelOption[] = [
    // ── Gemini 3 (nov 2025) ──
    { value: 'gemini-3-pro-preview',   label: '★ Gemini 3 Pro (Preview)',   provider: 'gemini' },
    { value: 'gemini-3-flash-preview', label: '★ Gemini 3 Flash (Preview)', provider: 'gemini' },
    // ── Gemini 2.5 ──
    { value: 'gemini-2.5-pro',         label: '★ Gemini 2.5 Pro',           provider: 'gemini' },
    { value: 'gemini-2.5-flash',       label: '★ Gemini 2.5 Flash',         provider: 'gemini' },
    { value: 'gemini-2.5-flash-lite',  label: 'Gemini 2.5 Flash Lite',      provider: 'gemini' },
    // ── Gemini 2.5 Exp (anterior) ──
    { value: 'gemini-2.5-pro-exp-03-25', label: 'Gemini 2.5 Pro (Exp 03-25)', provider: 'gemini' },
    // ── Gemini 2.0 ──
    { value: 'gemini-2.0-flash',       label: 'Gemini 2.0 Flash',           provider: 'gemini' },
    { value: 'gemini-2.0-flash-lite',  label: 'Gemini 2.0 Flash Lite',      provider: 'gemini' },
    // ── Gemini 1.5 ──
    { value: 'gemini-1.5-pro',         label: 'Gemini 1.5 Pro',             provider: 'gemini' },
    { value: 'gemini-1.5-flash',       label: 'Gemini 1.5 Flash',           provider: 'gemini' },
  ];

  /**
   * Precios por millón de tokens en € (tipo de cambio: 1 USD = 0.843 €, feb 2026).
   * Fuentes: platform.openai.com/docs/pricing · ai.google.dev/gemini-api/docs/pricing
   */
  readonly pricing: Record<string, ModelPricing> = {
    // ── OpenAI GPT-5 ──────────────────────────────────
    'gpt-5':           { in: 1.48,  out: 11.81 },
    'gpt-5-mini':      { in: 0.21,  out: 1.69  },
    'gpt-5-nano':      { in: 0.04,  out: 0.34  },
    // ── OpenAI o-series ───────────────────────────────
    'o4-mini':         { in: 0.93,  out: 3.71  },
    'o3':              { in: 8.43,  out: 33.73 },
    'o3-pro':          { in: null,  out: null,  note: 'Precio no publicado' },
    'o3-mini':         { in: 0.93,  out: 3.71  },
    'o1-pro':          { in: null,  out: null,  note: 'Precio no publicado' },
    'o1':              { in: 12.64, out: 50.57 },
    'o1-mini':         { in: 2.53,  out: 10.12 },
    // ── OpenAI GPT-4.1 ───────────────────────────────
    'gpt-4.1':         { in: 1.69,  out: 6.74  },
    'gpt-4.1-mini':    { in: 0.34,  out: 1.35  },
    'gpt-4.1-nano':    { in: 0.08,  out: 0.34  },
    // ── OpenAI GPT-4o ────────────────────────────────
    'gpt-4o':          { in: 2.11,  out: 8.43  },
    'gpt-4o-mini':     { in: 0.13,  out: 0.51  },
    // ── OpenAI Legado ─────────────────────────────────
    'gpt-4-turbo':     { in: 8.43,  out: 25.30 },
    'gpt-4':           { in: 25.30, out: 50.57 },
    'gpt-3.5-turbo':   { in: 0.42,  out: 1.27  },
    // ── Gemini 3 ─────────────────────────────────────
    'gemini-3-pro-preview':   { in: 1.69, out: 10.12 },
    'gemini-3-flash-preview': { in: 0.42, out: 2.53  },
    // ── Gemini 2.5 ───────────────────────────────────
    'gemini-2.5-pro':         { in: 1.05, out: 8.43  },
    'gemini-2.5-flash':       { in: 0.25, out: 2.11  },
    'gemini-2.5-flash-lite':  { in: 0.08, out: 0.34  },
    'gemini-2.5-pro-exp-03-25': { in: null, out: null, note: 'Gratis (experimental)' },
    // ── Gemini 2.0 ───────────────────────────────────
    'gemini-2.0-flash':       { in: 0.08, out: 0.34  },
    'gemini-2.0-flash-lite':  { in: 0.06, out: 0.25  },
    // ── Gemini 1.5 ───────────────────────────────────
    'gemini-1.5-pro':         { in: 1.05, out: 4.22  },
    'gemini-1.5-flash':       { in: 0.06, out: 0.25  },
  };

  pricingFor(model: string): ModelPricing | null {
    return this.pricing[model] ?? null;
  }

  formatPrice(val: number | null): string {
    if (val === null) return '—';
    if (val < 0.01) return '< €0.01';
    return '€' + val.toFixed(2);
  }

  readonly providerIcons: Record<string, string> = {
    openai: 'bi-stars',
    gemini: 'bi-gem',
  };

  readonly providerLabels: Record<string, string> = {
    openai: 'OpenAI',
    gemini: 'Google Gemini',
  };

  readonly providerColors: Record<string, string> = {
    openai: '#10a37f',
    gemini: '#4285f4',
  };

  constructor(
    private aiConfigService: AiConfigService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadCreditConfigs();
  }

  load(): void {
    this.isLoading = true;
    this.error = false;
    this.aiConfigService.getAll().subscribe({
      next: (data) => {
        this.configs = data;
        data.forEach(c => { this.selectedModels[c.configKey] = c.model; });
        this.isLoading = false;
      },
      error: () => {
        this.error = true;
        this.isLoading = false;
      }
    });
  }

  loadCreditConfigs(): void {
    this.isLoadingCredits = true;
    this.creditError = false;
    this.aiConfigService.getAllCreditConfigs().subscribe({
      next: (data) => {
        this.creditConfigs = data;
        data.forEach(c => { this.editedCredits[c.model] = c.baseCredits; });
        this.isLoadingCredits = false;
      },
      error: () => {
        this.creditError = true;
        this.isLoadingCredits = false;
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  isCreditDirty(cfg: AiCreditConfig): boolean {
    return this.editedCredits[cfg.model] !== cfg.baseCredits;
  }

  saveCredit(cfg: AiCreditConfig): void {
    const newValue = this.editedCredits[cfg.model];
    if (!newValue || newValue < 1) return;
    this.savingCreditModel = cfg.model;
    this.savedCreditModel = null;
    this.saveCreditError = null;

    this.aiConfigService.updateCreditConfig(cfg.model, newValue).subscribe({
      next: (updated) => {
        cfg.baseCredits = updated.baseCredits;
        cfg.updatedAt = updated.updatedAt;
        this.editedCredits[cfg.model] = updated.baseCredits;
        this.savingCreditModel = null;
        this.savedCreditModel = cfg.model;
        setTimeout(() => { if (this.savedCreditModel === cfg.model) this.savedCreditModel = null; }, 2500);
      },
      error: () => {
        this.savingCreditModel = null;
        this.saveCreditError = cfg.model;
        setTimeout(() => { if (this.saveCreditError === cfg.model) this.saveCreditError = null; }, 3000);
      }
    });
  }

  /** Ejemplo de créditos con ambas variables: base × multiplicador */
  exampleCredits(baseCredits: number, multiplier: number): number {
    return Math.max(1, baseCredits * multiplier);
  }

  modelsForProvider(provider: string): ModelOption[] {
    return provider === 'gemini' ? this.geminiModels : this.openaiModels;
  }

  onProviderChange(cfg: AiConfig, newProvider: string): void {
    cfg.provider = newProvider;
    const firstModel = newProvider === 'gemini'
      ? this.geminiModels[0].value
      : this.openaiModels[0].value;
    this.selectedModels[cfg.configKey] = firstModel;
  }

  isDirty(cfg: AiConfig): boolean {
    return this.selectedModels[cfg.configKey] !== cfg.model;
  }

  save(cfg: AiConfig): void {
    const model = this.selectedModels[cfg.configKey];
    this.savingKey = cfg.configKey;
    this.savedKey = null;
    this.saveError = null;

    this.aiConfigService.update(cfg.configKey, model, cfg.provider).subscribe({
      next: (updated) => {
        cfg.model    = updated.model;
        cfg.provider = updated.provider;
        cfg.updatedAt = updated.updatedAt;
        this.selectedModels[cfg.configKey] = updated.model;
        this.savingKey = null;
        this.savedKey = cfg.configKey;
        setTimeout(() => { if (this.savedKey === cfg.configKey) this.savedKey = null; }, 2500);
      },
      error: () => {
        this.savingKey = null;
        this.saveError = cfg.configKey;
        setTimeout(() => { if (this.saveError === cfg.configKey) this.saveError = null; }, 3000);
      }
    });
  }

  labelFor(model: string): string {
    return [...this.openaiModels, ...this.geminiModels].find(m => m.value === model)?.label ?? model;
  }
}
