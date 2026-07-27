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
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { getSelectedSeason } from 'src/app/core/utils/season.utils';
import {
  ClubModulesService,
  ClubModules
} from 'src/app/core/services/club/club-modules.service';
import {
  MedicalDiaryService,
  MedicalDiaryEntry,
  MedicalDiaryStatus,
  MedicalDiaryTreatment
} from 'src/app/core/services/medical-diary/medical-diary.service';
import {
  MedicalAppointmentService,
  AppointmentUpsert
} from 'src/app/core/services/medical-appointment/medical-appointment.service';
import { ReadaptacionService } from 'src/app/core/services/readaptacion/readaptacion.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

/**
 * Fila editable de la tabla del diario médico (Fase 2.2).
 *
 * <p>Cada fila representa a un jugador del equipo en una fecha. Los
 * campos médicos pueden estar vacíos: la fila se inicializa siempre,
 * incluso aunque el jugador no tenga {@code PlayerDailyStatusEntity}
 * para esa fecha — al primer cambio se hace upsert.
 */
interface DiarioRow {
  playerId: number;
  fullName: string;
  numero: string | null;
  posicion: string | null;
  picturePlayer: string | null;
  /** Otros equipos (mismo club/temporada) a los que pertenece el jugador. */
  otherTeams: string[];
  /** Fase de lesión RTP (1-5). 0 = sin lesión activa. */
  injuryPhase: number;
  /** Estado del jugador (editable: desplegable según partido/entrenamiento). */
  statusTagCode: string | null;
  statusTagLabel: string | null;
  statusColor: string | null;
  /** Campos médicos editables. */
  attendedPhysio: boolean;
  /**
   * "Trabajo realizado" (readaptación): códigos del catálogo seleccionados.
   * Fuente única compartida con la pantalla de Readaptación.
   */
  workDoneCodes: string[];
  /** Si el último guardado de "trabajo realizado" está en curso. */
  savingWork?: boolean;
  /** Tratamientos del jugador ese día (1..N). Siempre hay al menos uno. */
  treatments: TreatmentRow[];
  forecastTagCode: string;
  /** Etiqueta legible de la previsión (derivada del catálogo). */
  forecastTagLabel?: string;
  generalObservations: string;
  /** true = jugador invitado (de otro equipo del cuerpo médico), no de plantilla. */
  guest: boolean;
  /** Persistencia. */
  dailyStatusId?: number;
  saving: boolean;
  /** Si el último guardado de tratamientos está en curso. */
  savingTreatments?: boolean;
  /** Si el último guardado falló y la fila está en estado "rojo". */
  errored: boolean;
}

/**
 * Un equipo del cuerpo médico en el desplegable "Jugadores" (acordeón). Al
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

/**
 * Una línea de tratamiento dentro de una fila: una zona + una observación +
 * UNA O VARIAS técnicas (multi-selección). Cada técnica seleccionada se
 * persiste como una fila independiente en el backend (compartiendo zona y
 * observación), porque las columnas `treatment_code`/`treatment_label` solo
 * admiten un código/etiqueta. Al recargar, las filas con la misma zona y
 * observación se reagrupan en una sola línea multi-selección.
 */
interface TreatmentRow {
  zone: string;
  /** Códigos del catálogo seleccionados para esta zona/sesión (0..N). */
  codes: string[];
  observations: string;
}

/**
 * Catálogo "Trabajo realizado" (idéntico al de Readaptación). Grupos
 * principales con sus opciones multi-selección. Un ítem con `header: true`
 * es un subtítulo no seleccionable.
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

/**
 * Opción del desplegable de "Previsión" (disponibilidad prevista para la
 * siguiente sesión). `code`/`label` se guardan en `forecastTagCode` /
 * `forecastTagLabel`; `color` se deriva del catálogo (no se persiste).
 */
interface PrevisionOption {
  code: string;
  label: string;
  display: string;
  color: string;
}

/**
 * Paleta semántica ÚNICA código → color. Garantiza que un mismo código se vea
 * SIEMPRE del mismo color en cualquier apartado (columna "Estado", columna
 * "Previsión", días de entreno o de partido).
 *
 *  - Verde:        disponible (D) y return to competición (D-RTC).
 *  - Verde oscuro: disponible condicionado (DC) y return to play (LS-RTP).
 *  - Naranja:      entrena al margen / motivos personales / precaución / duda
 *                  (EM, MP, SP, DUDA y variantes *-MP).
 *  - Rojo:         baja por lesión, enfermedad, sanción o sale lesionado
 *                  (LS, LS-MT, LS-ENF, ENF, SL, ND-*, FC-LS, FC-SN, FC-ENF).
 *  - Gris:         sin estado (placeholder) o decisión técnica (no médico).
 */
const STATUS_COLOR_GREEN = '#31b270';
const STATUS_COLOR_GREEN_DARK = '#1d8a3a';
const STATUS_COLOR_ORANGE = '#f97316';
const STATUS_COLOR_RED = '#b1231b';
const STATUS_COLOR_GRAY = '#6b7280';

export const STATUS_COLOR_BY_CODE: { [code: string]: string } = {
  'D':       STATUS_COLOR_GREEN,
  'D-RTC':   STATUS_COLOR_GREEN,
  'DC':      STATUS_COLOR_GREEN_DARK,
  'LS-RTP':  STATUS_COLOR_GREEN_DARK,
  'EM':      STATUS_COLOR_ORANGE,
  'MP':      STATUS_COLOR_ORANGE,
  'SP':      STATUS_COLOR_ORANGE,
  'DUDA':    STATUS_COLOR_ORANGE,
  'ND-MP':   STATUS_COLOR_ORANGE,
  'FC-MP':   STATUS_COLOR_GRAY,
  'LS':      STATUS_COLOR_RED,
  'LS-MT':   STATUS_COLOR_RED,
  'LS-ENF':  STATUS_COLOR_RED,
  'ENF':     STATUS_COLOR_RED,
  'SL':      STATUS_COLOR_RED,
  'ND-SN':   STATUS_COLOR_RED,
  'ND-LS':   STATUS_COLOR_RED,
  'ND-ENF':  STATUS_COLOR_RED,
  'FC-LS':   STATUS_COLOR_RED,
  'FC-SN':   STATUS_COLOR_RED,
  'FC-ENF':  STATUS_COLOR_RED
};

/** Color semántico de un código (gris neutro si no está catalogado). */
export function statusColor(code: string): string {
  return STATUS_COLOR_BY_CODE[code] || STATUS_COLOR_GRAY;
}

/** Previsión cuando la SIGUIENTE sesión es un ENTRENAMIENTO. */
const PREVISION_TRAINING: PrevisionOption[] = [
  { code: '',       label: '',                            display: '— Sin previsión —',                       color: statusColor('') },
  { code: 'D',      label: 'Disponible',                  display: 'D · Disponible',                          color: statusColor('D') },
  { code: 'DC',     label: 'Disponible condicionado',     display: 'DC · Disponible condicionado',            color: statusColor('DC') },
  { code: 'LS',     label: 'Lesionado',                   display: 'LS · Lesionado',                          color: statusColor('LS') },
  { code: 'LS-RTP', label: 'Return to play',              display: 'LS-RTP · Return to play',                 color: statusColor('LS-RTP') },
  { code: 'LS-MT',  label: 'Lesionado (motivos pers.)',   display: 'LS-MT · Lesionado (cita/motivos pers.)',  color: statusColor('LS-MT') },
  { code: 'LS-ENF', label: 'Lesionado (enfermo)',         display: 'LS-ENF · Lesionado (enfermo)',            color: statusColor('LS-ENF') },
  { code: 'D-RTC',  label: 'Return to competición',       display: 'D-RTC · Return to competición',           color: statusColor('D-RTC') },
  { code: 'EM',     label: 'Entrena al margen',           display: 'EM · Entrena al margen',                  color: statusColor('EM') },
  { code: 'ENF',    label: 'Enfermo',                     display: 'ENF · Enfermo',                           color: statusColor('ENF') },
  { code: 'MP',     label: 'Motivos personales',          display: 'MP · Motivos personales',                 color: statusColor('MP') },
  { code: 'DUDA',   label: 'Duda · valorar pre-entreno',  display: 'DUDA · Valorar pre-entreno',              color: statusColor('DUDA') }
];

/** Previsión cuando la SIGUIENTE sesión es un PARTIDO. */
const PREVISION_MATCH: PrevisionOption[] = [
  { code: '',       label: '',                                  display: '— Sin previsión —',                       color: statusColor('') },
  { code: 'D',      label: 'Disponible',                        display: 'D · Disponible',                          color: statusColor('D') },
  { code: 'ND-SN',  label: 'No disponible por sanción',         display: 'ND-SN · No disponible por sanción',       color: statusColor('ND-SN') },
  { code: 'ND-LS',  label: 'No disponible por lesión',          display: 'ND-LS · No disponible por lesión',        color: statusColor('ND-LS') },
  { code: 'ND-ENF', label: 'No disponible por enfermedad',      display: 'ND-ENF · No disponible por enfermedad',   color: statusColor('ND-ENF') },
  { code: 'ND-MP',  label: 'No disponible por motivos pers.',   display: 'ND-MP · No disponible por motivos pers.', color: statusColor('ND-MP') }
];

/**
 * Opción del desplegable de "Estado" del jugador. `code` se guarda en
 * `statusTagCode`, `label` en `statusTagLabel` y `color` en `statusColor`.
 * `display` es el texto del desplegable y `group` agrupa las opciones de
 * "Fuera de convocatoria" en los días de partido.
 */
export interface StatusOption {
  code: string;
  label: string;
  display: string;
  color: string;
  group?: string;
}

/** Estados disponibles en días de ENTRENAMIENTO. */
export const TRAINING_STATUS: StatusOption[] = [
  { code: '',       label: '',                              display: '— Sin estado —',                         color: statusColor('') },
  { code: 'D',      label: 'Disponible',                    display: 'D · Disponible',                         color: statusColor('D') },
  { code: 'DC',     label: 'Disponible condicionado',       display: 'DC · Disponible condicionado',           color: statusColor('DC') },
  { code: 'LS',     label: 'Lesionado',                     display: 'LS · Lesionado',                         color: statusColor('LS') },
  { code: 'LS-MT',  label: 'Lesionado (motivos personales)',display: 'LS-MT · Lesionado (cita/motivos pers.)', color: statusColor('LS-MT') },
  { code: 'LS-ENF', label: 'Lesionado (enfermo)',           display: 'LS-ENF · Lesionado (enfermo)',           color: statusColor('LS-ENF') },
  { code: 'LS-RTP', label: 'Return to play',                display: 'LS-RTP · Return to play',                color: statusColor('LS-RTP') },
  { code: 'D-RTC',  label: 'Return to competición',         display: 'D-RTC · Return to competición',          color: statusColor('D-RTC') },
  { code: 'EM',     label: 'Entrena al margen',             display: 'EM · Entrena al margen',                 color: statusColor('EM') },
  { code: 'ENF',    label: 'Enfermo',                       display: 'ENF · Enfermo',                          color: statusColor('ENF') },
  { code: 'MP',     label: 'Motivos personales',            display: 'MP · Motivos personales',                color: statusColor('MP') },
  { code: 'SL',     label: 'Sale lesionado',                display: 'SL · Sale lesionado',                    color: statusColor('SL') },
  { code: 'SP',     label: 'Sale por precaución',           display: 'SP · Sale por precaución',               color: statusColor('SP') }
];

