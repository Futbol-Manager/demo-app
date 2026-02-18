import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-menu-fisio',
  templateUrl: './menu-fisio.component.html',
  styleUrls: ['./menu-fisio.component.scss']
})
export class MenuFisioComponent implements OnInit {

  teamId = 0;
  playerId = 0;
  userId: any = 0;
  usuarioActual!: User | null;
  clubId = 0;
  profileId = 6;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private clubService: ClubService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = user?.userId;
      this.profileId = user?.profileType?.profileId ?? 6;

      this.route.params.subscribe(params => {
        this.teamId = +params['teamId'];
        this.playerId = +params['playerId'];
      });

      if (this.teamId) {
        this.teamService.getTeamById(this.teamId.toString()).subscribe(
          (response: any) => {
            const team = response?.data;
            if (team && team.clubId) {
              this.clubId = team.clubId;
            } else if (this.userId) {
              this.fallbackClubFromEntrenador();
            }
          },
          () => { if (this.userId) this.fallbackClubFromEntrenador(); }
        );
      } else if (this.userId) {
        this.fallbackClubFromEntrenador();
      }
    });
  }

  private fallbackClubFromEntrenador(): void {
    this.clubService.getClubForEntrenador(this.userId).subscribe(
      (response: any) => {
        if (response?.data) {
          this.clubId = response.data;
        }
      }
    );
  }

  get sectionTitle(): string {
    return this.profileId === 7 ? 'Nutricionista' : 'Fisioterapeuta';
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1: this.router.navigate(['/dashboard/lesiones', this.teamId]); break;
      case 2: this.router.navigate(['/dashboard/jugadores', this.teamId]); break;
      case 3: this.router.navigate(['/dashboard/calendario', this.teamId, 0]); break;
      case 4: this.router.navigate(['/dashboard/estadisticas_jugadores', this.teamId]); break;
      case 5: this.router.navigate(['/dashboard/estadisticas_equipo', this.teamId]); break;
      case 6: this.router.navigate(['/dashboard/clasificacion-resultados', this.teamId]); break;
      case 7:
        if (this.clubId) {
          this.router.navigate(['/dashboard/documentos-entrenador', this.clubId]);
        } else {
          alert('No se ha encontrado el club asociado.');
        }
        break;
      case 8: this.router.navigate(['/dashboard/notificaciones', this.clubId]); break;
      case 9: this.router.navigate(['/dashboard/perfil-entrenador', this.teamId, this.playerId]); break;
      case 10: this.router.navigate(['/dashboard/asistente-ia-coach']); break;
      default: this.router.navigate(['/dashboard/inicio']); break;
    }
  }

  goBack(): void {
    this.location.back();
  }
}
