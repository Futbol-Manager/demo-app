import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

/**
 * Interfaz para una tarea almacenada localmente (favorita, historial, propia).
 * Extiende los campos del modelo Task / TaskShop del backend.
 */
export interface StoredTask {
  /** ID local (generado). Para tareas propias se usa como PK */
  localId: string;
  /** taskId del backend (si proviene de un entrenamiento) */
  taskId?: number;
  /** tasksShopId del backend (si proviene de la nube) */
  tasksShopId?: number;
  /** Origen: 'cloud' = nube, 'training' = entrenamiento, 'own' = propia */
  origin: 'cloud' | 'training' | 'own';

  /* ─── Campos de tarea ─── */
  slogans: string;
  description: string;
  rules: string;
  variants: string;
  worktime: string;
  space: string;
  material: string;
  work: string;
  video: string;
  estrategia: string;
  intencion: string;
  imagenBoard: string;

  /* ─── Metadatos ─── */
  /** Fecha en que se marcó como favorita o se añadió al historial */
  addedAt: string;
  /** Número de veces usada (historial) */
  usageCount?: number;
  /** Última fecha de uso */
  lastUsedAt?: string;
}

const FAVORITES_KEY = 'sphaira_task_favorites';
const HISTORY_KEY   = 'sphaira_task_history';
const MY_TASKS_KEY  = 'sphaira_my_tasks';

@Injectable({ providedIn: 'root' })
export class TaskStorageService {

  /* ─── Subjects ─── */
  private _favorites$ = new BehaviorSubject<StoredTask[]>(this.load(FAVORITES_KEY));
  private _history$   = new BehaviorSubject<StoredTask[]>(this.load(HISTORY_KEY));
  private _myTasks$   = new BehaviorSubject<StoredTask[]>(this.load(MY_TASKS_KEY));

  /** Observable de favoritas */
  favorites$: Observable<StoredTask[]> = this._favorites$.asObservable();
  /** Observable de historial */
  history$: Observable<StoredTask[]> = this._history$.asObservable();
  /** Observable de mis tareas */
  myTasks$: Observable<StoredTask[]> = this._myTasks$.asObservable();

  /* ═══════════════════════════════════════════
     FAVORITAS
  ═══════════════════════════════════════════ */

  /** ¿Es favorita? (por localId o por tasksShopId) */
  isFavorite(task: { localId?: string; tasksShopId?: number; taskId?: number }): boolean {
    const list = this._favorites$.getValue();
    return list.some(f =>
      (task.localId && f.localId === task.localId) ||
      (task.tasksShopId && f.tasksShopId === task.tasksShopId) ||
      (task.taskId && f.taskId === task.taskId)
    );
  }

  /** Marcar / desmarcar favorita. Devuelve el nuevo estado. */
  toggleFavorite(task: any, origin: 'cloud' | 'training' | 'own'): boolean {
    const list = this._favorites$.getValue();
    const idx = list.findIndex(f =>
      (task.localId && f.localId === task.localId) ||
      (task.tasksShopId && f.tasksShopId === task.tasksShopId) ||
      (task.taskId && f.taskId === task.taskId)
    );

    if (idx >= 0) {
      list.splice(idx, 1);
      this.save(FAVORITES_KEY, list);
      this._favorites$.next([...list]);
      return false; // ya no es favorita
    }

    const stored = this.mapToStored(task, origin);
    list.unshift(stored);
    this.save(FAVORITES_KEY, list);
    this._favorites$.next([...list]);
    return true; // ahora es favorita
  }

  removeFavorite(localId: string): void {
    const list = this._favorites$.getValue().filter(f => f.localId !== localId);
    this.save(FAVORITES_KEY, list);
    this._favorites$.next(list);
  }

  /* ═══════════════════════════════════════════
     HISTORIAL DE USADAS
  ═══════════════════════════════════════════ */

  /** Registrar uso de una tarea (se llama al añadir a entrenamiento) */
  registerUsage(task: any, origin: 'cloud' | 'training' | 'own'): void {
    const list = this._history$.getValue();
    const existing = list.find(h =>
      (task.localId && h.localId === task.localId) ||
      (task.tasksShopId && h.tasksShopId === task.tasksShopId) ||
      (task.taskId && h.taskId === task.taskId)
    );

    if (existing) {
      existing.usageCount = (existing.usageCount || 1) + 1;
      existing.lastUsedAt = new Date().toISOString();
    } else {
      const stored = this.mapToStored(task, origin);
      stored.usageCount = 1;
      stored.lastUsedAt = new Date().toISOString();
      list.unshift(stored);
    }
    this.save(HISTORY_KEY, list);
    this._history$.next([...list]);
  }

  /* ═══════════════════════════════════════════
     MIS TAREAS
  ═══════════════════════════════════════════ */

  addMyTask(task: Partial<StoredTask>): StoredTask {
    const list = this._myTasks$.getValue();
    const stored: StoredTask = {
      localId: this.uid(),
      origin: 'own',
      slogans: task.slogans || '',
      description: task.description || '',
      rules: task.rules || '',
      variants: task.variants || '',
      worktime: task.worktime || '',
      space: task.space || '',
      material: task.material || '',
      work: task.work || '',
      video: task.video || '',
      estrategia: task.estrategia || '',
      intencion: task.intencion || '',
      imagenBoard: task.imagenBoard || '',
      addedAt: new Date().toISOString(),
    };
    list.unshift(stored);
    this.save(MY_TASKS_KEY, list);
    this._myTasks$.next([...list]);
    return stored;
  }

  updateMyTask(localId: string, changes: Partial<StoredTask>): void {
    const list = this._myTasks$.getValue();
    const task = list.find(t => t.localId === localId);
    if (task) {
      Object.assign(task, changes);
      this.save(MY_TASKS_KEY, list);
      this._myTasks$.next([...list]);
    }
  }

  deleteMyTask(localId: string): void {
    const list = this._myTasks$.getValue().filter(t => t.localId !== localId);
    this.save(MY_TASKS_KEY, list);
    this._myTasks$.next(list);
    // También quitar de favoritas si estaba
    this.removeFavorite(localId);
  }

  getMyTask(localId: string): StoredTask | undefined {
    return this._myTasks$.getValue().find(t => t.localId === localId);
  }

  /* ═══════════════════════════════════════════
     UTILIDADES INTERNAS
  ═══════════════════════════════════════════ */

  private mapToStored(task: any, origin: 'cloud' | 'training' | 'own'): StoredTask {
    return {
      localId: task.localId || this.uid(),
      taskId: task.taskId || undefined,
      tasksShopId: task.tasksShopId || undefined,
      origin,
      slogans: task.slogans || '',
      description: task.description || '',
      rules: task.rules || '',
      variants: task.variants || '',
      worktime: task.worktime || '',
      space: task.space || '',
      material: task.material || '',
      work: task.work || '',
      video: task.video || '',
      estrategia: task.estrategia || '',
      intencion: task.intencion || '',
      imagenBoard: task.imagenBoard || '',
      addedAt: new Date().toISOString(),
    };
  }

  private load(key: string): StoredTask[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(key: string, data: StoredTask[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }
}
