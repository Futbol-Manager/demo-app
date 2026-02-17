import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';

@Component({
  selector: 'app-estadisticas-equipos-club',
  templateUrl: './estadisticas-equipos-club.component.html',
  styleUrls: ['./estadisticas-equipos-club.component.scss'],
})
export class EstadisticasEquiposClubComponent implements OnInit {
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private http: HttpClient,
    private elementRef: ElementRef,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe((params) => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId']; // El + convierte el valor a número
    });
    this.getListaPostpartidos();
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
      partidos: team.partidos.length,
      victorias: vic,
      empates: emp,
      derrotas: der,
      gf: gf,
      gc: gc,
      dg: dg,
      puntos: pun,
      ultimos: ultimosResultados, //['Ganado', 'Empatado', 'Perdido', 'Ganado', 'Ganado']
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
    if (event.key === 'Enter' && event.ctrlKey) {
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
        content: '¡Hola! 👋 Soy tu asistente de análisis de estadísticas. Puedo ayudarte a visualizar y analizar los datos de tus equipos. ¿En qué te puedo ayudar?'
      });
    }
  }

  useSuggestion(suggestion: string): void {
    this.aiPrompt = suggestion;
    this.sendAiMessage();
  }

  async sendAiMessage(): Promise<void> {
    if (!this.aiPrompt.trim() || this.aiLoading) return;

    const userMessage = this.aiPrompt.trim();
    this.aiMessages.push({
      role: 'user',
      content: userMessage
    });

    this.aiPrompt = '';
    this.aiLoading = true;

    // Scroll to bottom
    setTimeout(() => this.scrollAiToBottom(), 100);

    try {
      // Aquí se integrará con el servicio real de IA
      // Por ahora, una respuesta simulada
      await this.simulateAiResponse(userMessage);
    } catch (error) {
      this.aiMessages.push({
        role: 'assistant',
        content: '❌ Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo.'
      });
    } finally {
      this.aiLoading = false;
      setTimeout(() => this.scrollAiToBottom(), 100);
    }
  }

  private async simulateAiResponse(userMessage: string): Promise<void> {
    // Simulación temporal hasta integrar el servicio real
    await new Promise(resolve => setTimeout(resolve, 1500));

    let response = '';
    
    if (userMessage.toLowerCase().includes('victoria') || userMessage.toLowerCase().includes('mejor')) {
      const topTeam = this.resumentotales.reduce((max, t) => t.victorias > max.victorias ? t : max, this.resumentotales[0]);
      response = `🏆 **Mejor Equipo por Victorias**<br><br>El equipo con más victorias es <strong>${topTeam?.equipo}</strong> con <strong>${topTeam?.victorias} victorias</strong> de ${topTeam?.partidos} partidos jugados (${((topTeam?.victorias / topTeam?.partidos) * 100).toFixed(1)}% efectividad).`;
    } else if (userMessage.toLowerCase().includes('punto') || userMessage.toLowerCase().includes('puntos')) {
      const topPoints = this.resumentotales.reduce((max, t) => t.puntos > max.puntos ? t : max, this.resumentotales[0]);
      response = `📊 **Líder en Puntos**<br><br>El equipo con más puntos es <strong>${topPoints?.equipo}</strong> con <strong>${topPoints?.puntos} puntos</strong>.`;
    } else if (userMessage.toLowerCase().includes('goles')) {
      const topScorer = this.resumentotales.reduce((max, t) => t.gf > max.gf ? t : max, this.resumentotales[0]);
      response = `⚽ **Equipo Más Goleador**<br><br>El equipo con más goles a favor es <strong>${topScorer?.equipo}</strong> con <strong>${topScorer?.gf} goles</strong> (promedio de ${(topScorer?.gf / topScorer?.partidos).toFixed(1)} goles por partido).`;
    } else if (userMessage.toLowerCase().includes('racha')) {
      response = `🎯 **Análisis de Rachas**<br><br>Estoy analizando las últimas 5 rachas de resultados de cada equipo. Esta información te ayuda a ver la tendencia actual. Las rachas se muestran en la tabla principal con las últimas 5 resultados.`;
    } else if (userMessage.toLowerCase().includes('gráfica') || userMessage.toLowerCase().includes('grafica')) {
      response = `📊 **Generación de Gráficas**<br><br>¡Excelente idea! Puedo generar gráficas de:<br>• Puntos por equipo<br>• Victorias/Empates/Derrotas<br>• Goles a favor vs en contra<br>• Diferencia de goles<br>• Comparativas de rendimiento<br><br>Próximamente podrás ver estas gráficas directamente aquí.`;
    } else {
      response = `Entiendo tu consulta sobre "${userMessage}". Actualmente puedo ayudarte con:<br><br>
        🏆 Análisis de victorias y rendimiento<br>
        📊 Estadísticas de puntos<br>
        ⚽ Información sobre goles<br>
        📈 Comparativas entre equipos<br><br>
        ¿Qué te gustaría saber específicamente?`;
    }

    this.aiMessages.push({
      role: 'assistant',
      content: response
    });
  }

  private scrollAiToBottom(): void {
    if (this.aiMessagesContainer) {
      const element = this.aiMessagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

}
