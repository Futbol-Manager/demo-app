import { ToastrModule } from 'ngx-toastr';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { DemoRoleSelectionComponent } from './pages/demo-role/demo-role.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthPagesModule } from './pages/auth-pages.module';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';

import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ProfileComponent } from './pages/profile/profile.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ChangePasswordComponent } from './pages/change-password/change-password.component';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ParentChildrenComponent } from './pages/register/parent-children/parent-children.component';
import { ConfirmationDialogComponent } from './shared/confirmation-dialog/confirmation-dialog.component';
import { TutorialOverlayComponent } from './shared/tutorial-overlay/tutorial-overlay.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    DemoRoleSelectionComponent,
    ChangePasswordComponent,
    ProfileComponent,
    ParentChildrenComponent,
    ConfirmationDialogComponent,
    TutorialOverlayComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    // 🌍 Traducciones (forRoot + import explícito para pipe en templates)
    // defaultLanguage: 'es' actúa como fallback para claves no traducidas en ca/gl/eu
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      },
      defaultLanguage: 'es'
    }),
    TranslateModule,
    AuthPagesModule,

    ToastrModule.forRoot({
      positionClass: 'toast-bottom-right',
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
      preventDuplicates: true
    }),

    CommonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})

export class AppModule {
  constructor(private translate: TranslateService) {
    // Idiomas soportados: ES, EN, FR, DE, IT, PT
    const supportedLangs = ['es', 'en', 'fr', 'de', 'it', 'pt'];

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
