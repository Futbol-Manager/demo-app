import { NgModule } from '@angular/core';
import { MarkdownAiPipe } from './pipes/markdown.pipe';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
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
import { AbonadosComponent } from './abonados/abonados.component';
import { AsistenciaComponent } from './asistencia/asistencia.component';
import { PatrocinadoresComponent } from './patrocinadores/patrocinadores.component';
import { PublicidadComponent } from './publicidad/publicidad.component';
import { NotificacionesComponent } from './notificaciones/notificaciones.component';
import { TareasComponent } from './tareas/tareas.component';
import { FavoritasComponent } from './tareas/favoritas/favoritas.component';
import { HistorialComponent } from './tareas/historial/historial.component';
import { MisTareasComponent } from './tareas/mis-tareas/mis-tareas.component';
import { TacticalBoardComponent } from './tareas/tactical-board/tactical-board.component';
import { TareasCatalogComponent } from './tareas/tareas-catalog/tareas-catalog.component';
import { TacticalBoardEditorComponent } from './tactical-board-editor/tactical-board-editor.component';
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
import { DocumentPreviewDialogComponent } from './document-preview-dialog/document-preview-dialog.component';
import { DocumentosJugadorComponent } from './documentos-jugador/documentos-jugador.component';
import { DocumentosEntrenadorComponent } from './documentos-entrenador/documentos-entrenador.component';
import { NewCuotasComponent } from './new-cuotas/new-cuotas.component';
import { HistorialPagosClubComponent } from './historial-pagos-club/historial-pagos-club.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateModule } from '@ngx-translate/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { QRCodeModule } from 'angularx-qrcode';
import { EquiposComponent } from './equipos/equipos.component';
import { SugerenciasClubComponent } from './sugerencias-club/sugerencias-club.component';
import { LogoSpinnerComponent } from '../shared/logo-spinner/logo-spinner.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { InfoEquipoComponent } from './info-equipo/info-equipo.component';
import { CalendarioClubComponent } from './calendario-club/calendario-club.component';
import { AsistenteIaComponent, Nl2brPipe } from './asistente-ia/asistente-ia.component';
import { AsistenteIaCoachComponent } from './asistente-ia-coach/asistente-ia-coach.component';
import { PlayerInfoDialogComponent } from './player-info-dialog/player-info-dialog.component';
import { AiFabComponent } from './ai-fab/ai-fab.component';
import { LesionesComponent } from './lesiones/lesiones.component';
import { LesionesEquipoComponent } from './lesiones/lesiones-equipo.component';
import { BodyMapAnatomicalComponent } from './lesiones/body-map-anatomical.component';
import { LesionesClubComponent } from './lesiones-club/lesiones-club.component';
import { MatDialogModule } from '@angular/material/dialog';
import { InfoEntrenadoresComponent } from './info-entrenadores/info-entrenadores.component';
import { PerfilEntrenadorComponent } from './perfil-entrenador/perfil-entrenador.component';
import { SessionPdfComponent } from './menu-entrenador/session-pdf/session-pdf.component';
import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';
import { DashboardCardComponent } from '../shared/dashboard-card/dashboard-card.component';
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
import { CreditsModalComponent } from './credits-modal/credits-modal.component';
import { AiCreditsSuccessComponent } from './ai-credits-success/ai-credits-success.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { AiActionPreviewComponent } from './shared/ai-action-preview/ai-action-preview.component';
import { ScoutingClubComponent } from './scouting-club/scouting-club.component';
import { ScoutingPlayerProfileComponent } from './scouting-player-profile/scouting-player-profile.component';
import { VideoPlansModalComponent } from './video-plans-modal/video-plans-modal.component';
import { VideoUploadModalComponent } from './video-upload-modal/video-upload-modal.component';
import { ClubVideoLibraryComponent } from './club-video-library/club-video-library.component';
import { VideoPlanSuccessComponent } from './video-plan-success/video-plan-success.component';
import { SuscripcionCoachComponent } from './suscripcion-coach/suscripcion-coach.component';
import { CoachSuscripcionSuccessComponent } from './coach-suscripcion-success/coach-suscripcion-success.component';
import { FormTemplateSelectorComponent } from './shared/form-template-selector/form-template-selector.component';
import { FormTemplatesComponent } from './debrief/form-templates/form-templates.component';
import { PaymentTableComponent } from './new-cuotas/components/payment-table/payment-table.component';
import { PaymentFormModalComponent } from './new-cuotas/components/payment-form-modal/payment-form-modal.component';
import { ImputePaymentModalComponent } from './new-cuotas/components/impute-payment-modal/impute-payment-modal.component';
import { PaymentHistoryModalComponent } from './new-cuotas/components/payment-history-modal/payment-history-modal.component';
import { SubscriptionManagerComponent } from './new-cuotas/components/subscription-manager/subscription-manager.component';
import { ChargeSavedCardModalComponent } from './new-cuotas/components/charge-saved-card-modal/charge-saved-card-modal.component';
import { ExportButtonComponent } from './new-cuotas/components/export-button/export-button.component';
import { AutomaticPaymentsComponent } from './new-cuotas/components/automatic-payments/automatic-payments.component';
import { NotificationBellComponent } from './shared/notification-bell/notification-bell.component';
import { VideoAnalysisHubComponent } from './video-analysis/hub/video-analysis-hub.component';
import { VideoAnalysisWorkspaceComponent } from './video-analysis/workspace/video-analysis-workspace.component';
import { TemplateListComponent } from './video-analysis/templates/template-list.component';
import { TemplateEditorComponent } from './video-analysis/templates/template-editor.component';
import { VideoPlayerComponent } from './video-analysis/workspace/video-player/video-player.component';
import { AnalysisTimelineComponent } from './video-analysis/workspace/analysis-timeline/analysis-timeline.component';
import { TaggingPanelComponent } from './video-analysis/workspace/tagging-panel/tagging-panel.component';
import { EventListComponent } from './video-analysis/workspace/event-list/event-list.component';
import { DrawingOverlayComponent } from './video-analysis/workspace/drawing-overlay/drawing-overlay.component';
import { FieldPositionComponent } from './video-analysis/workspace/field-position/field-position.component';
import { HeatmapVisualizerComponent } from './video-analysis/heatmap/heatmap-visualizer.component';
import { PlaylistBuilderComponent } from './video-analysis/playlists/playlist-builder.component';
import { PlaylistViewerComponent } from './video-analysis/playlists/playlist-viewer.component';
import { AiReportGeneratorComponent } from './video-analysis/reports/ai-report-generator.component';
import { CanvasTaggerWindowComponent } from './video-analysis/canvas-tagger-window/canvas-tagger-window.component';
import { ScreenCaptureWorkspaceComponent } from './video-analysis/screen-capture/screen-capture-workspace.component';
import { ExternalVideoWorkspaceComponent } from './video-analysis/external-workspace/external-video-workspace.component';
import { ClipAnnotationEditorComponent } from './video-analysis/workspace/clip-annotation-editor/clip-annotation-editor.component';
import { IndividualTrainingComponent } from './individual-training/individual-training.component';
import { RopaJugadorComponent } from './ropa-jugador/ropa-jugador.component';
import { StaffClubComponent } from './staff-club/staff-club.component';
import { ModalBackdropDirective } from './shared/modal-backdrop.directive';
import { PlanificadorSemanalIaComponent } from './planificador-semanal-ia/planificador-semanal-ia.component';
import { RopaCatalogoComponent } from './ropa/ropa-catalogo/ropa-catalogo.component';
import { RopaTablaCartalogComponent } from './ropa/ropa-tabla-catalogo/ropa-tabla-catalogo.component';
import { TaskEditModalComponent } from './task-edit-modal/task-edit-modal.component';
import { ClubShopComponent } from './club-shop/club-shop.component';
import { ClubPostComponent } from './club-post/club-post.component';
import { PostGeneratorModalComponent } from './club-post/post-generator-modal/post-generator-modal.component';
// --- Componentes portados desde rep-futbol (paridad de funcionalidad) ---
import { AbonadoDetailComponent } from './abonado-detail/abonado-detail.component';
import { CarnetTabComponent } from './abonado-detail/components/carnet-tab/carnet-tab.component';
import { ComunicacionesTabComponent } from './abonado-detail/components/comunicaciones-tab/comunicaciones-tab.component';
import { DocumentosTabComponent } from './abonado-detail/components/documentos-tab/documentos-tab.component';
import { FamiliaresTabComponent } from './abonado-detail/components/familiares-tab/familiares-tab.component';
import { AccessControlComponent } from './access-control/access-control.component';
import { AccessKioskoComponent } from './access-control/kiosko/access-kiosko.component';
import { AccessHistoryCardComponent } from './access-history-card/access-history-card.component';
import { ActivityScheduleTimesComponent } from './activity-schedule/activity-schedule-times.component';
import { AgendaMedicaComponent } from './agenda-medica/agenda-medica.component';
import { AyudaComponent } from './ayuda/ayuda.component';
import { ClubClasificacionesComponent } from './club-clasificaciones/club-clasificaciones.component';
import { ClubEvalCompareComponent } from './club-eval/club-eval-compare/club-eval-compare.component';
import { ClubEvalConfigComponent } from './club-eval/club-eval-config/club-eval-config.component';
import { ClubEvalFormComponent } from './club-eval/club-eval-form/club-eval-form.component';
import { ClubEvalPlayerComponent } from './club-eval/club-eval-player/club-eval-player.component';
import { ClubEvalSessionComponent } from './club-eval/club-eval-session/club-eval-session.component';
import { ClubEvalComponent } from './club-eval/club-eval.component';
import { ClubNewsModalComponent } from './club-news-modal/club-news-modal.component';
import { DiarioMedicoEquipoComponent } from './diario-medico/diario-medico-equipo.component';
import { DisponibilidadEquipoComponent } from './disponibilidad/disponibilidad-equipo.component';
import { DocumentosAbonadosComponent } from './documentos-abonados/documentos-abonados.component';
import { DuplicatesModalComponent } from './duplicates-modal/duplicates-modal.component';
import { EncuestasComponent } from './encuestas/encuestas.component';
import { EntrenamientosComponent } from './entrenamientos/entrenamientos.component';
import { MethodologyTrainingsComponent } from './entrenamientos/metodologias/methodology-trainings/methodology-trainings.component';
import { MetodologiasComponent } from './entrenamientos/metodologias/metodologias.component';
import { ClubTaskFormComponent } from './entrenamientos-club/club-task-form/club-task-form.component';
import { EntrenamientosClubComponent } from './entrenamientos-club/entrenamientos-club.component';
import { FinanzasClubComponent } from './finanzas-club/finanzas-club.component';
import { HelpFabComponent } from './help-fab/help-fab.component';
import { HorariosEquipoComponent } from './horarios-equipo/horarios-equipo.component';
import { InformeDiarioComponent } from './informe-diario/informe-diario.component';
import { ListadoClubesComponent } from './listado-clubes/listado-clubes.component';
import { MaterialEquipoComponent } from './material/material-equipo.component';
import { MenuLayoutEditorComponent } from './menu-layout-editor/menu-layout-editor.component';
import { AbonadoCarnetComponent } from './mi-abonado/abonado-carnet/abonado-carnet.component';
import { MiAbonadoComponent } from './mi-abonado/mi-abonado.component';
import { MiAbonadoDocumentosComponent } from './mi-abonado-documentos/mi-abonado-documentos.component';
import { MiAbonadoNotificacionesComponent } from './mi-abonado-notificaciones/mi-abonado-notificaciones.component';
import { MiTemporadaComponent } from './mi-temporada/mi-temporada.component';
import { MicrociclosComponent } from './microciclos/microciclos.component';
import { NutricionJugadorComponent } from './nutricion/nutricion-jugador.component';
import { NutricionEquipoComponent } from './nutricion-equipo/nutricion-equipo.component';
import { PanelDiarioComponent } from './panel-diario/panel-diario.component';
import { PermisosClubComponent } from './permisos-club/permisos-club.component';
import { PhysicalAssessmentComponent } from './physical-assessment/physical-assessment.component';
import { PlanesComponent } from './planes/planes.component';
import { ReadaptacionEquipoComponent } from './readaptacion/readaptacion-equipo.component';
import { RpeCargaSemanalComponent } from './rpe/carga-semanal.component';
import { MonthlyPlanWizardComponent } from './rrss/monthly-plan-wizard/monthly-plan-wizard.component';
import { PostEditorModalComponent } from './rrss/post-editor-modal/post-editor-modal.component';
import { RrssCalendarComponent } from './rrss/rrss-calendar/rrss-calendar.component';
import { RrssCommentsComponent } from './rrss/rrss-comments/rrss-comments.component';
import { RrssMatchPostComponent } from './rrss/rrss-match-post/rrss-match-post.component';
import { RrssPostsComponent } from './rrss/rrss-posts/rrss-posts.component';
import { RrssSettingsComponent } from './rrss/rrss-settings/rrss-settings.component';
import { RrssComponent } from './rrss/rrss.component';
import { ScanCarnetComponent } from './scan-carnet/scan-carnet.component';
import { SportAlertBannerComponent } from './sport-alert-banner/sport-alert-banner.component';
import { SportOnboardingComponent } from './sport-onboarding/sport-onboarding.component';
import { TaskPickerModalComponent } from './tareas/task-picker-modal/task-picker-modal.component';
import { TrainingScheduleEditorComponent } from './training-schedule/training-schedule-editor.component';
import { WellnessEquipoComponent } from './wellness/wellness-equipo.component';
import { AbonadoEstadoModalComponent } from '../shared/abonado-estado-modal/abonado-estado-modal.component';
import { AvatarCropperComponent } from '../ui/avatar-cropper/avatar-cropper.component';
import { ClubRegisterFormBuilderComponent } from './club-register-form-builder/club-register-form-builder.component';
import { ClubAbonadoFormBuilderComponent } from './club-abonado-form-builder/club-abonado-form-builder.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    DashboardComponent,
    HeaderComponent,
    SidebarComponent,
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
    RopaCatalogoComponent,
    RopaTablaCartalogComponent,
    CuadroComponent,
    InfoJugadoresComponent,
    EstadisticasJugadoresClubComponent,
    EstadisticasEquiposClubComponent,
    EstadisticasEntrenadoresClubComponent,
    SuscripcionComponent,
    ScoutingPlayerComponent,
    AbonadosComponent,
    AsistenciaComponent,
    PatrocinadoresComponent,
    PublicidadComponent,
    NotificacionesComponent,
    TareasComponent,
    FavoritasComponent,
    HistorialComponent,
    MisTareasComponent,
    TacticalBoardComponent,
    TacticalBoardEditorComponent,
    TareasCatalogComponent,
    OpcionesjugadorComponent,
    HorariosequiposComponent,
    EntrenamientosCreadosComponent,
    PuntuacionEquipsComponent,
    GraficaCuotasComponent,
    GoleadoresComponent,
    MenuEntrenadorComponent,
    MenuFisioComponent,
    InicioDeportesComponent,
    PartidosEntrevistasComponent,
    MenuClubComponent,
    ClasificacionResultadosComponent,
    DocumentosClubComponent,
    DocumentPreviewDialogComponent,
    DocumentosJugadorComponent,
    DocumentosEntrenadorComponent,
    NewCuotasComponent,
    HistorialPagosClubComponent,
    EquiposComponent,
    LogoSpinnerComponent,
    FooterComponent,
    SugerenciasClubComponent,
    PlayerInfoDialogComponent,
    CalendarioClubComponent,
    AsistenteIaComponent,
    AsistenteIaCoachComponent,
    AiFabComponent,
    Nl2brPipe,
    MarkdownAiPipe,
    LesionesComponent,
    LesionesEquipoComponent,
    LesionesClubComponent,
    BodyMapAnatomicalComponent,
    InfoEntrenadoresComponent,
    PerfilEntrenadorComponent,
    SessionPdfComponent,
    EmptyStateComponent,
    DashboardCardComponent,
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
    CreditsModalComponent,
    AiCreditsSuccessComponent,
    ConfirmDialogComponent,
    AiActionPreviewComponent,
    ScoutingClubComponent,
    ScoutingPlayerProfileComponent,
    VideoPlansModalComponent,
    VideoUploadModalComponent,
    ClubVideoLibraryComponent,
    VideoPlanSuccessComponent,
    SuscripcionCoachComponent,
    CoachSuscripcionSuccessComponent,
    TaskEditModalComponent,
    FormTemplateSelectorComponent,
    FormTemplatesComponent,
    PaymentTableComponent,
    PaymentFormModalComponent,
    ImputePaymentModalComponent,
    PaymentHistoryModalComponent,
    SubscriptionManagerComponent,
    ChargeSavedCardModalComponent,
    ExportButtonComponent,
    NotificationBellComponent,
    AutomaticPaymentsComponent,
    VideoAnalysisHubComponent,
    VideoAnalysisWorkspaceComponent,
    TemplateListComponent,
    TemplateEditorComponent,
    VideoPlayerComponent,
    AnalysisTimelineComponent,
    TaggingPanelComponent,
    EventListComponent,
    DrawingOverlayComponent,
    FieldPositionComponent,
    HeatmapVisualizerComponent,
    PlaylistBuilderComponent,
    PlaylistViewerComponent,
    AiReportGeneratorComponent,
    CanvasTaggerWindowComponent,
    ScreenCaptureWorkspaceComponent,
    ExternalVideoWorkspaceComponent,
    ClipAnnotationEditorComponent,
    StaffClubComponent,
    IndividualTrainingComponent,
    RopaJugadorComponent,
    ModalBackdropDirective,
    PlanificadorSemanalIaComponent,
    ClubShopComponent,
    ClubPostComponent,
    PostGeneratorModalComponent,
    // --- Componentes portados desde rep-futbol (paridad de funcionalidad) ---
    AbonadoDetailComponent,
    CarnetTabComponent,
    ComunicacionesTabComponent,
    DocumentosTabComponent,
    FamiliaresTabComponent,
    AccessControlComponent,
    AccessKioskoComponent,
    AccessHistoryCardComponent,
    ActivityScheduleTimesComponent,
    AgendaMedicaComponent,
    AyudaComponent,
    ClubClasificacionesComponent,
    ClubEvalCompareComponent,
    ClubEvalConfigComponent,
    ClubEvalFormComponent,
    ClubEvalPlayerComponent,
    ClubEvalSessionComponent,
    ClubEvalComponent,
    ClubNewsModalComponent,
    ClubRegisterFormBuilderComponent,
    ClubAbonadoFormBuilderComponent,
    DiarioMedicoEquipoComponent,
    DisponibilidadEquipoComponent,
    DocumentosAbonadosComponent,
    DuplicatesModalComponent,
    EncuestasComponent,
    EntrenamientosComponent,
    MethodologyTrainingsComponent,
    MetodologiasComponent,
    ClubTaskFormComponent,
    EntrenamientosClubComponent,
    FinanzasClubComponent,
    HelpFabComponent,
    HorariosEquipoComponent,
    InformeDiarioComponent,
    ListadoClubesComponent,
    MaterialEquipoComponent,
    MenuLayoutEditorComponent,
    AbonadoCarnetComponent,
    MiAbonadoComponent,
    MiAbonadoDocumentosComponent,
    MiAbonadoNotificacionesComponent,
    MiTemporadaComponent,
    MicrociclosComponent,
    NutricionJugadorComponent,
    NutricionEquipoComponent,
    PanelDiarioComponent,
    PermisosClubComponent,
    PhysicalAssessmentComponent,
    PlanesComponent,
    ReadaptacionEquipoComponent,
    RpeCargaSemanalComponent,
    MonthlyPlanWizardComponent,
    PostEditorModalComponent,
    RrssCalendarComponent,
    RrssCommentsComponent,
    RrssMatchPostComponent,
    RrssPostsComponent,
    RrssSettingsComponent,
    RrssComponent,
    ScanCarnetComponent,
    SportAlertBannerComponent,
    SportOnboardingComponent,
    TaskPickerModalComponent,
    TrainingScheduleEditorComponent,
    WellnessEquipoComponent,
    AbonadoEstadoModalComponent,
    AvatarCropperComponent,
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
    SharedModule,
    QRCodeModule,
  ]
})
export class DashboardModule { }
