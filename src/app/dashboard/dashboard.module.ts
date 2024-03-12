import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { HeaderComponent } from './header/header.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { InicioComponent } from './inicio/inicio.component';
import { CalendarioComponent } from './calendario/calendario.component';
import { PlayerComponent } from './player/player.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';



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
    DashboardRoutingModule,
    FormsModule,
		ReactiveFormsModule,
    NgxDatatableModule
  ]
})
export class DashboardModule { }
