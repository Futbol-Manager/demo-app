import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Response } from 'src/app/core/services/models/response.model';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { HorarioTeam, TeamNew } from 'src/app/core/services/team/team.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Location } from '@angular/common';
import { ClubService } from 'src/app/core/services/club/club.service';

@Component({
  selector: 'app-informacion-equipo',
  templateUrl: './informacion-equipo.component.html',
  styleUrls: ['./informacion-equipo.component.scss']
})
export class InformacionEquipoComponent implements OnInit {
  editarEquipoForm: FormGroup;
  teamNew: TeamNew = new TeamNew();
  teamId!: number;
  team: TeamNew = new TeamNew();
  teamInfo: TeamNew = new TeamNew();
  coaches: any = [];
  usuarioActual!: User | null;

  userForm: FormGroup = this.fb.group({
    mail: ['', Validators.email],
  });;

  showModal = false;
  profileId = 0;
  userId = 0;
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

  timeOptions: string[] = [
    '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45',
    '20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45',
    '22:00', '22:15', '22:30', '22:45'
  ];

  categoryOptions: { value: string, label: string }[] = [
    { value: '15', label: 'Senior' },
    { value: '16', label: 'Juvenil' },
    { value: '17', label: 'Juvenil/Cadete Femenina' },
    { value: '18', label: 'Cadete' },
    { value: '19', label: 'Cadete/Infantil Femenina' },
    { value: '20', label: 'Infantil' },
    { value: '21', label: 'Infantil/Alevín Femenina' },
    { value: '22', label: 'Alevín' },
    { value: '23', label: 'Benjamín' },
    { value: '24', label: 'Benjamín/Prebenjamín Femenina' },
    { value: '25', label: 'Prebenjamín' },
    { value: '26', label: 'Debutante' }
  ];

  levelOptions: { value: string, label: string }[] = [
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

  nameOptions: { value: string, label: string }[] = [
    { value: '', label: 'Sin letra' },
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: 'E', label: 'E' },
    { value: 'F', label: 'F' },
    { value: 'G', label: 'G' },
    { value: 'H', label: 'H' },
    { value: 'I', label: 'I' },
    { value: 'J', label: 'J' },
    { value: 'K', label: 'K' },
    { value: 'L', label: 'L' },
    { value: 'M', label: 'M' }
  ];

  categoriaNombre: string = '';
  categoriasFiltradas: { categoryTypeId: number, categoryName: string, year: number }[] = [];
  categoriasLista: { categoryTypeId: number, categoryName: string, year: number }[] = [];
  mostrarDropdown: boolean = false;
  selectedCategoriaId: number | null = null;

