import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ScoutingPlayer } from 'src/app/core/services/player/player.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';

@Component({
  selector: 'app-scouting-player',
  templateUrl: './scouting-player.component.html',
  styleUrls: ['./scouting-player.component.scss']
})
export class ScoutingPlayerComponent implements OnInit {

  playerId = 0;
  datosCargados = false;

  scoutingPlayer: ScoutingPlayer = new ScoutingPlayer({});

  numeros: number[] = Array.from({ length: 50 }, (_, i) => i + 1);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.playerId = +params['playerId'];  // El + convierte el valor a número
    });

    this.cargarForm();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/scouting-player/inicio']);
        break;
    }
  }

  cargarForm(){
    this.datosCargados = true;
  }

}
