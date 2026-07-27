import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ClubService } from 'src/app/core/services/club/club.service';
import {
  ClubModules,
  ClubModulesService
} from 'src/app/core/services/club/club-modules.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import {
  Microcycle,
  MicrocycleDay,
  MicrocycleService
} from 'src/app/core/services/microcycle/microcycle.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingScheduleService } from 'src/app/core/services/training-schedule/training-schedule.service';
import { getSelectedSeason } from 'src/app/core/utils/season.utils';

interface ComboTeam {
  teamId: number;
  name: string;
  categoryName?: string;
}

interface CreateForm {
  name: string;
  startDate: string;
  endDate: string;
  matchDate: string;
  restDay: string;
}

interface DaySaveState {
  saving: boolean;
  savedAt?: number;
  error?: string;
}

/**
 * Pantalla de gestión de microciclos del Modo Profesional.
 *
 * <p>Permite al cuerpo técnico:</p>
 * <ul>
 *   <li>Listar todos los microciclos del equipo (con sus días MD-X / MD / MD+Y).</li>
 *   <li>Auto-generar microciclos a partir de los partidos planificados
 *       ({@code POST /rest/microcycle/auto-generate/{teamId}}).</li>
 *   <li>Crear microciclos manualmente con fechas concretas y día de descanso.</li>
 *   <li>Editar inline cada día: tipo (training / rest / match), notas y
 *       vincular la sesión de entrenamiento concreta del calendario.</li>
 * </ul>
 *
 * <p>Visible sólo si {@code professionalModeEnabled = true} en los módulos
 * del club. Si no, se muestra un estado vacío amable.</p>
 *
 * Rutas:
 * <ul>
 *   <li>{@code /dashboard/microciclos} – obliga a elegir equipo.</li>
 *   <li>{@code /dashboard/microciclos/:teamId} – carga directo.</li>
 * </ul>
 */
