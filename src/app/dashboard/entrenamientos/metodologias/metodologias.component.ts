import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { Response } from 'src/app/core/services/models/response.model';
import { getSeasons, getSelectedSeasonLabel } from 'src/app/core/utils/season.utils';
import { SeasonStateService } from 'src/app/core/services/season/season-state.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { ClubTask, ClubTaskService } from 'src/app/core/services/training/club-task.service';
import {
  Methodology,
  MethodologyService,
  MethodologyTask,
  MethodologyTeam,
} from 'src/app/core/services/training/methodology.service';
import { MethodologyTrainingsComponent } from './methodology-trainings/methodology-trainings.component';
import { ClubTaskFormComponent } from '../../entrenamientos-club/club-task-form/club-task-form.component';

interface TeamCombo {
  teamId: number;
  name: string;
}

/**
 * Entrenamientos (Club) — Fase 2: "Metodologías".
 *
 * <p>Lista de metodologías de la temporada actual + detalle con dos pestañas:
 * "Tareas" (asignar/quitar tareas de la nube o del club) y "Equipos" (asignar
 * la metodología a los equipos del club).
 */
@Component({
  selector: 'app-metodologias',
  templateUrl: './metodologias.component.html',
  styleUrls: ['./metodologias.component.scss'],
})
export class MetodologiasComponent implements OnInit, OnDestroy {

  clubId = 0;
  temporada = '';
  temporadaLabel = '';
  loading = false;
  saving = false;
  error = '';

  methodologies: Methodology[] = [];

  // Crear / editar metodología
  showForm = false;
  editingId: number | null = null;
  form: Methodology = {};

  // Duplicar metodología a otra temporada
  showCloneModal = false;
  cloneSource: Methodology | null = null;
  cloneSeason = '';
  cloning = false;
  seasons: { value: string; label: string }[] = [];

  private seasonSub?: Subscription;

  // Detalle
  selected: Methodology | null = null;
  detailTab: 'tasks' | 'teams' | 'trainings' = 'tasks';
  assignedTasks: MethodologyTask[] = [];
  assignedTeams: MethodologyTeam[] = [];
  detailLoading = false;

  // Selector de tareas
  showTaskPicker = false;
  pickerSource: 'CLOUD' | 'CLUB' = 'CLUB';
  pickerLoading = false;
  pickerSearch = '';
  cloudTasks: any[] = [];
  clubTasks: ClubTask[] = [];

  // Crear una tarea del club desde el propio selector
  showClubTaskForm = false;

  // Preview ampliada de una tarea (selector o ya asignada)
  previewTask: any = null;
  previewSource: 'CLOUD' | 'CLUB' = 'CLUB';
  previewMode: 'picker' | 'assigned' = 'picker';

  // Equipos
  teamsCombo: TeamCombo[] = [];
  selectedTeamIds = new Set<number>();
  teamsLoading = false;
  teamsSaved = false;

  constructor(
    private route: ActivatedRoute,
    private methodologyService: MethodologyService,
    private clubTaskService: ClubTaskService,
    private trainingService: TrainingService,
    private teamService: TeamService,
    private translate: TranslateService,
    private seasonState: SeasonStateService,
  ) {}

  ngOnInit(): void {
    this.clubId = Number(this.route.snapshot.paramMap.get('clubId')) || 0;
    this.seasons = getSeasons();
    // Reactivo al cambio de temporada global: si el usuario cambia el chip de
    // temporada estando en esta pantalla, recargamos las metodologías de la
    // nueva temporada (y las nuevas se crean ya en la temporada vigente).
    this.seasonSub = this.seasonState.season$.subscribe((season) => {
      this.temporada = season || '';
      this.temporadaLabel = getSelectedSeasonLabel();
      this.back();
      this.loadMethodologies();
    });
  }

  ngOnDestroy(): void {
    this.seasonSub?.unsubscribe();
  }

