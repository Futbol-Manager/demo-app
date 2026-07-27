import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { ClubService } from 'src/app/core/services/club/club.service';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { SportContextService } from 'src/app/core/services/sport-context/sport-context.service';
import { SportConfig, getSportConfig } from 'src/app/core/models/sport/sport-config.model';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

export interface ClasificacionResumenItem {
  teamId: number;
  teamName: string;
  sport?: string;
  hasUrl: boolean;
  hasData: boolean;
  lastUpdated: string | null;
  myPosition: number | null;
  totalTeams: number | null;
  points: number | null;
  form: string | null;
  rawHtml: string | null;
  headers: string[] | null;
  topClasificacion: {
    posicion: string; nombre: string; puntos: string; forma: string;
    jugados: string; ganados: string; empatados: string; perdidos: string;
    golesAFavor: string; golesEnContra: string; datos?: Record<string, string>;
  }[];
  safeHtml?: SafeHtml | null;
}

@Component({
  selector: 'app-club-clasificaciones',
  templateUrl: './club-clasificaciones.component.html',
  styleUrls: ['./club-clasificaciones.component.scss'],
})
export class ClubClasificacionesComponent implements OnInit, OnDestroy {
  teamId = 0;
  clubId = 0;
  items: ClasificacionResumenItem[] = [];
  loading = true;
  error = false;

  aiLoadingTeamId: number | null = null;
  aiResults: Record<number, string> = {};
  aiErrors: Record<number, string> = {};
  aiOpenTeamId: number | null = null;

  urlEditOpenTeamId: number | null = null;
  urlInputs: Record<number, string> = {};
  urlSaving: Record<number, boolean> = {};
  urlFeedback: Record<number, { ok: boolean; msg: string }> = {};

  usuarioActual: User | null = null;

  sportConfig: SportConfig = getSportConfig('futbol');
  currentSport: string = 'futbol';

  // Filtro de deporte
  activeSport = '';

  get availableSports(): { sport: string; emoji: string; count: number }[] {
    const map = new Map<string, { emoji: string; count: number }>();
    for (const item of this.items) {
      const s = item.sport || 'futbol';
      if (!map.has(s)) map.set(s, { emoji: getSportConfig(s).emoji, count: 0 });
      map.get(s)!.count++;
    }
    return Array.from(map.entries()).map(([sport, v]) => ({ sport, ...v }));
  }

  get filteredItems(): ClasificacionResumenItem[] {
    if (!this.activeSport) return this.items;
    return this.items.filter(i => (i.sport || 'futbol') === this.activeSport);
  }

