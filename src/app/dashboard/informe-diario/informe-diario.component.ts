import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import {
  PlayerDailyStatusService,
  PlayerDailyStatus
} from 'src/app/core/services/player-daily-status/player-daily-status.service';
import { MicrocycleService, MicrocycleDay } from 'src/app/core/services/microcycle/microcycle.service';
import { PdfExportService } from 'src/app/core/services/pdf-export/pdf-export.service';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';
import { InformeDiarioService, InformeDiario } from 'src/app/core/services/informe-diario/informe-diario.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

interface PlayerInfo {
  playerId: number;
  nombre: string;
  apellido: string;
  picturePlayer?: string | null;
}

/** Claves de las columnas de datos (reordenables / redimensionables). */
type ColKey = 'name' | 'equipo' | 'estado' | 'fisio' | 'observaciones' | 'prevision';

/** Definición de una columna de datos del informe (orden = posición en el array). */
interface ColumnDef {
  key: ColKey;
  label: string;
  /** Ancho en px (editable arrastrando el borde derecho de la cabecera). */
  width: number;
}

/**
 * Fila editable del informe diario. Precargada cruzando la disponibilidad/
 * diario médico (`player_daily_status`) con la plantilla del equipo. El fisio
 * puede editar cada campo, marcar/desmarcar "Acude a fisio" y decidir si la
 * fila se incluye en el informe final ({@link include}).
 */
interface ReportRow {
  playerId: number;
  fullName: string;
  /** Equipo(s) del jugador en la temporada (el actual primero). Distingue invitados. */
  equipo?: string;
  picturePlayer?: string | null;
  /** El fisio puede excluir jugadores del informe (p. ej. los sin novedad). */
  include: boolean;
  /** Estado del jugador tras la sesión (texto editable, p. ej. "DT · Disponibilidad total"). */
  estado: string;
  /** Acude a fisioterapia ese día. */
  acudeFisio: boolean;
  /** Observaciones del fisio (tratamiento / notas generales). */
  observaciones: string;
  /** Previsión del estado para la siguiente sesión. */
  prevision: string;
  /** Alto personalizado de la fila en px (arrastrando el borde inferior). */
  height?: number | null;
  /** Cargando la sugerencia de IA para las observaciones de esta fila. */
  aiLoading?: boolean;
}

/**
 * Pantalla "Informe diario" del cuerpo técnico/fisio (Modo Profesional).
 *
 * Genera un informe editable por jugador a partir de los datos del Panel
 * diario (disponibilidad, diario médico, microciclo). El fisio puede ajustar
 * cada celda, pedir una sugerencia de redacción a la IA y exportar el
 * resultado a PDF con la marca Sphaira y el escudo del club.
 *
 * Ruta: /dashboard/informe-diario/:teamId  (query param `date` = yyyy-MM-dd).
 */
