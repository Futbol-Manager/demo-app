import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskStorageService, StoredTask } from 'src/app/core/services/training/task-storage.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

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

  currentPage = 0;
  readonly pageSize = 20;

  get totalPages(): number {
    return Math.ceil(this.favoritas.length / this.pageSize);
  }

  get pagedFavoritas(): StoredTask[] {
    return this.favoritas.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);
  }

  prevPage(): void { if (this.currentPage > 0) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.currentPage++; }

  private sub!: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public taskStorage: TaskStorageService,
    private loginService: LoginService,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('tareas-favoritas', true), 600);

    this.route.params.subscribe(p => this.teamId = +p['teamId']);
    this.loginService.usuarioActual.subscribe(user => {
      if (user?.userId) {
        this.taskStorage.loadFromBackend(user.userId);
      }
    });
    this.sub = this.taskStorage.favorites$.subscribe(list => {
      this.favoritas = list;
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
