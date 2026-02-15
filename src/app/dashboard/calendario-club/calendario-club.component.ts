import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';

/* ═══════════════════════════════════════
   PALETA DE 30 COLORES PARA EQUIPOS
═══════════════════════════════════════ */
const TEAM_COLORS: string[] = [
  '#0fa3e8', '#e8590c', '#7950f2', '#2f9e44', '#f08c00',
  '#c2255c', '#1098ad', '#6741d9', '#e03131', '#099268',
  '#5c7cfa', '#f76707', '#ae3ec9', '#20c997', '#fd7e14',
  '#3b5bdb', '#d6336c', '#0ca678', '#f03e3e', '#1c7ed6',
  '#9c36b5', '#37b24d', '#e67700', '#4263eb', '#d9480f',
  '#862e9c', '#12b886', '#fa5252', '#4dabf7', '#ff922b',
];

/* ═══════════════════════════════════════
   INTERFACES
═══════════════════════════════════════ */

interface TeamInfo {
  teamId: number;
  name: string;
  color: string;
  visible: boolean;
}

interface CalendarDay {
  date: string;        // 'YYYY-MM-DD'
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

interface CalendarEvent {
  id: number;
  type: 'training' | 'match';
  teamId: number;
  teamName: string;
  teamColor: string;
  date: string;
  time?: string;
  rivalName?: string;
  terreno?: string;       // 'Local' | 'Visitante'
  visible?: number;
}

interface DayDetail {
  date: string;
  events: CalendarEvent[];
}

/* ═══════════════════════════════════════
   COMPONENTE
═══════════════════════════════════════ */

@Component({
  selector: 'app-calendario-club',
  templateUrl: './calendario-club.component.html',
  styleUrls: ['./calendario-club.component.scss'],
})
export class CalendarioClubComponent implements OnInit, OnDestroy {

  /* ─── Estado general ─── */
  clubId = 0;
  temporada = getCurrentSeasonString();
  isLoading = true;
  errorMsg = '';

  /* ─── Equipos ─── */
  teams: TeamInfo[] = [];
  teamsVisibles: Set<number> = new Set();

  /* ─── Calendario ─── */
  currentYear = 0;
  currentMonth = 0; // 0-indexed
  calendarGrid: CalendarDay[][] = []; // semanas × 7 días
  allEvents: CalendarEvent[] = [];

  /* ─── Panel lateral del día ─── */
  selectedDay: DayDetail | null = null;
  showDayPanel = false;

  /* ─── Subscriptions ─── */
  private subs: Subscription[] = [];

  /* ─── Días de la semana (se traducen) ─── */
  weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  /* ─── Nombres de meses ─── */
  monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teamService: TeamService,
    private trainingService: TrainingService,
    private translate: TranslateService,
  ) {}

