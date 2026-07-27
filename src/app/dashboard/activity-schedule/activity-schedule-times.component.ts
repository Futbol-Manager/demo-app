import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

import {
  ActivitySchedule,
  ActivityScheduleService,
  ActivityTimes
} from 'src/app/core/services/activity-schedule/activity-schedule.service';

interface TimeRow {
  key: keyof ActivityTimes;
  label: string;
  icon: string;
  saving?: boolean;
}

/**
 * Bloque de "horarios del día" del fisio para una actividad concreta
 * (entrenamiento o partido). Muestra seis filas fijas con hora de inicio
 * editable y autoguardado.
 */
@Component({
  selector: 'app-activity-schedule-times',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="act-card" *ngIf="activity">
      <div class="act-head" [class.act-head--match]="activity.activityType === 'MATCH'">
        <div class="act-head-left">
          <i class="bi" [ngClass]="activity.activityType === 'MATCH' ? 'bi-trophy' : 'bi-cone-striped'"></i>
          <div class="act-titles">
            <span class="act-type">{{ activity.activityType === 'MATCH' ? 'Partido' : 'Entrenamiento' }}</span>
            <span class="act-name">{{ activity.title }}</span>
          </div>
        </div>
        <div class="act-start" *ngIf="activity.startTime">
          <i class="bi bi-clock"></i> {{ activity.startTime }}
        </div>
      </div>

      <ul class="time-list">
        <li class="time-row" *ngFor="let row of rows; trackBy: trackByKey">
          <div class="time-label">
            <i class="bi" [ngClass]="row.icon"></i>
            <span>{{ row.label }}</span>
          </div>
          <div class="time-input">
            <input type="time" class="form-control form-control-sm"
                   [value]="times[row.key] || ''"
                   (change)="onTimeChange(row, $event)"
                   [disabled]="row.saving">
            <span class="saving-dot" *ngIf="row.saving" title="Guardando…">
              <i class="bi bi-arrow-repeat"></i>
            </span>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .act-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      overflow: hidden; margin-bottom: 1rem;
    }
    .act-head {
      display: flex; align-items: center; justify-content: space-between; gap: .75rem;
      padding: .75rem 1rem; background: linear-gradient(135deg, #31b270 0%, #002c40 100%); color: #fff;
    }
    .act-head--match { background: linear-gradient(135deg, #002c40 0%, #014b6b 100%); }
    .act-head-left { display: flex; align-items: center; gap: .65rem; }
    .act-head-left > i { font-size: 1.35rem; }
    .act-titles { display: flex; flex-direction: column; line-height: 1.2; }
    .act-type { font-size: .72rem; text-transform: uppercase; letter-spacing: .5px; opacity: .85; }
    .act-name { font-weight: 700; font-size: 1rem; }
    .act-start { font-weight: 600; font-size: .9rem; white-space: nowrap; }
    .time-list { list-style: none; margin: 0; padding: .5rem .75rem; display: flex; flex-direction: column; }
    .time-row {
      display: grid; grid-template-columns: 1fr 150px; align-items: center; gap: .75rem;
      padding: .55rem .25rem; border-bottom: 1px solid #f1f5f9;
    }
    .time-row:last-child { border-bottom: 0; }
    .time-label { display: flex; align-items: center; gap: .55rem; color: #002c40; font-weight: 600; font-size: .92rem; }
    .time-label i { color: #31b270; font-size: 1.05rem; }
    .time-input { display: flex; align-items: center; gap: .4rem; }
    .time-input input { width: 120px; }
    .saving-dot { color: #3b82f6; font-size: .95rem; }
    .saving-dot i { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @media (max-width: 480px) {
      .time-row { grid-template-columns: 1fr 110px; }
      .time-input input { width: 96px; }
    }
  `]
})
export class ActivityScheduleTimesComponent implements OnChanges {

  @Input() activity!: ActivitySchedule;

  readonly rows: TimeRow[] = [
    { key: 'citaCt',      label: 'Citación cuerpo técnico', icon: 'bi-person-badge' },
    { key: 'citaPlayers', label: 'Citación jugadores',      icon: 'bi-people' },
    { key: 'video',       label: 'Vídeo',                   icon: 'bi-camera-video' },
    { key: 'charla',      label: 'Charla',                  icon: 'bi-chat-square-text' },
    { key: 'strength',    label: 'Trabajo de fuerza',       icon: 'bi-lightning-charge' },
    { key: 'fieldWork',   label: 'Entrenamiento en campo',  icon: 'bi-cone-striped' }
  ];

  times: ActivityTimes = this.emptyTimes();

  constructor(
    private scheduleService: ActivityScheduleService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activity']) {
      this.times = { ...this.emptyTimes(), ...(this.activity?.times || {}) };
      this.cdr.markForCheck();
    }
  }

  trackByKey(_i: number, row: TimeRow): string { return row.key; }

  onTimeChange(row: TimeRow, ev: Event): void {
    const value = (ev.target as HTMLInputElement).value || '';
    const newVal = value || null;
    const prev = this.times[row.key];
    this.times[row.key] = newVal;
    row.saving = true;
    this.cdr.markForCheck();

    this.scheduleService
      .updateTimes(this.activity.activityType, this.activity.activityId, { [row.key]: newVal })
      .subscribe({
        next: saved => {
          this.times = { ...this.emptyTimes(), ...saved };
          row.saving = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.times[row.key] = prev;
          row.saving = false;
          this.cdr.markForCheck();
          this.toastr.error('No se ha podido guardar el horario');
        }
      });
  }

  private emptyTimes(): ActivityTimes {
    return {
      citaCt: null,
      citaPlayers: null,
      video: null,
      charla: null,
      strength: null,
      fieldWork: null
    };
  }
}
