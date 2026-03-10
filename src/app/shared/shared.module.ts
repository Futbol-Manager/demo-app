import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TutorialTriggerComponent } from './tutorial-trigger/tutorial-trigger.component';

/**
 * Módulo compartido: pipe translate y componente TutorialTrigger (botón Ver tutorial arrastrable).
 */
@NgModule({
  imports: [CommonModule, TranslateModule],
  declarations: [TutorialTriggerComponent],
  exports: [CommonModule, TranslateModule, TutorialTriggerComponent]
})
export class SharedModule { }
