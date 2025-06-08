import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';

@Component({
  selector: 'app-opcionesjugador',
  templateUrl: './opcionesjugador.component.html',
  styleUrls: ['./opcionesjugador.component.scss']
})
export class OpcionesjugadorComponent implements OnInit {

  teamId = 0;
  playerId = 0;
  userId: any = 0;
  playerIdUserActual: any = 0;
  usuarioActual!: User | null;
  clubId = 0;
  showOpcionesOk = true;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private http: HttpClient,
    private clubService: ClubService,
    private location: Location) { }

  ngOnInit(): void {
    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.playerIdUserActual = user?.playerId;
      // Suscribirse a los cambios en los parámetros de la URL
      this.route.params.subscribe(params => {
        // Obtener el valor de teamId de los parámetros
        this.teamId = +params['teamId'];  // El + convierte el valor a número
        this.playerId = +params['playerId'];  // El + convierte el valor a número
        //console.log('teamId:', this.teamId);
      });

      this.obtenerSuscripcionActual();
    });
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/inicio']);
        break;
      case 2:
        this.router.navigate(['/dashboard/jugadores', this.teamId]);
        break;
      case 3:
        this.router.navigate(['/dashboard/clasificacion-resultados', this.teamId]);
        break;
      case 4:
        this.router.navigate(['/dashboard/calendario', this.teamId, this.playerId]);
        break;
      case 5:
        this.router.navigate(['/dashboard/patrocinadores', 0]);
        break;
      case 6:
        this.router.navigate(['/dashboard/notificaciones', this.clubId]);
        break;
      case 7:
        this.router.navigate(['/dashboard/scouting-player', this.playerId]);
        break;
      case 8:
        this.router.navigate(['/dashboard/partidos-entrevistas', this.teamId, this.playerId]);
        break;
      case 9:
        this.router.navigate(['/dashboard/cuotas', this.teamId, this.playerId]);
        break;
      case 10:
        this.router.navigate(['/dashboard/documentos-jugador', this.teamId, this.playerId]);
        break;
    }
  }

  goBack(): void {
    this.location.back();
  }

  obtenerSuscripcionActual() {
    this.teamService.getSubscriptionByPlayerId(0, this.userId).subscribe(
      (response: Response) => {
        console.log(response.data);
        if (response.data.suscripcionId != 0) {
          console.log(response.data);
          this.showOpcionesOk = true;
        } else {
          //5555
        }
        //si tiene una sus, dejarla seleccionada
        //this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el los datos', error);
      }
    );
  }

}
