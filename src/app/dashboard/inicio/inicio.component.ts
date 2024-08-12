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
  clubId: number = 0;
  pictureClub = '';
  noPicture = false;
  showModalSubirJugadores = false;
  excelForm: FormGroup;
  fileName: string | null = null;
  showUploadButton: boolean = false;
  selectedFile: File | null = null;

  constructor(private loginService: LoginService,
    private router: Router,
    private teamService: TeamService,
    private clubService: ClubService,
    private fb: FormBuilder,
  ) {
    this.excelForm = this.fb.group({
      excelFile: [null]
    });
    this.crearEquipoForm = this.fb.group({
      categoryTypeId: ['', Validators.required],
      levelLeague: [''],
      name: [''],
      objectiveTeam: [''],
      trainingDays: [''],
      opinionTeam: [''],
    });
  }

  ngOnInit(): void {
    // Suscríbete al observable del servicio para obtener el usuario actual
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      let profileId = this.usuarioActual!.profileType.profileId;
      let playerId = this.usuarioActual!.playerId;

      if (profileId === 2) {
        // Carga el listado de equipos al inicializar el componente
        this.cargarListadoEquipos();
      } else if (profileId === 1) {
        // Carga el listado de equipos al inicializar el componente
        this.cargarListadoEquiposForClub();
      } else if (profileId > 2) {
        this.teamService.getTeamByPlayer(playerId.toString()).subscribe(
          (response: Response) => {
            // Verifica que la propiedad 'data' exista en la respuesta
            if (response.data !== null) {
              this.router.navigate(['/dashboard/calendario', response.data]);
            } else {
              console.error('La respuesta del servicio no tiene la estructura esperada', response);
            }
          },
          (error) => {
            console.error('Error al cargar el listado de equipos', error);
          }
        );
      }
    });
  }

  // Método para cargar el listado de equipos
  cargarListadoEquipos(): void {
    this.teamService.getTeams(this.usuarioActual!.userId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data) {
          if (response.data.picture != null) {
            this.pictureClub = response.data.picture;
          } else {
            this.noPicture = true;
          }
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listTeam = response.data.teams; //.map((team: TeamConJugadores) => new TeamConJugadores(team));
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

  cargarListadoEquiposForClub(): void {
    this.teamService.getTeamByClub(this.usuarioActual!.userId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data) {
          this.clubId = response.data.club.clubId;
          this.pictureClub = response.data.club.picture;
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listTeam = response.data.teams; //.map((team: TeamConJugadores) => new TeamConJugadores(team));
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
        if (response.data.length > 0) {
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
    if (this.crearEquipoForm.valid) {
      // Recoge los campos del modal y asigna al objeto nuevoEquipo
      this.teamNew = {
        teamId: 0, // O el valor por defecto que desees para teamId
        levelLeague: this.crearEquipoForm.value.levelLeague || '',
        name: this.crearEquipoForm.value.name || '',
        objectiveTeam: this.crearEquipoForm.value.objectiveTeam || '',
        opinionTeam: this.crearEquipoForm.value.opinionTeam || '',
        trainingDays: this.crearEquipoForm.value.trainingDays || '',
        categoryType: {
          categoryTypeId: this.crearEquipoForm.value.categoryTypeId,
          year: 0,
          categoryName: ''
        },
        clubId: this.crearEquipoForm.value.clubId || 0,
        userId: 0,
        temporada: '2024' //TODO aqui debe de coger el año de la temporada actual
      };

      // Llamada al servicio para crear el equipo
      this.teamService.createUpdateTeam(this.usuarioActual!.userId, this.teamNew,).subscribe(
        (response) => {
          // Manejar la respuesta según tus necesidades
          //console.log('Equipo creado con éxito:', response);

          // Cargar nuevamente el listado de equipos después de la creación exitosa
          //this.cargarListadoEquipos();
          this.listTeam.push(response.data);

          // Cerrar el modal después de crear el equipo
          this.cerrarModal();
        },
        (error) => {
          console.error('Error al crear el equipo:', error);
          // Puedes manejar el error según tus necesidades
        }
      );
    }
  }

  // Método para confirmar la eliminación del equipo
  confirmarEliminarEquipo(team: any, index: number): void {
    let name = team.category + ' ' + team.name;
    name = name.trim() + ' ' + team.levelLeague;
    const confirmacion = confirm('¿Estás seguro de que deseas eliminar el equipo ' + name);
    if (confirmacion) {
      // Llama al método para eliminar el equipo
      this.eliminarEquipo(team.teamId, index);
    }
  }

  // Método para eliminar el equipo
  eliminarEquipo(teamId: number, index: number): void {
    //hacemos un borrado logico
    this.teamService.deleteLogicTeam(teamId.toString()).subscribe(
      (response) => {
        console.log('Equipo eliminado con éxito:', response);
        // Cargar nuevamente el listado de equipos después de la eliminación exitosa
        this.listTeam.splice(index, 1);
        //this.cargarListadoEquipos();
      },
      (error) => {
        console.error('Error al eliminar el equipo:', error);
      }
    );
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(teamId: number): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/calendario', teamId]);
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/contabilidad', this.clubId]);
        break;
      case 2:
        this.router.navigate(['/dashboard/ropa', this.clubId]);
        break;
      case 3:
        this.router.navigate(['/dashboard/cuadro', this.clubId]);
        break;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.name.endsWith('.xlsx')) {
        this.fileName = file.name;
        this.selectedFile = file;
        this.showUploadButton = true;
        this.excelForm.patchValue({
          excelFile: file
        });
      } else {
        this.fileName = null;
        this.selectedFile = null;
        this.showUploadButton = false;
        alert('Por favor selecciona un archivo en formato .xlsx');
      }
    }
  }

  uploadExcel(): void {
    if (this.excelForm.valid && this.selectedFile) {
      const formData = new FormData();
      formData.append('excelFile', this.selectedFile);

      this.clubService.uploadExcel(this.clubId, this.selectedFile).subscribe(
        (response: Response) => {
          console.log('Archivo subido con éxito', response);
          // Aquí puedes manejar la respuesta del servidor
          this.showModalSubirJugadores = false;
        },
        (error) => {
          console.error('Error al subir el archivo', error);
          // Aquí puedes manejar el error
        }
      );

      console.log('Archivo cargado:', this.selectedFile);
    } else {
      console.error('Formulario inválido o archivo no seleccionado');
    }
  }

  openModalSubirJugadores() {
    this.showModalSubirJugadores = true;
  }

  cerrarModalSubirJugadores() {
    this.showModalSubirJugadores = false;
  }

}
