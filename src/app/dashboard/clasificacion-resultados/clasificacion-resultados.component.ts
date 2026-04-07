import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { ActivatedRoute } from '@angular/router';
import { SafeResourceUrl, SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';
import { SportContextService } from 'src/app/core/services/sport/sport-context.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { sportScoringPlural } from 'src/app/core/utils/sport-ui-i18n';
import * as bootstrap from 'bootstrap';

type WizardStep = 'url' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-clasificacion-resultados',
  templateUrl: './clasificacion-resultados.component.html',
  styleUrls: ['./clasificacion-resultados.component.scss']
})
export class ClasificacionResultadosComponent implements OnInit, OnDestroy {

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
  /** Cabeceras de columnas en el orden de la fuente original. */
  headers: string[] = [];
  /** Fecha/hora de la última actualización formateada. */
  lastUpdated: string | null = null;
  /** HTML bruto de la tabla (si el backend lo devuelve). */
  rawHtml: SafeHtml | null = null;

  sportConfig: SportConfig = getSportConfig('futbol');
  currentSport = 'futbol';

  /** Cabecera tipo GF—GC / PF—PC según deporte (tabla de clasificación). */
  get scoringForAgainstHeader(): string {
    const k = `SPORT_UI.TABLE_SCORING_FC.${this.currentSport}`;
    const v = this.translate.instant(k);
    if (v !== k) return v;
    const unit = sportScoringPlural(this.translate, this.currentSport, this.sportConfig.scoringUnitPlural);
    return this.translate.instant('SPORT_UI.TABLE_SCORING_FC_FALLBACK', { unit });
  }

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

