import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { TaskStorageService } from 'src/app/core/services/training/task-storage.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-tareas-catalog',
  templateUrl: './tareas-catalog.component.html',
  styleUrls: ['./tareas-catalog.component.scss']
})
export class TareasCatalogComponent implements OnInit, OnDestroy {

  teamId = 0;
  userId = 0;
  imageBaseUrl: string = environment.images + 'task-board/';

  // ── Catálogo ─────────────────────────────────────────────────────────────
  allTasks: any[] = [];
  filteredTasks: any[] = [];
  isLoading = false;
  selectedTask: any | null = null;

  // ── Filtros ───────────────────────────────────────────────────────────────
  searchText = '';
  selectedEstrategia = '';
  selectedIntencion = '';
  showAdvancedFilters = false;

  // ── Paginación ────────────────────────────────────────────────────────────
  currentPage = 0;
  readonly pageSize = 20;

  // ── Entrenamientos para "Añadir a entrenamiento" ──────────────────────────
  trainingSessions: any[] = [];
  selectedTask4Training: any | null = null;
  showTrainingModal = false;
  isAddingToTraining = false;

  // ── Listas de filtro ──────────────────────────────────────────────────────
  readonly estrategias: string[] = [
    'Amplitud', 'Anticipar', 'Apoyar', 'Basculación', 'Coberturas', 'Comunicación',
    'Conducción', 'Conservación', 'Control', 'Coordinación', 'Creación de Espacios',
    'Desdoblamiento', 'Desmarque', 'Desplazamiento', 'Dominio del Balón',
    'Entrada al Área', 'Faltas', 'Finalización', 'Fuerza', 'Juego Aéreo',
    'Mantenimiento', 'Marcaje', 'Orientar', 'Permuta', 'Presionar',
    'Primer Atacante', 'Primer Defensor', 'Profundidad', 'Progresar',
    'Proteger Portería', 'Recuperar', 'Reinicio de Juego', 'Replegar',
    'Segundo Atacante', 'Segundo Defensor', 'Temporizar', 'Tercer Atacante',
    'Tercer Defensor', 'Transición Defensiva', 'Transición Ofensiva', 'Transiciones'
  ];

  readonly intenciones: string[] = [
    'Ataque', 'Defensa', 'Transición', 'Posesión', 'Presión', 'Portero',
    'Físico', 'Estrategia a balón parado'
  ];

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    public taskStorage: TaskStorageService,
    private loginService: LoginService,
    private notificationService: NotificationService,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('tareas-catalog', true), 600);
    this.route.params.subscribe(p => {
      this.teamId = +p['teamId'];
      if (this.teamId) {
        this.loadTrainingSessions();
      }
    });

    this.subs.push(
      this.loginService.usuarioActual.subscribe(user => {
        if (user?.userId) {
          this.userId = user.userId;
          this.taskStorage.loadFromBackend(user.userId);
        }
      })
    );

    this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  goBack(): void {
    this.router.navigate(['/dashboard/tareas', this.teamId]);
  }

  // ── Carga catálogo ────────────────────────────────────────────────────────

  loadCatalog(): void {
    this.isLoading = true;
    this.trainingService.filterTaskShopByOptions({
      title: this.searchText.trim(),
      intencion: this.selectedIntencion || '-',
      estrategia: this.selectedEstrategia || '-'
    }).subscribe({
      next: (res: any) => {
        this.allTasks = res?.data || [];
        this.applyLocalFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.error('Error al cargar el catálogo', false);
      }
    });
  }

  applyLocalFilter(): void {
    const q = this.searchText.toLowerCase();
    this.filteredTasks = this.allTasks.filter(t => {
      const matchText = !q ||
        (t.slogans || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q);
      const matchEst = !this.selectedEstrategia || t.estrategia === this.selectedEstrategia;
      const matchInt = !this.selectedIntencion || t.intencion === this.selectedIntencion;
      return matchText && matchEst && matchInt;
    });
    this.currentPage = 0;
  }

  onSearchChange(): void {
    this.applyLocalFilter();
  }

  onFilterChange(): void {
    this.loadCatalog();
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedEstrategia = '';
    this.selectedIntencion = '';
    this.loadCatalog();
  }

  // ── Paginación ────────────────────────────────────────────────────────────

  get totalPages(): number {
    return Math.ceil(this.filteredTasks.length / this.pageSize);
  }

  get pagedTasks(): any[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredTasks.slice(start, start + this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 0) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) this.currentPage++;
  }

  // ── Detalle tarea ─────────────────────────────────────────────────────────

  openDetail(task: any): void {
    this.selectedTask = task;
  }

  closeDetail(): void {
    this.selectedTask = null;
  }

  getImage(task: any): string {
    return task.imagenBoard
      ? this.imageBaseUrl + task.imagenBoard
      : this.localTaskBoardBase + 'pizarra-blank.svg';
  }

  /** Ruta local de imágenes tácticas (si falla la URL del servidor) */
  readonly localTaskBoardBase = '/assets/images/task-board/';

  /** Si la imagen del servidor falla, intentar la de assets locales */
  onTaskImageError(evt: Event, task: any): void {
    const img = evt.target as HTMLImageElement;
    if (!img || img.dataset['fallbackUsed'] === '1') {
      img.src = this.localTaskBoardBase + 'pizarra-blank.svg';
      return;
    }
    if (task?.imagenBoard) {
      img.dataset['fallbackUsed'] = '1';
      img.src = this.localTaskBoardBase + task.imagenBoard;
    } else {
      img.src = this.localTaskBoardBase + 'pizarra-blank.svg';
    }
  }

  // ── Favoritos ─────────────────────────────────────────────────────────────

  isFav(task: any): boolean {
    return this.taskStorage.isFavorite({ taskId: task.taskId, tasksShopId: task.tasksShopId });
  }

  toggleFav(event: Event, task: any): void {
    event.stopPropagation();
    this.taskStorage.toggleFavorite(task, 'cloud');
  }

  // ── Añadir a entrenamiento ────────────────────────────────────────────────

  loadTrainingSessions(): void {
    this.trainingService.getTrainingSessions(String(this.teamId)).subscribe({
      next: (res: any) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.trainingSessions = (res?.data || [])
          .filter((s: any) => {
            const d = s.daySession ? new Date(s.daySession) : null;
            if (!d) return false;
            d.setHours(0, 0, 0, 0);
            return d >= today;
          })
          .sort((a: any, b: any) =>
            new Date(a.daySession).getTime() - new Date(b.daySession).getTime()
          );
      },
      error: () => {}
    });
  }

  openAddToTraining(event: Event, task: any): void {
    event.stopPropagation();
    if (!this.trainingSessions.length) {
      this.notificationService.error('No hay entrenamientos próximos disponibles', false);
      return;
    }
    this.selectedTask4Training = task;
    this.showTrainingModal = true;
  }

  closeTrainingModal(): void {
    this.showTrainingModal = false;
    this.selectedTask4Training = null;
  }

  addToTraining(session: any): void {
    if (!this.selectedTask4Training || this.isAddingToTraining) return;
    this.isAddingToTraining = true;
    this.trainingService.downloadTaskShop(
      String(session.trainingSessionId),
      this.selectedTask4Training
    ).subscribe({
      next: () => {
        this.notificationService.success('Tarea añadida al entrenamiento', false);
        this.closeTrainingModal();
        this.isAddingToTraining = false;
      },
      error: () => {
        this.notificationService.error('Error al añadir la tarea', false);
        this.isAddingToTraining = false;
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
