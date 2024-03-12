import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { HeaderComponent } from './header/header.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { InicioComponent } from './inicio/inicio.component';
import { CalendarioComponent } from './calendario/calendario.component';
import { PlayerComponent } from './player/player.component';



@NgModule({
  declarations: [
    DashboardComponent,
    HeaderComponent,
    InicioComponent,
    CalendarioComponent,
    PlayerComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule
  ]
})
export class DashboardModule { }