@Component({
  selector: 'app-informe-diario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inf-page">
      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="page-title">
            <i class="bi bi-file-earmark-medical me-2"></i>Informe diario
          </h2>
          <p class="page-subtitle">{{ teamName }} · {{ formatHumanDate(sessionDate) }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Barra de acciones -->
        <div class="actions-bar" *ngIf="!loading">
          <div class="actions-left">
            <span class="meta-chip"><i class="bi bi-people-fill"></i> {{ includedCount }} / {{ rows.length }} jugadores</span>
            <span class="meta-chip" *ngIf="nextSessionDate"><i class="bi bi-calendar2-week"></i> Siguiente: {{ formatHumanDate(nextSessionDate) }}</span>
            <span class="meta-chip meta-chip--saved" *ngIf="savedInfo?.updatedAt">
              <i class="bi bi-cloud-check-fill"></i> Guardado {{ formatDateTime(savedInfo!.updatedAt!) }}
            </span>
          </div>
          <div class="actions-right">
            <button class="btn-outline" (click)="toggleAll(true)" title="Incluir a todos">
              <i class="bi bi-check2-square"></i> Todos
            </button>
            <button class="btn-outline" (click)="toggleAll(false)" title="Quitar a todos">
              <i class="bi bi-square"></i> Ninguno
            </button>
            <button class="btn-outline" (click)="regenerarDesdeDatos()" title="Rehacer el informe con los datos actuales del día">
              <i class="bi bi-arrow-clockwise"></i> Regenerar
            </button>
            <button class="btn-outline" (click)="toggleHistory()" title="Ver informes guardados de este equipo">
              <i class="bi bi-clock-history"></i> Histórico
            </button>
            <button class="btn-outline btn-save" (click)="guardar()" [disabled]="saving">
              <i class="bi" [ngClass]="saving ? 'bi-hourglass-split' : 'bi-save'"></i>
              {{ saving ? 'Guardando…' : 'Guardar' }}
            </button>
            <button class="btn-sphaira" (click)="exportPdf()" [disabled]="exporting || includedCount === 0">
              <i class="bi" [ngClass]="exporting ? 'bi-hourglass-split' : 'bi-filetype-pdf'"></i>
              {{ exporting ? 'Generando…' : 'Exportar PDF' }}
            </button>
          </div>
        </div>

        <!-- Panel de histórico -->
        <div class="history-panel" *ngIf="showHistory && !loading">
          <div class="history-head">
            <h4><i class="bi bi-clock-history"></i> Informes guardados</h4>
            <button class="hist-close" (click)="showHistory = false" title="Cerrar"><i class="bi bi-x-lg"></i></button>
          </div>
          <p class="text-soft mb-0" *ngIf="history.length === 0">Aún no hay informes guardados para este equipo.</p>
          <ul class="history-list" *ngIf="history.length > 0">
            <li *ngFor="let h of history">
              <span class="hist-date">{{ formatHumanDate(h.reportDate) }}</span>
              <span class="hist-meta" *ngIf="h.updatedAt">· {{ formatDateTime(h.updatedAt) }}</span>
              <span class="hist-spacer"></span>
              <button class="hist-action" (click)="abrirInforme(h)" title="Abrir informe"><i class="bi bi-box-arrow-up-right"></i> Abrir</button>
              <button class="hist-action hist-action--danger" (click)="borrarInforme(h)" title="Borrar"><i class="bi bi-trash"></i></button>
            </li>
          </ul>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="empty-state">
          <div class="spinner-border spinner-sphaira" role="status"></div>
          <p class="mt-2 mb-0 text-soft">Generando informe diario…</p>
        </div>

        <!-- Sin jugadores -->
        <div *ngIf="!loading && rows.length === 0" class="empty-state">
          <i class="bi bi-clipboard-x display-5 mb-2"></i>
          <p>No hay jugadores en la plantilla para este equipo.</p>
        </div>

        <!-- Tabla editable (columnas y filas reordenables + redimensionables, tipo Excel) -->
        <div *ngIf="!loading && rows.length > 0">
          <div class="table-hint">
            <i class="bi bi-info-circle"></i>
            Arrastra la cabecera para reordenar columnas · arrastra <strong><i class="bi bi-grip-vertical"></i></strong> para reordenar filas ·
            arrastra el borde de una celda para cambiar su tamaño ·
            <button class="link-reset" (click)="resetLayout()">restablecer diseño</button>
          </div>
          <div class="inf-table-wrapper">
            <table class="inf-table" [style.minWidth.px]="totalWidth()">
              <colgroup>
                <col class="cg-ctrl" />
                <col *ngFor="let col of columns" [style.width.px]="col.width" />
              </colgroup>
              <thead>
                <tr cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="dropColumn($event)">
                  <th class="col-ctrl" title="Incluir / reordenar"><i class="bi bi-check2-all"></i></th>
                  <th *ngFor="let col of columns" cdkDrag class="col-th" title="Arrastra la cabecera para reordenar la columna">
                    <div class="th-inner">
                      <span class="th-label">{{ col.label }}</span>
                    </div>
                    <span class="col-resizer" (pointerdown)="startColResize($event, col)" title="Arrastra para redimensionar"></span>
                  </th>
                </tr>
              </thead>
              <tbody cdkDropList (cdkDropListDropped)="dropRow($event)">
                <tr *ngFor="let r of rows; trackBy: trackByPlayer" cdkDrag [class.row-off]="!r.include"
                    [style.height.px]="r.height || null">
                  <td class="col-ctrl">
                    <div class="ctrl-cell">
                      <span class="row-grip" cdkDragHandle title="Arrastra para reordenar la fila"><i class="bi bi-grip-vertical"></i></span>
                      <input type="checkbox" class="form-check-input" [(ngModel)]="r.include" />
                    </div>
                    <span class="row-resizer" (pointerdown)="startRowResize($event, r)" title="Arrastra para cambiar el alto"></span>
                  </td>
                  <td *ngFor="let col of columns" [ngSwitch]="col.key" class="data-td" [class.td-center]="col.key === 'fisio'">
                    <span *ngSwitchCase="'name'" class="player-name">{{ r.fullName }}</span>
                    <span *ngSwitchCase="'equipo'" class="player-team">{{ r.equipo || '—' }}</span>
                    <input *ngSwitchCase="'estado'" type="text" class="form-control form-control-sm"
                           [(ngModel)]="r.estado" placeholder="Estado tras la sesión" />
                    <label *ngSwitchCase="'fisio'" class="fisio-toggle">
                      <input type="checkbox" class="form-check-input" [(ngModel)]="r.acudeFisio" />
                      <span>{{ r.acudeFisio ? 'Sí' : 'No' }}</span>
                    </label>
                    <div *ngSwitchCase="'observaciones'" class="obs-cell">
                      <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="r.observaciones"
                                placeholder="Observaciones"></textarea>
                      <button class="btn-ai" (click)="suggestObservations(r)" [disabled]="r.aiLoading"
                              title="Sugerir redacción con IA">
                        <i class="bi" [ngClass]="r.aiLoading ? 'bi-hourglass-split' : 'bi-stars'"></i>
                      </button>
                    </div>
                    <input *ngSwitchCase="'prevision'" type="text" class="form-control form-control-sm"
                           [(ngModel)]="r.prevision" placeholder="Previsión" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── Stage oculto que se captura para el PDF (refleja el diseño del usuario) ── -->
      <div class="pdf-stage-host" aria-hidden="true" [style.width.px]="pdfStageWidth()">
        <div #pdfStage class="pdf-stage" [style.width.px]="pdfStageWidth()">
          <div class="pdf-report-head">
            <h1 class="pdf-report-title">INFORME DIARIO</h1>
            <p class="pdf-report-team">{{ teamName }}</p>
            <div class="pdf-report-dates">
              <span><strong>Fecha de la sesión:</strong> {{ formatHumanDate(sessionDate) }}</span>
              <span *ngIf="nextSessionDate"><strong>Siguiente sesión:</strong> {{ formatHumanDate(nextSessionDate) }}</span>
            </div>
          </div>
          <table class="pdf-table">
            <colgroup>
              <col *ngFor="let col of columns" [style.width.px]="col.width" />
            </colgroup>
            <thead>
              <tr>
                <th *ngFor="let col of columns">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of includedRows()" [style.height.px]="r.height || null">
                <td *ngFor="let col of columns" [ngSwitch]="col.key" [class.pdf-center]="col.key === 'fisio'"
                    [class.pdf-name]="col.key === 'name'">
                  <ng-container *ngSwitchCase="'name'">{{ r.fullName }}</ng-container>
                  <ng-container *ngSwitchCase="'equipo'">{{ r.equipo || '—' }}</ng-container>
                  <ng-container *ngSwitchCase="'estado'">{{ r.estado || '—' }}</ng-container>
                  <ng-container *ngSwitchCase="'fisio'">{{ r.acudeFisio ? 'Sí' : '—' }}</ng-container>
                  <ng-container *ngSwitchCase="'observaciones'">{{ r.observaciones || '—' }}</ng-container>
                  <ng-container *ngSwitchCase="'prevision'">{{ r.prevision || '—' }}</ng-container>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .inf-page { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background: #f4f4f4; min-height: 100vh; }
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; gap: 12px; border-bottom: 1px solid #e9ecef; background: #fff;
    }
    .header-center { text-align: center; flex: 1; }
    .page-title { margin: 0; font-weight: 700; color: #002c40; display: inline-flex; align-items: center; }
    .page-title i { color: #31b270; }
    .page-subtitle { margin: 4px 0 0; color: #636363; font-size: 0.92rem; }
    .page-header-spacer { width: 110px; }
    .btn-back-clean {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(49, 178, 112, 0.08); border: 0; color: #002c40;
      padding: 0.4rem 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;
      transition: background .2s, transform .15s;
    }
    .btn-back-clean:hover { background: rgba(49, 178, 112, 0.18); transform: translateX(-2px); }
    .spinner-sphaira { color: #31b270; }
    .text-soft { color: #636363; }

    .actions-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      background: #fff; border-radius: 12px; padding: 12px 16px; margin: 16px 0;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.05);
    }
    .actions-left { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions-right { display: flex; gap: 8px; flex-wrap: wrap; }
    .meta-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: #c4e8d6; color: #15663f; border-radius: 999px; padding: 6px 13px;
      font-size: 0.85rem; font-weight: 700;
    }
    .btn-sphaira {
      display: inline-flex; align-items: center; gap: 6px;
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%);
      color: #fff; border: 0; padding: 9px 16px; border-radius: 10px; font-weight: 700; font-size: 0.9rem;
      box-shadow: 0 6px 16px rgba(0,44,64,0.18); transition: all .15s ease; cursor: pointer;
    }
    .btn-sphaira:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .btn-sphaira:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; transform: none; }
    .btn-outline {
      display: inline-flex; align-items: center; gap: 6px;
      color: #002c40; border: 1px solid #cdd9e0; background: #fff;
      border-radius: 10px; padding: 9px 14px; font-weight: 700; font-size: 0.88rem; cursor: pointer;
      transition: all .15s ease;
    }
    .btn-outline:hover { background: #002c40; border-color: #002c40; color: #fff; }
    .btn-save { border-color: #31b270; color: #15663f; }
    .btn-save:hover { background: #31b270; border-color: #31b270; color: #fff; }
    .btn-save:disabled { opacity: .55; cursor: not-allowed; }
    .meta-chip--saved { background: #eafaf1; color: #15663f; }

    .history-panel {
      background: #fff; border: 1px solid #e9eef1; border-radius: 14px; padding: 14px 18px; margin-bottom: 16px;
      box-shadow: 0 8px 24px rgba(0,44,64,0.06);
    }
    .history-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .history-head h4 { margin: 0; font-size: 1rem; font-weight: 800; color: #002c40; display: inline-flex; align-items: center; gap: 8px; }
    .history-head h4 i { color: #31b270; }
    .hist-close { border: 0; background: transparent; color: #636363; cursor: pointer; font-size: 1rem; }
    .hist-close:hover { color: #b1231b; }
    .history-list { list-style: none; margin: 0; padding: 0; }
    .history-list li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #eef2f4; }
    .history-list li:last-child { border-bottom: 0; }
    .hist-date { font-weight: 700; color: #002c40; text-transform: capitalize; }
    .hist-meta { font-size: 0.82rem; color: #636363; }
    .hist-spacer { flex: 1; }
    .hist-action {
      display: inline-flex; align-items: center; gap: 5px; border: 1px solid #cdd9e0; background: #fff;
      color: #002c40; border-radius: 8px; padding: 5px 11px; font-size: 0.82rem; font-weight: 700; cursor: pointer;
      transition: all .15s ease;
    }
    .hist-action:hover { background: #002c40; border-color: #002c40; color: #fff; }
    .hist-action--danger { color: #b1231b; border-color: #f0c4c1; }
    .hist-action--danger:hover { background: #b1231b; border-color: #b1231b; color: #fff; }

    .empty-state {
      padding: 48px 16px; text-align: center; color: #636363;
      background: #fff; border-radius: 12px; margin-top: 16px;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04);
    }
    .empty-state i { color: #31b270; }

    .inf-table-wrapper {
      margin-bottom: 32px; background: #fff; border: 1px solid #e9eef1; border-radius: 16px;
      overflow-x: auto; box-shadow: 0 8px 24px rgba(0,44,64,0.06);
    }
    .inf-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
    .cg-ctrl { width: 52px; }
    .inf-table th, .inf-table td {
      padding: 10px 12px; text-align: left; border-bottom: 1px solid #eef2f4; vertical-align: top;
      overflow: hidden;
    }
    .inf-table thead th {
      background: #f1f5f7; font-weight: 800; color: #002c40; position: relative;
      text-transform: uppercase; font-size: 11px; letter-spacing: .04em; border-bottom: 2px solid #dde6ea;
      vertical-align: middle; user-select: none;
    }
    .inf-table tbody tr:hover { background: #eafaf1; }
    .inf-table tbody tr.row-off { opacity: 0.45; }

    /* Columna de control: incluir + grip de reordenar fila + resizer de alto */
    .col-ctrl { width: 52px; text-align: center; position: relative; }
    .ctrl-cell { display: flex; align-items: center; gap: 4px; justify-content: center; }
    .row-grip {
      cursor: grab; color: #9bb0bc; display: inline-flex; align-items: center; font-size: 0.95rem;
    }
    .row-grip:active { cursor: grabbing; }
    /* Cabecera de columna: toda ella es el asa de arrastre (Excel-like) */
    .col-th { cursor: grab; }
    .col-th:active { cursor: grabbing; }
    .th-inner { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 8px; }
    .th-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }

    /* Tick redondo en la primera columna (incluir jugador) */
    .col-ctrl .form-check-input {
      border-radius: 50%; width: 18px; height: 18px; cursor: pointer;
    }

    /* Resizers (borde derecho de cabecera / borde inferior de fila) */
    .col-resizer {
      position: absolute; top: 0; right: 0; width: 7px; height: 100%; cursor: col-resize;
      touch-action: none; z-index: 2;
    }
    .col-resizer:hover { background: linear-gradient(90deg, transparent, rgba(49,178,112,0.55)); }
    .row-resizer {
      position: absolute; left: 0; bottom: 0; width: 100%; height: 7px; cursor: row-resize;
      touch-action: none; z-index: 2;
    }
    .row-resizer:hover { background: rgba(49,178,112,0.4); }

    .player-name { font-weight: 700; color: #002c40; }
    .td-center { text-align: center; }
    .player-team {
      display: inline-block; font-size: 0.8rem; font-weight: 600; color: #15663f;
      background: #eafaf1; border-radius: 6px; padding: 3px 8px; line-height: 1.2;
      max-width: 100%; overflow: hidden; text-overflow: ellipsis;
    }
    .inf-table .form-control { width: 100%; border-radius: 8px; border: 1px solid #dbe4e9; padding: 6px 10px; font-size: 0.86rem; }
    .inf-table .form-control:focus { border-color: #31b270; box-shadow: 0 0 0 3px rgba(49,178,112,0.18); }

    /* Hint de uso */
    .table-hint {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      font-size: 0.82rem; color: #5b6b75; margin: 4px 2px 10px;
    }
    .table-hint i { color: #31b270; }
    .link-reset {
      border: 0; background: none; color: #15663f; font-weight: 700; cursor: pointer;
      text-decoration: underline; padding: 0; font-size: 0.82rem;
    }

    /* CDK drag & drop */
    .cdk-drag-preview {
      box-sizing: border-box; border-radius: 6px;
      box-shadow: 0 6px 18px rgba(0,44,64,0.22); background: #fff; opacity: 0.96;
    }
    .cdk-drag-placeholder { opacity: 0.25; }
    .cdk-drag-animating { transition: transform .2s cubic-bezier(0,0,0.2,1); }
    .inf-table.cdk-drop-list-dragging tbody tr:not(.cdk-drag-placeholder) { transition: transform .2s cubic-bezier(0,0,0.2,1); }
    .fisio-toggle { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; color: #002c40; cursor: pointer; font-size: 0.86rem; }
    .obs-cell { display: flex; align-items: flex-start; gap: 6px; }
    .obs-cell textarea { resize: vertical; }
    .btn-ai {
      flex: 0 0 auto; width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
      border: 1px solid #c4e8d6; background: #eafaf1; color: #15663f; transition: all .15s ease;
    }
    .btn-ai:hover { background: #31b270; border-color: #31b270; color: #fff; }
    .btn-ai:disabled { opacity: .6; cursor: not-allowed; }

    /* Stage del PDF: fuera de pantalla pero renderizado para html2canvas. */
    .pdf-stage-host { position: fixed; left: -10000px; top: 0; pointer-events: none; }
    .pdf-stage { background: #fff; padding: 8px 4px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #002c40; }
    .pdf-report-head { border-bottom: 3px solid #31b270; padding-bottom: 10px; margin-bottom: 14px; }
    .pdf-report-title { margin: 0; font-size: 26px; font-weight: 800; color: #002c40; letter-spacing: .03em; }
    .pdf-report-team { margin: 2px 0 0; font-size: 16px; font-weight: 700; color: #31b270; }
    .pdf-report-dates { display: flex; gap: 24px; margin-top: 8px; font-size: 13px; color: #335; }
    .pdf-table { width: 100%; border-collapse: collapse; font-size: 12.5px; table-layout: fixed; }
    .pdf-table th {
      background: #002c40; color: #fff; text-align: left; padding: 9px 10px; font-weight: 700;
      border: 1px solid #002c40; word-break: break-word;
    }
    .pdf-table td { padding: 8px 10px; border: 1px solid #dbe4e9; vertical-align: top; color: #1f2d36; word-break: break-word; }
    .pdf-table tbody tr:nth-child(even) td { background: #f4faf7; }
    .pdf-name { font-weight: 700; color: #002c40; }
    .pdf-center { text-align: center; }

    @media (max-width: 768px) {
      .page-header { padding: 14px; }
      .page-header-spacer { display: none; }
      .actions-bar { flex-direction: column; align-items: stretch; }
    }

    /* Dark mode */
    :host-context(body.dark) .inf-page { background: #00131c; }
    :host-context(body.dark) .page-header,
    :host-context(body.dark) .actions-bar,
    :host-context(body.dark) .inf-table-wrapper,
    :host-context(body.dark) .empty-state { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .page-title { color: #c4e8d6; }
    :host-context(body.dark) .page-subtitle, :host-context(body.dark) .text-soft { color: #94a3b8; }
    :host-context(body.dark) .inf-table thead th { background: #002c40; color: #c4e8d6; border-bottom-color: #00405c; }
    :host-context(body.dark) .inf-table td { border-bottom-color: #00405c; }
    :host-context(body.dark) .player-name { color: #c4e8d6; }
    :host-context(body.dark) .player-team { background: rgba(49,178,112,0.18); color: #7ee0aa; }
    :host-context(body.dark) .inf-table .form-control { background: #00283a; border-color: #00405c; color: #c4e8d6; }
    :host-context(body.dark) .btn-back-clean { background: rgba(49,178,112,0.14); color: #c4e8d6; }
  `]
})
export class InformeDiarioComponent implements OnInit, OnDestroy {

  @ViewChild('pdfStage') pdfStageRef?: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();

  teamId = 0;
  clubId = 0;
  userId = 0;
  userName = '';
  teamName = '';
  sessionDate = this.todayIso();
  nextSessionDate: string | null = null;

  rows: ReportRow[] = [];
  /** Columnas de datos (orden = posición; ancho editable). Tipo "Excel". */
  columns: ColumnDef[] = this.defaultColumns();
  loading = false;
  exporting = false;
  saving = false;

  /** Informe guardado que se está editando (si lo hay), para mostrar "Guardado …". */
  savedInfo: InformeDiario | null = null;
  /** Histórico de informes del equipo (panel desplegable). */
  history: InformeDiario[] = [];
  showHistory = false;

  /** Días de microciclo indexados por fecha, para deducir la siguiente sesión. */
  private sessionByDate = new Map<string, MicrocycleDay>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private teamService: TeamService,
    private playerService: PlayerService,
    private dailyStatusService: PlayerDailyStatusService,
    private microcycleService: MicrocycleService,
    private pdfExport: PdfExportService,
    private aiChatService: AiChatService,
    private informeService: InformeDiarioService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.teamId = Number(params.get('teamId')) || 0;
      const qDate = this.route.snapshot.queryParamMap.get('date');
      if (qDate) this.sessionDate = qDate;
      this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
        this.userId = user?.userId ?? 0;
        this.userName = [user?.name ?? user?.nombre, user?.lastName ?? user?.apellido]
          .filter(Boolean).join(' ').trim();
        this.bootstrap();
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private bootstrap(): void {
    if (!this.teamId) return;
    this.loading = true;
    this.cdr.markForCheck();
    this.teamService.getTeamById(this.teamId.toString()).subscribe({
      next: (resp: any) => {
        this.clubId = resp?.data?.clubId ?? 0;
        this.teamName = resp?.data?.name ?? resp?.data?.teamName ?? '';
        this.loadSessions();
        this.loadData();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  /** Carga los días de microciclo para deducir la fecha de la siguiente sesión. */
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
        this.nextSessionDate = this.computeNextSession();
        this.cdr.markForCheck();
      },
      error: () => { /* sin microciclo: el informe sigue funcionando */ }
    });
  }

  /** Primer día de microciclo (entreno/partido) estrictamente posterior a la fecha. */
  private computeNextSession(): string | null {
    const dates = Array.from(this.sessionByDate.keys())
      .filter(d => d > this.sessionDate)
      .sort();
    for (const d of dates) {
      const day = this.sessionByDate.get(d);
      const t = (day?.dayType || '').toLowerCase();
      if (t === 'training' || t === 'match') return d;
    }
    return dates.length ? dates[0] : null;
  }

  /**
   * Genera las filas del informe desde los datos en vivo del día. Si
   * {@code preferSaved} es true (carga inicial), tras generar comprueba si
   * ya existe un informe guardado para ese día y, de existir, lo carga para
   * que el fisio continúe editándolo.
   */
  private loadData(preferSaved = true): void {
    if (!this.teamId) return;
    this.loading = true;
    forkJoin({
      teamDay: this.dailyStatusService.getTeamDay(this.teamId, this.sessionDate),
      players: this.playerService.getPlayers(this.teamId.toString()),
      playerTeams: this.informeService.getPlayerTeams(this.teamId)
    }).subscribe({
      next: ({ teamDay, players, playerTeams }) => {
        this.rows = this.buildRows(players, teamDay ?? [], playerTeams);
        this.loading = false;
        this.cdr.markForCheck();
        if (preferSaved) this.loadSavedForDate();
      },
      error: () => {
        this.loading = false;
        this.notification.error('No se han podido cargar los datos del informe.', false);
        this.cdr.markForCheck();
      }
    });
  }

  /** Comprueba si hay un informe guardado para el día y, si lo hay, lo carga. */
  private loadSavedForDate(): void {
    this.informeService.getByTeamAndDate(this.teamId, this.sessionDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe(info => {
        if (info && info.rowsJson) {
          this.applySaved(info);
        } else {
          this.savedInfo = null;
        }
        this.cdr.markForCheck();
      });
  }

  /** Sustituye filas y layout del editor por el snapshot guardado del informe. */
  private applySaved(info: InformeDiario): void {
    this.savedInfo = info;
    if (info.nextSessionDate !== undefined) this.nextSessionDate = info.nextSessionDate ?? this.nextSessionDate;
    if (info.teamName) this.teamName = info.teamName;
    const snap = this.parseSnapshot(info.rowsJson);
    if (snap.rows.length) this.rows = snap.rows;
    if (snap.columns) this.columns = snap.columns;
  }

  /**
   * Deserializa el snapshot guardado. Admite el formato nuevo
   * ({@code { columns, rows }}) y el antiguo (array de filas) para no romper
   * informes guardados antes de la edición tipo Excel.
   */
  private parseSnapshot(rowsJson?: string | null): { rows: ReportRow[]; columns: ColumnDef[] | null } {
    if (!rowsJson) return { rows: [], columns: null };
    try {
      const data = JSON.parse(rowsJson);
      const rawRows = Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : []);
      const rows: ReportRow[] = rawRows.map((r: any) => ({
        playerId: Number(r?.playerId) || 0,
        fullName: r?.fullName ?? '',
        equipo: r?.equipo ?? '',
        include: r?.include !== false,
        estado: r?.estado ?? '',
        acudeFisio: !!r?.acudeFisio,
        observaciones: r?.observaciones ?? '',
        prevision: r?.prevision ?? '',
        height: Number(r?.height) > 0 ? Number(r.height) : null
      }));
      const columns = (!Array.isArray(data) && Array.isArray(data?.columns))
        ? this.restoreColumns(data.columns) : null;
      return { rows, columns };
    } catch {
      return { rows: [], columns: null };
    }
  }

  private buildRows(playersResp: any, daily: PlayerDailyStatus[], teamsByPlayer?: Map<number, string>): ReportRow[] {
    const players = this.toPlayerList(playersResp);
    const byPlayer = new Map<number, PlayerDailyStatus>();
    for (const d of daily) byPlayer.set(d.playerId, d);

    const rows: ReportRow[] = players.map(info => {
      const d = byPlayer.get(info.playerId);
      const acude = !!(d?.attendedPhysio
        || (d?.treatmentZone && d.treatmentZone.trim())
        || (d?.treatmentObservations && d.treatmentObservations.trim()));
      return {
        playerId: info.playerId,
        fullName: `${info.nombre} ${info.apellido}`.trim() || `Jugador #${info.playerId}`,
        equipo: this.resolvePlayerTeam(teamsByPlayer?.get(info.playerId)),
        picturePlayer: info.picturePlayer,
        include: true,
        estado: this.buildEstado(d),
        acudeFisio: acude,
        observaciones: this.buildObservaciones(d),
        prevision: this.buildPrevision(d)
      };
    });
    rows.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
    return rows;
  }

  /**
   * Resuelve la etiqueta de equipo de un jugador. Si el backend no devolvió
   * equipos (o llegó vacío), cae al nombre del equipo actual del informe. Si
   * tampoco hay nombre de equipo aún, deja '' y la tabla muestra '—'.
   */
  private resolvePlayerTeam(label?: string): string {
    const clean = (label ?? '').trim();
    if (clean) return clean;
    return (this.teamName ?? '').trim();
  }

  private toPlayerList(response: any): PlayerInfo[] {
    let list = response?.data?.players ?? response?.data ?? response;
    if (!Array.isArray(list)) return [];
    const out: PlayerInfo[] = [];
    for (const p of list) {
      const id = p?.playerId ?? p?.id ?? 0;
      if (!id) continue;
      out.push({
        playerId: id,
        nombre: p?.nombre ?? p?.name ?? '',
        apellido: p?.apellido ?? p?.lastName ?? '',
        picturePlayer: p?.picturePlayer ?? null
      });
    }
    return out;
  }

  /** "DT · Disponibilidad total" a partir del código + etiqueta guardados. */
  private buildEstado(d?: PlayerDailyStatus): string {
    if (!d) return '';
    const code = (d.statusTagCode || '').trim();
    const label = (d.statusTagLabel || '').trim();
    if (code && label) return `${code} · ${label}`;
    return label || code || '';
  }

  /** Combina observaciones de tratamiento y generales (sin duplicar). */
  private buildObservaciones(d?: PlayerDailyStatus): string {
    if (!d) return '';
    const parts: string[] = [];
    const treat = (d.treatmentObservations || '').trim();
    const gen = (d.generalObservations || '').trim();
    const zone = (d.treatmentZone || '').trim();
    const tech = (d.treatmentTechnique || '').trim();
    if (zone || tech) {
      parts.push([zone, tech].filter(Boolean).join(' · '));
    }
    if (treat) parts.push(treat);
    if (gen && gen !== treat) parts.push(gen);
    return parts.join('. ');
  }

  /** Previsión a partir del forecast guardado (etiqueta + texto). */
  private buildPrevision(d?: PlayerDailyStatus): string {
    if (!d) return '';
    const code = (d.forecastTagCode || '').trim();
    const label = (d.forecastTagLabel || '').trim();
    const text = (d.forecastText || '').trim();
    const head = code && label ? `${code} · ${label}` : (label || code);
    if (head && text) return `${head} — ${text}`;
    return head || text || '';
  }

  // ── Acciones UI ─────────────────────────────────────────────────────────

  includedRows(): ReportRow[] { return this.rows.filter(r => r.include); }
  get includedCount(): number { return this.rows.filter(r => r.include).length; }

  toggleAll(value: boolean): void {
    for (const r of this.rows) r.include = value;
  }

  trackByPlayer(_i: number, r: ReportRow): number { return r.playerId; }

  // ── Layout de tabla tipo Excel (orden + tamaño de columnas/filas) ─────────

  /** Columnas por defecto (orden y anchos iniciales). */
  private defaultColumns(): ColumnDef[] {
    return [
      { key: 'name',          label: 'Jugador',                    width: 170 },
      { key: 'equipo',        label: 'Equipo',                     width: 150 },
      { key: 'estado',        label: 'Estado tras la sesión',      width: 210 },
      { key: 'fisio',         label: 'Acude a fisio',              width: 110 },
      { key: 'observaciones', label: 'Observaciones',              width: 300 },
      { key: 'prevision',     label: 'Previsión siguiente sesión', width: 210 }
    ];
  }

  /** Ancho total de la tabla editable (columna de control + columnas de datos). */
  totalWidth(): number {
    return 52 + this.columns.reduce((sum, c) => sum + c.width, 0);
  }

  /** Ancho del lienzo del PDF (suma de columnas + margen), para respetar proporciones. */
  pdfStageWidth(): number {
    return Math.max(900, this.columns.reduce((sum, c) => sum + c.width, 0) + 24);
  }

  /** Reordena columnas tras soltar la cabecera arrastrada. */
  dropColumn(event: CdkDragDrop<ColumnDef[]>): void {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.cdr.markForCheck();
  }

  /** Reordena filas tras soltar la fila arrastrada. */
  dropRow(event: CdkDragDrop<ReportRow[]>): void {
    moveItemInArray(this.rows, event.previousIndex, event.currentIndex);
    this.cdr.markForCheck();
  }

  /** Redimensiona una columna arrastrando el borde derecho de su cabecera. */
  startColResize(ev: PointerEvent, col: ColumnDef): void {
    ev.preventDefault();
    ev.stopPropagation();
    const startX = ev.clientX;
    const startW = col.width;
    const move = (e: PointerEvent) => {
      col.width = Math.max(70, Math.round(startW + (e.clientX - startX)));
      this.cdr.markForCheck();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** Redimensiona el alto de una fila arrastrando su borde inferior. */
  startRowResize(ev: PointerEvent, r: ReportRow): void {
    ev.preventDefault();
    ev.stopPropagation();
    const startY = ev.clientY;
    const startH = r.height || (ev.target as HTMLElement)?.closest('tr')?.getBoundingClientRect().height || 48;
    const move = (e: PointerEvent) => {
      r.height = Math.max(44, Math.round(startH + (e.clientY - startY)));
      this.cdr.markForCheck();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** Restablece el orden y tamaño de columnas y el alto de las filas. */
  resetLayout(): void {
    this.columns = this.defaultColumns();
    for (const r of this.rows) r.height = null;
    this.cdr.markForCheck();
  }

  /**
   * Pide a la IA una redacción más clara de las observaciones de la fila.
   * Usa el endpoint ligero de reescritura (/rewrite). Si el jugador no tiene
   * observaciones, parte del estado para dar contexto.
   */
  suggestObservations(r: ReportRow): void {
    if (r.aiLoading) return;
    const base = (r.observaciones || '').trim() || (r.estado || '').trim();
    if (!base) {
      this.notification.warning('Escribe algo en observaciones para que la IA lo mejore.', false);
      return;
    }
    r.aiLoading = true;
    this.cdr.markForCheck();
    const context = `Informe diario de fisioterapia. Jugador: ${r.fullName}. Estado: ${r.estado || '—'}.`;
    this.aiChatService.rewriteText(this.userId, this.clubId, 'observaciones_fisio', base, context)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          r.aiLoading = false;
          if (resp?.success && resp.response) {
            r.observaciones = resp.response.trim();
          } else {
            this.notification.error(resp?.message || 'No se pudo generar la sugerencia.', false);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          r.aiLoading = false;
          this.notification.error('No se pudo generar la sugerencia.', false);
          this.cdr.markForCheck();
        }
      });
  }

  /** Captura el stage estático y lo exporta a PDF con marca Sphaira + escudo del club. */
  async exportPdf(): Promise<void> {
    if (this.exporting || this.includedCount === 0) return;
    this.exporting = true;
    // OnPush: forzamos el render síncrono del stage con los últimos valores
    // editados y damos un margen para que el navegador calcule el layout
    // antes de capturarlo con html2canvas.
    this.cdr.detectChanges();
    await new Promise<void>(resolve => setTimeout(resolve, 150));
    const el = this.pdfStageRef?.nativeElement;
    if (!el) { this.exporting = false; this.cdr.markForCheck(); return; }
    try {
      const safeTeam = (this.teamName || 'equipo').replace(/[^\w\-]+/g, '_');
      await this.pdfExport.exportReport(el, {
        fileName: `informe-diario_${safeTeam}_${this.sessionDate}`,
        title: 'Informe diario',
        subtitle: `${this.teamName} · ${this.formatHumanDate(this.sessionDate)}`,
        type: 'default',
        clubId: this.clubId
      });
    } catch {
      this.notification.error('No se ha podido generar el PDF.', false);
    } finally {
      this.exporting = false;
      this.cdr.markForCheck();
    }
  }

  // ── Persistencia (guardar / histórico) ────────────────────────────────────

  /**
   * Serializa el informe completo (layout de columnas + filas) para persistirlo.
   * Se guarda como objeto {@code { columns, rows }} dentro de `rowsJson`, de modo
   * que al reabrir el informe se recupera el mismo orden/tamaño que dejó el usuario.
   */
  private serializeSnapshot(): { columns: Array<{ key: ColKey; width: number }>; rows: any[] } {
    return {
      columns: this.columns.map(c => ({ key: c.key, width: c.width })),
      rows: this.rows.map(r => ({
        playerId: r.playerId,
        fullName: r.fullName,
        equipo: r.equipo,
        include: r.include,
        estado: r.estado,
        acudeFisio: r.acudeFisio,
        observaciones: r.observaciones,
        prevision: r.prevision,
        height: r.height ?? null
      }))
    };
  }

  /** Reconstruye las columnas desde lo guardado, conservando etiquetas y añadiendo nuevas. */
  private restoreColumns(saved: Array<{ key: string; width: number }>): ColumnDef[] {
    const defs = this.defaultColumns();
    const byKey = new Map(defs.map(d => [d.key, d]));
    const out: ColumnDef[] = [];
    const used = new Set<string>();
    for (const s of saved || []) {
      const def = byKey.get(s.key as ColKey);
      if (def && !used.has(s.key)) {
        out.push({ key: def.key, label: def.label, width: Number(s.width) > 0 ? Number(s.width) : def.width });
        used.add(s.key);
      }
    }
    for (const d of defs) if (!used.has(d.key)) out.push({ ...d });
    return out;
  }

  /** Guarda (crea o actualiza) el informe del día en el histórico. */
  guardar(): void {
    if (this.saving || !this.teamId) return;
    this.saving = true;
    this.cdr.markForCheck();
    const payload: InformeDiario = {
      informeId: this.savedInfo?.informeId,
      clubId: this.clubId,
      teamId: this.teamId,
      reportDate: this.sessionDate,
      nextSessionDate: this.nextSessionDate,
      teamName: this.teamName,
      rowsJson: JSON.stringify(this.serializeSnapshot()),
      status: 'draft',
      createdByUserId: this.userId,
      createdByName: this.userName
    };
    this.informeService.save(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        this.saving = false;
        if (saved) {
          this.savedInfo = saved;
          this.notification.success('Informe guardado.', false);
        } else {
          this.notification.error('No se ha podido guardar el informe.', false);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.notification.error('No se ha podido guardar el informe.', false);
        this.cdr.markForCheck();
      }
    });
  }

  /** Rehace el informe desde los datos en vivo, descartando ediciones no guardadas. */
  regenerarDesdeDatos(): void {
    this.nextSessionDate = this.computeNextSession();
    this.loadData(false);
  }

  /** Abre/cierra el panel de histórico (carga la lista la primera vez). */
  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.informeService.listByTeam(this.teamId).pipe(takeUntil(this.destroy$)).subscribe(list => {
        this.history = list ?? [];
        this.cdr.markForCheck();
      });
    }
  }

  /** Carga un informe guardado del histórico en el editor. */
  abrirInforme(h: InformeDiario): void {
    if (!h.informeId) return;
    this.showHistory = false;
    this.informeService.getById(h.informeId).pipe(takeUntil(this.destroy$)).subscribe(info => {
      if (!info) { this.notification.error('No se ha podido abrir el informe.', false); return; }
      this.sessionDate = info.reportDate || this.sessionDate;
      this.applySaved(info);
      this.cdr.markForCheck();
    });
  }

  /** Borra un informe del histórico. */
  borrarInforme(h: InformeDiario): void {
    if (!h.informeId) return;
    this.informeService.remove(h.informeId).pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (ok) {
        this.history = this.history.filter(x => x.informeId !== h.informeId);
        if (this.savedInfo?.informeId === h.informeId) this.savedInfo = null;
        this.notification.success('Informe borrado.', false);
      } else {
        this.notification.error('No se ha podido borrar el informe.', false);
      }
      this.cdr.markForCheck();
    });
  }

  goBack(): void { this.location.back(); }

  // ── Helpers de fecha ──────────────────────────────────────────────────────

  /** Fecha + hora legible a partir de epoch millis (para "Guardado …"). */
  formatDateTime(millis: number): string {
    if (!millis) return '';
    const d = new Date(millis);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  formatHumanDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  private todayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
