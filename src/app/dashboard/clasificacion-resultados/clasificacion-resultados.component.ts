import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-clasificacion-resultados',
  templateUrl: './clasificacion-resultados.component.html',
  styleUrls: ['./clasificacion-resultados.component.scss']
})
export class ClasificacionResultadosComponent implements OnInit {

  equipos: any[] = [];/*[
    { nombre: 'Real Madrid', puntos: 50, jugados: 20, ganados: 15, empatados: 5, perdidos: 0, ultimosPartidos: ['G', 'G', 'E', 'P', 'G'] },
    { nombre: 'FC Barcelona', puntos: 47, jugados: 20, ganados: 14, empatados: 5, perdidos: 1, ultimosPartidos: ['E', 'G', 'G', 'E', 'P'] },
    { nombre: 'Atlético Madrid', puntos: 42, jugados: 20, ganados: 13, empatados: 3, perdidos: 4, ultimosPartidos: ['P', 'G', 'P', 'G', 'E'] },
    { nombre: 'Real Sociedad', puntos: 38, jugados: 20, ganados: 11, empatados: 5, perdidos: 4, ultimosPartidos: ['G', 'E', 'G', 'P', 'G'] },
    { nombre: 'Athletic Club', puntos: 36, jugados: 20, ganados: 10, empatados: 6, perdidos: 4, ultimosPartidos: ['G', 'P', 'E', 'G', 'P'] },
    { nombre: 'Villarreal', puntos: 34, jugados: 20, ganados: 9, empatados: 7, perdidos: 4, ultimosPartidos: ['P', 'G', 'E', 'G', 'P'] },
    { nombre: 'Real Betis', puntos: 33, jugados: 20, ganados: 9, empatados: 6, perdidos: 5, ultimosPartidos: ['E', 'P', 'G', 'G', 'E'] },
    { nombre: 'Valencia', puntos: 30, jugados: 20, ganados: 8, empatados: 6, perdidos: 6, ultimosPartidos: ['G', 'P', 'E', 'E', 'G'] },
    { nombre: 'Sevilla', puntos: 28, jugados: 20, ganados: 7, empatados: 7, perdidos: 6, ultimosPartidos: ['P', 'G', 'G', 'P', 'E'] },
    { nombre: 'Celta de Vigo', puntos: 27, jugados: 20, ganados: 7, empatados: 6, perdidos: 7, ultimosPartidos: ['E', 'G', 'P', 'P', 'G'] },
    { nombre: 'Osasuna', puntos: 26, jugados: 20, ganados: 7, empatados: 5, perdidos: 8, ultimosPartidos: ['P', 'E', 'G', 'G', 'P'] },
    { nombre: 'Rayo Vallecano', puntos: 25, jugados: 20, ganados: 6, empatados: 7, perdidos: 7, ultimosPartidos: ['E', 'P', 'G', 'P', 'G'] },
    { nombre: 'Getafe', puntos: 24, jugados: 20, ganados: 6, empatados: 6, perdidos: 8, ultimosPartidos: ['G', 'P', 'E', 'E', 'P'] },
    { nombre: 'Mallorca', puntos: 22, jugados: 20, ganados: 5, empatados: 7, perdidos: 8, ultimosPartidos: ['G', 'E', 'P', 'G', 'P'] },
    { nombre: 'Granada', puntos: 20, jugados: 20, ganados: 5, empatados: 5, perdidos: 10, ultimosPartidos: ['P', 'P', 'G', 'E', 'P'] },
    { nombre: 'Almería', puntos: 18, jugados: 20, ganados: 4, empatados: 6, perdidos: 10, ultimosPartidos: ['E', 'P', 'G', 'P', 'G'] },
    { nombre: 'Cádiz', puntos: 16, jugados: 20, ganados: 4, empatados: 4, perdidos: 12, ultimosPartidos: ['P', 'G', 'P', 'E', 'P'] },
    { nombre: 'Las Palmas', puntos: 15, jugados: 20, ganados: 3, empatados: 6, perdidos: 11, ultimosPartidos: ['G', 'P', 'P', 'E', 'P'] },
    { nombre: 'Espanyol', puntos: 12, jugados: 20, ganados: 3, empatados: 3, perdidos: 14, ultimosPartidos: ['E', 'P', 'G', 'P', 'E'] },
    { nombre: 'Elche', puntos: 10, jugados: 20, ganados: 2, empatados: 4, perdidos: 14, ultimosPartidos: ['P', 'P', 'E', 'P', 'G'] }
  ];*/


  /*resultados = [
    { local: 'Real Madrid', golesLocal: 3, golesVisitante: 1, visitante: 'FC Barcelona', fecha: '20-02-2025', estadio: 'Santiago Bernabéu' },
    { local: 'Atlético Madrid', golesLocal: 2, golesVisitante: 2, visitante: 'Real Sociedad', fecha: '20-02-2025', estadio: 'Wanda Metropolitano' },
    { local: 'Villarreal', golesLocal: 1, golesVisitante: 0, visitante: 'Real Betis', fecha: '20-02-2025', estadio: 'Estadio de la Cerámica' },
    { local: 'Sevilla', golesLocal: 0, golesVisitante: 1, visitante: 'Valencia', fecha: '20-02-2025', estadio: 'Ramón Sánchez-Pizjuán' },
    { local: 'Osasuna', golesLocal: 2, golesVisitante: 3, visitante: 'Celta de Vigo', fecha: '20-02-2025', estadio: 'El Sadar' }
  ];*/

  contenidoActivo = false;  // Por defecto muestra la clasificación
  jornadas: number[] = [];
  jornadaSeleccionada: number = 1;
  resultados: any[] = [];
  datosCargados = false;
  teamId = 0;

  showModalActa = false;
  actaSeleccionada: any = null;
  codGrupo = '';
  codCompeticion = '';
  loading = true;

  constructor(
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      //console.log('teamId:', this.teamId);
    });
    // Generar array de jornadas de 1 a 30
    //this.jornadas = Array.from({ length: 30 }, (_, i) => i + 1);
    this.jornadaSeleccionada = 1; // valor por defecto
    this.loadTable(1);
  }

  loadTable(jornada: number) {
    this.clubService.getStandings(this.teamId, jornada).subscribe(
      (response: Response) => {
        if (response != null) {
          const list: any = response;
          this.equipos = list.clasificacion;
          this.loadResults(jornada);
          console.log(response);
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
          urlImgLocal: `https://www.rffm.es${p.url_img_local}`,
          urlImgVisitante: `https://www.rffm.es${p.url_img_visitante}`
        }));
        console.log(response);
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
    // Aquí puedes hacer una llamada a la API o actualizar los datos
    console.log('Jornada seleccionada:', this.jornadaSeleccionada);
    this.obtenerDatosJornada(this.jornadaSeleccionada);
  }

  obtenerDatosJornada(jornada: number): void {
    this.loadTable(jornada);
  }

  abrirModalActa(codActa: any): void {
    this.clubService.getActa(this.codCompeticion, this.codGrupo, codActa).subscribe(
      (response: Response) => {
        const list: any = response;
        this.actaSeleccionada = list.pageProps.game;
        this.showModalActa = true;
        console.log(this.actaSeleccionada);
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalActa(): void {
    this.showModalActa = false;
    this.actaSeleccionada = null;
  }

  esTitular(jugador: any): boolean {
    return jugador.titular === '1';
  }

}