  setSportFilter(sport: string): void {
    this.activeSport = this.activeSport === sport ? '' : sport;
    this.cdr.detectChanges();
  }

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private clubService: ClubService,
    private aiChatService: AiChatService,
    private loginService: LoginService,
    private translate: TranslateService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private sportContext: SportContextService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.sportContext.currentSport$.pipe(takeUntil(this.destroy$)).subscribe(s => {
      this.currentSport = s;
      this.sportConfig = this.sportContext.getConfig();
    });
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.usuarioActual = user;
    });
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.teamId = +params['teamId'] || 0;
      this.clubId = +params['clubId'] || 0;
      this.loadResumen();
    });
  }

  getSportConfigFor(sport: string): SportConfig {
    return getSportConfig(sport || 'futbol');
  }

  getHeaderLabel(h: string): string {
    if (h === 'GF') return this.sportConfig.scoringUnitPlural;
    if (h === 'GC') return `vs ${this.sportConfig.scoringUnitPlural}`;
    return h;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadResumen(): void {
    this.loading = true;
    this.error = false;
    const request$ = this.clubId > 0
      ? this.clubService.getClasificacionResumenByClub(this.clubId)
      : this.clubService.getClasificacionResumen(this.teamId);
    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.items = ((res?.data ?? []) as ClasificacionResumenItem[]).map(item => ({
          ...item,
          safeHtml: item.rawHtml
            ? this.sanitizer.bypassSecurityTrustHtml(item.rawHtml)
            : null,
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.notification.error('CLUB_CLASIFICACIONES.LOAD_ERROR');
        this.cdr.detectChanges();
      },
    });
  }

  goToClasificacion(item: ClasificacionResumenItem): void {
    this.router.navigate(['/dashboard/clasificacion-resultados', item.teamId]);
  }

  positionClass(pos: number | null): string {
    if (pos === null) return '';
    if (pos === 1) return 'pos-gold';
    if (pos <= 3) return 'pos-podium';
    if (pos <= 6) return 'pos-playoff';
    return 'pos-normal';
  }

  formBadgeClass(result: string): string {
    const r = result?.trim().toUpperCase();
    if (r === 'G' || r === 'W' || r === 'V') return 'form-win';
    if (r === 'E' || r === 'D') return 'form-draw';
    if (r === 'P' || r === 'L') return 'form-loss';
    return 'form-unknown';
  }

  formLetters(form: string | null): string[] {
    if (!form) return [];
    return form.split(/[\s,]+/).filter(Boolean).slice(-5);
  }

  requestAiSummary(item: ClasificacionResumenItem): void {
    if (this.aiLoadingTeamId === item.teamId) return;
    this.aiOpenTeamId = item.teamId;

    if (this.aiResults[item.teamId]) return;

    this.aiLoadingTeamId = item.teamId;
    this.aiErrors[item.teamId] = '';

    const userId = this.usuarioActual?.userId ?? 0;
    const rawClubId = sessionStorage.getItem('clubId');
    const clubId = rawClubId ? Number(rawClubId) : null;

    const posText = item.myPosition
      ? `${item.myPosition}º de ${item.totalTeams}`
      : this.translate.instant('CLUB_CLASIFICACIONES.AI_POS_UNKNOWN');

    const topRows = (item.topClasificacion ?? [])
      .map((r, i) => `${i + 1}. ${r.nombre} — ${r.puntos} pts`)
      .join('\n');

    const prompt = this.translate.instant('CLUB_CLASIFICACIONES.AI_PROMPT', {
      teamName: item.teamName,
      position: posText,
      points: item.points ?? '-',
      form: item.form ?? '-',
      top5: topRows || this.translate.instant('CLUB_CLASIFICACIONES.AI_NO_DATA'),
    });

    this.aiChatService
      .sendMessage(userId, clubId, 'club/clasificaciones', prompt, 'users', item.teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.aiResults[item.teamId] = res?.response ?? this.translate.instant('CLUB_CLASIFICACIONES.AI_EMPTY');
          this.aiLoadingTeamId = null;
          this.notification.success('CLUB_CLASIFICACIONES.AI_SUMMARY_READY');
        },
        error: () => {
          this.aiErrors[item.teamId] = this.translate.instant('CLUB_CLASIFICACIONES.AI_ERROR');
          this.aiLoadingTeamId = null;
          this.notification.error('CLUB_CLASIFICACIONES.AI_ERROR');
        },
      });
  }

  closeAiPanel(): void {
    this.aiOpenTeamId = null;
  }

  openUrlEditor(item: ClasificacionResumenItem): void {
    this.urlEditOpenTeamId = item.teamId;
    if (!this.urlInputs[item.teamId]) {
      this.urlInputs[item.teamId] = '';
    }
    this.urlFeedback[item.teamId] = { ok: false, msg: '' };
  }

  closeUrlEditor(teamId: number): void {
    if (this.urlEditOpenTeamId === teamId) this.urlEditOpenTeamId = null;
  }

  saveUrl(item: ClasificacionResumenItem): void {
    const url = (this.urlInputs[item.teamId] || '').trim();
    if (!url) return;
    this.urlSaving[item.teamId] = true;
    this.urlFeedback[item.teamId] = { ok: false, msg: '' };
    this.clubService.saveTeamUrl(item.teamId, url).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.urlSaving[item.teamId] = false;
        this.urlFeedback[item.teamId] = {
          ok: true,
          msg: this.translate.instant('CLUB_CLASIFICACIONES.URL_SAVED'),
        };
        item.hasUrl = true;
        this.notification.success('CLUB_CLASIFICACIONES.URL_SAVED');
        setTimeout(() => {
          this.urlEditOpenTeamId = null;
          this.loadResumen();
        }, 1200);
      },
      error: () => {
        this.urlSaving[item.teamId] = false;
        this.urlFeedback[item.teamId] = {
          ok: false,
          msg: this.translate.instant('CLUB_CLASIFICACIONES.URL_ERROR'),
        };
        this.notification.error('CLUB_CLASIFICACIONES.URL_ERROR');
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  /** Devuelve el valor de una celda usando el mapa 'datos' dinámico o campos estándar como fallback. */
  getCellValue(row: any, header: string): string {
    if (row.datos && row.datos[header] != null) return row.datos[header];
    const map: Record<string, string> = {
      'Pts': row.puntos, 'J': row.jugados,
      'G': row.ganados, 'E': row.empatados, 'P': row.perdidos,
      'GF': row.golesAFavor, 'GC': row.golesEnContra, 'Forma': row.forma,
    };
    return map[header] ?? '';
  }

  isFormaHeader(h: string): boolean {
    return h.toLowerCase() === 'forma' || h.toLowerCase() === 'form';
  }
}