  /* ═══════════════════════════════════════
     LIFECYCLE
  ═══════════════════════════════════════ */

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.clubId = +params['clubId'];
    });

    const temp = localStorage.getItem('temporada');
    if (temp) this.temporada = temp;

    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();

    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /* ═══════════════════════════════════════
     CARGA DE EQUIPOS
  ═══════════════════════════════════════ */

  loadTeams(): void {
    this.isLoading = true;
    this.errorMsg = '';

    const sub = this.teamService
      .getTeamsByClubForCombo(this.clubId, this.temporada)
      .subscribe({
        next: (res: Response) => {
          console.log('[CalendarioClub] Respuesta equipos:', res);

          // La respuesta puede venir como res.data (array) o directamente como array
          let teamList: any[] = [];
          if (res?.data && Array.isArray(res.data)) {
            teamList = res.data;
          } else if (Array.isArray(res)) {
            teamList = res as any[];
          } else if (res?.data && typeof res.data === 'object') {
            // Si data es un objeto con equipos dentro
            const keys = Object.keys(res.data);
            if (keys.length > 0 && Array.isArray(res.data[keys[0]])) {
              teamList = res.data[keys[0]];
            }
          }

          if (teamList.length > 0) {
            this.teams = teamList.map((t: any, i: number) => ({
              teamId: t.value || t.teamId || t.id,
              name: t.name || t.teamName || t.nombre || `Equipo ${t.value || t.teamId || t.id}`,
              color: TEAM_COLORS[i % TEAM_COLORS.length],
              visible: true,
            }));
            this.teamsVisibles = new Set(this.teams.map((t) => t.teamId));
            console.log('[CalendarioClub] Equipos cargados:', this.teams.length, this.teams);
            this.loadAllEvents();
          } else {
            console.warn('[CalendarioClub] No se encontraron equipos en la respuesta:', res);
            this.isLoading = false;
            this.buildCalendarGrid();
          }
        },
        error: (err) => {
          console.error('[CalendarioClub] Error al cargar equipos:', err);
          this.errorMsg = 'Error al cargar los equipos';
          this.isLoading = false;
        },
      });

    this.subs.push(sub);
  }

  /* ═══════════════════════════════════════
     CARGA DE ENTRENAMIENTOS Y PARTIDOS
  ═══════════════════════════════════════ */

  loadAllEvents(): void {
    this.isLoading = true;
    this.allEvents = [];

    if (this.teams.length === 0) {
      this.isLoading = false;
      this.buildCalendarGrid();
      return;
    }

    // Para cada equipo: forkJoin de entrenamientos + partidos
    // Cada petición se envuelve con catchError para que un fallo no tumbe todo
    const requests: { [key: string]: any } = {};
    const emptyResponse = { data: [] };

    this.teams.forEach((team) => {
      requests[`train_${team.teamId}`] = this.trainingService
        .getTrainingSessions(String(team.teamId))
        .pipe(catchError((err) => {
          console.warn(`[CalendarioClub] Error cargando entrenamientos del equipo ${team.name} (${team.teamId}):`, err);
          return of(emptyResponse);
        }));

      requests[`match_${team.teamId}`] = this.trainingService
        .getListPrePartidoByTeam(String(team.teamId))
        .pipe(catchError((err) => {
          console.warn(`[CalendarioClub] Error cargando partidos del equipo ${team.name} (${team.teamId}):`, err);
          return of(emptyResponse);
        }));
    });

    const sub = forkJoin(requests).subscribe({
      next: (results: any) => {
        const events: CalendarEvent[] = [];

        this.teams.forEach((team) => {
          // Entrenamientos
          const trainRes = results[`train_${team.teamId}`];
          const trainList = this.extractArray(trainRes);
          console.log(`[CalendarioClub] Equipo "${team.name}" → ${trainList.length} entrenamientos`);
          trainList.forEach((t: any) => {
            if (t.daySession) {
              events.push({
                id: t.trainingSessionId,
                type: 'training',
                teamId: team.teamId,
                teamName: team.name,
                teamColor: team.color,
                date: t.daySession,
                time: t.addressSession || '',
                visible: t.visible,
              });
            }
          });

          // Partidos
          const matchRes = results[`match_${team.teamId}`];
          const matchList = this.extractArray(matchRes);
          console.log(`[CalendarioClub] Equipo "${team.name}" → ${matchList.length} partidos`);
          matchList.forEach((m: any) => {
            if (m.matchDate) {
              const hora = m.hora != null && m.minutos != null
                ? `${String(m.hora).padStart(2, '0')}:${String(m.minutos).padStart(2, '0')}`
                : '';
              events.push({
                id: m.matchPreparationId,
                type: 'match',
                teamId: team.teamId,
                teamName: team.name,
                teamColor: team.color,
                date: m.matchDate,
                time: hora,
                rivalName: m.rivalName || '',
                terreno: m.terreno || '',
                visible: m.visible,
              });
            }
          });
        });

        this.allEvents = events;
        console.log(`[CalendarioClub] Total eventos cargados: ${events.length}`);
        this.isLoading = false;
        this.buildCalendarGrid();
      },
      error: (err) => {
        console.error('[CalendarioClub] Error inesperado en forkJoin:', err);
        this.errorMsg = 'Error al cargar el calendario';
        this.isLoading = false;
      },
    });

    this.subs.push(sub);
  }

  /* ═══════════════════════════════════════
     UTILIDAD: extraer array de la respuesta
  ═══════════════════════════════════════ */

  private extractArray(res: any): any[] {
    if (!res) return [];
    if (res.data && Array.isArray(res.data)) return res.data;
    if (Array.isArray(res)) return res;
    if (res.data && typeof res.data === 'object') {
      // Si data es un objeto wrapper, intentar extraer el primer array
      const keys = Object.keys(res.data);
      for (const key of keys) {
        if (Array.isArray(res.data[key])) return res.data[key];
      }
    }
    return [];
  }

  /* ═══════════════════════════════════════
     CONSTRUCCIÓN DEL GRID MENSUAL
  ═══════════════════════════════════════ */

  buildCalendarGrid(): void {
    const year = this.currentYear;
    const month = this.currentMonth;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Lunes = 0, Domingo = 6 (ISO)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6; // Domingo → 6

    const totalDays = lastDay.getDate();
    const today = new Date();
    const todayStr = this.formatDate(today);

    const grid: CalendarDay[][] = [];
    let week: CalendarDay[] = [];

    // Días del mes anterior (relleno)
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = this.formatDate(new Date(prevYear, prevMonth, d));
      week.push({
        date: dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: this.getEventsForDate(dateStr),
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = this.formatDate(new Date(year, month, d));
      week.push({
        date: dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: this.getEventsForDate(dateStr),
      });

      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }

    // Días del mes siguiente (relleno)
    if (week.length > 0) {
      let nextD = 1;
      while (week.length < 7) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = this.formatDate(new Date(nextYear, nextMonth, nextD));
        week.push({
          date: dateStr,
          dayNumber: nextD,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          events: this.getEventsForDate(dateStr),
        });
        nextD++;
      }
      grid.push(week);
    }

    this.calendarGrid = grid;
  }

  /* ═══════════════════════════════════════
     EVENTOS POR FECHA
  ═══════════════════════════════════════ */

  getEventsForDate(dateStr: string): CalendarEvent[] {
    return this.allEvents.filter(
      (e) => e.date === dateStr && this.teamsVisibles.has(e.teamId)
    );
  }

  /** Eventos visibles del día (filtro aplicado) — max N para la celda */
  getVisibleDots(day: CalendarDay): CalendarEvent[] {
    return day.events.filter((e) => this.teamsVisibles.has(e.teamId));
  }

  /** Cuenta de eventos adicionales que no caben como puntos */
  getExtraCount(day: CalendarDay): number {
    const visible = this.getVisibleDots(day);
    return visible.length > 5 ? visible.length - 5 : 0;
  }

  /** Solo los primeros 5 puntos para la celda */
  getDotsToShow(day: CalendarDay): CalendarEvent[] {
    return this.getVisibleDots(day).slice(0, 5);
  }

  /* ═══════════════════════════════════════
     NAVEGACIÓN MES
  ═══════════════════════════════════════ */

  prevMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.buildCalendarGrid();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.buildCalendarGrid();
  }

  goToToday(): void {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.buildCalendarGrid();
  }

  /* ═══════════════════════════════════════
     FILTRO EQUIPOS
  ═══════════════════════════════════════ */

  toggleTeam(teamId: number): void {
    if (this.teamsVisibles.has(teamId)) {
      this.teamsVisibles.delete(teamId);
    } else {
      this.teamsVisibles.add(teamId);
    }
    this.buildCalendarGrid();
  }

  selectAllTeams(): void {
    if (this.teamsVisibles.size === this.teams.length) {
      this.teamsVisibles.clear();
    } else {
      this.teamsVisibles = new Set(this.teams.map((t) => t.teamId));
    }
    this.buildCalendarGrid();
  }

  isTeamVisible(teamId: number): boolean {
    return this.teamsVisibles.has(teamId);
  }

  /* ═══════════════════════════════════════
     PANEL LATERAL — DÍA
  ═══════════════════════════════════════ */

  openDayPanel(day: CalendarDay): void {
    const events = this.getVisibleDots(day);
    if (events.length === 0 && !day.isCurrentMonth) return;

    this.selectedDay = {
      date: day.date,
      events: events.sort((a, b) => {
        // Primero entrenamientos, luego partidos; dentro por equipo
        if (a.type !== b.type) return a.type === 'training' ? -1 : 1;
        return a.teamName.localeCompare(b.teamName);
      }),
    };
    this.showDayPanel = true;
  }

  closeDayPanel(): void {
    this.showDayPanel = false;
    this.selectedDay = null;
  }

  /* ═══════════════════════════════════════
     NAVEGAR AL CALENDARIO DEL EQUIPO
  ═══════════════════════════════════════ */

  navigateToTeamCalendar(teamId: number): void {
    // El calendario individual usa teamId + playerId (0 para el club)
    this.router.navigate(['/dashboard/calendario', teamId, 0]);
  }

  /** Navegar al calendario del equipo y abrir directamente el detalle del evento */
  navigateToEventDetail(event: CalendarEvent): void {
    this.router.navigate(['/dashboard/calendario', event.teamId, 0], {
      queryParams: {
        eventType: event.type === 'training' ? 'entrenamiento' : 'partido',
        eventId: event.id,
        eventDate: event.date,
      },
    });
  }

  /* ═══════════════════════════════════════
     NAVEGACIÓN — VOLVER
  ═══════════════════════════════════════ */

  goBack(): void {
    this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
  }

  /* ═══════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════ */

  formatDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  formatDateDisplay(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /** Agrupa eventos por equipo para el panel lateral */
  groupByTeam(events: CalendarEvent[]): { team: TeamInfo; trainings: CalendarEvent[]; matches: CalendarEvent[] }[] {
    const map = new Map<number, { team: TeamInfo; trainings: CalendarEvent[]; matches: CalendarEvent[] }>();

    events.forEach((e) => {
      if (!map.has(e.teamId)) {
        const teamInfo = this.teams.find((t) => t.teamId === e.teamId);
        if (teamInfo) {
          map.set(e.teamId, { team: teamInfo, trainings: [], matches: [] });
        }
      }
      const group = map.get(e.teamId);
      if (group) {
        if (e.type === 'training') {
          group.trainings.push(e);
        } else {
          group.matches.push(e);
        }
      }
    });

    return Array.from(map.values());
  }

  trackByTeamId(index: number, item: TeamInfo): number {
    return item.teamId;
  }

  trackByDate(index: number, week: CalendarDay[]): string {
    return week[0]?.date || String(index);
  }

  trackByEvent(index: number, event: CalendarEvent): string {
    return `${event.type}_${event.id}`;
  }
}
