import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { TeamService } from 'src/app/core/services/team/team.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import {
  RpeService,
  RpeTeamPlayerBlock,
  RpeTeamWeek
} from 'src/app/core/services/rpe/rpe.service';

interface PlayerInfo {
  playerId: number;
  nombre: string;
  apellido: string;
}

interface DisplayPlayerRow {
  playerId: number;
  nombre: string;
  sRPE: number;
  monotony: number;
  strain: number;
  daysWithLoad: number;
  dailyLoad: { date: string; load: number }[];
  monotonyZone: 'low' | 'optimal' | 'alert';
  strainZone: 'low' | 'optimal' | 'alert';
}

/**
 * Panel del staff con la carga interna semanal del equipo (sRPE / monotonía / strain).
 *
 * Muestra:
 *  - Selector de semana (lunes-domingo)
 *  - KPIs de equipo: carga total, jugadores con datos, jugadores en zona alerta
 *  - Tabla por jugador con métricas Foster + barras diarias
 *
 * Ruta: /dashboard/rpe-equipo/:teamId
 */
@Component({
  selector: 'app-rpe-carga-semanal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rpe-page">

      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="table-title">
            <i class="bi bi-lightning-charge-fill me-2"></i>Carga interna semanal (sRPE)
          </h2>
          <p class="header-subtitle">{{ formattedWeek }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Filtros + KPIs -->
        <div class="filters-card">
          <div class="filter-block">
            <label class="filter-label">Semana (lunes)</label>
            <input type="date" class="form-control filter-date"
                   [value]="weekStart"
                   (change)="onWeekChange($event)" />
          </div>
          <div class="filter-block kpi-block" *ngIf="!loading && week">
            <div class="kpi kpi-blue" title="Carga total del equipo">
              <i class="bi bi-stack"></i>
              {{ week.teamLoad | number:'1.0-0' }} <span class="kpi-unit">UA·min</span>
            </div>
            <div class="kpi kpi-green" title="Jugadores con datos">
              <i class="bi bi-people-fill"></i>
              {{ rows.length }}
            </div>
            <div class="kpi kpi-red" title="Jugadores en zona de alerta (strain alto)">
              <i class="bi bi-exclamation-octagon-fill"></i>
              {{ alertCount }}
            </div>
          </div>
          <div class="filter-block">
            <button class="btn btn-outline-primary btn-sm"
                    (click)="reload()" [disabled]="loading">
              <i class="bi bi-arrow-clockwise"></i> Actualizar
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="empty-state">
          <div class="spinner-border spinner-sphaira" role="status"></div>
          <p class="mt-2 mb-0 text-soft">Cargando carga semanal…</p>
        </div>

        <!-- Sin datos -->
        <div *ngIf="!loading && rows.length === 0" class="empty-state">
          <i class="bi bi-clipboard-x display-5 mb-2"></i>
          <p class="mb-0">No hay sesiones RPE registradas en esta semana.</p>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && rows.length > 0" class="rpe-table-wrapper">
          <table class="rpe-table">
            <thead>
              <tr>
                <th class="col-name">Jugador</th>
                <th class="col-week">Carga semanal</th>
                <th class="col-days">Días</th>
                <th class="col-monotony">Monotonía</th>
                <th class="col-strain">Strain</th>
                <th class="col-daily">Distribución diaria</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows; trackBy: trackByPlayer">
                <td class="col-name">{{ row.nombre }}</td>
                <td class="col-week">
                  <strong>{{ row.sRPE | number:'1.0-0' }}</strong>
                  <span class="unit"> UA·min</span>
                </td>
                <td class="col-days">{{ row.daysWithLoad }}/7</td>
                <td class="col-monotony">
                  <span [class]="zonePill(row.monotonyZone)">
                    {{ row.monotony | number:'1.2-2' }}
                  </span>
                </td>
                <td class="col-strain">
                  <span [class]="zonePill(row.strainZone)">
                    {{ row.strain | number:'1.0-0' }}
                  </span>
                </td>
                <td class="col-daily">
                  <div class="bars-row">
                    <div *ngFor="let d of row.dailyLoad"
                         class="bar"
                         [style.height.%]="barHeight(d.load)"
                         [title]="d.date + ' · ' + d.load + ' UA·min'"
                         [class.bar-zero]="d.load === 0"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Paleta Sphaira: navy #002c40 · green #31b270 · green light #c4e8d6
       gray #636363 · bg #f4f4f4 · danger #b1231b · warning #b07b00 */
    .rpe-page {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f4f4f4; min-height: 100vh;
    }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; gap: 12px; border-bottom: 1px solid #e9ecef;
      background: #fff;
    }
    .header-center { text-align: center; flex: 1; }
    .table-title { margin: 0; font-weight: 700; color: #002c40; display: inline-flex; align-items: center; }
    .table-title i { color: #31b270; }
    .header-subtitle { margin: 4px 0 0; color: #636363; font-size: 0.92rem; }
    .btn-back-clean {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(49, 178, 112, 0.08); border: 0; color: #002c40;
      padding: 0.4rem 0.75rem; border-radius: 8px;
      cursor: pointer; transition: background .2s, transform .15s; font-weight: 600;
    }
    .btn-back-clean:hover { background: rgba(49, 178, 112, 0.18); color: #002c40; transform: translateX(-2px); }
    .page-header-spacer { width: 110px; }
    .spinner-sphaira { color: #31b270; }
    .text-soft { color: #636363; }

    .filters-card {
      display: flex; flex-wrap: wrap; gap: 16px; align-items: end;
      padding: 16px 20px; background: #fff; border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.06); border: 1px solid #eef1f3;
      margin: 16px 0;
    }
    .filter-block { display: flex; flex-direction: column; gap: 4px; }
    .filter-label { font-size: 0.72rem; color: #636363; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-date { max-width: 180px; border: 1px solid #d4dde2; color: #002c40; font-weight: 500; }
    .filter-date:focus { border-color: #31b270; box-shadow: 0 0 0 0.2rem rgba(49, 178, 112, 0.15); }

    .kpi-block { flex-direction: row; gap: 8px; align-items: center; flex-wrap: wrap; }
    .kpi {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 999px; font-size: 0.92rem; font-weight: 800;
      border: 1px solid transparent;
    }
    .kpi-unit { font-weight: 600; opacity: 0.85; font-size: 0.74rem; }
    .kpi-blue { background: rgba(0, 44, 64, 0.08); color: #002c40; border-color: rgba(0, 44, 64, 0.15); }
    .kpi-green { background: #c4e8d6; color: #15663f; border-color: #a8dcc1; }
    .kpi-red { background: rgba(177, 35, 27, 0.10); color: #b1231b; border-color: rgba(177, 35, 27, 0.25); }

    .filters-card .btn-outline-primary {
      border-color: #31b270; color: #31b270; font-weight: 600;
    }
    .filters-card .btn-outline-primary:hover:not(:disabled) { background: #31b270; border-color: #31b270; color: #fff; }

    .empty-state {
      padding: 48px 16px; text-align: center; color: #636363;
      background: #fff; border-radius: 14px; margin-top: 16px;
      border: 1px solid #eef1f3; box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04);
    }
    .empty-state i { color: #31b270; }

    .rpe-table-wrapper {
      margin: 8px 0 32px; background: #fff; border: 1px solid #eef1f3; border-radius: 14px; overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.06);
    }
    .rpe-table {
      width: 100%; border-collapse: separate; border-spacing: 0; min-width: 880px;
    }
    .rpe-table th, .rpe-table td {
      padding: 12px 14px; text-align: left; border-bottom: 1px solid #eef1f3;
      font-size: 0.9rem; vertical-align: middle;
    }
    .rpe-table thead th {
      background: linear-gradient(135deg, #002c40 0%, #013a52 100%); color: #fff;
      font-weight: 700; position: sticky; top: 0; z-index: 1;
      text-transform: uppercase; font-size: 0.72rem; letter-spacing: .05em;
      white-space: nowrap;
    }
    .rpe-table tbody tr { transition: background .12s ease; }
    .rpe-table tbody tr:nth-child(even) { background: #f9fbfc; }
    .rpe-table tbody tr:hover { background: #f1f8f4; }
    .col-name { min-width: 160px; font-weight: 700; color: #002c40; }
    .col-week, .col-days, .col-monotony, .col-strain {
      width: 130px; text-align: center; font-variant-numeric: tabular-nums; color: #002c40;
    }
    .col-week .unit { color: #636363; font-size: 0.78rem; }
    .col-daily { width: 200px; }

    .zone-pill {
      display: inline-block; padding: 4px 10px; border-radius: 999px;
      font-size: 0.82rem; font-weight: 800; min-width: 56px; text-align: center;
      border: 1px solid transparent;
    }
    .zone-low      { background: rgba(0, 44, 64, 0.08); color: #002c40; border-color: rgba(0, 44, 64, 0.15); }
    .zone-optimal  { background: #c4e8d6; color: #15663f; border-color: #a8dcc1; }
    .zone-alert    { background: rgba(177, 35, 27, 0.10); color: #b1231b; border-color: rgba(177, 35, 27, 0.25); }

    .bars-row {
      display: flex; gap: 4px; align-items: end; height: 40px;
      border-bottom: 1px solid #eef1f3; padding-bottom: 2px;
    }
    .bar {
      flex: 1; min-height: 3px; background: linear-gradient(180deg, #31b270, #002c40);
      border-radius: 3px 3px 0 0;
    }
    .bar-zero { background: #e9ecef; }

    @media (max-width: 768px) {
      .page-header-spacer { display: none; }
      .filter-block { width: 100%; }
      .filter-date { max-width: 100%; }
    }

    /* ── Dark mode ──────────────────────────────────────────── */
    :host-context(body.dark) .rpe-page { background: #00131c; }
    :host-context(body.dark) .page-header { background: #001e2e; border-bottom-color: #00405c; }
    :host-context(body.dark) .table-title { color: #c4e8d6; }
    :host-context(body.dark) .header-subtitle, :host-context(body.dark) .text-soft { color: #94a3b8; }
    :host-context(body.dark) .filters-card,
    :host-context(body.dark) .rpe-table-wrapper,
    :host-context(body.dark) .empty-state { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .filter-label { color: #94a3b8; }
    :host-context(body.dark) .filter-date { background: #00131c; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .rpe-table th, :host-context(body.dark) .rpe-table td { border-bottom-color: #00405c; }
    :host-context(body.dark) .rpe-table tbody tr:nth-child(even) { background: #00161f; }
    :host-context(body.dark) .rpe-table tbody tr:hover { background: #002b3d; }
    :host-context(body.dark) .col-name,
    :host-context(body.dark) .col-week, :host-context(body.dark) .col-days,
    :host-context(body.dark) .col-monotony, :host-context(body.dark) .col-strain { color: #c4e8d6; }
    :host-context(body.dark) .col-week .unit { color: #94a3b8; }
    :host-context(body.dark) .kpi-blue { background: rgba(196, 232, 214, 0.10); color: #c4e8d6; border-color: #00405c; }
  `]
})
export class RpeCargaSemanalComponent implements OnInit {

  teamId = 0;
  clubId = 0;
  weekStart = this.mondayOfThisWeek();

  loading = false;
  week: RpeTeamWeek | null = null;
  rows: DisplayPlayerRow[] = [];
  playersById: Map<number, PlayerInfo> = new Map();
  /** Carga máxima de un día en toda la semana (para escalar las barras). */
  maxDailyLoad = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private teamService: TeamService,
    private playerService: PlayerService,
    private rpeService: RpeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
      this.bootstrap();
    });
  }

  // ─── Init / Reload ────────────────────────────────────────────────────

  private bootstrap(): void {
    if (!this.teamId) return;
    this.loading = true;
    this.teamService.getTeamById(this.teamId.toString()).subscribe({
      next: (resp: any) => {
        this.clubId = resp?.data?.clubId ?? 0;
        this.loadAll();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  reload(): void {
    if (!this.teamId) return;
    this.loadAll();
  }

  onWeekChange(ev: Event): void {
    const t = ev.target as HTMLInputElement;
    if (t?.value) {
      // Forzar lunes: si eligen otro día, lo redondeamos al lunes anterior.
      this.weekStart = this.toMonday(t.value);
      this.loadAll();
    }
  }

  private loadAll(): void {
    this.loading = true;
    forkJoin({
      week: this.rpeService.getTeamWeek(this.teamId, this.weekStart),
      players: this.playerService.getPlayers(this.teamId.toString())
    }).subscribe({
      next: ({ week, players }) => {
        this.week = week;
        this.playersById = this.toPlayerMap(players);
        this.rows = this.buildRows(week?.players ?? []);
        this.maxDailyLoad = this.computeMaxDaily(this.rows);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Mapping ──────────────────────────────────────────────────────────

  private toPlayerMap(response: any): Map<number, PlayerInfo> {
    const out = new Map<number, PlayerInfo>();
    let list = response?.data?.players ?? response?.data ?? response;
    if (!Array.isArray(list)) return out;
    for (const p of list) {
      const id = p?.playerId ?? p?.id ?? 0;
      if (!id) continue;
      out.set(id, {
        playerId: id,
        nombre: p?.nombre ?? p?.name ?? '',
        apellido: p?.apellido ?? p?.lastName ?? ''
      });
    }
    return out;
  }

  private buildRows(blocks: RpeTeamPlayerBlock[]): DisplayPlayerRow[] {
    const rows = blocks.map(b => {
      const info = this.playersById.get(b.playerId);
      const fullName = info
        ? `${info.nombre} ${info.apellido}`.trim()
        : `Jugador #${b.playerId}`;
      const dailyEntries = Object.entries(b.metrics?.dailyLoad ?? {})
        .sort(([a], [c]) => a.localeCompare(c))
        .map(([date, load]) => ({ date, load: load ?? 0 }));
      return {
        playerId: b.playerId,
        nombre: fullName || `Jugador #${b.playerId}`,
        sRPE: b.metrics?.sRPE ?? 0,
        monotony: b.metrics?.monotony ?? 0,
        strain: b.metrics?.strain ?? 0,
        daysWithLoad: b.metrics?.daysWithLoad ?? 0,
        dailyLoad: dailyEntries,
        monotonyZone: this.rpeService.monotonyZone(b.metrics?.monotony ?? 0),
        strainZone: this.rpeService.strainZone(b.metrics?.strain ?? 0)
      } as DisplayPlayerRow;
    });
    rows.sort((a, b) => b.strain - a.strain);
    return rows;
  }

  private computeMaxDaily(rows: DisplayPlayerRow[]): number {
    let max = 0;
    for (const r of rows) {
      for (const d of r.dailyLoad) {
        if (d.load > max) max = d.load;
      }
    }
    return max;
  }

  // ─── UI helpers ───────────────────────────────────────────────────────

  get alertCount(): number {
    return this.rows.filter(r => r.strainZone === 'alert' || r.monotonyZone === 'alert').length;
  }

  get formattedWeek(): string {
    const start = new Date(this.weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString('es-ES', opts)} – ${end.toLocaleDateString('es-ES', opts)}`;
  }

  zonePill(zone: 'low' | 'optimal' | 'alert'): string {
    return `zone-pill zone-${zone}`;
  }

  barHeight(load: number): number {
    if (this.maxDailyLoad <= 0) return 0;
    const pct = (load / this.maxDailyLoad) * 100;
    return Math.max(load > 0 ? 8 : 4, Math.min(100, pct));
  }

  trackByPlayer(_: number, row: DisplayPlayerRow): number {
    return row.playerId;
  }

  goBack(): void {
    this.location.back();
  }

  // ─── Date utils ───────────────────────────────────────────────────────

  private mondayOfThisWeek(): string {
    return this.toMonday(this.todayIso());
  }

  private toMonday(dateIso: string): string {
    const d = new Date(dateIso + 'T00:00:00');
    const day = d.getDay(); // 0 = domingo, 1 = lunes…
    const offset = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + offset);
    return this.toIsoDate(d);
  }

  private todayIso(): string {
    return this.toIsoDate(new Date());
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
