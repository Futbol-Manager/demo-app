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

    // Obtener los primeros 5 resultados que realmente son los ultimos
    this.partidos = team.partidos;
    const ultimosResultados = this.partidos
      .slice(0, 5)
      .map((partido) => partido.resultado)
      .filter((r) => r === 'V' || r === 'E' || r === 'D')
      .reverse();

    for (let partido of team.partidos) {
      // Aquí dentro del bucle, puedes acceder a cada elemento de la lista como "partido"
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
      partidos: team.partidos.length,
      victorias: vic,
      empates: emp,
      derrotas: der,
      gf: gf,
      gc: gc,
      dg: dg,
      puntos: pun,
      ultimos: ultimosResultados,
    };

    this.resumentotales.push(resumen);
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

  exportTableToExcel() {}

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
