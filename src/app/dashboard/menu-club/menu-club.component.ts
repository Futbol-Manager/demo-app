import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Location } from '@angular/common';
import {
  AsistenciaTraining,
  Task,
  Training,
} from 'src/app/core/services/models/training.models';
import { Response } from 'src/app/core/services/models/response.model';
import { MatchPreparation } from 'src/app/core/services/models/match.model';

@Component({
  selector: 'app-menu-club',
  templateUrl: './menu-club.component.html',
  styleUrls: ['./menu-club.component.scss'],
})
export class MenuClubComponent implements OnInit {
  teamId = 0;
  playerId = 0;
  userId: any = 0;
  playerIdUserActual: any = 0;
  usuarioActual!: User | null;
  clubId = 0;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.playerIdUserActual = user?.playerId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe((params) => {
        // Obtener el valor de teamId de los parámetros
        this.teamId = +params['teamId']; // El + convierte el valor a número
      });
    });
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    if (id === 1) {
      this.router.navigate(['/dashboard/inicio']);
    } else if (id === 2) {
      this.router.navigate(['/dashboard/calendario', this.teamId, 0]);
    } else if (id === 3) {
      this.router.navigate(['/dashboard/estadisticas_equipo', this.teamId]);
    } else if (id === 5) {
      this.router.navigate(['/dashboard/jugadores', this.teamId]);
    } else if (id === 6) {
      this.router.navigate(['/dashboard/informacion_equipo', this.teamId]);
    } else if (id === 7) {
      this.router.navigate(['/dashboard/partidos-entrevistas', this.teamId, 0]);
    } else if (id === 4) {
      this.router.navigate(['/dashboard/estadisticas_jugadores', this.teamId]);
    } else if (id === 8) {
      this.router.navigate([
        '/dashboard/clasificacion-resultados',
        this.teamId,
      ]);
    } else if (id === 9) {
      this.router.navigate(['/dashboard/video-analysis']);
    } else if (id === 10) {
      this.router.navigate(['/dashboard/erp']);
    }
  }
  goBack(): void {
    this.location.back();
  }
}
