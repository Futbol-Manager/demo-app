import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { ClubModulesService, ClubModules } from 'src/app/core/services/club/club-modules.service';
import { PanelDiarioService, PanelDiarioPayload } from 'src/app/core/services/panel-diario/panel-diario.service';
import { TrainingScheduleService, ScheduleBundle } from 'src/app/core/services/training-schedule/training-schedule.service';
import { getSelectedSeason } from 'src/app/core/utils/season.utils';
import { statusColor, statusLabelByCode } from 'src/app/dashboard/diario-medico/diario-medico-equipo.component';
import { ActivityScheduleService, ActivityScheduleBundle } from 'src/app/core/services/activity-schedule/activity-schedule.service';
import { MaterialService } from 'src/app/core/services/material/material.service';

interface ComboTeam {
  teamId: number;
  name: string;
  categoryName?: string;
}

/**
 * Pantalla "Panel diario" (Fase 2.1 - Modo Profesional).
 *
 * Vista unificada para el cuerpo técnico que reúne en una sola pantalla
 * el estado del día del equipo: microciclo (MD-X / MD+Y), partido si lo hay,
 * wellness, disponibilidad (10 códigos), RPE, lesionados activos y diario
 * médico (resumen). Cada card enlaza a su pantalla específica para el
 * detalle/edición.
 *
 * Visibilidad controlada por el master toggle `professionalModeEnabled`:
 * si el club no lo tiene activo, el endpoint devuelve 403 y la pantalla
 * muestra un estado vacío amable redirigiendo al admin a "Permisos del club".
 *
 * Rutas:
 *   - /dashboard/panel-diario          (obliga a elegir equipo)
 *   - /dashboard/panel-diario/:teamId  (carga directo con HOY como fecha)
 */
