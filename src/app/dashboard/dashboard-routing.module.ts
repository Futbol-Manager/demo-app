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
import { NotificacionesComponent } from './notificaciones/notificaciones.component';
import { TareasComponent } from './tareas/tareas.component';
import { OpcionesjugadorComponent } from './opcionesjugador/opcionesjugador.component';
import { HorariosequiposComponent } from './horariosequipos/horariosequipos.component';
import { EntrenamientosCreadosComponent } from './entrenamientos-creados/entrenamientos-creados.component';
import { PuntuacionEquipsComponent } from './puntuacion-equips/puntuacion-equips.component';
import { GraficaCuotasComponent } from './grafica-cuotas/grafica-cuotas.component';
import { GoleadoresComponent } from './goleadores/goleadores.component';
import { MenuEntrenadorComponent } from './menu-entrenador/menu-entrenador.component';
import { InicioDeportesComponent } from './inicio-deportes/inicio-deportes.component';
import { PartidosEntrevistasComponent } from './partidos-entrevistas/partidos-entrevistas.component';
import { MenuClubComponent } from './menu-club/menu-club.component';
import { ClasificacionResultadosComponent } from './clasificacion-resultados/clasificacion-resultados.component';
import { DocumentosClubComponent } from './documentos-club/documentos-club.component';
import { DocumentosJugadorComponent } from './documentos-jugador/documentos-jugador.component';
import { NewCuotasComponent } from './new-cuotas/new-cuotas.component';
import { HistorialPagosClubComponent } from './historial-pagos-club/historial-pagos-club.component';
import { InicioFederacionComponent } from './inicio-federacion/inicio-federacion.component';
import { InfoJugadoresFederacionComponent } from './info-jugadores-federacion/info-jugadores-federacion.component';
import { NotificacionesFederacionComponent } from './notificaciones-federacion/notificaciones-federacion.component';
import { ListadoClubesComponent } from './listado-clubes/listado-clubes.component';
import { EquiposComponent } from './equipos/equipos.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      { path: 'inicio-deportes', component: InicioDeportesComponent },
      { path: 'inicio', component: InicioComponent },
      { path: 'equipos', component: EquiposComponent },
      { path: 'inicio-federacion', component: InicioFederacionComponent },
      { path: 'info-jugadores-federacion', component: InfoJugadoresFederacionComponent },
      { path: 'calendario/:teamId/:playerId', component: CalendarioComponent },
      { path: 'menu-entrenador/:teamId/:playerId', component: MenuEntrenadorComponent },
      { path: 'menu-club/:teamId', component: MenuClubComponent },
      { path: 'opcionesjugador/:teamId/:playerId', component: OpcionesjugadorComponent },
      { path: 'partidos-entrevistas/:teamId/:playerId', component: PartidosEntrevistasComponent },
      { path: 'documentos-jugador/:teamId/:playerId', component: DocumentosJugadorComponent },
      { path: 'clasificacion-resultados/:teamId', component: ClasificacionResultadosComponent },
      { path: 'jugadores/:teamId', component: PlayerComponent },
      { path: 'documentos-club/:clubId', component: DocumentosClubComponent },
      { path: 'estadisticas_equipo/:teamId', component: EstadisticasEquipoComponent },
      { path: 'informacion_equipo/:teamId', component: InformacionEquipoComponent },
      { path: 'estadisticas_jugadores/:teamId', component: EstadisticasJugadoresComponent },
      { path: 'entrenadores/:teamId', component: TrainerComponent },
      { path: 'contabilidad/:clubId', component: ContabilidadComponent },
      { path: 'historial-pagos-club/:clubId', component: HistorialPagosClubComponent },
      { path: 'new-cuotas/:clubId', component: NewCuotasComponent },
      { path: 'abonados/:clubId', component: AbonadosComponent },
      { path: 'ropa/:clubId', component: RopaComponent },
      { path: 'cuotas/:teamId/:playerId', component: CuotasComponent },
      { path: 'cuadro-de-mandos/:clubId', component: CuadroComponent },
      { path: 'patrocinadores/:clubId', component: PatrocinadoresComponent },
      { path: 'tareas/:teamId', component: TareasComponent },
      { path: 'cuadro-de-mandos/info-jugadores/:clubId', component: InfoJugadoresComponent },
      { path: 'cuadro-de-mandos/entrenamientos/:clubId', component: EntrenamientosCreadosComponent },
      { path: 'cuadro-de-mandos/goleadores/:clubId', component: GoleadoresComponent },
      { path: 'cuadro-de-mandos/puntuaciones/:clubId', component: PuntuacionEquipsComponent },
      { path: 'cuadro-de-mandos/cuotas/:clubId', component: GraficaCuotasComponent },
      { path: 'cuadro-de-mandos/estadisticas-jugadores-club/:clubId', component: EstadisticasJugadoresClubComponent },
      { path: 'cuadro-de-mandos/estadisticas-equipos-club/:clubId', component: EstadisticasEquiposClubComponent },
      { path: 'cuadro-de-mandos/horario-equipos/:clubId', component: HorariosequiposComponent },
      { path: 'cuadro-de-mandos/estadisticas-entrenadores-club/:clubId', component: EstadisticasEntrenadoresClubComponent },
      { path: 'informacion_equipo/asistencia/:teamId', component: AsistenciaComponent },
      { path: 'suscripcion/:userId', component: SuscripcionComponent },
      { path: 'scouting-player/:playerId', component: ScoutingPlayerComponent },
      { path: 'adminsettings', component: AdminsettingsComponent },
      { path: 'notificaciones/:clubId', component: NotificacionesComponent },
      { path: 'notificaciones-federacion', component: NotificacionesFederacionComponent },
      { path: 'listado-clubes', component: ListadoClubesComponent },
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
