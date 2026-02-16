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
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateModule } from '@ngx-translate/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EquiposComponent } from './equipos/equipos.component';
import { LogoSpinnerComponent } from '../shared/logo-spinner/logo-spinner.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { InfoEquipoComponent } from './info-equipo/info-equipo.component';
import { AdminClubesComponent } from './admin-clubes/admin-clubes.component';
import { AdminClubDetailComponent } from './admin-club-detail/admin-club-detail.component';
import { AdminInicioComponent } from './admin-inicio/admin-inicio.component';
import { SugerenciasClubComponent } from './sugerencias-club/sugerencias-club.component';
import { AdminSugerenciasComponent } from './admin-sugerencias/admin-sugerencias.component';
import { AdminChartsComponent } from './admin-charts/admin-charts.component';
import { AdminAiInsightsComponent } from './admin-ai-insights/admin-ai-insights.component';
import { PlayerInfoDialogComponent } from './player-info-dialog/player-info-dialog.component';
import { CalendarioClubComponent } from './calendario-club/calendario-club.component';
import { AsistenteIaComponent, Nl2brPipe } from './asistente-ia/asistente-ia.component';
import { AsistenteIaCoachComponent } from './asistente-ia-coach/asistente-ia-coach.component';
import { AiFabComponent } from './ai-fab/ai-fab.component';
import { LesionesComponent } from './lesiones/lesiones.component';
import { LesionesEquipoComponent } from './lesiones/lesiones-equipo.component';
import { LesionesClubComponent } from './lesiones-club/lesiones-club.component';
import { MatDialogModule } from '@angular/material/dialog';
import { InfoEntrenadoresComponent } from './info-entrenadores/info-entrenadores.component';
import { PerfilEntrenadorComponent } from './perfil-entrenador/perfil-entrenador.component';
import { SessionPdfComponent } from './menu-entrenador/session-pdf/session-pdf.component';
import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';
import { SuscripcionClubComponent } from './suscripcion-club/suscripcion-club.component';
import { WizardFamiliaComponent } from './suscripcion-club/wizard-familia/wizard-familia.component';
import { WizardClubComponent } from './suscripcion-club/wizard-club/wizard-club.component';
import { WizardGratuitoComponent } from './suscripcion-club/wizard-gratuito/wizard-gratuito.component';
import { FeatureLockModalComponent } from './suscripcion-club/feature-lock-modal/feature-lock-modal.component';
import { DebriefTrainingComponent } from './debrief/debrief-training/debrief-training.component';
import { DebriefMatchComponent } from './debrief/debrief-match/debrief-match.component';
import { DebriefReportComponent } from './debrief/debrief-report/debrief-report.component';
import { DebriefHistoryComponent } from './debrief/debrief-history/debrief-history.component';
import { FormBuilderComponent } from './shared/form-builder/form-builder.component';
import { FormRendererComponent } from './shared/form-renderer/form-renderer.component';
import { AdminRegistrosComponent } from './admin-registros/admin-registros.component';
import { AdminActivityComponent } from './admin-activity/admin-activity.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

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
    InfoEquipoComponent,
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
    FavoritasComponent,
    HistorialComponent,
    MisTareasComponent,
    TacticalBoardComponent,
    OpcionesjugadorComponent,
    HorariosequiposComponent,
    EntrenamientosCreadosComponent,
    PuntuacionEquipsComponent,
    GraficaCuotasComponent,
    GoleadoresComponent,
    MenuEntrenadorComponent,
    InicioDeportesComponent,
    PartidosEntrevistasComponent,
    MenuClubComponent,
    ClasificacionResultadosComponent,
    DocumentosClubComponent,
    DocumentosJugadorComponent,
    DocumentosEntrenadorComponent,
    NewCuotasComponent,
    HistorialPagosClubComponent,
    InicioFederacionComponent,
    InfoJugadoresFederacionComponent,
    NotificacionesFederacionComponent,
    ListadoClubesComponent,
    EquiposComponent,
    LogoSpinnerComponent,
    FooterComponent,
    AdminClubesComponent,
    AdminClubDetailComponent,
    AdminInicioComponent,
    SugerenciasClubComponent,
    AdminSugerenciasComponent,
    AdminChartsComponent,
    AdminAiInsightsComponent,
    PlayerInfoDialogComponent,
    CalendarioClubComponent,
    AsistenteIaComponent,
    AsistenteIaCoachComponent,
    AiFabComponent,
    Nl2brPipe,
    LesionesComponent,
    LesionesEquipoComponent,
    LesionesClubComponent,
    InfoEntrenadoresComponent,
    PerfilEntrenadorComponent,
    SessionPdfComponent,
    EmptyStateComponent,
    SuscripcionClubComponent,
    WizardFamiliaComponent,
    WizardClubComponent,
    WizardGratuitoComponent,
    FeatureLockModalComponent,
    DebriefTrainingComponent,
    DebriefMatchComponent,
    DebriefReportComponent,
    DebriefHistoryComponent,
    FormBuilderComponent,
    FormRendererComponent,
    AdminRegistrosComponent,
    AdminActivityComponent,
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgxDatatableModule,
    HttpClientModule,
    TranslateModule,
    DragDropModule,
    MatDialogModule,
  ]
})
export class DashboardModule { }
