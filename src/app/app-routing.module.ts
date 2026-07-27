import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { AuthGuard } from './auth.guard';
import { AlreadyAuthGuard } from './already-auth.guard';
import { DemoGuard } from './demo.guard';
import { ChangePasswordComponent } from './pages/change-password/change-password.component';
import { ValidationUserComponent } from './pages/validation-user/validation-user.component';
import { ParentChildrenComponent } from './pages/register/parent-children/parent-children.component';
import { RegisterSuccessComponent } from './pages/register/register-success/register-success.component';
import { RegisterAbonadoComponent } from './pages/register-abonado/register-abonado.component';
import { DemoRoleSelectionComponent } from './pages/demo-role/demo-role.component';

const appRoutes: Routes = [
  { path: '', redirectTo: '/demo-role', pathMatch: 'full' },
  { path: 'home', redirectTo: '/demo-role', pathMatch: 'full' },
  { path: 'login', redirectTo: '/demo-role', pathMatch: 'full' },
  { path: 'login/:token', component: LoginComponent },
  { path: 'demo-role', component: DemoRoleSelectionComponent },
  { path: 'registro', component: RegisterComponent },
  { path: 'registro/:playerId/:email/:isMenor', component: ParentChildrenComponent },
  { path: 'registro-padres/exito', component: RegisterSuccessComponent },
  { path: 'registro-padres/:clubId', component: ParentChildrenComponent },
  { path: 'registro-abonado', component: RegisterAbonadoComponent },
  { path: 'change-password', component: ChangePasswordComponent },
  { path: 'validationUser', component: ValidationUserComponent },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard, DemoGuard],
  },
  { path: '**', redirectTo: '/404' }, // Manejo de rutas no encontradas

];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
