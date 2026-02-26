import { Component, OnInit, OnDestroy } from '@angular/core';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';

const HOURS_START = 6;
const HOURS_END   = 23;

/** Altura en px de cada celda de hora según el nivel de zoom */
const ZOOM_CELL_HEIGHT: Record<string, number> = {
  compact: 28,
  normal:  44,
  large:   72,
};
type ZoomLevel = 'compact' | 'normal' | 'large';

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export interface CalendarPost {
  post_id: number;
  network: string;
  text_content: string;
  status: string;
  scheduled_at: string;
  image_url?: string;
  is_thread?: number;
  thread_tweets?: string;
}

// ── Pure-JS date helpers (no date-fns needed) ──────────────────────────────

/** Returns Monday of the week containing `d`. */
function startOfISOWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Returns the 7 days of the ISO week starting on `monday`. */
function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Add `n` weeks to a date. */
function addWeeks(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(d.getDate() + n * 7);
  return result;
}

/** Returns midnight of `d`. */
function startOfDay(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Checks if two dates fall on the same calendar day. */
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

/** Returns true if `d` is today. */
function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Format a date as "YYYY-MM-DDTHH:mm:ss" */
function toIsoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── Month-view helpers ──────────────────────────────────────────────────────

const FULL_MONTH_NAMES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/** Returns all weeks (rows of 7 days) needed to display a month. */
function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  // Align to Monday
  const dow = first.getDay(); // 0=Sun
  const startOffset = dow === 0 ? -6 : 1 - dow;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() + startOffset);

  const weeks: Date[][] = [];
  let cur = new Date(gridStart);
  while (weeks.length < 6) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    // Stop when we've covered the whole month (at least 4 weeks, stop once we're past it)
    if (weeks.length >= 4 && cur.getMonth() !== month) break;
  }
  return weeks;
}

@Component({
  selector: 'app-rrss-calendar',
  templateUrl: './rrss-calendar.component.html',
  styleUrls: ['./rrss-calendar.component.scss'],
})
export class RrssCalendarComponent implements OnInit, OnDestroy {
  currentWeekStart: Date = startOfISOWeek(new Date());
  days: Date[] = [];
  hours: number[] = [];
  posts: CalendarPost[] = [];
  loading = false;
  fillLoading = false;

  networkFilter = '';

  showEditorModal = false;
  editorPost: any = null;
  editorPresetNetwork: string | null = null;
  editorPresetScheduledAt: string | null = null;

  showMonthlyWizard = false;

  // ── Vista mensual ────────────────────────────────────────────────────────
  viewMode: 'week' | 'month' = 'week';
  monthYear: number  = new Date().getFullYear();
  monthMonth: number = new Date().getMonth(); // 0-indexed
  monthGrid: Date[][] = [];
  monthPosts: CalendarPost[] = [];
  monthLoading = false;

  readonly DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly FULL_MONTH_NAMES = FULL_MONTH_NAMES_ES;

  get monthLabel(): string {
    return `${FULL_MONTH_NAMES_ES[this.monthMonth]} ${this.monthYear}`;
  }

  switchToMonth(): void {
    this.viewMode   = 'month';
    this.monthYear  = this.currentWeekStart.getFullYear();
    this.monthMonth = this.currentWeekStart.getMonth();
    this.buildMonthGrid();
    this.loadMonth();
  }

  switchToWeek(): void {
    this.viewMode = 'week';
  }

  buildMonthGrid(): void {
    this.monthGrid = monthGrid(this.monthYear, this.monthMonth);
  }

  prevMonth(): void {
    this.monthMonth--;
    if (this.monthMonth < 0) { this.monthMonth = 11; this.monthYear--; }
    this.buildMonthGrid();
    this.loadMonth();
  }

  nextMonth(): void {
    this.monthMonth++;
    if (this.monthMonth > 11) { this.monthMonth = 0; this.monthYear++; }
    this.buildMonthGrid();
    this.loadMonth();
  }

  todayMonth(): void {
    this.monthYear  = new Date().getFullYear();
    this.monthMonth = new Date().getMonth();
    this.buildMonthGrid();
    this.loadMonth();
  }

  loadMonth(): void {
    const first = new Date(this.monthYear, this.monthMonth, 1);
    const last  = new Date(this.monthYear, this.monthMonth + 1, 0);
    last.setHours(23, 59, 59, 0);
    const start = toIsoLocal(first);
    const end   = toIsoLocal(last);
    this.monthLoading = true;
    this.prospect.getCalendarPosts(start, end).subscribe({
      next: posts => {
        this.monthPosts  = posts.filter(p => !this.networkFilter || p.network === this.networkFilter);
        this.monthLoading = false;
      },
      error: () => { this.monthLoading = false; },
    });
  }

