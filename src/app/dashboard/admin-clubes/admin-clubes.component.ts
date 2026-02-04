import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { User } from 'src/app/core/models/users/user.model';
import { Response } from 'src/app/core/services/models/response.model';
import { PlayerService } from 'src/app/core/services/player/player.service';

@Component({
  selector: 'app-admin-clubes',
  templateUrl: './admin-clubes.component.html',
  styleUrls: ['./admin-clubes.component.scss']
})
export class AdminClubesComponent implements OnInit {

  usuarioActual!: User;
  userId = 0;
  profileId = 0;
  clubId = 0;

  // Variables de búsqueda y datos
  clubList: any[] = [];
  searchTerm: string = '';
  temporada = '2025';

  constructor(
      private loginService: LoginService,
      private teamService: TeamService,
      private router: Router,
      private route: ActivatedRoute,
      private playerservice: PlayerService
  ) { }

  ngOnInit(): void {
   // this.cargarUsuario();
    this.cargarListadoClubes();
  }

  // Getter para filtrar la lista basándose en el input de búsqueda
  get filteredClubs() {
    return this.clubList.filter(club =>
      club.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  private cargarUsuario(): void {
    this.userId = Number(localStorage.getItem('userId'));
  }

  cargarListadoClubes(): void {
    localStorage.setItem('temporada', this.temporada);

    // Hardcoding de 5 clubes para pruebas según tus columnas
    /*this.clubList = [
      { id: 210, nombre: 'Real Madrid Cantera', equipos: 12, entrenadores: 24, jugadores: 250, padres: 400, clubId: 60 },
      { id: 2, nombre: 'FC Barcelona Academy', equipos: 15, entrenadores: 30, jugadores: 310, padres: 500, clubId: 0 },
      { id: 3, nombre: 'Atlético de Madrid Base', equipos: 10, entrenadores: 18, jugadores: 190, padres: 320, clubId: 0 },
      { id: 4, nombre: 'Sevilla FC Junior', equipos: 8, entrenadores: 14, jugadores: 150, padres: 210, clubId: 0 },
      { id: 5, nombre: 'Valencia CF Mestalla', equipos: 9, entrenadores: 16, jugadores: 175, padres: 280, clubId: 0 },
    ];*/

    // Cuando conectes el servicio, usa esto:
    this.teamService.getClubesAdmin(this.temporada).subscribe(
      (response: Response) => {
        if (response?.data) {
          this.clubList = response.data;
        }
      }
    );
  }

  // Acciones de la tabla
  verDetalleClub(clubId: number) {
    console.log('Navegando al club:', clubId);
    // this.router.navigate(['/admin/club', clubId]);
  }

  goToClub(userId: number, clubId: number): void {
    console.log('Navegando al club ID:', clubId);
    
    localStorage.setItem('userId', userId.toString());
    localStorage.setItem('clubId', clubId.toString());
    // Ejemplo de navegación:
    this.router.navigate(['/dashboard/admin-inicio', clubId, userId]);
  }
}