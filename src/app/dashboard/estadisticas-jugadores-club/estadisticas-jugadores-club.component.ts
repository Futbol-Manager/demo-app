import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PlayerEstadistica } from 'src/app/core/services/player/player.model';
import { VoiceRecognitionService } from 'src/app/core/services/voice-recognition/voice-recognition.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';
import { AiPageContextService } from 'src/app/core/services/ai-chat/ai-page-context.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';
import { SportContextService } from 'src/app/core/services/sport/sport-context.service';
import { sportScoringPlural } from 'src/app/core/utils/sport-ui-i18n';
import * as $ from 'jquery';

@Component({
  selector: 'app-estadisticas-jugadores-club',
  templateUrl: './estadisticas-jugadores-club.component.html',
  styleUrls: ['./estadisticas-jugadores-club.component.scss'],
})
export class EstadisticasJugadoresClubComponent implements OnInit, OnDestroy {
  clubId = 0;
  players: any[] = [];
  totalMatchs: number = 0;
  datosCargados = false;

  golesTodosAvanzadoAFavor: any[] = [];
  golesAvanzadoAFavor: any[] = [];
  loading = true;
  // PAGINACIÓN
  page = 1;
  pageSize = 25;
  pageSizes = [10, 25, 50, 100];

  totalRecords = 0;
  totalPages = 0;

  playersPaged: any[] = [];

  // FILTROS
  searchTerm = '';
  filterTeam = '';
  filterPosition = '';
  filterSport = '';

  // ORDENAMIENTO
  sortColumn: string = 'goles';
  sortDirection: 'asc' | 'desc' = 'desc';

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
    private voiceRecognition: VoiceRecognitionService,
    private translate: TranslateService,
    private aiChatService: AiChatService,
    private aiPageContext: AiPageContextService,
    private loginService: LoginService,
    private tutorialService: TutorialService,
    private sportContextService: SportContextService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Columnas de penaltis/tiros libres (fútbol / fútbol sala). */
  get showPenaltyColumns(): boolean {
    const c = this.sportConfig.playerStatsColumns;
    return c.includes('golesPenalti') || c.includes('penaltis');
  }

  /** Tarjetas amarillas/rojas u otras tarjetas del deporte. */
  get showCardsColumn(): boolean {
    const c = this.sportConfig.playerStatsColumns;
    return c.includes('tarjetasAmarillas') || c.includes('tarjetasRojas') || c.includes('tarjetas');
  }

  get scoringPluralLabel(): string {
    return sportScoringPlural(this.translate, this.currentSport, this.sportConfig.scoringUnitPlural);
  }

  get mediaScoringPerMatchLabel(): string {
    return this.translate.instant('SPORT_UI.MEDIA_SCORING_PER_MATCH', {
      scoringUnit: this.scoringPluralLabel.toLowerCase(),
    });
  }

  get aiSuggestionTopScorer(): string {
    const unit = this.scoringPluralLabel.toLowerCase();
    return this.translate.instant('SPORT_UI.AI_TOP_SCORER_PROMPT', { unit });
  }

  get aiSuggestionCompareScoring(): string {
    const unit = this.scoringPluralLabel.toLowerCase();
    return this.translate.instant('SPORT_UI.AI_COMPARE_SCORING_ASSISTS', { unit });
  }

  /* ── Multideporte + filtros ── */

  /** Deportes presentes en los datos del club, con emoji y contador de jugadores. */
  get availableSports(): { sport: string; emoji: string; count: number }[] {
    const map = new Map<string, { emoji: string; count: number }>();
    for (const p of this.players) {
      const s: string = p.sport || 'futbol';
      if (!map.has(s)) {
        map.set(s, { emoji: getSportConfig(s).emoji, count: 0 });
      }
      map.get(s)!.count++;
    }
    return Array.from(map.entries()).map(([sport, v]) => ({ sport, ...v }));
  }

  get uniqueTeams(): string[] {
    const source = this.filterSport
      ? this.players.filter(p => (p.sport || 'futbol') === this.filterSport)
      : this.players;
    const teams = new Set<string>(source.map(p => p.nameTeam).filter(Boolean));
    return Array.from(teams).sort((a, b) => a.localeCompare(b));
  }

  get uniquePositions(): string[] {
    if (this.filterSport) {
      const cfg = getSportConfig(this.filterSport);
      if (cfg?.positions?.length) return cfg.positions;
    } else if (this.sportConfig?.positions?.length) {
      return this.sportConfig.positions;
    }
    const pos = new Set<string>(
      this.players.map(p => p.posicion || p.posicionGlobal).filter(Boolean)
    );
    return Array.from(pos).sort((a, b) => a.localeCompare(b));
  }

