import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PostPartido } from 'src/app/core/services/models/match.model';

@Component({
  selector: 'app-estadisticas-jugadores',
  templateUrl: './estadisticas-jugadores.component.html',
  styleUrls: ['./estadisticas-jugadores.component.scss']
})
export class EstadisticasJugadoresComponent implements OnInit {
  teamId!: number;

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
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId]);
  }

}
