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
import { FavoritasComponent } from './tareas/favoritas/favoritas.component';
import { HistorialComponent } from './tareas/historial/historial.component';
import { MisTareasComponent } from './tareas/mis-tareas/mis-tareas.component';
import { TacticalBoardComponent } from './tareas/tactical-board/tactical-board.component';
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
import { DocumentosEntrenadorComponent } from './documentos-entrenador/documentos-entrenador.component';
import { NewCuotasComponent } from './new-cuotas/new-cuotas.component';
import { HistorialPagosClubComponent } from './historial-pagos-club/historial-pagos-club.component';
import { InicioFederacionComponent } from './inicio-federacion/inicio-federacion.component';
import { InfoJugadoresFederacionComponent } from './info-jugadores-federacion/info-jugadores-federacion.component';
import { NotificacionesFederacionComponent } from './notificaciones-federacion/notificaciones-federacion.component';
import { ListadoClubesComponent } from './listado-clubes/listado-clubes.component';
import { EquiposComponent } from './equipos/equipos.component';
import { AdminClubesComponent } from './admin-clubes/admin-clubes.component';
import { AdminClubDetailComponent } from './admin-club-detail/admin-club-detail.component';
import { AdminInicioComponent } from './admin-inicio/admin-inicio.component';
import { SugerenciasClubComponent } from './sugerencias-club/sugerencias-club.component';
import { AdminSugerenciasComponent } from './admin-sugerencias/admin-sugerencias.component';
import { AdminChartsComponent } from './admin-charts/admin-charts.component';
import { AdminAiInsightsComponent } from './admin-ai-insights/admin-ai-insights.component';
import { CalendarioClubComponent } from './calendario-club/calendario-club.component';
import { AsistenteIaComponent } from './asistente-ia/asistente-ia.component';
import { AsistenteIaCoachComponent } from './asistente-ia-coach/asistente-ia-coach.component';
import { LesionesEquipoComponent } from './lesiones/lesiones-equipo.component';
import { LesionesClubComponent } from './lesiones-club/lesiones-club.component';
import { InfoEntrenadoresComponent } from './info-entrenadores/info-entrenadores.component';
import { PerfilEntrenadorComponent } from './perfil-entrenador/perfil-entrenador.component';
import { SuscripcionClubComponent } from './suscripcion-club/suscripcion-club.component';
import { WizardFamiliaComponent } from './suscripcion-club/wizard-familia/wizard-familia.component';
import { WizardClubComponent } from './suscripcion-club/wizard-club/wizard-club.component';
import { WizardGratuitoComponent } from './suscripcion-club/wizard-gratuito/wizard-gratuito.component';
import { DebriefTrainingComponent } from './debrief/debrief-training/debrief-training.component';
import { DebriefMatchComponent } from './debrief/debrief-match/debrief-match.component';
import { DebriefReportComponent } from './debrief/debrief-report/debrief-report.component';
import { DebriefHistoryComponent } from './debrief/debrief-history/debrief-history.component';
import { ClubOwnerGuard } from '../club-owner.guard';
import { AdminRegistrosComponent } from './admin-registros/admin-registros.component';
import { AdminActivityComponent } from './admin-activity/admin-activity.component';

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
      { path: 'documentos-entrenador/:clubId', component: DocumentosEntrenadorComponent },
      { path: 'clasificacion-resultados/:teamId', component: ClasificacionResultadosComponent },
      { path: 'jugadores/:teamId', component: PlayerComponent },
      { path: 'documentos-club/:clubId', component: DocumentosClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'estadisticas_equipo/:teamId', component: EstadisticasEquipoComponent },
      { path: 'informacion_equipo/:teamId', component: InformacionEquipoComponent },
      { path: 'estadisticas_jugadores/:teamId', component: EstadisticasJugadoresComponent },
      { path: 'entrenadores/:teamId', component: TrainerComponent },
      { path: 'contabilidad/:clubId', component: ContabilidadComponent, canActivate: [ClubOwnerGuard] },
      { path: 'historial-pagos-club/:clubId', component: HistorialPagosClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'new-cuotas/:clubId', component: NewCuotasComponent, canActivate: [ClubOwnerGuard] },
      { path: 'abonados/:clubId', component: AbonadosComponent, canActivate: [ClubOwnerGuard] },
      { path: 'ropa/:clubId', component: RopaComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuotas/:teamId/:playerId', component: CuotasComponent },
      { path: 'cuadro-de-mandos/:clubId', component: CuadroComponent, canActivate: [ClubOwnerGuard] },
      { path: 'patrocinadores/:clubId', component: PatrocinadoresComponent, canActivate: [ClubOwnerGuard] },
      { path: 'tareas/:teamId', component: TareasComponent },
      { path: 'tareas-favoritas/:teamId', component: FavoritasComponent },
      { path: 'tareas-historial/:teamId', component: HistorialComponent },
      { path: 'tareas-mis/:teamId', component: MisTareasComponent },
      { path: 'tactical-board/:teamId', component: TacticalBoardComponent },
      { path: 'cuadro-de-mandos/info-jugadores/:clubId', component: InfoJugadoresComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/entrenamientos/:clubId', component: EntrenamientosCreadosComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/goleadores/:clubId', component: GoleadoresComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/puntuaciones/:clubId', component: PuntuacionEquipsComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/cuotas/:clubId', component: GraficaCuotasComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/estadisticas-jugadores-club/:clubId', component: EstadisticasJugadoresClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/estadisticas-equipos-club/:clubId', component: EstadisticasEquiposClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/horario-equipos/:clubId', component: HorariosequiposComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/estadisticas-entrenadores-club/:clubId', component: EstadisticasEntrenadoresClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/calendario-club/:clubId', component: CalendarioClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/lesiones-club/:clubId', component: LesionesClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'cuadro-de-mandos/info-entrenadores/:clubId', component: InfoEntrenadoresComponent, canActivate: [ClubOwnerGuard] },
      { path: 'perfil-entrenador/:teamId/:playerId', component: PerfilEntrenadorComponent },
      { path: 'asistente-ia', component: AsistenteIaComponent },
      { path: 'asistente-ia-coach', component: AsistenteIaCoachComponent },
      { path: 'lesiones/:teamId', component: LesionesEquipoComponent },
      { path: 'informacion_equipo/asistencia/:teamId', component: AsistenciaComponent },
      { path: 'suscripcion/:userId', component: SuscripcionComponent },
      { path: 'scouting-player/:playerId', component: ScoutingPlayerComponent },
      { path: 'adminsettings', component: AdminsettingsComponent },
      { path: 'notificaciones/:clubId', component: NotificacionesComponent, canActivate: [ClubOwnerGuard] },
      { path: 'notificaciones-federacion', component: NotificacionesFederacionComponent },
      { path: 'listado-clubes', component: ListadoClubesComponent },
      { path: 'admin-clubes', component: AdminClubesComponent },
      { path: 'admin-club-detail/:clubId', component: AdminClubDetailComponent },
      { path: 'admin-inicio/:clubId/:userId', component: AdminInicioComponent },
      { path: 'sugerencias-club', component: SugerenciasClubComponent },
      { path: 'admin-sugerencias', component: AdminSugerenciasComponent },
      { path: 'admin-charts', component: AdminChartsComponent },
      { path: 'admin-ai-insights', component: AdminAiInsightsComponent },
      { path: 'admin-registros', component: AdminRegistrosComponent },
      { path: 'admin-activity', component: AdminActivityComponent },
      { path: 'suscripcion-club', component: SuscripcionClubComponent },
      { path: 'suscripcion-club/wizard/familia', component: WizardFamiliaComponent },
      { path: 'suscripcion-club/wizard/club', component: WizardClubComponent },
      { path: 'suscripcion-club/wizard/gratuito', component: WizardGratuitoComponent },
      { path: 'debrief/training/:teamId/:trainingSessionId', component: DebriefTrainingComponent },
      { path: 'debrief/match/:teamId/:matchId', component: DebriefMatchComponent },
      { path: 'debrief/report/:debriefId/:type', component: DebriefReportComponent },
      { path: 'debrief/history/:teamId', component: DebriefHistoryComponent },
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
