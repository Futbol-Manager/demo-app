import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Team, TeamConJugadores, TeamNew } from 'src/app/core/services/team/team.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ClubService } from 'src/app/core/services/club/club.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss']
})
export class InicioComponent implements OnInit {
  crearEquipoForm: FormGroup;

  datosCargados: boolean = false;
  usuarioActual!: User | null;
  listTeam: any[] = []; // Define una variable para almacenar el listado de equipos
  showModal = false;
  teamNew: TeamNew = new TeamNew(); // Modelo para el nuevo equipo
  clubList: any[] = [];

  constructor(private loginService: LoginService,
    private router: Router,
    private teamService: TeamService,
    private clubService: ClubService,
    private fb: FormBuilder,
    ) {
      this.crearEquipoForm = this.fb.group({
        categoryTypeId: ['', Validators.required],
        levelLeague: ['', Validators.required],
        name: ['', Validators.required],
        objectiveTeam: ['', Validators.required],
        trainingDays: ['', Validators.required],
        opinionTeam: ['', Validators.required],
      });
    }

  ngOnInit(): void {
    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      // Carga el listado de equipos al inicializar el componente
      this.cargarListadoEquipos();
      // Cargar listado de clubes disponibles
      this.cargarListadoClubes();
    });

  }

  // Método para cargar el listado de equipos
  cargarListadoEquipos(): void {
    this.teamService.getTeams(this.usuarioActual!!.userId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listTeam = response.data.map((team: TeamConJugadores) => new TeamConJugadores(team));
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.datosCargados = true;
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
        if(response.data.length > 0){
          this.clubList = response.data;
        }
      },
      (error) => {
        console.error('Error al cargar el listado de clubes', error);
      }
    );
  }

  cerrarSesion(): void {
    // Llama al método cerrarSesion del servicio
    this.loginService.cerrarSesion();
  }

  verPerfil() {

  }

  // Método para abrir el modal de creación de equipo
  abrirModalCrearEquipo(): void {
    this.showModal = true;
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;
    // Limpiar los datos del nuevo equipo al cerrar el modal si es necesario
    this.teamNew = new TeamNew();
  }

  // Método para crear un nuevo equipo
  crearEquipo(): void {

    // Recoge los campos del modal y asigna al objeto nuevoEquipo
    this.teamNew = {
      teamId: 0, // O el valor por defecto que desees para teamId
      levelLeague: this.teamNew.levelLeague,
      name: this.teamNew.name,
      objectiveTeam: this.teamNew.objectiveTeam,
      opinionTeam: this.teamNew.opinionTeam,
      trainingDays: this.teamNew.trainingDays,
      categoryType: {
        categoryTypeId: this.teamNew.categoryType.categoryTypeId,
        year: 0,
        categoryName: ''
      },
      clubId: this.teamNew.clubId
    };

    // Llamada al servicio para crear el equipo
    this.teamService.createUpdateTeam(this.usuarioActual!.userId.toString(), this.teamNew,).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        console.log('Equipo creado con éxito:', response);

        // Cargar nuevamente el listado de equipos después de la creación exitosa
        this.cargarListadoEquipos();

        // Cerrar el modal después de crear el equipo
        this.cerrarModal();
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  // Método para confirmar la eliminación del equipo
  confirmarEliminarEquipo(teamId: number, name: string): void {
    const confirmacion = confirm('¿Estás seguro de que deseas eliminar el equipo con ID ${teamId}?');
    if (confirmacion) {
      // Llama al método para eliminar el equipo
      this.eliminarEquipo(teamId);
    }
  }

  // Método para eliminar el equipo
  eliminarEquipo(teamId: number): void {
    //hacemos un borrado logico
    this.teamService.deleteLogicTeam(teamId.toString()).subscribe(
      (response) => {
        console.log('Equipo eliminado con éxito:', response);
        // Cargar nuevamente el listado de equipos después de la eliminación exitosa
        this.cargarListadoEquipos();
      },
      (error) => {
        console.error('Error al eliminar el equipo:', error);
      }
    );
    /*
    // Lógica para eliminar el equipo llamando al servicio correspondiente
    this.teamService.deleteTeam(teamId.toString()).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        console.log('Equipo eliminado con éxito:', response);

        // Cargar nuevamente el listado de equipos después de la eliminación exitosa
        this.cargarListadoEquipos();
      },
      (error) => {
        console.error('Error al eliminar el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
    */
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(teamId: number): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', teamId]);
  }

}
