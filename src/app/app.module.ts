import { ToastrModule } from 'ngx-toastr';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RegisterComponent } from './pages/register/register.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DashboardModule } from './dashboard/dashboard.module';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';

import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ProfileComponent } from './pages/profile/profile.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ClubesListComponent } from './pages/register/clubes-list/clubes-list.component';
import { ChangePasswordComponent } from './pages/change-password/change-password.component';
import { ValidationUserComponent } from './pages/validation-user/validation-user.component';
import { AsistenciaComponent } from './dashboard/asistencia/asistencia.component';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ParentChildrenComponent } from './pages/register/parent-children/parent-children.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    RegisterComponent,
    ChangePasswordComponent,
    ValidationUserComponent,
    ProfileComponent,
    ClubesListComponent,
    AsistenciaComponent,
    ParentChildrenComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    // 🌍 Traducciones
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),

    ToastrModule.forRoot({
      positionClass: 'toast-bottom-right',
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
      preventDuplicates: true
    }),

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

export class AppModule {
  constructor(private translate: TranslateService) {
    // Idiomas soportados
    const supportedLangs = ['es', 'en', 'fr'];

    // 1. Idioma guardado anteriormente
    const savedLang = localStorage.getItem('lang');

    // 2. Idioma del navegador, ej: "es-ES" → "es"
    const browserLang = navigator.language.split('-')[0];

    // 3. Elegir idioma final
    const langToUse =
      savedLang ||
      (supportedLangs.includes(browserLang) ? browserLang : 'es');

    // Configurar
    translate.setDefaultLang('es');
    translate.use(langToUse);
  }
}
