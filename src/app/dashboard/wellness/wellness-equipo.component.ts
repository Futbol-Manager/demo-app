import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { WellnessService } from 'src/app/core/services/wellness/wellness.service';
import {
  WellnessField,
  WellnessTeamRow,
  WellnessTemplate,
  WellnessTemplateSchema,
  parseTemplateSchema
} from 'src/app/core/services/wellness/wellness.model';

/**
 * Panel del staff (fisio / médico / coach) para revisar el wellness diario del equipo.
 * Muestra una tabla con un semáforo por jugador y permite cambiar la fecha.
 *
 * Ruta: /dashboard/wellness-equipo/:teamId
 */
@Component({
  selector: 'app-wellness-equipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wellness-page">

      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="table-title">
            <i class="bi bi-heart-pulse me-2"></i>Wellness diario
          </h2>
          <p class="header-subtitle">Estado del equipo · {{ formattedDate }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Filtros -->
        <div class="filters-card">
          <div class="filter-block">
            <label class="filter-label">Fecha</label>
            <input type="date" class="form-control filter-date" [value]="selectedDate"
                   (change)="onDateChange($event)" />
          </div>
          <div class="filter-block kpi-block" *ngIf="!loading">
            <div class="kpi kpi-green" title="En verde">
              <i class="bi bi-check-circle-fill"></i> {{ countByRisk('green') }}
            </div>
            <div class="kpi kpi-yellow" title="Atención">
              <i class="bi bi-exclamation-triangle-fill"></i> {{ countByRisk('yellow') }}
            </div>
            <div class="kpi kpi-red" title="Alerta">
              <i class="bi bi-exclamation-octagon-fill"></i> {{ countByRisk('red') }}
            </div>
            <div class="kpi kpi-pending" title="Sin rellenar">
              <i class="bi bi-hourglass-split"></i> {{ pendingCount }}
            </div>
          </div>
          <div class="filter-block">
            <button class="btn btn-outline-primary btn-sm" (click)="reload()" [disabled]="loading">
              <i class="bi bi-arrow-clockwise"></i> Actualizar
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="empty-state">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 mb-0">Cargando wellness…</p>
        </div>

        <!-- Sin plantilla -->
        <div *ngIf="!loading && !schema" class="empty-state empty-warn">
          <i class="bi bi-exclamation-triangle display-5 mb-2"></i>
          <p>No se ha podido cargar la plantilla de wellness para este club.</p>
        </div>

        <!-- Tabla principal -->
        <div *ngIf="!loading && schema" class="wellness-table-wrapper">
          <table class="wellness-table">
            <thead>
              <tr>
                <th class="col-status">Estado</th>
                <th class="col-name">Jugador</th>
                <th *ngFor="let f of scaleFields" class="col-scale">
                  <span [title]="f.label">{{ shortLabel(f.label) }}</span>
                </th>
                <th *ngFor="let f of selectFields" class="col-select">
                  <span [title]="f.label">{{ shortLabel(f.label) }}</span>
                </th>
                <th class="col-comments">Comentarios</th>
                <th class="col-time">Hora</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows; trackBy: trackByUser">
                <td class="col-status">
                  <span [class]="riskBadge(row.riskLevel)">{{ riskLabel(row.riskLevel) }}</span>
                </td>
                <td class="col-name">{{ row.nombre }}</td>
                <td *ngFor="let f of scaleFields" class="col-scale" [class]="cellRisk(row, f)">
                  {{ formatValue(row.values[f.id]) }}
                </td>
                <td *ngFor="let f of selectFields" class="col-select">
                  {{ formatValue(row.values[f.id]) }}
                </td>
                <td class="col-comments" [title]="row.comments || ''">
                  <span *ngIf="row.comments" class="comment-text">{{ row.comments }}</span>
                  <span *ngIf="!row.comments" class="text-muted">—</span>
                </td>
                <td class="col-time">{{ formatTime(row.createdAt) }}</td>
              </tr>
              <tr *ngIf="rows.length === 0">
                <td [attr.colspan]="3 + scaleFields.length + selectFields.length + 1" class="empty-row">
                  No hay respuestas para esta fecha.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Sphaira brand palette ──────────────────────────────────────
       Navy: #002c40 · Green: #31b270 · Green light: #c4e8d6
       Gray text: #636363 · Bg highlight: #f4f4f4 · White: #ffffff
       Warning: #b07b00 · Danger: #b1231b
       Tipografía: Plus Jakarta Sans
       ──────────────────────────────────────────────────────────────── */
    :host { display: block; }
    .wellness-page {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background:
        radial-gradient(1200px 320px at 85% -120px, rgba(49,178,112,0.10), transparent 70%),
        #f3f6f8;
      min-height: 100vh;
      padding-bottom: 28px;
    }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 18px; gap: 12px;
      background: #ffffff;
      border-bottom: 1px solid #e9eef1;
      position: relative;
    }
    /* Filete de marca: verde → navy */
    .page-header::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
      background: linear-gradient(90deg, #31b270 0%, #002c40 100%);
    }
    .header-center { text-align: center; flex: 1; }
    .table-title {
      margin: 0; font-weight: 800; color: #002c40; font-size: 1.5rem;
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    }
    .table-title i {
      display: inline-flex; align-items: center; justify-content: center;
      width: 38px; height: 38px; border-radius: 12px; margin: 0 !important;
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%);
      color: #ffffff; font-size: 1.05rem;
      box-shadow: 0 6px 16px rgba(49,178,112,0.35);
    }
    .header-subtitle {
      margin: 8px 0 0; color: #5b6b75; font-size: 0.92rem; font-weight: 500;
      text-transform: capitalize;
    }
    .btn-back-clean {
      display: inline-flex; align-items: center; gap: 6px;
      background: #ffffff; border: 1px solid #dbe4e9;
      color: #002c40; padding: 8px 14px; border-radius: 10px;
      font-weight: 600; cursor: pointer; font-size: 0.9rem;
      transition: all .15s ease;
    }
    .btn-back-clean:hover {
      background: #002c40; border-color: #002c40; color: #ffffff;
      transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,44,64,0.18);
    }
    .page-header-spacer { width: 110px; }

    .filters-card {
      display: flex; flex-wrap: wrap; gap: 18px; align-items: end;
      padding: 18px 20px; background: #ffffff; border: 1px solid #e9eef1; border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 44, 64, 0.06);
      margin-top: 20px;
    }
    .filter-block { display: flex; flex-direction: column; gap: 6px; }
    .filter-label {
      font-size: 11px; color: #7c8a93; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
    }
    .filter-date {
      max-width: 190px; border-radius: 10px; border: 1px solid #dbe4e9;
      padding: 8px 12px; font-weight: 600; color: #002c40;
    }
    .filter-date:focus {
      outline: none; border-color: #31b270;
      box-shadow: 0 0 0 3px rgba(49,178,112,0.18);
    }
    .kpi-block { flex-direction: row; gap: 10px; align-items: center; flex-wrap: wrap; margin-left: auto; }
    .kpi {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: 999px; font-size: 0.92rem; font-weight: 800;
      box-shadow: 0 2px 8px rgba(0,44,64,0.05);
      transition: transform .15s ease;
    }
    .kpi:hover { transform: translateY(-1px); }
    .kpi i { font-size: 0.95rem; }
    .kpi-green   { background: #c4e8d6; color: #15663f; }
    .kpi-yellow  { background: rgba(176, 123, 0, 0.15); color: #8a6100; }
    .kpi-red     { background: rgba(177, 35, 27, 0.12); color: #b1231b; }
    .kpi-pending { background: #eef2f4; color: #5b6b75; border: 1px dashed #c4cfd6; box-shadow: none; }

    .btn-outline-primary, .btn.btn-outline-primary {
      display: inline-flex; align-items: center; gap: 6px;
      color: #ffffff; border: none;
      background: linear-gradient(135deg, #31b270 0%, #259a5d 100%);
      border-radius: 10px; padding: 9px 16px; font-weight: 700; font-size: 0.9rem;
      box-shadow: 0 6px 16px rgba(49,178,112,0.30); transition: all .15s ease;
    }
    .btn-outline-primary:hover, .btn.btn-outline-primary:hover {
      background: linear-gradient(135deg, #2aa566 0%, #002c40 100%);
      color: #ffffff; transform: translateY(-1px);
      box-shadow: 0 10px 22px rgba(0,44,64,0.22);
    }
    .btn-outline-primary:disabled { opacity: .6; transform: none; box-shadow: none; }

    .empty-state {
      padding: 56px 16px; text-align: center; color: #5b6b75;
      background: #ffffff; border: 1px solid #e9eef1; border-radius: 16px; margin-top: 20px;
      box-shadow: 0 8px 24px rgba(0, 44, 64, 0.05);
    }
    .empty-state .spinner-border { color: #31b270 !important; }
    .empty-warn { color: #8a6100; }
    .empty-warn i { color: #b58900; }

    .wellness-table-wrapper {
      margin-top: 20px; background: #ffffff; border: 1px solid #e9eef1;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 44, 64, 0.06);
      /* Sticky header necesita un contenedor con altura limitada y overflow */
      max-height: calc(100vh - 280px); min-height: 320px;
      overflow: auto;
    }
    .wellness-table {
      width: 100%; border-collapse: separate; border-spacing: 0; min-width: 760px;
    }
    .wellness-table th, .wellness-table td {
      padding: 13px 16px; text-align: left; border-bottom: 1px solid #eef2f4;
      font-size: 0.92rem;
    }
    .wellness-table thead th {
      background: #f1f5f7; font-weight: 800; color: #002c40;
      position: sticky; top: 0; z-index: 2;
      text-transform: uppercase; font-size: 11px; letter-spacing: .05em;
      border-bottom: 2px solid #dde6ea;
    }
    .wellness-table tbody tr { transition: background .12s ease; }
    .wellness-table tbody tr:nth-child(even) { background: #fafcfd; }
    .wellness-table tbody tr:hover { background: #eafaf1; }
    .col-status { width: 120px; }
    .col-scale {
      width: 70px; text-align: center; font-variant-numeric: tabular-nums;
      font-weight: 700; color: #002c40;
    }
    .col-time { width: 80px; color: #7c8a93; font-variant-numeric: tabular-nums; }
    .col-comments { color: #5b6b75; }
    .col-select {
      width: 130px; text-align: center; color: #002c40; font-weight: 600;
      text-transform: uppercase; font-size: 0.82rem; letter-spacing: .02em;
    }
    .col-name { font-weight: 700; color: #002c40; }
    .comment-text {
      display: inline-block; max-width: 240px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .empty-row { text-align: center; color: #8a98a1; padding: 40px; font-style: italic; }

    .risk-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .risk-badge::before {
      content: ''; width: 7px; height: 7px; border-radius: 50%;
      background: currentColor; opacity: .85;
    }
    .risk-green  { background: #c4e8d6; color: #15663f; }
    .risk-yellow { background: rgba(176, 123, 0, 0.18); color: #8a6100; }
    .risk-red    { background: rgba(177, 35, 27, 0.15); color: #b1231b; }

    .cell-red    { background: rgba(177, 35, 27, 0.10); color: #b1231b; font-weight: 800; border-radius: 6px; }
    .cell-yellow { background: rgba(176, 123, 0, 0.12); color: #8a6100; font-weight: 700; border-radius: 6px; }
    .cell-green  { color: #002c40; }

    /* ── Dark mode (navy-deep Sphaira) ───────────────────────────── */
    :host-context(body.dark) .wellness-page {
      background:
        radial-gradient(1200px 320px at 85% -120px, rgba(49,178,112,0.12), transparent 70%),
        #00131c;
    }
    :host-context(body.dark) .page-header,
    :host-context(body.dark) .filters-card,
    :host-context(body.dark) .wellness-table-wrapper,
    :host-context(body.dark) .empty-state {
      background: #001e2e; border-color: #00405c; color: #c4e8d6;
    }
    :host-context(body.dark) .btn-back-clean { background: #00283a; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .btn-back-clean:hover { background: #31b270; border-color: #31b270; color: #ffffff; }
    :host-context(body.dark) .filter-date { background: #00283a; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .table-title,
    :host-context(body.dark) .col-name,
    :host-context(body.dark) .col-select,
    :host-context(body.dark) .col-scale { color: #c4e8d6; }
    :host-context(body.dark) .header-subtitle { color: #8fb3a6; }
    :host-context(body.dark) .wellness-table thead th {
      background: #002c40; color: #c4e8d6; border-bottom-color: #00405c;
    }
    :host-context(body.dark) .wellness-table tbody tr:nth-child(even) { background: #00263a; }
    :host-context(body.dark) .wellness-table tbody tr:hover { background: #013049; }
    :host-context(body.dark) .kpi-pending { background: #00283a; color: #8fb3a6; border-color: #00405c; }

    @media (max-width: 768px) {
      .page-header { padding: 16px; }
      .table-title { font-size: 1.25rem; }
      .page-header-spacer { display: none; }
      .filter-block { width: 100%; }
      .kpi-block { margin-left: 0; }
      .filter-date { max-width: 100%; }
      .wellness-table-wrapper { max-height: calc(100vh - 340px); }
    }
  `]
})
export class WellnessEquipoComponent implements OnInit {

  teamId = 0;
  clubId = 0;
  selectedDate = this.todayIso();

  template: WellnessTemplate | null = null;
  schema: WellnessTemplateSchema | null = null;
  rows: WellnessTeamRow[] = [];
  pendingCount = 0;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private teamService: TeamService,
    private playerService: PlayerService,
    private wellnessService: WellnessService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
      this.bootstrap();
    });
  }

  // ─── Init ───────────────────────────────────────────────────────────────

  private bootstrap(): void {
    if (!this.teamId) return;
    this.loading = true;
    this.teamService.getTeamById(this.teamId.toString()).subscribe(
      (resp: any) => {
        const team = resp?.data;
        this.clubId = team?.clubId ?? 0;
        if (this.clubId) {
          this.loadAll();
        } else {
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    );
  }

  reload(): void {
    if (!this.clubId) return;
    this.loadAll();
  }

  private loadAll(): void {
    this.loading = true;
    forkJoin({
      templates: this.wellnessService.getTemplates(this.clubId),
      entries: this.wellnessService.getTeamForDate(this.teamId, this.selectedDate),
      players: this.playerService.getPlayers(this.teamId.toString())
    }).subscribe({
      next: ({ templates, entries, players }) => {
        this.template = templates[0] ?? null;
        this.schema = parseTemplateSchema(this.template);
        // Orden alfabético por nombre del jugador (locale ES, insensible a
        // acentos/mayúsculas) para que el fisio recorra el equipo sin
        // sorpresas de orden cada vez que vuelve a la pantalla.
        this.rows = this.wellnessService.toTeamRows(entries).sort((a, b) =>
          (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
        );

        const totalPlayers = this.countPlayers(players);
        this.pendingCount = Math.max(0, totalPlayers - this.rows.length);

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private countPlayers(response: any): number {
    if (!response) return 0;
    // PlayerService.getPlayers devuelve { data: { players: [...] } } o { data: [...] }
    let list = response?.data?.players ?? response?.data ?? response;
    if (!Array.isArray(list)) return 0;
    return list.length;
  }

  // ─── UI helpers ─────────────────────────────────────────────────────────

  get scaleFields(): WellnessField[] {
    return (this.schema?.fields ?? []).filter(f => f.type === 'scale');
  }

  /** Campos de selección única (p. ej. región corporal de la molestia).
   *  Se muestran como columnas de texto tras las escalas. */
  get selectFields(): WellnessField[] {
    return (this.schema?.fields ?? []).filter(f => f.type === 'select');
  }

  get formattedDate(): string {
    try {
      const d = new Date(this.selectedDate + 'T00:00:00');
      return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return this.selectedDate;
    }
  }

  countByRisk(level: 'green' | 'yellow' | 'red'): number {
    return this.rows.filter(r => r.riskLevel === level).length;
  }

  riskBadge(level: 'green' | 'yellow' | 'red'): string {
    return this.wellnessService.riskBadgeClass(level);
  }

  riskLabel(level: 'green' | 'yellow' | 'red'): string {
    if (level === 'red') return 'Alerta';
    if (level === 'yellow') return 'Atención';
    return 'OK';
  }

  cellRisk(row: WellnessTeamRow, field: WellnessField): string {
    const v = row.values[field.id];
    if (typeof v !== 'number') return '';
    const alertLte = field.alertLte ?? 2;
    if (v <= alertLte) return 'cell-red';
    if (v <= alertLte + 2) return 'cell-yellow';
    return 'cell-green';
  }

  formatValue(v: number | string | undefined): string {
    if (v === undefined || v === null || v === '') return '—';
    return typeof v === 'number' ? v.toString() : String(v);
  }

  formatTime(d: Date): string {
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  shortLabel(label: string): string {
    if (!label) return '';
    if (label.length <= 8) return label;
    return label.split(' ')[0];
  }

  trackByUser(_: number, row: WellnessTeamRow): number {
    return row.userId;
  }

  onDateChange(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    if (target?.value) {
      this.selectedDate = target.value;
      this.loadAll();
    }
  }

  goBack(): void {
    this.location.back();
  }

  private todayIso(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