  private tutorialSub?: Subscription;
  private langSub?: Subscription;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private sanitizer: DomSanitizer,
    private tutorialService: TutorialService,
    private sportContextService: SportContextService,
    private teamService: TeamService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
      if (this.teamId) {
        this.teamService.getTeamById(String(this.teamId)).subscribe((res: Response) => {
          const team = res?.data as { sport?: string } | undefined;
          if (team?.sport) {
            this.sportContextService.setSport(team.sport);
            this.currentSport = team.sport;
            this.sportConfig = getSportConfig(this.currentSport);
          }
        });
      }
    });
    this.currentSport = this.sportContextService.getSport();
    this.sportConfig = getSportConfig(this.currentSport);
    this.jornadaSeleccionada = 1;
    this.loadTableTodo(1);
    setTimeout(() => this.tutorialService.start('clasificacion-resultados', true), 600);

    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());

    this.tutorialSub = this.tutorialService.getState$().subscribe(state => {
      if (state?.screenId !== 'clasificacion-resultados') return;
      const i = state.currentIndex;
      // Paso 5 (índice 4): activar pestaña Resultados.
      this.contenidoActivo = i === 4;
    });
  }

  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
    this.langSub?.unsubscribe();
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
    this.jornadaNavegable = data.jornadaNavegable !== false;
    // HTML bruto de la tabla (preferente sobre el parseo por esquema)
    this.rawHtml = data.rawHtml
      ? this.sanitizer.bypassSecurityTrustHtml(data.rawHtml)
      : null;
    // Cabeceras dinámicas de la fuente
    this.headers = data.headers && data.headers.length > 0
      ? data.headers
      : this.buildFallbackHeaders(data.columnas || []);
    const columnas: string[] = data.columnas || [];
    this.tieneGoles = columnas.length === 0 || columnas.includes('goles');
    this.tieneForma = columnas.includes('forma');
    this.temporadaSinIniciar = this.equipos.length > 0
      && this.equipos.every((e: any) => !e.puntos || e.puntos === '0' || e.puntos === '');
    this.lastUpdated = data.lastUpdated ? this.formatLastUpdated(data.lastUpdated) : null;
  }

  private tsLocale(): string {
    const c = (this.translate.currentLang || 'es').split('-')[0];
    const map: Record<string, string> = {
      es: 'es-ES', en: 'en-GB', fr: 'fr-FR', pt: 'pt-PT', de: 'de-DE', it: 'it-IT',
    };
    return map[c] || 'es-ES';
  }

  private formatLastUpdated(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString(this.tsLocale(), {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  private buildFallbackHeaders(columnas: string[]): string[] {
    const hs = ['Pts'];
    if (columnas.length === 0 || columnas.includes('pj')) hs.push('J');
    if (columnas.length === 0 || columnas.includes('pg')) hs.push('G');
    if (columnas.length === 0 || columnas.includes('pe')) hs.push('E');
    if (columnas.length === 0 || columnas.includes('pp')) hs.push('P');
    if (columnas.length === 0 || columnas.includes('goles')) { hs.push('GF'); hs.push('GC'); }
    if (columnas.includes('forma')) hs.push('Forma');
    return hs;
  }

  getCellValue(equipo: any, header: string): string {
    if (equipo.datos && equipo.datos[header] != null) return equipo.datos[header];
    const map: Record<string, string> = {
      'Pts': equipo.puntos,  'J': equipo.jugados,
      'G':   equipo.ganados, 'E': equipo.empatados,
      'P':   equipo.perdidos,'GF': equipo.golesAFavor,
      'GC':  equipo.golesEnContra, 'Forma': equipo.forma,
    };
    return map[header] ?? '';
  }

  isFormaHeader(header: string): boolean {
    return header.toLowerCase() === 'forma' || header.toLowerCase() === 'form';
  }

  getHeaderLabel(h: string): string {
    const sup = sportScoringPlural(this.translate, this.currentSport, this.sportConfig.scoringUnitPlural);
    if (h === 'GF') return sup || h;
    if (h === 'GC') return this.translate.instant('SPORT_UI.HEADER_VS_SCORING', { unit: sup || h });
    return h;
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
    this.wizardMessage = this.translate.instant('CLASIFICACION_PAGE.MSG_SAVE_CONFIG');

    const jornadaInicial = this.jornadaDeUrl(url);

    this.clubService.saveTeamUrl(this.teamId, url).subscribe(
      (saveResp: Response) => {
        if (saveResp && saveResp.status === 200) {
          this.wizardMessage = this.translate.instant('CLASIFICACION_PAGE.MSG_ANALYZING_PAGE');
          this.clubService.refreshClasificacion(this.teamId, jornadaInicial).subscribe(
            (dataResp: Response) => {
              if (dataResp && dataResp.data != null) {
                this.applyData(dataResp.data);
                this.wizardStep = 'success';
              } else {
                this.wizardStep = 'error';
                this.wizardMessage = this.translate.instant('CLASIFICACION_PAGE.MSG_NO_DATA_URL');
              }
            },
            () => {
              this.wizardStep = 'error';
              this.wizardMessage = this.translate.instant('CLASIFICACION_PAGE.MSG_LOAD_URL_ERROR');
            }
          );
        } else {
          this.wizardStep = 'error';
          this.wizardMessage = this.translate.instant('CLASIFICACION_PAGE.MSG_SAVE_FAIL');
        }
      },
      () => {
        this.wizardStep = 'error';
        this.wizardMessage = this.translate.instant('CLASIFICACION_PAGE.MSG_SERVER_ERROR');
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
          this.reconfigFeedback = this.translate.instant('CLASIFICACION_PAGE.MSG_RECONFIG_SAVED');
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
                this.reconfigFeedback = this.translate.instant('CLASIFICACION_PAGE.MSG_RECONFIG_NO_DATA');
                this.reconfigFeedbackError = true;
              }
            },
            () => {
              this.savingReconfig = false;
              this.reconfigFeedback = this.translate.instant('CLASIFICACION_PAGE.MSG_RECONFIG_ERROR');
              this.reconfigFeedbackError = true;
            }
          );
        } else {
          this.savingReconfig = false;
          this.reconfigFeedback = this.translate.instant('CLASIFICACION_PAGE.MSG_RECONFIG_SAVE_FAIL');
          this.reconfigFeedbackError = true;
        }
      },
      () => {
        this.savingReconfig = false;
        this.reconfigFeedback = this.translate.instant('CLASIFICACION_PAGE.MSG_SERVER_ERROR');
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
