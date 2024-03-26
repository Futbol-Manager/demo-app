import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PostPartido } from 'src/app/core/services/models/match.model';
import * as $ from 'jquery';
import 'datatables.net';
import { TrainingService } from 'src/app/core/services/training/training.service';

@Component({
  selector: 'app-estadisticas-equipo',
  templateUrl: './estadisticas-equipo.component.html',
  styleUrls: ['./estadisticas-equipo.component.scss']
})
export class EstadisticasEquipoComponent implements OnInit {
  teamId!: number;
  partidos: any[] = []; 
  showModalPostPartido: boolean = false;
  postPartido: PostPartido = new PostPartido({});

  resumentotales: any = {
    equipo: '',
    partidos: 0,
    victorias: 0,
    empates: 0,
    derrotas: 0,
    gf: 0,
    gc: 0,
    dg: 0,
    puntos: 0,
    ultimos: []
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private trainingService: TrainingService) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
    });
    this.getListaPostpartidos();
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId]);
  }

  getListaPostpartidos() {
    this.playerService.getListPostPartidoByTeam(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.partidos = response.data.map((post: PostPartido) => new PostPartido(post));
          // Inicializar el DataTable después de cargar los datos
          this.inicializarDataTable();
          this.datosResumentTotales(this.partidos);
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Método para inicializar el DataTable
  inicializarDataTable(): void {
    // Destruir el DataTable si ya existe
    const $dataTable = $('#dataTable');
    if ($dataTable.hasClass('dataTable')) {
      $dataTable.DataTable().destroy();
    }

    $(document).ready(() => {
      $('#dataTable').DataTable({
        paging: true,
        pageLength: 10, // Establecer el número de resultados por página
        searching: true,
        ordering: true,
        columnDefs: [
          {
            targets: [0], // El índice de la columna que deseas ocultar (en este caso, ID)
            visible: false // Establecer visible como falso oculta la columna
          }
        ]
      });
    });
  }

  cerrarModalInfoPostPartido(){
    this.showModalPostPartido = false;
  }

  openInfoPostPartido(id: number){
    // Obtener la información del partido por su ID
    this.trainingService.getPostPartidoByPostPartido(id.toString()).subscribe(
      (response) => {
        if (response.data) {
          // Asignar los datos del partido al objeto 'partido'
          this.postPartido = response.data;    
          this.showModalPostPartido = true;
        } 
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  } 

  datosResumentTotales(pastidos: any[]){
    let vic = 0;
    let emp = 0;
    let der = 0;
    let gf = 0;
    let gc = 0;
    let dg = 0;
    let pun = 0;

    for (let partido of this.partidos) {
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
    

    this.resumentotales = {
      equipo: 'Mi Equipo',
      partidos: this.partidos.length,
      victorias: vic,
      empates: emp,
      derrotas: der,
      gf: gf,
      gc: gc,
      dg: dg,
      puntos: pun,
      ultimos: ['Ganado', 'Empatado', 'Perdido', 'Ganado', 'Ganado']
    };

  }

}
