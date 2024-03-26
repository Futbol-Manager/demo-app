import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PostPartido } from 'src/app/core/services/models/match.model';
import { PlayerEstadistica } from 'src/app/core/services/player/player.model';
import * as $ from 'jquery';
import 'datatables.net';

@Component({
  selector: 'app-estadisticas-jugadores',
  templateUrl: './estadisticas-jugadores.component.html',
  styleUrls: ['./estadisticas-jugadores.component.scss']
})
export class EstadisticasJugadoresComponent implements OnInit {
  datosCargados: boolean = false;
  teamId!: number;
  players: any[] = []; 

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private playerService: PlayerService) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
    });
    this.cargarTablaJugadores();
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId]);
  }

  cargarTablaJugadores(){
    this.playerService.getListPlayersEstadisticsByTeam(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.players = response.data; //.map((post: PostPartido) => new PostPartido(post));
          // Inicializar el DataTable después de cargar los datos
          this.inicializarDataTable();
          this.datosCargados = true;
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
        pageLength: 25, // Establecer el número de resultados por página
        searching: true,
        ordering: true,
        order: [[1, 'asc']], // Ordenar por la cuarta columna (índice 3) en orden ascendente
        columnDefs: [
          {
            targets: [0], // El índice de la columna que deseas ocultar (en este caso, ID)
            visible: false // Establecer visible como falso oculta la columna
          }
        ]
      });
    });
  }

}
