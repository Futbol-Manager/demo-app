import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Team, TeamConJugadores, TeamNew } from 'src/app/core/services/team/team.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ClubService } from 'src/app/core/services/club/club.service';
import { distinctUntilChanged, filter, switchAll } from 'rxjs/operators';

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
  listHijos: any[] = []; // Define una variable para almacenar el listado de hijos
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
  userId = 0;
  profileId = 0;
  datosNoCargados = false;
  datosCargando = true;
  numEquipos = 0;
  numPadresPagados = 0;
  clubOk = false;
  temporada = '2024';
  federacion: number | null = null;
  showAlertAndroid = true;

  federaciones: string[] = [
    'Real Federación Española de Fútbol',
    'Federación Andaluza de Fútbol',
    'Federación Aragonesa de Fútbol',
    'Federación de Fútbol del Principado de Asturias',
    'Federación Balear de Fútbol',
    'Federación Canaria de Fútbol',
    'Federación Cántabra de Fútbol',
    'Federación Castellano-Manchega de Fútbol',
    'Federación de Castilla y León de Fútbol',
    'Federación Catalana de Fútbol',
    'Federación Extremeña de Fútbol',
    'Federación Gallega de Fútbol',
    'Federación de Fútbol de la Comunidad Valenciana',
    'Federación de Fútbol de Madrid',
    'Federación de Fútbol de la Región de Murcia',
    'Federación Navarra de Fútbol',
    'Federación Riojana de Fútbol',
    'Federación Vasca de Fútbol',
    'Federación Interinsular de Fútbol de Las Palmas',
    'Federación Interinsular de Fútbol de Tenerife',
  ];

  // Categorías por defecto (las que ya tienes)
  categoriasDefault = [
    { value: 27, label: 'Sin equipo' },
    { value: 15, label: 'Senior' },
    { value: 16, label: 'Juvenil' },
    { value: 17, label: 'Juvenil/Cadete Femenina' },
    { value: 18, label: 'Cadete' },
    { value: 19, label: 'Cadete/Infantil Femenina' },
    { value: 20, label: 'Infantil' },
    { value: 21, label: 'Infantil/Alevín Femenina' },
    { value: 22, label: 'Alevín' },
    { value: 23, label: 'Benjamín' },
    { value: 24, label: 'Benjamín/Prebenjamín Femenina' },
    { value: 25, label: 'Prebenjamín' },
    { value: 26, label: 'Debutante' },
  ];

  // Categorías específicas para Federación 14 (Cataluña)
  /*categoriasCatalanas = [
    'Juvenil',
    'Cadet',
    'Infantil S14',
    'Infantil S13',
    'Aleví S12',
    'Aleví S11',
    'Lúdica Aleví',
    'Benjamí S10',
    'Benjamí S9',
    'Lúdica Benjamí',
    'Prebenjamí S8',
    'Prebenjamí S7',
    'Lúdica Prebenjamí',
  ].map((label, index) => ({ value: 100 + index, label })); // usar valores altos si necesitas diferenciarlos */

  categoriasCatalanas = [
    { value: 28, label: 'Juvenil' },
    { value: 29, label: 'Cadet' },
    { value: 30, label: 'Infantil S14' },
    { value: 31, label: 'Infantil S13' },
    { value: 32, label: 'Aleví S12' },
    { value: 33, label: 'Aleví S11' },
    { value: 34, label: 'Lúdica Aleví' },
    { value: 35, label: 'Benjamí S10' },
    { value: 36, label: 'Benjamí S9' },
    { value: 37, label: 'Lúdica Benjamí' },
    { value: 38, label: 'Prebenjamí S8' },
    { value: 39, label: 'Prebenjamí S7' },
    { value: 40, label: 'Lúdica Prebenjamí' },
    { value: 41, label: 'Cadet S15' },
    { value: 42, label: 'Cadet S16' }
  ];


  // Niveles por defecto
  nivelesDefault = [
    { value: 'LaLiga EA Sports', label: 'LaLiga EA Sports' },
    { value: 'Liga F', label: 'Liga F' },
    { value: 'LaLiga Hypermotion', label: 'LaLiga Hypermotion' },
    { value: 'Segunda RFEF Femenina', label: 'Segunda RFEF Femenina' },
    { value: 'Primera RFEF', label: 'Primera RFEF' },
    { value: 'Segunda RFEF', label: 'Segunda RFEF' },
    { value: 'Tercera RFEF', label: 'Tercera RFEF' },
    { value: 'Tercera RFEF Femenina', label: 'Tercera RFEF Femenina' },
    { value: 'Preferente Autonómica', label: 'Preferente Autonómica' },
    { value: 'Preferente Autonómica Femenina', label: 'Preferente Autonómica Femenina' },
    { value: 'Primera Autonómica', label: 'Primera Autonómica' },
    { value: 'Primera Autonómica Femenina', label: 'Primera Autonómica Femenina' },
    { value: 'Segunda Autonómica', label: 'Segunda Autonómica' },
    { value: 'Tercera Autonómica', label: 'Tercera Autonómica' },
    { value: 'División de Honor', label: 'División de Honor' },
    { value: 'Liga Nacional', label: 'Liga Nacional' },
    { value: 'Liga Sub-23', label: 'Liga Sub-23' },
    { value: 'Superliga', label: 'Superliga' },
    { value: 'Autonómica', label: 'Autonómica' },
    { value: 'Preferente', label: 'Preferente' },
    { value: 'Primera', label: 'Primera' },
    { value: 'Segunda', label: 'Segunda' },
    { value: 'Tercera', label: 'Tercera' },
    { value: 'Fútbol 5', label: 'Fútbol 5' },
    { value: 'No federado', label: 'No federado' },
  ];

  // Niveles específicos para Federación 14
  nivelesCatalanes = [
    'Primera Federació',
    'Segona Federació',
    'Tercera Federació',
    'Lliga Elit',
    'Primera Catalana',
    'Segona Catalana',
    'Tercera Catalana',
    'Quarta Catalana',
    'Divisió Honor',
    'Lliga Nacional',
    'Preferent',
    'Primera',
    'Segona',
    'Tercera',
    'Quarta',
    'No Federat',
  ].map(label => ({ value: label, label }));

  // Variables visibles que cambian dinámicamente
  categoriasVisibles = [...this.categoriasDefault];
  nivelesVisibles = [...this.nivelesDefault];

  temporadaStoredValue = '2024';

  constructor(
    private loginService: LoginService,
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
      federacion: [''],
      levelLeague: [''],
      name: [''],
      objectiveTeam: [''],
      trainingDays: [''],
      opinionTeam: [''],
    });
  }

  ngOnInit(): void {
    let datosYaCargados = false; // Bandera para evitar múltiples carga
    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
      this.temporada = this.temporadaStoredValue;
    }

    this.loginService.usuarioActual
      .pipe(
        filter(user => !!user), // Solo procede si `user` tiene un valor
        distinctUntilChanged() // Asegura que el valor de `user` haya cambiado
      )
      .subscribe(user => {
        if (datosYaCargados) return; // Evita múltiples ejecuciones si ya cargó
        this.usuarioActual = user;
        this.profileId = this.usuarioActual!.profileType.profileId;
        this.userId = this.usuarioActual!.userId;

        if (this.profileId === 2) {
          this.cargarListadoEquipos();
        } else if (this.profileId === 1) {
          this.cargarListadoEquiposForClub();
        } else if (this.profileId > 2) {
          this.datosCargando = false;
          this.teamService.getTeamByPlayer(this.userId.toString()).subscribe(
            (response: Response) => {
              if (response.data !== null) {
                this.listHijos = response.data;
                this.datosCargados = true;

                let goToDatos = false;
                let teamId = 0;
                for (let a = 0; a < this.listHijos.length; a++) {
                  if(this.listHijos[a].apellido == null){
                    goToDatos = true;
                    teamId = this.listHijos[a].teamId;
                    break;
                  }
                }

                if(goToDatos){
                  this.router.navigate(['/dashboard/jugadores', teamId]);
                }

              } else {
                console.error('La respuesta del servicio no tiene la estructura esperada', response);
              }
            },
            (error) => {
              console.error('Error al cargar el listado de equipos', error);
            }
          );
        }
        datosYaCargados = true; // Actualiza la bandera después de la primera carga
      });

    const storedValue = localStorage.getItem('federacionSeleccionada');
    if (storedValue !== null) {
      this.federacion = +storedValue;

      if (this.federacion.toString() === '10') {
        this.categoriasVisibles = [...this.categoriasCatalanas];
        this.nivelesVisibles = [...this.nivelesCatalanes];
      } else {
        this.categoriasVisibles = [...this.categoriasDefault];
        this.nivelesVisibles = [...this.nivelesDefault];
      }
    }
  }

  guardarFederacion() {
    if (this.federacion !== null) {
      localStorage.setItem('federacionSeleccionada', this.federacion.toString());
    }

    if (this.federacion != null && this.federacion.toString() === '10') {
      this.categoriasVisibles = [...this.categoriasCatalanas];
      this.nivelesVisibles = [...this.nivelesCatalanes];
    } else {
      this.categoriasVisibles = [...this.categoriasDefault];
      this.nivelesVisibles = [...this.nivelesDefault];
    }
  }

  copyLink() {
    const link = 'https://appsphairatech.com/registro-padres/' + this.clubId;
    //const link = 'localhost:4200/registro-padres/' + this.clubId;

    navigator.clipboard.writeText(link)
      .then(() => {
        console.log('Enlace copiado al portapapeles:', link);
        // Opcional: puedes usar un toast o alert para avisar al usuario
        alert('¡Link copiado!');
      })
      .catch(err => {
        console.error('Error al copiar el enlace:', err);
        alert('No se pudo copiar el enlace. Intenta de nuevo.');
      });
  }

  checkSuscripcion() {
    //acceder a un endpoint que revisa la sus, si es null, ver si está dentro de la semana que se creo la cuenta
    //si ya paso la semana, se revisara luego la fecha de renovacion, si no paso aun, pues no hacer nada, si paso
    //revisar en stripe el estado, porque si esta bien, hay que actualizar la fecha y si esta mal, actualizar a F el valido y la fecha, si esta mal
    // avisar por un alert
    this.teamService.getEstadoSuscripcion(this.userId, this.profileId).subscribe(
      (response: Response) => {
        this.numEquipos = response.data;
        if (response.data == 999) {
          //significa que es un club con plan gratuido
          //hay que ver si tiene mas de 50 padres que pagan cuota, de ser asi, desbloquear los menus
          this.teamService.getPlayersByTeamByClubVerify(this.userId, this.temporadaStoredValue).subscribe(
            (resp: Response) => {
              this.numPadresPagados = response.data;
              if (resp.data < 49) {
                //significa que lo puede tener todo
                this.clubOk = true;
              } else {
                //significa que no tiene acceso
              }
            },
            (error) => {
              console.error('Error al cargar el listado de equipos', error);
            }
          );
        }

        if (response.data < 1) {
          //significa que NO es valido el acceso
          this.datosNoCargados = true;
        } else {
          this.datosCargados = true;
          this.clubOk = true;
        }
        this.datosCargando = false;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  // Método para cargar el listado de equipos
  cargarListadoEquipos(): void {
    this.teamService.getTeams(this.userId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data) {
          if (response.data.picture != null) {
            this.pictureClub = response.data.picture;
            this.noPicture = true;
          }
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listTeam = response.data.teams; //.map((team: TeamConJugadores) => new TeamConJugadores(team));
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.checkSuscripcion();
        //this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cargarListadoEquiposForClub(): void {
    localStorage.setItem('temporada', this.temporada);
    this.temporadaStoredValue = this.temporada;

    this.teamService.getTeamByClub(this.usuarioActual!.userId.toString(), this.temporadaStoredValue).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data) {
          this.clubId = response.data.club.clubId;
          if (response.data.club.picture != null) {
            this.pictureClub = response.data.club.picture;
            this.noPicture = true;
          }
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listTeam = response.data.teams; //.map((team: TeamConJugadores) => new TeamConJugadores(team));
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.checkSuscripcion();
        //this.datosCargados = true;
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
    let accessSusOk = false;
    //revisar el numero de equipos que hay y puede tener
    if (this.profileId === 2) {
      //comparar con el numero exacto
      if (this.listTeam.length < this.numEquipos) {
        accessSusOk = true;
      }
    } else if (this.profileId === 1) {
      //comparar con uno menos ya que estara el Sin Equipo
      if (this.listTeam.length < (this.numEquipos + 1)) {
        accessSusOk = true;
      }
    }

    if (!accessSusOk) {
      const confirmacion = confirm('No puedes creear más equipos, necesitas actualizar tu suscripción, ¿quieres ir a la página de suscripción?');
      if (confirmacion) {
        this.router.navigate(['/dashboard/suscripcion', this.userId]);
      }
    } else {
      this.showModal = true;
    }
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
      //const categoriaLabel = this.categoriasVisibles.find(c => c.value === this.crearEquipoForm.value.categoryTypeId)?.label;
      const categoriaLabel = this.categoriasVisibles.find(
        c => +c.value === +this.crearEquipoForm.value.categoryTypeId
      )?.label;

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
          categoryName: categoriaLabel != undefined ? categoriaLabel : ''
        },
        clubId: this.clubId || 0,
        userId: 0,
        temporada: this.temporadaStoredValue, //TODO aqui debe de coger el año de la temporada actual
        dateCreate: '',
        dateUpdate: ''
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
  navegarACalendario(teamId: number, playerId: number): void {
    switch (this.profileId) {
      case 1:
        this.router.navigate(['/dashboard/menu-club', teamId]);
        break;
      case 2:
        this.router.navigate(['/dashboard/menu-entrenador', teamId, playerId]);
        break;
    }
  }

  // Método para navegar a la pantalla de calendario
  navegarAOpcionesJugador(teamId: number, playerId: number): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/opcionesjugador', teamId, playerId]);
  }

  navegarAScouting(playerId: number): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/scouting-player', playerId]);
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
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
      case 4:
        this.router.navigate(['/dashboard/patrocinadores', this.clubId]);
        break;
      case 5:
        this.router.navigate(['/dashboard/notificaciones', this.clubId]);
        break;
      case 6:
        this.router.navigate(['/dashboard/documentos-club', this.clubId]);
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
          alert("Jugadores insertado en los exipos.");
          this.router.navigate(['/dashboard/inicio-deportes']);
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

  goSuscripcion() {
    this.showModal = false;
    this.router.navigate(['/dashboard/suscripcion', this.userId]);
  }

  cerrarAlertaAndroid(): void {
    this.showAlertAndroid = false;
  }

}
