import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { TeamService } from 'src/app/core/services/team/team.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { MedicalDiaryService } from 'src/app/core/services/medical-diary/medical-diary.service';
import {
  PlayerDailyStatusService,
  PlayerDailyStatus
} from 'src/app/core/services/player-daily-status/player-daily-status.service';
import {
  MicrocycleService,
  MicrocycleDay
} from 'src/app/core/services/microcycle/microcycle.service';
import {
  StatusOption,
  TRAINING_STATUS,
  MATCH_STATUS
} from '../diario-medico/diario-medico-equipo.component';
import { getSelectedSeason } from 'src/app/core/utils/season.utils';

interface PlayerInfo {
  playerId: number;
  nombre: string;
  apellido: string;
  posicion?: string | null;
  picturePlayer?: string | null;
  /** Otros equipos (mismo club/temporada) a los que pertenece el jugador. */
  otherTeams?: string[];
  /** true = jugador invitado de otro equipo (no de la plantilla del equipo). */
  guest?: boolean;
}

/**
 * Un equipo del cuerpo técnico en el desplegable "Jugadores" (acordeón). Al
 * desplegarlo se cargan sus jugadores bajo demanda.
 */
interface GuestTeam {
  teamId: number;
  name: string;
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
  players: GuestPlayer[];
}

/** Un jugador dentro del desplegable "Jugadores". */
interface GuestPlayer {
  playerId: number;
  fullName: string;
  numero: string | null;
  picturePlayer: string | null;
}

interface DisplayRow {
  playerId: number;
  fullName: string;
  posicion?: string | null;
  picturePlayer?: string | null;
  /** Otros equipos (mismo club/temporada) a los que pertenece el jugador. */
  otherTeams: string[];
  /** true = jugador invitado de otro equipo del club. */
  guest: boolean;
  /** Tag actual asignado (puede ser null si no se ha registrado nada). */
  tagCode: string | null;
  tagLabel: string | null;
  tagColor: string | null;
  notes: string;
  dailyStatusId?: number;
  /** true = la fila tiene cambios sin guardar (resaltado visual). */
  dirty?: boolean;
  /** Mientras la fila está guardándose. */
  savingNow: boolean;
  /** Marca de tiempo del último guardado OK (para mostrar el tick efímero). */
  savedAt: number | null;
}

/**
 * Panel de disponibilidad diaria del equipo (fisio/médico).
 *
 * Muestra una fila por jugador con un dropdown de los códigos del club
 * (DT, DC, L, READAPT, GYM, ...). Permite:
 *   - Seleccionar fecha
 *   - Autorrellenar con DT toda la plantilla
 *   - Cambiar el código de un jugador (se guarda al cambiar)
 *   - Ver el estado actual con badge de color
 *
 * Ruta: /dashboard/disponibilidad-equipo/:teamId
 */