  /** Returns posts that fall on a specific calendar day (month view). */
  getMonthDayPosts(day: Date): CalendarPost[] {
    return this.monthPosts.filter(p => {
      if (!p.scheduled_at) return false;
      const d = new Date(p.scheduled_at);
      return isSameDay(d, day);
    });
  }

  isCurrentMonth(day: Date): boolean {
    return day.getMonth() === this.monthMonth && day.getFullYear() === this.monthYear;
  }

  /** Jump to week view centered on the clicked day */
  goToWeekOf(day: Date): void {
    this.currentWeekStart = startOfISOWeek(day);
    this.viewMode = 'week';
    this.buildGrid();
    this.load();
  }

  zoom: ZoomLevel = 'normal';
  readonly zoomLevels: ZoomLevel[] = ['compact', 'normal', 'large'];

  get cellHeight(): number { return ZOOM_CELL_HEIGHT[this.zoom]; }

  zoomIn():  void { const i = this.zoomLevels.indexOf(this.zoom); if (i < this.zoomLevels.length - 1) this.zoom = this.zoomLevels[i + 1]; }
  zoomOut(): void { const i = this.zoomLevels.indexOf(this.zoom); if (i > 0) this.zoom = this.zoomLevels[i - 1]; }
  get canZoomIn():  boolean { return this.zoom !== 'large';   }
  get canZoomOut(): boolean { return this.zoom !== 'compact'; }

  /** En modo compacto los bloques solo muestran el icono de red */
  get isCompact(): boolean { return this.zoom === 'compact'; }

  // ── Línea de hora actual ─────────────────────────────────────────────────
  now: Date = new Date();
  private _nowTimer: any;

  get nowHour():       number { return this.now.getHours(); }
  get nowMinutePct():  number { return (this.now.getMinutes() / 60) * 100; }
  get nowVisible():    boolean {
    return this.nowHour >= HOURS_START && this.nowHour <= HOURS_END;
  }

