import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import {
  ScheduleBlock,
  ScheduleBundle,
  TrainingScheduleService
} from 'src/app/core/services/training-schedule/training-schedule.service';

interface CategoryOption {
  code: string;
  label: string;
  color: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { code: 'WARMUP',     label: 'Calentamiento',     color: '#f59e0b' },
  { code: 'MOBILITY',   label: 'Movilidad',         color: '#fbbf24' },
  { code: 'TECHNICAL',  label: 'Técnico',           color: '#3b82f6' },
  { code: 'TACTICAL',   label: 'Táctico',           color: '#6366f1' },
  { code: 'STRENGTH',   label: 'Fuerza',            color: '#ef4444' },
  { code: 'INDIVIDUAL', label: 'Individualizado',   color: '#8b5cf6' },
  { code: 'COOLDOWN',   label: 'Vuelta a la calma', color: '#10b981' },
  { code: 'OTHER',      label: 'Otros',             color: '#64748b' }
];

type BlockRow = ScheduleBlock & {
  saving?: boolean;
  // hora calculada para mostrar (no se persiste; sale de startTime de la sesión + duraciones previas).
  computedStart?: string;
};

/**
 * Editor de bloques de horario para una sesión de entrenamiento (Fase 2.3,
 * Modo Profesional). Se inserta en el modal de sesión existente y solo se
 * activa cuando hay un {@code sessionId > 0} y el club tiene Modo
 * Profesional activo (gating decidido por el componente padre).
 *
 * <p>UX:</p>
 * <ul>
 *   <li>Lista ordenada de bloques con categoría, título, hora y duración.</li>
 *   <li>Cabecera con totales: número de bloques, duración acumulada y rango
 *       horario calculado (si la sesión tiene {@code startTime}).</li>
 *   <li>Botón "Añadir bloque" → fila editable in-line.</li>
 *   <li>Mover arriba/abajo + eliminar inline.</li>
 *   <li>Guardado autónomo (autosave on blur/change), sin botones globales.</li>
 * </ul>
 */