@Component({
  selector: 'app-disponibilidad-equipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dispo-page">

      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="table-title">
            <i class="bi bi-clipboard2-check-fill me-2"></i>Disponibilidad del equipo
          </h2>
          <p class="header-subtitle">{{ formattedDate }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Filtros + acciones -->
        <div class="filters-card">
          <div class="filter-block">
            <label class="filter-label">Fecha</label>
            <input type="date" class="form-control filter-date"
                   [value]="dateIso"
                   (change)="onDateChange($event)" />
          </div>

          <!-- Sesión del día (entreno/partido) desde Microciclos -->
          <div class="filter-block session-block">
            <label class="filter-label">Sesión del día</label>
            <div class="session-row">
              <span class="session-badge session-badge--{{ sessionKind }}">
                <i class="bi"
                   [class.bi-flag-fill]="sessionKind === 'match'"
                   [class.bi-cone-striped]="sessionKind === 'training'"
                   [class.bi-moon-stars]="sessionKind === 'rest'"
                   [class.bi-calendar-x]="sessionKind === 'none'"></i>
                {{ sessionLabel }}
              </span>
              <button class="btn btn-link btn-sm session-link"
                      (click)="goToMicrocycles()"
                      [title]="sessionKind === 'none' ? 'Crear sesiones en Microciclos' : 'Gestionar sesiones en Microciclos'">
                <i class="bi bi-calendar2-week"></i>
                {{ sessionKind === 'none' ? 'Crear sesión' : 'Microciclos' }}
              </button>
            </div>
          </div>

          <div class="filter-block kpi-block" *ngIf="!loading">
            <div class="kpi kpi-green" title="Disponibles totales">
              <i class="bi bi-check-circle-fill"></i>
              {{ countByZone('green') }}
            </div>
            <div class="kpi kpi-amber" title="Condicionados / Riesgo">
              <i class="bi bi-exclamation-triangle-fill"></i>
              {{ countByZone('amber') }}
            </div>
            <div class="kpi kpi-red" title="Bajas / No disponibles">
              <i class="bi bi-x-octagon-fill"></i>
              {{ countByZone('red') }}
            </div>
            <div class="kpi kpi-gray" title="Sin estado asignado">
              <i class="bi bi-question-circle-fill"></i>
              {{ countMissing }}
            </div>
          </div>

          <div class="filter-block actions-block">
            <button class="btn btn-sphaira btn-sm"
                    (click)="autofillToday()"
                    [disabled]="saving || loading || !clubId"
                    title="Marca como Disponible a todos los jugadores que aún no tengan estado">
              <i class="bi bi-magic"></i>
              Marcar disponibles
            </button>
            <button class="btn btn-outline-primary btn-sm"
                    (click)="reload()"
                    [disabled]="loading">
              <i class="bi bi-arrow-clockwise"></i>
              Actualizar
            </button>
            <!-- Botón "Jugadores": añade invitados de otros equipos del club -->
            <button class="btn btn-players btn-sm players-btn"
                    (click)="togglePlayersMenu($event)"
                    [disabled]="loading"
                    [class.is-open]="playersMenuOpen">
              <i class="bi bi-person-plus"></i>
              Jugadores
              <i class="bi bi-chevron-down"></i>
            </button>
          </div>
        </div>

        <!-- Desplegable flotante de "Jugadores" (equipos del club → jugadores) -->
        <div class="players-menu" *ngIf="playersMenuOpen && playersMenuPos"
             (click)="$event.stopPropagation()"
             [style.top.px]="playersMenuPos.top"
             [style.left.px]="playersMenuPos.left"
             [style.min-width.px]="playersMenuPos.width"
             [style.max-height.px]="playersMenuPos.maxHeight">
          <div class="players-menu-head">
            <i class="bi bi-people-fill"></i> Añadir jugadores de mis equipos
          </div>

          <div class="players-loading" *ngIf="loadingGuestTeams">
            <span class="spinner-border spinner-border-sm text-primary"></span>
            Cargando equipos…
          </div>
          <div class="players-empty" *ngIf="!loadingGuestTeams && guestTeams.length === 0">
            No tienes otros equipos disponibles.
          </div>

          <div class="guest-team" *ngFor="let team of guestTeams">
            <button type="button" class="guest-team-head" (click)="toggleGuestTeam(team)">
              <i class="bi" [class.bi-chevron-down]="team.expanded"
                 [class.bi-chevron-right]="!team.expanded"></i>
              <span class="guest-team-name">{{ team.name }}</span>
              <span class="guest-team-badge" *ngIf="isHostTeam(team)">Este equipo</span>
            </button>
            <div class="guest-team-body" *ngIf="team.expanded">
              <div class="players-loading sm" *ngIf="team.loading">
                <span class="spinner-border spinner-border-sm text-primary"></span>
                Cargando…
              </div>
              <div class="players-empty sm" *ngIf="team.loaded && team.players.length === 0">
                Sin jugadores en este equipo.
              </div>
              <label class="guest-opt" *ngFor="let p of team.players"
                     [class.locked]="isGuestLocked(p.playerId)">
                <input type="checkbox"
                       [checked]="isGuestChecked(p.playerId)"
                       [disabled]="isGuestLocked(p.playerId) || guestBusy"
                       (change)="onGuestToggle(p, $event)" />
                <span class="guest-avatar">
                  <img *ngIf="p.picturePlayer"
                       [src]="'https://appsphairatech.com/images/user/' + p.picturePlayer"
                       [alt]="p.fullName" />
                  <i *ngIf="!p.picturePlayer" class="bi bi-person-fill"></i>
                </span>
                <span class="guest-name">
                  {{ p.fullName }}<span class="guest-num" *ngIf="p.numero"> · #{{ p.numero }}</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="empty-state">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 mb-0">Cargando disponibilidad…</p>
        </div>

        <!-- Sin jugadores -->
        <div *ngIf="!loading && rows.length === 0" class="empty-state">
          <i class="bi bi-people display-5 mb-2 d-block"></i>
          <p class="mb-0">No hay jugadores en este equipo.</p>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && rows.length > 0" class="dispo-table-wrapper">
          <table class="dispo-table">
            <thead>
              <tr>
                <th class="col-name">Jugador</th>
                <th class="col-state">Estado</th>
                <th class="col-notes">Notas / Observación</th>
                <th class="col-status"></th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let row of rows; trackBy: trackByPlayer; let i = index">
              <!-- Divisor: jugadores de otros equipos (invitados) -->
              <tr class="group-divider group-divider--guest" *ngIf="isFirstGuest(i)">
                <td colspan="4">
                  <i class="bi bi-people-fill"></i> Jugadores de otros equipos
                </td>
              </tr>
              <tr [class.row-dirty]="row.dirty">
                <td class="col-name">
                  <div class="player-cell">
                    <div class="avatar-mini">
                      <img *ngIf="row.picturePlayer"
                           [src]="'https://appsphairatech.com/images/user/' + row.picturePlayer"
                           [alt]="row.fullName" />
                      <i *ngIf="!row.picturePlayer" class="bi bi-person-fill"></i>
                    </div>
                    <div class="player-name-wrap">
                      <span class="player-name">
                        {{ row.fullName }}
                        <span *ngIf="row.guest" class="guest-badge"
                              [title]="guestBadgeTitle(row)">
                          <i class="bi bi-person-plus-fill"></i> {{ guestBadgeLabel(row) }}
                        </span>
                      </span>
                    </div>
                  </div>
                </td>
                <td class="col-state">
                  <div class="state-cell">
                    <span class="badge-dot" [style.backgroundColor]="row.tagColor || '#cbd0d6'"></span>
                    <select class="form-select form-select-sm state-select"
                            [value]="row.tagCode || ''"
                            (change)="onStatusChange(row, $event)"
                            [disabled]="row.savingNow"
                            [style.color]="row.tagColor || '#374151'"
                            [style.borderColor]="row.tagColor ? row.tagColor + '88' : '#ced4da'">
                      <option *ngIf="isUnknownStatus(row)" [value]="row.tagCode">
                        {{ row.tagLabel || row.tagCode }}
                      </option>
                      <option *ngFor="let st of statusFlatOptions" [value]="st.code"
                              [style.color]="st.color">
                        {{ st.display }}
                      </option>
                      <optgroup *ngIf="statusFcOptions.length" label="FC · Fuera de convocatoria por"
                                style="color: #b1231b;">
                        <option *ngFor="let st of statusFcOptions" [value]="st.code"
                                [style.color]="st.color">
                          {{ st.display }}
                        </option>
                      </optgroup>
                    </select>
                  </div>
                </td>
                <td class="col-notes">
                  <input type="text" class="form-control form-control-sm"
                         placeholder="Nota corta (opcional)"
                         [value]="row.notes"
                         (blur)="onNotesBlur(row, $event)" />
                </td>
                <td class="col-status">
                  <i *ngIf="row.savedAt"
                     class="bi bi-check-circle-fill text-success save-tick"
                     title="Guardado"></i>
                  <span *ngIf="row.savingNow"
                        class="spinner-border spinner-border-sm text-secondary"
                        role="status"
                        title="Guardando…"></span>
                </td>
              </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dispo-page {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background:
        radial-gradient(1200px 320px at 85% -120px, rgba(49,178,112,0.10), transparent 70%),
        #f3f6f8;
      min-height: 100vh; padding-bottom: 28px;
    }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 18px; gap: 12px; background: #ffffff;
      border-bottom: 1px solid #e9eef1; position: relative;
    }
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
    .header-subtitle { margin: 8px 0 0; color: #5b6b75; font-size: 0.92rem; text-transform: capitalize; font-weight: 500; }
    .btn-back-clean {
      display: inline-flex; align-items: center; gap: 6px;
      background: #ffffff; border: 1px solid #dbe4e9; color: #002c40;
      padding: 8px 14px; border-radius: 10px; font-weight: 600; font-size: 0.9rem;
      cursor: pointer; transition: all .15s ease;
    }
    .btn-back-clean:hover {
      background: #002c40; border-color: #002c40; color: #ffffff;
      transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,44,64,0.18);
    }
    .page-header-spacer { width: 110px; }

    .filters-card {
      display: flex; flex-wrap: wrap; gap: 18px; align-items: end;
      padding: 18px 20px; background: #ffffff; border: 1px solid #e9eef1; border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,44,64,0.06); margin-top: 20px;
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
    .filter-date:focus { outline: none; border-color: #31b270; box-shadow: 0 0 0 3px rgba(49,178,112,0.18); }
    .actions-block { flex-direction: row; gap: 10px; margin-left: auto; }
    .actions-block .btn { white-space: nowrap; }

    .btn-sphaira {
      display: inline-flex; align-items: center; gap: 6px;
      background: linear-gradient(135deg, #002c40 0%, #0a4d3a 100%);
      color: #fff; border: 0; padding: 9px 16px; border-radius: 10px; font-weight: 700; font-size: 0.9rem;
      box-shadow: 0 6px 16px rgba(0,44,64,0.18); transition: all .15s ease;
    }
    .btn-sphaira:hover { filter: brightness(1.12); color: #fff; transform: translateY(-1px); }
    .btn-sphaira:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }

    .btn-outline-primary, .btn.btn-outline-primary {
      display: inline-flex; align-items: center; gap: 6px;
      color: #002c40; border: 1px solid #cdd9e0; background: #ffffff;
      border-radius: 10px; padding: 9px 16px; font-weight: 700; font-size: 0.9rem;
      transition: all .15s ease;
    }
    .btn-outline-primary:hover, .btn.btn-outline-primary:hover {
      background: #002c40; border-color: #002c40; color: #ffffff; transform: translateY(-1px);
    }
    .btn-outline-primary:disabled { opacity: .55; transform: none; }

    .session-block { min-width: 220px; }
    .session-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .session-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 13px; border-radius: 999px; font-size: 0.9rem; font-weight: 700;
      border: 1px solid transparent; box-shadow: 0 2px 8px rgba(0,44,64,0.05);
    }
    .session-badge--match    { background: #fdecec; color: #b1231b; border-color: #f5c2c0; }
    .session-badge--training { background: #c4e8d6; color: #15663f; border-color: #a6dcc0; }
    .session-badge--rest     { background: #eef2f4; color: #5b6b75; border-color: #dde1e6; }
    .session-badge--none     { background: #f8f9fa; color: #8a929b; border-color: #e3e6ea; }
    .session-link {
      padding: 4px 8px; font-weight: 700; text-decoration: none; color: #002c40;
      display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; border-radius: 8px;
    }
    .session-link:hover { background: rgba(49,178,112,0.12); color: #15663f; }

    .kpi-block { flex-direction: row; gap: 10px; align-items: center; flex-wrap: wrap; }
    .kpi {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: 999px; font-size: 0.92rem; font-weight: 800;
      box-shadow: 0 2px 8px rgba(0,44,64,0.05); transition: transform .15s ease;
    }
    .kpi:hover { transform: translateY(-1px); }
    .kpi-green { background: #c4e8d6; color: #15663f; }
    .kpi-amber { background: rgba(176,123,0,0.15); color: #8a6100; }
    .kpi-red { background: rgba(177,35,27,0.12); color: #b1231b; }
    .kpi-gray { background: #eef2f4; color: #5b6b75; border: 1px dashed #c4cfd6; box-shadow: none; }

    .empty-state {
      padding: 56px 16px; text-align: center; color: #5b6b75;
      background: #ffffff; border: 1px solid #e9eef1; border-radius: 16px; margin-top: 20px;
      box-shadow: 0 8px 24px rgba(0,44,64,0.05);
    }
    .empty-state .spinner-border { color: #31b270 !important; }

    .dispo-table-wrapper {
      margin-top: 20px; background: #ffffff; border: 1px solid #e9eef1; border-radius: 16px;
      overflow-x: auto; box-shadow: 0 8px 24px rgba(0,44,64,0.06);
    }
    .dispo-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 720px; }
    .dispo-table th, .dispo-table td {
      padding: 13px 16px; text-align: left; border-bottom: 1px solid #eef2f4;
      font-size: 0.92rem; vertical-align: middle;
    }
    .dispo-table thead th {
      background: #f1f5f7; font-weight: 800; color: #002c40;
      position: sticky; top: 0; z-index: 1;
      text-transform: uppercase; font-size: 11px; letter-spacing: .05em;
      border-bottom: 2px solid #dde6ea;
    }
    .dispo-table tbody tr { transition: background .12s ease; }
    .dispo-table tbody tr:nth-child(even) { background: #fafcfd; }
    .dispo-table tbody tr:hover { background: #eafaf1; }
    .row-dirty { background: #fff8e6 !important; }

    .col-name { min-width: 220px; }
    .col-state { width: 280px; }
    .col-notes { min-width: 200px; }
    .col-status { width: 36px; text-align: center; }
    .save-tick { font-size: 1.05rem; opacity: 0; animation: tickFade 1.6s ease-out forwards; }
    @keyframes tickFade {
      0%   { opacity: 0; transform: scale(0.6); }
      20%  { opacity: 1; transform: scale(1); }
      80%  { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.9); }
    }

    .player-cell { display: flex; align-items: center; gap: 10px; }
    .avatar-mini {
      width: 34px; height: 34px; border-radius: 50%; overflow: hidden;
      background: #c4e8d6; display: flex; align-items: center; justify-content: center;
      color: #15663f; flex: 0 0 auto;
      box-shadow: 0 2px 6px rgba(0,44,64,0.08);
    }
    .avatar-mini img { width: 100%; height: 100%; object-fit: cover; }
    .player-name { font-weight: 700; color: #002c40; }

    .state-cell { display: flex; align-items: center; gap: 8px; }
    .state-select { font-weight: 700; border-width: 1.5px; border-radius: 9px; padding: 6px 10px; }
    .state-select:focus { box-shadow: 0 0 0 3px rgba(49,178,112,0.18); }
    .col-notes .form-control { border-radius: 9px; border: 1px solid #dbe4e9; padding: 7px 11px; }
    .col-notes .form-control:focus { border-color: #31b270; box-shadow: 0 0 0 3px rgba(49,178,112,0.18); }
    .badge-dot {
      display: inline-block; width: 11px; height: 11px; border-radius: 50%;
      flex: 0 0 auto; box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
    }

    /* ── Nombre + badge invitado + tags de equipos ──────────────── */
    .player-name-wrap { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .guest-badge {
      display: inline-flex; align-items: center; gap: 3px;
      margin-left: 6px; padding: 1px 7px; border-radius: 999px;
      font-size: 0.66rem; font-weight: 700; white-space: nowrap; vertical-align: middle;
      background: #e6f0ff; color: #1a4ec3; border: 1px solid #c5d8f7;
    }
    .guest-badge i { font-size: 0.64rem; }
    .team-tags { display: flex; flex-wrap: wrap; gap: 4px; }

    /* Fila divisora: jugadores de otros equipos (invitados) */
    tr.group-divider--guest td {
      background: #eef4f7; color: #002c40;
      font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.04em; padding: 7px 14px;
      border-top: 2px solid #cfdbe2;
    }
    tr.group-divider--guest td i { color: #31b270; margin-right: 4px; }
    .team-tag {
      font-size: 0.66rem; font-weight: 600; color: #5b6b75;
      background: #eef2f4; border: 1px solid #dde1e6; border-radius: 6px; padding: 1px 6px;
    }

    /* ── Botón "Jugadores" ──────────────────────────────────────── */
    .btn-players {
      display: inline-flex; align-items: center; gap: 6px;
      color: #002c40; border: 1px solid #cdd9e0; background: #ffffff;
      border-radius: 10px; padding: 9px 16px; font-weight: 700; font-size: 0.9rem;
      transition: all .15s ease; white-space: nowrap;
    }
    .btn-players:hover:not(:disabled) { background: rgba(49,178,112,0.12); border-color: #31b270; color: #15663f; transform: translateY(-1px); }
    .btn-players:disabled { opacity: .55; }
    .btn-players .bi-chevron-down { font-size: 0.7rem; }
    .btn-players.is-open { background: #002c40; color: #fff; border-color: #002c40; }
    .btn-players.is-open i { color: #fff; }

    /* ── Desplegable de equipos/jugadores ───────────────────────── */
    .players-menu {
      position: fixed; z-index: 1060; background: #fff;
      border: 1px solid #e3e9ed; border-radius: 12px; padding: 8px;
      box-shadow: 0 12px 32px rgba(0, 44, 64, 0.18); overflow-y: auto;
    }
    .players-menu-head {
      font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
      color: #002c40; padding: 4px 6px 8px; display: flex; align-items: center; gap: 6px;
      border-bottom: 1px solid #eef2f4; margin-bottom: 6px;
    }
    .players-menu-head i { color: #31b270; }
    .players-loading, .players-empty {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 8px; color: #6c8089; font-size: 0.85rem;
    }
    .players-loading .spinner-border { color: #31b270 !important; }
    .players-loading.sm, .players-empty.sm { padding: 8px 10px; font-size: 0.8rem; }

    .guest-team { border-bottom: 1px solid #f1f5f7; }
    .guest-team:last-child { border-bottom: 0; }
    .guest-team-head {
      display: flex; align-items: center; gap: 8px; width: 100%;
      background: transparent; border: 0; padding: 9px 8px; cursor: pointer;
      font-size: 0.9rem; font-weight: 700; color: #002c40; text-align: left; border-radius: 8px;
    }
    .guest-team-head:hover { background: #f1f5f7; }
    .guest-team-head .bi-chevron-down, .guest-team-head .bi-chevron-right {
      font-size: 0.75rem; color: #6c8089; flex-shrink: 0;
    }
    .guest-team-name { flex: 1; min-width: 0; }
    .guest-team-badge {
      font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em;
      background: #c4e8d6; color: #15663f; border-radius: 999px; padding: 2px 7px;
    }
    .guest-team-body { padding: 2px 4px 8px 10px; }

    .guest-opt {
      display: flex; align-items: center; gap: 9px; padding: 6px 8px; border-radius: 8px;
      cursor: pointer; margin: 0;
    }
    .guest-opt:hover { background: #eafaf1; }
    .guest-opt.locked { cursor: default; opacity: 0.85; }
    .guest-opt.locked:hover { background: transparent; }
    .guest-opt input {
      appearance: none; -webkit-appearance: none;
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid #b9c6cd; background-color: #fff; cursor: pointer; flex-shrink: 0;
      transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease;
    }
    .guest-opt input:hover:not(:disabled) { border-color: #31b270; box-shadow: 0 0 0 3px rgba(49,178,112,.12); }
    .guest-opt input:checked {
      background-color: #31b270; border-color: #31b270;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M3.5 8.5l3 3 6-7'/%3e%3c/svg%3e");
      background-size: 68% 68%; background-position: center; background-repeat: no-repeat;
    }
    .guest-opt input:disabled { cursor: default; }
    .guest-opt.locked input:checked { background-color: #9fd9bb; border-color: #9fd9bb; }
    .guest-avatar {
      width: 26px; height: 26px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
      background: #c4e8d6; display: flex; align-items: center; justify-content: center;
      color: #15663f; font-size: 0.8rem;
    }
    .guest-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .guest-name { font-size: 0.86rem; color: #002c40; font-weight: 600; }
    .guest-num { color: #6c8089; font-weight: 500; }

    /* ── Dark mode (navy-deep Sphaira) ───────────────────────────── */
    :host-context(body.dark) .dispo-page {
      background:
        radial-gradient(1200px 320px at 85% -120px, rgba(49,178,112,0.12), transparent 70%),
        #00131c;
    }
    :host-context(body.dark) .page-header,
    :host-context(body.dark) .filters-card,
    :host-context(body.dark) .dispo-table-wrapper,
    :host-context(body.dark) .empty-state { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .btn-back-clean { background: #00283a; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .btn-back-clean:hover { background: #31b270; border-color: #31b270; color: #fff; }
    :host-context(body.dark) .filter-date,
    :host-context(body.dark) .col-notes .form-control,
    :host-context(body.dark) .state-select { background: #00283a; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .table-title, :host-context(body.dark) .player-name { color: #c4e8d6; }
    :host-context(body.dark) .header-subtitle { color: #8fb3a6; }
    :host-context(body.dark) .dispo-table thead th { background: #002c40; color: #c4e8d6; border-bottom-color: #00405c; }
    :host-context(body.dark) .dispo-table tbody tr:nth-child(even) { background: #00263a; }
    :host-context(body.dark) .dispo-table tbody tr:hover { background: #013049; }
    :host-context(body.dark) tr.group-divider--guest td {
      background: #00344c; color: #c4e8d6; border-top-color: #00405c;
    }
    :host-context(body.dark) tr.group-divider--guest td i { color: #31b270; }
    :host-context(body.dark) .btn-players { background: #00283a; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .btn-players.is-open { background: #31b270; border-color: #31b270; color: #fff; }
    :host-context(body.dark) .players-menu { background: #001e2e; border-color: #00405c; }
    :host-context(body.dark) .players-menu-head { color: #c4e8d6; border-bottom-color: #00405c; }
    :host-context(body.dark) .guest-team { border-bottom-color: #00344c; }
    :host-context(body.dark) .guest-team-head { color: #c4e8d6; }
    :host-context(body.dark) .guest-team-head:hover { background: #00344c; }
    :host-context(body.dark) .guest-opt:hover { background: #013049; }
    :host-context(body.dark) .guest-name { color: #c4e8d6; }
    :host-context(body.dark) .team-tag { background: #00344c; border-color: #00405c; color: #9fc4d2; }
    :host-context(body.dark) .guest-badge { background: rgba(26,78,195,0.22); color: #9fc0ff; border-color: rgba(26,78,195,0.4); }

    @media (max-width: 768px) {
      .page-header { padding: 16px; }
      .table-title { font-size: 1.25rem; }
      .page-header-spacer { display: none; }
      .filter-block { width: 100%; }
      .filter-date { max-width: 100%; }
      .actions-block { width: 100%; margin-left: 0; }
    }
  `]
})
export class DisponibilidadEquipoComponent implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  teamId = 0;
  clubId = 0;
  userId = 0;
  dateIso = this.todayIso();

  loading = false;
  saving = false;

  playersById: Map<number, PlayerInfo> = new Map();
  rows: DisplayRow[] = [];

  /** Días de microciclo del equipo indexados por fecha (YYYY-MM-DD). */
  sessionByDate: Map<string, MicrocycleDay> = new Map();
  /** Sesión (día de microciclo) de la fecha seleccionada, si existe. */
  currentSession: MicrocycleDay | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private teamService: TeamService,
    private playerService: PlayerService,
    private dailyStatusService: PlayerDailyStatusService,
    private microcycleService: MicrocycleService,
    private medicalDiaryService: MedicalDiaryService,
    private loginService: LoginService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.userId = user?.userId ?? 0;
    });
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.teamId = +params['teamId'];
      this.bootstrap();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private bootstrap(): void {
    if (!this.teamId) return;
    this.loading = true;
    this.teamService.getTeamById(this.teamId.toString()).subscribe({
      next: (resp: any) => {
        this.clubId = resp?.data?.clubId ?? 0;
        this.loadSessions();
        this.loadAll();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Carga los días de los microciclos del equipo (entrenos/partidos) y los
   * indexa por fecha para mostrar qué sesión hay el día seleccionado. Reutiliza
   * el módulo de Microciclos, donde el staff crea las sesiones.
   */
  private loadSessions(): void {
    this.microcycleService.listByTeam(this.teamId).subscribe({
      next: (cycles) => {
        const map = new Map<string, MicrocycleDay>();
        for (const mc of cycles ?? []) {
          for (const d of mc.days ?? []) {
            if (d.dayDate) map.set(d.dayDate.substring(0, 10), d);
          }
        }
        this.sessionByDate = map;
        this.resolveCurrentSession();
        this.cdr.markForCheck();
      },
      error: () => { /* sin sesiones: la pantalla sigue funcionando */ }
    });
  }

  private resolveCurrentSession(): void {
    this.currentSession = this.sessionByDate.get(this.dateIso) ?? null;
  }

  reload(): void {
    if (!this.teamId) return;
    this.loadAll();
  }

  onDateChange(ev: Event): void {
    const t = ev.target as HTMLInputElement;
    if (t?.value) {
      this.dateIso = t.value;
      this.resolveCurrentSession();
      this.loadAll();
    }
  }

  private loadAll(): void {
    if (!this.teamId || !this.clubId) return;
    this.loading = true;
    forkJoin({
      teamDay: this.dailyStatusService.getTeamDay(this.teamId, this.dateIso),
      players: this.playerService.getPlayers(this.teamId.toString()),
      // Invitados: se comparten con el Diario médico (tabla medical_diary_guest).
      // Si el club no tiene Modo Profesional, el endpoint responde 403 → sin
      // invitados (catchError → null), y la pantalla sigue funcionando igual.
      diary: this.medicalDiaryService
        .getTeamDiary(this.teamId, this.dateIso, this.userId || undefined)
        .pipe(catchError(() => of(null)))
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ teamDay, players, diary }) => {
        this.playersById = this.toPlayerMap(players);
        this.mergeGuests(diary);
        this.rows = this.buildRows(teamDay ?? []);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.notification.error('No se han podido cargar los datos.', false);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Añade a `playersById` los jugadores invitados (de otros equipos del club)
   * asociados a este equipo. Se leen del mismo origen que el Diario médico
   * (`getTeamDiary` → entries con `guest=true`), de modo que los invitados son
   * los mismos en ambas pantallas: añadir/quitar en una se refleja en la otra.
   */
  private mergeGuests(diary: any): void {
    const entries = diary?.entries;
    if (!Array.isArray(entries)) return;
    for (const e of entries) {
      const p = e?.player;
      if (!p || !p.guest) continue;
      const id = Number(p.playerId ?? 0);
      if (!id) continue;
      this.playersById.set(id, {
        playerId: id,
        nombre: (p.nombre ?? p.fullName ?? '').toString(),
        apellido: (p.apellido ?? '').toString(),
        posicion: p.posicion ?? null,
        picturePlayer: p.picturePlayer ?? null,
        otherTeams: Array.isArray(p.otherTeams) ? p.otherTeams.filter(Boolean) : [],
        guest: true
      });
    }
  }

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
        apellido: p?.apellido ?? p?.lastName ?? '',
        posicion: p?.posicion ?? p?.position ?? null,
        picturePlayer: p?.picturePlayer ?? null
      });
    }
    return out;
  }

  private buildRows(daily: PlayerDailyStatus[]): DisplayRow[] {
    const dailyByPlayer = new Map<number, PlayerDailyStatus>();
    for (const d of daily) dailyByPlayer.set(d.playerId, d);

    const rows: DisplayRow[] = [];
    for (const [pid, info] of this.playersById.entries()) {
      const d = dailyByPlayer.get(pid);
      rows.push({
        playerId: pid,
        fullName: `${info.nombre} ${info.apellido}`.trim() || `Jugador #${pid}`,
        posicion: info.posicion,
        picturePlayer: info.picturePlayer,
        otherTeams: info.otherTeams ?? [],
        guest: !!info.guest,
        tagCode: d?.statusTagCode ?? null,
        tagLabel: d?.statusTagLabel ?? null,
        tagColor: d?.statusColor ?? null,
        notes: d?.generalObservations ?? '',
        dailyStatusId: d?.dailyStatusId,
        savingNow: false,
        savedAt: null
      });
    }
    // Orden por defecto: primero la plantilla del equipo, luego los invitados;
    // dentro de cada grupo, por posición (portero → defensa → medio → ataque →
    // otros/sin posición) y, a igualdad, alfabético por nombre.
    rows.sort((a, b) => {
      const g = (a.guest ? 1 : 0) - (b.guest ? 1 : 0);
      if (g !== 0) return g;
      const r = this.positionZoneRank(a.posicion) - this.positionZoneRank(b.posicion);
      return r !== 0 ? r : a.fullName.localeCompare(b.fullName, 'es');
    });
    return rows;
  }

  /**
   * Rango de zona de la posición para ordenar la plantilla:
   * portero(0) < defensa(1) < medio(2) < ataque(3) < otros/sin posición(4).
   * Coincide con el criterio de las tarjetas de jugador (fútbol).
   */
  /**
   * Texto del badge de un jugador invitado: el/los equipo(s) de origen a los
   * que pertenece (p. ej. "Real Murcia Juvenil"). Si no se conoce, "Invitado".
   */
  guestBadgeLabel(row: DisplayRow): string {
    return row.otherTeams && row.otherTeams.length ? row.otherTeams.join(' · ') : 'Invitado';
  }

  /** Tooltip del badge de invitado. */
  guestBadgeTitle(row: DisplayRow): string {
    return row.otherTeams && row.otherTeams.length
      ? 'Jugador invitado · pertenece a ' + row.otherTeams.join(', ')
      : 'Jugador invitado de otro equipo';
  }

  private positionZoneRank(pos: string | null | undefined): number {
    const p = (pos || '').toLowerCase().trim();
    if (!p) return 4;
    const has = (kw: string[]) => kw.some(k => p.includes(k));
    if (has(['portero', 'guardameta', 'arquero', 'goalkeeper', 'gk'])) return 0;
    // El orden importa: "mediapunta" contiene "media" (centro), no ataque.
    if (has(['defensa', 'lateral', 'central', 'cierre', 'líbero', 'libero', 'zaguero'])) return 1;
    if (has(['medio', 'media', 'centrocampista', 'pivote', 'volante', 'interior', 'carrilero'])) return 2;
    if (has(['delantero', 'extremo', 'punta', 'ariete', 'ala', 'boya'])) return 3;
    return 4;
  }

  // ─── Catálogo de estados (compartido con el Diario médico) ──────────────

  /** El día seleccionado es de partido (según el microciclo). */
  get isMatchDay(): boolean {
    return this.sessionKind === 'match';
  }

  /** Catálogo de estados activo según partido / entrenamiento. */
  get statusOptions(): StatusOption[] {
    return this.isMatchDay ? MATCH_STATUS : TRAINING_STATUS;
  }

  /** Opciones que van directas en el select (sin grupo "FC"). */
  get statusFlatOptions(): StatusOption[] {
    return this.statusOptions.filter(o => !o.group);
  }

  /** Opciones del grupo "FC · Fuera de convocatoria" (solo en partido). */
  get statusFcOptions(): StatusOption[] {
    return this.statusOptions.filter(o => o.group === 'FC');
  }

  private findStatusOption(code: string): StatusOption | undefined {
    return this.statusOptions.find(o => o.code === code);
  }

  /** El estado guardado no existe en el catálogo actual (p.ej. el día cambió de partido a entreno). */
  isUnknownStatus(row: DisplayRow): boolean {
    const code = row.tagCode || '';
    return !!code && !this.statusOptions.some(o => o.code === code);
  }

  // ─── Edición ──────────────────────────────────────────────────────────

  /**
   * Cambia el estado del jugador desde el desplegable. Las opciones dependen
   * de si el día es de partido o de entrenamiento (igual que en el Diario
   * médico). Persiste código, etiqueta y color en `player_daily_status`,
   * el mismo registro que edita el Diario médico.
   */
  onStatusChange(row: DisplayRow, ev: Event): void {
    const code = (ev.target as HTMLSelectElement).value;
    const opt = this.findStatusOption(code);
    row.tagCode = code || null;
    row.tagLabel = opt && code ? opt.label : null;
    row.tagColor = opt && code ? opt.color : null;
    this.saveRow(row);
  }

  /** Cambio de notas → guardado al perder el foco si hay algo que guardar. */
  onNotesBlur(row: DisplayRow, ev: Event): void {
    const v = (ev.target as HTMLInputElement).value ?? '';
    if (v === row.notes) return;
    row.notes = v;
    this.saveRow(row);
  }

  saveRow(row: DisplayRow): void {
    row.savingNow = true;
    row.savedAt = null;
    this.cdr.markForCheck();

    const payload: PlayerDailyStatus = {
      playerId: row.playerId,
      teamId: this.teamId,
      clubId: this.clubId,
      statusDate: this.dateIso,
      statusTagCode: row.tagCode,
      statusTagLabel: row.tagLabel,
      statusColor: row.tagColor,
      generalObservations: row.notes ?? null
    };

    this.dailyStatusService.saveStatus(payload).subscribe({
      next: (saved) => {
        row.dailyStatusId = saved?.dailyStatusId;
        row.savingNow = false;
        row.savedAt = Date.now();
        this.cdr.markForCheck();
        // Tras la animación CSS (~1.6s) limpiamos el flag para que no se
        // quede el tick estático.
        setTimeout(() => {
          row.savedAt = null;
          this.cdr.markForCheck();
        }, 1700);
      },
      error: (err) => {
        row.savingNow = false;
        const backendMsg = err?.error?.error?.msg
          || err?.error?.message
          || err?.message
          || null;
        const text = backendMsg
          ? `No se ha podido guardar el cambio: ${backendMsg}`
          : 'No se ha podido guardar el cambio.';
        this.notification.error(text, false);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Autofill ─────────────────────────────────────────────────────────

  autofillToday(): void {
    if (!this.clubId || !this.teamId) return;
    this.saving = true;
    this.dailyStatusService.autofillTeamDay(this.teamId, this.dateIso, {
      clubId: this.clubId,
      defaultCode: 'D',
      overrideExisting: false
    }).subscribe({
      next: (res) => {
        this.saving = false;
        this.notification.success(
          `Autorrellenado: ${res.created} nuevos, ${res.skipped} ya existentes.`,
          false
        );
        this.loadAll();
      },
      error: () => {
        this.saving = false;
        this.notification.error('No se ha podido autorrellenar.', false);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── UI helpers ───────────────────────────────────────────────────────

  countByZone(zone: 'green' | 'amber' | 'red'): number {
    return this.rows.filter(r => this.zoneOf(r.tagCode) === zone).length;
  }

  get countMissing(): number {
    return this.rows.filter(r => !r.tagCode).length;
  }

  /**
   * Clasificación por código del esquema del Diario médico (verde/ámbar/rojo),
   * alineada con la paleta de color: verdes → verde, naranjas → ámbar,
   * rojos → rojo.
   */
  private zoneOf(code: string | null): 'green' | 'amber' | 'red' | 'none' {
    if (!code) return 'none';
    switch (code) {
      case 'D':
      case 'D-RTC':
      case 'DC':
      case 'LS-RTP': return 'green';
      case 'EM':
      case 'MP':
      case 'SP':
      case 'DUDA':
      case 'ND-MP':
      case 'FC-MP': return 'amber';
      default: return 'red';
    }
  }

  /** Tipo de sesión del día seleccionado, derivado del microciclo. */
  get sessionKind(): 'match' | 'training' | 'rest' | 'none' {
    const dt = this.currentSession?.dayType;
    if (dt === 'match') return 'match';
    if (dt === 'training') return 'training';
    if (dt === 'rest') return 'rest';
    return 'none';
  }

  /** Etiqueta legible de la sesión del día (con MD-X si aplica). */
  get sessionLabel(): string {
    const s = this.currentSession;
    if (!s) return 'Sin sesión planificada';
    const md = (s.mdLabel || '').trim();
    switch (s.dayType) {
      case 'match':    return md ? `Partido (${md})` : 'Partido';
      case 'training': return md ? `Entrenamiento (${md})` : 'Entrenamiento';
      case 'rest':     return 'Descanso';
      default:         return 'Sesión';
    }
  }

  /** Navega a Microciclos para crear/editar las sesiones del equipo. */
  goToMicrocycles(): void {
    this.router.navigate(['/dashboard/microciclos', this.teamId]);
  }

  // ─── Desplegable "Jugadores" (invitados de otros equipos) ──────────────
  // Reutiliza el mismo almacén que el Diario médico (medical_diary_guest), así
  // que los invitados son los mismos en ambas pantallas.

  /** Menú "Jugadores" abierto. */
  playersMenuOpen = false;
  /** Posición del menú flotante (position: fixed). */
  playersMenuPos: { top: number; left: number; width: number; maxHeight: number } | null = null;
  /** Equipos del cuerpo técnico (acordeón). Se cargan al abrir el menú. */
  guestTeams: GuestTeam[] = [];
  private guestTeamsLoaded = false;
  loadingGuestTeams = false;
  /** true mientras se añade/quita un invitado (bloquea los checkboxes). */
  guestBusy = false;

  /** Abre/cierra el menú "Jugadores". Carga los equipos en la primera apertura. */
  togglePlayersMenu(ev: Event): void {
    ev.stopPropagation();
    if (this.playersMenuOpen) {
      this.playersMenuOpen = false;
      this.playersMenuPos = null;
      this.cdr.markForCheck();
      return;
    }

    this.playersMenuOpen = true;
    const btn = ev.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    let left = rect.right - width; // alinear el borde derecho con el botón
    const vw = window.innerWidth;
    if (left + width > vw - 8) left = vw - width - 8;
    if (left < 8) left = 8;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const maxHeight = Math.max(220, Math.min(440, spaceBelow));
    this.playersMenuPos = { top: rect.bottom + 6, left, width, maxHeight };

    if (!this.guestTeamsLoaded) this.loadGuestTeams();
    this.cdr.markForCheck();
  }

  /** Carga los equipos del cuerpo técnico (los suyos en la temporada actual). */
  private loadGuestTeams(): void {
    if (!this.userId) return;
    this.loadingGuestTeams = true;
    this.cdr.markForCheck();
    const season = getSelectedSeason();
    this.teamService.getTeams(String(this.userId), season).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.data;
        const list: any[] = Array.isArray(data)
          ? data
          : (data?.teams ?? data?.listTeam ?? []);
        this.guestTeams = list
          .map((t: any) => {
            const teamId = Number(t.teamId ?? t.id ?? 0);
            // El nombre visible del equipo es "categoría + nombre" (p. ej.
            // "Alevín A"); `name` a menudo viene vacío.
            const cat = (t.category ?? t.categoria ?? '').toString().trim();
            const nm = (t.name ?? t.nombre ?? '').toString().trim();
            const league = (t.levelLeague ?? '').toString().trim();
            const display = [cat, nm].filter(Boolean).join(' ').trim()
              || league
              || `Equipo #${teamId}`;
            return {
              teamId,
              name: display,
              expanded: false,
              loading: false,
              loaded: false,
              players: [] as GuestPlayer[]
            };
          })
          .filter(t => t.teamId > 0);
        this.guestTeamsLoaded = true;
        this.loadingGuestTeams = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingGuestTeams = false;
        this.notification.error('No se han podido cargar tus equipos.', false);
        this.cdr.markForCheck();
      }
    });
  }

  /** Despliega/colapsa un equipo; carga sus jugadores la primera vez. */
  toggleGuestTeam(team: GuestTeam): void {
    team.expanded = !team.expanded;
    if (team.expanded && !team.loaded && !team.loading) {
      this.loadGuestTeamPlayers(team);
    }
    this.cdr.markForCheck();
  }

  private loadGuestTeamPlayers(team: GuestTeam): void {
    team.loading = true;
    this.cdr.markForCheck();
    this.playerService.getPlayers(String(team.teamId)).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const d = res?.data;
        const list: any[] = Array.isArray(d?.players) ? d.players : (Array.isArray(d) ? d : []);
        team.players = list
          .map((p: any) => ({
            playerId: Number(p.playerId ?? 0),
            fullName: `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || `Jugador #${p.playerId}`,
            numero: p.numero != null && p.numero !== '' ? String(p.numero) : null,
            picturePlayer: p.picturePlayer ?? null
          }))
          .filter(p => p.playerId > 0);
        team.loaded = true;
        team.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        team.loading = false;
        this.notification.error('No se han podido cargar los jugadores del equipo.', false);
        this.cdr.markForCheck();
      }
    });
  }

  /** El equipo es el de la propia pantalla (su plantilla ya está en la tabla). */
  isHostTeam(team: GuestTeam): boolean {
    return team.teamId === this.teamId;
  }

  /** El jugador está actualmente en la tabla (plantilla o invitado). */
  isGuestChecked(playerId: number): boolean {
    return this.rows.some(r => r.playerId === playerId);
  }

  /**
   * El checkbox está bloqueado: el jugador ya está en la tabla como parte de
   * la PLANTILLA (no como invitado). Los invitados sí se pueden desmarcar.
   */
  isGuestLocked(playerId: number): boolean {
    const row = this.rows.find(r => r.playerId === playerId);
    return !!row && !row.guest;
  }

  /** Marca/desmarca un jugador: lo añade o quita como invitado del equipo. */
  onGuestToggle(player: GuestPlayer, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const checked = input.checked;
    if (this.isGuestLocked(player.playerId)) { input.checked = true; return; }
    if (this.guestBusy) { input.checked = !checked; return; }
    this.guestBusy = true;
    this.cdr.markForCheck();

    if (checked) {
      this.medicalDiaryService.addGuest(this.teamId, player.playerId, this.userId || undefined).subscribe({
        next: () => {
          this.guestBusy = false;
          this.notification.success(`${player.fullName} añadido.`, false);
          this.loadAll();
        },
        error: () => {
          this.guestBusy = false;
          input.checked = false;
          this.notification.error('No se ha podido añadir el jugador.', false);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.medicalDiaryService.removeGuest(this.teamId, player.playerId).subscribe({
        next: () => {
          this.guestBusy = false;
          this.notification.success(`${player.fullName} quitado.`, false);
          this.loadAll();
        },
        error: () => {
          this.guestBusy = false;
          input.checked = true;
          this.notification.error('No se ha podido quitar el jugador.', false);
          this.cdr.markForCheck();
        }
      });
    }
  }

  /** Cierra el menú "Jugadores" al hacer clic fuera, redimensionar o hacer scroll. */
  @HostListener('document:click')
  @HostListener('window:resize')
  @HostListener('window:scroll')
  onDocumentInteraction(): void {
    if (this.playersMenuOpen) {
      this.playersMenuOpen = false;
      this.playersMenuPos = null;
      this.cdr.markForCheck();
    }
  }

  get formattedDate(): string {
    const d = new Date(this.dateIso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /** ¿La fila `i` es la primera del grupo de invitados (otros equipos)? */
  isFirstGuest(i: number): boolean {
    const cur = this.rows[i];
    if (!cur || !cur.guest) return false;
    const prev = this.rows[i - 1];
    return i === 0 || !prev || !prev.guest;
  }

  trackByPlayer(_: number, row: DisplayRow): number {
    return row.playerId;
  }

  goBack(): void {
    this.location.back();
  }

  // ─── Date utils ───────────────────────────────────────────────────────

  private todayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }
}
