import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { InicioComponent } from './inicio/inicio.component';
import { CalendarioComponent } from './calendario/calendario.component';
import { PlayerComponent } from './player/player.component';

const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: 'inicio', component: InicioComponent },
      { path: 'calendario/:teamId', component: CalendarioComponent },
      { path: 'jugadores/:teamId', component: PlayerComponent },
      { path: '**', redirectTo: 'inicio' },
    ],
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ]
})
export class DashboardRoutingModule { }
