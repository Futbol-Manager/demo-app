import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskStorageService, StoredTask } from 'src/app/core/services/training/task-storage.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

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

  currentPage = 0;
  readonly pageSize = 20;

  get totalPages(): number {
    return Math.ceil(this.historial.length / this.pageSize);
  }

  get pagedHistorial(): StoredTask[] {
    return this.historial.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);
  }

  prevPage(): void { if (this.currentPage > 0) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.currentPage++; }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private sub!: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public taskStorage: TaskStorageService,
    private loginService: LoginService,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('tareas-historial', true), 600);

    this.route.params.subscribe(p => this.teamId = +p['teamId']);
    this.loginService.usuarioActual.subscribe(user => {
      if (user?.userId) {
        this.taskStorage.loadFromBackend(user.userId);
      }
    });
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
      : this.localTaskBoardBase + 'pizarra-blank.svg';
  }

  readonly localTaskBoardBase = '/assets/images/task-board/';

  onTaskImageError(evt: Event, task: StoredTask): void {
    const img = evt.target as HTMLImageElement;
    if (!img) return;
    if (img.getAttribute('data-fallback-used') === '1') {
      img.src = this.localTaskBoardBase + 'pizarra-blank.svg';
      return;
    }
    if (task?.imagenBoard) {
      img.setAttribute('data-fallback-used', '1');
      img.src = this.localTaskBoardBase + task.imagenBoard;
    } else {
      img.src = this.localTaskBoardBase + 'pizarra-blank.svg';
    }
  }
}
