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
import { ShopComponent } from './calendario/shop/shop.component';
import { EstadisticasEquipoComponent } from './estadisticas-equipo/estadisticas-equipo.component';
import { EstadisticasJugadoresComponent } from './estadisticas-jugadores/estadisticas-jugadores.component';
import { InformacionEquipoComponent } from './informacion-equipo/informacion-equipo.component';
import { TrainerComponent } from './trainer/trainer.component';
import { ContabilidadComponent } from './contabilidad/contabilidad.component';
import { CuotasComponent } from './cuotas/cuotas.component';
import { RopaComponent } from './ropa/ropa.component';
import { CuadroComponent } from './cuadro/cuadro.component';
import { InfoJugadoresComponent } from './info-jugadores/info-jugadores.component';
import { EstadisticasJugadoresClubComponent } from './estadisticas-jugadores-club/estadisticas-jugadores-club.component';
import { EstadisticasEquiposClubComponent } from './estadisticas-equipos-club/estadisticas-equipos-club.component';
import { EstadisticasEntrenadoresClubComponent } from './estadisticas-entrenadores-club/estadisticas-entrenadores-club.component';
import { SuscripcionComponent } from './suscripcion/suscripcion.component';
import { ScoutingPlayerComponent } from './scouting-player/scouting-player.component';
import { AdminsettingsComponent } from './adminsettings/adminsettings.component';
import { AbonadosComponent } from './abonados/abonados.component';
import { PatrocinadoresComponent } from './patrocinadores/patrocinadores.component';
import { PublicidadComponent } from './publicidad/publicidad.component';
import { NotificacionesComponent } from './notificaciones/notificaciones.component';
import { TareasComponent } from './tareas/tareas.component';
import { OpcionesjugadorComponent } from './opcionesjugador/opcionesjugador.component';



@NgModule({
  declarations: [
    DashboardComponent,
    HeaderComponent,
    InicioComponent,
    CalendarioComponent,
    PlayerComponent,
    TrainerComponent,
    ShopComponent,
    EstadisticasEquipoComponent,
    EstadisticasJugadoresComponent,
    InformacionEquipoComponent,
    ContabilidadComponent,
    CuotasComponent,
    RopaComponent,
    CuadroComponent,
    InfoJugadoresComponent,
    EstadisticasJugadoresClubComponent,
    EstadisticasEquiposClubComponent,
    EstadisticasEntrenadoresClubComponent,
    SuscripcionComponent,
    ScoutingPlayerComponent,
    AdminsettingsComponent,
    AbonadosComponent,
    PatrocinadoresComponent,
    PublicidadComponent,
    NotificacionesComponent,
    TareasComponent,
    OpcionesjugadorComponent
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
