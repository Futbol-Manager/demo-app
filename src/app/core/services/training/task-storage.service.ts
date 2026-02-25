import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TrainingService } from './training.service';

export interface StoredTask {
  localId: string;
  taskId?: number;
  tasksShopId?: number;
  coachTaskId?: number;
  origin: 'cloud' | 'training' | 'own';
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
  extraFields?: string;
  addedAt: string;
  usageCount?: number;
  lastUsedAt?: string;
}

const FAVORITES_KEY = 'sphaira_task_favorites';
const HISTORY_KEY   = 'sphaira_task_history';
const MY_TASKS_KEY  = 'sphaira_my_tasks';

@Injectable({ providedIn: 'root' })
export class TaskStorageService {

  private _favorites$ = new BehaviorSubject<StoredTask[]>(this.load(FAVORITES_KEY));
  private _history$   = new BehaviorSubject<StoredTask[]>(this.load(HISTORY_KEY));
  private _myTasks$   = new BehaviorSubject<StoredTask[]>(this.load(MY_TASKS_KEY));

  favorites$: Observable<StoredTask[]> = this._favorites$.asObservable();
  history$: Observable<StoredTask[]> = this._history$.asObservable();
  myTasks$: Observable<StoredTask[]> = this._myTasks$.asObservable();

  private userId = 0;

  constructor(private trainingService: TrainingService) {}

  setUserId(userId: number): void {
    this.userId = userId;
  }

  // ═══════════════════════════════════════════
  //   SYNC WITH BACKEND
  // ═══════════════════════════════════════════

  loadFromBackend(userId: number): void {
    this.userId = userId;

    this.trainingService.getCoachTaskHistory(userId).subscribe({
      next: (res: any) => {
        const tasks: StoredTask[] = (res?.data || []).map((t: any) => this.mapBackendTask(t, 'training'));
        this._history$.next(tasks);
        this.save(HISTORY_KEY, tasks);
      },
      error: () => {}
    });

    this.trainingService.getCoachTaskFavorites(userId).subscribe({
      next: (res: any) => {
        const backendTasks: StoredTask[] = (res?.data || []).map((t: any) => this.mapBackendTask(t, 'training'));
        const localList = this._favorites$.getValue();
        // Conservar favoritos locales que no están en el backend (p.ej. tasksShopId sin taskId)
        const localOnly = localList.filter(local =>
          !backendTasks.some(b =>
            (local.taskId && b.taskId === local.taskId) ||
            (local.tasksShopId && b.tasksShopId === local.tasksShopId)
          )
        );
        const merged = [...backendTasks, ...localOnly];
        this._favorites$.next(merged);
        this.save(FAVORITES_KEY, merged);
      },
      error: () => {}
    });

    this.trainingService.getCoachOwnTasks(userId).subscribe({
      next: (res: any) => {
        const tasks: StoredTask[] = (res?.data || []).map((t: any) => ({
          localId: 'ct_' + (t.coachTaskId || this.uid()),
          coachTaskId: t.coachTaskId,
          origin: 'own' as const,
          slogans: t.slogans || '',
          description: t.description || '',
          rules: t.rules || '',
          variants: t.variants || '',
          worktime: t.worktime || '',
          space: t.space || '',
          material: t.material || '',
          work: t.work || '',
          video: t.video || '',
          estrategia: t.estrategia || '',
          intencion: t.intencion || '',
          imagenBoard: t.imagenBoard || '',
          extraFields: t.extraFields || '',
          addedAt: t.fecCreate || new Date().toISOString(),
        }));
        this._myTasks$.next(tasks);
        this.save(MY_TASKS_KEY, tasks);
      },
      error: () => {}
    });
  }

  private mapBackendTask(t: any, origin: 'cloud' | 'training'): StoredTask {
    return {
      localId: 'task_' + (t.taskId || this.uid()),
      taskId: t.taskId || undefined,
      tasksShopId: t.tasksShopId || undefined,
      origin,
      slogans: t.slogans || '',
      description: t.description || '',
      rules: t.rules || '',
      variants: t.variants || '',
      worktime: t.worktime || '',
      space: t.space || '',
      material: t.material || '',
      work: t.work || '',
      video: t.video || '',
      estrategia: t.estrategia || '',
      intencion: t.intencion || '',
      imagenBoard: t.imagenBoard || '',
      addedAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════
  //   FAVORITAS
  // ═══════════════════════════════════════════

  isFavorite(task: { localId?: string; tasksShopId?: number; taskId?: number }): boolean {
    const list = this._favorites$.getValue();
    return list.some(f =>
      (task.localId && f.localId === task.localId) ||
      (task.tasksShopId && f.tasksShopId === task.tasksShopId) ||
      (task.taskId && f.taskId === task.taskId)
    );
  }

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
      if (task.taskId && this.userId) {
        this.trainingService.removeFavoriteTask(this.userId, task.taskId).subscribe();
      }
      return false;
    }

    const stored = this.mapToStored(task, origin);
    list.unshift(stored);
    this.save(FAVORITES_KEY, list);
    this._favorites$.next([...list]);
    if (task.taskId && this.userId) {
      this.trainingService.addFavoriteTask(this.userId, task.taskId).subscribe();
    }
    return true;
  }

