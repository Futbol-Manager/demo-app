import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskStorageService, StoredTask } from 'src/app/core/services/training/task-storage.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.scss']
})
export class HistorialComponent implements OnInit, OnDestroy {

  historial: StoredTask[] = [];
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
    this.sub = this.taskStorage.history$.subscribe(list => {
      this.historial = list;
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

  isFav(task: StoredTask): boolean {
    return this.taskStorage.isFavorite(task);
  }

  toggleFav(event: Event, task: StoredTask): void {
    event.stopPropagation();
    this.taskStorage.toggleFavorite(task, task.origin);
  }

  getImage(task: StoredTask): string {
    return task.imagenBoard
      ? this.imageBaseUrl + task.imagenBoard
      : 'https://appsphairatech.com/images/task-board/blank.png';
  }
}
