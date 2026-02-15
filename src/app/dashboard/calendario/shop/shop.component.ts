import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { TaskStorageService } from 'src/app/core/services/training/task-storage.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  
  @Input() trainingId: number = 0;
  @Output() tareaDescargada: EventEmitter<any> = new EventEmitter<any>();
  taskList: any[] = [];
  selectedTask: any;
  downloadTask: boolean = false;

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
    'Transición Defensiva','Transición Ofensiva','Transiciones',
  ];

  estrategia = "-";
  intencion = '-';
  textSearch = '';
  imageBaseUrlTask: string = environment.images + 'task-board/';

  constructor(
    private trainingService: TrainingService,
    public taskStorage: TaskStorageService,
  ) { }

  ngOnInit(): void {
    this.downloadTask = false;
  }

  seleccionarTarea(tarea: any) {
    this.selectedTask = tarea;
    this.downloadTask = true;
  }

  descargarTarea(tarea: any) {
    this.trainingService.downloadTaskShop(this.trainingId.toString(), tarea).subscribe(
      (response) => {
        if (response) {
          // Registrar en historial de tareas usadas
          this.taskStorage.registerUsage(tarea, 'cloud');
          this.tareaDescargada.emit(true);
        }
      },
      (error) => {
        console.error('Error al descargar la tarea:', error);
      }
    );
  }

  onTipoTrabajoSeleccionado(event: any): void {
    const valorSeleccionado: string = event.target.value;
    this.trainingService.filterTaskShopByWork(valorSeleccionado).subscribe(
      (response: any) => {
        this.taskList = response.data;
      },
      (error) => {
        console.error('Error al cargar el listado de tareas', error);
      }
    );
  }

  filterSearch() {
    /*console.log('estrategia: ' + this.estrategia)
    console.log('intencion: ' + this.intencion)
    console.log('textSearch: ' + this.textSearch)*/

    let body = {
      title: this.textSearch,
      estrategia: this.estrategia,
      intencion: this.intencion
    };

    this.trainingService.filterTaskShopByOptions(body).subscribe(
      (response: any) => {
        this.taskList = response.data;
      },
      (error) => {
        console.error('Error al cargar el listado de tareas', error);
      }
    );
  }

  clearSearch() {
    this.estrategia = '-';
    this.intencion = '-';
    this.textSearch = '';
  }

  /** Comprueba si una tarea de la nube es favorita */
  isFav(tarea: any): boolean {
    return this.taskStorage.isFavorite({ tasksShopId: tarea.tasksShopId });
  }

  /** Marca/desmarca favorita y registra uso en historial */
  toggleFav(event: Event, tarea: any): void {
    event.stopPropagation();
    this.taskStorage.toggleFavorite(tarea, 'cloud');
  }

}
