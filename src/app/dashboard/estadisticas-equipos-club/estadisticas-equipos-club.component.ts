import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { VoiceRecognitionService } from 'src/app/core/services/voice-recognition/voice-recognition.service';
import { Subscription } from 'rxjs';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';
import { AiPageContextService } from 'src/app/core/services/ai-chat/ai-page-context.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';
import { SportContextService } from 'src/app/core/services/sport/sport-context.service';
import { sportScoringPlural } from 'src/app/core/utils/sport-ui-i18n';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-estadisticas-equipos-club',
  templateUrl: './estadisticas-equipos-club.component.html',
  styleUrls: ['./estadisticas-equipos-club.component.scss'],
})
export class EstadisticasEquiposClubComponent implements OnInit, OnDestroy {
  get isDemo(): boolean { return isDemoMode() === true; }

  clubId = 0;
  resumenes: any[] = [];
  resumentotales: any[] = [];
  datosCargados = false;
  partidos: any[] = [];
  partidosTeamSelected: any[] = [];

  playerSearch: string = '';
  filteredPlayers: any[] = [];
  mostarTabla = false;
  equipoSeleccionado = '';
  loading = true;

  // Filtro de deporte y búsqueda (multideporte)
  activeSport = '';
  searchQuery = '';

  // Ordenamiento de la tabla
  sortCol = 'puntos';
  sortDir: 'asc' | 'desc' = 'desc';

  // Fila expandida (últimos partidos del equipo)
  expandedTeamId: number | null = null;

  // Todos los resúmenes sin filtrar (para calcular deportes disponibles)
  private resumentotalesAll: any[] = [];

  // AI Panel
  aiPanelOpen = false;
  aiPrompt = '';
  aiMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  aiLoading = false;
  @ViewChild('aiMessagesContainer') aiMessagesContainer!: ElementRef;
  private historyConvId: string | null = null;

  // Voice recognition
  isRecording = false;
  isVoiceSupported = false;
  private voiceTranscriptSub: Subscription | null = null;
  private voiceListeningSub: Subscription | null = null;
  private voiceErrorSub: Subscription | null = null;
  private voiceTranscriptBase = '';

  userId = 0;

  sportConfig: SportConfig = getSportConfig('futbol');
  currentSport = 'futbol';
  private langSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private http: HttpClient,
    private elementRef: ElementRef,
    private location: Location,
    private voiceRecognition: VoiceRecognitionService,
    private translate: TranslateService,
    private aiChatService: AiChatService,
    private aiPageContext: AiPageContextService,
    private loginService: LoginService,
    private tutorialService: TutorialService,
    private sportContextService: SportContextService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Si el deporte incluye este campo en actas/partidos (modal). */
  hasMatchStatKey(key: string): boolean {
    return this.sportConfig.matchStatsFields.some((f) => f.key === key);
  }

  get labelScoringFor(): string {
    const k = `SPORT_UI.SHORT_SCORING_FOR.${this.currentSport}`;
    const v = this.translate.instant(k);
    if (v !== k) return v;
    return this.sportConfig.scoringUnitPlural.slice(0, 3);
  }

  get labelScoringAgainst(): string {
    const k = `SPORT_UI.SHORT_SCORING_AGAINST.${this.currentSport}`;
    const v = this.translate.instant(k);
    if (v !== k) return v;
    return 'C';
  }

  get labelDiffScoring(): string {
    const unit = sportScoringPlural(this.translate, this.currentSport, this.sportConfig.scoringUnitPlural);
    return this.translate.instant('SPORT_UI.DIFF_SCORING', { unit });
  }

  get aiSuggestionGoalsComparison(): string {
    const unit = sportScoringPlural(this.translate, this.currentSport, this.sportConfig.scoringUnitPlural).toLowerCase();
    return this.translate.instant('SPORT_UI.AI_COMPARE_SCORING_PROMPT', { unit });
  }

  /** Deportes únicos presentes en los datos cargados (para los chips de filtro). */
  get availableSports(): { sport: string; emoji: string; count: number }[] {
    const map = new Map<string, { emoji: string; count: number }>();
    for (const r of this.resumentotalesAll) {
      const s: string = r.sport || 'futbol';
      if (!map.has(s)) {
        map.set(s, { emoji: getSportConfig(s).emoji, count: 0 });
      }
      map.get(s)!.count++;
    }
    return Array.from(map.entries()).map(([sport, v]) => ({ sport, ...v }));
  }

