import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';
import { ClubService } from 'src/app/core/services/club/club.service';

@Component({
  selector: 'app-cuadro',
  templateUrl: './cuadro.component.html',
  styleUrls: ['./cuadro.component.scss']
})
export class CuadroComponent implements OnInit {

  clubId = 0;
  diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
  horario: { hora: string, dias: any[], isCurrentHour: boolean }[] = [];
  horarios: any[] = [/* tu listado de horarios JSON aquí */];
  coloresEquipos: { [teamId: number]: string } = {};
  datosCargados = false;
  listTeams: any = [];
  listProximos: any = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private clubService: ClubService,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService,) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });

    this.clubService.getEntrenandoAhora(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listTeams = response.data.teams;
          this.listProximos = response.data.proximos;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );

  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/inicio']);
        break;
      case 1:
        this.router.navigate(['/dashboard/cuadro-de-mandos/cuotas', this.clubId]);
        break;
      case 2:
        this.router.navigate(['/dashboard/cuadro-de-mandos/puntuaciones', this.clubId]);
        break;
      case 3:
        this.router.navigate(['/dashboard/cuadro-de-mandos/entrenamientos', this.clubId]);
        break;
      case 4:
        this.router.navigate(['/dashboard/cuadro-de-mandos/estadisticas-jugadores-club', this.clubId]);
        break;
      case 5:
        this.router.navigate(['/dashboard/cuadro-de-mandos/estadisticas-equipos-club', this.clubId]);
        break;
      case 6:
        this.router.navigate(['/dashboard/cuadro-de-mandos/goleadores', this.clubId]);
        break;
    }
  }

}
