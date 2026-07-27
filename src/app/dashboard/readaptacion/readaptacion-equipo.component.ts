import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  ElementRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { PdfExportService } from 'src/app/core/services/pdf-export/pdf-export.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ClubModulesService, ClubModules } from 'src/app/core/services/club/club-modules.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { InjuryDocument, RTP_PHASES, RtpPhase } from 'src/app/core/services/injury/injury.model';
import {
  ReadaptacionService,
  ReadaptacionRow
} from 'src/app/core/services/readaptacion/readaptacion.service';

/**
 * Catálogo de "trabajo realizado" en dos niveles: grupos principales y, dentro
 * de cada uno, sus opciones (multi-selección). Los códigos elegidos se persisten
 * como CSV en `work_done`. Un ítem con `header: true` es un subtítulo no
 * seleccionable (p. ej. "Concéntricos"/"Excéntricos" dentro de los isotónicos).
 */
interface WorkItem {
  label: string;
  code?: string;
  header?: boolean;
}
interface WorkGroup {
  code: string;
  label: string;
  items: WorkItem[];
}

/** Fila de UI: extiende la del backend con estado local de edición. */
interface ReadaptacionUiRow extends ReadaptacionRow {
  workDoneCodes: string[];
  documents: InjuryDocument[];
  savingPhase: boolean;
  savingWork: boolean;
  savingObs: boolean;
  uploadingDoc: boolean;
  workMenuOpen: boolean;
}

/**
 * Pantalla "Readaptación" (Panel diario - Modo Profesional).
 *
 * <p>Lista los jugadores lesionados ACTIVOS (al menos una lesión abierta y en
 * baja competitiva) en una fecha, con columnas: jugador (foto + nombre), fase
 * RTP (editable, vuelca sobre la lesión), días de lesión (contador), trabajo
 * realizado (multi-selección), adjuntos (reutilizan documentos de la lesión) y
 * observaciones del día.
 *
 * Ruta: /dashboard/readaptacion-equipo/:teamId?date=YYYY-MM-DD
 */
