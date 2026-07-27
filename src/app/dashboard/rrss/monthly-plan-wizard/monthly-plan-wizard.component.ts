import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';

interface NetworkConfig {
  network:      string;
  label:        string;
  icon:         string;
  enabled:      boolean;
  postsPerDay:  number;
  threadRatio:  number;
}

interface ContentMix {
  features: number;
  stories:  number;
  tips:     number;
  data:     number;
  cta:      number;
}

@Component({
  selector: 'app-monthly-plan-wizard',
  templateUrl: './monthly-plan-wizard.component.html',
  styleUrls: ['./monthly-plan-wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyPlanWizardComponent implements OnInit {
  @Output() closed   = new EventEmitter<void>();
  @Output() planDone = new EventEmitter<number>();  // número de posts creados

  step = 1;

  // ── Step 1: Período y redes ──────────────────────────────────────────────
  startDate = '';
  endDate   = '';

  networks: NetworkConfig[] = [
    { network: 'twitter',   label: 'Twitter / X',  icon: '𝕏',  enabled: true,  postsPerDay: 2, threadRatio: 0.3 },
    { network: 'linkedin',  label: 'LinkedIn',      icon: 'in', enabled: true,  postsPerDay: 1, threadRatio: 0 },
    { network: 'instagram', label: 'Instagram',     icon: '📸', enabled: true,  postsPerDay: 1, threadRatio: 0 },
    { network: 'facebook',  label: 'Facebook',      icon: 'f',  enabled: false, postsPerDay: 1, threadRatio: 0 },
  ];

  times = ['12:00', '20:00'];

  get estimatedPosts(): number {
    const days = this.daysBetween(this.startDate, this.endDate);
    if (days <= 0) return 0;
    return this.networks
      .filter(n => n.enabled)
      .reduce((acc, n) => acc + days * Math.min(n.postsPerDay, this.times.length), 0);
  }

  // ── Step 2: Mix de contenido ─────────────────────────────────────────────
  mix: ContentMix = { features: 30, stories: 20, tips: 20, data: 15, cta: 15 };

  readonly mixLabels: { key: keyof ContentMix; label: string; emoji: string }[] = [
    { key: 'features', label: 'Funcionalidades del producto', emoji: '🚀' },
    { key: 'stories',  label: 'Historias de éxito',           emoji: '📖' },
    { key: 'tips',     label: 'Tips y consejos',              emoji: '💡' },
    { key: 'data',     label: 'Datos del sector',             emoji: '📊' },
    { key: 'cta',      label: 'Call to action / demo',        emoji: '🎯' },
  ];

  get mixTotal(): number {
    return Object.values(this.mix).reduce((a, b) => a + b, 0);
  }

  get mixValid(): boolean {
    return this.mixTotal === 100;
  }

  extraContext = '';
  tone = 'cercano';
  readonly tones = [
    { key: 'cercano',    label: 'Cercano y conversacional' },
    { key: 'formal',     label: 'Formal y profesional'    },
    { key: 'inspirador', label: 'Inspirador y motivacional'},
    { key: 'humor',      label: 'Con humor y cercanía'    },
  ];

  // ── Step 3: Generando ────────────────────────────────────────────────────
  generating   = false;
  generated    = false;
  createdCount = 0;
  genErrors: string[] = [];

  constructor(private prospect: ProspectService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    this.startDate = this.toDateStr(today);
    this.endDate   = this.toDateStr(nextMonth);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  daysBetween(a: string, b: string): number {
    if (!a || !b) return 0;
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return Math.max(0, Math.round(ms / 86_400_000) + 1);
  }

  get step1Valid(): boolean {
    return !!this.startDate && !!this.endDate &&
           this.endDate >= this.startDate &&
           this.networks.some(n => n.enabled);
  }

  get step2Valid(): boolean {
    return this.mixValid;
  }

  normalizeMix(): void {
    const total = this.mixTotal;
    if (total === 0) return;
    const keys = Object.keys(this.mix) as (keyof ContentMix)[];
    let sum = 0;
    keys.forEach((k, i) => {
      if (i < keys.length - 1) {
        const v = Math.round(this.mix[k] * 100 / total);
        this.mix[k] = v;
        sum += v;
      } else {
        this.mix[k] = 100 - sum;
      }
    });
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  nextStep(): void {
    if (this.step === 1 && this.step1Valid) this.step = 2;
    else if (this.step === 2 && this.step2Valid) this.generate();
  }

  prevStep(): void {
    if (this.step > 1 && !this.generating) this.step--;
  }

  close(): void {
    this.closed.emit();
  }

  // ── Generación ────────────────────────────────────────────────────────────
  generate(): void {
    this.step = 3;
    this.generating  = true;
    this.generated   = false;
    this.genErrors   = [];
    this.createdCount = 0;

    const payload = {
      start_date:    this.startDate,
      end_date:      this.endDate,
      times:         this.times,
      networks:      this.networks
        .filter(n => n.enabled)
        .map(n => ({
          network:      n.network,
          posts_per_day: n.postsPerDay,
          thread_ratio:  n.threadRatio,
        })),
      content_mix:   { ...this.mix },
      tone:          this.tone,
      extra_context: this.extraContext,
    };

    this.prospect.generateMonthlyPlan(payload).subscribe({
      next: (res) => {
        this.generating   = false;
        this.generated    = true;
        this.createdCount = res.created;
        this.genErrors    = res.errors || [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.generating = false;
        this.genErrors  = [err?.error?.detail || 'Error al generar el plan. Inténtalo de nuevo.'];
        this.cdr.markForCheck();
      },
    });
  }

  finish(): void {
    this.planDone.emit(this.createdCount);
    this.closed.emit();
  }
}