  removeFavorite(localId: string): void {
    const fav = this._favorites$.getValue().find(f => f.localId === localId);
    const list = this._favorites$.getValue().filter(f => f.localId !== localId);
    this.save(FAVORITES_KEY, list);
    this._favorites$.next(list);
    if (fav?.taskId && this.userId) {
      this.trainingService.removeFavoriteTask(this.userId, fav.taskId).subscribe();
    }
  }

  // ═══════════════════════════════════════════
  //   HISTORIAL DE USADAS
  // ═══════════════════════════════════════════

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

  // ═══════════════════════════════════════════
  //   MIS TAREAS
  // ═══════════════════════════════════════════

  addMyTask(task: Partial<StoredTask>): StoredTask {
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
      extraFields: task.extraFields || '',
      addedAt: new Date().toISOString(),
    };

    if (this.userId) {
      this.trainingService.createCoachTask({
        userId: this.userId,
        slogans: stored.slogans,
        description: stored.description,
        rules: stored.rules,
        variants: stored.variants,
        worktime: stored.worktime,
        space: stored.space,
        material: stored.material,
        work: stored.work,
        video: stored.video,
        estrategia: stored.estrategia,
        intencion: stored.intencion,
        imagenBoard: stored.imagenBoard,
        extraFields: stored.extraFields || '',
      }).subscribe({
        next: (res: any) => {
          if (res?.data?.coachTaskId) {
            stored.coachTaskId = res.data.coachTaskId;
            stored.localId = 'ct_' + res.data.coachTaskId;
            const list = this._myTasks$.getValue();
            this.save(MY_TASKS_KEY, list);
            this._myTasks$.next([...list]);
          }
        }
      });
    }

    const list = this._myTasks$.getValue();
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
      if (task.coachTaskId && this.userId) {
        this.trainingService.updateCoachTask({
          coachTaskId: task.coachTaskId,
          userId: this.userId,
          slogans: task.slogans,
          description: task.description,
          rules: task.rules,
          variants: task.variants,
          worktime: task.worktime,
          space: task.space,
          material: task.material,
          work: task.work,
          video: task.video,
          estrategia: task.estrategia,
          intencion: task.intencion,
          imagenBoard: task.imagenBoard,
        }).subscribe();
      }
    }
  }

  deleteMyTask(localId: string): void {
    const task = this._myTasks$.getValue().find(t => t.localId === localId);
    const list = this._myTasks$.getValue().filter(t => t.localId !== localId);
    this.save(MY_TASKS_KEY, list);
    this._myTasks$.next(list);
    this.removeFavorite(localId);
    if (task?.coachTaskId && this.userId) {
      this.trainingService.deleteCoachTask(task.coachTaskId, this.userId).subscribe();
    }
  }

  getMyTask(localId: string): StoredTask | undefined {
    return this._myTasks$.getValue().find(t => t.localId === localId);
  }

  addMyTaskFromBackend(coachTaskData: any): void {
    const already = this._myTasks$.getValue().some(t => t.coachTaskId === coachTaskData.coachTaskId);
    if (already) return;
    const task: StoredTask = {
      localId: 'ct_' + coachTaskData.coachTaskId,
      coachTaskId: coachTaskData.coachTaskId,
      origin: 'own',
      slogans: coachTaskData.slogans || '',
      description: coachTaskData.description || '',
      rules: coachTaskData.rules || '',
      variants: coachTaskData.variants || '',
      worktime: coachTaskData.worktime || '',
      space: coachTaskData.space || '',
      material: coachTaskData.material || '',
      work: coachTaskData.work || '',
      video: coachTaskData.video || '',
      estrategia: coachTaskData.estrategia || '',
      intencion: coachTaskData.intencion || '',
      imagenBoard: coachTaskData.imagenBoard || '',
      extraFields: coachTaskData.extraFields || '',
      addedAt: coachTaskData.fecCreate || new Date().toISOString(),
    };
    const list = this._myTasks$.getValue();
    list.unshift(task);
    this.save(MY_TASKS_KEY, list);
    this._myTasks$.next([...list]);
  }

  // ═══════════════════════════════════════════
  //   UTILIDADES INTERNAS
  // ═══════════════════════════════════════════

  private mapToStored(task: any, origin: 'cloud' | 'training' | 'own'): StoredTask {
    return {
      localId: task.localId || this.uid(),
      taskId: task.taskId || undefined,
      tasksShopId: task.tasksShopId || undefined,
      coachTaskId: task.coachTaskId || undefined,
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
