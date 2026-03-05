import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { CorreoEnviado } from 'src/app/core/services/models/club.model';
import { Response } from 'src/app/core/services/models/response.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { Location } from '@angular/common';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
declare var $: any; // Declaración para usar jQuery

interface RecipientChip {
  id: string;
  type: 'user' | 'team';
  label: string;
  sublabel: string;
  userId?: number;
  teamId?: number;
  playerId?: number;
  role?: string;
  hasAccount?: boolean;
  photoUrl?: string;
}

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss'],
})
export class NotificacionesComponent implements OnInit {
  @ViewChild('recipientInputEl') recipientInputEl?: ElementRef<HTMLInputElement>;

  datosCargados = false;
  usuarioActual!: User | null;
  clubId!: number;
  userId!: number;
  correoSelected: {
    destinatarios: string;
    asunto: string;
    body: string;
    remitente: string;
    destinatario: string;
    fechaCreate: string;
    remitentePhotoUrl?: string | null;
  } = {
    destinatarios: '',
    asunto: '',
    body: '',
    remitente: '',
    destinatario: '',
    fechaCreate: '',
  };

  correosEnviadosSinFiltro: any = [];
  correosRecibidosSinFiltro: any = [];
  correosSinFiltro: any = [];
  selectCorreo: boolean = false;
  correos = [...this.correosSinFiltro];
  loadingCorreos: boolean = true;
  receivedCount: number = 0;

  showModal = false;
  showBtn = true;
  showModalNew = false;

  listTeamsForCombo: any[] = [];
  correoNew: CorreoEnviado = new CorreoEnviado({});

  // ── Selector de destinatarios estilo Gmail ──
  selectedRecipients: RecipientChip[] = [];
  recipientInput = '';
  recipientSuggestions: any[] = [];
  isSearchingRecipients = false;
  private searchTimeout: any;

  isSending: boolean = false;
  readonly imageBaseUrl = environment.images + 'user/';

  // ── Envío programado ──
  isScheduleMode = false;
  scheduledAt = '';
  showScheduleDropdown = false;
  get minScheduledAt(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    return d.toISOString().slice(0, 16);
  }

  // ── Carpeta Programados ──
  correosProgramados: any[] = [];
  loadingProgramados = false;
  cancelScheduleConfirm: { show: boolean; id: number | null } = { show: false, id: null };
  editingScheduledId: number | null = null;
  isEditingScheduled = false;

  // ── Modal de invitación a Sphaira Player ──
  inviteModal: {
    show: boolean;
    player: any | null;
    email: string;
    sending: boolean;
    result: 'success' | 'error' | null;
  } = { show: false, player: null, email: '', sending: false, result: null };

  currentFolder: 'inbox' | 'sent' | 'scheduled' = 'inbox';
  currentFilter: 'all' | 'read' | 'unread' = 'all';
  searchQuery = '';
  showDeleteConfirm = false;
  correoToDelete: any = null;
  deleteIndex = -1;
  deleteOption = 0; // 0 = enviado, 1 = recibido
  sendSuccess = false;
  temporadaStoredValue = getCurrentSeasonString();