@Component({

  selector: 'app-panel-diario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-page">
      <div class="page-header">
        <div class="back-container">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="page-title">
            <i class="bi bi-calendar-event me-2"></i>Panel diario
          </h2>
          <p class="page-subtitle" *ngIf="payload?.teamName">
            {{ payload?.teamName }} · {{ formatHumanDate(selectedDate) }}
          </p>
          <p class="page-subtitle" *ngIf="!payload?.teamName">Vista del día del cuerpo técnico</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-report" *ngIf="!loading && payload && !disabledByMaster"
                  (click)="goInformeDiario()" title="Generar un informe diario editable con los datos del día">
            <i class="bi bi-file-earmark-medical"></i>
            <span>Generar informe</span>
          </button>
        </div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Selector equipo + fecha -->
        <div class="filters-bar" *ngIf="!disabledByMaster">
          <div class="filter-group filter-group--team" *ngIf="teams.length > 1 || !selectedTeamId">
            <label class="filter-label">Equipo</label>
            <select class="form-select form-select-sm" [value]="selectedTeamId || ''" (change)="onTeamChange($event)">
              <option value="" disabled>Elige un equipo…</option>
              <option *ngFor="let t of teams" [value]="t.teamId">{{ t.name }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Fecha</label>
            <div class="date-controls">
              <button class="date-nav" (click)="changeDate(-1)" [disabled]="loading" title="Día anterior">
                <i class="bi bi-chevron-left"></i>
              </button>
              <input type="date" class="form-control form-control-sm date-input"
                     [value]="selectedDate"
                     (change)="onDateChange($event)" />
              <button class="date-nav" (click)="changeDate(1)" [disabled]="loading" title="Día siguiente">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary ms-2" (click)="goToday()" [disabled]="loading">
                Hoy
              </button>
            </div>
          </div>
        </div>

        <!-- Master toggle OFF (clubes base) -->
        <div *ngIf="disabledByMaster" class="empty-state empty-warn">
          <i class="bi bi-shield-lock display-5 mb-2"></i>
          <h4>El "Modo Profesional" no está activo</h4>
          <p class="mb-3">
            Esta vista forma parte del paquete de gestión diaria para clubes profesionales.
            Si quieres usarla, actívala desde
            <a href="javascript:void(0)" (click)="goPermisos()"><strong>Permisos del club &rsaquo; Modo Profesional</strong></a>.
          </p>
          <p class="text-soft mb-0">Por defecto está desactivado para no afectar a clubes base.</p>
        </div>

        <!-- Loading -->
        <div *ngIf="loading && !disabledByMaster" class="empty-state">
          <div class="spinner-border spinner-sphaira" role="status"></div>
          <p class="mt-2 mb-0 text-soft">Cargando panel diario…</p>
        </div>

        <!-- Sin equipo seleccionado -->
        <div *ngIf="!loading && !selectedTeamId && !disabledByMaster" class="empty-state">
          <i class="bi bi-people display-5 mb-2"></i>
          <p>Elige un equipo para ver el panel del día.</p>
        </div>

        <!-- Error -->
        <div *ngIf="!loading && errorMessage && !disabledByMaster" class="empty-state empty-warn">
          <i class="bi bi-exclamation-triangle display-5 mb-2"></i>
          <p>{{ errorMessage }}</p>
        </div>

        <!-- Panel cargado -->
        <div *ngIf="!loading && payload && !disabledByMaster" class="panel-grid">

          <!-- Microciclo -->
          <div class="panel-card panel-card--microcycle is-clickable"
               (click)="goMicrociclos()" role="button" tabindex="0"
               (keydown.enter)="goMicrociclos()" (keydown.space)="goMicrociclos()">
            <div class="card-head">
              <div class="card-icon icon-mc"><i class="bi bi-diagram-3"></i></div>
              <h4 class="card-title">Microciclo</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <ng-container *ngIf="payload.microcycle?.present; else mcEmpty">
                <div class="md-pill">
                  <span class="md-pill__label">{{ payload.microcycle.day?.mdLabel || '—' }}</span>
                  <span class="md-pill__type">{{ formatDayType(payload.microcycle.day?.dayType) }}</span>
                </div>
                <div class="mc-name text-truncate">{{ payload.microcycle.name }}</div>
                <div class="mc-extra" *ngIf="payload.microcycle.matchDate">
                  <i class="bi bi-flag"></i> Partido {{ formatHumanDate(payload.microcycle.matchDate || '') }}
                </div>
              </ng-container>
              <ng-template #mcEmpty>
                <p class="text-soft mb-0">No hay microciclo activo este día.</p>
              </ng-template>
            </div>
          </div>

          <!-- Partido del día -->
          <div class="panel-card panel-card--match" *ngIf="payload.match?.present">
            <div class="card-head">
              <div class="card-icon icon-match"><i class="bi bi-trophy"></i></div>
              <h4 class="card-title">Partido de hoy</h4>
            </div>
            <div class="card-body">
              <div class="match-row">
                <span class="match-rival">vs {{ payload.match.rivalName || 'Rival' }}</span>
                <span class="badge" [ngClass]="payload.match.isHome ? 'bg-success' : 'bg-secondary'"
                      *ngIf="payload.match.isHome !== null && payload.match.isHome !== undefined">
                  {{ payload.match.isHome ? 'Casa' : 'Fuera' }}
                </span>
              </div>
              <div class="match-extra">
                {{ payload.match.tipoPartido || 'Partido' }}
                <span *ngIf="payload.match.hora">· {{ payload.match.hora }}<span *ngIf="payload.match.minutos">:{{ payload.match.minutos }}</span></span>
              </div>
              <div class="match-place text-truncate" *ngIf="payload.match.lugar">
                <i class="bi bi-geo-alt"></i> {{ payload.match.lugar }}
              </div>
            </div>
          </div>

          <!-- Horarios (Fase 2.3) -->
          <div class="panel-card panel-card--sched is-clickable"
               (click)="goHorarios()" role="button" tabindex="0"
               (keydown.enter)="goHorarios()" (keydown.space)="goHorarios()">
            <div class="card-head">
              <div class="card-icon icon-sched"><i class="bi bi-clock-fill"></i></div>
              <h4 class="card-title">Horarios</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <!-- Fisio (profileId 6): horarios fijos de activity_schedule_times. -->
              <ng-container *ngIf="profileId === 6; else coachSched">
                <ng-container *ngIf="fisioScheduleSummary() as fs">
                  <div class="sched-head" *ngIf="fs.count > 0">
                    {{ fs.count }} horarios
                  </div>
                  <ul class="sched-mini" *ngIf="fs.count > 0">
                    <li *ngFor="let it of fisioScheduleItems()">
                      <span class="sched-mini__lbl">{{ it.label }}</span>
                      <span class="sched-mini__time">{{ it.time }}</span>
                    </li>
                  </ul>
                  <p class="text-soft mb-0" *ngIf="fs.count === 0">
                    Sin horarios para hoy. Defínelos en la pantalla de Horarios.
                  </p>
                </ng-container>
              </ng-container>
              <!-- Resto de perfiles: bloques libres del editor de horario. -->
              <ng-template #coachSched>
                <ng-container *ngIf="scheduleSummary() as s">
                  <div class="big-number" *ngIf="s.count > 0">{{ s.count }}</div>
                  <div class="big-number-label" *ngIf="s.count > 0">
                    bloques · {{ s.totalDurationMin }} min
                    <span *ngIf="s.range"> · {{ s.range }}</span>
                  </div>
                  <p class="text-soft mb-0" *ngIf="s.count === 0">
                    Sin bloques de horario para hoy. Crea o edita el horario en la sesión de entrenamiento.
                  </p>
                </ng-container>
              </ng-template>
            </div>
          </div>

          <!-- Wellness -->
          <div class="panel-card panel-card--well is-clickable"
               (click)="goWellness()" role="button" tabindex="0"
               (keydown.enter)="goWellness()" (keydown.space)="goWellness()">
            <div class="card-head">
              <div class="card-icon icon-well"><i class="bi bi-heart-pulse-fill"></i></div>
              <h4 class="card-title">Wellness</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <ng-container *ngIf="wellnessSummary() as w">
                <div class="big-fraction">
                  <span class="big-fraction__num">{{ w.responded }}</span>
                  <span class="big-fraction__sep">/</span>
                  <span class="big-fraction__den">{{ w.total }}</span>
                </div>
                <div class="big-number-label">han rellenado el wellness</div>
                <div class="well-grid">
                  <div class="well-chip well-chip--green" title="OK">
                    <i class="bi bi-check-circle-fill"></i> {{ w.green }}
                    <span class="well-chip__lbl">OK</span>
                  </div>
                  <div class="well-chip well-chip--yellow" title="Atención">
                    <i class="bi bi-exclamation-triangle-fill"></i> {{ w.yellow }}
                    <span class="well-chip__lbl">Atención</span>
                  </div>
                  <div class="well-chip well-chip--red" title="Alerta">
                    <i class="bi bi-exclamation-octagon-fill"></i> {{ w.red }}
                    <span class="well-chip__lbl">Alerta</span>
                  </div>
                  <div class="well-chip well-chip--pending" title="Sin rellenar">
                    <i class="bi bi-hourglass-split"></i> {{ w.pending }}
                    <span class="well-chip__lbl">Pendiente</span>
                  </div>
                </div>
              </ng-container>
            </div>
          </div>

          <!-- Disponibilidad -->
          <div class="panel-card panel-card--avail is-clickable"
               (click)="goDisponibilidad()" role="button" tabindex="0"
               (keydown.enter)="goDisponibilidad()" (keydown.space)="goDisponibilidad()">
            <div class="card-head">
              <div class="card-icon icon-avail"><i class="bi bi-people-fill"></i></div>
              <h4 class="card-title">Disponibilidad</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <ng-container *ngIf="availabilitySummary() as a">
                <div class="big-fraction">
                  <span class="big-fraction__num">{{ a.available }}</span>
                  <span class="big-fraction__sep">/</span>
                  <span class="big-fraction__den">{{ a.total }}</span>
                </div>
                <div class="big-number-label">disponibles hoy</div>
                <div class="avail-chips" *ngIf="payload.availability?.byCode?.length">
                  <span class="avail-chip" *ngFor="let b of payload.availability.byCode"
                        [style.background]="availColor(b.code)"
                        [title]="availLabel(b.code)">
                    <span class="avail-chip__count">{{ b.count }}</span>
                    <span class="avail-chip__lbl">{{ availLabel(b.code) }}</span>
                  </span>
                </div>
                <p class="text-soft mb-0" *ngIf="!payload.availability?.byCode?.length">
                  Sin parte registrado para este día.
                </p>
              </ng-container>
            </div>
          </div>

          <!-- Lesionados -->
          <div class="panel-card panel-card--inj is-clickable"
               (click)="goLesiones()" role="button" tabindex="0"
               (keydown.enter)="goLesiones()" (keydown.space)="goLesiones()">
            <div class="card-head">
              <div class="card-icon icon-inj"><i class="bi bi-bandaid-fill"></i></div>
              <h4 class="card-title">Lesionados activos</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <div class="sched-head">{{ payload.injuries?.totalActive || 0 }} jugadores</div>
              <ul class="inj-mini" *ngIf="payload.injuries?.entries?.length">
                <li *ngFor="let i of (payload.injuries.entries || [])">
                  <span class="inj-mini__name">
                    {{ i.playerName }}<span class="inj-mini__zone" *ngIf="i.zoneLabel || i.zone"> · {{ i.zoneLabel || formatZone(i.zone) }}</span>
                  </span>
                  <span class="rtp-pill" *ngIf="i.rtpPhase > 0" [attr.data-cat]="i.rtpCategory">
                    {{ rtpLabel(i.rtpCategory) }} · F{{ i.rtpPhase }}
                  </span>
                </li>
              </ul>
              <p class="text-soft mb-0" *ngIf="!(payload.injuries?.entries?.length)">
                Sin lesionados activos.
              </p>
            </div>
          </div>

          <!-- Readaptación -->
          <div class="panel-card panel-card--readap is-clickable"
               (click)="goReadaptacion()" role="button" tabindex="0"
               (keydown.enter)="goReadaptacion()" (keydown.space)="goReadaptacion()">
            <div class="card-head">
              <div class="card-icon icon-readap"><i class="bi bi-person-walking"></i></div>
              <h4 class="card-title">Readaptación</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <div class="big-number">{{ readaptCount() }}</div>
              <div class="big-number-label">en readaptación (baja competitiva)</div>
              <ul class="inj-mini" *ngIf="readaptList().length">
                <li *ngFor="let i of readaptList()">
                  <span class="inj-mini__name">
                    {{ i.playerName }}<span class="inj-mini__zone" *ngIf="i.zoneLabel || i.zone"> · {{ i.zoneLabel || formatZone(i.zone) }}</span>
                  </span>
                  <span class="rtp-pill" *ngIf="i.rtpPhase > 0" [attr.data-cat]="i.rtpCategory">
                    {{ rtpLabel(i.rtpCategory) }} · F{{ i.rtpPhase }}
                  </span>
                </li>
              </ul>
              <p class="text-soft mb-0" *ngIf="!readaptList().length">
                Sin jugadores en readaptación.
              </p>
            </div>
          </div>

          <!-- RPE -->
          <div class="panel-card panel-card--rpe is-clickable"
               (click)="goRpe()" role="button" tabindex="0"
               (keydown.enter)="goRpe()" (keydown.space)="goRpe()">
            <div class="card-head">
              <div class="card-icon icon-rpe"><i class="bi bi-lightning-charge-fill"></i></div>
              <h4 class="card-title">Carga sRPE</h4>
              <span class="card-link" *ngIf="selectedTeamId">Semanal <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <div class="rpe-grid" *ngIf="(payload.rpe?.submitted || 0) > 0; else rpeEmpty">
                <div class="rpe-stat">
                  <div class="rpe-stat__num">{{ payload.rpe.averageRpe || '—' }}</div>
                  <div class="rpe-stat__lbl">RPE medio</div>
                </div>
                <div class="rpe-stat">
                  <div class="rpe-stat__num">{{ payload.rpe.averageDuration || '—' }}'</div>
                  <div class="rpe-stat__lbl">Duración media</div>
                </div>
                <div class="rpe-stat">
                  <div class="rpe-stat__num">{{ payload.rpe.averageLoad || '—' }}</div>
                  <div class="rpe-stat__lbl">Carga sesión</div>
                </div>
              </div>
              <ng-template #rpeEmpty>
                <p class="text-soft mb-0">Aún no hay RPE registrado para este día.</p>
              </ng-template>
              <div class="rpe-foot" *ngIf="(payload.rpe?.submitted || 0) > 0">
                {{ payload.rpe.submitted }} jugador<span *ngIf="payload.rpe.submitted !== 1">es</span> han enviado RPE
              </div>
            </div>
          </div>

          <!-- Parte diario -->
          <div class="panel-card panel-card--med is-clickable"
               (click)="goDiarioMedico()" role="button" tabindex="0"
               (keydown.enter)="goDiarioMedico()" (keydown.space)="goDiarioMedico()">
            <div class="card-head">
              <div class="card-icon icon-med"><i class="bi bi-clipboard2-pulse-fill"></i></div>
              <h4 class="card-title">Parte diario</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <div class="big-number">{{ payload.medicalDiary?.playersAttended || 0 }}</div>
              <div class="big-number-label">tratados / observados</div>
              <ul class="med-list" *ngIf="payload.medicalDiary?.entries?.length">
                <li *ngFor="let m of (payload.medicalDiary.entries || []).slice(0, 4)">
                  <strong>{{ playerName(m.playerId) || ('Jugador #' + m.playerId) }}</strong>
                  <span class="text-soft" *ngIf="m.treatmentZone"> — {{ formatZone(m.treatmentZone) }}</span>
                  <span class="text-soft" *ngIf="m.treatmentDurationMin"> · {{ m.treatmentDurationMin }} min</span>
                </li>
                <li class="text-soft" *ngIf="(payload.medicalDiary.entries || []).length > 4">
                  + {{ payload.medicalDiary.entries.length - 4 }} más…
                </li>
              </ul>
              <p class="text-soft mb-0" *ngIf="!(payload.medicalDiary?.entries?.length)">
                Sin atenciones médicas registradas.
              </p>
            </div>
          </div>

          <!-- Agenda médica (Fase 2.4) -->
          <div class="panel-card panel-card--agenda is-clickable"
               (click)="goAgendaMedica()" role="button" tabindex="0"
               (keydown.enter)="goAgendaMedica()" (keydown.space)="goAgendaMedica()">
            <div class="card-head">
              <div class="card-icon icon-agenda"><i class="bi bi-calendar2-heart-fill"></i></div>
              <h4 class="card-title">Agenda médica</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <ng-container *ngIf="(payload.medicalAgenda?.totalUpcoming || 0) > 0; else agendaEmpty">
                <div class="big-number">{{ payload.medicalAgenda?.totalUpcoming || 0 }}</div>
                <div class="big-number-label">citas próximas</div>
                <ul class="agenda-list" *ngIf="payload.medicalAgenda?.entries?.length">
                  <li *ngFor="let a of (payload.medicalAgenda?.entries || []).slice(0, 4)">
                    <span class="agenda-kind" [attr.data-kind]="a.kind">
                      <i class="bi" [ngClass]="kindIcon(a.kind)"></i>
                      {{ kindLabel(a.kind) }}
                    </span>
                    <span class="agenda-when">
                      {{ formatHumanDate(a.appointmentDate || '') }}
                      <span *ngIf="a.startTime"> · {{ a.startTime }}</span>
                    </span>
                    <span class="agenda-player text-truncate" *ngIf="a.playerId">
                      <strong>{{ playerName(a.playerId) || ('Jugador #' + a.playerId) }}</strong>
                    </span>
                  </li>
                  <li class="text-soft" *ngIf="(payload.medicalAgenda?.entries || []).length > 4">
                    + {{ (payload.medicalAgenda?.totalUpcoming || 0) - 4 }} más…
                  </li>
                </ul>
              </ng-container>
              <ng-template #agendaEmpty>
                <p class="text-soft mb-0">No hay citas programadas próximas.</p>
              </ng-template>
            </div>
          </div>

          <!-- Material (alertas de stock / caducidad) -->
          <div class="panel-card panel-card--material is-clickable"
               (click)="goMaterial()" role="button" tabindex="0"
               (keydown.enter)="goMaterial()" (keydown.space)="goMaterial()">
            <div class="card-head">
              <div class="card-icon icon-material"><i class="bi bi-box-seam"></i></div>
              <h4 class="card-title">Material</h4>
              <span class="card-link" *ngIf="selectedTeamId">Detalle <i class="bi bi-arrow-right"></i></span>
            </div>
            <div class="card-body">
              <ng-container *ngIf="materialAlerts as ma; else matLoading">
                <ng-container *ngIf="ma.low > 0 || ma.expiring > 0; else matOk">
                  <div class="mat-alert-chips">
                    <span class="mat-chip mat-chip--low" *ngIf="ma.low > 0">
                      <i class="bi bi-exclamation-triangle-fill"></i> {{ ma.low }}
                      <span>bajo mínimo</span>
                    </span>
                    <span class="mat-chip mat-chip--soon" *ngIf="ma.expiring > 0">
                      <i class="bi bi-hourglass-split"></i> {{ ma.expiring }}
                      <span>caduca pronto</span>
                    </span>
                  </div>
                </ng-container>
                <ng-template #matOk>
                  <p class="mat-ok mb-0"><i class="bi bi-check-circle-fill"></i> Inventario al día</p>
                </ng-template>
                <div class="big-number-label" *ngIf="ma.total > 0">{{ ma.total }} artículos en inventario</div>
                <p class="text-soft mb-0" *ngIf="ma.total === 0">Aún no hay material registrado.</p>
              </ng-container>
              <ng-template #matLoading>
                <p class="text-soft mb-0">Cargando inventario…</p>
              </ng-template>
            </div>
          </div>

          <!-- Tareas de fuerza (placeholder, sin funcionalidad todavía) -->
          <div class="panel-card panel-card--strength">
            <div class="card-head">
              <div class="card-icon icon-strength"><i class="bi bi-activity"></i></div>
              <h4 class="card-title">Tareas de fuerza</h4>
            </div>
            <div class="card-body">
              <p class="text-soft mb-0">Próximamente.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════════════════
       SPHAIRA BRAND PALETTE (sphaira-brand-styles.mdc)
       Navy:           #002c40   Titulares, fondos primarios
       Green:          #31b270   Acento, botones secundarios
       Green light:    #c4e8d6   Fondos suaves de éxito
       Gray text:      #636363   Textos de cuerpo
       Bg highlight:   #f4f4f4   Fondos de secciones destacadas
       White:          #ffffff   Fondo principal
       --- Semánticos (semáforo médico, sin variantes Tailwind) ---
       Danger:         #b1231b   Riesgo / lesión activa
       Danger soft:    #fdecec
       Warning:        #b07b00   Atención / amber
       Warning soft:   #fff4dc
       --- Modo oscuro ---
       Navy deep:      #001e2e
       Navy deeper:    #00131c
       Navy line:      #00405c
       Dark muted:     #94a3b8
       Tipografía:     'Plus Jakarta Sans', system fallback
       Degradados de marca: SIEMPRE de #31b270 a #002c40
    ════════════════════════════════════════════════════════════════ */
    .panel-page {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f4f4f4;
      min-height: 100vh;
    }
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
      padding: 0.4rem 0.75rem; border-radius: 8px;
      cursor: pointer; transition: background .2s, transform .15s; font-weight: 600;
    }
    .btn-back-clean:hover { background: rgba(49, 178, 112, 0.18); color: #002c40; transform: translateX(-2px); }
    .page-header-spacer { width: 110px; }
    .page-header-actions { display: flex; justify-content: flex-end; min-width: 110px; }
    .btn-report {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%); color: #fff; border: 0;
      padding: 0.5rem 0.9rem; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 0.88rem;
      box-shadow: 0 6px 16px rgba(0, 44, 64, 0.18); transition: transform .15s ease, filter .15s ease;
      white-space: nowrap;
    }
    .btn-report:hover { filter: brightness(1.08); transform: translateY(-1px); color: #fff; }
    .btn-report i { font-size: 1rem; }
    /* Spinner de carga en verde de marca (en vez del azul Bootstrap). */
    .spinner-sphaira { color: #31b270; }

    .filters-bar {
      display: flex; gap: 16px; flex-wrap: wrap; padding: 16px 20px;
      background: #fff; border-radius: 12px; margin: 16px 0;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04);
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 160px; }
    /* El nombre del equipo puede ser largo (p. ej. "Real Murcia C.F. Primera RFEF"),
       así que el selector de equipo necesita más anchura y poder crecer para no
       recortar el texto. */
    .filter-group--team { min-width: 260px; flex: 1 1 260px; max-width: 420px; }
    .filter-label { font-size: 0.72rem; color: #636363; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-group .form-select {
      border: 1px solid #d4dde2; color: #002c40; font-weight: 500;
      width: 100%; text-overflow: ellipsis;
    }
    .filter-group .form-select:focus { border-color: #31b270; box-shadow: 0 0 0 0.2rem rgba(49, 178, 112, 0.15); }
    .date-controls { display: flex; gap: 6px; align-items: center; }
    .date-input {
      width: 150px; border: 1px solid #d4dde2; color: #002c40; font-weight: 500;
    }
    .date-input:focus { border-color: #31b270; box-shadow: 0 0 0 0.2rem rgba(49, 178, 112, 0.15); }
    .date-nav {
      background: #fff; border: 1px solid #d4dde2; border-radius: 8px;
      padding: 4px 10px; cursor: pointer; color: #002c40; transition: all 0.15s ease;
    }
    .date-nav:disabled { opacity: 0.5; cursor: not-allowed; }
    .date-nav:hover:not(:disabled) { background: #c4e8d6; border-color: #31b270; color: #002c40; }
    .filters-bar .btn-outline-primary {
      border-color: #31b270; color: #31b270; font-weight: 600;
    }
    .filters-bar .btn-outline-primary:hover { background: #31b270; border-color: #31b270; color: #fff; }

    .empty-state {
      padding: 48px 16px; text-align: center; color: #636363;
      background: #fff; border-radius: 12px; margin-top: 16px;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.04);
    }
    .empty-state i { color: #31b270; }
    .empty-warn { background: #fff4dc; border: 1px solid #f3dc99; color: #6d4f00; }
    .empty-warn i { color: #b07b00; }
    .empty-warn h4 { color: #002c40; margin-bottom: 8px; font-weight: 700; }
    .empty-warn a { color: #002c40; font-weight: 700; }
    .empty-warn a:hover { color: #31b270; }

    .panel-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      padding: 8px 0 32px 0;
    }
    .panel-card {
      background: #fff; border-radius: 14px; padding: 18px;
      box-shadow: 0 1px 3px rgba(0, 44, 64, 0.06);
      display: flex; flex-direction: column;
      border: 1px solid #eef1f3;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      position: relative; outline: none;
    }
    .panel-card.is-clickable {
      cursor: pointer; user-select: none;
    }
    .panel-card.is-clickable:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(0, 44, 64, 0.12);
      border-color: #c4e8d6;
    }
    .panel-card.is-clickable:focus-visible {
      box-shadow: 0 0 0 3px rgba(49, 178, 112, 0.35), 0 6px 18px rgba(0, 44, 64, 0.10);
    }
    .panel-card.is-clickable .card-link i { transition: transform .15s ease; }
    .panel-card.is-clickable:hover .card-link i { transform: translateX(3px); }
    .card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .card-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
    }
    .icon-mc     { background: rgba(0, 44, 64, 0.10);  color: #002c40; }
    .icon-match  { background: rgba(49, 178, 112, 0.15); color: #002c40; }
    .icon-avail  { background: #c4e8d6; color: #002c40; }
    .icon-rpe    { background: rgba(177, 35, 27, 0.10); color: #b1231b; }
    .icon-inj    { background: rgba(177, 35, 27, 0.10); color: #b1231b; }
    .icon-med    { background: #c4e8d6; color: #002c40; }
    .icon-well   { background: rgba(0, 44, 64, 0.10); color: #002c40; }
    .icon-sched  { background: rgba(0, 44, 64, 0.10); color: #002c40; }
    .icon-agenda { background: rgba(49, 178, 112, 0.15); color: #002c40; }
    .icon-readap { background: rgba(49, 178, 112, 0.15); color: #002c40; }
    .icon-material { background: rgba(0, 44, 64, 0.10); color: #002c40; }
    .icon-strength { background: rgba(49, 178, 112, 0.15); color: #002c40; }

    .card-title { margin: 0; font-weight: 700; color: #002c40; flex: 1; font-size: 1rem; }
    .card-link {
      color: #31b270; text-decoration: none; font-size: 0.82rem; cursor: pointer; font-weight: 600;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .card-link:hover { color: #002c40; text-decoration: underline; }
    .card-body { color: #636363; }

    .md-pill {
      display: inline-flex; align-items: baseline; gap: 8px;
      background: linear-gradient(135deg, #31b270 0%, #002c40 100%);
      color: #fff;
      padding: 6px 14px; border-radius: 999px; font-weight: 700;
      box-shadow: 0 2px 6px rgba(0, 44, 64, 0.18);
    }
    .md-pill__label { font-size: 1.05rem; }
    .md-pill__type { font-size: 0.78rem; font-weight: 500; opacity: 0.9; }
    .mc-name { margin-top: 10px; font-weight: 600; color: #002c40; }
    .mc-extra { margin-top: 6px; font-size: 0.86rem; color: #636363; }
    .mc-extra i { color: #31b270; margin-right: 4px; }

    .match-row { display: flex; align-items: center; gap: 8px; }
    .match-rival { font-weight: 700; color: #002c40; font-size: 1.05rem; }
    .match-row .badge.bg-success { background: #31b270 !important; }
    .match-row .badge.bg-secondary { background: #002c40 !important; }
    .match-extra { margin-top: 6px; font-size: 0.88rem; color: #636363; }
    .match-place { margin-top: 4px; font-size: 0.85rem; color: #636363; }
    .match-place i { color: #31b270; margin-right: 4px; }

    .big-number { font-size: 2rem; font-weight: 800; color: #002c40; line-height: 1; }
    .big-number-label { font-size: 0.85rem; color: #636363; margin-bottom: 12px; }

    /* Fracción grande (disponibles / total, respondidos / total) */
    .big-fraction {
      display: inline-flex; align-items: baseline; gap: 4px;
      font-weight: 800; color: #002c40; line-height: 1;
    }
    .big-fraction__num { font-size: 2.4rem; color: #002c40; }
    .big-fraction__sep { font-size: 1.6rem; color: #c4e8d6; font-weight: 700; }
    .big-fraction__den { font-size: 1.4rem; color: #636363; font-weight: 700; }

    /* Texto secundario unificado para evitar mezclar text-muted (Bootstrap)
       con tokens Sphaira. */
    .text-soft { color: #636363; }

    .sched-head { font-size: 0.9rem; font-weight: 700; color: #002c40; }
    .sched-mini {
      list-style: none; margin: 8px 0 0; padding: 0;
      display: flex; flex-direction: column; gap: 2px;
    }
    .sched-mini li {
      display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
      font-size: 0.74rem; color: #002c40; line-height: 1.35;
    }
    .sched-mini__lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .sched-mini__time { font-weight: 700; color: #002c40; font-variant-numeric: tabular-nums; }

    .avail-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .avail-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 11px 3px 3px; max-width: 100%;
      border-radius: 999px; color: #fff; font-size: 0.76rem; font-weight: 600;
    }
    .avail-chip__count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 20px; padding: 0 5px;
      background: rgba(255, 255, 255, 0.28); border-radius: 999px;
      font-weight: 800; font-size: 0.74rem; line-height: 1;
    }
    .avail-chip__lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .rpe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .rpe-stat {
      text-align: center; background: #f4f4f4; padding: 10px 8px; border-radius: 10px;
      border: 1px solid #eef1f3;
    }
    .rpe-stat__num { font-size: 1.4rem; font-weight: 800; color: #002c40; }
    .rpe-stat__lbl { font-size: 0.72rem; color: #636363; margin-top: 2px; }
    .rpe-foot { font-size: 0.82rem; margin-top: 8px; color: #636363; }

    .inj-list, .med-list { list-style: none; padding: 0; margin: 8px 0 0 0; font-size: 0.9rem; }
    .inj-list li, .med-list li { padding: 6px 0; border-bottom: 1px solid #eef1f3; color: #002c40; }
    .inj-list li .text-soft, .med-list li .text-soft { color: #636363; }
    .inj-list li:last-child, .med-list li:last-child { border-bottom: 0; }
    .rtp-pill {
      display: inline-block; margin-left: 6px; padding: 2px 8px; border-radius: 999px;
      font-size: 0.7rem; font-weight: 700; background: #fff4dc; color: #6d4f00;
    }
    .rtp-pill[data-cat="return_to_train"] { background: rgba(177, 35, 27, 0.10); color: #b1231b; }
    .rtp-pill[data-cat="return_to_play"] { background: rgba(176, 123, 0, 0.15); color: #6d4f00; }
    .rtp-pill[data-cat="return_to_competition"] { background: #c4e8d6; color: #002c40; }

    /* Lista compacta de lesionados (estilo "horarios"): cabe mucha gente. */
    .inj-mini { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .inj-mini li {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      font-size: 0.78rem; line-height: 1.3; padding: 2px 0;
    }
    .inj-mini__name {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-weight: 700; color: #002c40; min-width: 0;
    }
    .inj-mini__zone { font-weight: 500; color: #636363; }
    .inj-mini .rtp-pill { margin-left: 0; flex: 0 0 auto; }

    /* Resumen wellness en grid de 4 chips con label e icono claros */
    .well-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 8px; margin-top: 10px;
    }
    .well-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 12px; border-radius: 10px; font-weight: 800; font-size: 1rem;
      line-height: 1; border: 1px solid transparent;
    }
    .well-chip i { font-size: 0.95rem; }
    .well-chip__lbl {
      font-size: 0.72rem; font-weight: 700; margin-left: 4px;
      text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.85;
    }
    .well-chip--green   { background: #c4e8d6; color: #002c40; border-color: #a8dcc1; }
    .well-chip--yellow  { background: rgba(176, 123, 0, 0.15); color: #b07b00; border-color: rgba(176, 123, 0, 0.3); }
    .well-chip--red     { background: rgba(177, 35, 27, 0.12); color: #b1231b; border-color: rgba(177, 35, 27, 0.3); }
    .well-chip--pending { background: #f4f4f4; color: #636363; border-color: #d8d8d8; border-style: dashed; }

    .agenda-list { list-style: none; padding: 0; margin: 8px 0 0 0; font-size: 0.88rem; }
    .agenda-list li {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 6px 0; border-bottom: 1px solid #eef1f3; color: #002c40;
    }
    .agenda-list li:last-child { border-bottom: 0; }
    .agenda-kind {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 9px; border-radius: 999px;
      font-size: 0.7rem; font-weight: 800; background: #c4e8d6; color: #002c40;
      text-transform: uppercase; letter-spacing: 0.3px;
      border: 1px solid transparent;
    }
    .agenda-kind i { font-size: 0.82rem; }
    .agenda-kind[data-kind="PHYSIO"]     { background: rgba(49, 178, 112, 0.18); color: #002c40; border-color: rgba(49, 178, 112, 0.4); }
    .agenda-kind[data-kind="NUTRITION"]  { background: #c4e8d6; color: #002c40; border-color: #a8dcc1; }
    .agenda-kind[data-kind="MEDICAL"]    { background: rgba(177, 35, 27, 0.12); color: #b1231b; border-color: rgba(177, 35, 27, 0.35); }
    .agenda-kind[data-kind="RECOVERY"]   { background: rgba(0, 44, 64, 0.10); color: #002c40; border-color: rgba(0, 44, 64, 0.2); }
    .agenda-kind[data-kind="EVALUATION"] { background: rgba(176, 123, 0, 0.15); color: #b07b00; border-color: rgba(176, 123, 0, 0.35); }
    .agenda-kind[data-kind="OTHER"]      { background: #f4f4f4; color: #636363; border-color: #d8d8d8; }
    .agenda-when { font-size: 0.82rem; color: #636363; }
    .agenda-player { font-size: 0.82rem; max-width: 100%; color: #636363; }
    .agenda-player strong { color: #002c40; }

    /* Material: chips de alerta (stock bajo / caduca pronto) */
    .mat-alert-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
    .mat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 12px; border-radius: 10px; font-weight: 800; font-size: 1rem;
      line-height: 1; border: 1px solid transparent;
    }
    .mat-chip i { font-size: 0.95rem; }
    .mat-chip span { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.85; }
    .mat-chip--low  { background: rgba(177, 35, 27, 0.12); color: #b1231b; border-color: rgba(177, 35, 27, 0.3); }
    .mat-chip--soon { background: rgba(176, 123, 0, 0.15); color: #b07b00; border-color: rgba(176, 123, 0, 0.3); }
    .mat-ok { display: inline-flex; align-items: center; gap: 6px; color: #15663f; font-weight: 700; }
    .mat-ok i { color: #31b270; }

    @media (max-width: 640px) {
      .page-header-spacer { display: none; }
      .filters-bar { flex-direction: column; align-items: stretch; }
      .panel-grid { grid-template-columns: 1fr; }
    }

    /* ═══════════════════════════════════════════════════════
       DARK MODE
       Navy deep #001e2e (fondo), Navy deeper #00131c, navy line #00405c
       Acento verde Sphaira (#31b270), texto suave #94a3b8
       ═══════════════════════════════════════════════════════ */
    :host-context(body.dark) .panel-page { background: #00131c; }
    :host-context(body.dark) .page-header { background: #001e2e; border-bottom-color: #00405c; }
    :host-context(body.dark) .page-title { color: #c4e8d6; }
    :host-context(body.dark) .page-subtitle { color: #94a3b8; }
    :host-context(body.dark) .btn-back-clean {
      background: rgba(49, 178, 112, 0.14); color: #c4e8d6;
    }
    :host-context(body.dark) .btn-back-clean:hover {
      background: rgba(49, 178, 112, 0.22); color: #31b270;
    }
    :host-context(body.dark) .filters-bar,
    :host-context(body.dark) .panel-card,
    :host-context(body.dark) .empty-state {
      background: #001e2e; border-color: #00405c; color: #c4e8d6;
    }
    :host-context(body.dark) .filter-label,
    :host-context(body.dark) .big-number-label,
    :host-context(body.dark) .card-body,
    :host-context(body.dark) .rpe-stat__lbl,
    :host-context(body.dark) .mc-extra,
    :host-context(body.dark) .match-extra,
    :host-context(body.dark) .match-place,
    :host-context(body.dark) .rpe-foot { color: #94a3b8; }
    :host-context(body.dark) .card-title,
    :host-context(body.dark) .big-number,
    :host-context(body.dark) .big-fraction__num,
    :host-context(body.dark) .mc-name,
    :host-context(body.dark) .match-rival,
    :host-context(body.dark) .rpe-stat__num,
    :host-context(body.dark) .inj-list li,
    :host-context(body.dark) .med-list li,
    :host-context(body.dark) .sched-head,
    :host-context(body.dark) .sched-mini li,
    :host-context(body.dark) .sched-mini__time,
    :host-context(body.dark) .inj-mini__name { color: #c4e8d6; }
    :host-context(body.dark) .inj-mini__zone { color: #94a3b8; }
    :host-context(body.dark) .big-fraction__sep { color: rgba(196, 232, 214, 0.45); }
    :host-context(body.dark) .big-fraction__den { color: #94a3b8; }
    :host-context(body.dark) .text-soft { color: #94a3b8; }
    :host-context(body.dark) .well-chip--pending { background: #00131c; color: #94a3b8; border-color: #00405c; }
    :host-context(body.dark) .panel-card.is-clickable:hover { border-color: #31b270; }
    :host-context(body.dark) .filter-group .form-select,
    :host-context(body.dark) .date-input {
      background: #00131c; border-color: #00405c; color: #c4e8d6;
    }
    :host-context(body.dark) .date-nav {
      background: #00131c; border-color: #00405c; color: #c4e8d6;
    }
    :host-context(body.dark) .date-nav:hover:not(:disabled) {
      background: #00405c; border-color: #31b270; color: #c4e8d6;
    }
    :host-context(body.dark) .rpe-stat {
      background: #00131c; border-color: #00405c;
    }
    :host-context(body.dark) .inj-list li,
    :host-context(body.dark) .med-list li,
    :host-context(body.dark) .agenda-list li { border-bottom-color: #00405c; }
    :host-context(body.dark) .agenda-list li { color: #c4e8d6; }
    :host-context(body.dark) .agenda-when,
    :host-context(body.dark) .agenda-player { color: #94a3b8; }
    :host-context(body.dark) .empty-warn {
      background: rgba(176, 123, 0, 0.10); border-color: rgba(176, 123, 0, 0.3); color: #f3dc99;
    }
    :host-context(body.dark) .empty-warn h4 { color: #c4e8d6; }
    :host-context(body.dark) .empty-warn a { color: #31b270; }
    :host-context(body.dark) .mat-ok { color: #6fe0a6; }
  `]
})
export class PanelDiarioComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  clubId = 0;
  userId = 0;
  /**
   * Perfil del usuario actual. Importa porque el dropdown de equipos se
   * filtra por equipos asignados (vía team_users) cuando el usuario es
   * staff técnico medio (>= 3), no es admin del club (1) ni coach (2).
   */
  profileId = 0;
  modules: ClubModules = { clubId: 0, wellnessEnabled: false, rpeEnabled: false, professionalModeEnabled: false, accessControlEnabled: false, menuSport: 'futbol' };

  teams: ComboTeam[] = [];
  selectedTeamId: number | null = null;
  selectedDate: string = this.todayIsoYmd();

  payload: PanelDiarioPayload | null = null;
  /** Bundle de horarios del día (Fase 2.3, Modo Profesional). Carga "best-effort" tras el panel. */
  scheduleBundle: ScheduleBundle | null = null;
  /** Horarios fijos del fisio (tabla activity_schedule_times). Solo se carga para profileId 6. */
  activityBundle: ActivityScheduleBundle | null = null;
  /** Resumen de alertas de Material (stock bajo / caduca pronto). Carga best-effort tras el panel. */
  materialAlerts: { low: number; expiring: number; total: number } | null = null;

  loading = false;
  errorMessage: string | null = null;
  disabledByMaster = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private clubService: ClubService,
    private teamService: TeamService,
    private clubModulesService: ClubModulesService,
    private panelService: PanelDiarioService,
    private scheduleService: TrainingScheduleService,
    private activityScheduleService: ActivityScheduleService,
    private materialService: MaterialService,
    private cdr: ChangeDetectorRef
  ) {}

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

  // ----------------------------------------------------------------
  // Carga inicial: club -> modules -> teams -> panel
  // ----------------------------------------------------------------

  private bootstrap(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.userId = user?.userId ?? 0;
      this.profileId = user?.profileType?.profileId ?? 0;
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
            this.loadTeamsAndPanel();
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

  private loadTeamsAndPanel(): void {
    // La temporada seleccionada por el usuario se persiste en
    // `selectedTemporada` (sessionStorage) y `temporada` (localStorage), no en
    // `sessionStorage['temporada']`. Usar la utilidad estándar `getSelectedSeason()`
    // (igual que el resto del dashboard) evita caer al fallback heurístico, que
    // en pretemporada devolvía el año anterior y dejaba el combo de equipos vacío
    // para el cuerpo técnico asignado a equipos de la temporada nueva.
    const temporada = getSelectedSeason() || this.currentTemporada();

    // Staff médico (fisio=6, nutri=7, médico=8) y staff genérico (>=3) ven solo
    // los equipos donde están asignados vía team_users. Admin (1) y coach (2)
    // ven todos los equipos del club.
    const isClubStaff = this.profileId === 1 || this.profileId === 2;
    const teams$ = isClubStaff
      ? this.teamService.getTeamsByClubForCombo(this.clubId, temporada)
      : this.teamService.getTeamsByClubForCombo2(this.clubId, temporada, this.userId);

    teams$.subscribe({
      next: (resp: any) => {
        const data = resp?.data ?? [];
        this.teams = (Array.isArray(data) ? data : []).map((t: any) => ({
          // getTeamsByClubForCombo devuelve {teamId, name, categoryName}
          // getTeamsByClubForCombo2 devuelve {value, name}
          teamId: Number(t.teamId ?? t.value),
          name: t.name || t.teamName || `Equipo ${t.teamId ?? t.value}`,
          categoryName: t.categoryName
        }));
        // Si el equipo seleccionado en la URL no está en la lista filtrada
        // (p.ej. fisio entró por un teamId al que no está asignado), descartar.
        if (this.selectedTeamId && !this.teams.some(t => t.teamId === this.selectedTeamId)) {
          this.selectedTeamId = null;
        }
        if (!this.selectedTeamId && this.teams.length === 1) {
          this.selectedTeamId = this.teams[0].teamId;
        }
        if (this.selectedTeamId) {
          this.loadPanel();
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

  private loadPanel(): void {
    if (!this.selectedTeamId) return;
    this.loading = true;
    this.errorMessage = null;
    this.payload = null;
    this.scheduleBundle = null;
    this.activityBundle = null;
    this.materialAlerts = null;
    this.cdr.markForCheck();

    this.panelService.getPanelForDate(this.selectedTeamId, this.selectedDate).subscribe({
      next: (data) => {
        this.payload = data;
        this.loading = false;
        this.cdr.markForCheck();
        if (this.profileId === 6) {
          this.loadActivitySchedule();
        } else {
          this.loadScheduleBundle();
        }
        this.loadMaterialAlerts();
      },
      error: (err) => {
        const msg = err?.error?.error?.msg;
        if (msg === 'PROFESSIONAL_MODE_DISABLED') {
          this.disabledByMaster = true;
        } else {
          this.errorMessage = 'No se ha podido cargar el panel diario. Vuelve a intentarlo.';
        }
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Carga el bundle de bloques de horario del día en segundo plano. No bloquea
   * la UI: si falla, simplemente la card de Horarios queda vacía.
   */
  private loadScheduleBundle(): void {
    if (!this.selectedTeamId) return;
    this.scheduleService.getByTeamAndDate(this.selectedTeamId, this.selectedDate).subscribe({
      next: (b) => { this.scheduleBundle = b; this.cdr.markForCheck(); },
      error: () => { this.scheduleBundle = { sessionId: null, teamId: this.selectedTeamId!, clubId: this.clubId, blocks: [], totalDurationMin: 0 }; this.cdr.markForCheck(); }
    });
  }

  /**
   * Carga los 6 horarios fijos del fisio (tabla activity_schedule_times) para
   * el día seleccionado. Best-effort: si falla, la card de Horarios queda vacía.
   */
  private loadActivitySchedule(): void {
    if (!this.selectedTeamId) return;
    this.activityScheduleService.getByTeamAndDate(this.selectedTeamId, this.selectedDate).subscribe({
      next: (b) => { this.activityBundle = b; this.cdr.markForCheck(); },
      error: () => { this.activityBundle = null; this.cdr.markForCheck(); }
    });
  }

  // ----------------------------------------------------------------
  // UI handlers
  // ----------------------------------------------------------------

  onTeamChange(ev: Event): void {
    const value = (ev.target as HTMLSelectElement).value;
    const tid = Number(value);
    if (tid > 0) {
      this.selectedTeamId = tid;
      // replaceUrl para no apilar el cambio de equipo en el historial y que
      // "Volver" (location.back) salga a la pantalla anterior real.
      this.router.navigate(['/dashboard/panel-diario', tid], { replaceUrl: true });
    }
  }

  onDateChange(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    if (value) {
      this.selectedDate = value;
      this.loadPanel();
    }
  }

  changeDate(deltaDays: number): void {
    const d = new Date(this.selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    this.selectedDate = this.toIsoYmd(d);
    this.loadPanel();
  }

  goToday(): void {
    this.selectedDate = this.todayIsoYmd();
    this.loadPanel();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (this.loading || this.disabledByMaster) return;
    if (ev.key === 'ArrowLeft' && (ev.ctrlKey || ev.metaKey)) { this.changeDate(-1); ev.preventDefault(); }
    if (ev.key === 'ArrowRight' && (ev.ctrlKey || ev.metaKey)) { this.changeDate(1); ev.preventDefault(); }
  }

  // ----------------------------------------------------------------
  // Navegación a vistas específicas
  // ----------------------------------------------------------------

  /**
   * Vuelve a la pantalla de la que se llegó (comportamiento intuitivo del
   * botón "Volver"). El cambio de equipo usa {@code replaceUrl} para no
   * ensuciar el historial, de modo que {@code location.back()} salga a la
   * pantalla anterior real y no a un Panel diario con otro equipo.
   */
  goBack(): void {
    this.location.back();
  }
  goPermisos(): void { this.router.navigate(['/dashboard/permisos-club']); }

  /**
   * Abre el generador de informe diario con el equipo y la fecha actuales.
   * El informe se precarga con la disponibilidad/diario médico del día y es
   * editable + exportable a PDF.
   */
  goInformeDiario(): void {
    if (!this.selectedTeamId) return;
    this.router.navigate(['/dashboard/informe-diario', this.selectedTeamId], {
      queryParams: { date: this.selectedDate }
    });
  }
  goWellness(): void { if (this.selectedTeamId) this.router.navigate(['/dashboard/wellness-equipo', this.selectedTeamId]); }
  goRpe(): void { if (this.selectedTeamId) this.router.navigate(['/dashboard/rpe-equipo', this.selectedTeamId]); }
  goDisponibilidad(): void { if (this.selectedTeamId) this.router.navigate(['/dashboard/disponibilidad-equipo', this.selectedTeamId]); }

  /** Color estandarizado (paleta diario médico) para un chip de disponibilidad. */
  availColor(code: string | null | undefined): string { return statusColor(code || ''); }

  /** Etiqueta legible del código de estado para mostrarla en el chip. */
  availLabel(code: string | null | undefined): string { return statusLabelByCode(code); }
  goDiarioMedico(): void {
    if (this.selectedTeamId) {
      this.router.navigate(['/dashboard/diario-medico', this.selectedTeamId], {
        queryParams: { date: this.selectedDate }
      });
    }
  }
  goAgendaMedica(): void { if (this.selectedTeamId) this.router.navigate(['/dashboard/agenda-medica', this.selectedTeamId]); }
  goLesiones(): void { if (this.selectedTeamId) this.router.navigate(['/dashboard/lesiones', this.selectedTeamId]); }
  goReadaptacion(): void {
    if (this.selectedTeamId) {
      this.router.navigate(['/dashboard/readaptacion-equipo', this.selectedTeamId], {
        queryParams: { date: this.selectedDate }
      });
    }
  }

  goMaterial(): void { if (this.selectedTeamId) this.router.navigate(['/dashboard/material-equipo', this.selectedTeamId]); }

  /**
   * Carga best-effort del inventario de Material para mostrar alertas (stock
   * bajo / caduca pronto) en la card del Panel diario. Si falla, la card
   * muestra "todo en orden".
   */
  private loadMaterialAlerts(): void {
    if (!this.selectedTeamId) return;
    this.materialService.getBundle(this.selectedTeamId).subscribe({
      next: (b) => {
        const items = b.items || [];
        const low = items.filter(i => i.lowStock).length;
        const expiring = items.filter(i => this.materialExpiringSoon(i.expiryDate)).length;
        this.materialAlerts = { low, expiring, total: items.length };
        this.cdr.markForCheck();
      },
      error: () => { this.materialAlerts = { low: 0, expiring: 0, total: 0 }; this.cdr.markForCheck(); }
    });
  }

  /** Caduca dentro de 15 días o ya caducado (cuenta como alerta). */
  private materialExpiringSoon(iso: string | null): boolean {
    if (!iso) return false;
    const today = new Date(new Date().toDateString());
    const exp = new Date(iso + 'T00:00:00');
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 15);
    return exp <= limit;
  }

  /** Jugadores lesionados activos con baja competitiva (entran en readaptación). */
  readaptList(): any[] {
    const entries = (this.payload?.injuries?.entries || []) as any[];
    return entries.filter(i => (i.competitiveStatus || '').toLowerCase() === 'baja');
  }
  readaptCount(): number { return this.readaptList().length; }
  goMicrociclos(): void { if (this.selectedTeamId) this.router.navigate(['/dashboard/microciclos', this.selectedTeamId]); }
  goHorarios(): void {
    if (!this.selectedTeamId) return;
    this.router.navigate(['/dashboard/horarios-equipo', this.selectedTeamId], {
      queryParams: { date: this.selectedDate }
    });
  }

  /**
   * Resumen de horario del día para pintar en la card "Horarios":
   *   { count, totalDurationMin, range: "HH:mm – HH:mm" | null }
   */
  scheduleSummary(): { count: number; totalDurationMin: number; range: string | null } {
    const b = this.scheduleBundle;
    const count = b?.blocks?.length ?? 0;
    const total = b?.totalDurationMin ?? 0;
    if (!b || !b.sessionId || count === 0) {
      return { count, totalDurationMin: total, range: null };
    }
    const start = (b.startTime || '').slice(0, 5);
    if (!start) return { count, totalDurationMin: total, range: null };
    const end = this.addMinutes(start, total);
    return { count, totalDurationMin: total, range: `${start} – ${end}` };
  }

  /**
   * Resumen de los horarios fijos del fisio para la card de Horarios:
   * número de horas definidas (de las 6 por actividad) y el rango
   * (más temprana – más tardía) del día.
   */
  fisioScheduleSummary(): { count: number; range: string | null } {
    const items = this.fisioScheduleItems();
    if (items.length === 0) return { count: 0, range: null };
    const sorted = items.map(i => i.time).sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return { count: items.length, range: first === last ? first : `${first} – ${last}` };
  }

  /**
   * Lista de eventos del día (etiqueta corta + hora) para mostrarlos en
   * letra pequeña dentro de la card de Horarios. Ordenada por hora.
   */
  fisioScheduleItems(): { label: string; time: string }[] {
    const acts = this.activityBundle?.activities ?? [];
    const labels: { key: keyof import('src/app/core/services/activity-schedule/activity-schedule.service').ActivityTimes; label: string }[] = [
      { key: 'citaCt',      label: 'Citación CT' },
      { key: 'citaPlayers', label: 'Citación jugadores' },
      { key: 'video',       label: 'Vídeo' },
      { key: 'charla',      label: 'Charla' },
      { key: 'strength',    label: 'Trabajo de fuerza' },
      { key: 'fieldWork',   label: 'Entrenamiento en campo' }
    ];
    const out: { label: string; time: string }[] = [];
    for (const a of acts) {
      for (const l of labels) {
        const v = a.times[l.key];
        if (v) out.push({ label: l.label, time: v.slice(0, 5) });
      }
    }
    return out.sort((x, y) => x.time.localeCompare(y.time));
  }

  private addMinutes(hhmm: string, mins: number): string {
    const m = /^(\d{2}):(\d{2})/.exec(hhmm);
    if (!m) return hhmm;
    let total = (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) + Math.max(0, mins);
    total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(total / 60); const mm = total % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  formatDayType(dayType?: string): string {
    switch ((dayType || '').toLowerCase()) {
      case 'training': return 'Entrenamiento';
      case 'rest': return 'Descanso';
      case 'match': return 'Partido';
      default: return dayType || '';
    }
  }

  formatHumanDate(dateIsoYmd: string): string {
    if (!dateIsoYmd) return '';
    const d = new Date(dateIsoYmd + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  rtpLabel(category: string | null): string {
    switch (category) {
      case 'return_to_train': return 'RTT';
      case 'return_to_play': return 'RTP';
      case 'return_to_competition': return 'RTC';
      default: return '';
    }
  }

  /** Etiqueta legible del tipo de cita médica. */
  kindLabel(kind: string | null | undefined): string {
    switch ((kind || '').toUpperCase()) {
      case 'PHYSIO': return 'Fisio';
      case 'NUTRITION': return 'Nutrición';
      case 'MEDICAL': return 'Médica';
      case 'RECOVERY': return 'Recuperación';
      case 'EVALUATION': return 'Evaluación';
      case 'OTHER': return 'Otra';
      default: return kind || '—';
    }
  }

  /** Icono Bootstrap por tipo de cita, para diferenciar visualmente en la lista. */
  kindIcon(kind: string | null | undefined): string {
    switch ((kind || '').toUpperCase()) {
      case 'PHYSIO':     return 'bi-bandaid-fill';
      case 'NUTRITION':  return 'bi-egg-fried';
      case 'MEDICAL':    return 'bi-clipboard2-pulse-fill';
      case 'RECOVERY':   return 'bi-droplet-fill';
      case 'EVALUATION': return 'bi-clipboard-check-fill';
      case 'OTHER':      return 'bi-three-dots';
      default:           return 'bi-calendar-event';
    }
  }

  /** Devuelve el nombre del jugador si lo tenemos cacheado en `payload`.
   *
   *  Busca en las tres entidades del panel que mencionan a un jugador:
   *  lesiones, diario médico y agenda médica. La primera (injuries) sí
   *  expone `playerName` tipado; las otras dos pueden traerlo como campo
   *  opcional en runtime aunque la interfaz tipada no lo declare, por eso
   *  las casteamos a `any[]` antes del `find`.
   */
  playerName(playerId: number): string | null {
    if (!playerId) return null;
    const fromInj = (this.payload?.injuries?.entries || []).find(i => i.playerId === playerId);
    if (fromInj?.playerName) return fromInj.playerName;
    const medEntries = (this.payload?.medicalDiary?.entries || []) as any[];
    const fromMed = medEntries.find(m => m && m.playerId === playerId && m.playerName);
    if (fromMed?.playerName) return fromMed.playerName as string;
    const agEntries = (this.payload?.medicalAgenda?.entries || []) as any[];
    const fromAg = agEntries.find(a => a && a.playerId === playerId && a.playerName);
    return (fromAg?.playerName as string) || null;
  }

  /**
   * Mapea códigos de zona anatómica (en inglés / snake_case) a etiquetas
   * legibles en español. Los datos viajan en inglés desde el backend para
   * mantener consistencia con la app móvil del jugador, pero el panel del
   * fisio se presenta siempre traducido.
   */
  formatZone(zone: string | null | undefined): string {
    if (!zone) return '';
    const z = zone.toLowerCase().trim();
    const map: Record<string, string> = {
      // Tren inferior
      ankle: 'Tobillo', ankle_l: 'Tobillo izq.', ankle_r: 'Tobillo der.',
      knee: 'Rodilla', knee_l: 'Rodilla izq.', knee_r: 'Rodilla der.',
      hamstring: 'Isquio', hamstring_l: 'Isquio izq.', hamstring_r: 'Isquio der.',
      quadriceps: 'Cuádriceps', quad_l: 'Cuádriceps izq.', quad_r: 'Cuádriceps der.',
      calf: 'Gemelo', calf_l: 'Gemelo izq.', calf_r: 'Gemelo der.',
      groin: 'Aductor', groin_l: 'Aductor izq.', groin_r: 'Aductor der.',
      hip: 'Cadera', hip_l: 'Cadera izq.', hip_r: 'Cadera der.',
      foot: 'Pie', foot_l: 'Pie izq.', foot_r: 'Pie der.',
      achilles: 'Aquiles', achilles_l: 'Aquiles izq.', achilles_r: 'Aquiles der.',
      // Tronco
      lumbar: 'Lumbar', back: 'Espalda', upper_back: 'Espalda alta',
      abdominal: 'Abdominal', abs: 'Abdominal', oblique: 'Oblicuo',
      chest: 'Pectoral', ribs: 'Costillas',
      // Tren superior
      shoulder: 'Hombro', shoulder_l: 'Hombro izq.', shoulder_r: 'Hombro der.',
      elbow: 'Codo', wrist: 'Muñeca', hand: 'Mano',
      neck: 'Cuello', head: 'Cabeza'
    };
    if (map[z]) return map[z];
    // Capitalizar como fallback
    return z.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Resumen de disponibilidad para la card del Panel diario.
   *  - {@code available}: jugadores con código que implica disponibilidad
   *    real o condicionada: {@code D} (Disponible), {@code DC} (Disponible
   *    condicionado) y {@code D-RTC} (Return to competición). Se incluyen los
   *    condicionados para no desalentar al fisio (siguen pudiendo jugar/
   *    entrenar con limitaciones). El resto (LS*, EM, ENF, MP, ND*…) no cuenta.
   *  - {@code total}: jugadores con parte registrado para hoy.
   *
   * NOTA: los códigos deben coincidir con el catálogo de
   * {@code diario-medico-equipo.component} (TRAINING_STATUS / MATCH_STATUS).
   * El set antiguo ({@code DT/DC/DL/A}) usaba códigos inexistentes, por lo que
   * la card mostraba siempre 0 disponibles aunque las chips fueran correctas.
   */
  availabilitySummary(): { available: number; total: number } {
    const codes = this.payload?.availability?.byCode || [];
    const total = this.payload?.availability?.totalRegistered || 0;
    if (!codes.length) return { available: 0, total };
    const availableCodes = new Set(['D', 'DC', 'D-RTC']);
    const available = codes
      .filter((c: any) => availableCodes.has((c.code || '').toUpperCase()))
      .reduce((acc: number, c: any) => acc + (c.count || 0), 0);
    return { available, total };
  }

  /**
   * Resumen de wellness para la card del Panel diario, con totales por
   * semáforo y conteo de pendientes (= plantilla – respuestas).
   * Si no conocemos el total de plantilla, mostramos sólo respuestas / 0
   * en lugar de inventarlo.
   */
  wellnessSummary(): { responded: number; total: number; green: number; yellow: number; red: number; pending: number } {
    const w = this.payload?.wellness;
    const responded = w?.totalResponses || 0;
    const green = w?.green || 0;
    const yellow = w?.yellow || 0;
    const red = w?.red || 0;
    // El total de plantilla no siempre llega en el payload. Si no, lo
    // estimamos como la suma de respuestas + pendientes calculado fuera.
    // Usamos el total de availability si está disponible (mismo equipo).
    const total = (this.payload?.availability?.totalRegistered || 0) || responded;
    const pending = Math.max(0, total - responded);
    return { responded, total: total || responded, green, yellow, red, pending };
  }

  private todayIsoYmd(): string { return this.toIsoYmd(new Date()); }

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
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }
}
