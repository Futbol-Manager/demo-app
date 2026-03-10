import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RegisterComponent } from './register/register.component';
import { ValidationUserComponent } from './validation-user/validation-user.component';
import { ClubesListComponent } from './register/clubes-list/clubes-list.component';

/**
 * Módulo que declara Register, Validation y ClubesList (usado en modal)
 * e importa TranslateModule/FormsModule para pipe 'translate' y ngModel.
 */
@NgModule({
  declarations: [RegisterComponent, ValidationUserComponent, ClubesListComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
  ],
  exports: [RegisterComponent, ValidationUserComponent],
})
export class AuthPagesModule {}
