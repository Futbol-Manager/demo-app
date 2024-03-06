import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { InicioComponent } from './pages/inicio/inicio.component';
import { AuthGuard } from './auth.guard';
import { CalendarioComponent } from './pages/calendario/calendario.component';
import { PlayerComponent } from './pages/player/player.component';

const appRoutes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'inicio', component: InicioComponent, canActivate: [AuthGuard] },  // Aplica el guardia de ruta
  { path: 'calendario/:teamId', component: CalendarioComponent, canActivate: [AuthGuard] },
  { path: 'jugadores/:teamId', component: PlayerComponent, canActivate: [AuthGuard] }
  
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
