import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { ActivatedRoute } from '@angular/router';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import * as bootstrap from 'bootstrap';

type WizardStep = 'url' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-clasificacion-resultados',
  templateUrl: './clasificacion-resultados.component.html',
  styleUrls: ['./clasificacion-resultados.component.scss']
})
export class ClasificacionResultadosComponent implements OnInit {

  equipos: any[] = [];
  contenidoActivo = false;
  jornadas: number[] = [];
  jornadaSeleccionada: number = 1;
  resultados: any[] = [];
  datosCargados = false;
  temporadaSinIniciar = false;
  jornadaNavegable = true;
  teamId = 0;

  // Columnas disponibles según los datos de la federación
  tieneGoles = true;
  tieneForma = false;

  showModalActa = false;
  showModalActa2 = false;
  actaSeleccionada: any = null;
  codGrupo = '';
  codCompeticion = '';
  loading = true;
  refreshing = false;
  datosNulos = false;

  // --- Wizard de configuración ---
  wizardStep: WizardStep = 'url';
  wizardMessage = '';
  urlInput = '';

  // --- Reconfigurar URL cuando ya hay datos ---
  urlReconfigInput = '';
  savingReconfig = false;
  reconfigFeedback = '';
  reconfigFeedbackError = false;

  urlActa: SafeResourceUrl = '';
  cachedActaUrl: SafeResourceUrl = '';

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private sanitizer: DomSanitizer,
    private tutorialService: TutorialService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
    });
    this.jornadaSeleccionada = 1;
    this.loadTableTodo(1);
    setTimeout(() => this.tutorialService.start('clasificacion-resultados', true), 600);
  }

  loadTableTodo(jornada: number) {
    this.loading = true;
    this.datosNulos = false;
    this.datosCargados = false;
    this.clubService.getTodo(this.teamId, jornada.toString()).subscribe(
      (response: Response) => {
        if (response != null && response.data != null) {
          this.applyData(response.data);
          this.datosCargados = true;
          this.loading = false;
        } else {
          this.datosNulos = true;
          this.wizardStep = 'url';
          this.loading = false;
        }
      },
      (error) => {
        console.error('Error al cargar clasificación', error);
        this.datosNulos = true;
        this.wizardStep = 'url';
        this.loading = false;
      }
    );
  }

  private applyData(data: any): void {
    this.equipos = data.clasificacion || [];
    this.resultados = data.partidos || [];
    let numJ = data.totalJornadas;
    if (!numJ) numJ = 35;
    this.jornadas = Array.from({ length: parseInt(numJ, 10) }, (_, i) => i + 1);
    // Si el backend indica que la jornada no es navegable, se muestra aviso
    this.jornadaNavegable = data.jornadaNavegable !== false;
    // Detectar columnas disponibles
    const columnas: string[] = data.columnas || [];
    this.tieneGoles = columnas.length === 0 || columnas.includes('goles');
    this.tieneForma = columnas.includes('forma');
    // Detectar si todos los puntos son 0 (temporada no iniciada o datos vacíos)
    this.temporadaSinIniciar = this.equipos.length > 0
      && this.equipos.every((e: any) => !e.puntos || e.puntos === '0' || e.puntos === '');
  }

  /** Extrae el número de jornada de una URL si está presente */
  private jornadaDeUrl(url: string): string {
    const m = url.match(/[?&](?:codjornada|round|jornada|codround|journee|matchday)=(\d+)/i);
    return m ? m[1] : '1';
  }

  /** Wizard: paso 1 → 2 → 3 */
  startWizard(): void {
    const url = this.urlInput.trim();
    if (!url) return;

    this.wizardStep = 'loading';
    this.wizardMessage = 'Guardando configuración...';

    const jornadaInicial = this.jornadaDeUrl(url);

    this.clubService.saveTeamUrl(this.teamId, url).subscribe(
      (saveResp: Response) => {
        if (saveResp && saveResp.status === 200) {
          this.wizardMessage = 'Analizando la página de clasificación...';
          this.clubService.refreshClasificacion(this.teamId, jornadaInicial).subscribe(
            (dataResp: Response) => {
              if (dataResp && dataResp.data != null) {
                this.applyData(dataResp.data);
                this.wizardStep = 'success';
              } else {
                this.wizardStep = 'error';
                this.wizardMessage = 'No se encontraron datos de clasificación en esa URL. Prueba con otra URL o comprueba que la página tenga una tabla de clasificación visible.';
              }
            },
            () => {
              this.wizardStep = 'error';
              this.wizardMessage = 'Error al cargar los datos desde la URL. Asegúrate de que la URL sea accesible y tenga una tabla de clasificación.';
            }
          );
        } else {
          this.wizardStep = 'error';
          this.wizardMessage = 'No se pudo guardar la configuración. Inténtalo de nuevo.';
        }
      },
      () => {
        this.wizardStep = 'error';
        this.wizardMessage = 'Error al conectar con el servidor. Comprueba tu conexión.';
      }
    );
  }

  /** Wizard: paso 3 → mostrar datos */
  finishWizard(): void {
    this.datosNulos = false;
    this.datosCargados = true;
    if (!this.jornadas.length) {
      this.jornadas = Array.from({ length: 35 }, (_, i) => i + 1);
    }
  }

  /** Wizard: volver a intentar con otra URL */
  retryWizard(): void {
    this.wizardStep = 'url';
    this.wizardMessage = '';
    this.urlInput = '';
  }

  refresh(): void {
    const jornada = this.jornadaSeleccionada || 1;
    this.refreshing = true;
    this.clubService.refreshClasificacion(this.teamId, jornada.toString()).subscribe(
      (resp: Response) => {
        this.refreshing = false;
        if (resp && resp.status === 200 && resp.data) {
          this.applyData(resp.data);
          this.datosCargados = true;
          this.datosNulos = false;
        } else {
          this.loadTableTodo(jornada);
        }
      },
      () => {
        this.refreshing = false;
        this.loadTableTodo(jornada);
      }
    );
  }

  /** Reconfigurar URL desde pantalla de datos */
  saveReconfigUrl(): void {
    const url = this.urlReconfigInput.trim();
    if (!url) return;
    this.savingReconfig = true;
    this.reconfigFeedback = '';
    this.reconfigFeedbackError = false;

    this.clubService.saveTeamUrl(this.teamId, url).subscribe(
      (resp: Response) => {
        if (resp && resp.status === 200) {
          this.reconfigFeedback = 'URL guardada. Analizando nueva fuente...';
          const jornadaReconfig = this.jornadaDeUrl(url);
          this.urlReconfigInput = '';
          this.clubService.refreshClasificacion(this.teamId, jornadaReconfig).subscribe(
            (dataResp: Response) => {
              this.savingReconfig = false;
              this.reconfigFeedback = '';
              if (dataResp && dataResp.data != null) {
                this.applyData(dataResp.data);
                this.datosCargados = true;
                this.datosNulos = false;
              } else {
                this.reconfigFeedback = 'No se encontraron datos en la nueva URL.';
                this.reconfigFeedbackError = true;
              }
            },
            () => {
              this.savingReconfig = false;
              this.reconfigFeedback = 'Error al cargar datos de la nueva URL.';
              this.reconfigFeedbackError = true;
            }
          );
        } else {
          this.savingReconfig = false;
          this.reconfigFeedback = 'No se pudo guardar la URL.';
          this.reconfigFeedbackError = true;
        }
      },
      () => {
        this.savingReconfig = false;
        this.reconfigFeedback = 'Error al conectar con el servidor.';
        this.reconfigFeedbackError = true;
      }
    );
  }

  loadTable(jornada: number) {
    this.clubService.getStandings(this.teamId, jornada).subscribe(
      (response: Response) => {
        if (response != null) {
          const list: any = response;
          this.equipos = list.clasificacion;
          this.loadResults(jornada);
        } else {
          this.loading = false;
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  loadResults(jornada: number) {
    this.clubService.getResults(this.teamId, jornada).subscribe(
      (response: Response) => {
        const list: any = response;
        this.codCompeticion = list.codigo_competicion;
        this.codGrupo = list.codigo_grupo;
        const numJ = list.listado_jornadas[0].jornadas.length;
        this.jornadas = Array.from({ length: numJ }, (_, i) => i + 1);
        this.resultados = list.partidos.map((p: any) => ({
          nombreLocal: p.Nombre_equipo_local,
          nombreVisitante: p.Nombre_equipo_visitante,
          golesLocal: p.Goles_casa,
          golesVisitante: p.Goles_visitante,
          fecha: p.fecha,
          estadio: p.campojuego,
          codActa: p.codacta,
          hora: p.hora != '' ? p.hora + 'h' : 'Sin hora establecida',
        }));
        this.datosCargados = true;
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  goBack(): void {
    this.location.back();
  }

  mostrarContenido(value: boolean) {
    this.contenidoActivo = value;
  }

  cambiarJornada(): void {
    this.obtenerDatosJornada(this.jornadaSeleccionada);
  }

  obtenerDatosJornada(jornada: number): void {
    this.loadTableTodo(jornada);
  }

  abrirModalActa(codActa: any): void {
    this.clubService.getActa(this.codCompeticion, this.codGrupo, codActa).subscribe(
      (response: Response) => {
        const list: any = response;
        this.actaSeleccionada = list.pageProps.game;
        this.abrirActaEnNuevaPestana('541628');
      },
      (error) => {
        console.error('Error al cargar el acta', error);
      }
    );
  }

  cerrarModalActa(): void {
    this.showModalActa = false;
    this.actaSeleccionada = null;
  }

  cerrarModalActa2() {
    this.showModalActa2 = false;
  }

  esTitular(jugador: any): boolean {
    return jugador.titular === '1';
  }

  abrirModalActa2(codActa: string) {
    const rawUrl = `https://www.ffcm.es/pnfg/NFG_CmpPartido?cod_primaria=1000120&CodActa=${codActa}`;
    this.urlActa = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    const modal = new bootstrap.Modal(document.getElementById('modalVerActa')!);
    modal.show();
  }

  abrirActaEnNuevaPestana(codActa: string): void {
    const url = `https://www.ffcm.es/pnfg/NFG_CmpPartido?cod_primaria=1000120&CodActa=${codActa}`;
    window.open(url, '_blank');
  }

  sanitizarUrl(): SafeResourceUrl {
    if (!this.cachedActaUrl) {
      this.cachedActaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.urlActa as string || '');
    }
    return this.cachedActaUrl;
  }

  abrirActaEnPestanaNueva(url: string): void {
    window.open(url, '_blank');
  }
}
