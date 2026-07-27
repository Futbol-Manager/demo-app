import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { ClubModulesService, ClubModules } from 'src/app/core/services/club/club-modules.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import {
  MedicalAppointmentService,
  MedicalAppointment,
  AppointmentBundle,
  AppointmentKind,
  AppointmentUpsert
} from 'src/app/core/services/medical-appointment/medical-appointment.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { Injury, RTP_PHASES } from 'src/app/core/services/injury/injury.model';
import {
  MicrocycleService,
  MicrocycleDay
} from 'src/app/core/services/microcycle/microcycle.service';
import { environment } from 'src/environments/environment';

interface KindOption {
  code: AppointmentKind;
  label: string;
  color: string;
}

// Categorías de citas con paleta Sphaira + colores semánticos
// diferenciables a simple vista en el calendario. Cada categoría además
// tiene un icono Bootstrap para que el fisio pueda distinguir el tipo de
// cita aún en celdas con varios dots y reforzando el daltonismo.
//
// KIND_OPTIONS son las que se ofrecen al crear una cita y forman la
// leyenda del calendario. El orden es el solicitado por negocio.
const KIND_OPTIONS: (KindOption & { icon: string })[] = [
  { code: 'PHYSIO',             label: 'Fisioterapia',          color: '#31b270', icon: 'bi-bandaid-fill' },
  { code: 'READAPTATION',       label: 'Readaptación',          color: '#0891b2', icon: 'bi-arrow-repeat' },
  { code: 'MEDICAL',            label: 'Medicina',              color: '#b1231b', icon: 'bi-clipboard2-pulse-fill' },
  { code: 'NURSING',            label: 'Enfermería',            color: '#d6336c', icon: 'bi-capsule' },
  { code: 'COMPLEMENTARY_TEST', label: 'Prueba complementaria', color: '#6f42c1', icon: 'bi-clipboard2-data' },
  { code: 'NUTRITION',          label: 'Nutrición',             color: '#b07b00', icon: 'bi-egg-fried' },
  { code: 'PODIATRY',           label: 'Podología',             color: '#0f766e', icon: 'fa-solid fa-shoe-prints' },
  { code: 'INCIDENT',           label: 'Incidencia',            color: '#ea580c', icon: 'bi-exclamation-triangle-fill' }
];

// Tipos heredados de citas antiguas. Ya no se ofrecen al crear, pero se
// conservan para que las citas existentes sigan mostrando su etiqueta,
// color e icono correctos.
const KIND_LEGACY: (KindOption & { icon: string })[] = [
  { code: 'RECOVERY',   label: 'Recuperación', color: '#475569', icon: 'bi-droplet-fill' },
  { code: 'EVALUATION', label: 'Evaluación',   color: '#002c40', icon: 'bi-clipboard-check-fill' },
  { code: 'OTHER',      label: 'Otro',         color: '#636363', icon: 'bi-three-dots' }
];

// Lookup completo (visibles + heredadas) para resolver label/color/icono.
const KIND_ALL: (KindOption & { icon: string })[] = [...KIND_OPTIONS, ...KIND_LEGACY];

/**
 * Información de lesión proyectada sobre un día concreto del calendario.
 *
 * <p>Se calcula a partir de las lesiones del equipo cruzando las fechas
 * de baja (`dateInjury` → `dateActualReturn` || `dateReturnEnd` ||
 * `dateReturn`) con cada día visible. Permite pintar la franja superior
 * del color de la fase RTP en la que se encuentra el jugador y el borde
 * rojo del día.</p>
 */
interface DayInjuryInfo {
  /** ID de la lesión que cubre este día. */
  injuryId: number;
  /** ID del jugador lesionado (para filtrar y resaltar). */
  playerId: number;
  /** Nombre legible del jugador (tooltip). */
  playerName: string;
  /** Color hex de la fase RTP en la que está la lesión este día (banda superior). */
  phaseColor: string;
  /** Etiqueta de la fase RTP en la que está la lesión este día (tooltip). */
  phaseLabel: string;
  /** Abreviatura de la fase RTP de ese día (CCI, RF, RTT, RTP, RTC) para la franja. */
  phaseShort: string;
  /** Zona / tipo legible para el tooltip. */
  description: string;
}

interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  appointments: MedicalAppointment[];
  /**
   * Lesiones activas en este día. Puede haber varias (más de un jugador
   * lesionado el mismo día); la UI dibuja una franja por cada una en la
   * parte superior de la celda.
   */
  injuries: DayInjuryInfo[];
  /** Sesión planificada del día (entreno/partido) desde Microciclos. */
  session?: MicrocycleDay | null;
}

interface PlayerOpt {
  playerId: number;
  fullName: string;
  /** Nombre de archivo de la foto de perfil (se concatena con la base de
   *  imágenes de usuario). Vacío si el jugador no tiene foto. */
  picturePlayer?: string;
}

interface DraftAppointment {
  appointmentId: number | null;
  playerId: number | null;
  professionalUserId: number | null;
  professionalName: string;
  appointmentDate: string;
  startTime: string;
  durationMin: number;
  kind: AppointmentKind;
  location: string;
  subject: string;
  notes: string;
}

/**
 * Agenda médica del Modo Profesional (Fase 2.4).
 *
 * <p>Pantalla dedicada para que el staff profesional (fisio, nutricionista,
 * médico, club admin y staff con permisos) gestione las citas del equipo en
 * dos vistas complementarias:</p>
 *
 * <ul>
 *   <li><strong>Mensual</strong>: calendario con dots por categoría.</li>
 *   <li><strong>Lista</strong>: próximas citas SCHEDULED (cronológicas).</li>
 * </ul>
 *
 * <p>Hard-gate por {@code professionalModeEnabled}; el coach (perfil 2)
 * accede en modo solo-lectura para que pueda ver la planificación sin
 * editarla.</p>
 *
 * Rutas:
 * <ul>
 *   <li>{@code /dashboard/agenda-medica/:teamId}</li>
 *   <li>{@code /dashboard/agenda-medica/:teamId?month=YYYY-MM}</li>
 * </ul>
 */
