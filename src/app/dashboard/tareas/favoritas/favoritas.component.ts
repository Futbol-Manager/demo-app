import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskStorageService, StoredTask } from 'src/app/core/services/training/task-storage.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-favoritas',
  templateUrl: './favoritas.component.html',
  styleUrls: ['./favoritas.component.scss']
})
export class FavoritasComponent implements OnInit, OnDestroy {

  favoritas: StoredTask[] = [];
  selectedTask: StoredTask | null = null;
  teamId = 0;
  imageBaseUrl: string = environment.images + 'task-board/';

  private sub!: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public taskStorage: TaskStorageService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(p => this.teamId = +p['teamId']);
    this.sub = this.taskStorage.favorites$.subscribe(list => {
      this.favoritas = list;
      // Si la tarea seleccionada fue eliminada, cerrar detalle
      if (this.selectedTask && !list.find(t => t.localId === this.selectedTask!.localId)) {
        this.selectedTask = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['/dashboard/tareas', this.teamId]);
  }

  openDetail(task: StoredTask): void {
    this.selectedTask = task;
  }

  closeDetail(): void {
    this.selectedTask = null;
  }

  removeFavorite(task: StoredTask): void {
    this.taskStorage.removeFavorite(task.localId);
    this.selectedTask = null;
  }

  getImage(task: StoredTask): string {
    return task.imagenBoard
      ? this.imageBaseUrl + task.imagenBoard
      : 'https://appsphairatech.com/images/task-board/blank.png';
  }
}
