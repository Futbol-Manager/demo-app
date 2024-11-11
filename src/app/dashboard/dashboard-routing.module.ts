import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { InicioComponent } from './inicio/inicio.component';
import { CalendarioComponent } from './calendario/calendario.component';
import { PlayerComponent } from './player/player.component';
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
import { AsistenciaComponent } from './asistencia/asistencia.component';
import { SuscripcionComponent } from './suscripcion/suscripcion.component';
import { ScoutingPlayerComponent } from './scouting-player/scouting-player.component';
import { AdminsettingsComponent } from './adminsettings/adminsettings.component';
import { AbonadosComponent } from './abonados/abonados.component';
import { PatrocinadoresComponent } from './patrocinadores/patrocinadores.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      { path: 'inicio', component: InicioComponent },
      { path: 'calendario/:teamId/:playerId', component: CalendarioComponent },
      { path: 'jugadores/:teamId', component: PlayerComponent },
      { path: 'estadisticas_equipo/:teamId', component: EstadisticasEquipoComponent },
      { path: 'informacion_equipo/:teamId', component: InformacionEquipoComponent },
      { path: 'estadisticas_jugadores/:teamId', component: EstadisticasJugadoresComponent },
      { path: 'entrenadores/:teamId', component: TrainerComponent },
      { path: 'contabilidad/:clubId', component: ContabilidadComponent },
      { path: 'abonados/:clubId', component: AbonadosComponent },
      { path: 'ropa/:clubId', component: RopaComponent },
      { path: 'cuotas/:teamId', component: CuotasComponent },
      { path: 'cuadro-de-mandos/:clubId', component: CuadroComponent },
      { path: 'patrocinadores/:clubId', component: PatrocinadoresComponent },
      { path: 'cuadro-de-mandos/info-jugadores/:clubId', component: InfoJugadoresComponent },
      { path: 'cuadro-de-mandos/estadisticas-jugadores-club/:clubId', component: EstadisticasJugadoresClubComponent },
      { path: 'cuadro-de-mandos/estadisticas-equipos-club/:clubId', component: EstadisticasEquiposClubComponent },
      { path: 'cuadro-de-mandos/estadisticas-entrenadores-club/:clubId', component: EstadisticasEntrenadoresClubComponent },
      { path: 'informacion_equipo/asistencia/:teamId', component: AsistenciaComponent },
      { path: 'suscripcion/:userId', component: SuscripcionComponent },
      { path: 'scouting-player/:playerId', component: ScoutingPlayerComponent },
      { path: 'adminsettings', component: AdminsettingsComponent },
      { path: '**', redirectTo: 'inicio' },
    ],
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
