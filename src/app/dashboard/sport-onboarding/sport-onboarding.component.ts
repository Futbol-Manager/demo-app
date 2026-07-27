import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SPORT_CONFIGS } from '../../core/models/sport/sport-config.model';

export interface SportOnboardingResult {
  sport: string;
  category: string;
  teamType: 'competitive' | 'training' | 'school';
}

@Component({
  selector: 'app-sport-onboarding',
  templateUrl: './sport-onboarding.component.html',
  styleUrls: ['./sport-onboarding.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportOnboardingComponent {
  @Output() completed = new EventEmitter<SportOnboardingResult>();
  @Output() cancelled = new EventEmitter<void>();

  step = 1;
  selected: Partial<SportOnboardingResult> = {};

  /** labelKey: clave i18n para usar con | translate en el template */
  sports = Object.values(SPORT_CONFIGS).map(cfg => ({
    key: cfg.key,
    labelKey: cfg.labelKey,
    emoji: cfg.emoji,
    available: true,
  }));

  categories = [
    { value: 'senior', label: 'Sénior' },
    { value: 'juvenil', label: 'Juvenil' },
    { value: 'cadete', label: 'Cadete' },
    { value: 'infantil', label: 'Infantil' },
    { value: 'alevin', label: 'Alevín' },
    { value: 'prebenjamin', label: 'Prebenjamín' },
  ];

  teamTypes: Array<{ value: 'competitive' | 'training' | 'school'; label: string; desc: string }> = [
    { value: 'competitive', label: '🏆 Competitivo', desc: 'Participa en liga/competición oficial' },
    { value: 'training', label: '📈 Formativo', desc: 'Centrado en desarrollo de jugadores' },
    { value: 'school', label: '🎓 Escuela deportiva', desc: 'Iniciación y aprendizaje' },
  ];

  selectSport(key: string): void {
    this.selected.sport = key;
    this.step = 2;
  }

  selectCategory(value: string): void {
    this.selected.category = value;
    this.step = 3;
  }

  selectType(value: 'competitive' | 'training' | 'school'): void {
    this.selected.teamType = value;
    this.complete();
  }

  complete(): void {
    if (this.selected.sport && this.selected.category && this.selected.teamType) {
      this.completed.emit(this.selected as SportOnboardingResult);
    }
  }

  goBack(): void {
    if (this.step > 1) {
      this.step--;
    }
  }
}
