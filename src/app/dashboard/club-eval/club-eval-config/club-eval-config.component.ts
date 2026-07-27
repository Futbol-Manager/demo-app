import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClubEvalService, ClubEvalConfig, ClubEvalField, ClubEvalStage } from 'src/app/core/services/club-eval/club-eval.service';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';

@Component({
  selector: 'app-club-eval-config',
  templateUrl: './club-eval-config.component.html',
  styleUrls: ['./club-eval-config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubEvalConfigComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  clubId = 0;
  loading = false;
  saving = false;
  loadError = false;

  config: ClubEvalConfig | null = null;

  // Fields management
  fields: ClubEvalField[] = [];
  newFieldLabel = '';
  editingField: ClubEvalField | null = null;

  // Stages management
  stages: ClubEvalStage[] = [];
  newStageLabel = '';
  editingStage: ClubEvalStage | null = null;

  activeTab: 'general' | 'fields' | 'stages' | 'alerts' = 'general';

  savingFieldId: number | null = null;
  deletingFieldId: number | null = null;
  addingField = false;
  savingStageId: number | null = null;
  deletingStageId: number | null = null;
  addingStage = false;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private clubEvalService: ClubEvalService,
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef,
    private notification: NotificationService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.clubId = +this.route.snapshot.paramMap.get('clubId')!;
    setTimeout(() => this.loadConfig(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConfig(): void {
    this.loading = true;
    this.loadError = false;
    this.cdr.detectChanges();
    this.clubEvalService.getConfig(this.clubId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.config = res.data;
            this.fields = this.config!.fields || [];
            this.stages = this.config!.stages || [];
          } else {
            this.loadError = true;
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {

          this.loading = false;
          this.loadError = true;
          this.cdr.detectChanges();
        }
      });
  }

  initConfig(): void {
    // Fuerza la inicialización de la config para este club
    this.loading = true;
    this.loadError = false;
    // Guardar una config mínima vacía para que el backend la cree
    this.clubEvalService.saveConfig(this.clubId, {
      pipelineEnabled: 1,
      aiReportsEnabled: 1,
      playerCanSeeEvaluations: 0,
      alertasEnabled: 1,
      semanasSinEval: 4,
      bajasConsecutivas: 2
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadConfig(),
        error: () => { this.loading = false; this.loadError = true; this.cdr.markForCheck(); }
      });
  }

  saveGeneralConfig(): void {
    if (!this.config) return;
    this.saving = true;
    this.clubEvalService.saveConfig(this.clubId, {
      pipelineEnabled: this.config.pipelineEnabled,
      aiReportsEnabled: this.config.aiReportsEnabled,
      playerCanSeeEvaluations: this.config.playerCanSeeEvaluations,
      alertasEnabled: this.config.alertasEnabled,
      semanasSinEval: this.config.semanasSinEval,
      bajasConsecutivas: this.config.bajasConsecutivas
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.saving = false; this.notification.saveSuccess(); this.cdr.markForCheck(); },
        error: () => { this.saving = false; this.notification.errorGeneric(); this.cdr.markForCheck(); }
      });
  }

  // Fields
  addField(): void {
    if (!this.newFieldLabel.trim() || this.addingField) return;
    this.addingField = true;
    this.clubEvalService.createField(this.clubId, {
      fieldLabel: this.newFieldLabel.trim(),
      fieldOrder: this.fields.length
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.addingField = false;
          this.newFieldLabel = '';
          this.loadConfig();
          this.notification.saveSuccess();
          this.cdr.markForCheck();
        },
        error: () => { this.addingField = false; this.notification.errorGeneric(); this.cdr.markForCheck(); }
      });
  }

  startEditField(field: ClubEvalField): void {
    this.editingField = { ...field };
  }

  saveField(): void {
    if (!this.editingField || this.savingFieldId) return;
    this.savingFieldId = this.editingField.id;
    this.clubEvalService.updateField(this.clubId, this.editingField.id, {
      fieldLabel: this.editingField.fieldLabel,
      fieldOrder: this.editingField.fieldOrder
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.savingFieldId = null;
          this.editingField = null;
          this.loadConfig();
          this.notification.saveSuccess();
          this.cdr.markForCheck();
        },
        error: () => { this.savingFieldId = null; this.notification.errorGeneric(); this.cdr.markForCheck(); }
      });
  }

  deleteField(fieldId: number): void {
    if (this.deletingFieldId) return;
    const msg = this.translateService.instant('CLUB_EVAL.CONFIG.DELETE_FIELD_CONFIRM');
    this.confirmationService.confirm({ message: msg, confirmStyle: 'warn' }).subscribe(ok => {
      if (!ok) return;
      this.deletingFieldId = fieldId;
      this.cdr.markForCheck();
      this.clubEvalService.deleteField(this.clubId, fieldId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.deletingFieldId = null; this.loadConfig(); this.notification.deleteSuccess(); this.cdr.markForCheck(); },
          error: () => { this.deletingFieldId = null; this.notification.errorGeneric(); this.cdr.markForCheck(); }
        });
    });
  }

  // Stages
  addStage(): void {
    if (!this.newStageLabel.trim() || this.addingStage) return;
    this.addingStage = true;
    this.clubEvalService.createStage(this.clubId, {
      stageLabel: this.newStageLabel.trim(),
      stageOrder: this.stages.length
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.addingStage = false;
          this.newStageLabel = '';
          this.loadConfig();
          this.notification.saveSuccess();
          this.cdr.markForCheck();
        },
        error: () => { this.addingStage = false; this.notification.errorGeneric(); this.cdr.markForCheck(); }
      });
  }

  startEditStage(stage: ClubEvalStage): void {
    this.editingStage = { ...stage };
  }

  saveStage(): void {
    if (!this.editingStage || this.savingStageId) return;
    this.savingStageId = this.editingStage.id;
    this.clubEvalService.updateStage(this.clubId, this.editingStage.id, {
      stageLabel: this.editingStage.stageLabel,
      stageOrder: this.editingStage.stageOrder
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.savingStageId = null;
          this.editingStage = null;
          this.loadConfig();
          this.notification.saveSuccess();
          this.cdr.markForCheck();
        },
        error: () => { this.savingStageId = null; this.notification.errorGeneric(); this.cdr.markForCheck(); }
      });
  }

  deleteStage(stageId: number): void {
    if (this.deletingStageId) return;
    const msg = this.translateService.instant('CLUB_EVAL.CONFIG.DELETE_STAGE_CONFIRM');
    this.confirmationService.confirm({ message: msg, confirmStyle: 'warn' }).subscribe(ok => {
      if (!ok) return;
      this.deletingStageId = stageId;
      this.cdr.markForCheck();
      this.clubEvalService.deleteStage(this.clubId, stageId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.deletingStageId = null; this.loadConfig(); this.notification.deleteSuccess(); this.cdr.markForCheck(); },
          error: () => { this.deletingStageId = null; this.notification.errorGeneric(); this.cdr.markForCheck(); }
        });
    });
  }

  goBack(): void {
    this.location.back();
  }
}