  // ----------------------------------------------------------------- Lista

  loadMethodologies(): void {
    if (!this.clubId) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.methodologyService.list(this.clubId, this.temporada).subscribe({
      next: (res: Response) => {
        this.methodologies = res?.status === 200 && Array.isArray(res.data) ? (res.data as Methodology[]) : [];
        this.loading = false;
      },
      error: () => {
        this.error = 'ENTRENAMIENTOS.METH_ERROR_LOAD';
        this.loading = false;
      },
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = {};
    this.error = '';
    this.showForm = true;
  }

  openEdit(m: Methodology): void {
    this.editingId = m.methodologyId ?? null;
    this.form = { name: m.name, description: m.description };
    this.error = '';
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.form = {};
    this.editingId = null;
  }

  saveMethodology(): void {
    if (!this.form.name || !this.form.name.trim()) {
      this.error = 'ENTRENAMIENTOS.METH_NAME_REQUIRED';
      return;
    }
    this.saving = true;
    this.error = '';
    const obs = this.editingId
      ? this.methodologyService.update(this.clubId, this.editingId, this.form)
      : this.methodologyService.create(this.clubId, this.temporada, this.form);
    obs.subscribe({
      next: (res: Response) => {
        this.saving = false;
        if (res?.status === 200) {
          this.cancelForm();
          this.loadMethodologies();
        } else {
          this.error = 'ENTRENAMIENTOS.METH_ERROR_SAVE';
        }
      },
      error: () => {
        this.saving = false;
        this.error = 'ENTRENAMIENTOS.METH_ERROR_SAVE';
      },
    });
  }

  deleteMethodology(m: Methodology): void {
    if (!m.methodologyId) {
      return;
    }
    const msg = this.translate.instant('ENTRENAMIENTOS.METH_CONFIRM_DELETE');
    if (!window.confirm(msg)) {
      return;
    }
    this.methodologyService.remove(this.clubId, m.methodologyId).subscribe({
      next: (res: Response) => {
        if (res?.status === 200) {
          if (this.selected?.methodologyId === m.methodologyId) {
            this.back();
          }
          this.loadMethodologies();
        } else {
          this.error = 'ENTRENAMIENTOS.METH_ERROR_DELETE';
        }
      },
      error: () => {
        this.error = 'ENTRENAMIENTOS.METH_ERROR_DELETE';
      },
    });
  }

  // ------------------------------------------------ Duplicar a temporada

  openClone(m: Methodology): void {
    this.cloneSource = m;
    // Por defecto, la primera temporada distinta a la actual; si solo hay una,
    // la propia (el backend añadirá el sufijo "(copia)").
    const other = this.seasons.find((s) => s.value !== this.temporada);
    this.cloneSeason = other ? other.value : (this.seasons[0]?.value ?? this.temporada);
    this.error = '';
    this.showCloneModal = true;
  }

  cancelClone(): void {
    this.showCloneModal = false;
    this.cloneSource = null;
    this.cloning = false;
  }

  doClone(): void {
    if (!this.cloneSource?.methodologyId || !this.cloneSeason) {
      return;
    }
    this.cloning = true;
    this.error = '';
    this.methodologyService.cloneToSeason(this.clubId, this.cloneSource.methodologyId, this.cloneSeason).subscribe({
      next: (res: Response) => {
        this.cloning = false;
        if (res?.status === 200) {
          const target = this.cloneSeason;
          this.cancelClone();
          // Si se clonó a la temporada que se está viendo, recargar la lista.
          if (target === this.temporada) {
            this.loadMethodologies();
          }
        } else {
          this.error = 'ENTRENAMIENTOS.METH_ERROR_CLONE';
        }
      },
      error: () => {
        this.cloning = false;
        this.error = 'ENTRENAMIENTOS.METH_ERROR_CLONE';
      },
    });
  }

  // --------------------------------------------------------------- Detalle

  open(m: Methodology): void {
    this.selected = m;
    this.detailTab = 'tasks';
    this.showTaskPicker = false;
    this.error = '';
    this.loadTasks();
    this.loadTeams();
    this.loadTeamsCombo();
  }

  back(): void {
    this.selected = null;
    this.assignedTasks = [];
    this.assignedTeams = [];
    this.showTaskPicker = false;
  }

  loadTasks(): void {
    if (!this.selected?.methodologyId) {
      return;
    }
    this.detailLoading = true;
    this.methodologyService.listTasks(this.clubId, this.selected.methodologyId).subscribe({
      next: (res: Response) => {
        this.assignedTasks = res?.status === 200 && Array.isArray(res.data) ? (res.data as MethodologyTask[]) : [];
        this.detailLoading = false;
      },
      error: () => {
        this.error = 'ENTRENAMIENTOS.METH_ERROR_LOAD';
        this.detailLoading = false;
      },
    });
  }

  loadTeams(): void {
    if (!this.selected?.methodologyId) {
      return;
    }
    this.methodologyService.listTeams(this.clubId, this.selected.methodologyId).subscribe({
      next: (res: Response) => {
        this.assignedTeams = res?.status === 200 && Array.isArray(res.data) ? (res.data as MethodologyTeam[]) : [];
        this.selectedTeamIds = new Set(this.assignedTeams.map((t) => t.teamId!).filter((id) => !!id));
      },
      error: () => {},
    });
  }

  // ----------------------------------------------------------- Tareas

  openTaskPicker(): void {
    this.showTaskPicker = true;
    this.pickerSearch = '';
    this.setPickerSource(this.pickerSource);
  }

  closeTaskPicker(): void {
    this.showTaskPicker = false;
    this.previewTask = null;
  }

  setPickerSource(source: 'CLOUD' | 'CLUB'): void {
    this.pickerSource = source;
    this.pickerSearch = '';
    if (source === 'CLUB' && this.clubTasks.length === 0) {
      this.pickerLoading = true;
      this.clubTaskService.list(this.clubId).subscribe({
        next: (res: Response) => {
          this.clubTasks = res?.status === 200 && Array.isArray(res.data) ? (res.data as ClubTask[]) : [];
          this.pickerLoading = false;
        },
        error: () => { this.pickerLoading = false; },
      });
    } else if (source === 'CLOUD' && this.cloudTasks.length === 0) {
      this.pickerLoading = true;
      this.trainingService.getAllTaskShop().subscribe({
        next: (res: Response) => {
          this.cloudTasks = res?.status === 200 && Array.isArray(res.data) ? (res.data as any[]) : [];
          this.pickerLoading = false;
        },
        error: () => { this.pickerLoading = false; },
      });
    }
  }

  isAssigned(sourceType: 'SHOP' | 'CLUB', sourceTaskId: number): boolean {
    return this.assignedTasks.some((t) => t.sourceType === sourceType && t.sourceTaskId === sourceTaskId);
  }

  /** Abre el formulario para crear una tarea del club sin salir del selector. */
  openClubTaskForm(): void {
    this.showClubTaskForm = true;
  }

  onClubTaskFormClosed(): void {
    this.showClubTaskForm = false;
  }

  /** Tras crear una tarea del club, recarga la lista y muestra la pestaña Club. */
  onClubTaskSaved(): void {
    this.showClubTaskForm = false;
    this.pickerSource = 'CLUB';
    this.reloadClubTasks();
  }

  /** Recarga la lista de tareas del club (ignora la caché del selector). */
  private reloadClubTasks(): void {
    this.pickerLoading = true;
    this.clubTaskService.list(this.clubId).subscribe({
      next: (res: Response) => {
        this.clubTasks = res?.status === 200 && Array.isArray(res.data) ? (res.data as ClubTask[]) : [];
        this.pickerLoading = false;
      },
      error: () => { this.pickerLoading = false; },
    });
  }

  /**
   * Título a mostrar para una tarea. Las tareas del club tienen campo `title`;
   * las de la nube no, y usan `slogans` como nombre (igual que la nube de tareas).
   */
  taskTitle(t: { title?: string | null; slogans?: string | null } | null): string | null {
    const title = t?.title?.trim();
    if (title) {
      return title;
    }
    const slogans = t?.slogans?.trim();
    return slogans || null;
  }

  /** True si `slogans` es una consigna real (no el propio título de la tarea). */
  hasRealSlogans(t: { title?: string | null; slogans?: string | null } | null): boolean {
    const slogans = t?.slogans?.trim();
    if (!slogans) {
      return false;
    }
    // En tareas de nube `slogans` es el título → no lo repetimos como consigna.
    return !!t?.title?.trim();
  }

  /** Filtra una lista de tareas por el texto del buscador (título, descripción, trabajo). */
  private filterTasks<T extends { title?: string | null; slogans?: string | null; description?: string | null; work?: string | null }>(list: T[]): T[] {
    const q = this.pickerSearch.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter((t) => {
      const haystack = [t.title, t.slogans, t.description, t.work]
        .filter((v): v is string => !!v)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  get filteredClubTasks(): ClubTask[] {
    return this.filterTasks(this.clubTasks);
  }

  get filteredCloudTasks(): any[] {
    return this.filterTasks(this.cloudTasks);
  }

  // ------------------------------------------- Preview ampliada de tarea

  openPreview(task: any, source: 'CLOUD' | 'CLUB'): void {
    this.previewTask = task;
    this.previewSource = source;
    this.previewMode = 'picker';
  }

  /** Abre la preview de una tarea ya asignada a la metodología. */
  openPreviewAssigned(t: MethodologyTask): void {
    if (t.missing) {
      return;
    }
    this.previewTask = t;
    this.previewSource = t.sourceType === 'SHOP' ? 'CLOUD' : 'CLUB';
    this.previewMode = 'assigned';
  }

  closePreview(): void {
    this.previewTask = null;
  }

  /** Quita la tarea que se está previsualizando (modo asignada) y cierra la preview. */
  removeFromPreview(): void {
    if (this.previewTask) {
      this.removeTask(this.previewTask as MethodologyTask);
    }
    this.closePreview();
  }

  /** Tipo de origen ('CLUB'|'SHOP') de la tarea en preview, para asignarla. */
  previewSourceType(): 'SHOP' | 'CLUB' {
    return this.previewSource === 'CLUB' ? 'CLUB' : 'SHOP';
  }

  /** Id de la tarea en preview según su origen. */
  previewTaskId(): number {
    return this.previewSource === 'CLUB'
      ? (this.previewTask?.clubTaskId ?? 0)
      : (this.previewTask?.tasksShopId ?? 0);
  }

  /** Añade la tarea que se está previsualizando y cierra la preview. */
  addFromPreview(): void {
    if (!this.previewTask) {
      return;
    }
    const id = this.previewTaskId();
    const source = this.previewSourceType();
    if (!this.isAssigned(source, id)) {
      this.addTask(source, id);
    }
    this.closePreview();
  }

  addTask(sourceType: 'SHOP' | 'CLUB', sourceTaskId: number): void {
    if (!this.selected?.methodologyId || this.isAssigned(sourceType, sourceTaskId)) {
      return;
    }
    this.methodologyService.addTask(this.clubId, this.selected.methodologyId, sourceType, sourceTaskId).subscribe({
      next: (res: Response) => {
        if (res?.status === 200) {
          this.loadTasks();
          this.refreshSelectedCounts(1, 0);
        }
      },
      error: () => { this.error = 'ENTRENAMIENTOS.METH_ERROR_SAVE'; },
    });
  }

  removeTask(t: MethodologyTask): void {
    if (!this.selected?.methodologyId || !t.methodologyTaskId) {
      return;
    }
    this.methodologyService.removeTask(this.clubId, this.selected.methodologyId, t.methodologyTaskId).subscribe({
      next: (res: Response) => {
        if (res?.status === 200) {
          this.loadTasks();
          this.refreshSelectedCounts(-1, 0);
        }
      },
      error: () => { this.error = 'ENTRENAMIENTOS.METH_ERROR_DELETE'; },
    });
  }

  // ----------------------------------------------------------- Equipos

  loadTeamsCombo(): void {
    if (this.teamsCombo.length > 0) {
      return;
    }
    this.teamsLoading = true;
    this.teamService.getTeamsByClubForCombo(this.clubId, this.temporada).subscribe({
      next: (res: any) => {
        const data = res?.data ?? [];
        this.teamsCombo = (Array.isArray(data) ? data : []).map((t: any) => ({
          teamId: Number(t.teamId ?? t.value),
          name: t.name || t.teamName || `#${t.teamId ?? t.value}`,
        }));
        this.teamsLoading = false;
      },
      error: () => { this.teamsLoading = false; },
    });
  }

  toggleTeam(teamId: number): void {
    if (this.selectedTeamIds.has(teamId)) {
      this.selectedTeamIds.delete(teamId);
    } else {
      this.selectedTeamIds.add(teamId);
    }
    this.teamsSaved = false;
  }

  saveTeams(): void {
    if (!this.selected?.methodologyId) {
      return;
    }
    this.saving = true;
    this.teamsSaved = false;
    const ids = Array.from(this.selectedTeamIds);
    this.methodologyService.setTeams(this.clubId, this.selected.methodologyId, ids).subscribe({
      next: (res: Response) => {
        this.saving = false;
        if (res?.status === 200) {
          this.assignedTeams = Array.isArray(res.data) ? (res.data as MethodologyTeam[]) : [];
          this.refreshSelectedCounts(0, ids.length - (this.selected?.teamCount ?? 0));
          if (this.selected) {
            this.selected.teamCount = ids.length;
          }
          this.teamsSaved = true;
        } else {
          this.error = 'ENTRENAMIENTOS.METH_ERROR_SAVE';
        }
      },
      error: () => {
        this.saving = false;
        this.error = 'ENTRENAMIENTOS.METH_ERROR_SAVE';
      },
    });
  }

  // ----------------------------------------------------------- helpers

  /** Base pública de las imágenes de tarea (misma que "Tareas del club" y la nube). */
  get imageBaseUrl(): string {
    return this.clubTaskService.imageBaseUrl;
  }

  /**
   * URL de la imagen/GIF de una tarea (club o nube). Si `imagenBoard` ya es una
   * URL absoluta la devuelve tal cual; si no, la resuelve contra `task-board/`.
   */
  taskImageUrl(t: { imagenBoard?: string | null } | null): string | null {
    const img = t?.imagenBoard;
    if (!img) {
      return null;
    }
    return /^https?:\/\//i.test(img) ? img : this.imageBaseUrl + img;
  }

  /** True si la URL apunta a un fichero de vídeo subido (reproducible inline). */
  isUploadedVideoUrl(url?: string | null): boolean {
    return !!url && /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
  }

  /** True si el nombre de imagen corresponde a un GIF. */
  isGif(name?: string | null): boolean {
    return !!name && /\.gif(\?|$)/i.test(name);
  }

  private refreshSelectedCounts(taskDelta: number, _teamDelta: number): void {
    if (this.selected && taskDelta !== 0) {
      this.selected.taskCount = Math.max(0, (this.selected.taskCount ?? 0) + taskDelta);
    }
  }

  trackByMethodology(_i: number, m: Methodology): number {
    return m.methodologyId ?? _i;
  }

  trackByAssignedTask(_i: number, t: MethodologyTask): number {
    return t.methodologyTaskId ?? _i;
  }
}