  isCurrentHour(h: number): boolean {
    return this.nowVisible && h === this.nowHour && this.days.some(d => isToday(d));
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  draggedPost: CalendarPost | null = null;
  dragOverKey: string | null = null;
  private _dropHandled = false;

  cellKey(day: Date, hour: number): string {
    return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}-${hour}`;
  }

  isDragOver(day: Date, hour: number): boolean {
    return this.dragOverKey === this.cellKey(day, hour);
  }

  onDragStart(post: CalendarPost, event: DragEvent): void {
    this.draggedPost = post;
    this._dropHandled = false;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(post.post_id));
    }
  }

  onDragEnd(_event: DragEvent): void {
    this.draggedPost = null;
    this.dragOverKey = null;
  }

  onDragOver(day: Date, hour: number, event: DragEvent): void {
    if (!this.draggedPost) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverKey = this.cellKey(day, hour);
  }

  onDragLeave(day: Date, hour: number, event: DragEvent): void {
    // Only clear if the mouse is actually leaving the cell (not entering a child)
    const related = event.relatedTarget as HTMLElement | null;
    const cell = event.currentTarget as HTMLElement;
    if (related && cell.contains(related)) return;
    if (this.dragOverKey === this.cellKey(day, hour)) this.dragOverKey = null;
  }

  onDrop(day: Date, hour: number, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverKey = null;
    this._dropHandled = true;

    const post = this.draggedPost;
    this.draggedPost = null;
    if (!post) return;

    // Build new scheduled_at in local time (MySQL format)
    const newDt = startOfDay(day);
    newDt.setHours(hour, 0, 0, 0);
    const newScheduledAt = toIsoLocal(newDt).replace('T', ' ') + ':00';
    const newScheduledAtIso = toIsoLocal(newDt);

    // Optimistic update
    const idx = this.posts.findIndex(p => p.post_id === post.post_id);
    if (idx >= 0) {
      const updated = { ...this.posts[idx], scheduled_at: newScheduledAtIso };
      this.posts = [
        ...this.posts.slice(0, idx),
        updated,
        ...this.posts.slice(idx + 1),
      ];
    }

    this.prospect.updateSocialPost(post.post_id, { scheduled_at: newScheduledAt })
      .subscribe({ error: () => this.load() }); // revert on error
  }

  constructor(private prospect: ProspectService) {}

  ngOnInit(): void {
    this.buildGrid();
    this.load();
    this._nowTimer = setInterval(() => { this.now = new Date(); }, 60_000);
  }

  ngOnDestroy(): void {
    clearInterval(this._nowTimer);
  }

  buildGrid(): void {
    this.days  = weekDays(this.currentWeekStart);
    this.hours = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i);
  }

  load(): void {
    this.loading = true;
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(this.currentWeekStart.getDate() + 6);

    const start = toIsoLocal(startOfDay(this.currentWeekStart));
    const endDay = new Date(weekEnd);
    endDay.setHours(23, 59, 59, 0);
    const end = toIsoLocal(endDay);

    this.prospect.getCalendarPosts(start, end).subscribe({
      next: posts => {
        this.posts = posts.filter(p =>
          !this.networkFilter || p.network === this.networkFilter
        );
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  prevWeek(): void {
    this.currentWeekStart = addWeeks(this.currentWeekStart, -1);
    this.buildGrid();
    this.load();
  }

  nextWeek(): void {
    this.currentWeekStart = addWeeks(this.currentWeekStart, 1);
    this.buildGrid();
    this.load();
  }

  goToday(): void {
    this.currentWeekStart = startOfISOWeek(new Date());
    this.buildGrid();
    this.load();
  }

  getPostsForSlot(day: Date, hour: number): CalendarPost[] {
    return this.posts.filter(p => {
      if (!p.scheduled_at) return false;
      const d = new Date(p.scheduled_at);
      return isSameDay(d, day) && d.getHours() === hour;
    });
  }

  openSlot(day: Date, hour: number): void {
    const dt = startOfDay(day);
    dt.setHours(hour, 0, 0, 0);
    this.editorPost              = null;
    this.editorPresetNetwork     = this.networkFilter || null;
    // Use LOCAL time string so the modal datetime-local input shows the right hour
    this.editorPresetScheduledAt = toIsoLocal(dt);
    this.showEditorModal         = true;
  }

  openPost(post: CalendarPost, event: Event): void {
    event.stopPropagation();
    this.editorPost              = { ...post };
    this.editorPresetNetwork     = null;
    this.editorPresetScheduledAt = null;
    this.showEditorModal         = true;
  }

  onEditorSaved(post: any): void {
    const idx = this.posts.findIndex(p => p.post_id === post.post_id);
    if (idx >= 0) {
      this.posts[idx] = post;
    } else {
      this.posts = [...this.posts, post];
    }
    this.showEditorModal = false;
  }

  onEditorClosed(): void {
    this.showEditorModal = false;
  }

  fillWeekWithAI(): void {
    if (!confirm('¿Rellenar la semana con posts generados por IA? Se crearán borradores en los slots vacíos.')) return;
    this.fillLoading = true;
    const networks = this.networkFilter
      ? [this.networkFilter]
      : ['instagram', 'facebook', 'linkedin', 'twitter'];
    const slots: any[] = [];

    this.days.forEach(day => {
      [9, 13, 18].forEach(hour => {
        networks.forEach(net => {
          const dt = startOfDay(day);
          dt.setHours(hour);
          const existing = this.getPostsForSlot(day, hour).find(p => p.network === net);
          if (!existing) {
            slots.push({
              network: net,
              scheduled_at: toIsoLocal(dt),
              content_type: 'feature',
              generate_text: true,
            });
          }
        });
      });
    });

    if (slots.length === 0) {
      this.fillLoading = false;
      return;
    }
    this.prospect.batchSchedulePosts(slots).subscribe({
      next: () => { this.fillLoading = false; this.load(); },
      error: () => { this.fillLoading = false; },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatDay(day: Date): string {
    return `${DAY_NAMES_ES[day.getDay()]} ${day.getDate()}`;
  }

  formatHour(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  isToday(day: Date): boolean {
    return isToday(day);
  }

  weekLabel(): string {
    const s = this.currentWeekStart;
    const e = this.days[this.days.length - 1];
    if (!e) return '';
    const startStr = `${s.getDate()} ${MONTH_NAMES_ES[s.getMonth()]}`;
    const endStr   = `${e.getDate()} ${MONTH_NAMES_ES[e.getMonth()]} ${e.getFullYear()}`;
    return `${startStr} — ${endStr}`;
  }

  postClass(post: CalendarPost): string {
    return `post-block net-${post.network} status-${(post.status || '').toLowerCase()}`;
  }

  networkIcon(network: string): string {
    const icons: Record<string, string> = {
      instagram: 'bi-instagram', facebook: 'bi-facebook',
      linkedin: 'bi-linkedin', twitter: 'bi-twitter-x',
    };
    return icons[network] || 'bi-share';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador', APPROVED: 'Aprobado', SCHEDULED: 'Programado',
      PUBLISHED: 'Publicado', REJECTED: 'Rechazado',
    };
    return map[status] || status;
  }

  trackByDay(_: number, day: Date): number { return day.getTime(); }
  trackByHour(_: number, h: number): number { return h; }
  trackByPost(_: number, p: CalendarPost): number { return p.post_id; }

  onPlanDone(count: number): void {
    this.showMonthlyWizard = false;
    if (count > 0) {
      this.load();
    }
  }
}