@Component({
  selector: 'app-microciclos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mc-page">
      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="page-title">
            <i class="bi bi-diagram-3 me-2"></i>Microciclos
          </h2>
          <p class="page-subtitle" *ngIf="selectedTeamName">
            {{ selectedTeamName }} · {{ microcycles.length }} microciclo{{ microcycles.length === 1 ? '' : 's' }}
          </p>
          <p class="page-subtitle" *ngIf="!selectedTeamName">Planificación semanal por partido</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Master toggle off -->
        <div *ngIf="disabledByMaster" class="empty-state empty-state--locked">
          <i class="bi bi-lock"></i>
          <h4>Modo Profesional desactivado</h4>
          <p>Para usar Microciclos activa el Modo Profesional desde "Permisos del club".</p>
          <button class="btn btn-primary" (click)="goPermisos()">Ir a permisos</button>
        </div>

        <!-- Filtros -->
        <div class="filters-bar" *ngIf="!disabledByMaster">
          <div class="filter-group filter-group--team" *ngIf="teams.length > 1 || !selectedTeamId">
            <label class="filter-label">Equipo</label>
            <select class="form-select form-select-sm" [value]="selectedTeamId || ''" (change)="onTeamChange($event)">
              <option value="" disabled>Elige un equipo…</option>
              <option *ngFor="let t of teams" [value]="t.teamId">{{ t.name }}</option>
            </select>
          </div>
          <div class="filters-actions" *ngIf="selectedTeamId">
            <button class="btn btn-sm btn-autogen" (click)="autoGenerate()" [disabled]="autoGenerating">
              <i class="bi bi-magic"></i>
              <span *ngIf="!autoGenerating">Auto-generar desde partidos</span>
              <span *ngIf="autoGenerating">Generando…</span>
            </button>
            <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
              <i class="bi bi-plus-lg"></i> Crear manualmente
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-state">
          <div class="spinner-border text-primary"></div>
          <p>Cargando microciclos…</p>
        </div>

        <!-- Error -->
        <div *ngIf="!loading && errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

        <!-- Auto-generate result toast -->
        <div *ngIf="!loading && autoGenerateMsg" class="alert" [ngClass]="autoGenerateError ? 'alert-warning' : 'alert-success'">
          {{ autoGenerateMsg }}
        </div>

        <!-- Lista de microciclos -->
        <div *ngIf="!loading && !disabledByMaster && selectedTeamId && microcycles.length === 0" class="empty-state">
          <i class="bi bi-diagram-3"></i>
          <h4>Sin microciclos</h4>
          <p>Aún no hay microciclos para este equipo. Pulsa <strong>Auto-generar</strong> para crearlos a partir de los partidos del calendario, o créalos manualmente.</p>
        </div>

        <div class="mc-list" *ngIf="!loading && microcycles.length > 0">
          <ng-container *ngFor="let mc of orderedMicrocycles; let i = index; trackBy: trackById">
          <div class="mc-past-divider" *ngIf="i === firstPastIndex">
            <span><i class="bi bi-clock-history"></i> Anteriores</span>
          </div>
          <div class="mc-item"
               [class.mc-item--current]="isCurrentMicrocycle(mc)"
               [class.mc-item--past]="isPastMicrocycle(mc)">
            <div class="mc-item__head" (click)="toggleExpand(mc.microcycleId)">
              <div class="mc-item__title">
                <i class="bi" [ngClass]="expanded[mc.microcycleId] ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
                <span class="mc-name">{{ mc.name }}</span>
                <span class="mc-type" *ngIf="matchTypeKind(mc)" [ngClass]="'mc-type--' + matchTypeKind(mc)">
                  <i class="bi" [ngClass]="matchTypeIcon(mc)"></i> {{ matchTypeLabel(mc) }}
                </span>
                <span class="mc-venue" *ngIf="matchVenueKind(mc)" [ngClass]="'mc-venue--' + matchVenueKind(mc)"
                      [title]="matchVenueLabel(mc)">
                  <i class="bi" [ngClass]="matchVenueIcon(mc)"></i> {{ matchVenueLabel(mc) }}
                </span>
                <span class="mc-tag mc-tag--current" *ngIf="isCurrentMicrocycle(mc)"><i class="bi bi-broadcast"></i> Actual</span>
              </div>
              <div class="mc-item__meta">
                <span class="mc-dates">
                  <i class="bi bi-calendar3"></i>
                  {{ formatHumanDate(mc.startDate) }} → {{ formatHumanDate(mc.endDate) }}
                </span>
                <span class="mc-match">
                  <i class="bi bi-flag"></i> Partido {{ formatHumanDate(mc.matchDate) }}
                </span>
              </div>
              <div class="mc-item__actions" (click)="$event.stopPropagation()">
                <button class="btn btn-link btn-sm text-danger" (click)="deleteMicrocycle(mc)" title="Eliminar microciclo">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>

            <div class="mc-item__body" *ngIf="expanded[mc.microcycleId]">
              <div class="mc-empty-days" *ngIf="!mc.days || mc.days.length === 0">
                <i class="bi bi-info-circle"></i>
                Este microciclo no tiene días generados.
              </div>

              <div class="mc-day-row mc-day-row--head">
                <div class="col-day">Día</div>
                <div class="col-md">MD</div>
                <div class="col-md">MD</div>
                <div class="col-type">Tipo</div>
                <div class="col-session">Sesión vinculada</div>
                <div class="col-notes">Notas</div>
                <div class="col-status"></div>
                <div class="col-del"></div>
              </div>

              <div class="mc-day-row" *ngFor="let d of mc.days; trackBy: trackByDayId"
                   [ngClass]="dayRowClass(d)">
                <div class="col-day">
                  <strong>{{ formatShortDate(d.dayDate) }}</strong>
                  <small class="text-muted d-block">{{ formatWeekday(d.dayDate) }}</small>
                </div>
                <div class="col-md">
                  <input class="form-control form-control-sm md-input md-input--{{ d.dayType }}"
                         [(ngModel)]="d.mdLabel" [ngModelOptions]="{ standalone: true }"
                         maxlength="10"
                         (blur)="onMdLabelBlur(d)"
                         placeholder="MD" />
                </div>
                <div class="col-md">
                  <input class="form-control form-control-sm md-input md-input--{{ d.dayType }}"
                         [(ngModel)]="d.mdLabel2" [ngModelOptions]="{ standalone: true }"
                         maxlength="10"
                         (blur)="onMdLabel2Blur(d)"
                         placeholder="MD" />
                </div>
                <div class="col-type">
                  <select class="form-select form-select-sm"
                          [value]="d.dayType"
                          (change)="onDayTypeChange(d, $event)">
                    <option value="training">Entrenamiento</option>
                    <option value="rest">Descanso</option>
                    <option value="match">Partido</option>
                  </select>
                </div>
                <div class="col-session">
                  <ng-container *ngIf="d.trainingSessionId">
                    <button type="button" class="session-pill session-pill--link"
                            (click)="openLinkedSession(mc, d)"
                            [title]="'Abrir ' + sessionLinkLabel(d) + ' en el calendario'">
                      <i class="bi bi-box-arrow-up-right"></i> {{ sessionLinkLabel(d) }}
                    </button>
                    <button class="btn btn-link btn-sm" (click)="unlinkSession(d)" title="Quitar vínculo">
                      <i class="bi bi-x"></i>
                    </button>
                  </ng-container>
                  <button *ngIf="!d.trainingSessionId && d.dayType === 'training'"
                          class="btn btn-outline-primary btn-sm"
                          (click)="linkSessionFromCalendar(d)"
                          [disabled]="resolvingDayId === d.microcycleDayId">
                    <i class="bi bi-link-45deg"></i>
                    <span *ngIf="resolvingDayId !== d.microcycleDayId">Vincular sesión del día</span>
                    <span *ngIf="resolvingDayId === d.microcycleDayId">Resolviendo…</span>
                  </button>
                  <span class="text-muted small" *ngIf="!d.trainingSessionId && d.dayType !== 'training'">—</span>
                </div>
                <div class="col-notes">
                  <input class="form-control form-control-sm"
                         [(ngModel)]="d.notes" [ngModelOptions]="{ standalone: true }"
                         (blur)="onDayNotesBlur(d)"
                         placeholder="Añade notas (objetivos, intensidad, restricciones…)" />
                </div>
                <div class="col-status">
                  <span *ngIf="dayStates[d.microcycleDayId]?.saving" class="spinner-border spinner-border-sm text-primary"></span>
                  <i *ngIf="!dayStates[d.microcycleDayId]?.saving && dayStates[d.microcycleDayId]?.savedAt" class="bi bi-check-circle-fill text-success"></i>
                  <i *ngIf="!dayStates[d.microcycleDayId]?.saving && dayStates[d.microcycleDayId]?.error"
                     class="bi bi-exclamation-triangle-fill text-danger"
                     [title]="dayStates[d.microcycleDayId]?.error"></i>
                </div>
                <div class="col-del">
                  <button class="btn-day-del" (click)="deleteDay(mc, d)"
                          [disabled]="deletingDayId === d.microcycleDayId"
                          title="Eliminar día">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>

              <!-- Añadir día -->
              <div class="mc-add-day">
                <ng-container *ngIf="addingDayFor === mc.microcycleId; else addDayBtn">
                  <input type="date" class="form-control form-control-sm mc-add-day__date"
                         [(ngModel)]="newDayDate" />
                  <button class="btn-add-day-confirm" (click)="confirmAddDay(mc)"
                          [disabled]="!newDayDate || savingNewDay">
                    <span *ngIf="!savingNewDay"><i class="bi bi-check-lg"></i> Añadir</span>
                    <span *ngIf="savingNewDay">Guardando…</span>
                  </button>
                  <button class="btn-add-day-cancel" (click)="cancelAddDay()" [disabled]="savingNewDay">
                    Cancelar
                  </button>
                  <span class="mc-add-day__err" *ngIf="addDayError">{{ addDayError }}</span>
                </ng-container>
                <ng-template #addDayBtn>
                  <button class="btn-add-day" (click)="startAddDay(mc)">
                    <i class="bi bi-plus-lg"></i> Añadir día
                  </button>
                </ng-template>
              </div>
            </div>
          </div>
          </ng-container>
        </div>

      </div>

      <!-- Modal crear -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeCreateModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-card__head">
            <h4>Nuevo microciclo</h4>
            <button class="btn-close" (click)="closeCreateModal()" aria-label="Cerrar"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-card__body">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">Nombre</label>
                <input class="form-control" [(ngModel)]="form.name" placeholder="vs Rival / Semana 12…" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Fecha de inicio</label>
                <input type="date" class="form-control" [(ngModel)]="form.startDate" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Fecha del partido (MD)</label>
                <input type="date" class="form-control" [(ngModel)]="form.matchDate" (change)="syncEndWithMatch()" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Fecha de fin</label>
                <input type="date" class="form-control" [(ngModel)]="form.endDate" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Día de descanso (opcional)</label>
                <input type="date" class="form-control" [(ngModel)]="form.restDay" />
              </div>
            </div>
            <div class="alert alert-info mt-3 mb-0 small">
              <i class="bi bi-info-circle"></i>
              Se generarán automáticamente los días MD-X / MD / MD+Y entre el inicio y el fin.
            </div>
          </div>
          <div class="modal-card__foot">
            <button class="btn btn-light" (click)="closeCreateModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="submitCreate()" [disabled]="creating || !canSubmit()">
              <span *ngIf="!creating">Crear microciclo</span>
              <span *ngIf="creating">Creando…</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Sphaira brand palette ──────────────────────────────────────
       Navy (primario oscuro):  #002c40
       Green (primario):        #31b270
       Green light:             #c4e8d6
       Gray text:               #636363
       Bg highlight:            #f4f4f4
       White:                   #ffffff
       Semantic:
         Warning (amber):       #b07b00
         Danger (red):          #b1231b
       Tipografía: Plus Jakarta Sans (con fallback system-ui)
       ──────────────────────────────────────────────────────────────── */
    :host { display: block; }
    .mc-page {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f4f4f4; min-height: 100vh;
    }
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; gap: 12px; border-bottom: 1px solid #e9ecef; background: #ffffff;
    }
    .back-container { flex: 0 0 auto; }
    .btn-back-clean {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(49, 178, 112, 0.08); border: 0; color: #002c40;
      padding: 0.4rem 0.75rem; border-radius: 8px;
      cursor: pointer; transition: background .2s, transform .15s; font-weight: 600;
    }
    .btn-back-clean:hover { background: rgba(49, 178, 112, 0.18); color: #002c40; transform: translateX(-2px); }
    .header-center { flex: 1 1 auto; text-align: center; }
    .page-title { font-weight: 800; color: #002c40; margin: 0; }
    .page-subtitle { font-size: 13px; color: #636363; margin: 4px 0 0; }
    .page-header-spacer { flex: 0 0 auto; width: 96px; }
    /* Spinners en verde de marca (en vez del azul Bootstrap). */
    .spinner-border.text-primary { color: #31b270 !important; }

    .filters-bar {
      display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px;
      background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;
      padding: 14px 18px; margin: 18px 0;
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 200px; }
    /* El nombre del equipo puede ser largo: el selector necesita más anchura
       y poder crecer para que no se recorte ni solape con la flecha. */
    .filter-group--team { min-width: 280px; flex: 1 1 280px; max-width: 460px; }
    .filter-group--team .form-select { width: 100%; text-overflow: ellipsis; }
    .filter-label { font-size: 12px; color: #636363; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .filters-actions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }

    .loading-state, .empty-state {
      background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;
      padding: 32px 24px; text-align: center; color: #636363; margin: 18px 0;
    }
    .loading-state .spinner-border { color: #31b270 !important; }
    .empty-state i { font-size: 32px; color: #002c40; }
    .empty-state h4 { color: #002c40; margin-top: 12px; font-weight: 700; }
    .empty-state--locked i { color: #b07b00; }

    .mc-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 32px; }
    .mc-item {
      background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0, 44, 64, 0.04); overflow: hidden;
    }
    .mc-item__head {
      display: grid; grid-template-columns: 1fr auto 56px;
      align-items: center; gap: 16px; padding: 14px 18px; cursor: pointer;
      border-left: 4px solid #002c40;
      transition: background-color .15s ease;
    }
    .mc-item__head:hover { background: #f4f4f4; }
    .mc-item__title { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .mc-item__title .bi-chevron-down,
    .mc-item__title .bi-chevron-right { color: #636363; }
    .mc-name { font-weight: 700; color: #002c40; font-size: 15px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mc-tag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600;
    }
    .mc-tag--current {
      gap: 6px;
      font-size: 13px;
      padding: 5px 14px;
      border-radius: 999px;
      font-weight: 700;
      letter-spacing: .2px;
      color: #ffffff;
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%);
      box-shadow: 0 3px 10px rgba(49, 178, 112, 0.35);
    }
    .mc-tag--current .bi { font-size: 13px; }

    /* ── Badge del tipo de competición (Amistoso / Liga / Copa-Torneo) ──
       Colores diferenciados para que el cuerpo técnico distinga de un vistazo
       qué microciclos son de liga, copa/torneo o amistoso. */
    .mc-type {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; padding: 3px 9px; border-radius: 999px;
      font-weight: 700; letter-spacing: .2px; white-space: nowrap;
      border: 1px solid transparent;
    }
    .mc-type .bi { font-size: 11px; }
    /* Liga → navy de marca */
    .mc-type--liga { background: rgba(0, 44, 64, 0.1); color: #002c40; border-color: rgba(0, 44, 64, 0.2); }
    /* Copa / Torneo → dorado (semántico) */
    .mc-type--torneo { background: rgba(176, 123, 0, 0.14); color: #8a6100; border-color: rgba(176, 123, 0, 0.28); }
    /* Amistoso → verde de marca */
    .mc-type--amistoso { background: rgba(49, 178, 112, 0.14); color: #1c7d4c; border-color: rgba(49, 178, 112, 0.3); }

    /* Terreno del partido (casa / fuera) */
    .mc-venue {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; padding: 3px 9px; border-radius: 999px;
      font-weight: 700; letter-spacing: .2px; white-space: nowrap;
      border: 1px solid transparent;
    }
    .mc-venue .bi { font-size: 11px; }
    /* Local (en casa) → verde de marca */
    .mc-venue--local { background: rgba(49, 178, 112, 0.14); color: #1c7d4c; border-color: rgba(49, 178, 112, 0.3); }
    /* Visitante (fuera) → navy de marca */
    .mc-venue--visitante { background: rgba(0, 44, 64, 0.1); color: #002c40; border-color: rgba(0, 44, 64, 0.2); }

    .mc-item--current { border-color: #31b270; box-shadow: 0 2px 10px rgba(49, 178, 112, 0.18); }
    .mc-item--current .mc-item__head { border-left-color: #31b270; background: rgba(49, 178, 112, 0.05); }

    /* Microciclos pasados: en segundo plano (atenuados). Al pasar el ratón
       recuperan opacidad total para poder consultarlos/editarlos con comodidad. */
    .mc-item--past { opacity: .55; box-shadow: none; background: #fbfcfd; }
    .mc-item--past .mc-item__head { border-left-color: #c3ccd2; }
    .mc-item--past .mc-name { color: #5b6b73; font-weight: 600; }
    .mc-item--past:hover { opacity: 1; }

    /* Separador "Anteriores" que introduce el bloque de microciclos pasados. */
    .mc-past-divider {
      display: flex; align-items: center; gap: 10px;
      margin: 10px 2px 2px; color: #93a1a8;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
    }
    .mc-past-divider span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .mc-past-divider::after {
      content: ''; flex: 1 1 auto; height: 1px; background: #e2e8ec;
    }

    .mc-item__meta { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #002c40; font-weight: 600; }
    .mc-item__meta span { white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
    .mc-dates i { color: #31b270; }
    .mc-match i { color: #002c40; }
    .mc-item__actions { display: flex; justify-content: flex-end; }

    .mc-item__body {
      border-top: 1px solid #eef2f4; padding: 12px 18px 18px;
      background: #fbfcfd;
    }
    .mc-empty-days { color: #636363; font-size: 13px; padding: 8px 0; }

    .mc-day-row {
      display: grid;
      grid-template-columns: 104px 64px 64px 168px 220px 1fr 28px 36px;
      gap: 10px; align-items: center;
      padding: 8px 4px; border-bottom: 1px solid #f1f4f6;
    }
    .col-type .form-select {
      width: 100%; padding-right: 1.9rem;
      text-overflow: ellipsis;
    }
    .col-del { display: flex; align-items: center; justify-content: center; }
    .btn-day-del {
      border: 0; background: transparent; color: #b1231b;
      width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s; font-size: .9rem;
    }
    .btn-day-del:hover { background: rgba(177, 35, 27, 0.1); }
    .btn-day-del:disabled { opacity: .4; cursor: default; }
    .mc-add-day {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 12px 4px 4px;
    }
    .mc-add-day__date { max-width: 170px; }
    .mc-add-day__err { color: #b1231b; font-size: .8rem; font-weight: 600; }
    .btn-add-day {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(49, 178, 112, 0.08); border: 1px dashed #31b270;
      color: #002c40; padding: 0.4rem 0.85rem; border-radius: 8px;
      cursor: pointer; font-weight: 600; transition: background .2s;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .btn-add-day:hover { background: rgba(49, 178, 112, 0.18); }
    .btn-add-day-confirm {
      display: inline-flex; align-items: center; gap: 6px;
      background: #31b270; border: 0; color: #fff;
      padding: 0.4rem 0.85rem; border-radius: 8px; cursor: pointer; font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .btn-add-day-confirm:disabled { opacity: .5; cursor: default; }
    .btn-add-day-cancel {
      background: transparent; border: 0; color: #636363;
      padding: 0.4rem 0.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .btn-add-day-cancel:hover { color: #002c40; }
    .mc-day-row:last-child { border-bottom: none; }
    .mc-day-row--head {
      font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
      color: #636363; font-weight: 700; border-bottom: 2px solid #e9ecef;
      padding-bottom: 6px;
    }
    .mc-day-row--match { background: rgba(49, 178, 112, 0.08); border-radius: 8px; }
    .mc-day-row--rest  { background: rgba(176, 123, 0, 0.07); border-radius: 8px; }

    .md-pill {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 12px;
      background: rgba(0, 44, 64, 0.08); color: #002c40;
    }
    .md-pill--match { background: linear-gradient(135deg, #31b270 0%, #002c40 100%); color: #ffffff; }
    .md-pill--rest  { background: rgba(176, 123, 0, 0.18); color: #b07b00; }

    /* Inputs MD editables (dos columnas idénticas) */
    .md-input {
      text-align: center; font-weight: 700; font-size: 12px;
      padding: 4px 4px; border-radius: 8px;
      background: rgba(0, 44, 64, 0.06); color: #002c40;
      border: 1px solid transparent;
    }
    .md-input:focus {
      background: #ffffff; border-color: #31b270; color: #002c40;
      box-shadow: 0 0 0 2px rgba(49, 178, 112, 0.15);
    }
    .md-input--match { background: rgba(49, 178, 112, 0.15); color: #002c40; }
    .md-input--rest  { background: rgba(176, 123, 0, 0.15); color: #b07b00; }

    .session-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(0, 44, 64, 0.08); color: #002c40;
      padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
    }
    .session-pill--link {
      border: 0; cursor: pointer;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: background .15s, transform .15s;
    }
    .session-pill--link:hover {
      background: rgba(49, 178, 112, 0.18); color: #002c40; transform: translateY(-1px);
    }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0, 19, 28, 0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 2000; padding: 16px;
    }
    .modal-card {
      background: #ffffff; border-radius: 14px; width: 100%; max-width: 560px;
      box-shadow: 0 20px 60px rgba(0, 44, 64, 0.35);
      display: flex; flex-direction: column; max-height: 92vh; overflow: hidden;
    }
    .modal-card__head {
      padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%); color: #ffffff;
    }
    .modal-card__head h4 { margin: 0; font-weight: 700; }
    .modal-card__head .btn-close {
      background: transparent; border: none; color: #ffffff; font-size: 16px;
      width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .modal-card__head .btn-close:hover { background: rgba(255, 255, 255, 0.12); }
    .modal-card__body { padding: 20px; overflow-y: auto; }
    .modal-card__foot {
      padding: 14px 20px; border-top: 1px solid #eef2f4;
      display: flex; justify-content: flex-end; gap: 10px;
    }
    .form-label { font-size: 12px; font-weight: 600; color: #636363; }

    .btn-primary {
      background: #31b270; border-color: #31b270;
    }
    .btn-primary:hover { background: #002c40; border-color: #002c40; }
    .btn-outline-primary { color: #002c40; border-color: #002c40; }
    .btn-outline-primary:hover { background: #002c40; color: #ffffff; }
    /* Botón "Auto-generar": navy sólido de marca con texto blanco. */
    .btn-autogen {
      background: #002c40; border: 1px solid #002c40; color: #ffffff; font-weight: 600;
    }
    .btn-autogen:hover:not(:disabled) { background: #013a54; border-color: #013a54; color: #ffffff; }
    .btn-autogen:disabled { opacity: 0.6; }

    /* ── Dark mode (navy-deep Sphaira) ───────────────────────────── */
    :host-context(body.dark) .mc-page { background: #00131c; }
    :host-context(body.dark) .page-header,
    :host-context(body.dark) .filters-bar,
    :host-context(body.dark) .mc-item,
    :host-context(body.dark) .empty-state,
    :host-context(body.dark) .loading-state {
      background: #001e2e; border-color: #00405c; color: #c4e8d6;
    }
    :host-context(body.dark) .mc-name,
    :host-context(body.dark) .page-title,
    :host-context(body.dark) .empty-state h4 { color: #c4e8d6; }
    :host-context(body.dark) .mc-item__head { border-left-color: #31b270; }
    :host-context(body.dark) .mc-item__head:hover { background: #002940; }
    :host-context(body.dark) .mc-item__body { background: #00182a; border-top-color: #00405c; }
    :host-context(body.dark) .mc-day-row { border-bottom-color: #003047; }
    :host-context(body.dark) .mc-day-row--head { border-bottom-color: #00405c; color: #8ab4c2; }
    :host-context(body.dark) .form-control,
    :host-context(body.dark) .form-select {
      background: #001e2e; color: #c4e8d6; border-color: #00405c;
    }
    :host-context(body.dark) .modal-card { background: #001e2e; color: #c4e8d6; }
    :host-context(body.dark) .modal-card__foot { border-top-color: #00405c; }
    :host-context(body.dark) .mc-type--liga { background: rgba(196, 232, 214, 0.12); color: #c4e8d6; border-color: rgba(196, 232, 214, 0.25); }
    :host-context(body.dark) .mc-type--torneo { background: rgba(224, 179, 60, 0.18); color: #e8c96a; border-color: rgba(224, 179, 60, 0.35); }
    :host-context(body.dark) .mc-type--amistoso { background: rgba(49, 178, 112, 0.22); color: #7fe0ac; border-color: rgba(49, 178, 112, 0.4); }
    :host-context(body.dark) .mc-venue--local { background: rgba(49, 178, 112, 0.22); color: #7fe0ac; border-color: rgba(49, 178, 112, 0.4); }
    :host-context(body.dark) .mc-venue--visitante { background: rgba(196, 232, 214, 0.12); color: #c4e8d6; border-color: rgba(196, 232, 214, 0.25); }
    :host-context(body.dark) .mc-item--past .mc-item__head { border-left-color: #2a4b5a; }
    :host-context(body.dark) .mc-item--past .mc-name { color: #7fa0ad; }
    :host-context(body.dark) .mc-past-divider { color: #5f8494; }
    :host-context(body.dark) .mc-past-divider::after { background: #00405c; }

    /* Responsive: tabla → tarjetas en móvil */
    @media (max-width: 920px) {
      .mc-day-row { grid-template-columns: 1fr 1fr; row-gap: 6px; }
      .mc-day-row--head { display: none; }
      .col-notes { grid-column: 1 / -1; }
    }
  `]
})
export class MicrociclosComponent implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  // ── Estado de carga
  loading = false;
  errorMessage: string | null = null;
  disabledByMaster = false;

  // ── Datos
  clubId = 0;
  userId = 0;
  userName: string | null = null;
  profileId = 0;
  modules: ClubModules | null = null;
  teams: ComboTeam[] = [];
  selectedTeamId: number | null = null;
  microcycles: Microcycle[] = [];
  /** Orden de pintado: próximos/actual arriba (por fecha, más próxima primero) y pasados al final. */
  orderedMicrocycles: Microcycle[] = [];
  /** Índice del primer microciclo pasado en {@link orderedMicrocycles} (-1 si no hay). Marca el separador "Anteriores". */
  firstPastIndex = -1;

  expanded: { [microcycleId: number]: boolean } = {};
  dayStates: { [microcycleDayId: number]: DaySaveState } = {};
  /**
   * Último valor de MD persistido por día. Se usa para decidir en el `blur`
   * si el usuario cambió realmente la etiqueta (y hay que guardar). Se siembra
   * al cargar con el valor crudo de BD y se actualiza tras cada guardado.
   */
  private mdSaved: { [microcycleDayId: number]: { l1: string; l2: string } } = {};
  /** Último valor de notas persistido por día (mismo motivo que {@link mdSaved}). */
  private notesSaved: { [microcycleDayId: number]: string } = {};
  resolvingDayId: number | null = null;

  // ── Eliminar / añadir días
  deletingDayId: number | null = null;
  addingDayFor: number | null = null;
  newDayDate = '';
  savingNewDay = false;
  addDayError: string | null = null;

  // ── Auto-generate
  autoGenerating = false;
  autoGenerateMsg: string | null = null;
  autoGenerateError = false;

  // ── Crear manual
  showCreateModal = false;
  creating = false;
  form: CreateForm = this.emptyForm();

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private loginService = inject(LoginService);
  private clubService = inject(ClubService);
  private clubModulesService = inject(ClubModulesService);
  private teamService = inject(TeamService);
  private microcycleService = inject(MicrocycleService);
  private scheduleService = inject(TrainingScheduleService);
  private location = inject(Location);

  constructor() {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tid = Number(params.get('teamId'));
      if (tid) this.selectedTeamId = tid;
      this.bootstrap();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────
  // Bootstrap: club → módulos → equipos → microciclos
  // ─────────────────────────────────────────────────────────────────
  private bootstrap(): void {
    this.loading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.userId = user?.userId ?? 0;
      this.profileId = user?.profileType?.profileId ?? 0;
      this.userName = user ? [user.firstName, user.secondName].filter(Boolean).join(' ').trim() || null : null;

      this.resolveClubId(user).then(clubId => {
        this.clubId = clubId;
        if (!clubId) {
          this.errorMessage = 'No se ha podido identificar el club.';
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
            this.loadTeamsAndMicrocycles();
          },
          error: () => {
            this.errorMessage = 'No se han podido cargar los permisos del club.';
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

  private loadTeamsAndMicrocycles(): void {
    // Misma corrección que en Panel diario: la temporada seleccionada vive en
    // `selectedTemporada`/`localStorage['temporada']`, no en `sessionStorage['temporada']`.
    // Usar `getSelectedSeason()` evita el combo de equipos vacío para el cuerpo
    // técnico asignado a equipos de la temporada nueva durante la pretemporada.
    const temporada = getSelectedSeason() || this.currentTemporada();

    // Admin (1) y coach principal del club (2) ven todos los equipos. El resto
    // — fisio (6), nutricionista (7), médico (8) y staff genérico — solo ven
    // los equipos donde están asignados via `team_users`.
    const isClubStaff = this.profileId === 1 || this.profileId === 2;
    const teams$ = isClubStaff
      ? this.teamService.getTeamsByClubForCombo(this.clubId, temporada)
      : this.teamService.getTeamsByClubForCombo2(this.clubId, temporada, this.userId);

    teams$.subscribe({
      next: (resp: any) => {
        const data = resp?.data ?? [];
        this.teams = (Array.isArray(data) ? data : []).map((t: any) => ({
          teamId: Number(t.teamId ?? t.value),
          name: t.name || t.teamName || `Equipo ${t.teamId ?? t.value}`,
          categoryName: t.categoryName
        }));
        if (!this.selectedTeamId && this.teams.length === 1) {
          this.selectedTeamId = this.teams[0].teamId;
        }
        if (this.selectedTeamId) {
          // Si la URL trae un teamId que el usuario no tiene asignado, lo
          // descartamos para evitar un 403 silencioso al cargar el microciclo.
          const allowed = this.teams.some(t => t.teamId === this.selectedTeamId);
          if (!allowed) {
            this.selectedTeamId = this.teams.length === 1 ? this.teams[0].teamId : null;
          }
        }
        if (this.selectedTeamId) {
          this.loadMicrocycles();
        } else {
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.errorMessage = 'No se han podido cargar los equipos del club.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadMicrocycles(): void {
    if (!this.selectedTeamId) return;
    this.loading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.microcycleService.listByTeam(this.selectedTeamId).subscribe({
      next: (list) => {
        this.microcycles = (list || []).slice();
        // Guardamos el valor crudo de BD ANTES de normalizar (normalize solo
        // recalcula la etiqueta mostrada en memoria, no persiste). Así el blur
        // sabe si el usuario cambió realmente la etiqueta.
        this.mdSaved = {};
        this.notesSaved = {};
        this.microcycles.forEach(mc => {
          (mc.days || []).forEach(d => {
            this.mdSaved[d.microcycleDayId] = { l1: d.mdLabel ?? '', l2: d.mdLabel2 ?? '' };
            this.notesSaved[d.microcycleDayId] = d.notes ?? '';
          });
          this.normalizeMdLabels(mc);
        });
        this.rebuildOrder();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error?.msg
          || 'No se han podido cargar los microciclos.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // UI handlers
  // ─────────────────────────────────────────────────────────────────
  onTeamChange(ev: Event): void {
    const tid = Number((ev.target as HTMLSelectElement).value);
    if (tid > 0) {
      this.selectedTeamId = tid;
      this.router.navigate(['/dashboard/microciclos', tid]);
    }
  }

  toggleExpand(microcycleId: number): void {
    this.expanded[microcycleId] = !this.expanded[microcycleId];
    this.cdr.markForCheck();
  }

  // ── Auto-generate
  autoGenerate(): void {
    if (!this.selectedTeamId || this.autoGenerating) return;
    this.autoGenerating = true;
    this.autoGenerateMsg = null;
    this.autoGenerateError = false;
    this.cdr.markForCheck();

    this.microcycleService.autoGenerateFromMatches(
      this.selectedTeamId,
      this.clubId,
      this.userId || null,
      this.userName
    ).subscribe({
      next: (created) => {
        this.autoGenerating = false;
        const n = (created || []).length;
        this.autoGenerateMsg = n > 0
          ? `Se han creado ${n} microciclo${n === 1 ? '' : 's'} a partir de los partidos.`
          : 'No había partidos sin microciclo: todo está al día.';
        this.autoGenerateError = false;
        this.cdr.markForCheck();
        this.loadMicrocycles();
      },
      error: (err) => {
        this.autoGenerating = false;
        this.autoGenerateMsg = err?.error?.error?.msg
          || 'No se ha podido auto-generar. Asegúrate de tener partidos planificados.';
        this.autoGenerateError = true;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Crear manual
  openCreateModal(): void {
    this.form = this.emptyForm();
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    this.form.startDate = this.toIsoYmd(start);
    this.form.matchDate = this.toIsoYmd(today);
    this.form.endDate = this.toIsoYmd(today);
    this.showCreateModal = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.creating = false;
    this.cdr.markForCheck();
  }

  syncEndWithMatch(): void {
    if (this.form.matchDate && (!this.form.endDate || this.form.endDate < this.form.matchDate)) {
      this.form.endDate = this.form.matchDate;
    }
  }

  canSubmit(): boolean {
    return !!(this.form.name?.trim() && this.form.startDate && this.form.endDate
      && this.form.matchDate && this.selectedTeamId && this.clubId
      && this.form.startDate <= this.form.endDate
      && this.form.startDate <= this.form.matchDate
      && this.form.matchDate <= this.form.endDate);
  }

  submitCreate(): void {
    if (!this.canSubmit() || !this.selectedTeamId) return;
    this.creating = true;
    this.cdr.markForCheck();

    this.microcycleService.create({
      teamId: this.selectedTeamId,
      clubId: this.clubId,
      name: this.form.name.trim(),
      startDate: this.form.startDate,
      endDate: this.form.endDate,
      matchDate: this.form.matchDate,
      restDay: this.form.restDay || null,
      createdByUserId: this.userId || null,
      createdByName: this.userName
    }).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateModal = false;
        this.cdr.markForCheck();
        this.loadMicrocycles();
      },
      error: (err) => {
        this.creating = false;
        this.errorMessage = err?.error?.error?.msg
          || 'No se ha podido crear el microciclo.';
        this.cdr.markForCheck();
      }
    });
  }

  deleteMicrocycle(mc: Microcycle): void {
    if (!confirm(`¿Eliminar el microciclo "${mc.name}"? Esta acción no se puede deshacer.`)) return;
    this.microcycleService.delete(mc.microcycleId).subscribe({
      next: () => this.loadMicrocycles(),
      error: () => {
        this.errorMessage = 'No se ha podido eliminar el microciclo.';
        this.cdr.markForCheck();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Añadir / eliminar días del microciclo
  // ─────────────────────────────────────────────────────────────────
  deleteDay(mc: Microcycle, day: MicrocycleDay): void {
    if (!confirm(`¿Eliminar el día ${this.formatShortDate(day.dayDate)}?`)) return;
    this.deletingDayId = day.microcycleDayId;
    this.cdr.markForCheck();
    this.microcycleService.deleteDay(day.microcycleDayId).subscribe({
      next: () => {
        this.deletingDayId = null;
        if (mc.days) {
          mc.days = mc.days.filter(d => d.microcycleDayId !== day.microcycleDayId);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.deletingDayId = null;
        this.errorMessage = 'No se ha podido eliminar el día.';
        this.cdr.markForCheck();
      }
    });
  }

  startAddDay(mc: Microcycle): void {
    this.addingDayFor = mc.microcycleId;
    this.addDayError = null;
    this.savingNewDay = false;
    this.newDayDate = this.nextDayAfter(mc.endDate);
    this.cdr.markForCheck();
  }

  cancelAddDay(): void {
    this.addingDayFor = null;
    this.newDayDate = '';
    this.addDayError = null;
    this.savingNewDay = false;
    this.cdr.markForCheck();
  }

  confirmAddDay(mc: Microcycle): void {
    if (!this.newDayDate || this.savingNewDay) return;
    const exists = (mc.days || []).some(d => (d.dayDate || '').substring(0, 10) === this.newDayDate);
    if (exists) {
      this.addDayError = 'Ya existe un día con esa fecha.';
      this.cdr.markForCheck();
      return;
    }
    this.savingNewDay = true;
    this.addDayError = null;
    this.cdr.markForCheck();
    this.microcycleService.addDay(mc.microcycleId, { dayDate: this.newDayDate }).subscribe({
      next: () => {
        this.savingNewDay = false;
        this.addingDayFor = null;
        this.newDayDate = '';
        this.loadMicrocycles();
      },
      error: (err) => {
        this.savingNewDay = false;
        this.addDayError = err?.status === 409
          ? 'Ya existe un día con esa fecha.'
          : 'No se ha podido añadir el día.';
        this.cdr.markForCheck();
      }
    });
  }

  private nextDayAfter(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 1);
    return this.toIsoYmd(d);
  }

  // ─────────────────────────────────────────────────────────────────
  // Editor de día (auto-save)
  // ─────────────────────────────────────────────────────────────────
  onDayTypeChange(day: MicrocycleDay, ev: Event): void {
    const value = (ev.target as HTMLSelectElement).value;
    if (value === day.dayType) return;
    day.dayType = value as any;
    this.saveDay(day, { dayType: value });
  }

  onDayNotesBlur(day: MicrocycleDay): void {
    const value = day.notes || '';
    const prev = this.notesSaved[day.microcycleDayId];
    if (prev === value) return;
    this.notesSaved[day.microcycleDayId] = value;
    this.saveDay(day, { notes: value });
  }

  /**
   * Edición manual de la primera columna MD. Con `[(ngModel)]` el valor ya
   * está en `day.mdLabel`; comparamos contra lo último persistido para no
   * lanzar PUTs redundantes, y guardamos automáticamente al perder el foco.
   */
  onMdLabelBlur(day: MicrocycleDay): void {
    const value = (day.mdLabel || '').trim();
    day.mdLabel = value;
    const prev = this.mdSaved[day.microcycleDayId]?.l1;
    if (prev === value) return;
    this.mdSaved[day.microcycleDayId] = {
      l1: value,
      l2: this.mdSaved[day.microcycleDayId]?.l2 ?? (day.mdLabel2 ?? '')
    };
    this.saveDay(day, { mdLabel: value });
  }

  /** Edición manual de la segunda columna MD (idéntica pero independiente). */
  onMdLabel2Blur(day: MicrocycleDay): void {
    const value = (day.mdLabel2 || '').trim();
    day.mdLabel2 = value;
    const prev = this.mdSaved[day.microcycleDayId]?.l2;
    if (prev === value) return;
    this.mdSaved[day.microcycleDayId] = {
      l1: this.mdSaved[day.microcycleDayId]?.l1 ?? (day.mdLabel ?? ''),
      l2: value
    };
    this.saveDay(day, { mdLabel2: value });
  }

  /**
   * Resuelve la sesión del día desde el módulo de Horarios y la enlaza
   * al día del microciclo. Si no hay sesión planificada para esa fecha
   * se notifica al usuario.
   */
  linkSessionFromCalendar(day: MicrocycleDay): void {
    if (!this.selectedTeamId) return;
    this.resolvingDayId = day.microcycleDayId;
    this.cdr.markForCheck();

    this.scheduleService.getByTeamAndDate(this.selectedTeamId, day.dayDate).subscribe({
      next: (bundle) => {
        this.resolvingDayId = null;
        if (!bundle?.sessionId) {
          this.dayStates[day.microcycleDayId] = {
            saving: false,
            error: 'No hay sesión planificada para esta fecha en el calendario.'
          };
          this.cdr.markForCheck();
          return;
        }
        day.trainingSessionId = bundle.sessionId;
        this.saveDay(day, { trainingSessionId: bundle.sessionId });
      },
      error: () => {
        this.resolvingDayId = null;
        this.dayStates[day.microcycleDayId] = { saving: false, error: 'No se ha podido resolver la sesión del día.' };
        this.cdr.markForCheck();
      }
    });
  }

  unlinkSession(day: MicrocycleDay): void {
    day.trainingSessionId = null;
    this.saveDay(day, { trainingSessionId: null });
  }

  /** Etiqueta del botón de sesión vinculada según el tipo de día. */
  sessionLinkLabel(day: MicrocycleDay): string {
    return day.dayType === 'match' ? 'Partido' : 'Entrenamiento';
  }

  /**
   * Abre la sesión/partido vinculado del día en el calendario. Para días de
   * entrenamiento usa el `trainingSessionId` del día; para partidos usa el
   * `matchPreparationId` del microciclo.
   */
  openLinkedSession(mc: Microcycle, day: MicrocycleDay): void {
    if (!this.selectedTeamId) return;
    if (day.dayType === 'match') {
      if (!mc.matchPreparationId) return;
      this.router.navigate(['/dashboard/calendario', this.selectedTeamId, 0], {
        queryParams: {
          eventType: 'partido',
          eventId: mc.matchPreparationId,
          eventDate: (mc.matchDate || day.dayDate || '').substring(0, 10)
        }
      });
    } else {
      if (!day.trainingSessionId) return;
      this.router.navigate(['/dashboard/calendario', this.selectedTeamId, 0], {
        queryParams: {
          eventType: 'entrenamiento',
          eventId: day.trainingSessionId,
          eventDate: (day.dayDate || '').substring(0, 10)
        }
      });
    }
  }

  private saveDay(day: MicrocycleDay, payload: any): void {
    this.dayStates[day.microcycleDayId] = { saving: true };
    this.cdr.markForCheck();
    this.microcycleService.updateDay(day.microcycleDayId, payload).subscribe({
      next: () => {
        this.dayStates[day.microcycleDayId] = { saving: false, savedAt: Date.now() };
        this.cdr.markForCheck();
        // Limpiar el tick a los 2s
        setTimeout(() => {
          if (this.dayStates[day.microcycleDayId]?.savedAt) {
            this.dayStates[day.microcycleDayId] = { saving: false };
            this.cdr.markForCheck();
          }
        }, 2000);
      },
      error: (err) => {
        this.dayStates[day.microcycleDayId] = {
          saving: false,
          error: err?.error?.error?.msg || 'Error guardando cambios'
        };
        this.cdr.markForCheck();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Helpers / formato
  // ─────────────────────────────────────────────────────────────────
  goBack(): void { this.location.back(); }
  goPermisos(): void { this.router.navigate(['/dashboard/permisos-club']); }

  trackById(_: number, mc: Microcycle): number { return mc.microcycleId; }
  trackByDayId(_: number, d: MicrocycleDay): number { return d.microcycleDayId; }

  dayRowClass(d: MicrocycleDay): string {
    return `mc-day-row--${d.dayType}`;
  }

  /**
   * Clasifica el tipo de competición del microciclo en una de las tres
   * categorías con estilo propio ('liga' | 'torneo' | 'amistoso'), o null si
   * el microciclo no tiene partido/tipo asociado. Tolera mayúsculas/acentos.
   */
  matchTypeKind(mc: Microcycle): 'liga' | 'torneo' | 'amistoso' | null {
    const raw = (mc?.matchType || '').trim().toLowerCase();
    if (!raw) return null;
    if (raw.startsWith('liga')) return 'liga';
    if (raw.startsWith('amist')) return 'amistoso';
    // "torneo", "copa" y variantes se agrupan como copa/torneo.
    if (raw.startsWith('torneo') || raw.startsWith('copa')) return 'torneo';
    return null;
  }

  /** Etiqueta visible del badge de tipo de competición. */
  matchTypeLabel(mc: Microcycle): string {
    switch (this.matchTypeKind(mc)) {
      case 'liga': return 'Liga';
      case 'torneo': return 'Copa';
      case 'amistoso': return 'Amistoso';
      default: return '';
    }
  }

  /** Icono del badge según el tipo de competición. */
  matchTypeIcon(mc: Microcycle): string {
    switch (this.matchTypeKind(mc)) {
      case 'liga': return 'bi-trophy';
      case 'torneo': return 'bi-trophy-fill';
      case 'amistoso': return 'bi-people';
      default: return 'bi-flag';
    }
  }

  /**
   * Clasifica el terreno del partido en 'local' (en casa) o 'visitante'
   * (fuera), o null si no está definido. Tolera mayúsculas/acentos y variantes
   * en inglés ('home' / 'away').
   */
  matchVenueKind(mc: Microcycle): 'local' | 'visitante' | null {
    const raw = (mc?.matchVenue || '').trim().toLowerCase();
    if (!raw) return null;
    if (raw.startsWith('local') || raw.startsWith('casa') || raw.startsWith('home')) return 'local';
    if (raw.startsWith('visit') || raw.startsWith('fuera') || raw.startsWith('away')) return 'visitante';
    return null;
  }

  /** Etiqueta visible del badge de terreno. */
  matchVenueLabel(mc: Microcycle): string {
    switch (this.matchVenueKind(mc)) {
      case 'local': return 'Casa';
      case 'visitante': return 'Fuera';
      default: return '';
    }
  }

  /** Icono del badge según el terreno (casa / fuera). */
  matchVenueIcon(mc: Microcycle): string {
    switch (this.matchVenueKind(mc)) {
      case 'local': return 'bi-house-door-fill';
      case 'visitante': return 'bi-airplane-fill';
      default: return 'bi-geo-alt';
    }
  }

  /** El microciclo vigente: hoy cae dentro de su rango [startDate, endDate]. */
  isCurrentMicrocycle(mc: Microcycle): boolean {
    if (!mc?.startDate || !mc?.endDate) return false;
    const today = this.toIsoYmd(new Date());
    const start = mc.startDate.substring(0, 10);
    const end = mc.endDate.substring(0, 10);
    return start <= today && today <= end;
  }

  /** Microciclo pasado: su fecha de fin es anterior a hoy. */
  isPastMicrocycle(mc: Microcycle): boolean {
    if (!mc?.endDate) return false;
    const today = this.toIsoYmd(new Date());
    return mc.endDate.substring(0, 10) < today;
  }

  /**
   * Reordena para pintar: primero los microciclos actuales/futuros ordenados
   * por fecha (la más próxima arriba), y al final los pasados (más reciente
   * primero), que se muestran plegados y atenuados como "segundo plano".
   */
  private rebuildOrder(): void {
    const upcoming = this.microcycles.filter(mc => !this.isPastMicrocycle(mc))
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    const past = this.microcycles.filter(mc => this.isPastMicrocycle(mc))
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    this.orderedMicrocycles = upcoming.concat(past);
    this.firstPastIndex = past.length > 0 ? upcoming.length : -1;
  }

  /**
   * Recalcula las etiquetas MD por defecto según el modelo de periodización
   * (MD+1, MD+2… tras el partido anterior y MD-4…MD-1, MD acercándose al
   * siguiente). Sólo reemplaza valores vacíos o autogenerados con el esquema
   * antiguo ("MD-6", "MD-5"…); respeta cualquier edición manual del cuerpo
   * técnico. La columna 2 nace idéntica a la 1 si aún no tiene valor.
   */
  private normalizeMdLabels(mc: Microcycle): void {
    if (!mc.days) return;
    for (const d of mc.days) {
      const legacy = this.legacyMdLabel(d.dayDate, mc.matchDate);
      const expected = this.computeMdLabel(d.dayDate, mc.startDate, mc.matchDate);
      if (!d.mdLabel || d.mdLabel === legacy) {
        d.mdLabel = expected;
      }
      if (d.mdLabel2 == null || d.mdLabel2 === '' || d.mdLabel2 === legacy) {
        d.mdLabel2 = d.mdLabel;
      }
    }
  }

  /** Etiqueta MD del nuevo esquema (+N tras partido / -N hacia el siguiente). */
  private computeMdLabel(dayIso: string, startIso: string, matchIso: string): string {
    const toMatch = this.daysBetween(dayIso, matchIso);
    if (toMatch === 0) return 'MD';
    if (toMatch > 0 && toMatch <= 4) return `MD-${toMatch}`;
    if (toMatch > 4) return `MD+${this.daysBetween(startIso, dayIso) + 1}`;
    return `MD+${Math.abs(toMatch)}`;
  }

  /** Etiqueta MD del esquema antiguo (siempre MD-N hasta el partido). */
  private legacyMdLabel(dayIso: string, matchIso: string): string {
    const toMatch = this.daysBetween(dayIso, matchIso);
    if (toMatch === 0) return 'MD';
    if (toMatch > 0) return `MD-${toMatch}`;
    return `MD+${Math.abs(toMatch)}`;
  }

  /** Días enteros entre dos fechas ISO (toIso - fromIso). */
  private daysBetween(fromIso: string, toIso: string): number {
    const from = new Date(fromIso + 'T00:00:00').getTime();
    const to = new Date(toIso + 'T00:00:00').getTime();
    return Math.round((to - from) / 86400000);
  }

  get selectedTeamName(): string | null {
    if (!this.selectedTeamId) return null;
    const t = this.teams.find(x => x.teamId === this.selectedTeamId);
    return t ? t.name : null;
  }

  formatHumanDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  formatShortDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }

  formatWeekday(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long' });
  }

  private toIsoYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private currentTemporada(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }

  private emptyForm(): CreateForm {
    return { name: '', startDate: '', endDate: '', matchDate: '', restDay: '' };
  }
}
