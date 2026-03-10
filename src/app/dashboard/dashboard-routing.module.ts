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
import { AbonadosComponent } from './abonados/abonados.component';
import { PatrocinadoresComponent } from './patrocinadores/patrocinadores.component';
import { NotificacionesComponent } from './notificaciones/notificaciones.component';
import { TareasComponent } from './tareas/tareas.component';
import { FavoritasComponent } from './tareas/favoritas/favoritas.component';
import { HistorialComponent } from './tareas/historial/historial.component';
import { MisTareasComponent } from './tareas/mis-tareas/mis-tareas.component';
import { TacticalBoardComponent } from './tareas/tactical-board/tactical-board.component';
import { TareasCatalogComponent } from './tareas/tareas-catalog/tareas-catalog.component';
import { OpcionesjugadorComponent } from './opcionesjugador/opcionesjugador.component';
import { HorariosequiposComponent } from './horariosequipos/horariosequipos.component';
import { EntrenamientosCreadosComponent } from './entrenamientos-creados/entrenamientos-creados.component';
import { PuntuacionEquipsComponent } from './puntuacion-equips/puntuacion-equips.component';
import { GraficaCuotasComponent } from './grafica-cuotas/grafica-cuotas.component';
import { GoleadoresComponent } from './goleadores/goleadores.component';
import { MenuEntrenadorComponent } from './menu-entrenador/menu-entrenador.component';
import { MenuFisioComponent } from './menu-fisio/menu-fisio.component';
import { InicioDeportesComponent } from './inicio-deportes/inicio-deportes.component';
import { PartidosEntrevistasComponent } from './partidos-entrevistas/partidos-entrevistas.component';
import { MenuClubComponent } from './menu-club/menu-club.component';
import { ClasificacionResultadosComponent } from './clasificacion-resultados/clasificacion-resultados.component';
import { DocumentosClubComponent } from './documentos-club/documentos-club.component';
import { DocumentosJugadorComponent } from './documentos-jugador/documentos-jugador.component';
import { DocumentosEntrenadorComponent } from './documentos-entrenador/documentos-entrenador.component';
import { NewCuotasComponent } from './new-cuotas/new-cuotas.component';
import { HistorialPagosClubComponent } from './historial-pagos-club/historial-pagos-club.component';
import { EquiposComponent } from './equipos/equipos.component';
import { SugerenciasClubComponent } from './sugerencias-club/sugerencias-club.component';
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
import { FormTemplatesComponent } from './debrief/form-templates/form-templates.component';
import { ClubOwnerGuard } from '../club-owner.guard';
import { CoachSubscriptionGuard } from '../coach-subscription.guard';
import { ClubPlanGuard } from '../guards/club-plan.guard';
import { SuscripcionCoachComponent } from './suscripcion-coach/suscripcion-coach.component';
import { CoachSuscripcionSuccessComponent } from './coach-suscripcion-success/coach-suscripcion-success.component';
import { AiCreditsSuccessComponent } from './ai-credits-success/ai-credits-success.component';
import { ScoutingClubComponent } from './scouting-club/scouting-club.component';
import { ScoutingPlayerProfileComponent } from './scouting-player-profile/scouting-player-profile.component';
import { ClubVideoLibraryComponent } from './club-video-library/club-video-library.component';
import { VideoPlanSuccessComponent } from './video-plan-success/video-plan-success.component';
import { VideoAnalysisHubComponent } from './video-analysis/hub/video-analysis-hub.component';
import { VideoAnalysisWorkspaceComponent } from './video-analysis/workspace/video-analysis-workspace.component';
import { TemplateListComponent } from './video-analysis/templates/template-list.component';
import { TemplateEditorComponent } from './video-analysis/templates/template-editor.component';
import { PlaylistBuilderComponent } from './video-analysis/playlists/playlist-builder.component';
import { PlaylistViewerComponent } from './video-analysis/playlists/playlist-viewer.component';
import { CanvasTaggerWindowComponent } from './video-analysis/canvas-tagger-window/canvas-tagger-window.component';
import { ScreenCaptureWorkspaceComponent } from './video-analysis/screen-capture/screen-capture-workspace.component';
import { ExternalVideoWorkspaceComponent } from './video-analysis/external-workspace/external-video-workspace.component';
import { StaffClubComponent } from './staff-club/staff-club.component';
import { IndividualTrainingComponent } from './individual-training/individual-training.component';
import { RopaJugadorComponent } from './ropa-jugador/ropa-jugador.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    canActivateChild: [CoachSubscriptionGuard],
    children: [
      { path: 'inicio-deportes', component: InicioDeportesComponent },
      { path: 'inicio', component: InicioComponent },
      { path: 'equipos', component: EquiposComponent },
      { path: 'calendario/:teamId/:playerId', component: CalendarioComponent },
      { path: 'menu-entrenador/:teamId/:playerId', component: MenuEntrenadorComponent, canActivate: [ClubPlanGuard] },
      { path: 'menu-fisio/:teamId/:playerId', component: MenuFisioComponent },
      { path: 'menu-club/:teamId', component: MenuClubComponent },
      { path: 'opcionesjugador/:teamId/:playerId', component: OpcionesjugadorComponent },
      { path: 'partidos-entrevistas/:teamId/:playerId', component: PartidosEntrevistasComponent },
      { path: 'documentos-jugador/:teamId/:playerId', component: DocumentosJugadorComponent },
      { path: 'documentos-entrenador/:clubId', component: DocumentosEntrenadorComponent },
      { path: 'clasificacion-resultados/:teamId', component: ClasificacionResultadosComponent },
      { path: 'jugador/:teamId/:playerId', component: PlayerComponent },
      { path: 'jugadores/:teamId', component: PlayerComponent },
      { path: 'documentos-club/:clubId', component: DocumentosClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'estadisticas_equipo/:teamId', component: EstadisticasEquipoComponent, canActivate: [ClubPlanGuard] },
      { path: 'informacion_equipo/:teamId', component: InformacionEquipoComponent },
      { path: 'estadisticas_jugadores/:teamId', component: EstadisticasJugadoresComponent, canActivate: [ClubPlanGuard] },
      { path: 'entrenadores/:teamId', component: TrainerComponent },
      { path: 'contabilidad/:clubId', component: ContabilidadComponent, canActivate: [ClubOwnerGuard] },
      { path: 'historial-pagos-club/:clubId', component: HistorialPagosClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'new-cuotas/:clubId', component: NewCuotasComponent, canActivate: [ClubOwnerGuard] },
      { path: 'abonados/:clubId', component: AbonadosComponent, canActivate: [ClubOwnerGuard] },
      { path: 'ropa/:clubId', component: RopaComponent, canActivate: [ClubOwnerGuard] },
      { path: 'ropa-jugador/:teamId/:playerId', component: RopaJugadorComponent },
      { path: 'cuotas/:teamId/:playerId', component: CuotasComponent },
      { path: 'cuadro-de-mandos/:clubId', component: CuadroComponent, canActivate: [ClubOwnerGuard] },
      { path: 'patrocinadores/:clubId', component: PatrocinadoresComponent },
      { path: 'patrocinadores-usuario/:userId', component: PatrocinadoresComponent },
      { path: 'tareas/:teamId', component: TareasComponent, canActivate: [ClubPlanGuard] },
      { path: 'tareas-favoritas/:teamId', component: FavoritasComponent },
      { path: 'tareas-historial/:teamId', component: HistorialComponent },
      { path: 'tareas-mis/:teamId', component: MisTareasComponent },
      { path: 'tareas-catalog/:teamId', component: TareasCatalogComponent },
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
      { path: 'lesiones/:teamId', component: LesionesEquipoComponent, canActivate: [ClubPlanGuard] },
      { path: 'informacion_equipo/asistencia/:teamId', component: AsistenciaComponent },
      { path: 'suscripcion/:userId', component: SuscripcionComponent },
      { path: 'scouting-player/:playerId', component: ScoutingPlayerComponent },
      { path: 'notificaciones/:clubId', component: NotificacionesComponent },
      { path: 'notificaciones-usuario/:userId', component: NotificacionesComponent },
      { path: 'sugerencias-club', component: SugerenciasClubComponent },
      { path: 'ai-credits-success', component: AiCreditsSuccessComponent },
      { path: 'video-plan-success', component: VideoPlanSuccessComponent },
      { path: 'club-videos/:clubId', component: ClubVideoLibraryComponent, canActivate: [ClubOwnerGuard, ClubPlanGuard] },
      { path: 'video-analysis', component: VideoAnalysisHubComponent },
      { path: 'video-analysis/workspace/:projectId', component: VideoAnalysisWorkspaceComponent },
      { path: 'video-analysis/templates', component: TemplateListComponent },
      { path: 'video-analysis/template/:id', component: TemplateEditorComponent },
      { path: 'video-analysis/playlists', component: PlaylistBuilderComponent },
      { path: 'video-analysis/playlist/:id', component: PlaylistViewerComponent },
      { path: 'video-analysis/canvas-tagger/:projectId', component: CanvasTaggerWindowComponent },
      { path: 'video-analysis/screen-capture', component: ScreenCaptureWorkspaceComponent },
      { path: 'video-analysis/external-workspace', component: ExternalVideoWorkspaceComponent },
      { path: 'scouting-club/:clubId', component: ScoutingClubComponent, canActivate: [ClubOwnerGuard, ClubPlanGuard] },
      { path: 'scouting-player-profile/:playerId', component: ScoutingPlayerProfileComponent },
      { path: 'suscripcion-club', component: SuscripcionClubComponent },
      { path: 'suscripcion-club/wizard/familia', component: WizardFamiliaComponent },
      { path: 'suscripcion-club/wizard/club', component: WizardClubComponent },
      { path: 'suscripcion-club/wizard/gratuito', component: WizardGratuitoComponent },
      { path: 'debrief/training/:teamId/:trainingSessionId', component: DebriefTrainingComponent },
      { path: 'debrief/match/:teamId/:matchId', component: DebriefMatchComponent },
      { path: 'debrief/report/:debriefId/:type', component: DebriefReportComponent },
      { path: 'debrief/history/:teamId', component: DebriefHistoryComponent },
      { path: 'debrief/templates/:clubId', component: FormTemplatesComponent },
      { path: 'suscripcion-coach', component: SuscripcionCoachComponent },
      { path: 'coach-suscripcion-success', component: CoachSuscripcionSuccessComponent },
      { path: 'staff-club', component: StaffClubComponent, canActivate: [ClubOwnerGuard] },
      { path: 'individual-training', component: IndividualTrainingComponent },
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
