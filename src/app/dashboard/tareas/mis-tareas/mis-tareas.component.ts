import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskStorageService, StoredTask } from 'src/app/core/services/training/task-storage.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

@Component({
  selector: 'app-mis-tareas',
  templateUrl: './mis-tareas.component.html',
  styleUrls: ['./mis-tareas.component.scss']
})
export class MisTareasComponent implements OnInit, OnDestroy {

  misTareas: StoredTask[] = [];
  selectedTask: StoredTask | null = null;
  teamId = 0;
  userId = 0;
  imageBaseUrl: string = environment.images + 'task-board/';

  showForm = false;
  editingId: string | null = null;
  form: Partial<StoredTask> = this.emptyForm();

  /** Imagen/GIF desde la pizarra (archivo local antes de subir) */
  pizarraFile: File | null = null;
  pizarraPreviewUrl: string | null = null;
  mostrarPizarra = false;
  savingForm = false;
  saveFormError = '';

  estrategias: string[] = [
    'Acciones a Balón Parado', 'Acciones Combinadas', 'Circuito', 'Conservación',
    'Juego Adaptado al Fútbol', 'Juego de Posición', 'Juego de Posición Específico',
    'Oleadas', 'Partidos', 'Posesión', 'Rueda de Pases', 'Situaciones Reducidas',
    'Trabajo de Líneas'
  ];

  intenciones: string[] = [
    '1 vs 1', '2 vs 1', '2 vs 2', '3 vs 3', '4 vs 4',
    'ABP Defensiva', 'ABP Ofensiva', 'Amplitud', 'Apoyos',
    'Ataque Organizado', 'Ataque-Defensa', 'Cobertura', 'Conservar',
    'Contraataque', 'Defensa Inicio de Juego', 'Defensa de Juego Directo',
    'Defensa Organizada', 'Desmarques', 'Dividir', 'Evitar Progresión',
    'Fase Defensiva', 'Fase Ofensiva', 'Fijar', 'Finalizar',
    'Inicio de Juego', 'Juego Directo', 'Mantener', 'Marcaje',
    'Orientar', 'Permuta', 'Presionar', 'Primer Atacante',
    'Primer Defensor', 'Profundidad', 'Progresar', 'Proteger Portería',
    'Recuperar', 'Reinicio de Juego', 'Replegar', 'Segundo Atacante',
    'Segundo Defensor', 'Temporizar', 'Tercer Atacante', 'Tercer Defensor',
    'Transición Defensiva', 'Transición Ofensiva', 'Transiciones'
  ];

  /* ─── Confirmación eliminar ─── */
  showDeleteConfirm = false;
  deleteTarget: StoredTask | null = null;

  /* ─── Paginación ─── */
  currentPage = 0;
  readonly pageSize = 20;

  get totalPages(): number {
    return Math.ceil(this.misTareas.length / this.pageSize);
  }