/** Estados disponibles en días de PARTIDO. Las opciones con group='FC' van en el grupo "Fuera de convocatoria". */
export const MATCH_STATUS: StatusOption[] = [
  { code: '',       label: '',                                         display: '— Sin estado —',                color: statusColor('') },
  { code: 'D',      label: 'Disponible',                               display: 'D · Disponible',                color: statusColor('D') },
  { code: 'SL',     label: 'Sustituido por lesión',                    display: 'SL · Sustituido por lesión',    color: statusColor('SL') },
  { code: 'SP',     label: 'Sustituido por precaución',                display: 'SP · Sustituido por precaución',color: statusColor('SP') },
  { code: 'FC-LS',  label: 'Fuera de convocatoria · Lesión',           display: 'Lesión',                        color: statusColor('FC-LS'), group: 'FC' },
  { code: 'FC-SN',  label: 'Fuera de convocatoria · Sanción',          display: 'Sanción',                       color: statusColor('FC-SN'), group: 'FC' },
  { code: 'FC-ENF', label: 'Fuera de convocatoria · Enfermedad',       display: 'Enfermedad',                    color: statusColor('FC-ENF'), group: 'FC' },
  { code: 'FC-DT',  label: 'Fuera de convocatoria · Decisión técnica', display: 'Decisión técnica',              color: statusColor('FC-DT'), group: 'FC' },
  { code: 'FC-MP',  label: 'Fuera de convocatoria · Motivos personales',display: 'Motivos personales',           color: statusColor('FC-MP'), group: 'FC' }
];

/**
 * Etiqueta legible para un código de estado, buscando en los catálogos de
 * entrenamiento y partido. Permite que otras pantallas (p. ej. el panel
 * diario) muestren texto entendible en vez del código abreviado.
 */
export function statusLabelByCode(code: string | null | undefined): string {
  if (!code) return 'Sin estado';
  const all = [...TRAINING_STATUS, ...MATCH_STATUS];
  const found = all.find(o => o.code === code && !!o.label);
  return found?.label || code;
}

/**
 * Opción del desplegable de "Tratamiento". `code` se guarda en
 * `treatment_code`, `label` (texto largo para informes) en `treatment_label`
 * y `display` es lo que se ve dentro del desplegable.
 */
interface TreatmentOption { code: string; label: string; display: string; }
interface TreatmentGroup { label?: string; options: TreatmentOption[]; }

/** Catálogo de tratamientos de fisioterapia (con subgrupos). */
const TREATMENT_GROUPS: TreatmentGroup[] = [
  { options: [{ code: 'terapia_manual', label: 'Terapia manual', display: 'Terapia manual' }] },
  {
    label: 'Terapia invasiva',
    options: [
      { code: 'puncion_seca',    label: 'Punción seca',    display: 'Punción seca' },
      { code: 'neuromodulacion', label: 'Neuromodulación', display: 'Neuromodulación' },
      { code: 'electrolisis',    label: 'Electrólisis',    display: 'Electrólisis' }
    ]
  },
  {
    label: 'Radiofrecuencia',
    options: [
      { code: 'rf_capacitativo', label: 'Radiofrecuencia capacitativa', display: 'Capacitativo' },
      { code: 'rf_resistivo',    label: 'Radiofrecuencia resistiva',    display: 'Resistivo' }
    ]
  },
  { options: [{ code: 'sistema_super_inductivo', label: 'Sistema súper inductivo', display: 'Sistema súper inductivo' }] },
  { options: [{ code: 'crioterapia',  label: 'Crioterapia',     display: 'Crioterapia' }] },
  { options: [{ code: 'ondas_choque', label: 'Ondas de choque', display: 'Ondas de choque' }] }
];

/**
 * Pantalla del "Diario médico del día" del Modo Profesional.
 *
 * <p>Tabla editable con una fila por jugador donde el cuerpo médico
 * (fisio / nutricionista / médico) anota: zona tratada, técnica,
 * duración, observaciones del tratamiento, pronóstico para mañana y
 * observaciones generales. Genera un PDF imprimible.
 *
 * <p>Acceso:
 * <ul>
 *   <li>Editan: admin (1), staff médico (9 con permiso), fisio (6),
 *       nutricionista (7), médico (8 si existe).</li>
 *   <li>Solo lectura: entrenador (2).</li>
 *   <li>Resto: bloqueado por la sidebar / ruta padre.</li>
 * </ul>
 *
 * <p>Hard-gate por {@code professionalModeEnabled}: si está OFF, la
 * pantalla muestra el estado de "Modo Profesional desactivado" con
 * link a Ajustes (igual que el Panel Diario).
 *
 * <p>Ruta: {@code /dashboard/diario-medico/:teamId}.
 */
