import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RegisterComponent } from './pages/register/register.component';
import { HttpClientModule } from '@angular/common/http';
import { DashboardModule } from './dashboard/dashboard.module';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';

// Importa Popper.js
import * as Popper from 'popper.js';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ProfileComponent } from './pages/profile/profile.component';
import { MatFormFieldModule } from '@angular/material/form-field';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    RegisterComponent,
    ProfileComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
		ReactiveFormsModule,
    HttpClientModule,
    DashboardModule,
    CommonModule,
    NgxDatatableModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
