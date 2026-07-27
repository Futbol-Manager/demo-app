import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TutorialTriggerComponent } from './tutorial-trigger/tutorial-trigger.component';
import { DynamicRegisterFieldsComponent } from '../pages/register/dynamic-register-fields/dynamic-register-fields.component';

/**
 * Módulo compartido: pipe translate, TutorialTrigger (botón Ver tutorial
 * arrastrable) y el renderizador de campos dinámicos de registro
 * (`app-dynamic-register-fields`), usado tanto en el flujo de registro
 * (AppModule) como en el builder de formularios del dashboard.
 */
@NgModule({
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  declarations: [TutorialTriggerComponent, DynamicRegisterFieldsComponent],
  exports: [CommonModule, TranslateModule, TutorialTriggerComponent, DynamicRegisterFieldsComponent]
})
export class SharedModule { }