@Component({
  selector: 'app-training-schedule-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="schedule-editor" *ngIf="sessionId && sessionId > 0">
      <div class="editor-head">
        <div class="head-left">
          <div class="head-title">
            <i class="bi bi-list-task"></i>
            <span>Bloques de la sesión</span>
          </div>
          <div class="head-meta" *ngIf="!loading">
            <span class="badge-meta"><i class="bi bi-stack"></i>{{ rows.length }} bloques</span>
            <span class="badge-meta"><i class="bi bi-stopwatch"></i>{{ formatDuration(totalDurationMin) }}</span>
            <span class="badge-meta" *ngIf="bundle?.startTime as st">
              <i class="bi bi-clock"></i>{{ st }}<span *ngIf="bundle?.endTime"> – {{ bundle?.endTime }}</span>
            </span>
          </div>
        </div>
        <button type="button" class="btn btn-add" (click)="addBlock()" [disabled]="adding || loading">
          <i class="bi bi-plus-lg"></i>
          <span>Añadir bloque</span>
        </button>
      </div>

      <div *ngIf="loading" class="empty-state">
        <div class="spinner-border spinner-border-sm" role="status"></div>
        <span class="ms-2">Cargando bloques…</span>
      </div>

      <div *ngIf="!loading && rows.length === 0 && !adding" class="empty-state">
        <i class="bi bi-clipboard-x"></i>
        <span>Aún no hay bloques en esta sesión. Crea el primero para construir la línea de tiempo.</span>
      </div>

      <ul class="block-list" *ngIf="!loading && (rows.length > 0 || adding)">
        <li *ngFor="let row of rows; let i = index; trackBy: trackByBlock"
            class="block-row"
            [style.--cat-color]="categoryColor(row.category)">
          <div class="block-index">{{ i + 1 }}</div>
          <div class="block-time">
            <input type="time" class="form-control form-control-sm" [value]="row.startTime || row.computedStart || ''"
                   (change)="onStartTimeChange(row, $event)" [disabled]="row.saving">
          </div>
          <div class="block-cat">
            <select class="form-select form-select-sm" [value]="row.category"
                    (change)="onCategoryChange(row, $event)" [disabled]="row.saving">
              <option *ngFor="let c of categories" [value]="c.code">{{ c.label }}</option>
            </select>
          </div>
          <div class="block-title">
            <input type="text" class="form-control form-control-sm" [value]="row.title"
                   (change)="onTitleChange(row, $event)" [disabled]="row.saving" placeholder="Título del bloque">
          </div>
          <div class="block-duration">
            <input type="number" min="1" max="240" class="form-control form-control-sm"
                   [value]="row.durationMin"
                   (change)="onDurationChange(row, $event)" [disabled]="row.saving">
            <span class="unit">min</span>
          </div>
          <div class="block-notes">
            <input type="text" class="form-control form-control-sm" [value]="row.notes || ''"
                   (change)="onNotesChange(row, $event)" [disabled]="row.saving" placeholder="Notas (opcional)">
          </div>
          <div class="block-actions">
            <button type="button" class="btn-icon" title="Subir" (click)="moveUp(i)" [disabled]="i === 0 || row.saving">
              <i class="bi bi-arrow-up"></i>
            </button>
            <button type="button" class="btn-icon" title="Bajar" (click)="moveDown(i)"
                    [disabled]="i === rows.length - 1 || row.saving">
              <i class="bi bi-arrow-down"></i>
            </button>
            <button type="button" class="btn-icon btn-icon-danger" title="Eliminar"
                    (click)="deleteBlock(row)" [disabled]="row.saving">
              <i class="bi bi-trash"></i>
            </button>
            <span class="saving-dot" *ngIf="row.saving" title="Guardando…">
              <i class="bi bi-arrow-repeat"></i>
            </span>
          </div>
        </li>

        <li *ngIf="adding" class="block-row block-row--draft">
          <div class="block-index">{{ rows.length + 1 }}</div>
          <div class="block-time">
            <input type="time" class="form-control form-control-sm" [(ngModel)]="draft.startTime">
          </div>
          <div class="block-cat">
            <select class="form-select form-select-sm" [(ngModel)]="draft.category">
              <option *ngFor="let c of categories" [value]="c.code">{{ c.label }}</option>
            </select>
          </div>
          <div class="block-title">
            <input type="text" class="form-control form-control-sm" [(ngModel)]="draft.title" placeholder="Título del bloque">
          </div>
          <div class="block-duration">
            <input type="number" min="1" max="240" class="form-control form-control-sm" [(ngModel)]="draft.durationMin">
            <span class="unit">min</span>
          </div>
          <div class="block-notes">
            <input type="text" class="form-control form-control-sm" [(ngModel)]="draft.notes" placeholder="Notas (opcional)">
          </div>
          <div class="block-actions">
            <button type="button" class="btn-icon btn-icon-confirm" title="Confirmar" (click)="confirmAdd()" [disabled]="creating">
              <i class="bi bi-check-lg"></i>
            </button>
            <button type="button" class="btn-icon" title="Cancelar" (click)="cancelAdd()" [disabled]="creating">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .schedule-editor {
      margin-top: 1.25rem;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .editor-head {
      display: flex; justify-content: space-between; align-items: center;
      gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem;
    }
    .head-title { font-weight: 600; color: #002c40; display:flex; align-items:center; gap:.5rem; }
    .head-title i { color: #31b270; }
    .head-meta { display: flex; gap: .5rem; flex-wrap: wrap; margin-top:.25rem; }
    .badge-meta {
      background:#fff; border:1px solid #e2e8f0; border-radius: 999px;
      padding: 2px 10px; font-size: .8rem; color:#475569; display:inline-flex; align-items:center; gap:.35rem;
    }
    .btn-add {
      background:#31b270; color:#fff; border:none; border-radius: 8px;
      padding: 6px 14px; font-weight: 500; display:inline-flex; align-items:center; gap:.4rem;
    }
    .btn-add:disabled { background:#94a3b8; }
    .empty-state {
      display:flex; align-items:center; gap:.5rem; padding:1rem; background:#fff;
      border:1px dashed #cbd5e1; border-radius: 8px; color:#64748b;
    }
    .empty-state i { font-size: 1.1rem; }
    .block-list { list-style:none; margin: 0; padding: 0; display:flex; flex-direction:column; gap:.5rem; }
    .block-row {
      display: grid;
      grid-template-columns: 36px 110px 160px 1fr 120px 1fr 130px;
      align-items: center; gap: .5rem;
      padding: .5rem .6rem;
      background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid var(--cat-color, #64748b);
      border-radius: 8px;
    }
    .block-row--draft { background: #f0fdf4; border-left-color:#31b270; }
    .block-index {
      width: 28px; height: 28px; display:flex; align-items:center; justify-content:center;
      border-radius: 50%; background: var(--cat-color, #64748b); color:#fff; font-weight:600; font-size:.85rem;
    }
    .block-duration { display:flex; align-items:center; gap:.3rem; }
    .block-duration .unit { font-size:.75rem; color:#94a3b8; }
    .block-actions { display:flex; gap:.25rem; align-items:center; justify-content:flex-end; }
    .btn-icon {
      width: 30px; height: 30px; display:inline-flex; align-items:center; justify-content:center;
      border:1px solid #e2e8f0; background:#fff; border-radius: 6px; color:#475569;
    }
    .btn-icon:hover { background:#f1f5f9; }
    .btn-icon:disabled { opacity:.4; cursor:not-allowed; }
    .btn-icon-danger { color:#ef4444; }
    .btn-icon-danger:hover { background:#fef2f2; }
    .btn-icon-confirm { color:#31b270; border-color:#bbf7d0; }
    .btn-icon-confirm:hover { background:#dcfce7; }
    .saving-dot { color:#3b82f6; font-size:.95rem; }
    .saving-dot i { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

    @media (max-width: 991px) {
      .block-row {
        grid-template-columns: 28px 1fr 1fr;
        grid-template-areas:
          "i cat cat"
          "i title title"
          "i time dur"
          "i notes notes"
          "i actions actions";
      }
      .block-index { grid-area: i; }
      .block-cat { grid-area: cat; }
      .block-title { grid-area: title; }
      .block-time { grid-area: time; }
      .block-duration { grid-area: dur; }
      .block-notes { grid-area: notes; }
      .block-actions { grid-area: actions; }
    }
  `]
})
export class TrainingScheduleEditorComponent implements OnInit, OnChanges {

  @Input() sessionId: number = 0;
  /** Hora de inicio de la sesión, opcional. Si la pasa el padre la usamos
   *  para calcular la hora de cada bloque cuando no tienen {@code startTime}
   *  explícito. */
  @Input() sessionStartTime: string | null = null;
  @Input() userId: number | null = null;
  @Input() userName: string | null = null;

  readonly categories = CATEGORY_OPTIONS;

  bundle: ScheduleBundle | null = null;
  rows: BlockRow[] = [];
  loading = false;

  adding = false;
  creating = false;
  draft: {
    category: string;
    title: string;
    startTime: string | null;
    durationMin: number;
    notes: string | null;
  } = this.emptyDraft();

  totalDurationMin = 0;

  private scheduleService = inject(TrainingScheduleService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (this.sessionId && this.sessionId > 0) this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sessionId'] && !changes['sessionId'].firstChange) {
      const newId = Number(changes['sessionId'].currentValue) || 0;
      if (newId > 0) this.load();
      else this.reset();
    }
  }

  reset(): void {
    this.rows = [];
    this.bundle = null;
    this.totalDurationMin = 0;
    this.adding = false;
    this.draft = this.emptyDraft();
    this.cdr.markForCheck();
  }

  private load(): void {
    if (!this.sessionId) return;
    this.loading = true;
    this.cdr.markForCheck();
    this.scheduleService.getBySession(this.sessionId).subscribe({
      next: bundle => {
        this.bundle = bundle;
        this.rows = (bundle.blocks || []).map(b => ({ ...b }));
        this.totalDurationMin = bundle.totalDurationMin || this.recomputeTotal();
        this.recomputeTimes();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.cdr.markForCheck();
        if (err?.status === 403) {
          // El padre debería ocultar el editor si proMode está OFF.
          // Por seguridad, reseteamos.
          this.reset();
          return;
        }
        this.toastr.error('No se han podido cargar los bloques de la sesión');
      }
    });
  }

  // ─── Add ──────────────────────────────────────────────────────────

  addBlock(): void {
    if (this.adding || this.loading) return;
    this.adding = true;
    this.draft = this.emptyDraft();
    // Sugerencia de hora: a partir del último bloque o del startTime de la sesión.
    const last = this.rows.length > 0 ? this.rows[this.rows.length - 1] : null;
    if (last) {
      this.draft.startTime = this.addMinutes(
        last.startTime || last.computedStart || this.sessionStartTime || '',
        last.durationMin || 0
      );
    } else if (this.sessionStartTime) {
      this.draft.startTime = this.sessionStartTime;
    }
    this.cdr.markForCheck();
  }

  cancelAdd(): void {
    this.adding = false;
    this.draft = this.emptyDraft();
    this.cdr.markForCheck();
  }

  confirmAdd(): void {
    if (this.creating) return;
    const title = (this.draft.title || '').trim();
    if (!title) {
      this.toastr.warning('Pon un título al bloque');
      return;
    }
    const dur = Number(this.draft.durationMin) || 0;
    if (dur <= 0) {
      this.toastr.warning('La duración debe ser mayor que 0');
      return;
    }
    this.creating = true;
    this.cdr.markForCheck();
    this.scheduleService.create(this.sessionId, {
      title,
      category: this.draft.category || 'OTHER',
      durationMin: dur,
      startTime: this.draft.startTime || null,
      notes: this.draft.notes || null,
      createdByUserId: this.userId ?? null,
      createdByName: this.userName ?? null
    }).subscribe({
      next: created => {
        this.rows = [...this.rows, { ...created }];
        this.totalDurationMin = this.recomputeTotal();
        this.recomputeTimes();
        this.adding = false;
        this.creating = false;
        this.draft = this.emptyDraft();
        this.cdr.markForCheck();
      },
      error: () => {
        this.creating = false;
        this.cdr.markForCheck();
        this.toastr.error('No se ha podido crear el bloque');
      }
    });
  }

  // ─── Edit handlers ────────────────────────────────────────────────

  onCategoryChange(row: BlockRow, ev: Event): void {
    const v = (ev.target as HTMLSelectElement).value;
    this.persist(row, { category: v });
  }
  onTitleChange(row: BlockRow, ev: Event): void {
    const v = (ev.target as HTMLInputElement).value || '';
    if (!v.trim()) {
      this.toastr.warning('El título no puede quedar vacío');
      (ev.target as HTMLInputElement).value = row.title;
      return;
    }
    this.persist(row, { title: v.trim() });
  }
  onStartTimeChange(row: BlockRow, ev: Event): void {
    const v = (ev.target as HTMLInputElement).value || '';
    this.persist(row, { startTime: v || null });
  }
  onDurationChange(row: BlockRow, ev: Event): void {
    const raw = (ev.target as HTMLInputElement).value;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      this.toastr.warning('La duración debe ser mayor que 0');
      (ev.target as HTMLInputElement).value = String(row.durationMin || '');
      return;
    }
    this.persist(row, { durationMin: Math.round(n) });
  }
  onNotesChange(row: BlockRow, ev: Event): void {
    const v = (ev.target as HTMLInputElement).value || '';
    this.persist(row, { notes: v || null });
  }

  private persist(row: BlockRow, patch: Partial<ScheduleBlock>): void {
    row.saving = true;
    this.cdr.markForCheck();
    this.scheduleService.update(row.blockId, patch as any).subscribe({
      next: updated => {
        Object.assign(row, updated);
        row.saving = false;
        this.totalDurationMin = this.recomputeTotal();
        this.recomputeTimes();
        this.cdr.markForCheck();
      },
      error: () => {
        row.saving = false;
        this.cdr.markForCheck();
        this.toastr.error('No se han podido guardar los cambios');
      }
    });
  }

  // ─── Reorder ──────────────────────────────────────────────────────

  moveUp(i: number): void {
    if (i <= 0) return;
    const next = [...this.rows];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    this.commitReorder(next);
  }
  moveDown(i: number): void {
    if (i >= this.rows.length - 1) return;
    const next = [...this.rows];
    [next[i + 1], next[i]] = [next[i], next[i + 1]];
    this.commitReorder(next);
  }

  private commitReorder(next: BlockRow[]): void {
    const prev = this.rows;
    this.rows = next.map((r, idx) => ({ ...r, blockOrder: idx }));
    this.recomputeTimes();
    this.cdr.markForCheck();
    this.scheduleService.reorder(this.sessionId, this.rows.map(r => r.blockId)).subscribe({
      error: () => {
        this.rows = prev;
        this.cdr.markForCheck();
        this.toastr.error('No se ha podido reordenar');
      }
    });
  }

  // ─── Delete ──────────────────────────────────────────────────────

  deleteBlock(row: BlockRow): void {
    if (!confirm('¿Eliminar este bloque?')) return;
    row.saving = true;
    this.cdr.markForCheck();
    this.scheduleService.delete(row.blockId).subscribe({
      next: () => {
        this.rows = this.rows.filter(r => r.blockId !== row.blockId);
        this.totalDurationMin = this.recomputeTotal();
        this.recomputeTimes();
        this.cdr.markForCheck();
      },
      error: () => {
        row.saving = false;
        this.cdr.markForCheck();
        this.toastr.error('No se ha podido eliminar el bloque');
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  trackByBlock(_i: number, row: BlockRow): number { return row.blockId; }

  categoryColor(code: string): string {
    const c = this.categories.find(x => x.code === code);
    return c?.color || '#64748b';
  }

  formatDuration(min: number): string {
    if (!min) return '0 min';
    if (min < 60) return min + ' min';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? h + ' h' : h + ' h ' + m + ' min';
  }

  private recomputeTotal(): number {
    return this.rows.reduce((acc, r) => acc + (Number(r.durationMin) || 0), 0);
  }

  /**
   * Si la sesión tiene hora de inicio, calcula la hora teórica de cada
   * bloque que no tenga {@code startTime} explícito sumando duraciones
   * previas. Solo es presentación.
   */
  private recomputeTimes(): void {
    let cursor = this.bundle?.startTime || this.sessionStartTime || null;
    for (const r of this.rows) {
      if (r.startTime) {
        cursor = this.addMinutes(r.startTime, r.durationMin || 0);
        r.computedStart = r.startTime;
      } else {
        r.computedStart = cursor || undefined;
        cursor = this.addMinutes(cursor || '', r.durationMin || 0);
      }
    }
  }

  private addMinutes(hhmm: string, mins: number): string {
    if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return hhmm || '';
    const [hStr, mStr] = hhmm.split(':');
    let total = (Number(hStr) || 0) * 60 + (Number(mStr) || 0) + (mins || 0);
    total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  private emptyDraft() {
    return {
      category: 'WARMUP',
      title: '',
      startTime: null as string | null,
      durationMin: 15,
      notes: null as string | null
    };
  }
}
