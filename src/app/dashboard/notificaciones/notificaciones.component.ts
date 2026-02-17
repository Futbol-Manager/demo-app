import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { ClubService } from 'src/app/core/services/club/club.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { CorreoEnviado } from 'src/app/core/services/models/club.model';
import { Response } from 'src/app/core/services/models/response.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Location } from '@angular/common';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
declare var $: any; // Declaración para usar jQuery

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss'],
})
export class NotificacionesComponent implements OnInit {
  datosCargados = false;
  usuarioActual!: User | null;
  clubId!: number; // Ajusta el valor según el clubId del equipo actual
  userId!: number;
  correoSelected = {
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
  selectCorreo: boolean = true;
  correos = [...this.correosSinFiltro]; // Inicialmente, muestra todos los correos
  loadingCorreos: boolean = true;
  receivedCount: number = 0;

  showModal = false;
  showBtn = true;
  showModalNew = false;

  listTeamsForCombo: any[] = [];
  correoNew: CorreoEnviado = new CorreoEnviado({});
  /*correoNew = {
    destinatarios: '0',
    asunto: '',
    body: '',
    correoEnviadoId: 0,
    clubId: 0,
    teamId: 0,
    userId: 0,
    fechaCreate: ''
  };*/
  isSending: boolean = false;
  currentFolder: 'inbox' | 'sent' = 'inbox';
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
    private location: Location,
  ) { }

  ngOnInit(): void {
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
        const paramClubId = params['clubId'];
        if (paramUserId != null && paramUserId !== '') {
          this.userId = +paramUserId;
          this.clubId = 0;
          this.loadCorreosByUser(this.userId);
        } else {
          this.clubId = paramClubId != null && paramClubId !== '' ? +paramClubId : 0;
          this.loadCorreosByUser(this.userId);
        }
      });
    });
  }

  private loadCorreosByUser(userId: number): void {
    this.clubService.getListCorreos(userId).subscribe(
      (response: Response) => {
        this.loadingCorreos = true;
        this.selectCorreo = false;
        if (response.data !== null) {
          this.correosEnviadosSinFiltro = response.data.enviados ?? [];
          this.correosRecibidosSinFiltro = response.data.recibidos ?? [];
          this.correos = response.data.recibidos ?? [];
          this.receivedCount = this.correosRecibidosSinFiltro.filter((c: any) => c.leido === 0).length;
          this.loadingCorreos = false;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.initSummernote();
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      },
    );

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

  // Método para codificar en Base64 antes de guardar
  guardarCorreo(): void {
    this.isSending = true;
    const contenidoHTML = this.correoSelected.body;
    // Codifica el contenido en Base64
    const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoHTML)));

    this.correoNew.body = contenidoBase64;
    this.correoNew.clubId = this.clubId;
    this.correoNew.teamId = parseInt(this.correoNew.destinatarios);
    this.correoNew.userId = this.userId;
    this.correoNew.correoEnviadoId = 0;
    this.correoNew.temporada = this.temporadaStoredValue;

    //console.log('Contenido en Base64:', contenidoBase64);

    this.clubService.createCorreo(this.correoNew).subscribe(
      (response: Response) => {
        if (response.data !== 0) {
          this.correoNew = response.data;
          if (!this.correosEnviadosSinFiltro) this.correosEnviadosSinFiltro = [];
          this.correosEnviadosSinFiltro.unshift(this.correoNew);
          if (this.currentFolder === 'sent') this.correos = [...this.correosEnviadosSinFiltro];
          this.sendSuccess = true;
          setTimeout(() => { this.sendSuccess = false; }, 3500);
        }
        this.cerrarEnviando();
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      },
    );
  }

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

    this.correoNew = {
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
    };
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
