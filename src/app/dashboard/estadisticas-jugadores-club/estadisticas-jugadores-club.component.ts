import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
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
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.pipe().subscribe(user => {
      if (user) this.userId = user.userId;
    });
    this.route.params.subscribe((params) => {
      this.clubId = +params['clubId'];
    });
    this.cargarTablaJugadores();
    this.initVoiceRecognition();
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
    // Aplicar ordenamiento antes de paginar
    const sortedPlayers = this.sortPlayers([...this.players]);
    
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