  get activeFiltersCount(): number {
    return [this.searchTerm, this.filterTeam, this.filterPosition, this.filterSport].filter(Boolean).length;
  }

  private _applyFilters(): any[] {
    let result = this.players;
    if (this.filterSport) {
      result = result.filter(p => (p.sport || 'futbol') === this.filterSport);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.nombre || '').toLowerCase().includes(term) ||
        (p.apellido || '').toLowerCase().includes(term)
      );
    }
    if (this.filterTeam) {
      result = result.filter(p => p.nameTeam === this.filterTeam);
    }
    if (this.filterPosition) {
      result = result.filter(p => (p.posicion || p.posicionGlobal || '') === this.filterPosition);
    }
    return result;
  }

  onFilterChange(): void {
    this.page = 1;
    this.actualizarPaginacion();
    this.cdr.markForCheck();
  }

  setSportFilter(sport: string): void {
    this.filterSport = sport;
    this.filterTeam = '';
    this.filterPosition = '';
    this.sportConfig = sport ? getSportConfig(sport) : this.sportContextService.getConfig();
    this.onFilterChange();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterTeam = '';
    this.filterPosition = '';
    const firstSport = this.availableSports[0]?.sport ?? '';
    this.filterSport = firstSport;
    this.sportConfig = firstSport ? getSportConfig(firstSport) : this.sportContextService.getConfig();
    this.onFilterChange();
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
    this.cargarTablaJugadores();
    this.initVoiceRecognition();
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    setTimeout(() => this.tutorialService.start('estadisticas-jugadores-club', true), 600);
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

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.clubId, 0]);
  }

  cargarTablaJugadores() {
    this.clubService.getListPlayersOfClubByStadistics(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data.listDto)) {
          let resp = response;
          let list = (resp.data as { listDto: PlayerEstadistica[] }).listDto;
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.players = list;
          this.page = 1;
          // Auto-seleccionar el primer deporte disponible
          const firstSport = this.availableSports[0]?.sport;
          if (firstSport) {
            this.filterSport = firstSport;
            this.sportConfig = getSportConfig(firstSport);
          }
          this.actualizarPaginacion();
          this.datosCargados = true;
          this.publishPageContext();
        } else {
          console.error(
            'La respuesta del servicio no tiene la estructura esperada',
            response
          );
        }
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
        this.loading = false;
        this.datosCargados = true;
      }
    );
  }
  private actualizarPaginacion(): void {
    // Aplicar filtros + ordenamiento antes de paginar
    const sortedPlayers = this.sortPlayers([...this._applyFilters()]);

    this.totalRecords = sortedPlayers.length;

    this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));

    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.playersPaged = sortedPlayers.slice(start, end);
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      // Si es la misma columna, invertir dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Nueva columna, ordenar descendente por defecto (excepto nombre)
      this.sortColumn = column;
      this.sortDirection = column === 'nombre' || column === 'nameTeam' || column === 'posicion' ? 'asc' : 'desc';
    }
    this.page = 1; // Resetear a primera página al ordenar
    this.actualizarPaginacion();
  }

  private sortPlayers(players: any[]): any[] {
    return players.sort((a, b) => {
      let aValue = a[this.sortColumn];
      let bValue = b[this.sortColumn];

      // Manejar valores nulos o undefined
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Convertir a números si es necesario
      const aNum = Number(aValue);
      const bNum = Number(bValue);
      const isNumeric = !isNaN(aNum) && !isNaN(bNum) && typeof aValue !== 'string';

      let comparison = 0;
      
      if (isNumeric) {
        comparison = aNum - bNum;
      } else {
        // Comparación de strings (case insensitive)
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        comparison = aStr.localeCompare(bStr);
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.actualizarPaginacion();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.actualizarPaginacion();
    }
  }
  onPageSizeChange(): void {
    this.pageSize = Number(this.pageSize);
    this.page = 1;
    this.actualizarPaginacion();
  }

  get paginationInfo(): string {
    if (this.totalRecords === 0) return '';

    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.totalRecords);

    return `${this.translate.instant('AI_PANEL.SHOWING')} ${start}–${end} ${this.translate.instant('AI_PANEL.OF')} ${this.totalRecords}`;
  }

  trackByPlayer(index: number, player: any): number {
    return player.playerId;
  }

  // Método para inicializar el DataTable
  inicializarDataTable(): void {
    // Destruir el DataTable si ya existe
    const $dataTable = $('#dataTable');
    if ($dataTable.hasClass('dataTable')) {
      $dataTable.DataTable().destroy();
    }

    this.http.get('assets/dataTable/Spanish.json').subscribe((translation) => {
      $(document).ready(function () {
        $('#dataTable').DataTable({
          paging: true,
          pageLength: 25,
          searching: true,
          ordering: true,
          order: [[0, 'desc']],
          columnDefs: [
            {
              targets: [0],
              visible: false,
            },
          ],
          language: translation,
        });
      });
    });

    this.moverElementosDataTable('dataTable');
  }

  moverElementosDataTable(name: string) {
    // **Move buttons outside the table after initialization**
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElements =
          this.elementRef.nativeElement.querySelectorAll(
            '.dt-layout-row:not(.dt-layout-table)'
          );
        const buttonDatatableElement =
          this.elementRef.nativeElement.querySelector('#button_datatable');

        if (layoutRowElements.length >= 2 && buttonDatatableElement) {
          const layoutRowElement = layoutRowElements[1]; // Obtener el segundo elemento
          $(layoutRowElement).appendTo(buttonDatatableElement);
          observer.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    observer.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
    });

    //esto es para agregar una clase
    const textcenter = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const dataTableElement = document.querySelector('#' + name);

        if (dataTableElement) {
          dataTableElement.classList.add('text-center');
          textcenter.disconnect(); // Detiene la observación después de encontrar el elemento
        }
      });
    });

    textcenter.observe(document.body, { childList: true, subtree: true });

    //esto es para la parte donde pones las filas a ver
    const length = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement =
          this.elementRef.nativeElement.querySelector('.dt-length');
        const buttonDatatableElement =
          this.elementRef.nativeElement.querySelector('#dt-length');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          length.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    length.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
    });

    //esto es para el input del buscador
    const search = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const layoutRowElement =
          this.elementRef.nativeElement.querySelector('.dt-search');
        const buttonDatatableElement =
          this.elementRef.nativeElement.querySelector('#dt-search');

        if (layoutRowElement && buttonDatatableElement) {
          $(layoutRowElement).appendTo(buttonDatatableElement);
          search.disconnect(); // Detiene la observación después de encontrar los elementos
        }
      });
    });

    search.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
    });
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
        content: this.translate.instant('AI_PANEL.WELCOME_PLAYERS')
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

    // Build anonymized stats context from loaded data
    const { contextText, codeToReal } = this.buildAnonymizedStats();

    // Anonymize user message in case they typed a player name
    let anonymizedMessage = userMessage;
    codeToReal.forEach((real, code) => {
      anonymizedMessage = anonymizedMessage.replace(
        new RegExp(real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), code
      );
    });

    const enrichedMessage = anonymizedMessage
      + '\n\n[ESTADÍSTICAS DE JUGADORES - DATOS ANONIMIZADOS]\n' + contextText;

    const history = this.aiMessages.slice(-6).map(m => ({ role: m.role, text: m.content }));

    // Call real AI — clubId=null prevents backend from building conflicting context
    this.aiChatService.sendMessage(
      this.userId, this.clubId, 'estadisticas-jugadores', enrichedMessage, 'users', null, history
    ).subscribe({
      next: (resp) => {
        let response = resp.success
          ? (resp.response || 'Sin respuesta.')
          : (resp.message || this.translate.instant('AI_PANEL.ERROR_MESSAGE'));
        // De-anonymize: longest codes first to avoid partial matches (JUGADOR_STAT_1 inside JUGADOR_STAT_10)
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
    const { contextText, codeToReal } = this.buildAnonymizedStats();
    this.aiPageContext.setContext({ type: 'estadisticas-jugadores', contextText, codeToReal });
  }

  private buildAnonymizedStats(): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines: string[] = [
      'Código | Posición | Partidos | Goles | Asistencias | Min.Totales | T.Amarillas | T.Rojas'
    ];
    this.players.forEach((p, i) => {
      const code = `JUGADOR_STAT_${i + 1}`;
      codeToReal.set(code, p.nombre || `Jugador ${i + 1}`);
      lines.push(
        `${code} | ${p.posicion || '-'} | ${p.partidosJugados || '0'} | `
        + `${p.goles || '0'} | ${p.asistencias || '0'} | ${p.minTotales || '0'} | `
        + `${p.tarAmarilla || '0'} | ${p.tarRojas || '0'}`
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
    const title = '[Estadísticas Jugadores] ' + userMsgs[0].content.substring(0, 40)
      + (userMsgs[0].content.length > 40 ? '...' : '');
    const convId = this.historyConvId || ('conv_estadjug_' + Date.now());
    this.historyConvId = convId;
    const messages = this.aiMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, text: m.content }));
    this.aiChatService.saveHistory(this.userId, convId, title, this.clubId, 'estadisticas-jugadores', messages).subscribe();
  }

}
