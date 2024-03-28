import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Task, Training } from 'src/app/core/services/models/training.models';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Response } from 'src/app/core/services/models/response.model';
import { MatchPreparation, PlayerPostPartido, PostPartido } from 'src/app/core/services/models/match.model';
import { MatDialog } from '@angular/material/dialog';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { PlayerId } from 'src/app/core/services/player/player.model';

// Utilizaremos una interfaz para especificar las opciones de formato de fecha
interface OpcionesFormatoFecha {
  month: 'long';
  year: 'numeric';
}

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit {
  datosCargados: boolean = false;
  teamId!: number;  // Ajusta el valor según el teamId del equipo actual
  calendario: any[][] = [];
  mesActual: Date = new Date();
  // Variable para almacenar el nombre del mes y el año actual
  tituloMesAnio!: string;
  showModal = false;
  showModalEntrenamiento = false;
  trainingSession: Training = new Training({});
  daySession!: string;
  listTraining: any[] = []; // Define una variable para almacenar el listado de equipos
  listMatchPreparation: any[] = [];

  nuevaTarea: Task = new Task();
  showAddTaskForm = false;
  trainingId!: number;
  matchPreparationId!: number;


  showModalPartido: boolean = false;
  match: MatchPreparation = new MatchPreparation({});

  taskList: any[] = [];
  viewShop: boolean = false;

  showModalPostPartido: boolean = false;
  postPartido: PostPartido = new PostPartido({});

  playerPostPartido: PlayerId[] = [];
  playerInfoPostPartido: PlayerPostPartido = new PlayerPostPartido({});
  postPartidoId: number = 0;

  cerrarPlayer: PlayerId = new PlayerId({});

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      console.log('teamId:', this.teamId);
    });
    this.getListaEntrenamientos();
    this.getListaPrePartido();
  }

  // Método para generar el calendario para el mes especificado
  private generarCalendarioV2(mes: Date): void {
    // Obtener el primer día del mes
    const primerDiaMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
    // Obtener el día de la semana en el que empieza el mes (0 para domingo, 1 para lunes, etc.)
    let primerDiaSemana = primerDiaMes.getDay();
    // Ajustar primerDiaSemana para que sea 0 para domingo, 1 para lunes, etc.
    primerDiaSemana = (primerDiaSemana === 0) ? 6 : primerDiaSemana - 1;

    // Obtener el número de días en el mes actual
    const ultimoDiaMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();

    // Generar los datos del calendario
    this.calendario = [];
    let dia = 1;
    for (let i = 0; i < 6; i++) {
      this.calendario[i] = [];
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < primerDiaSemana) || dia > ultimoDiaMes) {
          this.calendario[i][j] = '';
        } else {
          const fecha = new Date(mes.getFullYear(), mes.getMonth(), dia);
          fecha.setDate(fecha.getDate() + 1); // Añadir 1 día para obtener el día correcto
          const daysession = fecha.toISOString().split('T')[0];
          const training = this.listTraining.find(training => training.daySession === daysession);
          const matchPreparation = this.listMatchPreparation.find(match => match.matchDate === daysession);

          if (training && matchPreparation) {
            // Si hay tanto entrenamiento como partido, se pueden asignar ambos al mismo día
            this.calendario[i][j] = { numero: dia, daysession, trainingId: training.trainingSessionId, matchPreparationId: matchPreparation.matchPreparationId };
          } else if (training) {
            this.calendario[i][j] = { numero: dia, daysession, trainingId: training.trainingSessionId };
          } else if (matchPreparation) {
            this.calendario[i][j] = { numero: dia, daysession, matchPreparationId: matchPreparation.matchPreparationId };
          } else {
            this.calendario[i][j] = { numero: dia, daysession };
          }

          dia++;
        }
      }
    }

    // Actualizar el título del mes y el año
    const opcionesFecha: OpcionesFormatoFecha = { month: 'long', year: 'numeric' };
    this.tituloMesAnio = mes.toLocaleDateString('es-ES', opcionesFecha).toUpperCase();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    if (id === 1) {
      //this.router.navigate(['/dashboard/info_equipo', this.teamId]);
    } else if (id === 2) {
      this.router.navigate(['/dashboard/jugadores', this.teamId]);
    } else if (id === 3) {
      this.router.navigate(['/dashboard/estadisticas_equipo', this.teamId]);
    } else if (id === 4) {
      this.router.navigate(['/dashboard/estadisticas_jugadores', this.teamId]);
    }
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  navegarAInicio(): void {
    // Ajusta la ruta según la configuración de tus rutas en el enrutador
    this.router.navigate(['/dashboard/inicio']);
  }

  agregarEvento(dia: number) { }

  mesAnterior() {
    this.mesActual.setMonth(this.mesActual.getMonth() - 1);
    this.generarCalendarioV2(this.mesActual);
  }

  mesSiguiente() {
    this.mesActual.setMonth(this.mesActual.getMonth() + 1);
    this.generarCalendarioV2(this.mesActual);
  }

  // Método para abrir el modal de creación de equipo
  abrirModal(day: string): void {
    this.daySession = day;
    this.trainingSession = new Training({}); // Restablecer a un objeto vacío
    this.showModal = true;
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.daySession = '';
    this.showModal = false;
  }

  crearEntrenamiento() {
    this.trainingSession.daySession = this.daySession;
    this.trainingService.createUpdateTrainingSession(this.teamId.toString(), this.trainingSession).subscribe(
      (response) => {
        console.log('Sesión de entrenamiento guardada con éxito:', response);
        // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
        this.getListaEntrenamientos();
        // Cerrar el modal después de crear el equipo
        if (this.trainingSession.trainingSessionId === 0)
          this.cerrarModal();
        else
          this.cerrarModalEntrenamiento();

      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
        // Aquí puedes manejar el error, si es necesario
      }
    );
  }

  eliminarEntrenamiento() {
    this.trainingSession.daySession = this.daySession;
    this.trainingService.deleteTrainingSession(this.teamId.toString(), this.trainingSession).subscribe(
      (response) => {
        console.log('Sesión de entrenamiento eliminada con éxito:', response);
        // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
        this.getListaEntrenamientos();
        // Cerrar el modal después de crear el equipo
        if (this.trainingSession.trainingSessionId === 0)
          this.cerrarModal();
        else
          this.cerrarModalEntrenamiento();

      },
      (error) => {
        console.error('Error al eliminar la sesión de entrenamiento:', error);
        // Aquí puedes manejar el error, si es necesario
      }
    );
  }

  getListaEntrenamientos() {
    this.trainingService.getTrainingSessions(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listTraining = response.data.map((team: Training) => new Training(team));
          // Lógica para obtener o generar la información del calendario
          this.getListaPrePartido();
          //this.generarCalendarioV2(new Date());
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }


  getListaPrePartido() {
    this.trainingService.getListPrePartidoByTeam(this.teamId.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.listMatchPreparation = response.data.map((match: MatchPreparation) => new MatchPreparation(match));
          // Lógica para obtener o generar la información del calendario
          this.generarCalendarioV2(new Date());
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

  openEntrenamiento(id: any, day: string): void {
    this.daySession = day;
    this.trainingId = id;
    this.trainingService.getTasksByTraining(id.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Buscar el entrenamiento por su ID en la lista de entrenamientos
          const entrenamientoSeleccionado = this.listTraining.find(training => training.trainingSessionId === id);
          if (entrenamientoSeleccionado) {
            // Asignar el entrenamiento seleccionado a la variable trainingSession
            this.trainingSession = entrenamientoSeleccionado;
            this.trainingSession.tasks = response.data;
            // Abrir el modal
            this.showModalEntrenamiento = true;
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

  openPartido(id: any, day: string): void {
    this.daySession = day;
    // Obtener la información del partido por su ID
    this.trainingService.getPrePartido(id).subscribe(
      (response) => {
        // Verificar si se obtuvo correctamente la información del partido
        if (response.data) {
          // Asignar los datos del partido al objeto 'partido'
          this.match = response.data;
          // Abrir el modal
          this.showModalPartido = true;
        } else {
          console.error('Error al obtener la información del partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  // Método para cerrar el modal
  cerrarModalEntrenamiento(): void {
    this.showModalEntrenamiento = false;
  }

  crearTarea(): void {
    // Llamada al servicio para crear el equipo
    this.trainingService.createUpdateTask(this.trainingId.toString(), this.nuevaTarea,).subscribe(
      (response) => {
        // Agregar la nueva tarea a la lista de tareas del entrenamiento
        this.trainingSession.tasks.push(this.nuevaTarea);
        // Limpiar el formulario de nueva tarea
        this.nuevaTarea = new Task();
        // Ocultar el formulario de nueva tarea
        this.showAddTaskForm = false;
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
      }
    );
  }

  toggleAddTaskForm(): void {
    this.showAddTaskForm = !this.showAddTaskForm;
  }

  toggleTask(tarea: Task): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    tarea.collapsed = !tarea.collapsed;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (tarea.collapsed) {
      this.trainingSession.tasks
        .filter(t => t !== tarea) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  deleteTask(tarea: Task): void {
    // Lógica para eliminar el equipo llamando al servicio correspondiente
    this.trainingService.deleteTask(tarea.taskId.toString()).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        console.log('Tarea eliminada con éxito:', response);

        // Cargar nuevamente el listado de equipos después de la eliminación exitosa
        this.openEntrenamiento(this.trainingId, this.daySession);
      },
      (error) => {
        console.error('Error al eliminar la tarea:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  abrirModalPartido(): void {
    this.showModal = true;
  }

  cerrarModalPartido(): void {
    this.showModalPartido = false;
    // Limpiar los campos del partido
    this.match = new MatchPreparation({});
  }

  crearPartido(): void {
    this.match.matchDate = this.daySession;
    // Lógica para crear el partido usando this.partido y enviarlo al servicio
    this.trainingService.createUpdatePartido(this.teamId.toString(), this.match).subscribe(
      (response) => {
        // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
        if (response.data) {
          // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
          this.getListaPrePartido();
          if (this.match.matchPreparationId === 0)
            this.cerrarModal();
          else
            this.cerrarModalPartido();

        } else {
          console.error('Error al crear el partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  eliminarPartido(): void {
    this.match.matchDate = this.daySession;
    // Lógica para crear el partido usando this.partido y enviarlo al servicio
    this.trainingService.deletePartido(this.teamId.toString(), this.match).subscribe(
      (response) => {
        // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
        if (response.data) {
          // Vuelve a cargar la lista de entrenamientos y genera el calendario actualizado
          this.getListaPrePartido();
          if (this.match.matchPreparationId === 0)
            this.cerrarModal();
          else
            this.cerrarModalPartido();

        } else {
          console.error('Error al crear el partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  verTienda() {
    this.viewShop = true;
  }

  cerrarTienda() {
    this.viewShop = false;
    this.taskList = [];
  }

  tareaDescargada(response: boolean) {
    if (response) {
      this.openEntrenamiento(this.trainingId, this.daySession);
      this.cerrarTienda();
    }
  }

  openPostPartido(id: any): void {
    this.matchPreparationId = id;
    // Obtener la información del partido por su ID
    this.trainingService.getPostPartidoByMatchPrepaId(id).subscribe(
      (response) => {
        // Verificar si se obtuvo correctamente la información del partido
        if (response.data) {
          // Asignar los datos del partido al objeto 'partido'
          this.postPartido = response.data;
          this.postPartidoId = response.data.postPartidoId;
        }
        this.playerService.getPlayersPostPartido(this.teamId.toString(), this.postPartidoId.toString()).subscribe(
          (response) => {
            // Verificar si se obtuvo correctamente la información del partido
            if (response.data) {
              // Asignar los datos del partido al objeto 'partido'
              this.playerPostPartido = response.data;
              // Abrir el modal
              this.showModalPartido = false;
              this.showModalPostPartido = true;
            }
          },
          (error) => {
            console.error('Error en la solicitud:', error);
          }
        );
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );


  }

  cerrarModalPostPartido() {
    this.showModalPostPartido = false;
    // Limpiar los campos del partido
    this.match = new MatchPreparation({});
    this.postPartido = new PostPartido({});
  }

  guardarPostPartido() {
    this.postPartido.matchPreparation.matchPreparationId = this.matchPreparationId;
    this.trainingService.createUpdatePostPartido(this.postPartido).subscribe(
      (response) => {
        // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
        if (response.data) {
          this.cerrarModalPostPartido();
        } else {
          console.error('Error al crear el partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  togglePlayer(player: PlayerId): void {
    // Cambiar el estado isOpen de la tarea seleccionada
    player.collapsed = !player.collapsed;
    this.cerrarPlayer = player;

    let playerInfo = this.playerPostPartido.find(jugador => jugador.playerId === player.playerId);
    if(playerInfo?.info !== undefined && playerInfo?.info !== null){
      this.playerInfoPostPartido = playerInfo.info;
    } else {
      this.playerInfoPostPartido = new PlayerPostPartido({});
    }
    //this.playerInfoPostPartido = playerResult!.info;

    // Si la tarea se abre, cerrar el resto de las tareas
    if (player.collapsed) {
      this.playerPostPartido
        .filter(t => t !== player) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  cerrarTogglePlayer(player: PlayerId){
    player.collapsed = !player.collapsed;
    // Si la tarea se abre, cerrar el resto de las tareas
    if (player.collapsed) {
      this.playerPostPartido
        .filter(t => t !== player) // Filtrar todas las tareas que no sean la seleccionada
        .forEach(t => t.collapsed = false); // Cerrar cada tarea
    }
  }

  guardarInfoPlayerPostPartido(playerId: number){
    if(this.postPartidoId === 0){
      //mostrar aqui un alert de que no se puede guardar un jugador sin antes haber guardado la info en el postpartido
    } else {
      this.playerInfoPostPartido.player.playerId = playerId;
    this.playerInfoPostPartido.postPartido.postPartidoId = this.postPartidoId;
    this.playerService.createUpdateInfoPlayerPostPartido(this.playerInfoPostPartido).subscribe(
      (response) => {
        // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
        if (response.data) {
          //this.cerrarModalPostPartido();
          //esto cerraria la pestaña de jugador para poder introducir los datos de otros
          this.cerrarTogglePlayer(this.cerrarPlayer);
        } else {
          console.error('Error al crear el partido:', response.error.msg);
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
    }
  }
}
