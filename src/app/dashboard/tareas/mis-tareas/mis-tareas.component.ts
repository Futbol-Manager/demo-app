import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskStorageService, StoredTask } from 'src/app/core/services/training/task-storage.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-mis-tareas',
  templateUrl: './mis-tareas.component.html',
  styleUrls: ['./mis-tareas.component.scss']
})
export class MisTareasComponent implements OnInit, OnDestroy {

  misTareas: StoredTask[] = [];
  selectedTask: StoredTask | null = null;
  teamId = 0;
  imageBaseUrl: string = environment.images + 'task-board/';

  /* ─── Formulario crear / editar ─── */
  showForm = false;
  editingId: string | null = null; // null = crear, string = editar
  form: Partial<StoredTask> = this.emptyForm();

  /* ─── Estrategias e intenciones (mismas que Shop) ─── */
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

  private sub!: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public taskStorage: TaskStorageService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(p => this.teamId = +p['teamId']);
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

  /* ─── CREAR / EDITAR ─── */
  openCreate(): void {
    this.form = this.emptyForm();
    this.editingId = null;
    this.showForm = true;
  }

  openEdit(task: StoredTask): void {
    this.form = { ...task };
    this.editingId = task.localId;
    this.showForm = true;
    this.selectedTask = null;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  saveForm(): void {
    if (this.editingId) {
      this.taskStorage.updateMyTask(this.editingId, this.form);
    } else {
      this.taskStorage.addMyTask(this.form);
    }
    this.showForm = false;
    this.editingId = null;
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
      : 'https://appsphairatech.com/images/task-board/blank.png';
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