@Component({
  selector: 'app-readaptacion-equipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="readap-page">
      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i><span>{{ 'COMMON.BACK' | translate }}</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="page-title"><i class="bi bi-person-walking me-2"></i>{{ 'READAP.TITLE' | translate }}</h2>
          <p class="page-subtitle" *ngIf="teamName">{{ teamName }} · {{ formatHumanDate(dateIso) }}</p>
          <p class="page-subtitle" *ngIf="!teamName">{{ 'READAP.SUBTITLE' | translate }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Fecha -->
        <div class="filters-bar" *ngIf="!disabledByMaster">
          <div class="filter-group">
            <label class="filter-label">{{ 'READAP.DATE' | translate }}</label>
            <div class="date-controls">
              <button class="date-nav" (click)="changeDate(-1)" [disabled]="loading" title="{{ 'READAP.PREV_DAY' | translate }}">
                <i class="bi bi-chevron-left"></i>
              </button>
              <input type="date" class="form-control form-control-sm date-input"
                     [value]="dateIso" (change)="onDateChange($event)" />
              <button class="date-nav" (click)="changeDate(1)" [disabled]="loading" title="{{ 'READAP.NEXT_DAY' | translate }}">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary ms-2" (click)="goToday()" [disabled]="loading">
                {{ 'READAP.TODAY' | translate }}
              </button>
            </div>
          </div>
          <div class="filter-group filter-actions">
            <button class="btn-export-pdf" (click)="exportPdf()" [disabled]="exportingPdf || loading || rows.length === 0">
              <span *ngIf="exportingPdf" class="spinner-border spinner-border-sm"></span>
              <i *ngIf="!exportingPdf" class="bi bi-file-earmark-pdf"></i>
              {{ 'READAP.EXPORT_PDF' | translate }}
            </button>
          </div>
        </div>

        <!-- Master toggle OFF -->
        <div *ngIf="disabledByMaster" class="empty-state empty-warn">
          <i class="bi bi-shield-lock display-5 mb-2"></i>
          <h4>{{ 'READAP.PRO_OFF_TITLE' | translate }}</h4>
          <p class="mb-0">{{ 'READAP.PRO_OFF_TEXT' | translate }}</p>
        </div>

        <!-- Loading -->
        <div *ngIf="loading && !disabledByMaster" class="empty-state">
          <div class="spinner-border spinner-sphaira" role="status"></div>
          <p class="mt-2 mb-0 text-soft">{{ 'READAP.LOADING' | translate }}</p>
        </div>

        <!-- Vacío -->
        <div *ngIf="!loading && !disabledByMaster && rows.length === 0" class="empty-state">
          <i class="bi bi-emoji-smile display-5 mb-2"></i>
          <p class="mb-0">{{ 'READAP.EMPTY' | translate }}</p>
        </div>

        <!-- Tabla -->
        <div *ngIf="!loading && !disabledByMaster && rows.length > 0" class="table-card">
          <div class="table-responsive">
            <table class="sph-table">
              <thead>
                <tr>
                  <th class="th-player">{{ 'READAP.COL_PLAYER' | translate }}</th>
                  <th class="th-phase">{{ 'READAP.COL_PHASE' | translate }}</th>
                  <th class="th-days">{{ 'READAP.COL_DAYS' | translate }}</th>
                  <th class="th-work">{{ 'READAP.COL_WORK' | translate }}</th>
                  <th class="th-files">{{ 'READAP.COL_FILES' | translate }}</th>
                  <th class="th-obs">{{ 'READAP.COL_OBS' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of rows; trackBy: trackByPlayer">
                  <!-- Jugador -->
                  <td class="col-player">
                    <div class="player-cell">
                      <div class="avatar-mini">
                        <img *ngIf="row.picturePlayer"
                             [src]="'https://appsphairatech.com/images/user/' + row.picturePlayer"
                             [alt]="row.playerName" />
                        <span *ngIf="!row.picturePlayer">{{ initials(row.playerName) }}</span>
                      </div>
                      <div class="player-info">
                        <span class="player-name">{{ row.playerName }}</span>
                        <span class="player-zone" *ngIf="row.zoneLabel || row.zone">{{ row.zoneLabel || row.zone }}</span>
                      </div>
                    </div>
                  </td>

                  <!-- Fase -->
                  <td class="col-phase">
                    <div class="phase-wrap">
                      <select class="sph-select"
                              [disabled]="row.savingPhase"
                              (change)="onPhaseChange(row, $event)">
                        <option [value]="0" [selected]="!row.rtpPhase">{{ 'READAP.PHASE_NONE' | translate }}</option>
                        <option *ngFor="let p of rtpPhases" [value]="p.phase" [selected]="p.phase === row.rtpPhase">
                          F{{ p.phase }} · {{ (p.labelKey || '') | translate }}
                        </option>
                      </select>
                      <span class="phase-dot" *ngIf="row.rtpPhase > 0"
                            [style.background]="phaseColor(row.rtpPhase)"></span>
                    </div>
                  </td>

                  <!-- Días de lesión -->
                  <td class="col-days">
                    <span class="days-pill">{{ row.daysInjured }}</span>
                    <span class="days-lbl">{{ (row.daysInjured === 1 ? 'READAP.DAY' : 'READAP.DAYS') | translate }}</span>
                  </td>

                  <!-- Trabajo realizado -->
                  <td class="col-work">
                    <div class="work-dropdown">
                      <button type="button" class="work-toggle" (click)="toggleWorkMenu(row, $event)">
                        <span class="work-summary" *ngIf="row.workDoneCodes.length">
                          <span class="work-chip" *ngFor="let l of selectedWorkLabels(row)">{{ l }}</span>
                        </span>
                        <span class="work-summary work-empty" *ngIf="!row.workDoneCodes.length">—</span>
                        <i class="bi bi-chevron-down"></i>
                      </button>
                      <div class="work-menu" *ngIf="row.workMenuOpen && workMenuPos"
                           (click)="$event.stopPropagation()"
                           [style.top.px]="workMenuPos.top"
                           [style.left.px]="workMenuPos.left"
                           [style.min-width.px]="workMenuPos.width"
                           [style.max-height.px]="workMenuPos.maxHeight">
                        <div class="work-group" *ngFor="let g of workGroups">
                          <button type="button" class="work-group-head"
                                  [class.is-open]="openGroup === g.code"
                                  (click)="toggleGroup(g.code, $event)">
                            <span class="wg-label">{{ g.label }}</span>
                            <span class="wg-right">
                              <span class="wg-count" *ngIf="groupSelectedCount(row, g) > 0">{{ groupSelectedCount(row, g) }}</span>
                              <i class="bi" [ngClass]="openGroup === g.code ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                            </span>
                          </button>
                          <div class="work-group-body" *ngIf="openGroup === g.code">
                            <ng-container *ngFor="let it of g.items">
                              <div class="work-subhead" *ngIf="it.header">{{ it.label }}</div>
                              <label class="work-opt" *ngIf="!it.header && it.code">
                                <input type="checkbox"
                                       [checked]="row.workDoneCodes.includes(it.code)"
                                       (change)="onWorkToggle(row, it.code, $event)" />
                                <span>{{ it.label }}</span>
                              </label>
                            </ng-container>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Adjuntos -->
                  <td class="col-files">
                    <div class="files-wrap">
                      <ul class="file-list" *ngIf="row.documents.length > 0">
                        <li *ngFor="let d of row.documents">
                          <a [href]="d.fileUrl" target="_blank" rel="noopener" class="file-link" [title]="d.fileName">
                            <i class="bi" [ngClass]="fileIcon(d.fileType)"></i>
                            <span class="file-name">{{ d.fileName }}</span>
                          </a>
                          <button class="file-del" (click)="deleteDoc(row, d)" title="{{ 'READAP.DELETE_FILE' | translate }}">
                            <i class="bi bi-x"></i>
                          </button>
                        </li>
                      </ul>
                      <label class="file-add" [class.is-uploading]="row.uploadingDoc">
                        <input type="file" hidden
                               accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                               (change)="onFileSelected(row, $event)" [disabled]="row.uploadingDoc" />
                        <span *ngIf="!row.uploadingDoc"><i class="bi bi-paperclip"></i> {{ 'READAP.ATTACH' | translate }}</span>
                        <span *ngIf="row.uploadingDoc"><span class="spinner-border spinner-border-sm"></span> {{ 'READAP.UPLOADING' | translate }}</span>
                      </label>
                    </div>
                  </td>

                  <!-- Observaciones -->
                  <td class="col-obs">
                    <textarea class="sph-textarea" rows="2"
                              [value]="row.observations || ''"
                              [placeholder]="'READAP.OBS_PLACEHOLDER' | translate"
                              (blur)="onObsBlur(row, $event)"></textarea>
                    <span class="saving-hint" *ngIf="row.savingObs"><span class="spinner-border spinner-border-sm"></span></span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Stage oculto para exportar a PDF (capturado por html2canvas) -->
      <div class="pdf-stage-host" aria-hidden="true">
        <div #readapPdfStage class="readap-pdf-stage" *ngIf="exportingPdf">
          <table class="rpdf-table">
            <thead>
              <tr>
                <th>{{ 'READAP.COL_PLAYER' | translate }}</th>
                <th>{{ 'READAP.COL_PHASE' | translate }}</th>
                <th class="rpdf-c">{{ 'READAP.COL_DAYS' | translate }}</th>
                <th>{{ 'READAP.COL_WORK' | translate }}</th>
                <th>{{ 'READAP.COL_OBS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows">
                <td>
                  <div class="rpdf-player">{{ row.playerName }}</div>
                  <div class="rpdf-zone" *ngIf="row.zoneLabel || row.zone">{{ row.zoneLabel || row.zone }}</div>
                </td>
                <td>{{ phasePdfLabel(row) }}</td>
                <td class="rpdf-c">{{ row.daysInjured }}</td>
                <td>
                  <span class="rpdf-chip" *ngFor="let l of selectedWorkLabels(row)">{{ l }}</span>
                  <span *ngIf="!row.workDoneCodes.length">—</span>
                </td>
                <td class="rpdf-obs">{{ row.observations || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .readap-page { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background: #f4f4f4; min-height: 100vh; }
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; gap: 12px; border-bottom: 1px solid #e9ecef; background: #fff;
    }
    .header-center { text-align: center; flex: 1; }
    .page-title { margin: 0; font-weight: 700; color: #002c40; display: inline-flex; align-items: center; }
    .page-title i { color: #31b270; }
    .page-subtitle { margin: 4px 0 0; color: #636363; font-size: 0.92rem; }
    .btn-back-clean {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(49, 178, 112, 0.08); border: 0; color: #002c40;
      padding: 0.4rem 0.75rem; border-radius: 8px; cursor: pointer;
      transition: background .2s, transform .15s; font-weight: 600;
    }
    .btn-back-clean:hover { background: rgba(49, 178, 112, 0.18); transform: translateX(-2px); }
    .page-header-spacer { width: 110px; }
    .spinner-sphaira { color: #31b270; }

    .filters-bar {
      display: flex; gap: 16px; flex-wrap: wrap; padding: 16px 20px;
      background: #fff; border-radius: 12px; margin: 16px 0;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04);
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filter-label { font-size: 0.72rem; color: #636363; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .date-controls { display: flex; gap: 6px; align-items: center; }
    .date-input { width: 150px; border: 1px solid #d4dde2; color: #002c40; font-weight: 500; }
    .date-input:focus { border-color: #31b270; box-shadow: 0 0 0 0.2rem rgba(49, 178, 112, 0.15); }
    .date-nav { background: #fff; border: 1px solid #d4dde2; border-radius: 8px; padding: 4px 10px; cursor: pointer; color: #002c40; transition: all 0.15s ease; }
    .date-nav:disabled { opacity: 0.5; cursor: not-allowed; }
    .date-nav:hover:not(:disabled) { background: #c4e8d6; border-color: #31b270; }
    .filters-bar .btn-outline-primary { border-color: #31b270; color: #31b270; font-weight: 600; }
    .filters-bar .btn-outline-primary:hover { background: #31b270; border-color: #31b270; color: #fff; }
    .filter-actions { margin-left: auto; justify-content: flex-end; }
    .btn-export-pdf {
      display: inline-flex; align-items: center; gap: 8px; background: #002c40; color: #fff;
      border: 0; border-radius: 8px; padding: 8px 14px; font-weight: 600; font-size: 0.85rem; cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-export-pdf:hover:not(:disabled) { background: #013a52; }
    .btn-export-pdf:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-export-pdf i { color: #31b270; }

    /* Stage oculto para PDF */
    .pdf-stage-host { position: fixed; left: -99999px; top: 0; width: 920px; background: #fff; }
    .readap-pdf-stage { width: 920px; padding: 6px; background: #fff; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #002c40; }
    .rpdf-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .rpdf-table thead th { background: #002c40; color: #fff; text-align: left; padding: 9px 10px; font-weight: 700; }
    .rpdf-table thead th.rpdf-c { text-align: center; }
    .rpdf-table tbody td { padding: 8px 10px; border-bottom: 1px solid #e3e9ed; vertical-align: top; }
    .rpdf-table tbody td.rpdf-c { text-align: center; font-weight: 700; }
    .rpdf-table tbody tr:nth-child(even) td { background: #f4f7f9; }
    .rpdf-player { font-weight: 700; }
    .rpdf-zone { font-size: 11px; color: #636363; margin-top: 2px; }
    .rpdf-obs { color: #444; }
    .rpdf-chip {
      display: inline-block; background: #eaf6ef; color: #15663f; border: 1px solid #cfe9da;
      border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; margin: 0 4px 4px 0;
    }

    .empty-state { padding: 48px 16px; text-align: center; color: #636363; background: #fff; border-radius: 12px; margin-top: 16px; box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04); }
    .empty-state i { color: #31b270; }
    .empty-warn { background: #fff4dc; border: 1px solid #f3dc99; color: #6d4f00; }
    .empty-warn i { color: #b07b00; }
    .empty-warn h4 { color: #002c40; margin-bottom: 8px; font-weight: 700; }

    /* ── Tabla Sphaira ───────────────────────────────────────── */
    .table-card {
      background: #fff; border-radius: 14px; margin: 8px 0 32px;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.06); border: 1px solid #eef1f3; overflow: hidden;
    }
    .table-responsive { overflow-x: auto; }
    .sph-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 980px; }
    .sph-table thead th {
      position: sticky; top: 0; z-index: 2;
      background: linear-gradient(135deg, #002c40 0%, #013a52 100%); color: #fff;
      font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      padding: 12px 14px; text-align: left; white-space: nowrap;
    }
    .th-player { min-width: 200px; }
    .th-phase { min-width: 260px; }
    .th-days { min-width: 90px; }
    .th-work { min-width: 170px; width: 280px; }
    .th-files { min-width: 180px; }
    .th-obs { min-width: 220px; }
    .sph-table tbody td { padding: 12px 14px; border-bottom: 1px solid #eef1f3; vertical-align: top; color: #002c40; }
    .sph-table tbody tr:nth-child(even) { background: #f9fbfc; }
    .sph-table tbody tr:hover { background: #f1f8f4; }

    .player-cell { display: flex; align-items: center; gap: 10px; }
    .avatar-mini {
      width: 36px; height: 36px; border-radius: 50%; overflow: hidden;
      background: #c4e8d6; display: flex; align-items: center; justify-content: center;
      color: #15663f; font-weight: 700; font-size: 0.8rem; flex-shrink: 0;
    }
    .avatar-mini img { width: 100%; height: 100%; object-fit: cover; }
    .player-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .player-name { font-weight: 700; color: #002c40; }
    .player-zone { font-size: 0.78rem; color: #636363; }

    .phase-wrap { display: flex; align-items: center; gap: 8px; }
    .sph-select {
      border: 1px solid #d4dde2; border-radius: 8px; padding: 6px 28px 6px 10px; color: #002c40;
      font-weight: 600; font-size: 0.85rem; background: #fff; width: 100%; min-width: 220px;
      text-overflow: ellipsis;
    }
    .sph-select:focus { border-color: #31b270; box-shadow: 0 0 0 0.2rem rgba(49, 178, 112, 0.15); outline: none; }
    .phase-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }

    .col-days { white-space: nowrap; }
    .days-pill {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 30px; height: 26px; padding: 0 8px; border-radius: 999px;
      background: #c4e8d6; color: #002c40; font-weight: 800; font-size: 0.85rem;
    }
    .days-lbl { font-size: 0.78rem; color: #636363; margin-left: 6px; }

    .work-dropdown { position: relative; }
    .work-toggle {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
      width: 100%; min-width: 150px; max-width: 260px; background: #fff; border: 1px solid #d4dde2;
      border-radius: 8px; padding: 6px 10px; cursor: pointer; color: #002c40; font-weight: 600; font-size: 0.85rem;
    }
    .work-toggle:hover { border-color: #31b270; }
    .work-toggle .bi-chevron-down { flex-shrink: 0; margin-top: 3px; }
    .work-summary { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 4px; color: #636363; }
    .work-summary.work-empty { display: block; }
    .work-chip {
      display: inline-block; background: #eaf6ef; color: #15663f; border: 1px solid #cfe9da;
      border-radius: 999px; padding: 2px 8px; font-size: 0.72rem; font-weight: 700; line-height: 1.35;
      white-space: normal; word-break: break-word;
    }
    .work-menu {
      position: fixed; z-index: 1050; min-width: 220px;
      background: #fff; border: 1px solid #e3e9ed; border-radius: 10px; padding: 8px;
      box-shadow: 0 8px 24px rgba(0, 44, 64, 0.16); max-height: 300px; overflow-y: auto;
    }
    .work-menu-empty { font-size: 0.82rem; color: #636363; padding: 8px; text-align: center; }
    .work-opt { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; color: #002c40; }
    .work-opt:hover { background: #f1f8f4; }

    .work-group { border-bottom: 1px solid #eef1f3; }
    .work-group:last-child { border-bottom: 0; }
    .work-group-head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      width: 100%; background: none; border: 0; cursor: pointer; text-align: left;
      padding: 8px 8px; border-radius: 8px; color: #002c40; font-weight: 700; font-size: 0.82rem;
    }
    .work-group-head:hover { background: #f1f8f4; }
    .work-group-head.is-open { color: #15663f; }
    .wg-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .wg-right { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .wg-count {
      display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px;
      padding: 0 5px; border-radius: 999px; background: #31b270; color: #fff; font-size: 0.7rem; font-weight: 800;
    }
    .work-group-body { padding: 2px 0 6px 6px; }
    .work-subhead {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      color: #636363; padding: 6px 8px 2px;
    }

    .files-wrap { display: flex; flex-direction: column; gap: 6px; }
    .file-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .file-list li { display: flex; align-items: center; gap: 6px; }
    .file-link { display: inline-flex; align-items: center; gap: 6px; color: #002c40; text-decoration: none; font-size: 0.82rem; max-width: 150px; }
    .file-link:hover { color: #31b270; }
    .file-link i { color: #31b270; }
    .file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-del { background: none; border: 0; color: #b1231b; cursor: pointer; padding: 0 2px; line-height: 1; }
    .file-add {
      display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
      font-size: 0.8rem; font-weight: 600; color: #31b270; padding: 4px 8px;
      border: 1px dashed #a8dcc1; border-radius: 8px; width: fit-content;
    }
    .file-add:hover { background: #f1f8f4; }
    .file-add.is-uploading { opacity: 0.7; cursor: progress; }

    .sph-textarea {
      width: 100%; min-width: 200px; border: 1px solid #d4dde2; border-radius: 8px;
      padding: 8px 10px; color: #002c40; font-size: 0.85rem; resize: vertical;
    }
    .sph-textarea:focus { border-color: #31b270; box-shadow: 0 0 0 0.2rem rgba(49, 178, 112, 0.15); outline: none; }
    .saving-hint { color: #31b270; font-size: 0.75rem; }
    .text-soft { color: #636363; }

    @media (max-width: 640px) {
      .page-header-spacer { display: none; }
    }

    /* ── Dark mode ───────────────────────────────────────────── */
    :host-context(body.dark) .readap-page { background: #00131c; }
    :host-context(body.dark) .page-header { background: #001e2e; border-bottom-color: #00405c; }
    :host-context(body.dark) .page-title { color: #c4e8d6; }
    :host-context(body.dark) .page-subtitle { color: #94a3b8; }
    :host-context(body.dark) .filters-bar,
    :host-context(body.dark) .table-card,
    :host-context(body.dark) .empty-state { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .sph-table tbody td { color: #c4e8d6; border-bottom-color: #00405c; }
    :host-context(body.dark) .sph-table tbody tr:nth-child(even) { background: #00161f; }
    :host-context(body.dark) .sph-table tbody tr:hover { background: #002b3d; }
    :host-context(body.dark) .player-name { color: #c4e8d6; }
    :host-context(body.dark) .player-zone, :host-context(body.dark) .days-lbl, :host-context(body.dark) .text-soft { color: #94a3b8; }
    :host-context(body.dark) .sph-select,
    :host-context(body.dark) .date-input,
    :host-context(body.dark) .work-toggle,
    :host-context(body.dark) .sph-textarea { background: #00131c; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .work-menu { background: #001e2e; border-color: #00405c; }
    :host-context(body.dark) .work-opt { color: #c4e8d6; }
    :host-context(body.dark) .work-opt:hover, :host-context(body.dark) .sph-table tbody tr:hover { background: #002b3d; }
    :host-context(body.dark) .work-group { border-bottom-color: #00405c; }
    :host-context(body.dark) .work-group-head { color: #c4e8d6; }
    :host-context(body.dark) .work-group-head:hover { background: #002b3d; }
    :host-context(body.dark) .work-group-head.is-open { color: #7ee0ad; }
    :host-context(body.dark) .work-subhead { color: #94a3b8; }
    :host-context(body.dark) .work-chip { background: #00374e; color: #7ee0ad; border-color: #00557a; }
    :host-context(body.dark) .date-nav { background: #00131c; border-color: #00405c; color: #c4e8d6; }
  `]
})
export class ReadaptacionEquipoComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  teamId = 0;
  teamName = '';
  clubId = 0;
  userId = 0;
  profileId = 0;
  registeredByName: string | null = null;
  modules: ClubModules = { clubId: 0, wellnessEnabled: false, rpeEnabled: false, professionalModeEnabled: false, accessControlEnabled: false, menuSport: 'futbol' };

  dateIso = this.todayIso();
  loading = false;
  disabledByMaster = false;
  rows: ReadaptacionUiRow[] = [];

  exportingPdf = false;
  @ViewChild('readapPdfStage') pdfStageRef?: ElementRef<HTMLElement>;

  rtpPhases: RtpPhase[] = RTP_PHASES;

  /** Grupo actualmente expandido en el desplegable (acordeón, uno a la vez). */
  openGroup: string | null = null;

  /** Posición calculada del menú flotante (position: fixed) para no recortarse. */
  workMenuPos: { top: number; left: number; width: number; maxHeight: number } | null = null;

  /** Catálogo de "trabajo realizado" en dos niveles (grupos → opciones). */
  workGroups: WorkGroup[] = [
    { code: 'g1', label: '1. Ejercicios de movilidad articular', items: [
      { code: 'g1_1', label: 'Movilidad pasiva' },
      { code: 'g1_2', label: 'Movilidad activo-asistida' },
      { code: 'g1_3', label: 'Movilidad activa' },
      { code: 'g1_4', label: 'Movilidad analítica' },
      { code: 'g1_5', label: 'Movilidad global' },
      { code: 'g1_6', label: 'Movilidad neurodinámica' },
    ]},
    { code: 'g2', label: '2. Ejercicios de flexibilidad', items: [
      { code: 'g2_1', label: 'Estiramientos estáticos' },
      { code: 'g2_2', label: 'Estiramientos dinámicos' },
      { code: 'g2_3', label: 'Estiramientos balísticos' },
      { code: 'g2_4', label: 'Facilitación neuromuscular propioceptiva (FNP)' },
    ]},
    { code: 'g3', label: '3. Ejercicios isométricos', items: [
      { code: 'g3_1', label: 'Isométricos submáximos' },
      { code: 'g3_2', label: 'Isométricos máximos (overcoming)' },
      { code: 'g3_3', label: 'Isométricos mantenidos (yelding)' },
    ]},
    { code: 'g4', label: '4. Ejercicios isotónicos', items: [
      { label: 'Concéntricos', header: true },
      { code: 'g4_1', label: 'Predominio concéntrico' },
      { code: 'g4_2', label: 'Concéntricos explosivos' },
      { code: 'g4_3', label: 'Concéntricos controlados' },
      { label: 'Excéntricos', header: true },
      { code: 'g4_4', label: 'Excéntricos lentos' },
      { code: 'g4_5', label: 'Excéntricos pesados' },
      { code: 'g4_6', label: 'Excéntricos sobrecargados' },
      { code: 'g4_7', label: 'Excéntricos reactivos (ISO catch)' },
    ]},
    { code: 'g5', label: '5. Ejercicios de fuerza', items: [
      { code: 'g5_1', label: 'Fuerza resistencia' },
      { code: 'g5_2', label: 'Hipertrofia' },
      { code: 'g5_3', label: 'Fuerza máxima' },
      { code: 'g5_4', label: 'Fuerza potencia' },
    ]},
    { code: 'g6', label: '6. Ejercicios de control motor', items: [
      { code: 'g6_1', label: 'Reaprendizaje del gesto' },
      { code: 'g6_2', label: 'Coordinación intermuscular' },
      { code: 'g6_3', label: 'Coordinación intramuscular' },
      { code: 'g6_4', label: 'Control lumbopélvico' },
      { code: 'g6_5', label: 'Control escapular' },
    ]},
    { code: 'g7', label: '7. Ejercicios propioceptivos', items: [
      { code: 'g7_1', label: 'Bipedestación estable' },
      { code: 'g7_2', label: 'Bipedestación inestable' },
      { code: 'g7_3', label: 'Apoyo monopodal' },
      { code: 'g7_4', label: 'Perturbaciones externas monopodal' },
      { code: 'g7_5', label: 'Trabajo con ojos cerrados monopodal' },
      { code: 'g7_6', label: 'Doble tarea' },
    ]},
    { code: 'g8', label: '8. Ejercicios de resistencia cardiovascular', items: [
      { code: 'g8_1', label: 'Caminata' },
      { code: 'g8_2', label: 'Bicicleta' },
      { code: 'g8_3', label: 'Elíptica' },
      { code: 'g8_4', label: 'Carrera continua' },
      { code: 'g8_5', label: 'Remo' },
      { code: 'g8_6', label: 'Natación' },
      { code: 'g8_7', label: 'Intervalos aeróbicos' },
    ]},
    { code: 'g9', label: '9. Ejercicios metabólicos', items: [
      { code: 'g9_1', label: 'HIIT sin impacto' },
      { code: 'g9_2', label: 'HIIT con impacto' },
    ]},
    { code: 'g10', label: '10. Ejercicios pliométricos', items: [
      { code: 'g10_1', label: 'Saltos verticales' },
      { code: 'g10_2', label: 'Saltos horizontales' },
      { code: 'g10_3', label: 'Multisaltos (plyo extensiva)' },
      { code: 'g10_4', label: 'Multisaltos (plyo extensiva) unilateral' },
      { code: 'g10_5', label: 'Drop jumps' },
      { code: 'g10_6', label: 'Drop jumps unilateral' },
      { code: 'g10_7', label: 'Hops monopodales' },
      { code: 'g10_8', label: 'Bounding' },
    ]},
    { code: 'g11', label: '11. Ejercicios de desaceleración', items: [
      { code: 'g11_1', label: 'Frenadas lineales' },
      { code: 'g11_2', label: 'Frenadas laterales' },
      { code: 'g11_3', label: 'Landings' },
      { code: 'g11_4', label: 'Landings laterales' },
      { code: 'g11_5', label: 'Reaceleraciones horizontales' },
      { code: 'g11_6', label: 'Reaceleraciones laterales' },
    ]},
    { code: 'g12', label: '12. Ejercicios de aceleración', items: [
      { code: 'g12_1', label: 'Salidas' },
      { code: 'g12_2', label: 'Sprint progresivo' },
      { code: 'g12_3', label: 'Sprint máximo' },
      { code: 'g12_4', label: 'Arrastres' },
      { code: 'g12_5', label: 'Empujes' },
    ]},
    { code: 'g13', label: '13. Ejercicios de carrera', items: [
      { code: 'g13_1', label: 'Técnica de carrera' },
      { code: 'g13_2', label: 'Carrera lineal' },
      { code: 'g13_3', label: 'Carrera curvilínea' },
      { code: 'g13_4', label: 'Carrera multidireccional' },
      { code: 'g13_5', label: 'Sprint' },
      { code: 'g13_6', label: 'Repeated sprint' },
    ]},
    { code: 'g14', label: '14. Ejercicios de cambios de dirección (COD)', items: [
      { code: 'g14_1', label: 'COD de 45°' },
      { code: 'g14_2', label: 'COD de 90°' },
      { code: 'g14_3', label: 'COD de 180°' },
    ]},
    { code: 'g15', label: '15. Ejercicios de potencia', items: [
      { code: 'g15_1', label: 'Lanzamientos verticales' },
      { code: 'g15_2', label: 'Lanzamientos horizontales' },
      { code: 'g15_3', label: 'Lanzamientos laterales' },
      { code: 'g15_4', label: 'Saltos cargados' },
      { code: 'g15_5', label: 'Levantamientos olímpicos' },
    ]},
    { code: 'g16', label: '16. Ejercicios específicos del deporte', items: [
      { code: 'g16_1', label: 'Técnica individual' },
      { code: 'g16_2', label: 'Circuito de agilidad' },
      { code: 'g16_3', label: 'Acciones reducidas' },
      { code: 'g16_4', label: 'Acciones parciales' },
      { code: 'g16_5', label: 'Situaciones reales de juego' },
    ]},
    { code: 'g17', label: '17. Ejercicios cognitivos integrados', items: [
      { code: 'g17_1', label: 'Dual task' },
      { code: 'g17_2', label: 'Toma de decisiones' },
      { code: 'g17_3', label: 'Atención dividida' },
      { code: 'g17_4', label: 'Reacción visual' },
      { code: 'g17_5', label: 'Reacción auditiva' },
    ]},
    { code: 'g18', label: '18. Ejercicios de retorno al deporte (RTS)', items: [
      { code: 'g18_1', label: 'Return to training parcial' },
      { code: 'g18_2', label: 'Return to training' },
      { code: 'g18_3', label: 'Return to play' },
    ]},
  ];

  /** Lookup código → etiqueta para construir el resumen. */
  private workLabelByCode = new Map<string, string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private clubService: ClubService,
    private clubModulesService: ClubModulesService,
    private notification: NotificationService,
    private injuryService: InjuryService,
    private readaptacionService: ReadaptacionService,
    private pdfExport: PdfExportService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    this.workGroups.forEach(g => g.items.forEach(it => {
      if (it.code) this.workLabelByCode.set(it.code, it.label);
    }));
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.teamId = Number(params.get('teamId') ?? 0);
      this.loadTeamName();
      this.bootstrap();
    });
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(qp => {
      const d = qp.get('date');
      if (d) this.dateIso = d;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Carga ────────────────────────────────────────────────
  private bootstrap(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.userId = user?.userId ?? 0;
      this.profileId = user?.profileType?.profileId ?? 0;
      this.registeredByName = this.buildUserName(user);
      this.resolveClubId(user).then(clubId => {
        this.clubId = clubId;
        if (!clubId) {
          this.notification.error('No se ha podido identificar el club.', false);
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.clubModulesService.getModules(clubId).subscribe({
          next: (m) => {
            this.modules = m;
            if (!m.professionalModeEnabled) {
              this.disabledByMaster = true;
              this.loading = false;
              this.cdr.markForCheck();
              return;
            }
            this.load();
          },
          error: () => {
            this.notification.error('No se han podido cargar los permisos del club.', false);
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      });
    });
  }

  private async resolveClubId(user: any): Promise<number> {
    const stored = Number(sessionStorage.getItem('clubId') ?? '0');
    if (stored > 0) return stored;
    if (!user?.userId) return 0;
    return new Promise<number>((resolve) => {
      this.clubService.getClubForEntrenador(user.userId).subscribe({
        next: (resp: any) => {
          const cid = Number(resp?.data ?? 0);
          if (cid > 0) sessionStorage.setItem('clubId', String(cid));
          resolve(cid);
        },
        error: () => resolve(0)
      });
    });
  }

  private buildUserName(user: any): string | null {
    if (!user) return null;
    const n = (user.nombre ?? user.name ?? '').toString().trim();
    const a = (user.apellido ?? user.lastName ?? '').toString().trim();
    const full = (n + ' ' + a).trim();
    return full || (user.email ?? null);
  }

  private loadTeamName(): void {
    // Best-effort: el nombre del equipo no es crítico para la pantalla.
    if (!this.teamId) return;
  }

  private load(): void {
    if (!this.teamId) return;
    this.loading = true;
    this.cdr.markForCheck();
    this.readaptacionService.getForDate(this.teamId, this.dateIso).subscribe({
      next: (bundle) => {
        if (bundle.clubId) this.clubId = bundle.clubId;
        this.rows = (bundle.entries || []).map(e => this.toUiRow(e));
        this.loading = false;
        this.cdr.markForCheck();
        this.rows.forEach(r => this.loadDocuments(r));
      },
      error: () => {
        this.notification.error('No se ha podido cargar la readaptación.', false);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private toUiRow(e: ReadaptacionRow): ReadaptacionUiRow {
    return {
      ...e,
      workDoneCodes: (e.workDone || '').split(',').map(s => s.trim()).filter(Boolean),
      documents: [],
      savingPhase: false,
      savingWork: false,
      savingObs: false,
      uploadingDoc: false,
      workMenuOpen: false
    };
  }

  private loadDocuments(row: ReadaptacionUiRow): void {
    if (!row.injuryId) return;
    this.injuryService.getDocuments(row.injuryId).subscribe(docs => {
      row.documents = (docs || []).filter(d => d.documentCategory === 'readaptacion');
      this.cdr.markForCheck();
    });
  }

  // ─── Fecha ────────────────────────────────────────────────
  onDateChange(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    if (v) { this.dateIso = v; this.load(); }
  }
  changeDate(delta: number): void {
    const d = new Date(this.dateIso + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    this.dateIso = this.toIso(d);
    this.load();
  }
  goToday(): void { this.dateIso = this.todayIso(); this.load(); }

  // ─── Fase RTP ─────────────────────────────────────────────
  onPhaseChange(row: ReadaptacionUiRow, ev: Event): void {
    const phase = Number((ev.target as HTMLSelectElement).value);
    if (!row.injuryId) return;
    row.savingPhase = true;
    this.cdr.markForCheck();
    this.injuryService.updateRtpPhase(row.injuryId, phase).subscribe({
      next: () => {
        row.rtpPhase = phase;
        row.savingPhase = false;
        this.cdr.markForCheck();
      },
      error: () => {
        row.savingPhase = false;
        this.notification.error('No se ha podido actualizar la fase.', false);
        this.cdr.markForCheck();
      }
    });
  }

  phaseColor(phase: number): string {
    const p = this.rtpPhases.find(x => x.phase === phase);
    return p?.color || '#636363';
  }

  // ─── Trabajo realizado ────────────────────────────────────
  toggleWorkMenu(row: ReadaptacionUiRow, ev: Event): void {
    ev.stopPropagation();
    const willOpen = !row.workMenuOpen;
    this.rows.forEach(r => r.workMenuOpen = false);
    row.workMenuOpen = willOpen;
    this.openGroup = null;
    if (willOpen) {
      const btn = ev.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const width = Math.max(rect.width, 280);
      let left = rect.left;
      const vw = window.innerWidth;
      if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const maxHeight = Math.max(180, Math.min(320, spaceBelow));
      this.workMenuPos = { top: rect.bottom + 4, left, width, maxHeight };
    } else {
      this.workMenuPos = null;
    }
    this.cdr.markForCheck();
  }

  toggleGroup(code: string, ev: Event): void {
    ev.stopPropagation();
    this.openGroup = this.openGroup === code ? null : code;
    this.cdr.markForCheck();
  }

  /** Nº de opciones seleccionadas dentro de un grupo (para el badge). */
  groupSelectedCount(row: ReadaptacionUiRow, g: WorkGroup): number {
    return g.items.reduce((n, it) => n + (it.code && row.workDoneCodes.includes(it.code) ? 1 : 0), 0);
  }

  onWorkToggle(row: ReadaptacionUiRow, code: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const set = new Set(row.workDoneCodes);
    if (checked) set.add(code); else set.delete(code);
    row.workDoneCodes = Array.from(set);
    this.persistWork(row);
  }

  workSummary(row: ReadaptacionUiRow): string {
    if (!row.workDoneCodes.length) return '—';
    const labels = row.workDoneCodes.map(c => this.workLabelByCode.get(c) || c);
    return labels.join(', ');
  }

  /** Etiquetas de los trabajos seleccionados (para pintarlas como chips apilables). */
  selectedWorkLabels(row: ReadaptacionUiRow): string[] {
    return row.workDoneCodes.map(c => this.workLabelByCode.get(c) || c);
  }

  /** Etiqueta de fase para el PDF (p. ej. "F1 · Control clínico inicial"). */
  phasePdfLabel(row: ReadaptacionUiRow): string {
    if (!row.rtpPhase) return this.translate.instant('READAP.PHASE_NONE');
    const p = this.rtpPhases.find(x => x.phase === row.rtpPhase);
    const lbl = p?.labelKey ? this.translate.instant(p.labelKey) : '';
    return 'F' + row.rtpPhase + (lbl ? ' · ' + lbl : '');
  }

  // ─── Exportar PDF ─────────────────────────────────────────
  async exportPdf(): Promise<void> {
    if (this.exportingPdf || this.rows.length === 0) return;
    this.exportingPdf = true;
    this.cdr.markForCheck();
    // Esperar a que Angular pinte el stage oculto antes de capturarlo.
    await new Promise(resolve => setTimeout(resolve, 60));
    const el = this.pdfStageRef?.nativeElement;
    if (!el) { this.exportingPdf = false; this.cdr.markForCheck(); return; }
    try {
      const subtitle = (this.teamName ? this.teamName + ' · ' : '') + this.formatHumanDate(this.dateIso);
      await this.pdfExport.exportReport(el, {
        fileName: `readaptacion_${this.teamId}_${this.dateIso}`,
        title: this.translate.instant('READAP.TITLE'),
        subtitle,
        type: 'training',
        clubId: this.clubId
      });
    } catch {
      this.notification.error('No se ha podido exportar el PDF.', false);
    } finally {
      this.exportingPdf = false;
      this.cdr.markForCheck();
    }
  }

  private persistWork(row: ReadaptacionUiRow): void {
    row.savingWork = true;
    this.cdr.markForCheck();
    this.readaptacionService.save(row.playerId, this.dateIso, {
      teamId: this.teamId,
      clubId: this.clubId,
      workDone: row.workDoneCodes.join(',')
    }).subscribe(() => { row.savingWork = false; this.cdr.markForCheck(); });
  }

  // ─── Observaciones ────────────────────────────────────────
  onObsBlur(row: ReadaptacionUiRow, ev: Event): void {
    const v = (ev.target as HTMLTextAreaElement).value;
    if ((row.observations || '') === v) return;
    row.observations = v;
    row.savingObs = true;
    this.cdr.markForCheck();
    this.readaptacionService.save(row.playerId, this.dateIso, {
      teamId: this.teamId,
      clubId: this.clubId,
      observations: v
    }).subscribe(() => { row.savingObs = false; this.cdr.markForCheck(); });
  }

  // ─── Adjuntos ─────────────────────────────────────────────
  onFileSelected(row: ReadaptacionUiRow, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file || !row.injuryId) return;
    row.uploadingDoc = true;
    this.cdr.markForCheck();
    this.injuryService.uploadDocument(row.injuryId, file, '', this.registeredByName || '', 'readaptacion')
      .subscribe({
        next: (doc) => {
          if (doc) row.documents = [...row.documents, doc];
          row.uploadingDoc = false;
          input.value = '';
          this.cdr.markForCheck();
        },
        error: () => {
          row.uploadingDoc = false;
          this.notification.error('No se ha podido subir el archivo.', false);
          this.cdr.markForCheck();
        }
      });
  }

  deleteDoc(row: ReadaptacionUiRow, doc: InjuryDocument): void {
    if (!row.injuryId) return;
    this.injuryService.deleteDocument(row.injuryId, doc.id).subscribe(ok => {
      if (ok) {
        row.documents = row.documents.filter(d => d.id !== doc.id);
        this.cdr.markForCheck();
      }
    });
  }

  fileIcon(type: string | null | undefined): string {
    switch ((type || '').toLowerCase()) {
      case 'pdf': return 'bi-file-earmark-pdf';
      case 'image': return 'bi-file-earmark-image';
      default: return 'bi-file-earmark';
    }
  }

  // ─── Cierre del menú al hacer clic fuera / scroll / resize ──
  @HostListener('document:click')
  @HostListener('window:resize')
  @HostListener('window:scroll')
  onDocClick(): void {
    let changed = false;
    this.rows.forEach(r => { if (r.workMenuOpen) { r.workMenuOpen = false; changed = true; } });
    if (changed) { this.workMenuPos = null; this.cdr.markForCheck(); }
  }

  // ─── Navegación / utils ───────────────────────────────────
  goBack(): void { this.location.back(); }

  trackByPlayer(_i: number, row: ReadaptacionUiRow): number { return row.playerId; }

  initials(name: string): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  formatHumanDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  private todayIso(): string { return this.toIso(new Date()); }
  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