  get pagedMisTareas(): StoredTask[] {
    return this.misTareas.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);
  }

  prevPage(): void { if (this.currentPage > 0) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.currentPage++; }

  private sub!: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public taskStorage: TaskStorageService,
    private loginService: LoginService,
    private trainingService: TrainingService,
    private sanitizer: DomSanitizer,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('tareas-mis', true), 600);

    this.route.params.subscribe(p => this.teamId = +p['teamId']);
    this.loginService.usuarioActual.subscribe(user => {
      if (user?.userId) {
        this.userId = user.userId;
        this.taskStorage.loadFromBackend(user.userId);
      }
    });
    this.sub = this.taskStorage.myTasks$.subscribe(list => {
      this.misTareas = list;
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

  /* ─── DETALLE ─── */
  openDetail(task: StoredTask): void {
    if (!this.showForm) {
      this.selectedTask = task;
    }
  }

  closeDetail(): void {
    this.selectedTask = null;
  }

  /* ─── CREAR / EDITAR (modal) ─── */
  openCreate(): void {
    this.form = this.emptyForm();
    this.editingId = null;
    this.clearPizarraAttachment();
    this.saveFormError = '';
    this.showForm = true;
  }

  openEdit(task: StoredTask): void {
    this.form = { ...task };
    this.editingId = task.localId;
    this.clearPizarraAttachment();
    this.saveFormError = '';
    this.showForm = true;
    this.selectedTask = null;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.clearPizarraAttachment();
    this.saveFormError = '';
  }

  /** Preview URL: pizarra recién añadida (sanitizada) o imagen existente de la tarea */
  get formImageUrl(): SafeUrl | string | null {
    if (this.pizarraPreviewUrl) {
      return this.sanitizer.bypassSecurityTrustUrl(this.pizarraPreviewUrl);
    }
    if (this.form.imagenBoard) return this.imageBaseUrl + this.form.imagenBoard;
    return null;
  }

  abrirPizarra(): void {
    this.mostrarPizarra = true;
  }

  cerrarPizarra(): void {
    this.mostrarPizarra = false;
  }

  /** Cuando el usuario guarda la imagen en la pizarra (modo crear, sin taskId) */
  onPizarraArchivoGenerado(file: File): void {
    if (this.pizarraPreviewUrl) URL.revokeObjectURL(this.pizarraPreviewUrl);
    this.pizarraFile = file;
    this.pizarraPreviewUrl = URL.createObjectURL(file);
    this.mostrarPizarra = false;
  }

  /** Quitar imagen (pizarra recién añadida o referencia; deja la tarea sin imagen) */
  quitarImagenPizarra(): void {
    this.clearPizarraAttachment();
    this.form = { ...this.form, imagenBoard: '' };
  }

  private clearPizarraAttachment(): void {
    if (this.pizarraPreviewUrl) {
      URL.revokeObjectURL(this.pizarraPreviewUrl);
    }
    this.pizarraFile = null;
    this.pizarraPreviewUrl = null;
  }

  saveForm(): void {
    if (!this.form.slogans?.trim()) return;
    this.saveFormError = '';
    this.savingForm = true;

    const doSave = (imagenBoard?: string) => {
      if (imagenBoard !== undefined) this.form.imagenBoard = imagenBoard;
      if (this.editingId) {
        this.taskStorage.updateMyTask(this.editingId, this.form);
      } else {
        this.taskStorage.addMyTask(this.form);
      }
      this.clearPizarraAttachment();
      this.showForm = false;
      this.editingId = null;
      this.savingForm = false;
    };

    if (this.pizarraFile && this.userId) {
      const coachTaskId = this.editingId
        ? (this.misTareas.find(t => t.localId === this.editingId)?.coachTaskId ?? 0)
        : 0;
      this.trainingService.uploadCoachTaskImage(coachTaskId, this.userId, this.pizarraFile).subscribe({
        next: (resp) => {
          const filename = resp?.data as string | undefined;
          doSave(filename || this.form.imagenBoard || '');
        },
        error: () => {
          this.saveFormError = 'Error al subir la imagen de la pizarra.';
          this.savingForm = false;
        }
      });
    } else {
      doSave();
    }
  }

  /* ─── ELIMINAR ─── */
  confirmDelete(task: StoredTask): void {
    this.deleteTarget = task;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteTarget = null;
  }

  doDelete(): void {
    if (this.deleteTarget) {
      this.taskStorage.deleteMyTask(this.deleteTarget.localId);
      this.selectedTask = null;
    }
    this.showDeleteConfirm = false;
    this.deleteTarget = null;
  }

  /* ─── FAVORITA ─── */
  isFav(task: StoredTask): boolean {
    return this.taskStorage.isFavorite(task);
  }

  toggleFav(event: Event, task: StoredTask): void {
    event.stopPropagation();
    this.taskStorage.toggleFavorite(task, 'own');
  }

  /* ─── UTILIDADES ─── */
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

  /** Marca la imagen como vertical y aplica escala para rotarla a horizontal sin zoom. */
  onTaskImageLoad(event: Event, task: StoredTask): void {
    const img = event.target as HTMLImageElement;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh || nh <= nw) return;
    const container = img.closest('.task-thumb, .detail-image-wrap') as HTMLElement;
    if (!container) return;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    if (!cw || !ch) return;
    const scale = Math.min(cw / nh, ch / nw);
    img.classList.add('img-vertical');
    img.style.setProperty('--rotate-scale', String(scale));
  }

  onDetailImageLoad(event: Event): void {
    if (this.selectedTask) this.onTaskImageLoad(event, this.selectedTask);
  }

  parseExtraFields(raw: string | undefined): { name: string; value: string }[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private emptyForm(): Partial<StoredTask> {
    return {
      slogans: '',
      description: '',
      rules: '',
      variants: '',
      worktime: '',
      space: '',
      material: '',
      work: '',
      video: '',
      estrategia: '',
      intencion: '',
      imagenBoard: '',
    };
  }
}
