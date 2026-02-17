import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { Location } from '@angular/common';
import { AsistenciaTraining, Task, Training } from 'src/app/core/services/models/training.models';
import { Response } from 'src/app/core/services/models/response.model';
import { MatchPreparation } from 'src/app/core/services/models/match.model';

@Component({
  selector: 'app-menu-entrenador',
  templateUrl: './menu-entrenador.component.html',
  styleUrls: ['./menu-entrenador.component.scss']
})
export class MenuEntrenadorComponent implements OnInit {

  @ViewChild('endOfModal', { static: false }) endOfModal!: ElementRef;

  teamId = 0;
  playerId = 0;
  userId: any = 0;
  playerIdUserActual: any = 0;
  usuarioActual!: User | null;
  clubId = 0;
  showModalEntrenamiento = false;

  showModalTask: boolean = false;  // Controla la visibilidad del modal
  tareaSeleccionada: any;  // Almacena la tarea seleccionada
  daySession!: string;
  dayPartido: string = '';
  nuevaTarea: Task = new Task();
  showAddTaskForm = false;
  trainingId!: number;
  matchPreparationId!: number;
  listTraining: any[] = []; // Define una variable para almacenar el listado de equipos
  listMatchPreparation: any[] = [];
  trainingSession: Training = new Training({});

  toggleVisible: number = 0;
  showModalPartido: boolean = false;
  match: MatchPreparation = new MatchPreparation({});

  taskList: any[] = [];
  viewShop: boolean = false;
  subirTarea = 0;

  selectedCategory: string = '';
  selectedSubcategory: string = '';
  selectedOption: string = '';
  showModal = false;
  selected: string = '';
  fechaEntrenamiento: string = '';
  entrenamientoCreado = false;
  btnCrearEntreno = true;

  estrategias: string[] = [
    'Acciones a Balón Parado', 'Acciones Combinadas', 'Circuito', 'Conservación', 'Juego Adaptado al Fútbol', 'Juego de Posición',
    'Juego de Posición Específico', 'Oleadas', 'Partidos', 'Posesión', 'Rueda de Pases', 'Situaciones Reducidas', 'Trabajo de Líneas'
  ];

  intenciones: string[] = [
    '1 vs 1', '2 vs 1', '2 vs 2', '3 vs 3', '4 vs 4', 'ABP Defensiva', 'ABP Ofensiva', 'Amplitud', 'Apoyos', 'Ataque Organizado', 'Ataque-Defensa',
    'Cobertura', 'Conservar', 'Contraataque', 'Defensa Inicio de Juego', 'Defensa de Juego Directo', 'Defensa Organizada',
    'Desmarques', 'Dividir', 'Evitar Progresión', 'Fase Defensiva', 'Fase Ofensiva', 'Fijar', 'Finalizar', 'Inicio de Juego',
    'Juego Directo', 'Mantener', 'Marcaje', 'Orientar', 'Permuta', 'Presionar', 'Primer Atacante', 'Primer Defensor',
    'Profundidad', 'Progresar', 'Proteger Portería', 'Recuperar', 'Reinicio de Juego', 'Replegar', 'Segundo Atacante',
    'Segundo Defensor', 'Temporizar', 'Tercer Atacante', 'Tercer Defensor',
    'Transición Defensiva', 'Transición Ofensiva', 'Transiciones',
  ];

  selectedFile!: File;