@Component({
  selector: 'app-diario-medico-equipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="med-page">

      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="table-title">
            <i class="bi bi-clipboard2-pulse-fill me-2"></i>Diario médico del día
          </h2>
          <p class="header-subtitle">{{ formattedDate }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Modo Profesional desactivado -->
        <div *ngIf="disabledByMaster" class="empty-state pro-disabled">
          <i class="bi bi-lock-fill display-5 mb-2 d-block text-warning"></i>
          <h5 class="mb-2">Modo Profesional desactivado</h5>
          <p class="text-muted mb-3">
            Pide al administrador del club que active el Modo Profesional
            desde Ajustes para acceder al diario médico.
          </p>
          <button class="btn btn-sphaira btn-sm" (click)="goAjustes()">
            <i class="bi bi-gear"></i> Ir a Ajustes
          </button>
        </div>

        <!-- Filtros + acciones -->
        <ng-container *ngIf="!disabledByMaster">

          <div class="filters-card">
            <div class="filter-block">
              <label class="filter-label">Fecha</label>
              <input type="date" class="form-control filter-date"
                     [value]="dateIso"
                     (change)="onDateChange($event)" />
            </div>

            <div class="filter-block kpi-block" *ngIf="!loading">
              <div class="kpi kpi-blue" title="Plantilla total">
                <i class="bi bi-people-fill"></i>
                {{ totalPlayers }}
              </div>
              <div class="kpi kpi-green" title="Atendidos / con anotaciones">
                <i class="bi bi-check-circle-fill"></i>
                {{ playersAttended }}
              </div>
              <div class="kpi kpi-gray" title="Sin atender">
                <i class="bi bi-dash-circle"></i>
                {{ totalPlayers - playersAttended }}
              </div>
            </div>

            <div class="filter-block actions-block">
              <button class="btn-sphaira-outline btn-sm"
                      (click)="reload()"
                      [disabled]="loading">
                <i class="bi bi-arrow-clockwise"></i>
                Actualizar
              </button>
              <button class="btn btn-sphaira btn-sm"
                      (click)="downloadPdf()"
                      [disabled]="loading || downloadingPdf || rows.length === 0">
                <i class="bi" [class.bi-file-earmark-pdf]="!downloadingPdf"
                   [class.bi-hourglass-split]="downloadingPdf"></i>
                {{ downloadingPdf ? 'Generando…' : 'Descargar PDF' }}
              </button>

              <!-- Botón "Jugadores": añade invitados de otros equipos del fisio -->
              <button class="btn-sphaira-outline btn-sm players-btn"
                      *ngIf="!readOnly"
                      (click)="togglePlayersMenu($event)"
                      [disabled]="loading"
                      [class.is-open]="playersMenuOpen">
                <i class="bi bi-person-plus"></i>
                Jugadores
                <i class="bi bi-chevron-down"></i>
              </button>
            </div>
          </div>

          <!-- Desplegable flotante de "Jugadores" (equipos del fisio → jugadores) -->
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
                <span class="guest-team-badge" *ngIf="isHostTeam(team)">Este diario</span>
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

          <!-- Banner read-only para entrenadores -->
          <div *ngIf="readOnly && !loading" class="readonly-banner">
            <i class="bi bi-eye"></i>
            Estás viendo el diario médico en modo solo lectura.
            Solo el cuerpo médico puede editar las anotaciones.
          </div>

          <!-- Loading -->
          <div *ngIf="loading" class="empty-state">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 mb-0">Cargando diario médico…</p>
          </div>

          <!-- Sin jugadores -->
          <div *ngIf="!loading && rows.length === 0" class="empty-state">
            <i class="bi bi-people display-5 mb-2 d-block"></i>
            <p class="mb-0">No hay jugadores en la plantilla del equipo.</p>
          </div>

          <!-- Barra de ordenación -->
          <div class="diario-sort-toolbar" *ngIf="!loading && rows.length > 0">
            <span class="sort-label"><i class="bi bi-arrow-down-up"></i> Ordenar por:</span>
            <div class="sort-options">
              <button type="button" class="sort-btn" *ngIf="!readOnly"
                      [class.active]="sortMode === 'manual'" (click)="setSort('manual')">
                <i class="bi bi-grip-vertical"></i> Manual
              </button>
              <button type="button" class="sort-btn"
                      [class.active]="sortMode === 'name'" (click)="setSort('name')">
                <i class="bi bi-sort-alpha-down"></i> Nombre
              </button>
              <button type="button" class="sort-btn"
                      [class.active]="sortMode === 'position'" (click)="setSort('position')">
                <i class="bi bi-diagram-3"></i> Posición
              </button>
              <button type="button" class="sort-btn"
                      [class.active]="sortMode === 'number'" (click)="setSort('number')">
                <i class="bi bi-hash"></i> Dorsal
              </button>
            </div>
          </div>

          <!-- Tabla -->
          <div *ngIf="!loading && rows.length > 0" class="med-table-wrapper">
            <table class="med-table">
              <thead>
                <tr>
                  <th class="col-drag" *ngIf="!readOnly"></th>
                  <th class="col-name">Jugador</th>
                  <th class="col-state">
                    Estado
                    <span class="day-mode" [class.is-match]="isMatchDay">
                      <i class="bi" [class.bi-trophy]="isMatchDay" [class.bi-cone-striped]="!isMatchDay"></i>
                      {{ isMatchDay ? 'Partido' : 'Entreno' }}
                    </span>
                  </th>
                  <th class="col-work">Trabajo realizado</th>
                  <th class="col-fisio">Fisio</th>
                  <th class="col-zone">Zona tratada</th>
                  <th class="col-treat">Tratamiento</th>
                  <th class="col-tobs">Obs. tratamiento</th>
                  <th class="col-fc">
                    Previsión
                    <span class="day-mode" [class.is-match]="nextSession?.isMatchDay">
                      <i class="bi" [class.bi-trophy]="nextSession?.isMatchDay"
                         [class.bi-cone-striped]="nextSession && !nextSession.isMatchDay"
                         [class.bi-dash-circle]="!nextSession"></i>
                      {{ nextSessionLabel }}
                    </span>
                  </th>
                  <th class="col-gen">Observaciones</th>
                </tr>
              </thead>
              <tbody cdkDropList (cdkDropListDropped)="onRowDrop($event)" [cdkDropListDisabled]="dragDisabled">
                <ng-container *ngFor="let row of rows; trackBy: trackByPlayer; let i = index">
                <!-- Divisor: jugadores de otros equipos (invitados) al final -->
                <tr class="group-divider group-divider--guest" *ngIf="isFirstGuest(i)">
                  <td [attr.colspan]="readOnly ? 9 : 10">
                    <i class="bi bi-people-fill"></i> Jugadores de otros equipos
                  </td>
                </tr>
                <!-- Divisor: jugadores en recuperación (fase 1-3) van al final de la lista -->
                <tr class="group-divider" *ngIf="isFirstRecovering(i)">
                  <td [attr.colspan]="readOnly ? 9 : 10">
                    <i class="bi bi-bandaid-fill"></i> En recuperación · fase 1–3
                  </td>
                </tr>
                <tr cdkDrag [cdkDragData]="row" cdkDragLockAxis="y" [cdkDragDisabled]="dragDisabled"
                    [class.row-saving]="row.saving"
                    [class.row-error]="row.errored"
                    [class.row-recovering]="row.injuryPhase >= 1 && row.injuryPhase <= 3">
                  <td class="col-drag" *ngIf="!readOnly">
                    <i class="bi bi-grip-vertical drag-handle" cdkDragHandle title="Arrastra para reordenar"
                       *ngIf="!dragDisabled"></i>
                  </td>
                  <td class="col-name">
                    <div class="player-cell">
                      <div class="avatar-mini">
                        <img *ngIf="row.picturePlayer"
                             [src]="'https://appsphairatech.com/images/user/' + row.picturePlayer"
                             [alt]="row.fullName" />
                        <i *ngIf="!row.picturePlayer" class="bi bi-person-fill"></i>
                      </div>
                      <div class="player-info">
                        <span class="player-name">
                          {{ row.fullName }}
                          <span *ngIf="row.guest" class="guest-badge"
                                [title]="guestBadgeTitle(row)">
                            <i class="bi bi-person-plus-fill"></i> {{ guestBadgeLabel(row) }}
                          </span>
                          <span *ngIf="row.injuryPhase >= 1" class="phase-badge"
                                [class.phase-low]="row.injuryPhase <= 3"
                                [class.phase-high]="row.injuryPhase >= 4"
                                [title]="phaseTitle(row.injuryPhase)">
                            <i class="bi bi-bandaid"></i> Fase {{ row.injuryPhase }}
                          </span>
                        </span>
                        <span class="team-tags" *ngIf="!row.guest && row.otherTeams.length">
                          <span class="team-tag" *ngFor="let t of row.otherTeams"
                                title="Pertenece también a {{ t }}">
                            <i class="bi bi-people-fill"></i> {{ t }}
                          </span>
                        </span>
                        <span class="player-meta" *ngIf="row.numero || teamName">
                          <span *ngIf="row.numero">#{{ row.numero }}</span>
                          <span *ngIf="row.numero && teamName"> · </span>
                          <span *ngIf="teamName">{{ teamName }}</span>
                        </span>
                      </div>
                    </div>
                    <!-- Vista previa compacta durante el arrastre (evita el colapso de anchos de la fila) -->
                    <div class="drag-preview" *cdkDragPreview>
                      <i class="bi bi-grip-vertical"></i>
                      <span>{{ row.fullName }}</span>
                    </div>
                  </td>
                  <td class="col-state">
                    <select class="form-select form-select-sm status-select"
                            [ngModel]="row.statusTagCode || ''"
                            [ngModelOptions]="{ standalone: true }"
                            [style.color]="row.statusColor || '#374151'"
                            (ngModelChange)="onStatusChange(row, $event)"
                            [disabled]="readOnly || row.saving">
                      <option *ngIf="isUnknownStatus(row)" [value]="row.statusTagCode">
                        {{ row.statusTagLabel || row.statusTagCode }}
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
                  </td>
                  <td class="col-work">
                    <div class="work-dropdown">
                      <button type="button" class="work-toggle"
                              [disabled]="readOnly || row.savingWork"
                              (click)="toggleWorkMenu(row, $event)">
                        <span class="work-summary" *ngIf="row.workDoneCodes.length">
                          <span class="work-chip" *ngFor="let l of selectedWorkLabels(row)">{{ l }}</span>
                        </span>
                        <span class="work-summary work-empty" *ngIf="!row.workDoneCodes.length">—</span>
                        <i class="bi bi-chevron-down"></i>
                      </button>
                      <div class="work-menu" *ngIf="isWorkMenuOpen(row) && workMenuPos"
                           (click)="$event.stopPropagation()"
                           [style.top.px]="workMenuPos.top"
                           [style.left.px]="workMenuPos.left"
                           [style.min-width.px]="workMenuPos.width"
                           [style.max-height.px]="workMenuPos.maxHeight">
                        <div class="work-group" *ngFor="let g of workGroups">
                          <button type="button" class="work-group-head"
                                  [class.is-open]="openWorkGroup === g.code"
                                  (click)="toggleWorkGroup(g.code, $event)">
                            <span class="wg-label">{{ g.label }}</span>
                            <span class="wg-right">
                              <span class="wg-count" *ngIf="groupWorkCount(row, g) > 0">{{ groupWorkCount(row, g) }}</span>
                              <i class="bi" [ngClass]="openWorkGroup === g.code ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                            </span>
                          </button>
                          <div class="work-group-body" *ngIf="openWorkGroup === g.code">
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
                  <td class="col-fisio">
                    <input type="checkbox" class="form-check-input"
                           [checked]="row.attendedPhysio"
                           (change)="onPhysioChange(row, $event)"
                           [disabled]="readOnly || row.saving" />
                  </td>
                  <td class="col-zone">
                    <div class="treat-stack">
                      <input type="text" class="form-control form-control-sm treat-line"
                             *ngFor="let t of row.treatments; trackBy: trackByTreatment; let ti = index"
                             placeholder="ej. Cuádriceps der."
                             [value]="t.zone"
                             (change)="onTreatmentZoneChange(row, ti, $event)"
                             [disabled]="readOnly || row.savingTreatments" />
                      <button type="button" class="treat-add" *ngIf="!readOnly"
                              (click)="addTreatment(row)">
                        <i class="bi bi-plus-lg"></i> Añadir tratamiento
                      </button>
                    </div>
                  </td>
                  <td class="col-treat">
                    <div class="treat-stack">
                      <div class="treat-multi-wrap"
                           *ngFor="let t of row.treatments; trackBy: trackByTreatment; let ti = index">
                        <button type="button" class="treat-multi"
                                [disabled]="readOnly || row.savingTreatments"
                                (click)="toggleTreatMenu(row, ti, $event)">
                          <span class="treat-multi-summary" *ngIf="t.codes.length">
                            <span class="treat-chip" *ngFor="let l of selectedTreatLabels(t)">{{ l }}</span>
                          </span>
                          <span class="treat-multi-summary treat-placeholder" *ngIf="!t.codes.length">— Tratamiento —</span>
                          <i class="bi bi-chevron-down"></i>
                        </button>
                        <div class="treat-menu" *ngIf="isTreatMenuOpen(row, ti) && treatMenuPos"
                             (click)="$event.stopPropagation()"
                             [style.top.px]="treatMenuPos.top"
                             [style.left.px]="treatMenuPos.left"
                             [style.min-width.px]="treatMenuPos.width"
                             [style.max-height.px]="treatMenuPos.maxHeight">
                          <ng-container *ngFor="let g of treatmentGroups">
                            <div class="treat-subhead" *ngIf="g.label">{{ g.label }}</div>
                            <label class="treat-opt" *ngFor="let o of g.options">
                              <input type="checkbox"
                                     [checked]="t.codes.includes(o.code)"
                                     (change)="onTreatToggle(row, ti, o.code, $event)" />
                              <span>{{ o.display }}</span>
                            </label>
                          </ng-container>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="col-tobs">
                    <div class="treat-stack">
                      <div class="treat-obs-line"
                           *ngFor="let t of row.treatments; trackBy: trackByTreatment; let ti = index">
                        <input type="text" class="form-control form-control-sm treat-line"
                               placeholder="Observación corta"
                               [value]="t.observations"
                               (change)="onTreatmentObsChange(row, ti, $event)"
                               [disabled]="readOnly || row.savingTreatments" />
                        <button type="button" class="treat-remove"
                                *ngIf="!readOnly && row.treatments.length > 1"
                                (click)="removeTreatment(row, ti)" title="Quitar tratamiento">
                          <i class="bi bi-x-lg"></i>
                        </button>
                      </div>
                    </div>
                  </td>
                  <td class="col-fc">
                    <select class="form-select form-select-sm prevision-select"
                            [ngModel]="row.forecastTagCode || ''"
                            [ngModelOptions]="{ standalone: true }"
                            [style.color]="previsionColor(row)"
                            (ngModelChange)="onPrevisionChange(row, $event)"
                            [disabled]="readOnly || row.saving">
                      <option *ngIf="isUnknownPrevision(row)" [value]="row.forecastTagCode">
                        {{ row.forecastTagLabel || row.forecastTagCode }}
                      </option>
                      <option *ngFor="let p of previsionOptions" [value]="p.code"
                              [style.color]="p.color">
                        {{ p.display }}
                      </option>
                    </select>
                  </td>
                  <td class="col-gen">
                    <input type="text" class="form-control form-control-sm"
                           placeholder="Observaciones"
                           [value]="row.generalObservations"
                           (change)="onFieldChange(row, 'generalObservations', $event)"
                           [disabled]="readOnly || row.saving" />
                  </td>
                </tr>
                </ng-container>
              </tbody>
            </table>
          </div>

        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    .med-page {
      font-family: 'Plus Jakarta Sans', 'Archivo', sans-serif;
      background: radial-gradient(120% 120% at 50% 0%, #f4f8fa 0%, #ffffff 55%);
      min-height: 100%;
      padding-bottom: 24px;
    }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px 20px; gap: 12px; background: #fff;
      border-bottom: 1px solid #eaf1f4;
      box-shadow: 0 2px 10px rgba(0,44,64,0.04);
      position: relative;
    }
    /* Filete verde Sphaira bajo la cabecera */
    .page-header::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
      background: linear-gradient(90deg, #31b270 0%, #002c40 100%);
    }
    .header-center { text-align: center; flex: 1; }
    .table-title {
      margin: 0; font-weight: 800; color: #002c40; font-size: 1.45rem;
      display: inline-flex; align-items: center; justify-content: center;
      letter-spacing: -0.01em;
    }
    .table-title i { color: #31b270; }
    .header-subtitle { margin: 5px 0 0; color: #6c8089; font-size: 0.92rem; text-transform: capitalize; font-weight: 500; }
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
      display: flex; flex-wrap: wrap; gap: 16px; align-items: end;
      padding: 16px 18px; background: #fff; border: 1px solid #e9eef1; border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,44,64,0.06);
      margin-top: 18px;
    }
    .filter-block { display: flex; flex-direction: column; gap: 5px; }
    .filter-label {
      font-size: 0.72rem; color: #6c8089; font-weight: 700;
      text-transform: uppercase; letter-spacing: .05em;
    }
    .filter-date { max-width: 180px; border-radius: 10px; }
    .filter-date:focus { border-color: #31b270; box-shadow: 0 0 0 3px rgba(49,178,112,.15); }
    .actions-block { flex-direction: row; gap: 8px; }
    .actions-block .btn { white-space: nowrap; }

    .btn-sphaira {
      background: linear-gradient(135deg, #002c40 0%, #0a4d3a 100%);
      color: #fff; border: 0; padding: 6px 14px; border-radius: 999px; font-weight: 700;
    }
    .btn-sphaira:hover { filter: brightness(1.1); color: #fff; }
    .btn-sphaira:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Botón Sphaira secundario (contorno navy, icono verde) */
    .btn-sphaira-outline {
      display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
      background: #fff; color: #002c40; border: 1.5px solid #002c40;
      padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 0.875rem;
      cursor: pointer; transition: all .15s ease; line-height: 1.4;
    }
    .btn-sphaira-outline i { color: #31b270; transition: color .15s ease; }
    .btn-sphaira-outline:hover:not(:disabled) {
      background: #002c40; color: #fff;
      box-shadow: 0 6px 16px rgba(0,44,64,0.18); transform: translateY(-1px);
    }
    .btn-sphaira-outline:hover:not(:disabled) i { color: #fff; }
    .btn-sphaira-outline:disabled { opacity: 0.5; cursor: not-allowed; }

    .kpi-block { flex-direction: row; gap: 8px; align-items: center; flex-wrap: wrap; }
    .kpi {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 13px; border-radius: 999px; font-size: 0.92rem; font-weight: 800;
      box-shadow: 0 2px 6px rgba(0,44,64,0.06);
    }
    .kpi-blue { background: #e6f0ff; color: #1a4ec3; }
    .kpi-green { background: #c4e8d6; color: #15663f; }
    .kpi-gray { background: #eef2f4; color: #51606a; }

    .empty-state {
      padding: 48px 16px; text-align: center; color: #6c757d;
      background: #fff; border-radius: 12px; margin-top: 16px;
    }
    .pro-disabled { padding: 64px 16px; }

    .readonly-banner {
      margin-top: 16px; padding: 10px 14px; border-radius: 10px;
      background: #fff8e1; color: #8a5d00; font-size: 0.92rem;
      border: 1px solid #f1d572;
      display: flex; align-items: center; gap: 8px;
    }

    /* Barra de ordenación */
    .diario-sort-toolbar {
      display: flex; align-items: center; flex-wrap: wrap; gap: 10px;
      margin-top: 16px;
    }
    .diario-sort-toolbar .sort-label {
      font-size: 0.82rem; font-weight: 600; color: #6c8089;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .diario-sort-toolbar .sort-options { display: inline-flex; flex-wrap: wrap; gap: 6px; }
    .diario-sort-toolbar .sort-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px; border-radius: 999px; cursor: pointer;
      font-size: 0.82rem; font-weight: 600; color: #002c40;
      background: #f1f5f7; border: 1px solid #e2e9ec; transition: all .15s ease;
    }
    .diario-sort-toolbar .sort-btn:hover { background: #eafaf1; border-color: #cdeede; }
    .diario-sort-toolbar .sort-btn.active {
      background: #31b270; border-color: #31b270; color: #fff;
      box-shadow: 0 2px 8px rgba(49,178,112,.28);
    }
    .diario-sort-toolbar .sort-btn i { font-size: 0.85rem; }

    .med-table-wrapper {
      margin-top: 16px; background: #fff; border: 1px solid #e9eef1; border-radius: 16px; overflow-x: auto;
      box-shadow: 0 8px 24px rgba(0,44,64,0.06);
    }
    .med-table {
      width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1480px;
    }
    .med-table th, .med-table td {
      padding: 11px 12px; text-align: left; border-bottom: 1px solid #eef2f4;
      font-size: 0.86rem; vertical-align: middle;
    }
    .med-table thead th {
      background: #f1f5f7; font-weight: 800; color: #002c40;
      position: sticky; top: 0; z-index: 1; white-space: nowrap;
      text-transform: uppercase; font-size: 11px; letter-spacing: .04em;
      border-bottom: 2px solid #dde6ea;
    }
    .med-table tbody tr { transition: background .12s ease; }
    .med-table tbody tr:nth-child(even) { background: #fafcfd; }
    .med-table tbody tr:hover { background: #eafaf1; }
    .row-saving { background: #eaf4ff !important; }
    .row-error { background: #fdecec !important; }

    .col-name { min-width: 220px; }
    .col-state { width: 160px; }
    .col-fisio { width: 70px; text-align: center; }

    /* Checkbox "Fisio" redondo, grande y verde Sphaira */
    .col-fisio .form-check-input {
      width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid #b9c6cd; cursor: pointer; margin: 0;
      transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease;
      appearance: none; -webkit-appearance: none; background-color: #fff;
      vertical-align: middle;
    }
    .col-fisio .form-check-input:hover:not(:disabled) {
      border-color: #31b270; box-shadow: 0 0 0 4px rgba(49,178,112,.12);
    }
    .col-fisio .form-check-input:checked {
      background-color: #31b270; border-color: #31b270;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M3.5 8.5l3 3 6-7'/%3e%3c/svg%3e");
      background-size: 70% 70%; background-position: center; background-repeat: no-repeat;
    }
    .col-fisio .form-check-input:checked:hover:not(:disabled) {
      box-shadow: 0 0 0 4px rgba(49,178,112,.2);
    }
    .col-fisio .form-check-input:disabled { opacity: .5; cursor: not-allowed; }
    .col-zone { min-width: 180px; }
    .col-treat { min-width: 200px; width: 230px; max-width: 230px; }
    .col-tobs { min-width: 220px; }
    .col-fc { min-width: 230px; }
    .prevision-select { min-width: 210px; font-weight: 600; }
    .col-gen { min-width: 220px; }

    /* Columna "Trabajo realizado" (idéntica a Readaptación, datos compartidos) */
    .col-work { min-width: 170px; width: 200px; max-width: 220px; vertical-align: top; }
    .work-dropdown { position: relative; }
    .work-toggle {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
      width: 100%; min-width: 150px; background: #fff; border: 1px solid #ced4da;
      border-radius: 6px; padding: 5px 10px; cursor: pointer; color: #002c40; font-weight: 600; font-size: 0.85rem;
      text-align: left;
    }
    .work-toggle:hover:not(:disabled) { border-color: #31b270; }
    .work-toggle:disabled { opacity: 0.6; cursor: not-allowed; }
    .work-toggle .bi-chevron-down { flex-shrink: 0; margin-top: 3px; }
    .work-summary { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 4px; color: #636363; }
    .work-summary.work-empty { display: block; color: #9aa6ad; }
    .work-chip {
      display: inline-block; background: #eaf6ef; color: #15663f; border: 1px solid #cfe9da;
      border-radius: 999px; padding: 2px 8px; font-size: 0.72rem; font-weight: 700; line-height: 1.35;
      white-space: normal; word-break: break-word;
    }
    .work-menu {
      position: fixed; z-index: 1050; min-width: 220px;
      background: #fff; border: 1px solid #e3e9ed; border-radius: 10px; padding: 8px;
      box-shadow: 0 8px 24px rgba(0, 44, 64, 0.16); max-height: 320px; overflow-y: auto;
    }
    .work-opt { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; color: #002c40; }
    .work-opt:hover { background: #f1f8f4; }
    .work-group { border-bottom: 1px solid #eef1f3; }
    .work-group:last-child { border-bottom: 0; }
    .work-group-head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      width: 100%; background: none; border: 0; cursor: pointer; text-align: left;
      padding: 8px; border-radius: 8px; color: #002c40; font-weight: 700; font-size: 0.82rem;
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

    /* Tratamientos apilados (varios por jugador) */
    .col-zone, .col-treat, .col-tobs { vertical-align: top; }
    .treat-stack { display: flex; flex-direction: column; gap: 8px; }
    .treat-line { height: 31px; }
    .treat-obs-line { display: flex; align-items: center; gap: 4px; }
    .treat-obs-line .treat-line { flex: 1; }
    .treat-remove {
      flex: 0 0 auto; width: 26px; height: 26px; border-radius: 6px;
      border: 1px solid #f3c2bd; background: #fdecea; color: #b1231b;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 0.7rem; line-height: 1; padding: 0;
    }
    .treat-remove:hover { background: #f9d9d4; }
    .treat-add {
      align-self: flex-start; margin-top: 2px;
      display: inline-flex; align-items: center; gap: 5px;
      border: 1px dashed #9fd9bb; background: #f1faf5; color: #1d8a3a;
      border-radius: 7px; padding: 4px 10px; font-size: 0.74rem; font-weight: 700;
      cursor: pointer;
    }
    .treat-add:hover { background: #e3f5ec; }
    .treat-add i { font-size: 0.72rem; }

    /* Desplegable multi-selección de "Tratamiento" (checkboxes) */
    .treat-multi-wrap { position: relative; }
    .treat-multi {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;
      width: 100%; min-height: 31px; background: #fff; border: 1px solid #ced4da; border-radius: 6px;
      padding: 4px 8px; cursor: pointer; color: #374151; font-size: 0.86rem; font-weight: 600;
      text-align: left;
    }
    .treat-multi:hover:not(:disabled) { border-color: #31b270; }
    .treat-multi:disabled { opacity: 0.6; cursor: not-allowed; }
    /* Las técnicas elegidas se apilan verticalmente (la fila crece hacia abajo). */
    .treat-multi-summary {
      flex: 1; min-width: 0; display: flex; flex-direction: column;
      align-items: flex-start; gap: 4px;
    }
    .treat-chip {
      max-width: 100%; display: inline-block; background: #c4e8d6; color: #15663f;
      border: 1px solid #9fd9bb; border-radius: 999px; padding: 1px 9px;
      font-size: 0.75rem; font-weight: 700; line-height: 1.4;
      white-space: normal; word-break: break-word;
    }
    .treat-multi .treat-placeholder {
      display: block; color: #6c757d; font-weight: 500; align-self: center;
    }
    .treat-multi .bi-chevron-down { flex-shrink: 0; font-size: 0.7rem; color: #6c8089; margin-top: 4px; }

    .treat-menu {
      position: fixed; z-index: 1050; min-width: 240px; background: #fff;
      border: 1px solid #e3e9ed; border-radius: 10px; padding: 6px;
      box-shadow: 0 8px 24px rgba(0, 44, 64, 0.16); max-height: 340px; overflow-y: auto;
    }
    .treat-subhead {
      font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
      color: #6c8089; padding: 8px 8px 3px;
    }
    .treat-opt {
      display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 7px;
      cursor: pointer; font-size: 0.85rem; color: #002c40; margin: 0;
    }
    .treat-opt:hover { background: #eafaf1; }
    /* Checkbox redondo verde Sphaira (igual que el de "Fisio"). */
    .treat-opt input {
      appearance: none; -webkit-appearance: none;
      width: 19px; height: 19px; border-radius: 50%;
      border: 2px solid #b9c6cd; background-color: #fff; cursor: pointer; flex-shrink: 0;
      transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease;
    }
    .treat-opt input:hover { border-color: #31b270; box-shadow: 0 0 0 3px rgba(49,178,112,.12); }
    .treat-opt input:checked {
      background-color: #31b270; border-color: #31b270;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M3.5 8.5l3 3 6-7'/%3e%3c/svg%3e");
      background-size: 68% 68%; background-position: center; background-repeat: no-repeat;
    }

    .player-cell { display: flex; align-items: center; gap: 10px; }
    .avatar-mini {
      width: 32px; height: 32px; border-radius: 50%; overflow: hidden;
      background: #c4e8d6; display: flex; align-items: center; justify-content: center;
      color: #15663f; flex-shrink: 0;
    }
    .avatar-mini img { width: 100%; height: 100%; object-fit: cover; }
    .player-info { display: flex; flex-direction: column; gap: 2px; }
    .player-name { font-weight: 700; color: #002c40; }
    .player-meta { font-size: 0.78rem; color: #6c757d; }

    .team-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .team-tag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.7rem; font-weight: 700; line-height: 1;
      padding: 2px 7px; border-radius: 999px;
      background: #c4e8d6; color: #002c40; white-space: nowrap;
    }
    .team-tag i { font-size: 0.66rem; }

    /* Drag & drop de filas */
    .col-drag { width: 34px; text-align: center; padding-left: 6px; padding-right: 0; }
    .drag-handle {
      color: #adb5bd; cursor: grab; font-size: 1.05rem;
    }
    .drag-handle:hover { color: #31b270; }
    tr.cdk-drag-preview { box-shadow: none; }
    .drag-preview {
      display: inline-flex; align-items: center; gap: 8px;
      background: #002c40; color: #fff; font-weight: 700;
      padding: 8px 14px; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      font-family: 'Archivo', sans-serif; font-size: 0.9rem;
    }
    .cdk-drag-placeholder { opacity: 0.4; background: #eaf6ef; }
    .cdk-drag-animating { transition: transform 200ms cubic-bezier(0, 0, 0.2, 1); }
    .med-table tbody.cdk-drop-list-dragging tr:not(.cdk-drag-placeholder) {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 8px; border-radius: 999px; font-size: 0.78rem;
      font-weight: 700; border: 1px solid transparent; white-space: nowrap;
    }
    .badge-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; }

    /* Desplegable de Estado */
    .col-state { width: 200px; }
    .status-select { min-width: 180px; font-weight: 600; }

    /* Indicador de modo del día (partido/entreno) en la cabecera */
    .day-mode {
      display: inline-flex; align-items: center; gap: 4px;
      margin-left: 6px; padding: 1px 7px; border-radius: 999px;
      font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.02em; background: #eef2f4; color: #002c40;
      vertical-align: middle;
    }
    .day-mode.is-match { background: #c4e8d6; color: #1d8a3a; }
    .day-mode i { font-size: 0.7rem; }

    /* Badge de fase de lesión junto al nombre */
    .phase-badge {
      display: inline-flex; align-items: center; gap: 3px;
      margin-left: 6px; padding: 1px 7px; border-radius: 999px;
      font-size: 0.66rem; font-weight: 700; white-space: nowrap;
      vertical-align: middle;
    }
    .phase-badge i { font-size: 0.66rem; }
    .phase-badge.phase-low  { background: #fdecea; color: #b1231b; border: 1px solid #f3c2bd; }
    .phase-badge.phase-high { background: #c4e8d6; color: #1d8a3a; border: 1px solid #9fd9bb; }

    /* Fila divisora: jugadores en recuperación (fase 1-3) */
    tr.group-divider td {
      background: #f4f4f4; color: #636363;
      font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.03em; padding: 6px 12px;
      border-top: 2px solid #e2e6e9;
    }
    tr.group-divider td i { color: #b1231b; margin-right: 4px; }
    tr.row-recovering { background: #fcf6f5; }

    /* Fila divisora: jugadores de otros equipos (invitados) */
    tr.group-divider--guest td {
      background: #eef4f7; color: #002c40;
      border-top: 2px solid #cfdbe2;
    }
    tr.group-divider--guest td i { color: #31b270; }

    /* Badge "Invitado" junto al nombre */
    .guest-badge {
      display: inline-flex; align-items: center; gap: 3px;
      margin-left: 6px; padding: 1px 7px; border-radius: 999px;
      font-size: 0.66rem; font-weight: 700; white-space: nowrap;
      vertical-align: middle; background: #e6f0ff; color: #1a4ec3;
      border: 1px solid #c5d8f7;
    }
    .guest-badge i { font-size: 0.64rem; }

    /* Botón "Jugadores" + desplegable de equipos/jugadores */
    .players-btn .bi-chevron-down { font-size: 0.7rem; }
    .players-btn.is-open { background: #002c40; color: #fff; }
    .players-btn.is-open i { color: #fff; }

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
    .players-loading.sm, .players-empty.sm { padding: 8px 10px; font-size: 0.8rem; }

    .guest-team { border-bottom: 1px solid #f1f5f7; }
    .guest-team:last-child { border-bottom: 0; }
    .guest-team-head {
      display: flex; align-items: center; gap: 8px; width: 100%;
      background: transparent; border: 0; padding: 9px 8px; cursor: pointer;
      font-size: 0.9rem; font-weight: 700; color: #002c40; text-align: left;
      border-radius: 8px;
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
    /* Checkbox redondo verde Sphaira (mismo estilo que "Fisio" / tratamiento). */
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

    @media (max-width: 768px) {
      .page-header-spacer { display: none; }
      .filter-block { width: 100%; }
      .filter-date { max-width: 100%; }
      .actions-block { width: 100%; }
    }
  `]
})
export class DiarioMedicoEquipoComponent implements OnInit, OnDestroy {

  /** Marcador en notas para identificar las citas de fisio generadas desde el
   *  diario (permite borrarlas al desmarcar sin tocar citas creadas a mano). */
  private static readonly FISIO_MARKER = 'Generada automáticamente desde el diario médico';
  /** Hora centinela para citas "del día" sin hora concreta (HH:mm requerido por el backend). */
  private static readonly FISIO_ALLDAY_TIME = '00:00';

  teamId = 0;
  teamName = '';
  clubId = 0;
  userId = 0;
  profileId = 0;
  registeredByName: string | null = null;

  dateIso = this.todayIso();
  loading = false;
  downloadingPdf = false;
  disabledByMaster = false;

  rows: DiarioRow[] = [];
  totalPlayers = 0;
  playersAttended = 0;

  /**
   * Modo de ordenación de la tabla:
   *   - `manual`: orden personalizado (drag & drop) persistido por usuario.
   *   - `name` / `position` / `number`: ordenación automática. En todos los
   *     modos automáticos se respeta el agrupado por equipo (primero los
   *     jugadores del equipo anfitrión, luego los invitados/filial) y se
   *     mantiene el bloque "en recuperación" al final.
   */
  sortMode: 'manual' | 'name' | 'position' | 'number' = 'manual';
  /** Orden manual (ids en el orden que devuelve el backend o tras drag&drop). */
  private manualOrder: number[] = [];

  /** true = el día visualizado es partido (MD); false = entrenamiento. */
  isMatchDay = false;

  /** Siguiente sesión (para la columna "Previsión"). */
  nextSession: { date: string; isMatchDay: boolean } | null = null;

  /** Catálogo de previsión según el tipo de la SIGUIENTE sesión. */
  get previsionOptions(): PrevisionOption[] {
    return this.nextSession?.isMatchDay ? PREVISION_MATCH : PREVISION_TRAINING;
  }

  private findPrevisionOption(code: string): PrevisionOption | undefined {
    return this.previsionOptions.find(o => o.code === code);
  }

  /** Color del código de previsión guardado (para teñir el desplegable). */
  previsionColor(row: DiarioRow): string {
    return this.findPrevisionOption(row.forecastTagCode || '')?.color ?? '#374151';
  }

  /** El código de previsión guardado no existe en el catálogo actual. */
  isUnknownPrevision(row: DiarioRow): boolean {
    const code = row.forecastTagCode || '';
    return !!code && !this.previsionOptions.some(o => o.code === code);
  }

  /** Texto de ayuda sobre la siguiente sesión (cabecera de la columna). */
  get nextSessionLabel(): string {
    if (!this.nextSession) return 'Sin sesión futura';
    const d = new Date(this.nextSession.date + 'T00:00:00');
    const fecha = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${this.nextSession.isMatchDay ? 'Partido' : 'Entreno'} · ${fecha}`;
  }

  /** Catálogo de estado activo según partido/entrenamiento. */
  get statusOptions(): StatusOption[] {
    return this.isMatchDay ? MATCH_STATUS : TRAINING_STATUS;
  }

  /** Opciones de estado fuera del grupo "FC" (van directas en el select). */
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
  isUnknownStatus(row: DiarioRow): boolean {
    const code = row.statusTagCode || '';
    return !!code && !this.statusOptions.some(o => o.code === code);
  }

  /**
   * Estado del día sugerido para un jugador en recuperación, derivado de la
   * fase RTP de su lesión activa (el "calendario" de la lesión). Se usa solo
   * como valor POR DEFECTO cuando el jugador aún no tiene estado guardado para
   * el día; el fisio puede sobreescribirlo. Depende de si el día es de partido
   * o de entrenamiento, porque los catálogos de estado difieren:
   *   - Entreno: fase 1-3 (jugador en recuperación) → LS (Lesionado),
   *              4 → LS-RTP (return to play), 5 → D-RTC (return to competición).
   *   - Partido: hasta el alta competitiva (fase 5) el jugador va fuera de
   *              convocatoria por lesión (FC-LS); en fase 5 → D (disponible).
   */
  private injuryDefaultStatusCode(phase: number): string {
    if (phase < 1 || phase > 5) return '';
    if (this.isMatchDay) {
      return phase >= 5 ? 'D' : 'FC-LS';
    }
    switch (phase) {
      // Fases 1-3 = jugador en recuperación → por defecto "Lesionado".
      case 1:
      case 2:
      case 3: return 'LS';
      case 4: return 'LS-RTP';
      case 5: return 'D-RTC';
      default: return '';
    }
  }

  /**
   * Previsión (disponibilidad prevista para la SIGUIENTE sesión) sugerida a
   * partir de la fase RTP de la lesión. Depende de si la siguiente sesión es
   * partido o entrenamiento. Igual que {@link injuryDefaultStatusCode}, es
   * solo un valor por defecto para jugadores en recuperación sin previsión
   * guardada.
   */
  private injuryDefaultForecastCode(phase: number): string {
    if (phase < 1 || phase > 5) return '';
    if (this.nextSession?.isMatchDay) {
      return phase >= 5 ? 'D' : 'ND-LS';
    }
    switch (phase) {
      case 1:
      case 2: return 'LS';
      case 3: return 'EM';
      case 4: return 'LS-RTP';
      case 5: return 'D-RTC';
      default: return '';
    }
  }

  /**
   * Texto del badge de un jugador invitado: el/los equipo(s) de origen a los
   * que pertenece (p. ej. "Real Murcia Juvenil"). Si por algún motivo no se
   * conoce el equipo, cae a "Invitado".
   */
  guestBadgeLabel(row: DiarioRow): string {
    return row.otherTeams && row.otherTeams.length ? row.otherTeams.join(' · ') : 'Invitado';
  }

  /** Tooltip del badge de invitado. */
  guestBadgeTitle(row: DiarioRow): string {
    return row.otherTeams && row.otherTeams.length
      ? 'Jugador invitado · pertenece a ' + row.otherTeams.join(', ')
      : 'Jugador invitado de otro equipo';
  }

  phaseTitle(phase: number): string {
    switch (phase) {
      case 1: return 'Fase 1 · Control clínico inicial';
      case 2: return 'Fase 2 · Recuperación funcional';
      case 3: return 'Fase 3 · RTT (return to train)';
      case 4: return 'Fase 4 · RTP (return to play)';
      case 5: return 'Fase 5 · RTC (return to competición)';
      default: return '';
    }
  }

  /**
   * ¿La fila `i` es la primera del grupo "en recuperación" (fase 1-3)?
   * Solo aplica al bloque del equipo anfitrión: los invitados se agrupan en su
   * propia sección aunque estén en recuperación.
   */
  isFirstRecovering(i: number): boolean {
    const cur = this.rows[i];
    if (!cur || cur.guest || !this.isRecovering(cur)) return false;
    const prev = this.rows[i - 1];
    return i === 0 || !prev || prev.guest || !this.isRecovering(prev);
  }

  /** ¿La fila `i` es la primera del grupo de invitados (otros equipos)? */
  isFirstGuest(i: number): boolean {
    const cur = this.rows[i];
    if (!cur || !cur.guest) return false;
    const prev = this.rows[i - 1];
    return i === 0 || !prev || !prev.guest;
  }

  private isRecovering(row: DiarioRow): boolean {
    return row.injuryPhase >= 1 && row.injuryPhase <= 3;
  }

  /** Grupos del desplegable de tratamiento (para la plantilla). */
  treatmentGroups = TREATMENT_GROUPS;

  /** Clave (`playerId-index`) de la línea cuyo menú de tratamiento está abierto. */
  openTreatKey: string | null = null;

  /** Posición calculada del menú flotante (position: fixed) para no recortarse. */
  treatMenuPos: { top: number; left: number; width: number; maxHeight: number } | null = null;

  /** Mapa `code → label` para resolver la etiqueta al guardar. */
  private treatmentLabelByCode = new Map<string, string>(
    TREATMENT_GROUPS.flatMap(g => g.options).map(o => [o.code, o.label])
  );

  trackByTreatment(index: number): number {
    return index;
  }

  /** Id del jugador cuyo menú de "trabajo realizado" está abierto (uno a la vez). */
  openWorkRowId: number | null = null;
  /** Código del grupo abierto dentro del menú (acordeón). */
  openWorkGroup: string | null = null;
  /** Posición calculada del menú flotante de "trabajo realizado". */
  workMenuPos: { top: number; left: number; width: number; maxHeight: number } | null = null;
  /** Lookup código → etiqueta para construir el resumen de chips. */
  private workLabelByCode = new Map<string, string>();

  /**
   * Catálogo "Trabajo realizado" (idéntico al de la pantalla Readaptación).
   * Los códigos elegidos se persisten como CSV en `readaptacion_daily.work_done`.
   */
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

  private readonly destroy$ = new Subject<void>();
  private modules: ClubModules | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private clubService: ClubService,
    private teamService: TeamService,
    private playerService: PlayerService,
    private clubModulesService: ClubModulesService,
    private medicalDiaryService: MedicalDiaryService,
    private appointmentService: MedicalAppointmentService,
    private readaptacionService: ReadaptacionService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.workGroups.forEach(g => g.items.forEach(it => {
      if (it.code) this.workLabelByCode.set(it.code, it.label);
    }));
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────

  ngOnInit(): void {
    // La fecha puede venir del Panel diario (?date=YYYY-MM-DD) para que el
    // diario médico se abra en el mismo día que se estaba viendo allí. Si no
    // llega, se mantiene hoy por defecto.
    const qpDate = this.route.snapshot.queryParamMap.get('date');
    if (qpDate && /^\d{4}-\d{2}-\d{2}$/.test(qpDate)) {
      this.dateIso = qpDate;
    }
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.teamId = Number(params.get('teamId') ?? 0);
      this.loadTeamName();
      this.bootstrap();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Carga el nombre del equipo (equipo principal del diario) para mostrarlo bajo cada jugador. */
  private loadTeamName(): void {
    if (!this.teamId) return;
    this.teamService.getTeamById(String(this.teamId)).pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp: any) => {
        this.teamName = resp?.data?.name || resp?.data?.nombre || '';
        this.cdr.markForCheck();
      },
      error: () => { /* sin nombre de equipo: se mantiene el comportamiento previo */ }
    });
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────

  /** Acceso de solo lectura (entrenador). */
  get readOnly(): boolean {
    return this.profileId === 2;
  }

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
            this.loadDiary();
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

  // ─── Carga / refresh ──────────────────────────────────────────────────

  private loadDiary(): void {
    if (!this.teamId) return;
    this.loading = true;
    this.cdr.markForCheck();

    this.medicalDiaryService.getTeamDiary(this.teamId, this.dateIso, this.userId || undefined).subscribe({
      next: (payload) => {
        this.totalPlayers = payload?.totalPlayers ?? 0;
        this.playersAttended = payload?.playersAttended ?? 0;
        this.isMatchDay = !!payload?.isMatchDay;
        this.nextSession = payload?.nextSession
          ? { date: payload.nextSession.date, isMatchDay: !!payload.nextSession.isMatchDay }
          : null;
        // El backend ya devuelve los jugadores en el orden personalizado del
        // usuario (drag & drop) o, en su defecto, alfabético.
        this.rows = (payload?.entries ?? []).map(e => this.toRow(e));
        // Los jugadores en lesión fase 1-3 se hunden al final de la lista.
        this.partitionByInjury();
        // Guardamos este orden como el "manual" de referencia (drag & drop) y
        // aplicamos el modo de ordenación activo (si es automático, reordena).
        this.manualOrder = this.rows.map(r => r.playerId);
        this.applySort();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.error?.msg;
        if (msg === 'PROFESSIONAL_MODE_DISABLED') {
          this.disabledByMaster = true;
        } else {
          this.notification.error('No se ha podido cargar el diario médico.', false);
        }
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private toRow(entry: MedicalDiaryEntry): DiarioRow {
    const p = entry.player;
    const s = entry.status;
    const fullName = (p.fullName && p.fullName.trim())
      || `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim()
      || `Jugador #${p.playerId}`;

    const injuryPhase = Number(p.injuryPhase ?? 0) || 0;

    // Estado / previsión que el fisio haya guardado para el día.
    let statusTagCode = s?.statusTagCode ?? null;
    let statusTagLabel = s?.statusTagLabel ?? null;
    let statusColor = s?.statusColor ?? null;
    let forecastTagCode = s?.forecastTagCode ?? '';

    // Jugador en recuperación (con lesión activa y fase RTP) SIN estado propio
    // del día: se propone automáticamente el estado y la previsión según la
    // fase de la lesión (calendario RTP). Es solo un valor por defecto en
    // pantalla —no se persiste hasta que el fisio edite algo—, así que al
    // recargar se vuelve a derivar de la lesión, quedando siempre al día.
    if (injuryPhase >= 1) {
      if (!statusTagCode) {
        const defCode = this.injuryDefaultStatusCode(injuryPhase);
        const opt = defCode ? this.findStatusOption(defCode) : undefined;
        if (opt) {
          statusTagCode = opt.code;
          statusTagLabel = opt.label;
          statusColor = opt.color;
        }
      }
      if (!forecastTagCode) {
        forecastTagCode = this.injuryDefaultForecastCode(injuryPhase);
      }
    }

    return {
      playerId: p.playerId,
      fullName,
      numero: p.numero ?? null,
      posicion: p.posicion ?? null,
      picturePlayer: p.picturePlayer ?? null,
      otherTeams: Array.isArray(p.otherTeams) ? p.otherTeams.filter(Boolean) : [],
      injuryPhase,
      statusTagCode,
      statusTagLabel,
      statusColor,
      attendedPhysio: !!s?.attendedPhysio,
      workDoneCodes: this.parseWorkDone(entry.workDone),
      savingWork: false,
      treatments: this.toTreatmentRows(entry.treatments),
      forecastTagCode,
      generalObservations: s?.generalObservations ?? '',
      guest: !!p.guest,
      dailyStatusId: s?.dailyStatusId,
      saving: false,
      errored: false
    };
  }

  /**
   * Convierte los tratamientos del backend en líneas editables, reagrupando
   * las filas con la misma zona y observación en una sola línea multi-selección
   * (acumulando sus códigos). Garantiza al menos una línea vacía.
   */
  private toTreatmentRows(list: MedicalDiaryTreatment[] | null | undefined): TreatmentRow[] {
    const lines: TreatmentRow[] = [];
    const byKey = new Map<string, TreatmentRow>();
    for (const t of (list ?? [])) {
      const zone = t.zone ?? '';
      const observations = t.observations ?? '';
      const code = (t.code ?? '').trim();
      const key = zone + '\u0000' + observations;
      let line = byKey.get(key);
      if (!line) {
        line = { zone, codes: [], observations };
        byKey.set(key, line);
        lines.push(line);
      }
      if (code && !line.codes.includes(code)) line.codes.push(code);
    }
    return lines.length ? lines : [this.emptyTreatment()];
  }

  private emptyTreatment(): TreatmentRow {
    return { zone: '', codes: [], observations: '' };
  }

  /** Parsea el CSV de códigos de "trabajo realizado" en un array limpio. */
  private parseWorkDone(csv: string | null | undefined): string[] {
    if (!csv) return [];
    return csv.split(',').map(c => c.trim()).filter(Boolean);
  }

  reload(): void {
    if (!this.teamId) return;
    this.loadDiary();
  }

  onDateChange(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    if (v) {
      this.dateIso = v;
      this.loadDiary();
    }
  }

  // ─── Reordenar jugadores (drag & drop, persistente) ────────────────────

  /**
   * Reordena la fila arrastrada y persiste el nuevo orden en el backend para
   * el usuario actual. El orden queda guardado de forma permanente.
   */
  onRowDrop(event: CdkDragDrop<DiarioRow[]>): void {
    // El drag & drop solo tiene sentido en modo manual; en los modos de
    // ordenación automática la tabla se recoloca sola.
    if (this.dragDisabled || event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.rows, event.previousIndex, event.currentIndex);
    // Mantener a los jugadores en recuperación (fase 1-3) al final de la lista.
    this.partitionByInjury();
    this.manualOrder = this.rows.map(r => r.playerId);
    this.cdr.markForCheck();
    this.persistOrder();
  }

  /**
   * Ordenación estable en dos niveles, conservando el orden relativo dentro de
   * cada grupo:
   *   1) Jugadores del equipo anfitrión antes que los invitados (otros equipos).
   *   2) Dentro de cada grupo, los que están en recuperación (fase 1-3) al final.
   */
  private partitionByInjury(): void {
    this.rows.sort((a, b) => {
      const g = (a.guest ? 1 : 0) - (b.guest ? 1 : 0);
      if (g !== 0) return g;
      return (this.isRecovering(a) ? 1 : 0) - (this.isRecovering(b) ? 1 : 0);
    });
  }

  // ─── Ordenación de la tabla (manual / nombre / posición / dorsal) ───────

  /** El drag & drop está deshabilitado en solo lectura o en modo automático. */
  get dragDisabled(): boolean {
    return this.readOnly || this.sortMode !== 'manual';
  }

  /** Cambia el modo de ordenación y recoloca las filas. */
  setSort(mode: 'manual' | 'name' | 'position' | 'number'): void {
    if (this.sortMode === mode) return;
    this.sortMode = mode;
    this.applySort();
    this.cdr.markForCheck();
  }

  /**
   * Aplica el modo de ordenación activo sobre {@link rows}. En `manual` se
   * restaura el orden guardado (drag & drop). En los modos automáticos se
   * ordena manteniendo el agrupado por equipo (anfitrión antes que invitados)
   * y el bloque "en recuperación" al final.
   */
  private applySort(): void {
    if (this.sortMode === 'manual') {
      const idx = new Map(this.manualOrder.map((id, i) => [id, i] as [number, number]));
      this.rows.sort((a, b) =>
        (idx.get(a.playerId) ?? Number.MAX_SAFE_INTEGER) -
        (idx.get(b.playerId) ?? Number.MAX_SAFE_INTEGER));
      return;
    }
    const cmp = this.rowFieldComparator(this.sortMode);
    this.rows.sort((a, b) => {
      // 1) Jugadores del equipo anfitrión antes que invitados (otros equipos).
      const g = (a.guest ? 1 : 0) - (b.guest ? 1 : 0);
      if (g !== 0) return g;
      // 2) Dentro de cada grupo, los que están en recuperación (fase 1-3) al final.
      const rec = (this.isRecovering(a) ? 1 : 0) - (this.isRecovering(b) ? 1 : 0);
      if (rec !== 0) return rec;
      // 3) Campo elegido.
      return cmp(a, b);
    });
  }

  /** Comparador del campo elegido (nombre, posición o dorsal). */
  private rowFieldComparator(mode: 'name' | 'position' | 'number'): (a: DiarioRow, b: DiarioRow) => number {
    if (mode === 'name') {
      return (a, b) => this.compareName(a, b);
    }
    if (mode === 'number') {
      return (a, b) => {
        const da = this.dorsalValue(a.numero);
        const db = this.dorsalValue(b.numero);
        if (da !== db) return da - db;
        return this.compareName(a, b);
      };
    }
    // position
    return (a, b) => {
      const ra = this.positionZoneRank(a.posicion);
      const rb = this.positionZoneRank(b.posicion);
      if (ra !== rb) return ra - rb;
      return this.compareName(a, b);
    };
  }

  private compareName(a: DiarioRow, b: DiarioRow): number {
    return (a.fullName || '').localeCompare(b.fullName || '', undefined, {
      sensitivity: 'base',
      numeric: true
    });
  }

  /** Valor numérico del dorsal para ordenar (sin dorsal → al final). */
  private dorsalValue(numero: string | null): number {
    const n = parseInt((numero || '').replace(/\D+/g, ''), 10);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  }

  /**
   * Rango de zona por posición (portero → defensa → centro → ataque). Se basa
   * en palabras clave del nombre de la posición. Posiciones no reconocidas van
   * al final.
   */
  private positionZoneRank(pos: string | null): number {
    const p = (pos || '').toLowerCase();
    if (!p) return 5;
    if (p.includes('porter') || p.includes('meta') || p === 'gk') return 0;
    if (p.includes('defens') || p.includes('lateral') || p.includes('central') || p.includes('carriler')) return 1;
    if (p.includes('medio') || p.includes('centrocampista') || p.includes('pivote') || p.includes('interior') || p.includes('mediapunta') || p.includes('volante')) return 2;
    if (p.includes('delanter') || p.includes('extremo') || p.includes('punta') || p.includes('ariete') || p.includes('atacante')) return 3;
    return 4;
  }

  private persistOrder(): void {
    if (!this.teamId || !this.userId) return;
    const playerIds = this.rows.map(r => r.playerId);
    this.medicalDiaryService.savePlayerOrder(this.teamId, this.userId, playerIds).subscribe({
      next: () => { /* orden guardado */ },
      error: () => {
        this.notification.error('No se ha podido guardar el nuevo orden.', false);
      }
    });
  }

  // ─── Edición ──────────────────────────────────────────────────────────

  onPhysioChange(row: DiarioRow, ev: Event): void {
    if (this.readOnly) return;
    const checked = (ev.target as HTMLInputElement).checked;
    row.attendedPhysio = checked;
    this.persist(row, { attendedPhysio: checked });
    // Además de guardar el flag en el diario, sincronizamos una cita de
    // fisioterapia en la Agenda médica para ese jugador y fecha: se crea al
    // marcar y se elimina al desmarcar. La cita es editable después desde la
    // agenda (hora/duración/observaciones).
    if (checked) {
      this.createFisioAppointment(row);
    } else {
      this.removeFisioAppointment(row);
    }
  }

  /**
   * Crea una cita de Fisioterapia "del día" (sin hora concreta) en la Agenda
   * médica para el jugador de la fila, en la fecha visualizada. Se marca con
   * {@link DiarioMedicoEquipoComponent.FISIO_MARKER} en notas para poder
   * localizarla y borrarla al desmarcar. El backend exige `startTime` en
   * formato HH:mm, así que usamos `00:00` como centinela de "todo el día".
   */
  private createFisioAppointment(row: DiarioRow): void {
    if (!this.teamId || !this.clubId) return;
    const body: AppointmentUpsert = {
      teamId: this.teamId,
      clubId: this.clubId,
      playerId: row.playerId,
      professionalUserId: this.userId || null,
      professionalName: this.registeredByName || null,
      appointmentDate: this.dateIso,
      startTime: DiarioMedicoEquipoComponent.FISIO_ALLDAY_TIME,
      durationMin: 30,
      kind: 'PHYSIO',
      subject: 'Fisioterapia',
      notes: this.buildFisioNotes(row),
      status: 'SCHEDULED'
    };
    this.appointmentService.create(body).subscribe({
      next: () => {},
      error: () => this.notification.error(
        'No se pudo crear la cita de fisioterapia en la agenda médica.', false)
    });
  }

  /**
   * Construye el texto de notas de la cita de fisioterapia volcando el detalle
   * de la sesión del diario (zona tratada, tratamiento y observaciones de cada
   * tratamiento, más las observaciones generales del jugador). La primera línea
   * es el marcador {@link DiarioMedicoEquipoComponent.FISIO_MARKER} para poder
   * localizar y sincronizar/borrar la cita auto-generada.
   */
  private buildFisioNotes(row: DiarioRow): string {
    const lines: string[] = [DiarioMedicoEquipoComponent.FISIO_MARKER];

    const items = (row.treatments || []).filter(t =>
      (t.zone && t.zone.trim()) ||
      t.codes.length > 0 ||
      (t.observations && t.observations.trim()));

    if (items.length) {
      lines.push('', 'Sesión de fisioterapia:');
      for (const t of items) {
        const zone = (t.zone || '').trim();
        const treat = this.treatSummary(t);
        const obs = (t.observations || '').trim();
        let line = '• ';
        if (zone) line += zone;
        if (zone && treat) line += ' — ';
        if (treat) line += treat;
        if (!zone && !treat) line += '(sin detalle)';
        if (obs) line += ` (${obs})`;
        lines.push(line);
      }
    }

    const general = (row.generalObservations || '').trim();
    if (general) {
      lines.push('', `Observaciones: ${general}`);
    }

    return lines.join('\n');
  }

  /**
   * Si la fila tiene una cita de fisioterapia auto-generada para esta fecha,
   * actualiza sus notas con el detalle actual de la sesión. Se invoca cuando el
   * fisio cambia tratamientos/observaciones de un jugador ya marcado como
   * atendido, para que la agenda refleje siempre lo último.
   */
  private syncFisioAppointmentNotes(row: DiarioRow): void {
    if (!this.teamId || !row.attendedPhysio) return;
    this.appointmentService.getByTeamAndDate(this.teamId, this.dateIso).subscribe({
      next: (bundle) => {
        const target = (bundle?.appointments || []).find(a =>
          a.playerId === row.playerId &&
          a.kind === 'PHYSIO' &&
          (a.notes || '').includes(DiarioMedicoEquipoComponent.FISIO_MARKER));
        if (!target) return;
        this.appointmentService
          .update(target.appointmentId, { notes: this.buildFisioNotes(row) })
          .subscribe();
      },
      error: () => {}
    });
  }

  /**
   * Elimina la(s) cita(s) de fisioterapia generadas automáticamente desde el
   * diario para el jugador de la fila en la fecha visualizada (las que llevan
   * el marcador en notas). No toca citas de fisioterapia creadas a mano en la
   * agenda.
   */
  private removeFisioAppointment(row: DiarioRow): void {
    if (!this.teamId) return;
    this.appointmentService.getByTeamAndDate(this.teamId, this.dateIso).subscribe({
      next: (bundle) => {
        const targets = (bundle?.appointments || []).filter(a =>
          a.playerId === row.playerId &&
          a.kind === 'PHYSIO' &&
          (a.notes || '').includes(DiarioMedicoEquipoComponent.FISIO_MARKER));
        targets.forEach(a => this.appointmentService.delete(a.appointmentId).subscribe());
      },
      error: () => {}
    });
  }

  /**
   * Setter genérico para los campos de texto del estado del jugador
   * (actualmente solo "Observaciones" → generalObservations).
   */
  onFieldChange(
    row: DiarioRow,
    key: 'generalObservations',
    ev: Event
  ): void {
    if (this.readOnly) return;
    const v = (ev.target as HTMLInputElement).value ?? '';
    if (v === (row as any)[key]) return;
    (row as any)[key] = v;
    this.persist(row, { [key]: v });
    if (key === 'generalObservations') this.syncFisioAppointmentNotes(row);
  }

  // ─── Tratamientos (varios por jugador) ─────────────────────────────────

  addTreatment(row: DiarioRow): void {
    if (this.readOnly) return;
    row.treatments.push(this.emptyTreatment());
    this.cdr.markForCheck();
  }

  removeTreatment(row: DiarioRow, index: number): void {
    if (this.readOnly) return;
    row.treatments.splice(index, 1);
    if (!row.treatments.length) row.treatments.push(this.emptyTreatment());
    this.cdr.markForCheck();
    this.saveTreatments(row);
  }

  onTreatmentZoneChange(row: DiarioRow, index: number, ev: Event): void {
    if (this.readOnly) return;
    const v = (ev.target as HTMLInputElement).value ?? '';
    const t = row.treatments[index];
    if (!t || v === t.zone) return;
    t.zone = v;
    this.saveTreatments(row);
  }

  onTreatmentObsChange(row: DiarioRow, index: number, ev: Event): void {
    if (this.readOnly) return;
    const v = (ev.target as HTMLInputElement).value ?? '';
    const t = row.treatments[index];
    if (!t || v === t.observations) return;
    t.observations = v;
    this.saveTreatments(row);
  }

  // ─── Desplegable multi-selección de "Tratamiento" ──────────────────────

  /** Clave única de una línea de tratamiento (para saber qué menú está abierto). */
  private treatKey(row: DiarioRow, index: number): string {
    return row.playerId + '-' + index;
  }

  /** ¿Está abierto el menú de tratamiento de esta línea? */
  isTreatMenuOpen(row: DiarioRow, index: number): boolean {
    return this.openTreatKey === this.treatKey(row, index);
  }

  /** Resumen legible (etiquetas separadas por coma) de los códigos elegidos. */
  treatSummary(t: TreatmentRow): string {
    return t.codes.map(c => this.treatmentLabelByCode.get(c) ?? c).join(', ');
  }

  /** Etiquetas de las técnicas seleccionadas (para pintarlas apiladas como chips). */
  selectedTreatLabels(t: TreatmentRow): string[] {
    return t.codes.map(c => this.treatmentLabelByCode.get(c) ?? c);
  }

  /** Abre/cierra el menú flotante de tratamientos de una línea concreta. */
  toggleTreatMenu(row: DiarioRow, index: number, ev: Event): void {
    ev.stopPropagation();
    if (this.readOnly || row.savingTreatments) return;
    const key = this.treatKey(row, index);
    if (this.openTreatKey === key) {
      this.openTreatKey = null;
      this.treatMenuPos = null;
      this.cdr.markForCheck();
      return;
    }
    this.openTreatKey = key;
    const btn = ev.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = Math.max(rect.width, 240);
    let left = rect.left;
    const vw = window.innerWidth;
    if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const maxHeight = Math.max(180, Math.min(340, spaceBelow));
    this.treatMenuPos = { top: rect.bottom + 4, left, width, maxHeight };
    this.cdr.markForCheck();
  }

  /** Marca/desmarca un código en una línea y persiste (el menú sigue abierto). */
  onTreatToggle(row: DiarioRow, index: number, code: string, ev: Event): void {
    if (this.readOnly) return;
    const checked = (ev.target as HTMLInputElement).checked;
    const t = row.treatments[index];
    if (!t) return;
    const set = new Set(t.codes);
    if (checked) set.add(code); else set.delete(code);
    t.codes = Array.from(set);
    this.saveTreatments(row);
  }

  // ─── Trabajo realizado (readaptación, fuente compartida) ──────────────
  /** ¿Está abierto el menú de "trabajo realizado" de esta fila? */
  isWorkMenuOpen(row: DiarioRow): boolean {
    return this.openWorkRowId === row.playerId;
  }

  /** Etiquetas de los trabajos seleccionados (chips apilables). */
  selectedWorkLabels(row: DiarioRow): string[] {
    return row.workDoneCodes.map(c => this.workLabelByCode.get(c) || c);
  }

  /** Nº de opciones seleccionadas dentro de un grupo (para el badge). */
  groupWorkCount(row: DiarioRow, g: WorkGroup): number {
    return g.items.reduce((n, it) => n + (it.code && row.workDoneCodes.includes(it.code) ? 1 : 0), 0);
  }

  /** Abre/cierra el menú flotante de "trabajo realizado" de una fila. */
  toggleWorkMenu(row: DiarioRow, ev: Event): void {
    ev.stopPropagation();
    if (this.readOnly || row.savingWork) return;
    if (this.openWorkRowId === row.playerId) {
      this.openWorkRowId = null;
      this.workMenuPos = null;
      this.cdr.markForCheck();
      return;
    }
    // Cerrar el menú de tratamiento si estuviera abierto.
    this.openTreatKey = null;
    this.treatMenuPos = null;
    this.openWorkRowId = row.playerId;
    this.openWorkGroup = null;
    const btn = ev.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = Math.max(rect.width, 240);
    let left = rect.left;
    const vw = window.innerWidth;
    if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const maxHeight = Math.max(180, Math.min(340, spaceBelow));
    this.workMenuPos = { top: rect.bottom + 4, left, width, maxHeight };
    this.cdr.markForCheck();
  }

  /** Abre/cierra un grupo del acordeón dentro del menú. */
  toggleWorkGroup(code: string, ev: Event): void {
    ev.stopPropagation();
    this.openWorkGroup = this.openWorkGroup === code ? null : code;
    this.cdr.markForCheck();
  }

  /** Marca/desmarca un código y persiste en readaptación (fuente compartida). */
  onWorkToggle(row: DiarioRow, code: string, ev: Event): void {
    if (this.readOnly) return;
    const checked = (ev.target as HTMLInputElement).checked;
    const set = new Set(row.workDoneCodes);
    if (checked) set.add(code); else set.delete(code);
    row.workDoneCodes = Array.from(set);
    this.persistWork(row);
  }

  /**
   * Guarda el "trabajo realizado" en el parte de readaptación del jugador
   * para la fecha. Es la MISMA tabla que usa la pantalla de Readaptación, así
   * que lo marcado aquí aparece allí (y viceversa).
   */
  private persistWork(row: DiarioRow): void {
    if (this.readOnly || !this.teamId || !this.clubId) return;
    row.savingWork = true;
    this.cdr.markForCheck();
    this.readaptacionService.save(row.playerId, this.dateIso, {
      teamId: this.teamId,
      clubId: this.clubId,
      workDone: row.workDoneCodes.join(',')
    }).pipe(takeUntil(this.destroy$)).subscribe(() => {
      row.savingWork = false;
      this.cdr.markForCheck();
    });
  }

  /**
   * Persiste la lista completa de tratamientos del jugador (reemplazo total).
   * Cada línea con varias técnicas se EXPANDE en una fila por técnica
   * (compartiendo zona y observación), respetando los límites de longitud de
   * las columnas del backend. Las líneas sin técnica pero con zona u
   * observación se conservan como una fila sin código.
   */
  private saveTreatments(row: DiarioRow): void {
    if (this.readOnly || !this.teamId || !this.clubId) return;
    row.savingTreatments = true;
    this.cdr.markForCheck();
    const treatments: MedicalDiaryTreatment[] = [];
    for (const t of row.treatments) {
      const zone = t.zone || null;
      const observations = t.observations || null;
      if (t.codes.length === 0) {
        if (zone || observations) {
          treatments.push({ zone, code: null, label: null, observations });
        }
      } else {
        for (const code of t.codes) {
          treatments.push({
            zone,
            code,
            label: this.treatmentLabelByCode.get(code) ?? null,
            observations
          });
        }
      }
    }
    this.medicalDiaryService.saveTreatments(row.playerId, this.dateIso, {
      teamId: this.teamId,
      clubId: this.clubId,
      treatments
    }).subscribe({
      next: () => {
        row.savingTreatments = false;
        this.syncFisioAppointmentNotes(row);
        this.cdr.markForCheck();
      },
      error: () => {
        row.savingTreatments = false;
        this.notification.error('No se han podido guardar los tratamientos.', false);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cambia la previsión del jugador para la siguiente sesión. Reutiliza los
   * campos `forecastTag*`. Al guardar, el backend autocompleta la
   * disponibilidad (Estado) del jugador en la fecha de la siguiente sesión.
   */
  onPrevisionChange(row: DiarioRow, code: string): void {
    if (this.readOnly) return;
    const opt = this.findPrevisionOption(code);
    row.forecastTagCode = code;
    this.persist(row, {
      forecastTagCode: code || null,
      forecastTagLabel: opt && code ? opt.label : null
    });
  }

  /**
   * Cambia el estado del jugador. Las opciones dependen de si el día es de
   * partido o de entrenamiento. Persiste código, etiqueta y color.
   */
  onStatusChange(row: DiarioRow, code: string): void {
    if (this.readOnly) return;
    const opt = this.findStatusOption(code);
    row.statusTagCode = code || null;
    row.statusTagLabel = opt && code ? opt.label : null;
    row.statusColor = opt && code ? opt.color : null;
    this.persist(row, {
      statusTagCode: code || null,
      statusTagLabel: opt && code ? opt.label : null,
      statusColor: opt && code ? opt.color : null
    });
  }

  /**
   * Aplica un upsert PATCH al backend con sólo el campo cambiado +
   * los identificadores. Marca la fila como saving y revierte si falla.
   */
  private persist(row: DiarioRow, patch: Partial<MedicalDiaryStatus>): void {
    row.saving = true;
    row.errored = false;
    this.cdr.markForCheck();

    const body: Partial<MedicalDiaryStatus> = {
      ...patch,
      teamId: this.teamId,
      clubId: this.clubId
    };
    if (this.userId) body.registeredByUserId = this.userId;
    if (this.registeredByName) body.registeredByName = this.registeredByName;

    this.medicalDiaryService.upsertPlayerDiary(row.playerId, this.dateIso, body).subscribe({
      next: (saved) => {
        row.saving = false;
        if (saved?.dailyStatusId) row.dailyStatusId = saved.dailyStatusId;
        // Recalcular KPI "atendidos" sobre el set local. No
        // refrescamos la tabla entera para no perder lo que el
        // usuario está escribiendo en otras celdas.
        this.recomputeKpis();
        this.cdr.markForCheck();
      },
      error: (err) => {
        row.saving = false;
        row.errored = true;
        const msg = err?.error?.error?.msg;
        if (msg === 'PROFESSIONAL_MODE_DISABLED') {
          this.disabledByMaster = true;
        } else {
          this.notification.error('No se ha podido guardar el cambio.', false);
        }
        this.cdr.markForCheck();
      }
    });
  }

  private recomputeKpis(): void {
    let attended = 0;
    for (const r of this.rows) {
      const hasTreatment = r.treatments.some(t =>
        (t.zone && t.zone.trim()) || t.codes.length > 0 || (t.observations && t.observations.trim()));
      if (r.attendedPhysio || hasTreatment) {
        attended++;
      }
    }
    this.playersAttended = attended;
  }

  // ─── Desplegable "Jugadores" (invitados de otros equipos) ──────────────

  /** Menú "Jugadores" abierto. */
  playersMenuOpen = false;
  /** Posición del menú flotante (position: fixed). */
  playersMenuPos: { top: number; left: number; width: number; maxHeight: number } | null = null;
  /** Equipos del fisio (acordeón). Se cargan al abrir el menú por primera vez. */
  guestTeams: GuestTeam[] = [];
  private guestTeamsLoaded = false;
  loadingGuestTeams = false;
  /** true mientras se añade/quita un invitado (bloquea los checkboxes). */
  guestBusy = false;

  /** Abre/cierra el menú "Jugadores". Carga los equipos en la primera apertura. */
  togglePlayersMenu(ev: Event): void {
    ev.stopPropagation();
    if (this.readOnly) return;
    // Cerrar el menú de tratamiento si estuviera abierto.
    this.openTreatKey = null;
    this.treatMenuPos = null;

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

  /** Carga los equipos del fisio (todos los suyos en la temporada actual). */
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
            // En esta app el nombre visible del equipo es "categoría + nombre"
            // (p. ej. "Alevín A"); `name` a menudo viene vacío.
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

  /** El equipo es el del propio diario abierto (su plantilla ya está en la tabla). */
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

  /** Marca/desmarca un jugador: lo añade o quita como invitado del diario. */
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
          this.notification.success(`${player.fullName} añadido al diario.`, false);
          this.loadDiary();
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
          this.notification.success(`${player.fullName} quitado del diario.`, false);
          this.loadDiary();
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

  // ─── PDF ──────────────────────────────────────────────────────────────

  downloadPdf(): void {
    if (!this.teamId || this.rows.length === 0) return;
    this.downloadingPdf = true;
    this.cdr.markForCheck();

    this.medicalDiaryService.exportPdf(this.teamId, this.dateIso).subscribe({
      next: (blob) => {
        this.download(blob, `diario_medico_${this.dateIso}.pdf`);
        this.downloadingPdf = false;
        this.notification.success('PDF generado.', false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.downloadingPdf = false;
        this.notification.error('No se ha podido generar el PDF.', false);
        this.cdr.markForCheck();
      }
    });
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ─── Navegación ──────────────────────────────────────────────────────

  goBack(): void {
    this.location.back();
  }

  goAjustes(): void {
    this.router.navigate(['/dashboard/permisos-club']);
  }

  // ─── Utils ────────────────────────────────────────────────────────────

  /** Cierra el menú de tratamiento al hacer clic fuera, redimensionar o hacer scroll. */
  @HostListener('document:click')
  @HostListener('window:resize')
  @HostListener('window:scroll')
  onDocumentInteraction(): void {
    let changed = false;
    if (this.openTreatKey) {
      this.openTreatKey = null;
      this.treatMenuPos = null;
      changed = true;
    }
    if (this.openWorkRowId !== null) {
      this.openWorkRowId = null;
      this.openWorkGroup = null;
      this.workMenuPos = null;
      changed = true;
    }
    if (this.playersMenuOpen) {
      this.playersMenuOpen = false;
      this.playersMenuPos = null;
      changed = true;
    }
    if (changed) this.cdr.markForCheck();
  }

  trackByPlayer(_: number, row: DiarioRow): number {
    return row.playerId;
  }

  get formattedDate(): string {
    const d = new Date(this.dateIso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  private todayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }
}
