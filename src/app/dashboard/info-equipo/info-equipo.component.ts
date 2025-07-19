import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { HorarioTeam, TeamNew } from 'src/app/core/services/team/team.model';
import { TeamService } from 'src/app/core/services/team/team.service';

@Component({
  selector: 'app-info-equipo',
  templateUrl: './info-equipo.component.html',
  styleUrls: ['./info-equipo.component.scss']
})
export class InfoEquipoComponent implements OnInit {

  teamId!: number;
  team: TeamNew = new TeamNew();
  clubList: any[] = [];
  teamInfo: TeamNew = new TeamNew();
  showModalHorario = false;

  dias = [
    { label: 'Lunes', property: 'lunes', index: 1 },
    { label: 'Martes', property: 'martes', index: 2 },
    { label: 'Miércoles', property: 'miercoles', index: 3 },
    { label: 'Jueves', property: 'jueves', index: 4 },
    { label: 'Viernes', property: 'viernes', index: 5 },
    { label: 'Sábado', property: 'sabado', index: 6 },
    { label: 'Domingo', property: 'domingo', index: 7 }
  ];

  horarioTeam: HorarioTeam = new HorarioTeam({});
  diasTeam: any;
  temporadaStoredValue = '2025';

  constructor(
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
  ) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
      this.cargarInfoEquipo();
      this.cargarListadoClubes();
    });

    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }
  }

  cargarInfoEquipo() {
    this.teamService.getTeamById(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.team = response.data;
          this.teamInfo = {
            teamId: this.team.teamId,
            levelLeague: this.team.levelLeague,
            name: this.team.name,
            objectiveTeam: this.team.objectiveTeam,
            opinionTeam: this.team.opinionTeam,
            trainingDays: this.team.trainingDays,
            categoryType: {
              categoryTypeId: 1,
              year: 0,
              categoryName: ''
            },
            clubId: this.team.clubId,
            userId: this.team.userId,
            temporada: this.temporadaStoredValue,
            dateCreate: this.team.dateCreate,
            dateUpdate: this.team.dateUpdate
          };
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Método para cargar el listado de clubes
  cargarListadoClubes(): void {
    this.clubService.getAllClubsRegistered().subscribe(
      (response: Response) => {
        if (response.data.length > 0) {
          this.clubList = response.data;
        }
      },
      (error) => {
        console.error('Error al cargar el listado de clubes', error);
      }
    );
  }

  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', this.teamId, 0]);
  }

  guardarCambios() { }


  toggleDiaOkDesactivar(property: string, value: number) {
    this.diasTeam[property] = value === 0 ? 1 : 0;
    //console.log(`${property} actualizada a ${value}`);
  }

  openModalHorario(): void {
    this.teamService.gethorariobyteam(this.teamId, 0).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.diasTeam = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.showModalHorario = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalHorario() {
    this.showModalHorario = false;
  }

}