  /** Resúmenes filtrados por deporte + búsqueda + ordenados por la columna activa. */
  get filteredResumenes(): any[] {
    let list = this.activeSport
      ? this.resumentotales.filter(r => (r.sport || 'futbol') === this.activeSport)
      : this.resumentotales;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r =>
        (r.categoria || '').toLowerCase().includes(q) ||
        (r.division || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const av = a[this.sortCol] ?? 0;
      const bv = b[this.sortCol] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number);
      return this.sortDir === 'asc' ? cmp : -cmp;
    });
  }

  sortBy(col: string): void {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = col;
      this.sortDir = col === 'categoria' ? 'asc' : 'desc';
    }
    this.cdr.markForCheck();
  }

  toggleExpand(teamId: number): void {
    this.expandedTeamId = this.expandedTeamId === teamId ? null : teamId;
    this.cdr.markForCheck();
  }

  getExpandedMatches(teamId: number): any[] {
    const team = this.resumenes.find(r => r.teamId === teamId);
    return team?.partidos?.slice(0, 8) ?? [];
  }

  /** Clase de zona (estilo liga): campeón, ascenso, playoff, descenso. */
  zoneClass(i: number, total: number): string {
    if (total < 3) return '';
    if (i === 0) return 'zone-champion';
    if (i <= Math.max(1, Math.floor(total * 0.25))) return 'zone-promotion';
    if (i <= Math.floor(total * 0.45)) return 'zone-playoff';
    if (i >= total - Math.max(1, Math.floor(total * 0.25))) return 'zone-relegation';
    return '';
  }

  winPct(r: any): number {
    if (!r.partidos) return 0;
    return Math.round((r.victorias / r.partidos) * 100);
  }

  /** Genera los puntos SVG para el sparkline (60x28 px). */
  sparklinePoints(sparkData: number[]): string {
    if (!sparkData || sparkData.length < 2) return '';
    const W = 60, H = 28, pad = 3;
    const max = Math.max(...sparkData, 1);
    const min = Math.min(...sparkData);
    const range = max - min || 1;
    return sparkData.map((v, i) => {
      const x = pad + (i / (sparkData.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / range) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  setSportFilter(sport: string): void {
    this.activeSport = sport;
    this.sportConfig = getSportConfig(sport);
    this.cdr.markForCheck();
  }

  getSportConfigFor(sport?: string): SportConfig {
    return getSportConfig(sport);
  }

  get matchModalColumns(): { key: string; labelKey: string }[] {
    return this.sportConfig.matchStatsFields.filter(
      f => !['golesAFavor', 'golesEnContra'].includes(f.key)
    );
  }

  exportToPdf(): void {
    window.print();
  }

  ngOnInit(): void {
    this.currentSport = this.sportContextService.getSport();
    this.sportConfig = getSportConfig(this.currentSport);
    this.loginService.usuarioActual.pipe().subscribe(user => {
      if (user) this.userId = user.userId;
    });
    this.route.params.subscribe((params) => {
      this.clubId = +params['clubId'];
    });
    this.getListaPostpartidos();
    this.initVoiceRecognition();
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    setTimeout(() => this.tutorialService.start('estadisticas-equipos-club', true), 600);
  }

  private initVoiceRecognition(): void {
    this.isVoiceSupported = this.voiceRecognition.isSupported();

    // Subscribe to transcript
    this.voiceTranscriptSub = this.voiceRecognition.transcript$.subscribe(result => {
      if (result.isFinal) {
        // Final transcript: commit to input
        this.voiceTranscriptBase = this.aiPrompt.trim()
          ? this.aiPrompt + ' ' + result.transcript 
          : result.transcript;
        this.aiPrompt = this.voiceTranscriptBase;
      } else {
        // Interim transcript: show in real-time but don't commit yet
        const interim = result.transcript;
        this.aiPrompt = this.voiceTranscriptBase
          ? this.voiceTranscriptBase + ' ' + interim 
          : interim;
      }
    });

    this.voiceListeningSub = this.voiceRecognition.isListening$.subscribe(isListening => {
      this.isRecording = isListening;
      if (!isListening) {
        // When recording stops, commit whatever we have
        this.voiceTranscriptBase = this.aiPrompt;
      }
    });

    this.voiceErrorSub = this.voiceRecognition.error$.subscribe(error => {
      console.warn('Voice recognition error:', error);
    });
  }

  toggleVoiceRecognition(): void {
    if (this.isRecording) {
      this.voiceRecognition.stop();
    } else {
      // Save current text as base
      this.voiceTranscriptBase = this.aiPrompt.trim();
      this.voiceRecognition.start('es-ES');
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.voiceTranscriptSub?.unsubscribe();
    this.voiceListeningSub?.unsubscribe();
    this.voiceErrorSub?.unsubscribe();
    // El contexto se mantiene activo para que el chatbot FAB pueda usarlo
    // desde cualquier otra página. El usuario puede descartarlo manualmente.
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
    }
  }
  goBack(): void {
    this.location.back();
  }
  getListaPostpartidos() {
    this.loading = true;
    this.datosCargados = false;
    this.resumentotales = [];
    this.resumentotalesAll = [];
    this.clubService.getListTeamsOfClubByStadistics(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.resumenes = response.data;
          for (let index = 0; index < this.resumenes.length; index++) {
            if (!this.resumenes[index].nameTeam.includes('Sin equipo')) {
              this.datosResumentTotales(this.resumenes[index]);
            }
          }
          // Auto-seleccionar el primer deporte disponible
          const first = this.availableSports[0];
          if (first) {
            this.activeSport = first.sport;
            this.sportConfig = getSportConfig(first.sport);
          }
          this.datosCargados = true;
          this.loading = false;
          this.publishPageContext();
        } else {
          console.error(
            'La respuesta del servicio no tiene la estructura esperada',
            response
          );
        }
      },

      (error) => {
        this.loading = false;
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  datosResumentTotales(team: any) {
    let vic = 0;
    let emp = 0;
    let der = 0;
    let gf = 0;
    let gc = 0;
    let dg = 0;
    let pun = 0;
    const sparkData: number[] = [];

    this.partidos = team.partidos;

    // Form detallado con rival y marcador (últimos 5, cronológico)
    const ultimosDetallados = [...this.partidos]
      .filter((p) => p.resultado === 'V' || p.resultado === 'E' || p.resultado === 'D')
      .slice(0, 5)
      .reverse()
      .map((p) => ({
        resultado: p.resultado,
        rival: p.matchPreparation?.rivalName ?? '—',
        gf: p.golesAFavor ?? 0,
        gc: p.golesEnContra ?? 0,
        fecha: p.matchPreparation?.matchDate ?? '',
      }));

    // Sparkline: puntos acumulados por partido (cronológico)
    let cumPun = 0;
    for (const p of [...team.partidos].reverse()) {
      if (p.resultado === 'V') cumPun += 3;
      else if (p.resultado === 'E') cumPun += 1;
      sparkData.push(cumPun);
    }

    for (let partido of team.partidos) {
      switch (partido.resultado) {
        case 'V':
          vic++;
          pun = pun + 3;
          break;
        case 'E':
          emp++;
          pun = pun + 1;
          break;
        case 'D':
          der++;
          break;
      }

      gf = gf + partido.golesAFavor;
      gc = gc + partido.golesEnContra;
      dg = gf - gc;
    }

    const resumen = {
      teamId: team.teamId,
      equipo: team.nameTeam,
      categoria: team.categoria || '',
      division: team.division || '',
      sport: team.sport || 'futbol',
      temporada: team.temporada || '',
      partidos: team.partidos.length,
      victorias: vic,
      empates: emp,
      derrotas: der,
      gf: gf,
      gc: gc,
      dg: dg,
      puntos: pun,
      ultimos: ultimosDetallados,
      sparkData,
    };

    this.resumentotales.push(resumen);
    this.resumentotalesAll.push(resumen);
  }

  verTablaequipo(index: number) {
    //console.log(this.resumenes[index].teamId);
    //console.log(this.resumenes[index].partidos);
    this.partidosTeamSelected = this.resumenes[index].partidos;
    this.filteredPlayers = this.partidosTeamSelected;
    this.equipoSeleccionado = this.resumenes[index].nameTeam;
    this.mostarTabla = true;
  }
  cerrarModal(): void {
    this.mostarTabla = false;
  }

  applyFilter(): void {
    const filter = this.normalizeText(this.playerSearch);
    this.filteredPlayers = this.partidosTeamSelected.filter((partido) => {
      return (
        (partido.matchPreparation.rivalName &&
          this.normalizeText(partido.matchPreparation.rivalName).includes(
            filter
          )) ||
        (partido.resultado &&
          this.normalizeText(partido.resultado).includes(filter))
      );
    });
  }

  normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  exportTableToExcel(): void {
    try {
      const data = this.filteredResumenes.map((r, i) => ({
        '#': i + 1,
        [this.translate.instant('ESTADIS_EQUIPO.TABLE.TEAM')]: r.categoria,
        [this.translate.instant('ESTADIS_EQUIPO.TABLE.DIVISION')]: r.division,
        [this.translate.instant('ESTADIS_EQUIPO.TABLE.PJ')]: r.partidos,
        [this.translate.instant('ESTADIS_EQUIPO.TABLE.PTS')]: r.puntos,
        [this.translate.instant('ESTADIS_EQUIPO.TABLE.W')]: r.victorias,
        [this.translate.instant('ESTADIS_EQUIPO.TABLE.D')]: r.empates,
        [this.translate.instant('ESTADIS_EQUIPO.TABLE.L')]: r.derrotas,
        [this.labelScoringFor]: r.gf,
        [this.labelScoringAgainst]: r.gc,
        [this.labelDiffScoring]: r.dg,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, this.translate.instant('ESTADIS_EQUIPO.TITLE'));
      const sport = this.activeSport || this.currentSport;
      const fileName = `sphaira_tabla_${sport}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exportando a Excel', e);
    }
  }

  openInfoPostPartido(value: number) {}

  getIcono(resultado: string): string {
    const iconos: { [key: string]: string } = {
      V: '🟢',
      E: '🟡',
      D: '🔴',
    };
    return iconos[resultado] || '❓';
  }

  // ===== AI PANEL METHODS =====
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendAiMessage();
    }
  }

  toggleAiPanel(): void {
    this.aiPanelOpen = !this.aiPanelOpen;
    if (this.aiPanelOpen && this.aiMessages.length === 0) {
      // Mensaje de bienvenida
      this.aiMessages.push({
        role: 'assistant',
        content: this.translate.instant('AI_PANEL.WELCOME_TEAMS')
      });
    }
  }

  useSuggestion(suggestion: string): void {
    this.aiPrompt = suggestion;
    this.sendAiMessage();
  }

  sendAiMessage(): void {
    if (!this.aiPrompt.trim() || this.aiLoading) return;

    const userMessage = this.aiPrompt.trim();
    this.aiMessages.push({ role: 'user', content: userMessage });
    this.aiPrompt = '';
    this.aiLoading = true;
    setTimeout(() => this.scrollAiToBottom(), 100);

    const { contextText, codeToReal } = this.buildAnonymizedTeamStats();

    let anonymizedMessage = userMessage;
    codeToReal.forEach((real, code) => {
      anonymizedMessage = anonymizedMessage.replace(
        new RegExp(real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), code
      );
    });

    const enrichedMessage = anonymizedMessage
      + '\n\n[ESTADÍSTICAS DE EQUIPOS - DATOS ANONIMIZADOS]\n' + contextText;

    const history = this.aiMessages.slice(-6).map(m => ({ role: m.role, text: m.content }));

    this.aiChatService.sendMessage(
      this.userId, this.clubId, 'estadisticas-equipos', enrichedMessage, 'users', null, history
    ).subscribe({
      next: (resp) => {
        let response = resp.success
          ? (resp.response || 'Sin respuesta.')
          : (resp.message || this.translate.instant('AI_PANEL.ERROR_MESSAGE'));
        // De-anonymize: longest codes first to avoid partial matches
        Array.from(codeToReal.entries())
          .sort((a, b) => b[0].length - a[0].length)
          .forEach(([code, real]) => { response = response.split(code).join(real); });
        this.aiMessages.push({ role: 'assistant', content: response });
        this.aiLoading = false;
        this.saveToHistory();
        setTimeout(() => this.scrollAiToBottom(), 100);
      },
      error: () => {
        this.aiMessages.push({ role: 'assistant', content: this.translate.instant('AI_PANEL.ERROR_MESSAGE') });
        this.aiLoading = false;
        setTimeout(() => this.scrollAiToBottom(), 100);
      }
    });
  }

  private publishPageContext(): void {
    const { contextText, codeToReal } = this.buildAnonymizedTeamStats();
    this.aiPageContext.setContext({ type: 'estadisticas-equipos', contextText, codeToReal });
  }

  private buildAnonymizedTeamStats(): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines: string[] = [
      'Código | Partidos | Victorias | Empates | Derrotas | GF | GC | DG | Puntos'
    ];
    this.resumentotales.forEach((t, i) => {
      const code = `EQUIPO_STAT_${i + 1}`;
      codeToReal.set(code, t.equipo || `Equipo ${i + 1}`);
      lines.push(
        `${code} | ${t.partidos || '0'} | ${t.victorias || '0'} | `
        + `${t.empates || '0'} | ${t.derrotas || '0'} | ${t.gf || '0'} | `
        + `${t.gc || '0'} | ${t.dg || '0'} | ${t.puntos || '0'}`
      );
    });
    return { contextText: lines.join('\n'), codeToReal };
  }

  private scrollAiToBottom(): void {
    if (this.aiMessagesContainer) {
      const element = this.aiMessagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private saveToHistory(): void {
    const userMsgs = this.aiMessages.filter(m => m.role === 'user');
    if (userMsgs.length === 0 || !this.userId) return;
    const title = '[Estadísticas Equipos] ' + userMsgs[0].content.substring(0, 40)
      + (userMsgs[0].content.length > 40 ? '...' : '');
    const convId = this.historyConvId || ('conv_estadequip_' + Date.now());
    this.historyConvId = convId;
    const messages = this.aiMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, text: m.content }));
    this.aiChatService.saveHistory(this.userId, convId, title, this.clubId, 'estadisticas-equipos', messages).subscribe();
  }

}