@Component({
  selector: 'app-agenda-medica',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agenda-page">
      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="page-title">
            <i class="bi bi-calendar2-event me-2"></i>Agenda médica
          </h2>
          <p class="page-subtitle" *ngIf="teamName">{{ teamName }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Master toggle OFF -->
        <div class="empty-state empty-state--master" *ngIf="disabledByMaster">
          <i class="bi bi-shield-lock"></i>
          <h3>Modo Profesional desactivado</h3>
          <p>El club tiene desactivado el Modo Profesional. Actívalo en Permisos del club para usar la Agenda médica.</p>
          <button class="btn btn-primary" (click)="goPermisos()">Ir a Permisos</button>
        </div>

        <!-- Loading -->
        <div class="loading-state" *ngIf="loading && !disabledByMaster">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando…</span>
          </div>
          <p class="text-muted mt-2">Cargando agenda…</p>
        </div>

        <!-- Error -->
        <div class="alert alert-warning" *ngIf="errorMessage && !loading && !disabledByMaster">
          {{ errorMessage }}
        </div>

        <ng-container *ngIf="!loading && !disabledByMaster">

          <!-- Toolbar -->
          <div class="filters-bar">
            <div class="view-toggle">
              <button class="view-btn" [class.active]="view === 'month'" (click)="setView('month')">
                <i class="bi bi-calendar3"></i> Calendario
              </button>
              <button class="view-btn" [class.active]="view === 'list'" (click)="setView('list')">
                <i class="bi bi-list-ul"></i> Lista
              </button>
            </div>

            <div class="filter-group" *ngIf="view === 'month'">
              <button class="date-nav" (click)="changeMonth(-1)" title="Mes anterior">
                <i class="bi bi-chevron-left"></i>
              </button>
              <span class="month-label">{{ formatMonthLabel(selectedMonth) }}</span>
              <button class="date-nav" (click)="changeMonth(1)" title="Mes siguiente">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary ms-2" (click)="goCurrentMonth()" title="Mes actual">
                Hoy
              </button>
            </div>

            <!-- Filtro de jugador: 'Todos' (vista general del equipo) o un jugador concreto.
                 Filtra a la vez citas y marcas de baja del calendario. -->
            <div class="filter-group filter-group--player" *ngIf="players.length > 0">
              <i class="bi bi-person-circle filter-icon" aria-hidden="true"></i>
              <select class="player-select"
                      [ngModel]="selectedPlayerId == null ? 'all' : selectedPlayerId"
                      (ngModelChange)="onPlayerFilterChange($event)"
                      [attr.aria-label]="'Filtrar agenda por jugador'">
                <option [ngValue]="'all'">Todos los jugadores</option>
                <option *ngFor="let p of players" [ngValue]="p.playerId">{{ p.fullName }}</option>
              </select>
            </div>
            <!-- Avatar del jugador seleccionado, fuera del recuadro y a su
                 derecha. Va dentro de un "hueco" de poca altura para que la
                 foto sobresalga sin agrandar la barra ni empujar el contenido
                 de la izquierda. -->
            <span class="avatar-slot" *ngIf="players.length > 0 && selectedPlayerId != null">
              <span class="player-avatar" [title]="playerName(selectedPlayerId)">
                <img *ngIf="playerPhotoUrl(selectedPlayerId)"
                     [src]="playerPhotoUrl(selectedPlayerId)"
                     [alt]="playerName(selectedPlayerId)" />
                <i *ngIf="!playerPhotoUrl(selectedPlayerId)" class="bi bi-person-circle"></i>
              </span>
            </span>

            <button *ngIf="!readOnly" class="btn btn-primary btn-create" (click)="openCreate()">
              <i class="bi bi-plus-lg"></i> Nueva cita
            </button>
          </div>

          <!-- Banner informativo cuando la vista está filtrada por jugador.
               Aporta contexto y un botón rápido para volver a la vista general. -->
          <div class="player-filter-banner" *ngIf="selectedPlayerId != null">
            <i class="bi bi-funnel-fill"></i>
            <span>Viendo solo la agenda de <strong>{{ playerName(selectedPlayerId) }}</strong>.</span>
            <button class="btn btn-link btn-sm" (click)="onPlayerFilterChange('all')">
              <i class="bi bi-x-circle"></i> Ver todo el equipo
            </button>
          </div>

          <div class="readonly-banner" *ngIf="readOnly">
            <i class="bi bi-eye"></i>
            <span>Modo solo-lectura. Tu rol no puede crear ni editar citas.</span>
          </div>

          <!-- VISTA MENSUAL -->
          <div class="month-view" *ngIf="view === 'month'">
            <div class="kpis">
              <div class="kpi"><span class="kpi-num">{{ monthStats.scheduled }}</span><span class="kpi-lbl">Citas programadas</span></div>
              <div class="kpi"><span class="kpi-num">{{ monthStats.completed }}</span><span class="kpi-lbl">Completadas</span></div>
              <div class="kpi"><span class="kpi-num">{{ monthStats.cancelled }}</span><span class="kpi-lbl">Canceladas</span></div>
            </div>

            <!-- Leyenda: tipo de cita + icono + color, para que el fisio
                 pueda interpretar los dots del calendario sin pasar el ratón. -->
            <div class="kind-legend" role="list">
              <span class="kind-legend__item" *ngFor="let k of kindOptions" role="listitem">
                <span class="kind-legend__dot" [style.background]="k.color">
                  <i [ngClass]="iconClass(k.icon)"></i>
                </span>
                {{ k.label }}
              </span>
            </div>

            <div class="calendar-grid">
              <div class="cal-head">L</div>
              <div class="cal-head">M</div>
              <div class="cal-head">X</div>
              <div class="cal-head">J</div>
              <div class="cal-head">V</div>
              <div class="cal-head">S</div>
              <div class="cal-head">D</div>

              <div class="cal-cell" *ngFor="let d of calendarDays; trackBy: trackByDay"
                   [class.cal-cell--off]="!d.inMonth"
                   [class.cal-cell--today]="d.isToday"
                   [class.cal-cell--selected]="d.iso === selectedDayIso && d.inMonth"
                   [class.cal-cell--injured]="d.inMonth && d.injuries.length > 0"
                   [attr.title]="injuryTooltipForDay(d)"
                   (click)="onCalendarDayClick(d)">
                <!-- Franja superior con el color de la fase RTP. Si hay varios
                     jugadores lesionados el mismo día, se dibuja una sub-franja
                     por cada uno (apiladas horizontalmente) para que el fisio
                     vea de un vistazo el reparto. -->
                <div class="cal-rtp-stripe" *ngIf="d.inMonth && d.injuries.length > 0"
                     [class.cal-rtp-stripe--multi]="d.injuries.length > 1">
                  <span class="cal-rtp-segment"
                        *ngFor="let inj of d.injuries"
                        [style.background]="inj.phaseColor"
                        [style.flex]="'1 1 0'"
                        [title]="inj.phaseLabel">
                    <span class="cal-rtp-text">{{ inj.phaseShort }}</span>
                  </span>
                </div>
                <div class="cal-day">{{ d.day }}</div>
                <!-- Marca de sesión (entreno/partido) desde Microciclos -->
                <div class="cal-session cal-session--{{ sessionKindOf(d.session) }}"
                     *ngIf="d.inMonth && d.session && sessionKindOf(d.session) !== 'none'"
                     [title]="sessionLabelOf(d.session)">
                  <span class="cal-session-ball" *ngIf="sessionKindOf(d.session) === 'match'">⚽</span>
                  <i class="fa-solid fa-dumbbell ico-dumbbell" *ngIf="sessionKindOf(d.session) === 'training'" aria-hidden="true"></i>
                  <i class="bi bi-moon-stars" *ngIf="sessionKindOf(d.session) === 'rest'"></i>
                </div>
                <div class="cal-dots" *ngIf="d.appointments.length > 0"
                     [class.cal-dots--expanded]="d.iso === selectedDayIso && d.inMonth">
                  <span class="cal-chip"
                        *ngFor="let a of ((d.iso === selectedDayIso && d.inMonth) ? d.appointments : (d.appointments | slice:0:3))"
                        [class.cal-chip--cancelled]="a.status === 'CANCELLED'"
                        [title]="displayTime(a) + ' · ' + kindLabel(a.kind) + (a.subject ? ' · ' + a.subject : '')">
                    {{ kindLabel(a.kind) }}<ng-container *ngIf="d.iso === selectedDayIso && d.inMonth && a.subject"> · {{ a.subject }}</ng-container>
                  </span>
                  <span class="cal-more" *ngIf="d.appointments.length > 3 && !(d.iso === selectedDayIso && d.inMonth)"
                        [title]="(d.appointments.length - 3) + ' citas más este día'">
                    +{{ d.appointments.length - 3 }}
                  </span>
                </div>
              </div>
            </div>

            <div class="day-detail" *ngIf="selectedDayIso">
              <div class="day-detail-header">
                <h5>{{ formatHumanDate(selectedDayIso) }}</h5>
                <button *ngIf="!readOnly"
                        class="btn btn-primary btn-sm day-detail-create"
                        (click)="openCreateOnSelectedDay()"
                        title="Crear cita en este día">
                  <i class="bi bi-plus-lg"></i> Nueva cita
                </button>
              </div>

              <!-- Sesión planificada del día (entreno/partido) desde Microciclos -->
              <div class="day-session day-session--{{ sessionKindOf(selectedDaySession) }}"
                   *ngIf="selectedDaySession && sessionKindOf(selectedDaySession) !== 'none'">
                <span class="day-session-ball" *ngIf="sessionKindOf(selectedDaySession) === 'match'">⚽</span>
                <i class="fa-solid fa-dumbbell ico-dumbbell ico-dumbbell--lg" *ngIf="sessionKindOf(selectedDaySession) === 'training'" aria-hidden="true"></i>
                <i class="bi bi-moon-stars" *ngIf="sessionKindOf(selectedDaySession) === 'rest'"></i>
                <span class="day-session-label">{{ sessionLabelOf(selectedDaySession) }}</span>
                <span class="day-session-notes" *ngIf="selectedDaySession?.notes">· {{ selectedDaySession?.notes }}</span>
                <button class="btn btn-link btn-sm day-session-link" (click)="goToMicrocycles()"
                        title="Gestionar sesiones en Microciclos">
                  <i class="bi bi-calendar2-week"></i> Microciclos
                </button>
              </div>
              <div class="day-session day-session--none" *ngIf="!selectedDaySession && !readOnly">
                <i class="bi bi-calendar-x"></i>
                <span class="day-session-label">Sin sesión planificada</span>
                <button class="btn btn-link btn-sm day-session-link" (click)="goToMicrocycles()"
                        title="Crear sesiones en Microciclos">
                  <i class="bi bi-plus-lg"></i> Crear sesión
                </button>
              </div>

              <!-- Lesiones activas del día seleccionado.
                   Sección separada para que las citas no se mezclen con
                   bajas (que son rangos de varios días, no eventos). -->
              <div class="day-injuries" *ngIf="selectedDayInjuries.length > 0">
                <div class="day-injuries-title">
                  <i class="bi bi-bandaid-fill"></i>
                  <span>Jugadores lesionados ({{ selectedDayInjuries.length }})</span>
                </div>
                <div class="day-injury-row" *ngFor="let inj of selectedDayInjuries">
                  <span class="day-injury-stripe" [style.background]="inj.phaseColor"></span>
                  <span class="day-injury-name">{{ inj.playerName }}</span>
                  <span class="day-injury-phase" [style.color]="inj.phaseColor">{{ inj.phaseLabel }}</span>
                  <span class="day-injury-desc" *ngIf="inj.description">{{ inj.description }}</span>
                </div>
              </div>

              <div *ngIf="selectedDayAppointments.length === 0" class="day-detail-empty">
                <i class="bi bi-calendar2-week"></i>
                <span>No hay citas para este día.</span>
              </div>

              <div class="appt-row" *ngFor="let a of selectedDayAppointments"
                   [class.appt-row--cancelled]="a.status === 'CANCELLED'"
                   [class.appt-row--completed]="a.status === 'COMPLETED'">
                <span class="appt-dot" [style.background]="kindColor(a.kind)" [title]="kindLabel(a.kind)">
                  <i [ngClass]="iconClass(kindIcon(a.kind))"></i>
                </span>
                <span class="appt-time">{{ displayTime(a) }}</span>
                <span class="appt-kind" [style.color]="kindColor(a.kind)">{{ kindLabel(a.kind) }}</span>
                <span class="appt-subject">
                  {{ a.subject || '—' }}
                  <small class="text-muted" *ngIf="a.playerId">· {{ playerName(a.playerId) }}</small>
                </span>
                <span class="appt-status appt-status--{{ a.status.toLowerCase() }}">{{ statusLabel(a.status) }}</span>
                <span class="appt-confirm appt-confirm--{{ playerConfirmationCss(a) }}"
                      *ngIf="a.playerId && a.status === 'SCHEDULED'"
                      [title]="playerConfirmationTitle(a)">
                  <i class="bi" [class]="'bi ' + playerConfirmationIcon(a)"></i>
                  {{ playerConfirmationLabel(a) }}
                </span>
                <div class="appt-actions" *ngIf="!readOnly">
                  <button class="icon-btn" (click)="openEdit(a)" title="Editar">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="icon-btn" *ngIf="a.status === 'SCHEDULED'" (click)="markComplete(a)" title="Marcar completada">
                    <i class="bi bi-check2-circle"></i>
                  </button>
                  <button class="icon-btn icon-btn--danger" *ngIf="a.status === 'SCHEDULED'" (click)="cancelAppointment(a)" title="Cancelar">
                    <i class="bi bi-x-circle"></i>
                  </button>
                  <button class="icon-btn icon-btn--danger" (click)="deleteAppointment(a)" title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div class="appt-row-notes" *ngIf="a.notes">{{ a.notes }}</div>
              </div>
            </div>
          </div>

          <!-- VISTA LISTA -->
          <div class="list-view" *ngIf="view === 'list'">
            <div class="empty-state" *ngIf="filteredUpcomingAppointments.length === 0">
              <i class="bi bi-calendar2-x"></i>
              <h3>Sin próximas citas</h3>
              <p *ngIf="selectedPlayerId == null">No hay citas programadas a partir de hoy.</p>
              <p *ngIf="selectedPlayerId != null">
                {{ playerName(selectedPlayerId) }} no tiene citas programadas a partir de hoy.
              </p>
              <button *ngIf="!readOnly" class="btn btn-primary" (click)="openCreate()">
                <i class="bi bi-plus-lg"></i> Crear cita
              </button>
            </div>

            <div class="upcoming-list" *ngIf="filteredUpcomingAppointments.length > 0">
              <div class="appt-card" *ngFor="let a of filteredUpcomingAppointments">
                <div class="appt-card-left" [style.background]="kindColor(a.kind)">
                  <i class="appt-card-left__icon" [ngClass]="iconClass(kindIcon(a.kind))"></i>
                  <div class="appt-day">{{ getDayPart(a.appointmentDate) }}</div>
                  <div class="appt-month">{{ getMonthShort(a.appointmentDate) }}</div>
                </div>
                <div class="appt-card-body">
                  <div class="appt-time-row">
                    <i class="bi bi-clock"></i>
                    {{ displayTime(a) }}<ng-container *ngIf="!isAllDay(a)"> · {{ a.durationMin }}'</ng-container>
                    <span class="appt-kind-tag" [style.background]="kindColor(a.kind) + '22'" [style.color]="kindColor(a.kind)">
                      <i [ngClass]="iconClass(kindIcon(a.kind))"></i>
                      {{ kindLabel(a.kind) }}
                    </span>
                  </div>
                  <h6 class="appt-subject-h">{{ a.subject || kindLabel(a.kind) }}</h6>
                  <div class="appt-meta">
                    <span *ngIf="a.playerId"><i class="bi bi-person"></i> {{ playerName(a.playerId) }}</span>
                    <span *ngIf="a.location"><i class="bi bi-geo-alt"></i> {{ a.location }}</span>
                    <span *ngIf="a.professionalName"><i class="bi bi-person-badge"></i> {{ a.professionalName }}</span>
                    <span class="appt-confirm appt-confirm--{{ playerConfirmationCss(a) }}"
                          *ngIf="a.playerId && a.status === 'SCHEDULED'"
                          [title]="playerConfirmationTitle(a)">
                      <i class="bi" [class]="'bi ' + playerConfirmationIcon(a)"></i>
                      {{ playerConfirmationLabel(a) }}
                    </span>
                  </div>
                  <p class="appt-notes" *ngIf="a.notes">{{ a.notes }}</p>
                </div>
                <div class="appt-card-actions" *ngIf="!readOnly">
                  <button class="icon-btn" (click)="openEdit(a)"><i class="bi bi-pencil"></i></button>
                  <button class="icon-btn" (click)="markComplete(a)" title="Completada"><i class="bi bi-check2-circle"></i></button>
                  <button class="icon-btn icon-btn--danger" (click)="cancelAppointment(a)" title="Cancelar"><i class="bi bi-x-circle"></i></button>
                </div>
              </div>
            </div>
          </div>

        </ng-container>
      </div>

      <!-- MODAL EDITOR -->
      <div class="modal-backdrop" *ngIf="showEditor" (click)="closeEditor()"></div>
      <div class="editor-modal" *ngIf="showEditor">
        <div class="editor-head">
          <h5>{{ draft.appointmentId ? 'Editar cita' : 'Nueva cita' }}</h5>
          <button class="icon-btn" (click)="closeEditor()"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="editor-body">
          <div class="form-row">
            <label>Tipo</label>
            <select class="form-select" [(ngModel)]="draft.kind">
              <option *ngFor="let k of kinds" [value]="k.code">{{ k.label }}</option>
            </select>
          </div>
          <div class="form-row form-row--inline">
            <div class="flex-grow-1">
              <label>Fecha</label>
              <input type="date" class="form-control" [(ngModel)]="draft.appointmentDate" />
            </div>
            <div>
              <label>Hora</label>
              <input type="time" class="form-control" [(ngModel)]="draft.startTime" />
            </div>
            <div>
              <label>Duración (min)</label>
              <input type="number" min="5" max="240" step="5" class="form-control" [(ngModel)]="draft.durationMin" />
            </div>
          </div>
          <div class="form-row">
            <label>Jugador</label>
            <select class="form-select" [(ngModel)]="draft.playerId">
              <option [ngValue]="null">— Sin jugador —</option>
              <option *ngFor="let p of players" [ngValue]="p.playerId">{{ p.fullName }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>Asunto</label>
            <input type="text" class="form-control" [(ngModel)]="draft.subject" placeholder="Revisión, sesión, etc." />
          </div>
          <div class="form-row">
            <label>Ubicación</label>
            <input type="text" class="form-control" [(ngModel)]="draft.location" placeholder="Sala 2, consulta…" />
          </div>
          <div class="form-row">
            <label>Notas</label>
            <textarea class="form-control" rows="3" [(ngModel)]="draft.notes"></textarea>
          </div>
        </div>
        <div class="editor-foot">
          <button class="btn btn-light" (click)="closeEditor()">Cancelar</button>
          <button class="btn btn-primary" (click)="saveDraft()" [disabled]="!canSave()">
            <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
            {{ draft.appointmentId ? 'Guardar cambios' : 'Crear cita' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ─────────────────────────────────────────────────────────────
       Estilos oficiales Sphaira Tech
       Navy   #002c40   primario oscuro
       Green  #31b270   primario
       GLight #c4e8d6   acento (notificaciones, hover)
       Gray   #636363   texto cuerpo
       BG     #f4f4f4   fondos destacados
       ───────────────────────────────────────────────────────────── */

    .agenda-page {
      font-family: 'Plus Jakarta Sans', 'Archivo', sans-serif;
      padding-bottom: 32px;
      color: #002c40;
    }

    /* Header */
    .page-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 24px; border-bottom: 1px solid #e9ecef; background: #fff;
    }
    .back-container { width: 110px; }
    .page-header-spacer { width: 110px; }
    .header-center { flex: 1; text-align: center; }
    .page-title {
      font-size: 1.25rem; margin: 0; font-weight: 700; color: #002c40;
      display: inline-flex; align-items: center; gap: 8px; justify-content: center;
    }
    .page-subtitle { color: #636363; font-size: 0.9rem; margin: 4px 0 0; }
    .badge-pro {
      display: inline-flex; align-items: center;
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%);
      color: #fff; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px;
      padding: 3px 10px; border-radius: 999px;
    }
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

    /* Empty / loading */
    .empty-state { text-align: center; padding: 48px 16px; color: #636363; background: #fff; border-radius: 12px; }
    .empty-state i { font-size: 3rem; color: #c4e8d6; }
    .empty-state h3 { margin-top: 12px; color: #002c40; font-weight: 700; }
    .empty-state--master { background: #fff; border: 1px dashed #c4e8d6; }
    .loading-state { text-align: center; padding: 48px 16px; color: #636363; }
    .loading-state .spinner-border { color: #31b270 !important; }

    /* Toolbar */
    .filters-bar {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 16px 0 0;
    }
    .view-toggle {
      display: inline-flex; border: 1px solid #c4e8d6; border-radius: 10px; overflow: hidden;
      background: #fff;
    }
    .view-btn {
      background: #fff; border: 0; padding: 8px 16px;
      font-size: 0.9rem; font-weight: 600; color: #002c40;
      display: inline-flex; align-items: center; gap: 6px;
      cursor: pointer; transition: background 120ms ease, color 120ms ease;
    }
    .view-btn:hover { background: rgba(49, 178, 112, 0.08); }
    .view-btn.active {
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%);
      color: #fff;
    }
    .filter-group { display: inline-flex; align-items: center; gap: 8px; }
    .date-nav {
      background: #fff; border: 1px solid #c4e8d6; color: #002c40;
      width: 34px; height: 34px; border-radius: 8px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: all 120ms ease;
    }
    .date-nav:hover { background: #c4e8d6; color: #002c40; }
    .month-label {
      font-weight: 700; min-width: 160px; text-align: center;
      text-transform: capitalize; color: #002c40;
    }
    /* El botón se mantiene SIEMPRE por encima del avatar (z-index: 2) y
       sobresale del hueco: así la foto del jugador nunca tapa "Nueva cita". */
    .btn-create { margin-left: auto; position: relative; z-index: 3; }

    /* Botón primario Sphaira */
    .btn-primary, .btn.btn-primary {
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%);
      border: 0; color: #fff; font-weight: 600;
      padding: 8px 16px; border-radius: 10px;
      transition: filter 120ms ease, transform 120ms ease;
    }
    .btn-primary:hover, .btn.btn-primary:hover {
      filter: brightness(1.05); transform: translateY(-1px);
    }
    .btn-primary:disabled { filter: grayscale(0.4); cursor: not-allowed; }
    .btn-light, .btn.btn-light {
      background: #f4f4f4; color: #002c40; border: 1px solid #e5e7eb;
      font-weight: 600; padding: 8px 16px; border-radius: 10px;
    }
    .btn-light:hover, .btn.btn-light:hover { background: #e9ecef; }
    .btn-outline-primary, .btn.btn-outline-primary {
      background: transparent; color: #31b270; border: 1px solid #31b270;
      font-weight: 600; padding: 4px 12px; border-radius: 8px;
    }
    .btn-outline-primary:hover { background: #c4e8d6; color: #002c40; }

    .readonly-banner {
      background: #c4e8d6; color: #002c40; border: 1px solid #31b270;
      padding: 10px 14px; border-radius: 10px;
      display: inline-flex; gap: 8px; align-items: center;
      font-size: 0.875rem; font-weight: 600; margin-bottom: 12px;
    }

    /* KPIs */
    .kpis { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .kpi {
      background: #fff; border: 1px solid #e9ecef; border-radius: 12px;
      padding: 12px 18px; min-width: 100px; text-align: center;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04);
    }
    .kpi-num { display: block; font-weight: 800; font-size: 1.5rem; color: #31b270; line-height: 1; }
    .kpi-lbl {
      display: block; font-size: 0.7rem; font-weight: 700;
      color: #636363; text-transform: uppercase; letter-spacing: 0.4px;
      margin-top: 4px;
    }

    /* Calendario */
    .calendar-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
      background: #f4f4f4; padding: 6px; border-radius: 12px;
    }
    .cal-head {
      text-align: center; font-weight: 700; font-size: 0.8rem;
      color: #002c40; padding: 6px; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .cal-cell {
      background: #fff; min-height: 92px; padding: 6px; border-radius: 8px;
      cursor: pointer; transition: all 120ms ease; border: 1px solid transparent;
    }
    .cal-cell:hover { background: #c4e8d6; border-color: #31b270; }
    .cal-cell--off { background: #f4f4f4; opacity: 0.55; cursor: default; }
    .cal-cell--off:hover { background: #f4f4f4; border-color: transparent; }
    .cal-cell--today {
      outline: 2px solid #31b270; outline-offset: -2px;
      background: linear-gradient(180deg, rgba(196, 232, 214, 0.4), #fff);
    }
    .cal-cell--selected {
      background: linear-gradient(180deg, #c4e8d6, #ffffff);
      border-color: #31b270;
      box-shadow: 0 4px 14px rgba(49, 178, 112, 0.35);
      /* Al seleccionar, el día se agranda para mostrar todo lo agendado. */
      min-height: 200px;
      transform: scale(1.04);
      z-index: 3;
    }
    .cal-cell--selected.cal-cell--today { outline-color: #002c40; }
    /* Lista completa de citas del día seleccionado (con scroll si hay muchas). */
    .cal-dots--expanded { max-height: 150px; overflow-y: auto; }
    .cal-dots--expanded .cal-chip { white-space: normal; }
    .cal-day { font-weight: 700; font-size: 0.85rem; color: #002c40; }

    /* ── Marca de sesión (entreno/partido) en la celda ───────────────
       Esquina superior derecha, no choca con el número (sup. izq.) ni
       con el badge de lesión (inf. der.). */
    .cal-session {
      position: absolute; top: 6px; right: 5px;
      width: 24px; height: 24px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.82rem; color: #fff; z-index: 2;
      border: 1.5px solid rgba(255,255,255,0.7);
      box-shadow: 0 2px 6px rgba(0,44,64,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
    }
    .cal-session--match    { background: none; border: none; box-shadow: none; }
    .cal-session--training { background: none; border: none; box-shadow: none; }
    .cal-session--rest     { background: linear-gradient(135deg, #a9b6c2, #7e8b98); }
    .cal-session-ball { font-size: 1.05rem; line-height: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2)); }
    .day-session-ball { font-size: 1rem; line-height: 1; }
    .ico-dumbbell { color: #2563eb; font-size: 0.9rem; line-height: 1; }
    .ico-dumbbell--lg { font-size: 1.05rem; }

    /* ── Sesión del día en el panel de detalle ─────────────────────── */
    .day-session {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 8px 12px; border-radius: 8px; margin-bottom: 10px;
      font-weight: 600; font-size: 0.9rem; border: 1px solid transparent;
    }
    .day-session--match    { background: #fdecec; color: #b1231b; border-color: #f5c2c0; }
    .day-session--training { background: #e8f6ec; color: #1d8a3a; border-color: #bce5c8; }
    .day-session--rest     { background: #eef0f3; color: #495057; border-color: #dde1e6; }
    .day-session--none     { background: #f8f9fa; color: #8a929b; border-color: #e3e6ea; }
    .day-session-notes { font-weight: 400; opacity: 0.85; }
    .day-session-link {
      margin-left: auto; padding: 2px 6px; font-weight: 600; text-decoration: none;
      display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
    }

    /* ── Lesiones en el calendario ─────────────────────────────────
       Cuando un día cae dentro del rango de baja de algún jugador:
         * borde rojo fuerte (con tinte interior suave) para que se
           distinga a primera vista.
         * franja superior horizontal con el color de la fase RTP en
           la que está la lesión (rojo → verde según RTP_PHASES).
         * badge "bandaid" en la esquina inferior derecha con el
           recuento de jugadores lesionados ese día.
       Las celdas seleccionada/today mantienen su estado encima. */
    .cal-cell--injured {
      /* Sin borde rojo: la franja superior de color de la fase RTP ya indica
         la lesión y la fase. Solo mantenemos la posición relativa. */
      position: relative;
    }
    .cal-cell--injured:hover {
      background: #f6fbf8;
    }
    .cal-cell--injured.cal-cell--today {
      /* Si además es hoy, mantenemos el outline verde de "hoy". */
      outline: 2px solid #31b270;
      outline-offset: -4px;
    }
    /* Franja superior que ocupa todo el ancho de la celda y muestra el
       color de la fase RTP (1 segmento = 1 jugador lesionado). */
    .cal-rtp-stripe {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 20px;
      display: flex;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
      overflow: hidden;
    }
    .cal-rtp-segment {
      height: 100%;
      min-width: 4px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    /* Abreviatura de la fase (CCI, RF, RTT, RTP, RTC) dentro de la franja. */
    .cal-rtp-text {
      color: #fff; font-size: 0.66rem; font-weight: 800;
      letter-spacing: 0.3px; line-height: 1;
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.28);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      padding: 0 2px;
    }
    /* Pequeño separador blanco entre segmentos para que se distingan
       cuando hay varios jugadores lesionados el mismo día. */
    .cal-rtp-stripe--multi .cal-rtp-segment + .cal-rtp-segment {
      box-shadow: inset 1px 0 0 #fff;
    }
    /* La franja ahora es más alta: empujamos el contenido de la celda para
       que el número del día no quede debajo de ella. */
    .cal-cell { position: relative; padding-top: 10px; }
    .cal-cell--injured { padding-top: 24px; }
    /* En días con lesión la franja ocupa la parte superior: bajamos la marca
       de sesión para que no se solape con ella. */
    .cal-cell--injured .cal-session { top: 24px; }
    /* Badge "tirita" para reforzar visualmente la información de lesión.
       Se coloca en la esquina inferior derecha para no chocar con los
       dots de citas. */
    .cal-injury-badge {
      position: absolute;
      bottom: 4px; right: 4px;
      background: #b91c1c;
      color: #fff;
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 0.65rem;
      font-weight: 700;
      display: inline-flex; align-items: center; gap: 3px;
      box-shadow: 0 1px 3px rgba(185, 28, 28, 0.4);
      pointer-events: none;
    }
    .cal-injury-badge i { font-size: 0.7rem; }

    /* ── Filtro de jugador ─────────────────────────────────────────
       Select compacto integrado en la toolbar con icono persona. */
    .filter-group--player {
      background: #fff;
      border: 1px solid #c4e8d6;
      border-radius: 10px;
      padding: 4px 8px 4px 10px;
      gap: 6px;
    }
    .filter-icon {
      color: #31b270;
      font-size: 1rem;
    }
    .player-select {
      border: 0;
      background: transparent;
      color: #002c40;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 4px 22px 4px 0;
      outline: none;
      cursor: pointer;
      min-width: 180px;
    }
    .player-select:focus { outline: 2px solid #31b270; outline-offset: 2px; border-radius: 4px; }

    /* Avatar del jugador seleccionado, fuera del recuadro y a su derecha.
       Tamaño grande para que la foto del jugador se vea con claridad. */
    /* Hueco de poca altura: ocupa el ancho de la foto pero solo la altura de
       la barra, de modo que la foto (absoluta dentro) sobresale hacia abajo
       sin empujar el banner ni el resto del contenido. */
    .avatar-slot {
      position: relative; flex-shrink: 0;
      width: 128px; height: 40px; align-self: center;
    }
    .player-avatar {
      position: absolute; top: -2px; left: 0; z-index: 2;
      width: 128px; height: 128px; border-radius: 50%;
      overflow: hidden;
      display: inline-flex; align-items: center; justify-content: center;
      background: #c4e8d6; border: 0;
      box-shadow: 0 4px 12px rgba(0, 44, 64, 0.22);
    }
    .player-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .player-avatar i { color: #31b270; font-size: 4rem; }

    .player-filter-banner {
      background: rgba(49, 178, 112, 0.12);
      color: #002c40;
      border: 1px solid #31b270;
      border-radius: 10px;
      padding: 8px 14px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      margin-top: 12px;
      margin-bottom: 12px;
    }
    .player-filter-banner i.bi-funnel-fill { color: #31b270; }
    .player-filter-banner .btn-link {
      color: #b91c1c; text-decoration: none; font-weight: 600;
      padding: 2px 8px; border-radius: 6px;
    }
    .player-filter-banner .btn-link:hover {
      background: rgba(185, 28, 28, 0.08);
    }

    /* ── Panel inferior: lesiones del día seleccionado ─────────── */
    .day-injuries {
      margin-bottom: 16px;
      padding: 12px 14px;
      background: #fff5f5;
      border-left: 4px solid #b91c1c;
      border-radius: 8px;
    }
    .day-injuries-title {
      display: inline-flex; align-items: center; gap: 8px;
      font-weight: 700; color: #b91c1c;
      font-size: 0.85rem; margin-bottom: 8px;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .day-injury-row {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 0;
      border-bottom: 1px dashed rgba(185, 28, 28, 0.18);
      flex-wrap: wrap;
    }
    .day-injury-row:last-child { border-bottom: 0; }
    .day-injury-stripe {
      width: 6px; height: 22px; border-radius: 3px; flex-shrink: 0;
    }
    .day-injury-name { font-weight: 700; color: #002c40; }
    .day-injury-phase {
      font-weight: 700; font-size: 0.8rem;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .day-injury-desc { color: #636363; font-size: 0.85rem; font-style: italic; }
    /* Leyenda con dots+icono+label que ayuda a interpretar el calendario */
    .kind-legend {
      display: flex; flex-wrap: wrap; gap: 8px 14px;
      padding: 10px 14px; background: #f4f4f4; border-radius: 10px;
      margin-bottom: 12px; font-size: 0.82rem; color: #002c40;
    }
    .kind-legend__item {
      display: inline-flex; align-items: center; gap: 6px; font-weight: 600;
    }
    .kind-legend__dot {
      width: 24px; height: 24px; border-radius: 7px;
      display: inline-flex; align-items: center; justify-content: center;
      color: #ffffff; font-size: 13px;
      border: 1.5px solid rgba(255,255,255,0.7);
      box-shadow: 0 2px 5px rgba(0, 44, 64, 0.2), inset 0 1px 0 rgba(255,255,255,0.3);
    }

    .cal-dots { display: flex; flex-direction: column; gap: 2px; margin-top: 7px; align-items: stretch; }
    /* Texto del tipo de cita ("Fisioterapia", "Readaptación", "Medicina", …)
       en navy Sphaira, sin relleno: la palabra se lee directamente en la celda. */
    .cal-chip {
      display: block; color: #002c40; font-size: 0.74rem; font-weight: 700;
      letter-spacing: .005em; line-height: 1.3;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .cal-chip--cancelled { opacity: 0.5; text-decoration: line-through; }
    .cal-more {
      font-size: 0.66rem; color: #002c40; font-weight: 800; align-self: flex-start;
      background: #e9eef1; border-radius: 7px; padding: 2px 7px; line-height: 1.3;
    }

    /* Detalle del día */
    .day-detail {
      margin-top: 18px; background: #fff; border: 1px solid #e9ecef;
      border-radius: 12px; padding: 18px;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04);
    }
    .day-detail h5 { margin: 0; text-transform: capitalize; color: #002c40; font-weight: 700; }
    .day-detail-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
    }
    .day-detail-create {
      background: #31b270; border-color: #31b270; color: #fff;
      font-weight: 600;
    }
    .day-detail-create:hover { background: #176f51; border-color: #176f51; color: #fff; }
    .day-detail-empty {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 14px; color: #636363; font-style: italic;
      background: #f4f4f4; border-radius: 8px;
    }
    .day-detail-empty i { color: #31b270; font-size: 1.2rem; }
    .appt-row {
      display: flex; align-items: center; gap: 10px; padding: 10px 0;
      border-bottom: 1px dashed #e9ecef; flex-wrap: wrap;
    }
    .appt-row:last-child { border-bottom: 0; }
    .appt-row--cancelled { opacity: 0.55; text-decoration: line-through; }
    .appt-row--completed { opacity: 0.85; }
    /* Dot del detalle del día y de la lista: ahora con icono central blanco
       para diferenciar el tipo de cita de un vistazo. */
    .appt-dot {
      width: 22px; height: 22px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      color: #ffffff; font-size: 11px; flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.18);
    }
    .appt-time { font-weight: 700; min-width: 48px; color: #002c40; }
    .appt-kind { font-weight: 700; font-size: 0.85rem; min-width: 110px; }
    .appt-subject { flex: 1; font-size: 0.9rem; color: #002c40; }
    .appt-subject .text-muted { color: #636363 !important; }
    /* Notas de la cita en el detalle del día: línea propia a ancho completo,
       alineada bajo el texto y conservando los saltos de línea de la nota. */
    .appt-row-notes {
      flex-basis: 100%; width: 100%;
      padding-left: 32px; margin-top: -2px;
      font-size: 0.82rem; color: #636363; white-space: pre-line;
    }
    .appt-status {
      font-size: 0.7rem; padding: 3px 10px; border-radius: 999px;
      text-transform: uppercase; font-weight: 700; letter-spacing: 0.4px;
    }
    .appt-status--scheduled { background: #c4e8d6; color: #002c40; }
    .appt-status--completed { background: #31b270; color: #fff; }
    .appt-status--cancelled { background: #f4f4f4; color: #636363; }
    .appt-status--no_show   { background: #fde7e7; color: #b91c1c; }

    .appt-confirm {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 600; line-height: 1.2;
      cursor: help;
    }
    .appt-confirm i { font-size: 0.78rem; }
    .appt-confirm--pending   { background: #fff3cd; color: #92670d; }
    .appt-confirm--confirmed { background: #c4e8d6; color: #1b6f3a; }
    .appt-confirm--declined  { background: #fde7e7; color: #b91c1c; }
    .appt-actions { display: inline-flex; gap: 4px; }
    .icon-btn {
      background: #fff; border: 1px solid #e9ecef; color: #002c40;
      border-radius: 8px; width: 30px; height: 30px;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 120ms ease;
    }
    .icon-btn:hover { background: #c4e8d6; border-color: #31b270; color: #002c40; }
    .icon-btn--danger { color: #b91c1c; }
    .icon-btn--danger:hover { background: #fde7e7; border-color: #b91c1c; color: #b91c1c; }

    /* Vista lista */
    .list-view { padding: 8px 0; }
    .upcoming-list { display: flex; flex-direction: column; gap: 12px; }
    .appt-card {
      display: flex; gap: 14px; background: #fff;
      border: 1px solid #e9ecef; border-radius: 12px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04);
      transition: transform 120ms ease, box-shadow 120ms ease;
    }
    .appt-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 44, 64, 0.10); }
    .appt-card-left {
      width: 80px; padding: 12px; color: #fff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      flex-shrink: 0; position: relative;
    }
    .appt-card-left__icon {
      position: absolute; top: 6px; right: 6px;
      font-size: 0.85rem; opacity: 0.75;
    }
    .appt-day { font-size: 1.6rem; font-weight: 800; line-height: 1; }
    .appt-month { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .appt-card-body { flex: 1; padding: 12px 14px; min-width: 0; }
    .appt-time-row {
      font-size: 0.85rem; color: #636363; display: flex; align-items: center; gap: 8px;
      flex-wrap: wrap; font-weight: 600;
    }
    .appt-kind-tag {
      padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 800;
      letter-spacing: 0.3px; display: inline-flex; align-items: center; gap: 4px;
      text-transform: uppercase;
    }
    .appt-kind-tag i { font-size: 0.78rem; }
    .appt-subject-h { margin: 6px 0 4px; font-size: 1rem; color: #002c40; font-weight: 700; }
    .appt-meta { font-size: 0.8rem; color: #636363; display: flex; flex-wrap: wrap; gap: 12px; }
    .appt-meta i { margin-right: 4px; color: #31b270; }
    .appt-notes { font-size: 0.85rem; color: #636363; margin: 6px 0 0; }
    .appt-card-actions { display: inline-flex; flex-direction: column; gap: 6px; padding: 12px; }

    /* Modal editor */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0, 44, 64, 0.55); z-index: 1050; }
    .editor-modal {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #fff; border-radius: 14px;
      width: min(560px, 92vw); max-height: 90vh; z-index: 1051;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 44, 64, 0.25);
      overflow: hidden;
    }
    .editor-head {
      padding: 14px 18px; border-bottom: 1px solid #e9ecef;
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%);
      color: #fff;
    }
    .editor-head h5 { margin: 0; font-weight: 700; }
    .editor-head .icon-btn { background: rgba(255, 255, 255, 0.18); border-color: rgba(255, 255, 255, 0.3); color: #fff; }
    .editor-head .icon-btn:hover { background: rgba(255, 255, 255, 0.3); color: #fff; border-color: #fff; }
    .editor-body { padding: 18px; overflow: auto; background: #fff; }
    .form-row { margin-bottom: 14px; }
    .form-row label {
      font-weight: 700; font-size: 0.8rem; color: #002c40;
      display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .form-row--inline { display: flex; gap: 10px; }
    .form-row .form-control,
    .form-row .form-select {
      border: 1px solid #e9ecef; border-radius: 8px;
      padding: 8px 12px; color: #002c40;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .form-row .form-control:focus,
    .form-row .form-select:focus {
      border-color: #31b270; box-shadow: 0 0 0 3px rgba(49, 178, 112, 0.18); outline: none;
    }
    .editor-foot {
      padding: 14px 18px; border-top: 1px solid #e9ecef;
      display: flex; justify-content: flex-end; gap: 8px;
      background: #f4f4f4;
    }

    /* Alert warning Sphaira-friendly */
    .alert.alert-warning {
      background: #c4e8d6; color: #002c40; border: 1px solid #31b270;
      border-radius: 10px; padding: 10px 14px; font-weight: 500;
    }

    /* Dark mode */
    :host-context(body.dark) {
      .agenda-page { color: #c4e8d6; }
      .page-header { background: #001e2e; border-bottom-color: #00405c; }
      .page-title { color: #c4e8d6; }
      .page-subtitle { color: #94a3b8; }
      .btn-back-clean { background: #00283a; border-color: #00405c; color: #c4e8d6; }
      .btn-back-clean:hover { background: #31b270; border-color: #31b270; color: #fff; }
      .empty-state, .loading-state { background: #001e2e; color: #94a3b8; }
      .empty-state h3 { color: #c4e8d6; }
      .view-toggle { background: #001e2e; border-color: #00405c; }
      .view-btn { background: #001e2e; color: #c4e8d6; }
      .view-btn:hover { background: #00405c; }
      .date-nav { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
      .date-nav:hover { background: #00405c; }
      .month-label { color: #c4e8d6; }
      .kpi { background: #001e2e; border-color: #00405c; }
      .kpi-lbl { color: #94a3b8; }
      .calendar-grid { background: #00131c; }
      .cal-cell { background: #001e2e; }
      .cal-cell:hover { background: #00405c; border-color: #31b270; }
      .cal-cell--off { background: #00131c; }
      .cal-day { color: #c4e8d6; }
      .day-detail, .appt-card { background: #001e2e; border-color: #00405c; }
      .day-detail h5, .appt-time, .appt-subject, .appt-subject-h { color: #c4e8d6; }
      .day-detail-empty { background: #00131c; color: #94a3b8; }
      .cal-cell--selected {
        background: linear-gradient(180deg, rgba(49, 178, 112, 0.35), #001e2e);
        border-color: #31b270;
      }
      .appt-meta, .appt-notes, .appt-time-row, .appt-row-notes { color: #94a3b8; }
      .appt-row { border-bottom-color: #00405c; }
      .icon-btn { background: #001e2e; border-color: #00405c; color: #c4e8d6; }
      .icon-btn:hover { background: #00405c; }
      .editor-modal { background: #001e2e; }
      .editor-body { background: #001e2e; }
      .editor-foot { background: #00131c; border-top-color: #00405c; }
      .form-row label { color: #c4e8d6; }
      .form-row .form-control, .form-row .form-select {
        background: #00131c; border-color: #00405c; color: #c4e8d6;
      }
      .form-row .form-control:focus, .form-row .form-select:focus {
        border-color: #31b270; background: #001e2e;
      }

      /* Dark mode adaptaciones de los nuevos bloques */
      .filter-group--player { background: #001e2e; border-color: #00405c; }
      .player-select { color: #c4e8d6; background: transparent; }
      .player-avatar { background: #00405c; border-color: #31b270; }
      .player-avatar i { color: #31b270; }
      .cal-cell--injured {
        background: linear-gradient(180deg, rgba(185, 28, 28, 0.18) 0%, #001e2e 60%);
        border-color: #ef4444 !important;
      }
      .cal-cell--injured:hover {
        background: linear-gradient(180deg, rgba(185, 28, 28, 0.32) 0%, #00405c 100%);
      }
      .day-injuries {
        background: rgba(185, 28, 28, 0.12); border-left-color: #ef4444;
      }
      .day-injuries-title { color: #fda4a4; }
      .day-injury-name { color: #c4e8d6; }
      .day-injury-desc { color: #94a3b8; }
      .player-filter-banner {
        background: rgba(49, 178, 112, 0.15); border-color: #31b270; color: #c4e8d6;
      }
    }
  `]
})
export class AgendaMedicaComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  clubId = 0;
  userId = 0;
  userName: string = '';
  profileId = 0;

  modules: ClubModules = { clubId: 0, wellnessEnabled: false, rpeEnabled: false, professionalModeEnabled: false, accessControlEnabled: false, menuSport: 'futbol' };
  teamId = 0;
  teamName = '';

  view: 'month' | 'list' = 'month';
  selectedMonth: string = this.todayMonthYyyymm();
  bundle: AppointmentBundle | null = null;
  upcomingAppointments: MedicalAppointment[] = [];
  loading = false;
  saving = false;
  errorMessage: string | null = null;
  disabledByMaster = false;

  calendarDays: CalendarDay[] = [];
  monthStats = { total: 0, scheduled: 0, completed: 0, cancelled: 0 };

  selectedDayIso: string | null = this.todayIsoYmd();
  selectedDayAppointments: MedicalAppointment[] = [];

  showEditor = false;
  draft: DraftAppointment = this.emptyDraft();

  players: PlayerOpt[] = [];
  readonly kinds = KIND_OPTIONS;

  /** Base de URL para las fotos de perfil de jugadores del equipo. */
  readonly imageBaseUrlUser = environment.images + 'user/';

  /**
   * Filtro de jugador para la agenda. `null` = vista general del equipo
   * (todas las citas y todas las lesiones); cualquier otro valor filtra
   * tanto las citas mostradas como las marcas de baja del calendario.
   * El selector vive en la toolbar y actualiza el query param `playerId`.
   */
  selectedPlayerId: number | null = null;

  /**
   * Lesiones del equipo (todas, sin filtrar por jugador). Se cargan una
   * vez al entrar al equipo y se vuelven a cargar al cambiar de mes
   * SOLO si los datos del backend lo justifican. Para los cálculos del
   * calendario, filtramos en memoria por `selectedPlayerId`.
   */
  private teamInjuries: Injury[] = [];

  /** Días de microciclo (entrenos/partidos) indexados por fecha YYYY-MM-DD. */
  private sessionByDate: Map<string, MicrocycleDay> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private clubService: ClubService,
    private teamService: TeamService,
    private clubModulesService: ClubModulesService,
    private playerService: PlayerService,
    private appointmentService: MedicalAppointmentService,
    private injuryService: InjuryService,
    private microcycleService: MicrocycleService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tid = parseInt(params.get('teamId') || '0', 10);
      this.teamId = isNaN(tid) ? 0 : tid;
      this.bootstrap();
    });
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(qp => {
      const m = qp.get('month');
      if (m && /^\d{4}-\d{2}$/.test(m)) {
        this.selectedMonth = m;
      }
      const v = qp.get('view');
      if (v === 'list' || v === 'month') this.view = v;
      // Filtro de jugador desde la URL (deeplink desde la ficha de jugador, etc.).
      // `playerId=all`, vacío o no presente → null (vista general).
      const pid = qp.get('playerId');
      if (pid && pid !== 'all') {
        const parsed = parseInt(pid, 10);
        this.selectedPlayerId = isNaN(parsed) || parsed <= 0 ? null : parsed;
      } else {
        this.selectedPlayerId = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── readonly: coach (perfil 2) y player (3) sólo ven ──────────────
  get readOnly(): boolean {
    return this.profileId === 2 || this.profileId === 3;
  }

  // ─── bootstrap ─────────────────────────────────────────────────────
  private bootstrap(): void {
    this.loading = true;
    this.errorMessage = null;
    this.disabledByMaster = false;
    this.cdr.markForCheck();

    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.userId = (user as any)?.userId ?? 0;
      this.profileId = (user as any)?.profileType?.profileId ?? 0;
      this.userName = (user as any)?.firstName
        ? `${(user as any).firstName} ${(user as any).secondName || ''}`.trim()
        : '';

      this.resolveClubId(user).then(clubId => {
        this.clubId = clubId;
        if (!clubId) {
          this.errorMessage = 'No se ha podido resolver el club.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        this.clubModulesService.getModules(this.clubId).subscribe({
          next: (mods) => {
            this.modules = mods;
            if (!mods.professionalModeEnabled) {
              this.disabledByMaster = true;
              this.loading = false;
              this.cdr.markForCheck();
              return;
            }
            this.loadTeamThenAgenda();
          },
          error: () => {
            this.errorMessage = 'No se han podido cargar los módulos del club.';
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
    const direct = user?.clubId || user?.club?.clubId;
    if (direct) return Number(direct);
    if (!user?.userId) return 0;
    return new Promise<number>(resolve => {
      this.clubService.getClubForEntrenador(user.userId).subscribe({
        next: (r: any) => {
          const cid = Number(r?.data ?? 0);
          if (cid > 0) sessionStorage.setItem('clubId', String(cid));
          resolve(cid);
        },
        error: () => resolve(0)
      });
    });
  }

  private loadTeamThenAgenda(): void {
    if (!this.teamId) {
      this.errorMessage = 'No se ha indicado el equipo.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    this.teamService.getTeamById(String(this.teamId)).subscribe({
      next: (resp: any) => {
        this.teamName = resp?.data?.name || resp?.data?.nombre || '';
        this.loadPlayers();
        this.loadSessions();
        this.loadAgenda();
        this.loadTeamInjuries();
      },
      error: () => {
        this.loadPlayers();
        this.loadSessions();
        this.loadAgenda();
        this.loadTeamInjuries();
      }
    });
  }

  /**
   * Carga los días de los microciclos del equipo (entrenos/partidos) y los
   * indexa por fecha para pintarlos en el calendario y en el panel del día.
   * Reutiliza el módulo de Microciclos, donde el staff crea las sesiones.
   */
  private loadSessions(): void {
    if (!this.teamId) return;
    this.microcycleService.listByTeam(this.teamId).subscribe({
      next: (cycles) => {
        const map = new Map<string, MicrocycleDay>();
        for (const mc of cycles ?? []) {
          for (const d of mc.days ?? []) {
            if (d.dayDate) map.set(d.dayDate.substring(0, 10), d);
          }
        }
        this.sessionByDate = map;
        if (this.view === 'month') this.rebuildCalendar();
        this.cdr.markForCheck();
      },
      error: () => { /* sin sesiones: el calendario sigue funcionando */ }
    });
  }

  private loadPlayers(): void {
    this.playerService.getPlayers(String(this.teamId)).subscribe({
      next: (resp: any) => {
        // El backend devuelve resp.data = { players: [...], clubId }; pero
        // soportamos también resp.data array por compatibilidad.
        const raw = resp?.data?.players ?? resp?.data ?? [];
        const list: any[] = Array.isArray(raw) ? raw : [];
        this.players = list.map((p: any) => ({
          playerId: p.playerId || p.idPlayer || p.id,
          fullName: ([p.nombre, p.apellido].filter(Boolean).join(' ').trim()) || `Jugador #${p.playerId}`,
          picturePlayer: p.picturePlayer || p.imagenPerfil || ''
        })).filter(p => p.playerId);
        this.cdr.markForCheck();
      },
      error: () => { this.players = []; this.cdr.markForCheck(); }
    });
  }

  /**
   * Carga las lesiones del equipo y dispara un rebuild del calendario
   * cuando termine. Se llama una vez tras resolver el equipo y al
   * cambiar de jugador (para que el deeplink desde otra pantalla refresque
   * las marcas si llegamos en frío).
   *
   * <p>El cruce con los días del calendario se hace en
   * {@link #buildInjuryByDayMap} a partir de este array. Si el endpoint
   * falla, el calendario sigue funcionando sin marcas de baja (defensivo).</p>
   */
  private loadTeamInjuries(): void {
    if (!this.teamId) {
      this.teamInjuries = [];
      this.rebuildCalendar();
      return;
    }
    this.injuryService.getInjuriesByTeam(this.teamId).subscribe({
      next: (injuries) => {
        this.teamInjuries = Array.isArray(injuries) ? injuries : [];
        // Solo necesitamos rebuild del calendario cuando estamos en vista mes.
        if (this.view === 'month') {
          this.rebuildCalendar();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.teamInjuries = [];
        if (this.view === 'month') this.rebuildCalendar();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handler del select de jugador en la toolbar. `value` viene como string
   * desde el DOM; lo normalizamos a `number | null`.
   *
   * @param value valor crudo del select (`'all'`, vacío o un id numérico).
   */
  onPlayerFilterChange(value: string | number | null): void {
    if (value === null || value === undefined || value === '' || value === 'all') {
      this.selectedPlayerId = null;
    } else {
      const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
      this.selectedPlayerId = isNaN(parsed) || parsed <= 0 ? null : parsed;
    }
    this.syncQueryParams();
    // No hace falta releer del backend: filtramos en memoria tanto las
    // citas (bundle) como las lesiones (teamInjuries).
    if (this.view === 'month') {
      this.rebuildCalendar();
    } else {
      // En vista lista, basta con recomputar el resultado mostrado.
      this.cdr.markForCheck();
    }
  }

  private loadAgenda(): void {
    if (!this.teamId) return;
    this.loading = true;
    this.cdr.markForCheck();

    if (this.view === 'month') {
      this.appointmentService.getByTeamAndMonth(this.teamId, this.selectedMonth).subscribe({
        next: (b) => {
          this.bundle = b;
          this.rebuildCalendar();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.handleLoadError(err);
        }
      });
    } else {
      this.appointmentService.getUpcomingByTeam(this.teamId, 50).subscribe({
        next: (b) => {
          this.upcomingAppointments = b.appointments;
          this.bundle = b;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => this.handleLoadError(err)
      });
    }
  }

  private handleLoadError(err: any): void {
    if (err?.status === 403) {
      this.disabledByMaster = true;
    } else {
      this.errorMessage = 'No se ha podido cargar la agenda.';
    }
    this.loading = false;
    this.cdr.markForCheck();
  }

  // ─── calendario ────────────────────────────────────────────────────
  private rebuildCalendar(): void {
    const [y, m] = this.selectedMonth.split('-').map(n => parseInt(n, 10));
    if (!y || !m) { this.calendarDays = []; return; }
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    // Lunes = 1 ... Domingo = 0 → desplazamos para que la semana empiece en lunes
    const startDow = (first.getDay() + 6) % 7;
    const days: CalendarDay[] = [];
    const todayIso = this.todayIsoYmd();

    // Aplicar filtro de jugador a citas y lesiones antes de indexar.
    const filteredAppointments = this.filterByPlayer(this.bundle?.appointments || []);
    const byDay: { [iso: string]: MedicalAppointment[] } = {};
    for (const a of filteredAppointments) {
      const k = a.appointmentDate;
      if (!byDay[k]) byDay[k] = [];
      byDay[k].push(a);
    }

    // Mapa día ISO → lesiones activas ese día (una entrada por lesión/jugador).
    const injuryByDay = this.buildInjuryByDayMap();

    // Días previos (mes anterior, en gris)
    for (let i = startDow; i > 0; i--) {
      const d = new Date(y, m - 1, 1 - i);
      days.push(this.toCalendarDay(d, false, todayIso, byDay, injuryByDay));
    }
    // Días del mes
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(y, m - 1, d);
      days.push(this.toCalendarDay(dt, true, todayIso, byDay, injuryByDay));
    }
    // Hasta completar 6 semanas (42)
    while (days.length % 7 !== 0 || days.length < 42) {
      const next = new Date(days[days.length - 1].iso);
      next.setDate(next.getDate() + 1);
      days.push(this.toCalendarDay(next, next.getMonth() === m - 1, todayIso, byDay, injuryByDay));
    }
    this.calendarDays = days.slice(0, 42);

    // Las KPIs reflejan SIEMPRE el filtro activo (jugador o todos) para
    // que los números coincidan con lo que el usuario ve en el calendario.
    let total = 0, scheduled = 0, completed = 0, cancelled = 0;
    for (const a of filteredAppointments) {
      total++;
      if (a.status === 'SCHEDULED') scheduled++;
      else if (a.status === 'COMPLETED') completed++;
      else if (a.status === 'CANCELLED') cancelled++;
    }
    this.monthStats = { total, scheduled, completed, cancelled };

    // refrescar día seleccionado
    this.refreshSelectedDayDetail();
  }

  private toCalendarDay(d: Date, inMonth: boolean, todayIso: string,
                       byDay: { [iso: string]: MedicalAppointment[] },
                       injuryByDay: { [iso: string]: DayInjuryInfo[] }): CalendarDay {
    const iso = this.toIsoYmd(d);
    return {
      iso,
      day: d.getDate(),
      inMonth,
      isToday: iso === todayIso,
      appointments: (byDay[iso] || []).slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
      injuries: injuryByDay[iso] || [],
      session: this.sessionByDate.get(iso) ?? null
    };
  }

  /**
   * Construye un índice día ISO → array de {@link DayInjuryInfo}. Cada
   * lesión "ocupa" todos los días entre {@code dateInjury} y la fecha de
   * fin efectiva, calculada por orden de preferencia:
   *
   * <ol>
   *   <li>{@code dateActualReturn} (fecha real de alta, la más fiable).</li>
   *   <li>{@code dateReturnEnd} (fin del rango estimado planificado).</li>
   *   <li>{@code dateReturn} (estimación simple).</li>
   * </ol>
   *
   * <p>Si ninguna está disponible y la lesión no está dada de alta, se
   * considera "abierta" hasta hoy (los días futuros sin estimación no se
   * marcan para no contaminar el calendario de meses adelante).</p>
   *
   * <p>Las incidencias ({@code kind === 'incident'}) se ignoran porque
   * no implican baja del jugador (las pidió el usuario sin RTP).</p>
   *
   * <p>Si hay un jugador filtrado, solo se incluyen sus lesiones.</p>
   */
  private buildInjuryByDayMap(): { [iso: string]: DayInjuryInfo[] } {
    const map: { [iso: string]: DayInjuryInfo[] } = {};
    // Las lesiones SOLO se pintan en el calendario cuando hay un jugador
    // concreto seleccionado. Con "Todos los jugadores" no se muestran para
    // evitar el lío de varios jugadores lesionados a la vez.
    if (this.selectedPlayerId == null) return map;
    const injuries = this.filterInjuriesByPlayer(this.teamInjuries);
    const todayIso = this.todayIsoYmd();

    for (const inj of injuries) {
      // Las incidencias NO son una baja deportiva: no se marcan en la agenda.
      if (inj.kind === 'incident') continue;
      const start = this.normalizeIsoDate(inj.dateInjury);
      if (!start) continue;
      // Si la lesión ya está "Alta", la consideramos cerrada (no debería
      // ocupar días en el calendario).
      if (inj.status === 'alta') continue;
      const endRaw = inj.dateActualReturn || inj.dateReturnEnd || inj.dateReturn || '';
      let end = this.normalizeIsoDate(endRaw) || '';
      // `openEnded` = lesión sin fecha de retorno conocida. En ese caso, si
      // existe un plan de fases con fin definido, el calendario sigue el plan
      // (no extiende la última fase indefinidamente hasta hoy).
      let openEnded = false;
      if (!end) {
        // Lesión abierta sin estimación: la mostramos hasta hoy para no
        // pintar meses futuros en rojo de forma indefinida.
        end = todayIso;
        openEnded = true;
      }
      if (end < start) end = start; // sanity
      // Segmentos de fase planificados (rtpDates / rtpDatesEnd). Permiten
      // pintar cada día con el color de la fase ACTIVA en esa fecha, no con
      // la fase actual de la lesión.
      const phaseSegments = this.buildPhaseSegments(inj);
      // Rango a pintar: unión del periodo de baja (fecha de lesión → retorno
      // o hoy) con el plan de fases RTP. Así, si el plan empieza antes de la
      // fecha de lesión (p. ej. CCI planificado días antes), igualmente se
      // pintan todas las fases con su inicial, no solo desde la fecha de baja.
      let dispStart = start;
      let dispEnd = end;
      if (phaseSegments.length) {
        const firstStart = phaseSegments[0].start;
        const lastSeg = phaseSegments[phaseSegments.length - 1];
        if (firstStart && firstStart < dispStart) dispStart = firstStart;
        if (lastSeg.end) {
          // El plan tiene un fin definido. Si la lesión está abierta (sin
          // fecha de retorno) seguimos el plan tal cual; si está cerrada,
          // tomamos la unión por si el retorno real va más allá del plan.
          dispEnd = openEnded ? lastSeg.end : (lastSeg.end > dispEnd ? lastSeg.end : dispEnd);
        } else if (lastSeg.start && lastSeg.start > dispEnd) {
          dispEnd = lastSeg.start;
        }
      }
      const playerName = this.playerName(inj.playerId)
        || (inj as any).playerName
        || `Jugador #${inj.playerId}`;
      const description = [inj.zoneLabel || inj.zone, inj.type].filter(Boolean).join(' · ');

      // Iteramos día a día. Para evitar problemas de zona horaria/DST
      // usamos componentes Y-M-D directos, no Date.setDate global.
      let cur = dispStart;
      // Protección contra rangos absurdos (>2 años) → trunca para no bloquear UI.
      let guard = 0;
      while (cur <= dispEnd && guard++ < 800) {
        const phase = this.rtpPhaseForDate(inj, cur, phaseSegments);
        const info: DayInjuryInfo = {
          injuryId: inj.id || 0,
          playerId: inj.playerId,
          playerName,
          phaseColor: phase.color,
          phaseLabel: phase.label,
          phaseShort: phase.short,
          description
        };
        if (!map[cur]) map[cur] = [];
        map[cur].push(info);
        cur = this.addDaysIso(cur, 1);
      }
    }
    return map;
  }

  /** Filtra una lista de citas por el jugador actualmente seleccionado. */
  private filterByPlayer(appointments: MedicalAppointment[]): MedicalAppointment[] {
    if (this.selectedPlayerId == null) return appointments;
    return appointments.filter(a => a.playerId === this.selectedPlayerId);
  }

  /**
   * Filtra una lista de lesiones por el jugador seleccionado. Cuando es
   * `null` devolvemos todas (vista general del equipo).
   */
  private filterInjuriesByPlayer(injuries: Injury[]): Injury[] {
    if (this.selectedPlayerId == null) return injuries;
    return injuries.filter(i => i.playerId === this.selectedPlayerId);
  }

  /** Abreviaturas de las 5 fases RTP para mostrar dentro de la franja del día. */
  private static readonly RTP_SHORT: { [phase: number]: string } = {
    1: 'CCI', 2: 'RF', 3: 'RTT', 4: 'RTP', 5: 'RTC'
  };

  /**
   * Devuelve la definición de la fase RTP actual de una lesión.
   * Si la lesión no tiene fase o tiene una fuera de rango, devuelve la
   * fase 1 como fallback razonable para que la barra superior siempre
   * pinte algo en rojo (la lesión existe).
   */
  private rtpPhaseFor(inj: Injury): { phase: number; color: string; label: string; short: string } {
    const phaseNum = inj.rtpPhase || 1;
    const def = RTP_PHASES.find(p => p.phase === phaseNum) || RTP_PHASES[0];
    return { phase: def.phase, color: def.color, label: def.label, short: AgendaMedicaComponent.RTP_SHORT[def.phase] || def.label };
  }

  /**
   * Construye los segmentos de fase planificados de una lesión a partir de
   * `rtpDates` (inicio de cada fase) y `rtpDatesEnd` (fin de cada fase).
   * Cuando una fase no tiene fin planificado, se asume que dura hasta el día
   * anterior al inicio de la siguiente fase planificada. Devuelve los
   * segmentos ordenados por fecha de inicio. Si la lesión no tiene fechas de
   * fase planificadas, devuelve `[]` (se usará la fase actual como fallback).
   */
  private buildPhaseSegments(inj: Injury): { phase: number; start: string; end: string }[] {
    const starts = (inj.rtpDates || []).map(d => this.normalizeIsoDate(d));
    const ends = (inj.rtpDatesEnd || []).map(d => this.normalizeIsoDate(d));
    const planned: { phase: number; start: string; end: string }[] = [];
    for (let i = 0; i < RTP_PHASES.length; i++) {
      if (starts[i]) planned.push({ phase: i + 1, start: starts[i], end: ends[i] || '' });
    }
    planned.sort((a, b) => a.start.localeCompare(b.start));
    for (let k = 0; k < planned.length; k++) {
      if (!planned[k].end) {
        const next = planned[k + 1];
        planned[k].end = next ? this.addDaysIso(next.start, -1) : '';
      }
    }
    return planned;
  }

  /**
   * Devuelve la fase RTP activa de una lesión en un día concreto, según los
   * segmentos planificados. Si el día no cae en ningún segmento (o la lesión
   * no tiene fechas de fase), cae a la fase actual de la lesión.
   */
  private rtpPhaseForDate(
    inj: Injury,
    dayIso: string,
    segments: { phase: number; start: string; end: string }[]
  ): { phase: number; color: string; label: string; short: string } {
    for (const seg of segments) {
      const afterStart = dayIso >= seg.start;
      const beforeEnd = !seg.end || dayIso <= seg.end;
      if (afterStart && beforeEnd) {
        const def = RTP_PHASES.find(p => p.phase === seg.phase) || RTP_PHASES[0];
        return { phase: def.phase, color: def.color, label: def.label, short: AgendaMedicaComponent.RTP_SHORT[def.phase] || def.label };
      }
    }
    return this.rtpPhaseFor(inj);
  }

  /**
   * Normaliza una fecha que puede venir como `yyyy-MM-dd`, `dd/MM/yyyy`
   * o `yyyy/MM/dd` al formato ISO `yyyy-MM-dd`. Devuelve cadena vacía si
   * no se puede parsear (defensivo: el cruce con el calendario ignora
   * valores vacíos).
   */
  private normalizeIsoDate(value: string | null | undefined): string {
    if (!value) return '';
    const trimmed = value.trim();
    // yyyy-MM-dd o yyyy/MM/dd
    let m = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) {
      const y = m[1];
      const mo = m[2].padStart(2, '0');
      const da = m[3].padStart(2, '0');
      return `${y}-${mo}-${da}`;
    }
    // dd/MM/yyyy o dd-MM-yyyy
    m = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (m) {
      const y = m[3];
      const mo = m[2].padStart(2, '0');
      const da = m[1].padStart(2, '0');
      return `${y}-${mo}-${da}`;
    }
    return '';
  }

  /** Suma días a un ISO `yyyy-MM-dd` sin tocar la zona horaria del usuario. */
  private addDaysIso(iso: string, delta: number): string {
    const [y, m, d] = iso.split('-').map(n => parseInt(n, 10));
    const dt = new Date(y, m - 1, d + delta);
    return this.toIsoYmd(dt);
  }

  private refreshSelectedDayDetail(): void {
    const all = this.filterByPlayer((this.bundle?.appointments || [])
      .filter(a => a.appointmentDate === this.selectedDayIso));
    this.selectedDayAppointments = all.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }

  /**
   * Lesiones activas (no cerradas) del día actualmente seleccionado.
   * Se muestran junto a las citas en el panel inferior para que el
   * usuario sepa quién está de baja ese día sin tener que ir a la
   * pantalla de Lesiones.
   */
  get selectedDayInjuries(): DayInjuryInfo[] {
    const day = this.calendarDays.find(d => d.iso === this.selectedDayIso && d.inMonth);
    return day?.injuries || [];
  }

  /** Sesión (entreno/partido) del día seleccionado, si la hay. */
  get selectedDaySession(): MicrocycleDay | null {
    return this.selectedDayIso ? (this.sessionByDate.get(this.selectedDayIso) ?? null) : null;
  }

  /** Clasificación de la sesión de un día (para color/icono). */
  sessionKindOf(session: MicrocycleDay | null | undefined): 'match' | 'training' | 'rest' | 'none' {
    const dt = session?.dayType;
    if (dt === 'match') return 'match';
    if (dt === 'training') return 'training';
    if (dt === 'rest') return 'rest';
    return 'none';
  }

  /** Etiqueta legible de una sesión (con MD-X si aplica). */
  sessionLabelOf(session: MicrocycleDay | null | undefined): string {
    if (!session) return 'Sin sesión';
    const md = (session.mdLabel || '').trim();
    switch (session.dayType) {
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

  /**
   * Versión filtrada (por jugador) de `upcomingAppointments` para la
   * vista lista. Mantenemos `upcomingAppointments` con el resultado
   * crudo del backend para no romper la lógica de KPIs/contadores.
   */
  get filteredUpcomingAppointments(): MedicalAppointment[] {
    return this.filterByPlayer(this.upcomingAppointments);
  }

  onCalendarDayClick(d: CalendarDay): void {
    if (!d.inMonth) return;
    // Toggle: si se vuelve a pulsar el día ya seleccionado, se contrae.
    if (this.selectedDayIso === d.iso) {
      this.selectedDayIso = null;
      this.cdr.markForCheck();
      return;
    }
    this.selectedDayIso = d.iso;
    this.refreshSelectedDayDetail();
    this.cdr.markForCheck();
  }

  trackByDay(_i: number, d: CalendarDay): string { return d.iso; }

  /**
   * Texto que se muestra como `title` (tooltip nativo) al pasar el ratón
   * por una celda del calendario con lesiones. Devuelve una línea por
   * jugador lesionado con el formato "Nombre — Fase RTP — Zona/tipo".
   * Devuelve `null` para que Angular no añada el atributo vacío en
   * celdas sin lesión.
   */
  injuryTooltipForDay(d: CalendarDay): string | null {
    if (!d.inMonth || !d.injuries.length) return null;
    return d.injuries
      .map(i => `${i.playerName} — ${i.phaseLabel}${i.description ? ' — ' + i.description : ''}`)
      .join('\n');
  }

  // ─── view + month nav ──────────────────────────────────────────────
  setView(v: 'month' | 'list'): void {
    if (this.view === v) return;
    this.view = v;
    this.syncQueryParams();
    this.loadAgenda();
  }

  changeMonth(delta: number): void {
    const [y, m] = this.selectedMonth.split('-').map(n => parseInt(n, 10));
    const d = new Date(y, m - 1 + delta, 1);
    this.selectedMonth = this.toMonthYyyymm(d);
    this.syncQueryParams();
    this.loadAgenda();
  }

  goCurrentMonth(): void {
    this.selectedMonth = this.todayMonthYyyymm();
    this.syncQueryParams();
    this.loadAgenda();
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        month: this.selectedMonth,
        view: this.view,
        // `null` borra el query param de la URL (vista general); cualquier
        // otro valor lo escribe como string para que sea bookmarkable.
        playerId: this.selectedPlayerId == null ? null : String(this.selectedPlayerId)
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // ─── editor (crear/editar) ─────────────────────────────────────────
  openCreate(): void {
    this.draft = this.emptyDraft();
    this.draft.appointmentDate = this.selectedDayIso || this.todayIsoYmd();
    this.draft.startTime = '10:00';
    this.draft.professionalUserId = this.userId;
    this.draft.professionalName = this.userName;
    // Si la agenda está filtrada por un jugador, prerelenamos el campo
    // del modal para ahorrarle al fisio tener que volver a seleccionarlo.
    if (this.selectedPlayerId != null) {
      this.draft.playerId = this.selectedPlayerId;
    }
    this.showEditor = true;
    this.cdr.markForCheck();
  }

  /** Crear una cita usando como fecha la del día actualmente seleccionado en el calendario. */
  openCreateOnSelectedDay(): void {
    if (this.readOnly) return;
    this.openCreate();
  }

  openEdit(a: MedicalAppointment): void {
    this.draft = {
      appointmentId: a.appointmentId,
      playerId: a.playerId,
      professionalUserId: a.professionalUserId,
      professionalName: a.professionalName || '',
      appointmentDate: a.appointmentDate,
      startTime: a.startTime,
      durationMin: a.durationMin,
      kind: a.kind,
      location: a.location || '',
      subject: a.subject || '',
      notes: a.notes || ''
    };
    this.showEditor = true;
    this.cdr.markForCheck();
  }

  closeEditor(): void {
    this.showEditor = false;
    this.cdr.markForCheck();
  }

  canSave(): boolean {
    return !!this.draft.appointmentDate
        && !!this.draft.startTime
        && this.draft.durationMin > 0
        && !!this.draft.kind
        && !this.saving;
  }

  saveDraft(): void {
    if (!this.canSave()) return;
    this.saving = true;
    const body: AppointmentUpsert = {
      teamId: this.teamId,
      playerId: this.draft.playerId,
      kind: this.draft.kind,
      appointmentDate: this.draft.appointmentDate,
      startTime: this.draft.startTime,
      durationMin: this.draft.durationMin,
      location: this.draft.location || null,
      subject: this.draft.subject || null,
      notes: this.draft.notes || null,
      professionalUserId: this.draft.professionalUserId,
      professionalName: this.draft.professionalName || null
    };

    const obs = this.draft.appointmentId
      ? this.appointmentService.update(this.draft.appointmentId, body)
      : this.appointmentService.create(body);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showEditor = false;
        this.toastr.success(this.draft.appointmentId ? 'Cita actualizada' : 'Cita creada');
        this.loadAgenda();
      },
      error: (err) => {
        this.saving = false;
        this.toastr.error(err?.error?.error?.msg || 'Error guardando la cita');
        this.cdr.markForCheck();
      }
    });
  }

  markComplete(a: MedicalAppointment): void {
    if (this.readOnly) return;
    this.appointmentService.complete(a.appointmentId).subscribe({
      next: () => { this.toastr.success('Cita marcada como completada'); this.loadAgenda(); },
      error: () => this.toastr.error('Error actualizando cita')
    });
  }

  cancelAppointment(a: MedicalAppointment): void {
    if (this.readOnly) return;
    if (!confirm('¿Cancelar esta cita?')) return;
    this.appointmentService.cancel(a.appointmentId).subscribe({
      next: () => { this.toastr.success('Cita cancelada'); this.loadAgenda(); },
      error: () => this.toastr.error('Error cancelando')
    });
  }

  deleteAppointment(a: MedicalAppointment): void {
    if (this.readOnly) return;
    if (!confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.')) return;
    this.appointmentService.delete(a.appointmentId).subscribe({
      next: () => { this.toastr.success('Cita eliminada'); this.loadAgenda(); },
      error: () => this.toastr.error('Error eliminando')
    });
  }

  // ─── helpers UI ────────────────────────────────────────────────────
  kindLabel(code: string): string {
    return KIND_ALL.find(k => k.code === code)?.label || 'Otro';
  }

  /** `true` si la cita no tiene hora concreta (cita "del día"): la marca el
   *  centinela `00:00` que usan las citas generadas desde el diario médico. */
  isAllDay(a: { startTime?: string | null }): boolean {
    return !a?.startTime || a.startTime === '00:00' || a.startTime === '00:00:00';
  }

  /** Hora legible de una cita: "Todo el día" si no tiene hora concreta. */
  displayTime(a: { startTime?: string | null }): string {
    return this.isAllDay(a) ? 'Todo el día' : (a.startTime as string);
  }

  kindColor(code: string): string {
    return KIND_ALL.find(k => k.code === code)?.color || '#636363';
  }

  /** Icono Bootstrap para el tipo de cita, alineado con KIND_ALL. */
  kindIcon(code: string): string {
    return KIND_ALL.find(k => k.code === code)?.icon || 'bi-calendar-event';
  }

  /**
   * Normaliza una referencia de icono a sus clases CSS completas. Soporta
   * iconos Bootstrap Icons (`bi-xxx` → `bi bi-xxx`) y Font Awesome
   * (`fa-solid fa-xxx`, que ya incluye su familia y se deja intacto). Evita
   * mezclar la clase base `bi` con Font Awesome, que rompería el glifo.
   */
  iconClass(icon: string): string {
    if (!icon) { return 'bi bi-calendar-event'; }
    return icon.startsWith('fa-') ? icon : 'bi ' + icon;
  }

  /** Devuelve la lista de opciones completa para construir la leyenda
   *  visual del calendario (dots + icono + etiqueta). */
  get kindOptions(): readonly (KindOption & { icon: string })[] {
    return KIND_OPTIONS;
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'SCHEDULED': return 'Programada';
      case 'COMPLETED': return 'Completada';
      case 'CANCELLED': return 'Cancelada';
      case 'NO_SHOW':   return 'No asistió';
      default:           return s;
    }
  }

  /**
   * Devuelve `pending`, `confirmed` o `declined` para usar como modificador
   * CSS del chip de confirmación del jugador. Si el backend aún no devuelve
   * el campo (porque el ALTER TABLE no se ha aplicado), tratamos la cita
   * como `pending`.
   */
  playerConfirmationCss(a: MedicalAppointment): string {
    const raw = (a.playerConfirmation || 'PENDING').toUpperCase();
    if (raw === 'CONFIRMED') return 'confirmed';
    if (raw === 'DECLINED') return 'declined';
    return 'pending';
  }

  playerConfirmationLabel(a: MedicalAppointment): string {
    switch (this.playerConfirmationCss(a)) {
      case 'confirmed': return 'Confirmada por el jugador';
      case 'declined':  return 'Rechazada por el jugador';
      default:          return 'Pendiente de confirmar';
    }
  }

  playerConfirmationTitle(a: MedicalAppointment): string {
    switch (this.playerConfirmationCss(a)) {
      case 'confirmed': return 'El jugador ha confirmado asistencia desde la app.';
      case 'declined':  return 'El jugador ha indicado que no podrá acudir. Considera reprogramar.';
      default:          return 'El jugador aún no ha respondido a la cita desde la app.';
    }
  }

  playerConfirmationIcon(a: MedicalAppointment): string {
    switch (this.playerConfirmationCss(a)) {
      case 'confirmed': return 'bi-check-circle-fill';
      case 'declined':  return 'bi-x-circle-fill';
      default:          return 'bi-hourglass-split';
    }
  }

  playerName(playerId: number | null): string {
    if (!playerId) return '';
    const fromBundle = this.bundle?.playerLookup?.[String(playerId)];
    if (fromBundle) return fromBundle;
    const fromList = this.players.find(p => p.playerId === playerId);
    return fromList?.fullName || `Jugador #${playerId}`;
  }

  /**
   * URL absoluta de la foto de perfil de un jugador, o cadena vacía si no
   * tiene foto. Se usa para mostrar el avatar junto al filtro cuando hay un
   * jugador seleccionado.
   */
  playerPhotoUrl(playerId: number | null): string {
    if (!playerId) return '';
    const fromList = this.players.find(p => p.playerId === playerId);
    return fromList?.picturePlayer ? this.imageBaseUrlUser + fromList.picturePlayer : '';
  }

  formatHumanDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(n => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  formatMonthLabel(monthYyyymm: string): string {
    if (!monthYyyymm) return '';
    const [y, m] = monthYyyymm.split('-').map(n => parseInt(n, 10));
    const dt = new Date(y, m - 1, 1);
    return dt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  }

  getDayPart(iso: string): string {
    if (!iso) return '';
    return iso.split('-')[2] || '';
  }

  getMonthShort(iso: string): string {
    if (!iso) return '';
    const [y, m] = iso.split('-').map(n => parseInt(n, 10));
    const dt = new Date(y, m - 1, 1);
    return dt.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  }

  // ─── nav ───────────────────────────────────────────────────────────
  /**
   * Vuelve a la pantalla anterior. Usar location.back() en vez de un
   * router.navigate fijo permite que el botón "Volver" haga lo intuitivo
   * sea cual sea el origen: menú fisio, menú entrenador, panel diario o
   * el chip de cita médica desde el calendario.
   */
  goBack(): void {
    this.location.back();
  }

  goPermisos(): void {
    this.router.navigate(['/dashboard/permisos-club']);
  }

  // ─── utils ─────────────────────────────────────────────────────────
  private todayIsoYmd(): string { return this.toIsoYmd(new Date()); }
  private todayMonthYyyymm(): string { return this.toMonthYyyymm(new Date()); }

  private toIsoYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toMonthYyyymm(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private emptyDraft(): DraftAppointment {
    return {
      appointmentId: null,
      playerId: null,
      professionalUserId: this.userId || null,
      professionalName: this.userName || '',
      appointmentDate: this.todayIsoYmd(),
      startTime: '10:00',
      durationMin: 30,
      kind: 'PHYSIO',
      location: '',
      subject: '',
      notes: ''
    };
  }
}