  constructor(
    private loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private http: HttpClient,
    private clubService: ClubService,
    private registerService: RegisterService,
    private location: Location,
    private tutorialService: TutorialService,
  ) { }

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('notificaciones', true), 600);

    this.loadingCorreos = true;
    if (
      localStorage.getItem('temporada') != null &&
      localStorage.getItem('temporada') != undefined
    ) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual?.userId ?? 0;
      if (this.userId === 9) {
        this.userId = Number(localStorage.getItem('userId')) || this.userId;
      }
      this.route.params.subscribe((params) => {
        const paramUserId = params['userId'];
        // Normalizar siempre por usuario logueado: si viene userId en la ruta, lo usamos,
        // y si no, usamos el userId obtenido del login. El clubId ya no se usa para filtrar correos.
        if (paramUserId != null && paramUserId !== '') {
          this.userId = +paramUserId;
        }
        this.clubId = 0;
        this.loadCorreosByUser(this.userId);
      });
    });
  }

  private loadCorreosByUser(userId: number): void {
    this.loadingCorreos = true;
    this.loadCorreosProgramados();
    this.clubService.getListCorreos(userId).subscribe(
      (response: Response) => {
        this.selectCorreo = false;
        const data: any = response?.data;
        if (data && typeof data === 'object') {
          this.correosEnviadosSinFiltro = data.enviados ?? [];
          this.correosRecibidosSinFiltro = data.recibidos ?? [];
          this.correos = data.recibidos ?? [];
          this.receivedCount = this.correosRecibidosSinFiltro.filter((c: any) => c.leido === 0).length;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.loadingCorreos = false;
        this.initSummernote();
      },
      (error) => {
        console.error('Error al cargar el listado de notificaciones', error);
        this.loadingCorreos = false;
      },
    );
    this.loadTeamsComboIfNeeded();
  }

  /** Carga correos cuando se entra como club (por clubId). */
  private loadCorreosByClub(clubId: number): void {
    this.loadingCorreos = true;
    this.loadCorreosProgramados();
    this.clubService.getListCorreosByClub(clubId).subscribe(
      (response: Response) => {
        this.selectCorreo = false;
        const data: any = response?.data;
        if (data && typeof data === 'object') {
          this.correosEnviadosSinFiltro = data.enviados ?? [];
          this.correosRecibidosSinFiltro = data.recibidos ?? [];
          this.correos = data.recibidos ?? [];
          this.receivedCount = this.correosRecibidosSinFiltro.filter((c: any) => c.leido === 0).length;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.loadingCorreos = false;
        this.initSummernote();
      },
      (error) => {
        console.error('Error al cargar el listado de notificaciones (club). Fallback a usuario.', error);
        this.loadingCorreos = false;

        // Si falla la carga por club (por ejemplo, club no encontrado o sin usuario asociado),
        // hacemos fallback a las notificaciones por usuario para no dejar la vista vacía.
        if (this.userId) {
          this.loadCorreosByUser(this.userId);
        }
      },
    );
    this.loadTeamsComboIfNeeded();
  }

  private loadTeamsComboIfNeeded(): void {

    if (this.clubId == 0) {
      this.clubService.getClubByUserId(this.userId).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== 0) {
            this.clubId = response.data;
            this.teamService
              .getTeamsByClubForCombo2(
                this.clubId,
                this.temporadaStoredValue,
                this.userId,
              )
              .subscribe(
                (response: Response) => {
                  // Verifica que la propiedad 'data' exista en la respuesta
                  if (response.data !== null) {
                    this.listTeamsForCombo = response.data;
                  } else {
                    console.error(
                      'La respuesta del servicio no tiene la estructura esperada',
                      response,
                    );
                  }
                },
                (error) => {
                  console.error('Error al cargar el listado de equipos', error);
                },
              );
          } else {
            console.error(
              'La respuesta del servicio no tiene la estructura esperada',
              response,
            );
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        },
      );
    } else {
      this.teamService
        .getTeamsByClubForCombo2(
          this.clubId,
          this.temporadaStoredValue,
          this.userId,
        )
        .subscribe(
          (response: Response) => {
            // Verifica que la propiedad 'data' exista en la respuesta
            if (response.data !== null) {
              this.listTeamsForCombo = response.data;
            } else {
              console.error(
                'La respuesta del servicio no tiene la estructura esperada',
                response,
              );
            }
          },
          (error) => {
            console.error('Error al cargar el listado de equipos', error);
          },
        );
    }
  }

  goBack(): void {
    this.location.back();
  }
  recalcularNoLeidos() {
    this.receivedCount = this.correosRecibidosSinFiltro.filter((c: any) => c.leido === 0).length;
  }

  /** Lista de correos filtrada por búsqueda (asunto, remitente/destinatario) */
  get correosFiltered(): any[] {
    if (!this.searchQuery.trim()) return this.correos;
    const q = this.searchQuery.trim().toLowerCase();
    return this.correos.filter((c: any) => {
      const from = (this.currentFolder === 'inbox' ? c.remitente : c.destinatario) || '';
      return (c.asunto || '').toLowerCase().includes(q) || from.toLowerCase().includes(q);
    });
  }

  /** Si hay no leídos en inbox (para mostrar "Marcar todos como leídos") */
  get hasUnreadInInbox(): boolean {
    return this.currentFolder === 'inbox' && this.receivedCount > 0;
  }

  /** Formato de fecha relativo: Hoy HH:mm, Ayer, o día mes */
  formatDate(fechaStr: string): string {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (dOnly.getTime() === today.getTime()) {
      return `Hoy ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    if (dOnly.getTime() === yesterday.getTime()) return 'Ayer';
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  /** Marcar todos los recibidos como leídos */
  markAllAsRead(): void {
    const unread = this.correosRecibidosSinFiltro.filter((c: any) => c.leido === 0);
    if (unread.length === 0) return;
    let done = 0;
    unread.forEach((c: any) => {
      this.clubService.openCorreoRecibido(c.correoRecibidoId).subscribe({
        next: () => {
          c.leido = 1;
          if (++done === unread.length) this.recalcularNoLeidos();
        },
        error: () => { if (++done === unread.length) this.recalcularNoLeidos(); }
      });
    });
  }

  /** Marcar un mensaje como leído sin abrirlo (solo inbox) */
  markAsRead(correo: any, event: Event): void {
    event.stopPropagation();
    if (this.currentFolder !== 'inbox' || correo.leido === 1) return;
    this.clubService.openCorreoRecibido(correo.correoRecibidoId).subscribe({
      next: () => {
        const idx = this.correos.findIndex((c: any) => c.correoRecibidoId === correo.correoRecibidoId);
        if (idx !== -1) this.correos[idx].leido = 1;
        this.recalcularNoLeidos();
      },
      error: (err) => console.error(err)
    });
  }

  /** Abre el modal de confirmación de eliminación */
  openDeleteConfirm(correo: any, index: number, event: Event): void {
    event.stopPropagation();
    this.correoToDelete = correo;
    this.deleteIndex = index;
    this.deleteOption = this.showBtn ? 1 : 0;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.correoToDelete = null;
    this.deleteIndex = -1;
  }

  /** Indica si el correo es el actualmente seleccionado en el panel de lectura */
  isActiveCorreo(correo: any): boolean {
    if (!this.correoSelected) return false;
    const sel = this.correoSelected as any;
    if (this.currentFolder === 'inbox') return correo.correoRecibidoId === sel.correoRecibidoId;
    return correo.correoEnviadoId === sel.correoEnviadoId;
  }

  confirmDelete(): void {
    if (this.correoToDelete == null) return;
    const id = this.deleteOption === 1 ? this.correoToDelete.correoRecibidoId : this.correoToDelete.correoEnviadoId;
    this.clubService.deleteCorreo(id, this.deleteOption).subscribe({
      next: (response: Response) => {
        if (response.data !== 0) {
          const idx = this.correos.findIndex((c: any) =>
            this.deleteOption === 1 ? c.correoRecibidoId === this.correoToDelete.correoRecibidoId : c.correoEnviadoId === this.correoToDelete.correoEnviadoId
          );
          if (idx !== -1) this.correos.splice(idx, 1);
          if (this.deleteOption === 1) this.recalcularNoLeidos();
        }
        this.cancelDelete();
      },
      error: () => this.cancelDelete()
    });
  }
  /**
   * Inicializa el editor Summernote
   */
  private initSummernote(): void {
    $('#summernote').summernote({
      placeholder: 'Escribe tu mensaje aquí...',
      tabsize: 2,
      dialogsInBody: true,
      disableDragAndDrop: true,
      height: 400,
      callbacks: {
        onChange: (contents: string) => {
          this.correoSelected.body = contents; // Actualiza el contenido en tiempo real
        },
      },
    });
  }

  /**
   * Destruye el editor Summernote
   */
  private destroySummernote(): void {
    if ($('#summernote').data('summernote')) {
      $('#summernote').summernote('destroy');
    }
  }

  /**
   * Inicializa el editor Summernote
   */
  private initSummernoteNew(): void {
    $('#summernoteNew').summernote({
      lang: 'es-ES',
      height: 400,
      dialogsInBody: true,
      disableDragAndDrop: true,
      callbacks: {
        onDialogShown: () => {
          $('.note-modal').css('z-index', 2000);
          $('.note-modal-backdrop').css('z-index', 1990);
          $('.note-modal-title').text('Insertar imagen');
        },
        onChange: (contents: string) => {
          this.correoNew.body = contents;
        },
      },
    });
  }

  /**
   * Destruye el editor Summernote
   */
  private destroySummernoteNew(): void {
    if ($('#summernoteNew').data('summernote')) {
      $('#summernoteNew').summernote('destroy');
    }
  }

  ngOnDestroy(): void {
    this.destroySummernote(); // Limpia Summernote al destruir el componente
  }

  destinatariosString(destinatarios: string[]): string {
    let correos = '';
    for (let index = 0; index < destinatarios.length; index++) {
      correos += destinatarios[index] + '; ';
    }
    return correos;
  }

  irAPantalla(id: number): void {
    switch (id) {
      case 1:
        this.router.navigate(['/dashboard/inicio']);
        break;
    }
  }

  mostrarEnviados() {
    this.showBtn = false;
    this.currentFolder = 'sent';
    this.correos = this.correosEnviadosSinFiltro;
  }

  mostrarRecibidos() {
    this.showBtn = true;
    this.currentFolder = 'inbox';
    this.correos = this.correosRecibidosSinFiltro;
  }

  filtrarCorreos(tipo: string) {
  }

  /**
   * Abre el correo y carga el contenido en Summernote
   * @param correo - Objeto del correo seleccionado
   */
  openCorreo(correo: any): void {
    let decodedBody = correo.body;
    if (this.isBase64(correo.body)) decodedBody = this.decodeBase64(correo.body);
    this.correoSelected = { ...correo, body: decodedBody };
    this.selectCorreo = true;

    if (this.currentFolder === 'inbox' && correo.leido === 0) {
      this.clubService.openCorreoRecibido(correo.correoRecibidoId).subscribe({
        next: () => {
          const idx = this.correos.findIndex((c: any) => c.correoRecibidoId === correo.correoRecibidoId);
          if (idx !== -1) this.correos[idx].leido = 1;
          this.recalcularNoLeidos();
        },
        error: (err) => console.error(err),
      });
    }
  }

  /**
   * Decodifica el contenido en Base64 y lo carga en Summernote
   * @param base64String - Contenido codificado en Base64
   * @returns Contenido decodificado
   */
  private decodeBase64(base64String: string): string {
    try {
      return atob(base64String);
    } catch (error) {
      console.error('Error al decodificar Base64:', error);
      return ''; // Devuelve un string vacío en caso de error
    }
  }

  mostrarTodos() {
    this.currentFilter = 'all';
    this.currentFolder = 'inbox';
    this.correos = [...this.correosRecibidosSinFiltro];
  }

  mostrarLeidos() {
    this.currentFilter = 'read';
    this.currentFolder = 'inbox';
    this.correos = [...this.correosRecibidosSinFiltro];
    this.correos = this.correos.filter((correo) => correo.leido === 1);
  }

  mostrarNoLeidos() {
    this.currentFilter = 'unread';
    this.currentFolder = 'inbox';
    this.correos = [...this.correosRecibidosSinFiltro];
    this.correos = this.correos.filter((correo) => correo.leido === 0);
  }

  cerrarModal() {
    this.showModal = false;
    this.destroySummernote(); // Destruye Summernote al cerrar el modal
    this.correoSelected = {
      destinatarios: '',
      asunto: '',
      body: '',
      remitente: '',
      destinatario: '',
      fechaCreate: '',
    }; // Limpia la selección si es necesario
  }
  cerrarLectura() {
    this.selectCorreo = false;
  }

  // ── Métodos del selector de destinatarios Gmail-style ──────────────────────

  focusRecipientInput(): void {
    this.recipientInputEl?.nativeElement.focus();
  }

  onRecipientInputChange(): void {
    clearTimeout(this.searchTimeout);
    const q = this.recipientInput.trim();
    if (q.length < 2) {
      this.recipientSuggestions = [];
      return;
    }

    // Sugerencias de equipos completos (de la lista ya cargada)
    const qLow = q.toLowerCase();
    const teamSuggestions = this.listTeamsForCombo
      .filter((t: any) => t.name?.toLowerCase().includes(qLow))
      .slice(0, 2)
      .map((t: any) => ({
        type: 'team',
        teamId: +t.value,
        label: t.name,
        sublabel: 'Equipo completo',
        id: 'team_' + t.value,
      }));

    this.searchTimeout = setTimeout(() => {
      this.isSearchingRecipients = true;
      this.clubService.searchClubMembers(this.clubId, q, this.temporadaStoredValue).subscribe({
        next: (res: any) => {
          const members = (res.data || []).map((m: any) => {
            if (m.photoUrl) console.debug('[Notificaciones] photoUrl recibida:', m.fullName, '->', m.photoUrl);
            return {
              type: 'user',
              userId: m.userId,
              playerId: m.playerId,
              label: m.fullName,
              sublabel: (m.role === 'COACH' ? 'Entrenador' : 'Jugador') + ' · ' + m.teamName,
              role: m.role,
              hasAccount: m.hasAccount !== false,
              photoUrl: m.photoUrl || null,
              id: m.userId ? 'user_' + m.userId : 'player_' + m.playerId,
            };
          });
          const combined = [...teamSuggestions, ...members].slice(0, 5);
          // Quitar los ya seleccionados
          this.recipientSuggestions = combined.filter(
            s => !this.selectedRecipients.some(r => r.id === s.id)
          );
          this.isSearchingRecipients = false;
        },
        error: () => { this.isSearchingRecipients = false; }
      });
    }, 300);
  }

  addRecipient(suggestion: any): void {
    if (!this.selectedRecipients.some(r => r.id === suggestion.id)) {
      this.selectedRecipients.push(suggestion);
    }
    this.recipientInput = '';
    this.recipientSuggestions = [];
    setTimeout(() => this.recipientInputEl?.nativeElement.focus(), 0);
  }

  removeRecipient(idx: number): void {
    this.selectedRecipients.splice(idx, 1);
  }

  onRecipientBackspace(): void {
    if (!this.recipientInput && this.selectedRecipients.length > 0) {
      this.selectedRecipients.pop();
    }
  }

  hideSuggestionsDelayed(): void {
    setTimeout(() => { this.recipientSuggestions = []; }, 200);
  }

  // ── Envío del correo ─────────────────────────────────────────────────────────

  guardarCorreo(): void {
    this.isSending = true;
    const contenidoHTML = this.correoNew.body;
    const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoHTML)));

    this.correoNew.body = contenidoBase64;
    this.correoNew.clubId = this.clubId;
    this.correoNew.userId = this.userId;
    this.correoNew.correoEnviadoId = 0;
    this.correoNew.temporada = this.temporadaStoredValue;

    // Mapear chips a las nuevas listas de destinatarios (solo usuarios con cuenta)
    this.correoNew.recipientUserIds = this.selectedRecipients
      .filter(r => r.type === 'user' && r.hasAccount !== false && r.userId)
      .map(r => r.userId!);
    this.correoNew.recipientTeamIds = this.selectedRecipients
      .filter(r => r.type === 'team')
      .map(r => r.teamId!);

    // Retrocompatibilidad: si solo hay equipos, usar el primero como teamId
    const firstTeamId = this.correoNew.recipientTeamIds[0];
    this.correoNew.teamId = firstTeamId ?? 0;
    this.correoNew.destinatarios = firstTeamId ? String(firstTeamId) : '0';

    // Envío programado: convertir datetime-local a ISO UTC
    if (this.isScheduleMode && this.scheduledAt) {
      this.correoNew.scheduledAt = new Date(this.scheduledAt).toISOString();
    } else {
      this.correoNew.scheduledAt = undefined;
    }

    this.clubService.createCorreo(this.correoNew).subscribe(
      (response: Response) => {
        if (response.data) {
          if (this.isScheduleMode && this.scheduledAt) {
            this.sendSuccess = true;
            this.scheduleSuccess = true;
            setTimeout(() => { this.sendSuccess = false; this.scheduleSuccess = false; }, 4000);
            const newId = (response.data as any).correoEnviadoId;
            if (newId) {
              localStorage.setItem(`sph_chips_${newId}`, JSON.stringify(this.selectedRecipients.map(r => ({ ...r }))));
            }
            this.loadCorreosProgramados();
          } else {
            if (!this.correosEnviadosSinFiltro) this.correosEnviadosSinFiltro = [];
            const destinatarioLabel = this.selectedRecipients.map(r => r.label).join(', ');
            const enviadoEntry = {
              ...this.correoNew,
              destinatario: destinatarioLabel,
              fechaCreate: new Date().toISOString(),
            };
            this.correosEnviadosSinFiltro.unshift(enviadoEntry);
            if (this.currentFolder === 'sent') this.correos = [...this.correosEnviadosSinFiltro];
            this.sendSuccess = true;
            setTimeout(() => { this.sendSuccess = false; }, 3500);
          }
        }
        this.cerrarEnviando();
      },
      (error) => {
        console.error('Error al enviar correo', error);
        this.isSending = false;
      },
    );
  }

  scheduleSuccess = false;

  cerrarEnviando() {
    this.cerrarModalNew();
    this.isSending = false; // Oculta el spinner después de enviar
  }

  newCorreo() {
    this.showModalNew = true;

    setTimeout(() => {
      this.initSummernoteNew();
    }, 0);
  }

  cerrarModalNew() {
    this.showModalNew = false;

    setTimeout(() => {
      this.destroySummernoteNew();
      $('.note-modal, .note-modal-backdrop').remove();
    }, 0);

    this.correoNew = new CorreoEnviado({
      destinatarios: '0',
      asunto: '',
      body: '',
      correoEnviadoId: 0,
      clubId: this.clubId,
      teamId: 0,
      userId: this.userId,
      fechaCreate: '',
      remitente: '',
      destinatario: '',
      temporada: this.temporadaStoredValue,
    });

    // Resetear selector de destinatarios
    this.selectedRecipients = [];
    this.recipientInput = '';
    this.recipientSuggestions = [];
    clearTimeout(this.searchTimeout);

    // Resetear modo programado y edición
    this.isScheduleMode = false;
    this.scheduledAt = '';
    this.showScheduleDropdown = false;
    this.isEditingScheduled = false;
    this.editingScheduledId = null;
  }

  // ── Programar envío ──────────────────────────────────────────────────────────

  toggleScheduleDropdown(): void {
    this.showScheduleDropdown = !this.showScheduleDropdown;
  }

  enableScheduleMode(): void {
    this.isScheduleMode = true;
    this.showScheduleDropdown = false;
  }

  disableScheduleMode(): void {
    this.isScheduleMode = false;
    this.scheduledAt = '';
  }

  // ── Carpeta Programados ──────────────────────────────────────────────────────

  mostrarProgramados(): void {
    this.currentFolder = 'scheduled';
    this.loadCorreosProgramados();
  }

  loadCorreosProgramados(): void {
    if (!this.userId) return;
    this.loadingProgramados = true;
    this.clubService.getCorreosProgramados(this.userId).subscribe({
      next: (resp: any) => {
        this.correosProgramados = resp.data || [];
        this.loadingProgramados = false;
      },
      error: () => { this.loadingProgramados = false; }
    });
  }

  openCancelScheduleConfirm(id: number, event: Event): void {
    event.stopPropagation();
    this.cancelScheduleConfirm = { show: true, id };
  }

  closeCancelScheduleConfirm(): void {
    this.cancelScheduleConfirm = { show: false, id: null };
  }

  confirmCancelScheduled(): void {
    if (this.cancelScheduleConfirm.id == null) return;
    this.clubService.cancelCorreoProgramado(this.cancelScheduleConfirm.id).subscribe({
      next: () => {
        localStorage.removeItem(`sph_chips_${this.cancelScheduleConfirm.id}`);
        this.correosProgramados = this.correosProgramados.filter(
          c => c.correoEnviadoId !== this.cancelScheduleConfirm.id
        );
        this.closeCancelScheduleConfirm();
      },
      error: () => this.closeCancelScheduleConfirm()
    });
  }

  openEditScheduled(correoEnviadoId: number): void {
    // Usamos los datos ya cargados en correosProgramados (sin llamada API extra)
    const data = this.correosProgramados.find((c: any) => c.correoEnviadoId === correoEnviadoId);
    if (!data) {
      console.error('[openEditScheduled] No se encontró el mensaje en la lista local:', correoEnviadoId);
      return;
    }

    this.editingScheduledId = correoEnviadoId;
    this.isEditingScheduled = true;

    // Pre-rellenar asunto
    this.correoNew.asunto = data.asunto || '';

    // Restaurar chips: primero desde localStorage (guardado al programar), si no hay, placeholder
    this.selectedRecipients = [];
    const savedChips = localStorage.getItem(`sph_chips_${correoEnviadoId}`);
    if (savedChips) {
      try { this.selectedRecipients = JSON.parse(savedChips); } catch { /* fallback below */ }
    }
    if (this.selectedRecipients.length === 0 && data.destinatario) {
      this.selectedRecipients = [{
        id: 'existing_recipients',
        type: 'user',
        label: data.destinatario,
        sublabel: 'Destinatarios actuales',
        hasAccount: true,
      }];
    }

    // Pre-rellenar fecha programada: convertir "2026-02-27T17:00:00" a datetime-local "2026-02-27T17:00"
    if (data.scheduledAt) {
      const d = new Date(data.scheduledAt + (data.scheduledAt.endsWith('Z') ? '' : 'Z'));
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        this.scheduledAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    this.isScheduleMode = true;
    this.showModalNew = true;

    // Esperamos a que Angular renderice el modal y el DOM esté disponible para Summernote
    const body = data.body || '';
    this.waitForSummernoteAndInit(body);
  }

  private waitForSummernoteAndInit(body: string, attempts = 0): void {
    if ($('#summernoteNew').length > 0) {
      this.initSummernoteNewEdit(body);
    } else if (attempts < 20) {
      setTimeout(() => this.waitForSummernoteAndInit(body, attempts + 1), 80);
    } else {
      console.error('[openEditScheduled] No se encontró #summernoteNew después de varios intentos');
    }
  }

  private initSummernoteNewEdit(initialContent: string): void {
    if ($('#summernoteNew').data('summernote')) {
      $('#summernoteNew').summernote('destroy');
    }
    $('#summernoteNew').summernote({
      lang: 'es-ES',
      height: 400,
      dialogsInBody: true,
      disableDragAndDrop: true,
      callbacks: {
        onChange: (contents: string) => {
          this.correoNew.body = contents;
        },
      },
    });
    try {
      let decoded = initialContent;
      if (this.isBase64(initialContent)) {
        try {
          // Decodificación UTF-8 correcta (inverso de btoa(unescape(encodeURIComponent(html))))
          decoded = decodeURIComponent(escape(atob(initialContent)));
        } catch {
          decoded = this.decodeBase64(initialContent);
        }
      }
      $('#summernoteNew').summernote('code', decoded);
      this.correoNew.body = decoded;
    } catch (e) { console.error('[initSummernoteNewEdit]', e); }
  }

  guardarCorreoEditado(): void {
    if (this.editingScheduledId == null) return;
    this.isSending = true;

    const contenidoBase64 = btoa(unescape(encodeURIComponent(this.correoNew.body)));
    const newScheduledAt = this.scheduledAt ? new Date(this.scheduledAt).toISOString() : undefined;

    // Solo mandamos los nuevos destinatarios si el usuario los ha modificado
    const hasNewRecipients = this.selectedRecipients.some(r => r.id !== 'existing_recipients');
    const dto: any = {
      asunto: this.correoNew.asunto,
      body: contenidoBase64,
      scheduledAt: newScheduledAt,
    };
    if (hasNewRecipients) {
      dto.recipientUserIds = this.selectedRecipients
        .filter(r => r.type === 'user' && r.hasAccount !== false && r.userId)
        .map(r => r.userId!);
      dto.recipientTeamIds = this.selectedRecipients
        .filter(r => r.type === 'team')
        .map(r => r.teamId!);
    }

    this.clubService.updateCorreoProgramado(this.editingScheduledId, dto).subscribe({
      next: () => {
        this.scheduleSuccess = true;
        setTimeout(() => { this.scheduleSuccess = false; }, 4000);
        if (hasNewRecipients && this.editingScheduledId != null) {
          localStorage.setItem(`sph_chips_${this.editingScheduledId}`, JSON.stringify(this.selectedRecipients.map(r => ({ ...r }))));
        }
        this.loadCorreosProgramados();
        this.cerrarEnviando();
        this.editingScheduledId = null;
        this.isEditingScheduled = false;
      },
      error: () => { this.isSending = false; }
    });
  }

  formatScheduledDate(isoStr: string): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr + (isoStr.endsWith('Z') ? '' : 'Z'));
      if (isNaN(d.getTime())) return isoStr;
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getDate()} ${months[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return isoStr; }
  }

  // ── Invitación a Sphaira Player ─────────────────────────────────────────────

  openInviteModal(suggestion: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.inviteModal = {
      show: true,
      player: suggestion,
      email: '',
      sending: false,
      result: null,
    };
  }

  closeInviteModal(): void {
    this.inviteModal = { show: false, player: null, email: '', sending: false, result: null };
  }

  sendInvitation(): void {
    const { player, email } = this.inviteModal;
    if (!email.trim() || !player?.playerId) return;
    this.inviteModal.sending = true;
    this.inviteModal.result = null;
    this.registerService.invitePlayer(email.trim(), player.playerId, 1, player.teamId ?? 0)
      .subscribe({
        next: (res: any) => {
          this.inviteModal.sending = false;
          this.inviteModal.result = res.data != null ? 'success' : 'error';
          if (this.inviteModal.result === 'success') {
            setTimeout(() => this.closeInviteModal(), 2500);
          }
        },
        error: () => {
          this.inviteModal.sending = false;
          this.inviteModal.result = 'error';
        },
      });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  }

  getInitialsBg(name: string): string {
    const palette = ['#4CAF50','#2196F3','#9C27B0','#FF5722','#FF9800','#00BCD4','#E91E63','#795548'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
    return palette[Math.abs(hash) % palette.length];
  }

  isBase64(str: string): boolean {
    if (!str || typeof str !== 'string') {
      return false; // No es válido si no es una cadena
    }

    // Base64 típico: letras, números, '+', '/', '=' y longitud múltiplo de 4
    const base64Regex =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    // Validamos el patrón y verificamos que no contenga etiquetas HTML
    return base64Regex.test(str) && !str.includes('<');
  }

  enviarCorreo() {
    this.isSending = true;
    // Lógica para enviar el correo
    setTimeout(() => {
      this.isSending = false; // Oculta el spinner después de enviar
      this.cerrarModalNew();
    }, 3000); // Simulación de envío
  }

}