  showModalBoard: boolean = false;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    private playerService: PlayerService,
    private teamService: TeamService,
    private clubService: ClubService,
    private cdr: ChangeDetectorRef,
    private location: Location,
  ) {

  }

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
      });

      // Cargar clubId del entrenador desde el equipo actual
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

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    if (id === 1) {
      this.router.navigate(['/dashboard/inicio']);
    } else if (id === 2) {
      this.entrenamientoCreado = false;
      this.btnCrearEntreno = true;
      this.showModalEntrenamiento = true;
      this.trainingSession = new Training({});
      this.daySession = '';
      this.toggleVisible = 0;
    } else if (id === 3) {
      this.router.navigate(['/dashboard/tareas', this.teamId]);
    } else if (id === 4) {
      this.match = new MatchPreparation({});
      this.dayPartido = '';
      this.showModalPartido = true;
    } else if (id === 5) {
      this.router.navigate(['/dashboard/calendario', this.teamId, 0]);
    } else if (id === 6) {
      this.router.navigate(['/dashboard/estadisticas_equipo', this.teamId]);
    } else if (id === 7) {
      this.router.navigate(['/dashboard/jugadores', this.teamId]);
    } else if (id === 8) {
      this.router.navigate(['/dashboard/informacion_equipo', this.teamId]);
    } else if (id === 9) {
      this.router.navigate(['/dashboard/notificaciones', this.userId]);
    } else if (id === 10) {
      this.router.navigate(['/dashboard/patrocinadores', 0]);
    } else if (id === 11) {
      this.router.navigate(['/dashboard/estadisticas_jugadores', this.teamId]);
    } else if (id === 12) {
      this.router.navigate(['/dashboard/partidos-entrevistas', this.teamId, 0]);
    } else if (id === 13) {
      this.router.navigate(['/dashboard/clasificacion-resultados', this.teamId]);
    } else if (id === 14) {
      this.router.navigate(['/dashboard/lesiones', this.teamId]);
    } else if (id === 15) {
      this.router.navigate(['/dashboard/asistente-ia-coach']);
    } else if (id === 16) {
      this.router.navigate(['/dashboard/perfil-entrenador', this.teamId, this.playerId]);
    } else if (id === 17) {
      this.router.navigate(['/dashboard/debrief/history', this.teamId]);
    } else if (id === 18) {
      if (this.clubId) {
        this.router.navigate(['/dashboard/documentos-entrenador', this.clubId]);
      } else {
        alert('No se ha encontrado el club asociado.');
      }
    }
  }

  cerrarModalEntrenamiento() {
    this.showModalEntrenamiento = false;
    this.entrenamientoCreado = false;
    this.btnCrearEntreno = true;
  }

  openTaskModal(tarea: any): void {
    this.tareaSeleccionada = tarea;  // Almacena la tarea seleccionada
    this.showModalTask = true;  // Muestra el modal
  }

  closeTaskModal(): void {
    this.showModalTask = false;  // Oculta el modal
  }

  printDiv(tarea: any): void {
    const printContents = `
        <div>
            <h1>Tarea: ${tarea.slogans}</h1>
            <p>ID: ${tarea.taskId}</p>
            <p><b>Estrategia:</b> ${tarea.estrategia}</p>
            <p><b>Intención:</b> ${tarea.intencion}</p>
            <p><b>Descripción:</b> ${tarea.description}</p>
            <p><b>Reglas:</b> ${tarea.rules}</p>
            <p><b>Variantes:</b> ${tarea.variants}</p>
            <p><b>Tiempo de Trabajo:</b> ${tarea.worktime}</p>
            <p><b>Espacio:</b> ${tarea.space}</p>
            <p><b>Material:</b> ${tarea.material}</p>
            <p><b>Video YouTube:</b> ${tarea.video}</p>
            <br>
            ${tarea.imagenBoard ? `<img src="https://appsphairatech.com/images/task-board/${tarea.imagenBoard}" alt="Imagen de la tarea">` : ''}
        </div>
    `;

    const popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');

    if (popupWin) {
      popupWin.document.open();
      popupWin.document.write(`
            <html>
                <head>
                    <title>Impresión</title>
                    <style>
                        body { font-family: 'Arial', sans-serif; }
                        .btn { display: none; } /* Ocultar botones en la impresión */
                    </style>
                </head>
                <body onload="window.print();window.close();">${printContents}</body>
            </html>
        `);
      popupWin.document.close();
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

  openEntrenamiento(id: any, day: string): void {
    this.daySession = day;
    this.trainingId = id;
    this.trainingService.getTasksByTraining(id.toString()).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          this.trainingSession.tasks = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  toggleAddTaskForm(): void {
    this.showAddTaskForm = !this.showAddTaskForm;
    if (this.showAddTaskForm) {
      this.nuevaTarea.estrategia = '-';
      this.nuevaTarea.intencion = '-';
    }
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

  verTienda() {
    this.viewShop = true;
    this.scrollToEnd();
  }

  scrollToEnd() {
    if (this.endOfModal) {
      this.endOfModal.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
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

  toggleChangeSubirTarea(actualValue: number) {
    const nuevoValor = actualValue === 0 ? 1 : 0;
    const confirmacion = confirm('AVISO: Al activar esta opción, su tarea de entrenamiento será pública y visible para otros entrenadores. ' +
      'Cualquier dato ingresado será accesible. No está permitido publicar información, datos o imágenes con derechos de autor sin el permiso del autor. ' +
      'Cualquier contenido que infrinja esta norma será eliminado. ¿Estás seguro?');

    if (confirmacion) {
      this.subirTarea = nuevoValor;
    } else {
      // Si el usuario cancela, restablece el valor original del switch
      setTimeout(() => {
        (document.getElementById('subirTarea') as HTMLInputElement).checked = actualValue === 1;
      }, 0);
    }
  }

  onChangeToggle(event: any, id: number) {
    this.toggleVisible = event.target.checked ? 1 : 0;
  }

  crearTarea(): void {
    this.nuevaTarea.work = '';
    // Llamada al servicio para crear el equipo
    this.trainingService.createUpdateTask(this.trainingId.toString(), this.nuevaTarea, this.subirTarea, this.userId).subscribe(
      (response) => {
        // Agregar la nueva tarea a la lista de tareas del entrenamiento
        this.trainingSession.tasks.push(response.data);
        // Limpiar el formulario de nueva tarea
        this.nuevaTarea = new Task();
        // Ocultar el formulario de nueva tarea
        this.showAddTaskForm = false;
        //dejamos limpio los combos work
        this.selectedCategory = '';
        this.selectedSubcategory = '';
        this.selectedOption = '';
      },
      (error) => {
        console.error('Error al crear el equipo:', error);
      }
    );
  }

  crearEntrenamiento() {
    this.trainingSession.daySession = this.daySession;
    this.trainingSession.visible = this.toggleVisible;
    this.trainingService.createUpdateTrainingSession(this.teamId.toString(), this.trainingSession).subscribe(
      (response) => {
        this.entrenamientoCreado = true;
        this.btnCrearEntreno = false;
        this.trainingId = response.data.trainingSessionId;
      },
      (error) => {
        console.error('Error al guardar la sesión de entrenamiento:', error);
        // Aquí puedes manejar el error, si es necesario
      }
    );
  }

  crearentrenaientoPaso2() {

  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.daySession = '';
    this.showModal = false;
    this.showAddTaskForm = false;
    this.selected = '';
  }

  onSubmit(task: any) {
    let taskId = task.taskId;
    // Verifica si se ha seleccionado un archivo
    if (this.selectedFile) {
      //console.log('Imagen seleccionada:', this.selectedFile);

      // Llama al método createUpdateImgTask del servicio para subir la imagen
      this.trainingService.createUpdateImgTask(task.tasksShopId, taskId, this.selectedFile, this.userId)
        .subscribe(
          (response) => {
            // Construir el id completo de la imagen
            const imageId = 'imagen_tarea_' + taskId;

            // Obtener la imagen por su id
            const imgElement = document.getElementById(imageId) as HTMLImageElement;

            if (imgElement) {
              // Asignar la nueva URL de la imagen al atributo src
              imgElement.src = 'https://appsphairatech.com/images/task-board/' + response.data;
            } else {
              console.error('No se encontró la imagen con el id:', imageId);

              // Crear un nuevo elemento img
              const newImgElement = document.createElement('img') as HTMLImageElement;
              newImgElement.src = 'https://appsphairatech.com/images/task-board/' + response.data;
              newImgElement.alt = 'Imagen de la tarea';
              newImgElement.className = 'imgBoard';
              newImgElement.id = 'imagen_tarea_' + taskId;
              newImgElement.style.width = '-webkit-fill-available';

              // Obtener el div correspondiente y agregar el elemento img
              const divElement = document.getElementById('div_tarea_' + taskId);
              if (divElement) {
                divElement.appendChild(newImgElement);
              } else {
                console.error('No se encontró el div con el id:', 'div_tarea_' + taskId);
              }
            }
          },
          error => {
            console.error('Error al subir la imagen', error);
            // Aquí puedes manejar el error si la subida de la imagen falla
          }
        );
    } else {
      console.log('Ninguna imagen seleccionada.');
    }
  }


  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onDragOver(event: any) {
    event.preventDefault();
  }

  onDrop(event: any) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  openBoardModal() {
    this.showModalBoard = true;
  }

  cerrarBoardModal() {
    this.showModalBoard = false;
  }

  crearPartido(): void {
    this.match.matchDate = this.dayPartido;
    if (this.dayPartido != '') {
      // Lógica para crear el partido usando this.partido y enviarlo al servicio
      this.trainingService.createUpdatePartido(this.teamId.toString(), this.match).subscribe(
        (response) => {
          // Manejar la respuesta del servidor, por ejemplo, cerrar el modal si se ha creado correctamente
          if (response.data) {
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
  }

  cerrarModalPartido() {
    this.showModalPartido = false;
  }

  goBack(): void {
    this.location.back();
  }
}
