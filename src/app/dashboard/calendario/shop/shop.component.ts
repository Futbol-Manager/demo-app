import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TrainingService } from 'src/app/core/services/training/training.service';

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
  downloadTask : boolean = false;

  constructor(
    private trainingService: TrainingService,
  ) { }

  ngOnInit(): void {
    this.downloadTask = false;
  }

  seleccionarTarea(tarea: any) {
    this.selectedTask = tarea;
    this.downloadTask = true;
  }

  descargarTarea(tarea: any){
    this.trainingService.downloadTaskShop(this.trainingId.toString(), tarea).subscribe(
      (response) => {
        if(response){
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

}