  categoriaNivel: string = '';
  mostrarDropdown2: boolean = false;
  nivelesVisiblesFiltradas = [...this.levelOptions];
  nivelesVisibles = [...this.levelOptions];
  datosCargados: boolean = false;

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private registerService: RegisterService,
    private loginService: LoginService,
    private clubService: ClubService,
    private location: Location
  ) {
    this.editarEquipoForm = this.fb.group({
      teamId: ["", Validators.required],
      categoryTypeId: ["", Validators.required],
      levelLeague: ["", Validators.required],
      name: [""],
      objectiveTeam: [""],
      trainingDays: [""],
      opinionTeam: [""],
      categoriaNombre: ['']
    });
  }

  ngOnInit(): void {
    // Inicialización del objeto diasTeam
    this.diasTeam = {
      lunes: { inicio: '', fin: '', activo: 0 },
      martes: { inicio: '', fin: '', activo: 0 },
      miercoles: { inicio: '', fin: '', activo: 0 },
      jueves: { inicio: '', fin: '', activo: 0 },
      viernes: { inicio: '', fin: '', activo: 0 },
      sabado: { inicio: '', fin: '', activo: 0 },
      domingo: { inicio: '', fin: '', activo: 0 }
    };

    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.profileId = Number(this.usuarioActual!.profileType.profileId);
      this.userId = Number(this.usuarioActual!.userId);
    });
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      this.cargarInfoEquipo();
      this.cargarInfoEntrenadores();
      this.obtenerCategorias();
    });
  }

  goBack(): void {
    this.location.back();
  }

  abrirModalInvitarEntenador() {
    this.showModal = true;
  }

  cargarInfoEntrenadores() {
    this.teamService.getUserListByTeam(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.coaches = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cargarInfoEquipo() {
    this.teamService.getTeamById(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.editarEquipoForm.get('categoriaNombre')?.setValue(response.data.category);
          this.team = response.data;
          this.teamInfo = {
            teamId: this.team.teamId,
            levelLeague: this.team.levelLeague,
            name: this.team.name,
            objectiveTeam: this.team.objectiveTeam,
            opinionTeam: this.team.opinionTeam,
            trainingDays: this.team.trainingDays,
            categoryType: {
              categoryTypeId: response.data.categoryTypeId,
              year: 0,
              categoryName: "",
            },
            clubId: this.team.clubId,
            userId: this.team.userId,
            temporada: this.team.temporada,
            dateCreate: this.team.dateCreate,
            dateUpdate: this.team.dateUpdate
          };

          // Asignar los valores recuperados del equipo al formulario
          this.editarEquipoForm.patchValue({
            teamId: this.teamInfo.teamId,
            categoryTypeId: this.teamInfo.categoryType.categoryTypeId,
            levelLeague: this.teamInfo.levelLeague,
            name: this.teamInfo.name,
            objectiveTeam: this.teamInfo.objectiveTeam,
            trainingDays: this.teamInfo.trainingDays,
            opinionTeam: this.teamInfo.opinionTeam
          });
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  editarEquipo(): void {
    if (this.editarEquipoForm.valid) {
      let categoriaId = this.teamInfo.categoryType.categoryTypeId;
      if (this.selectedCategoriaId !== null) {
        categoriaId = this.selectedCategoriaId;
      }

      const fv = this.editarEquipoForm.value;
      this.teamNew = {
        teamId: fv.teamId,
        levelLeague: fv.levelLeague || '',
        name: fv.name || '',
        objectiveTeam: fv.objectiveTeam || '',
        opinionTeam: fv.opinionTeam || '',
        trainingDays: fv.trainingDays || '',
        categoryType: {
          categoryTypeId: categoriaId,
          year: 0,
          categoryName: ''
        },
        clubId: this.team.clubId || 0,
        userId: 0,
        temporada: this.team.temporada,
        dateCreate: this.team.dateCreate,
        dateUpdate: this.team.dateUpdate
      };
      // Llamada al servicio para editar el equipo
      // como estamos editando el equipo, podemos mandar userId = 0
      this.teamService.createUpdateTeam(this.usuarioActual!.userId, this.teamNew,).subscribe(
        (response) => {
          this.cargarInfoEquipo();
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'top';
          this.snackBar.open('Información del equipo actualizada correctamente.', 'Cerrar', snackBarConfig);
        },
        (error) => {
          console.error('Error al editar el equipo:', error);
        }
      );
    }
  }

  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    //this.router.navigate(['/dashboard/calendario', this.teamId, 0]);
    this.router.navigate(['/dashboard/menu-entrenador', this.teamId, 0]);
  }

  cerrarModal(): void {
    this.showModal = false;
  }

  invitarEntrenador() {
    if (this.userForm.valid) {
      this.registerService.inviteCoach(this.userForm.value.mail, this.teamId, this.userId).pipe().subscribe(
        res => {
          let msg = 'Entrenador invitado correctamente.';
          if (res.data != null) {
            this.cargarInfoEntrenadores();
          } else {
            msg = 'El email introducido no es váildo.';
          }
          this.cerrarModal();
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'bottom';
          this.snackBar.open(msg, 'Cerrar', snackBarConfig);
        })
    }
  }

  deleteCoach(userId: number) {
    this.registerService.deleteCoach(this.teamId, userId).pipe().subscribe(
      res => {
        if (res.data) {
          this.cargarInfoEntrenadores();
        }
        this.cerrarModal();
        const snackBarConfig = new MatSnackBarConfig();
        snackBarConfig.duration = 5000;
        snackBarConfig.horizontalPosition = 'center';
        snackBarConfig.verticalPosition = 'bottom';
        this.snackBar.open('Entrenador eliminado correctamente.', 'Cerrar', snackBarConfig);
      })
  }

  // Método para confirmar la eliminación del equipo
  confirmarEliminarEquipo(): void {
    if (this.team.categoryType.categoryTypeId == 27) {
      alert('Este equipo no puede ser eliminado ya que todos los nuevos jugadores registrados son añadidos al mismo');
    } else {
      const confirmacion = confirm('¿Estás seguro de que deseas eliminar el equipo?');
      if (confirmacion) {
        // Llama al método para eliminar el equipo
        this.eliminarEquipo();
      }
    }
  }

  // Método para eliminar el equipo
  eliminarEquipo(): void {
    //hacemos un borrado logico
    this.teamService.deleteLogicTeam(this.teamId.toString()).subscribe(
      (response) => {
        this.router.navigate(['/dashboard/inicio']);
      },
      (error) => {
        console.error('Error al eliminar el equipo:', error);
      }
    );
  } guardarCambios() { }


  toggleDiaOkDesactivar(property: string, value: number) {
    this.diasTeam[property] = value === 0 ? 1 : 0;
    this.updateHorarioTeam(this.diasTeam);
    // Aquí puedes añadir cualquier otra lógica necesaria
    //console.log(`${property} actualizada a ${value}`);
  }

  changeHora() {
    this.updateHorarioTeam(this.diasTeam);
  }

  updateHorarioTeam(horario: HorarioTeam) {
    this.teamService.createUpdateHorarioTeam(horario).subscribe(
      (response) => {
        //actualizar el horario del equipo para no eliminarlo al guardar
        console.log(response.data);
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  openModalHorario(): void {
    this.teamService.gethorariobyteam(this.teamId, this.team.clubId).subscribe(
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

  onInputCategoria(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (value.length >= 4) {
      // Lógica para buscar categorías
      console.log('Buscando categorías con:', value);
      this.categoriaNombre = value;
      this.buscarCategorias(value);
    } else {
      //this.categoriasFiltradas = [];
      this.mostrarDropdown = false;
    }
  }

  buscarCategorias(nombre: string): void {
    this.categoriasFiltradas = this.categoriasLista.filter(cat => cat.categoryName.toLowerCase().includes(nombre.toLowerCase()));
    this.mostrarDropdown = true;

    // Aquí harías la llamada real al backend, por ahora lo simulamos:
    /*this.categoriasFiltradas = [
      { id: 1, text: 'Cadete' },
      { id: 2, text: 'Juvenil' }
    ].filter(cat => cat.text.toLowerCase().includes(nombre.toLowerCase()));*/

  }

  onInputNivel(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (value.length >= 4) {
      // Lógica para buscar categorías
      console.log('Buscando niveles con:', value);
      this.categoriaNivel = value;
      this.buscarNivel(value);
    } else {
      //this.categoriasFiltradas = [];
      this.mostrarDropdown2 = false;
    }
  }

  buscarNivel(nombre: string): void {
    this.nivelesVisiblesFiltradas = this.nivelesVisibles.filter(n => n.label.toLowerCase().includes(nombre.toLowerCase()));
    this.mostrarDropdown2 = true;
  }

  seleccionarCategoria(cat: { categoryTypeId: number, categoryName: string }): void {
    this.categoriaNombre = cat.categoryName;
    this.selectedCategoriaId = cat.categoryTypeId;
    this.mostrarDropdown = false;
    this.editarEquipoForm.get('categoriaNombre')?.setValue(this.categoriaNombre);
  }

  seleccionarNivel(nivel: any): void {
    this.categoriaNivel = nivel.label;
    this.editarEquipoForm.get('levelLeague')?.setValue(this.categoriaNivel);
  }

  crearCategoria(nombre: string): void {
    if (!nombre.trim()) return;

    // Aquí iría tu llamada real al backend:
    const dto = { categoryTypeId: 0, categoryName: nombre, year: 0 };

    this.clubService.updateCreateCategoryType(dto).subscribe({
      next: (res) => {
        this.selectedCategoriaId = res.data.categoryTypeId;
        this.categoriaNombre = dto.categoryName;
        this.mostrarDropdown = false;
        // Opcionalmente: podrías añadirla a la lista si la quieres mostrar después
        this.categoriasFiltradas.unshift(res.data);
      },
      error: (err) => {
        console.error(err);
        alert('Error al subir el documento');
      }
    });
  }

  crearNivel(nombre: string): void {
    if (!nombre.trim()) return;
    this.seleccionarNivel(nombre);
  }

  ocultarDropdownConRetraso(): void {
    setTimeout(() => {
      this.mostrarDropdown = false;
    }, 200);
  }

  ocultarDropdownConRetrasoNivel(): void {
    setTimeout(() => {
      this.mostrarDropdown2 = false;
    }, 200);
  }

  obtenerCategorias() {
    this.categoriasFiltradas = [];
    this.editarEquipoForm.get('categoriaNombre')?.reset();
    this.categoriaNombre = '';
    this.clubService.getListCategorias().subscribe(
      (response: Response) => {
        this.categoriasLista = response.data;
        this.datosCargados = true;
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

}
