import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AiChatService } from 'src/app/core/services/ai-chat/ai-chat.service';
import { AiPageContextService } from 'src/app/core/services/ai-chat/ai-page-context.service';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { PlayerInfoDialogComponent, PlayerInfoDialogData } from '../player-info-dialog/player-info-dialog.component';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { HttpClient } from '@angular/common/http';
import * as XLSX from "xlsx";
import { Player } from 'src/app/core/services/player/player.model';
import { Location } from '@angular/common';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { environment } from 'src/environments/environment';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { TeamService } from 'src/app/core/services/team/team.service';
import { getCurrentSeasonString } from 'src/app/core/utils/season.utils';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';
import { ToastrService } from 'ngx-toastr';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-info-jugadores',
  templateUrl: './info-jugadores.component.html',
  styleUrls: ['./info-jugadores.component.scss']
})
export class InfoJugadoresComponent implements OnInit, OnDestroy {
  @ViewChild('dataTable', { static: false })
  table!: ElementRef;

  clubId = 0;
  datosCargados = false;
  teams: any[] = [];
  players: any[] = [];
  teamSelected: number = -1;
  // Propiedades existentes
  playerNameFilter: string = '';
  filteredPlayers: any[] = [];
  playerDniFilter: string = '';
  playerSearch: string = '';
  mostrarModalInfoJugador = false;

  playerIdSelected = 0;
  selectedPlayer: any; // Define selectedPlayer para mantener la información del jugador seleccionado


  //para subir las caras de los dnis
  mostrarModalDniJugador: boolean = false;
  dniCara1: string | ArrayBuffer | null | undefined = null;
  dniCara2: string | ArrayBuffer | null | undefined = null;
  selectedFileCara1: File | null = null;
  selectedFileCara2: File | null = null;
  //estas son las caras del padre o tutor 1
  dniCara3: string | ArrayBuffer | null | undefined = null;
  dniCara4: string | ArrayBuffer | null | undefined = null;
  selectedFileCara3: File | null = null;
  selectedFileCara4: File | null = null;
  //estas son  las caras de la madre o tutor 2
  dniCara5: string | ArrayBuffer | null | undefined = null;
  dniCara6: string | ArrayBuffer | null | undefined = null;
  selectedFileCara5: File | null = null;
  selectedFileCara6: File | null = null;

  indexSelected = 0;
  loading = true;
  imageBaseUrlUser: string = environment.images + 'user/';
  imageBaseUrlPlayerDni: string = environment.images + 'playerDni/';

  temporadaStoredValue = getCurrentSeasonString();
  temporada: string = '';

  mostrarModalDocJugador = false;
  mostrarModalDocumento = false;
  mostrarModalDocumentoOjo = false;
  listaDocumentos: any[] = [];
  archivoSeleccionado!: File | null;
  docPadreTemp: any;

  usuarioActual!: User | null;
  userId: number = 0;

  mostrarModalPersonalizado: boolean = false;
  requiereRespuesta: boolean = false;
  tituloPersonalizado: string = '';

  mostrarModalEditarPersonalizado: boolean = false;
  contenidoEditando: string = '';
  tituloEditando: string = '';
  docEditando: any = null;
  fechaEditando: string = '';
  showDate = false;
  nombreJugador = '';

  listTeamsForCombo: any[] = [];
  showModalMover = false;
  teamId = 0;
  teamDestino: number = 0;
  addPlayerMoved: boolean = false;

  /* ---- Campos personalizados dinámicos ---- */
  mostrarModalCustomFields = false;
  customFields: any[] = [];
  customFieldResponses: { [key: number]: { [campoId: number]: { valor: string; file: string; tipo: string } } } = {};

  /* ---- Modal firma/archivo ---- */
  mostrarModalFirma = false;
  firmaUrl = '';

  /* ---- Solicitud masiva de consentimiento IA ---- */
  solicitudMasivaLoading = false;
  solicitudMasivaEnviada = false;

  /* ---- Panel IA ---- */
  aiPanelOpen = false;
  aiPrompt = '';
  aiMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  aiLoading = false;
  @ViewChild('aiMessagesContainer') aiMessagesContainer!: ElementRef;
  private historyConvId: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private playerService: PlayerService,
    private location: Location,
    private teamService: TeamService,
    private loginService: LoginService,
    private dialog: MatDialog,
    private notification: NotificationService,
    private confirmation: ConfirmationService,
    private toastr: ToastrService,
    private aiChatService: AiChatService,
    private aiPageContext: AiPageContextService,
    private tutorialService: TutorialService) { }

  private tutorialStepSub?: Subscription;

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
    });
    // Suscribirse a los cambios en los parámetros de la URL
    this.route.params.subscribe(params => {
      // Obtener el valor de teamId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });

    this.temporada = new Date().getFullYear().toString();

    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    this.cargarListadoJugadores();

    // Al llegar al paso "Información del jugador" del tutorial, abrir el modal automáticamente
    this.tutorialStepSub = this.tutorialService.currentStep$.subscribe(payload => {
      if (payload?.step?.id === 'ij-modal-jugador' && this.filteredPlayers.length > 0) {
        setTimeout(() => this.abrirModalInfoJugador(this.filteredPlayers[0]), 400);
      }
    });
  }

  ngOnDestroy(): void {
    this.tutorialStepSub?.unsubscribe();
  }

  // Método para redirigir a la pantalla de jugadores con el teamId
  irAPantalla(id: number): void {
    switch (id) {
      case 0:
        this.router.navigate(['/dashboard/cuadro-de-mandos', this.clubId]);
        break;
    }
  }

  /** Abre el modal de ver información del jugador en esta misma página (sin navegar) */
  abrirModalInfoJugador(player: any): void {
    const teamId = player.teamId ?? (this.teamSelected >= 0 && this.teams[this.teamSelected] ? this.teams[this.teamSelected].teamId : null);
    if (teamId == null) return;
    const data: PlayerInfoDialogData = { player, teamId, initialTab: 'personal' };
    this.dialog.open(PlayerInfoDialogComponent, {
      data,
      width: '95%',
      maxWidth: '900px',
      maxHeight: '90vh',
      panelClass: 'player-info-dialog-panel',
      backdropClass: 'player-info-dialog-backdrop',
    });
  }

  cargarListadoJugadores(): void {
    this.clubService.getListJugadoresByClubForTemp(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        if (response && response.data) {
          this.teams = response.data.teams;
          this.players = [];
          this.filteredPlayers = [];
          for (let i = 0; i < this.teams.length; i++) {
            for (let a = 0; a < this.teams[i].players.length; a++) {
              const p = { ...this.teams[i].players[a] };
              p.teamId = this.teams[i].teamId;
              this.filteredPlayers.push(p);
              this.players.push(p);
            }
          }
          this.loadPlayersOfTeam();
          const state = this.tutorialService.getState();
          if (state?.screenId === 'info-jugadores' && state.steps[state.currentIndex]?.id === 'ij-modal-jugador' && this.filteredPlayers.length > 0) {
            setTimeout(() => this.abrirModalInfoJugador(this.filteredPlayers[0]), 500);
          }
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
        this.datosCargados = true;
        this.loading = false;
        this.cargarCamposPersonalizados();
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
      }
    );
  }

  loadPlayersOfTeam(): void {
    if (this.teamSelected < 0) {
      // Mostrar todos los jugadores, añadiendo teamId a cada uno
      this.players = this.teams.flatMap(team =>
        team.players.map((p: any) => ({ ...p, teamId: team.teamId }))
      );
    } else {
      // Mostrar jugadores del equipo seleccionado, añadiendo teamId
      const team = this.teams[this.teamSelected];
      this.players = team.players.map((p: any) => ({ ...p, teamId: team.teamId }));
    }

    this.applyNameFilter();
  }

  applyFilter(): void {
    const filter = this.normalizeText(this.playerSearch);
    this.filteredPlayers = this.players.filter(player => {
      const fullName = this.normalizeText(`${player.nombre} ${player.apellido}`);
      return (
        fullName.includes(filter) ||
        (player.nameTeam && this.normalizeText(player.nameTeam).includes(filter)) ||
        (player.telefono && this.normalizeText(player.telefono).includes(filter)) ||
        (player.dni && this.normalizeText(player.dni).includes(filter)) ||
        (player.nombrePadre && this.normalizeText(player.nombrePadre).includes(filter)) ||
        (player.dniPadre && this.normalizeText(player.dniPadre).includes(filter)) ||
        (player.telefonoPadre && this.normalizeText(player.telefonoPadre).includes(filter)) ||
        (player.emailPadre && this.normalizeText(player.emailPadre).includes(filter)) ||
        (player.nombreMadre && this.normalizeText(player.nombreMadre).includes(filter)) ||
        (player.dniMadre && this.normalizeText(player.dniMadre).includes(filter)) ||
        (player.telefonoMadre && this.normalizeText(player.telefonoMadre).includes(filter)) ||
        (player.emailMadre && this.normalizeText(player.emailMadre).includes(filter))
      );
    });
  }

  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // elimina acentos
      .trim();
  }

  // Método para filtrar jugadores por nombre
  filterPlayers(key: number): void {
    switch (key) {
      case 0:
        this.applyNameFilter();
        break;
      case 1:
        this.applyDniFilter();
        break;
    }
  }

  // Aplicar filtro por nombre a los jugadores
  applyNameFilter(): void {
    if (!this.playerNameFilter) {
      // Si el filtro está vacío, mostrar todos los jugadores
      this.filteredPlayers = this.players;
    } else {
      // Filtrar jugadores por nombre que coincida parcialmente
      this.filteredPlayers = this.players.filter(player =>
        player.nombre && player.nombre.toLowerCase().includes(this.playerNameFilter.toLowerCase())
      );
    }
  }

  // Aplicar filtro por nombre a los jugadores
  applyDniFilter(): void {
    if (!this.playerDniFilter) {
      // Si el filtro está vacío, mostrar todos los jugadores
      this.filteredPlayers = this.players;
    } else {
      // Filtrar jugadores por DNI que coincida parcialmente, y manejar los valores null
      this.filteredPlayers = this.players.filter(player =>
        player.dni && player.dni.toLowerCase().includes(this.playerDniFilter.toLowerCase())
      );
    }
  }

  exportTableToExcel(): void {
    // Comprobar si el elemento existe antes de usar su ID
    const tableElement = document.getElementById('dataTable');

    if (tableElement) {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableElement);

      // Resto del código (asegurar formato de cadena, ancho de columnas, etc.)
      // ... (puedes copiar y pegar el código de la respuesta anterior)

      // Crear y guardar libro de trabajo
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      // Personalizar nombre de archivo y opciones de guardado (opcional)
      const fileName = "tabla_exportada.xlsx"; // Ajustar según tus necesidades
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
    } else {
      console.error("¡Elemento 'dataTable' no encontrado!");
      // Manejar el error de forma adecuada (opcional)
      // Por ejemplo, mostrar un mensaje de alerta al usuario
    }
  }

  /*verInfoJugador(player: Player): void {
    this.selectedPlayer = player; // Almacena el jugador seleccionado en una propiedad del componente
    this.edadSeleccionada = this.fechaEnEspañol(this.selectedPlayer.fechaDeNacimiento) + ' (' + this.calcularEdad(player.fechaDeNacimiento) + ')';
    this.mostrarEdad = true;
    this.mostrarModalInfoJugador = true; // Activa el indicador para mostrar el modal

    // Aquí llamamos a la función para cargar el gráfico de radar
    this.cargarGraficoRadar();
  }*/

  // Método para cerrar el modal de información del jugador
  cerrarModalInfoJugador() {
    this.mostrarModalInfoJugador = false;
  }

  fechaEnEspañol(fecha: string): string {
    const partes = fecha.split('-');
    const fechaObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));

    const dia = fechaObj.getDate();
    const mes = fechaObj.getMonth() + 1;
    const año = fechaObj.getFullYear();

    const diaStr = dia < 10 ? '0' + dia : dia.toString();
    const mesStr = mes < 10 ? '0' + mes : mes.toString();

    return `${diaStr}/${mesStr}/${año}`;
  }

  // Método para calcular la edad del jugador a partir de su fecha de nacimiento
  calcularEdad(fechaNacimientoString: string): number {
    // Convertimos la cadena de fecha de nacimiento a un objeto Date
    const fechaNacimiento = new Date(fechaNacimientoString);

    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const mes = hoy.getMonth() - cumpleanos.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }

    return edad;
  }

  abrirModalDniJugador(player: any, index: number) {
    this.indexSelected = index;
    this.playerIdSelected = player.playerId;
    this.selectedPlayer = player;
    this.mostrarModalDniJugador = true;
  }

  abrirModalDocJugador(player: any, index: number) {
    this.indexSelected = index;
    this.playerIdSelected = player.playerId;
    this.selectedPlayer = player;
    this.loadDocuments();
  }

  loadDocuments() {
    this.clubService.getListDocumentosPlayer(0, this.playerIdSelected).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaDocumentos = response.data;
          this.mostrarModalDocJugador = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalDocJugador() {
    this.mostrarModalDocJugador = false;
  }

  cerrarModalDocumento() {
    this.mostrarModalDocumento = false;
  }

  subir(doc: any) {
    console.log('Subir:', doc);
    // Aquí iría la lógica para subir el documento
    this.mostrarModalDocumento = true;
    this.docPadreTemp = doc;
  }

  verDocSubido(doc: any) {
    this.mostrarModalDocumentoOjo = true;
    this.docPadreTemp = doc;
  }

  cerrarModalDocumentoOjo() {
    this.mostrarModalDocumentoOjo = false;
  }

  cerrarModalDniJugador() {
    this.dniCara1 = null;
    this.dniCara2 = null;
    this.dniCara3 = null;
    this.dniCara4 = null;
    this.dniCara5 = null;
    this.dniCara6 = null;
    this.mostrarModalDniJugador = false;
  }

  subirDocumento() {
    const file = this.archivoSeleccionado;

    const dto = {
      docPadresId: this.docPadreTemp.docPadresId,
      docClubesId: this.docPadreTemp.docClubesId,
      nombre: this.docPadreTemp.nombre,
      file: null,
      clubId: this.docPadreTemp.clubId, // asegúrate de tener this.clubId en tu componente
      fecCreate: null,
      descargado: this.docPadreTemp.descargado,
      subido: 1,
      playerId: this.docPadreTemp.playerId,
      userId: this.userId,
      descripcion: '',
      requiere: this.docPadreTemp.requiere
    };

    if (file) {
      this.clubService.uploadDocPadres(file, dto).subscribe({
        next: (res) => {
          this.loadDocuments();
          this.notification.success('PLAYERS.MESSAGES.DOC_UPLOAD_SUCCESS');
          this.cerrarModalDocumento();
        },
        error: (err) => {
          console.error(err);
          this.notification.error('PLAYERS.MESSAGES.DOC_UPLOAD_ERROR');
        }
      });
    } else {
      this.notification.warning('PLAYERS.MESSAGES.SELECT_FILE');
    }
  }

  esImagen(nombreArchivo: string): boolean {
    const extensionesImagen = ['.jpg', '.jpeg', '.png', '.gif'];
    const extension = nombreArchivo?.toLowerCase().split('.').pop();
    return extensionesImagen.includes('.' + extension);
  }

  onFileChange(event: any, cara: string) {
    const file = event.target.files[0];

    if (file) {
      const fileType = file.type;

      // Verifica si el tipo de archivo es PNG o JPEG
      if (fileType === 'image/png' || fileType === 'image/jpeg') {
        const reader = new FileReader();
        reader.onload = (e) => {
          switch (cara) {
            case 'cara1':
              this.dniCara1 = e.target?.result;
              this.selectedFileCara1 = file;
              break;
            case 'cara2':
              this.dniCara2 = e.target?.result;
              this.selectedFileCara2 = file;
              break;
            case 'cara3':
              this.dniCara3 = e.target?.result;
              this.selectedFileCara3 = file;
              break;
            case 'cara4':
              this.dniCara4 = e.target?.result;
              this.selectedFileCara4 = file;
              break;
            case 'cara5':
              this.dniCara5 = e.target?.result;
              this.selectedFileCara5 = file;
              break;
            case 'cara6':
              this.dniCara6 = e.target?.result;
              this.selectedFileCara6 = file;
              break;
          }
        };
        reader.readAsDataURL(file);

        setTimeout(() => {
          this.subirCaraDni(cara);
        }, 1000);
      } else {
        this.notification.warning('PLAYERS.MESSAGES.INVALID_IMAGE_FORMAT');
      }
    }
  }

  subirCaraDni(cara: string) {
    let fileToUpload = null;
    let caraOption = 0;

    switch (cara) {
      case 'cara1':
        fileToUpload = this.selectedFileCara1;
        break;
      case 'cara2':
        caraOption = 1;
        fileToUpload = this.selectedFileCara2;
        break;
      case 'cara3':
        caraOption = 2;
        fileToUpload = this.selectedFileCara3;
        break;
      case 'cara4':
        caraOption = 3;
        fileToUpload = this.selectedFileCara4;
        break;
      case 'cara5':
        caraOption = 4;
        fileToUpload = this.selectedFileCara5;
        break;
      case 'cara6':
        caraOption = 5;
        fileToUpload = this.selectedFileCara6;
        break;
    }

    if (fileToUpload) {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // Simulamos el envío de la imagen al servidor
      this.playerService.createUpdateImgDniPlayer(this.playerIdSelected, caraOption, fileToUpload)
        .subscribe(
          (response) => {
            switch (caraOption) {
              case 0:
                this.filteredPlayers[this.indexSelected].imgDniUno = response.data;
                break;
              case 1:
                this.filteredPlayers[this.indexSelected].imgDniDos = response.data;
                break;
              case 2:
                this.filteredPlayers[this.indexSelected].dniPadre1 = response.data;
                break;
              case 3:
                this.filteredPlayers[this.indexSelected].dniPadre2 = response.data;
                break;
              case 4:
                this.filteredPlayers[this.indexSelected].dniMadre1 = response.data;
                break;
              case 5:
                this.filteredPlayers[this.indexSelected].dniMadre2 = response.data;
                break;
            }

            this.notification.success('PLAYERS.MESSAGES.DOC_UPLOAD_SUCCESS');
          },
          error => {
            console.error('Error al subir la imagen', error);
          }
        );

      // Aquí se realiza la llamada al backend
      // Puedes usar HttpClient para realizar la solicitud
      // Ejemplo: this.http.post(endpoint, formData).subscribe(...)
      //console.log(`Subiendo ${cara}:`, fileToUpload.name);
      // Realiza la llamada a tu servicio o API aquí
    }
  }

  descargarImagen(url: string, nombreArchivo: string) {
    //const urlImagen = 'https://appsphairatech.com/images/user/277699-imguser.png';
    const urlEnvi = environment.apiUrl;
    //console.log(urlEnvi);
    const urlBackend = urlEnvi + `commons/download-image?url=${encodeURIComponent(url)}`;

    fetch(urlBackend)
      .then(response => response.blob())
      .then(blob => {
        const a = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
      })
      .catch(error => {
        window.open(url, '_blank');
        //console.error('Error descargando la imagen:', error);
        //alert('No se pudo descargar la imagen. Por favor, intente de nuevo más tarde.');
      });
  }

  descargar(doc: any): void {
    if (!doc.fileClub) return;
    if (doc.descargado == 0) {
      // Marcar como descargado
      doc.descargado = 1;
      doc.userId = this.userId;

      this.clubService.updateDocumentoDescargado(doc).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            console.log('Guardado.');
          } else {
            console.error('La respuesta del servicio no tiene la estructura esperada', response);
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
    };

    const url = 'https://appsphairatech.com/images/documentos/' + doc.fileClub;
    window.open(url, '_blank');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        this.archivoSeleccionado = file;
      } else {
        this.notification.warning('PLAYERS.MESSAGES.PDF_WORD_ONLY');
        this.archivoSeleccionado = null;
      }
    }
  }

  rellenarPersonalizado(doc: any): void {
    this.docEditando = doc;
    this.contenidoEditando = doc.descripcion || ''; // ajusta al campo real
    this.tituloEditando = doc.nombre || ''; // ajusta al campo real
    this.fechaEditando = doc.fecCreate
    if (doc.subido == 1) {
      this.showDate = true;
      this.requiereRespuesta = true;
    } else {
      this.requiereRespuesta = false;
    }
    this.mostrarModalEditarPersonalizado = true;
  }

  cerrarModalEditarPersonalizado(): void {
    this.docEditando = null;
    this.contenidoEditando = ''; // ajusta al campo real
    this.tituloEditando = ''; // ajusta al campo real
    this.fechaEditando = '';
    this.showDate = false;
    this.mostrarModalEditarPersonalizado = false;
  }

  guardarEdicionPersonalizado(): void {
    if (!this.requiereRespuesta) {
      this.notification.warning('PLAYERS.MESSAGES.ACCEPT_AUTHORIZATION');
      return;
    }

    const contenidoActualizado = (document.getElementById('editorPersonalizado') as HTMLElement).innerHTML;

    const dto = {
      docPadresId: this.docEditando.docPadresId,
      docClubesId: this.docEditando.docClubesId,
      nombre: this.docEditando.nombre,
      clubId: this.docEditando.clubId, // asegúrate de tener this.clubId en tu componente
      fecCreate: null,
      descargado: this.docEditando.descargado,
      descripcion: contenidoActualizado,
      subido: 1,
      playerId: this.docEditando.playerId,
      userId: this.userId,
      requiere: this.docEditando.requiere
    };

    this.clubService.uploadDocPadresPersonalizado(dto).subscribe({
      next: (res) => {
        this.notification.success('PLAYERS.MESSAGES.CONTENT_UPDATED');
        this.cerrarModalEditarPersonalizado();
      },
      error: (err) => {
        console.error(err);
        this.notification.error('PLAYERS.MESSAGES.DOC_UPLOAD_ERROR');
      }
    });
  }
  /* =========================
     CAMPOS PERSONALIZADOS
  ========================= */

  abrirModalCustomFields(): void {
    this.mostrarModalCustomFields = true;
  }

  cerrarModalCustomFields(): void {
    this.mostrarModalCustomFields = false;
  }

  onCustomFieldsSaved(fields: any[]): void {
    this.cerrarModalCustomFields();
    this.cargarCamposPersonalizados();
  }

  cargarCamposPersonalizados(): void {
    this.clubService.getFormCamposByClub(this.clubId, 'PERFIL_JUGADOR').subscribe(
      (res: any) => {
        this.customFields = (res?.data || []).sort((a: any, b: any) => a.orden - b.orden);
        if (this.customFields.length > 0) {
          this.cargarRespuestasCustomFields();
        }
      }
    );
  }

  cargarRespuestasCustomFields(): void {
    for (const player of this.players) {
      const pId = player.playerId || 0;
      if (!pId) continue;
      this.clubService.getFormRespuestasByPlayerProfile(this.clubId, pId).subscribe(
        (res: any) => {
          const items = res?.data || [];
          const map: { [campoId: number]: { valor: string; file: string; tipo: string } } = {};
          for (const item of items) {
            if (item.respuesta && item.campo) {
              map[item.campo.formularioCampoId] = {
                valor: item.respuesta.valor || '',
                file: item.respuesta.file || '',
                tipo: item.campo.tipoCampo || ''
              };
            }
          }
          this.customFieldResponses[pId] = map;
        }
      );
    }
  }

  getCustomFieldValue(player: any, campoId: number): string {
    const pId = player.playerId || 0;
    const map = this.customFieldResponses[pId];
    if (!map || !map[campoId]) return '—';
    const entry = map[campoId];
    if (entry.tipo === 'SIGNATURE' || entry.tipo === 'FILE') {
      return entry.file ? '✓' : '—';
    }
    return entry.valor || '—';
  }

  isSignatureOrFile(campo: any): boolean {
    return campo.tipoCampo === 'SIGNATURE' || campo.tipoCampo === 'FILE';
  }

  hasSignatureOrFile(player: any, campoId: number, tipoCampo: string): boolean {
    const pId = player.playerId || 0;
    const map = this.customFieldResponses[pId];
    if (!map || !map[campoId]) return false;
    return !!(map[campoId].file);
  }

  getSignatureFileUrl(player: any, campoId: number): string {
    const pId = player.playerId || 0;
    const map = this.customFieldResponses[pId];
    if (!map || !map[campoId]) return '';
    return environment.images + 'formulario-files/' + map[campoId].file;
  }

  abrirModalFirma(player: any, campoId: number): void {
    this.firmaUrl = this.getSignatureFileUrl(player, campoId);
    this.mostrarModalFirma = true;
  }

  cerrarModalFirma(): void {
    this.mostrarModalFirma = false;
    this.firmaUrl = '';
  }

  goBack(): void {
    this.location.back();
  }

  moverJugador(): void {
    const cuotaTbm = 0;

    if (!this.teamDestino || this.teamDestino == 0) {
      this.notification.warning('PLAYERS.MESSAGES.SELECT_TEAM_DROPDOWN');
      return;
    }

    this.teamService.movePlayer(this.playerIdSelected, this.teamId, this.teamDestino, cuotaTbm, this.addPlayerMoved ? 1 : 0).subscribe({
      next: (response: Response) => {
        if (response.data !== null) {
          this.notification.success('PLAYERS.MESSAGES.MOVED_SUCCESS');
          this.showModalMover = false;
          this.teamDestino = 0;
          this.addPlayerMoved = false;
          this.cargarListadoJugadores();
        } else {
          this.notification.errorGeneric();
        }
      },
      error: () => this.notification.errorGeneric()
    });
  }

  openShowModalMover(playerId: number, player: any): void {
    const jugadorSeleccionado = this.players.find(p => p.playerId === playerId);
    this.nombreJugador = jugadorSeleccionado
      ? jugadorSeleccionado.nombre + ' ' + jugadorSeleccionado.apellido
      : '';
    this.playerIdSelected = playerId;
    this.teamId = player.teamId;
    this.teamDestino = 0;
    this.addPlayerMoved = false;

    this.teamService.getTeamsByClubForCombo(this.clubId, this.temporadaStoredValue).subscribe(
      (response: Response) => {
        if (response.data !== null) {
          this.listTeamsForCombo = response.data;
          this.showModalMover = true;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  cerrarModalMover() {
    this.showModalMover = false;
  }

  formatFechaEspana(fecha: string): string {
    if (!fecha) return '';

    // Formato ISO: aaaa-mm-dd
    const isoFormat = /^\d{4}-\d{2}-\d{2}$/;
    if (isoFormat.test(fecha)) {
      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    }

    // Formato español con guiones: dd-mm-aaaa
    const spanishWithDashes = /^\d{2}-\d{2}-\d{4}$/;
    if (spanishWithDashes.test(fecha)) {
      const [day, month, year] = fecha.split('-');
      return `${day}/${month}/${year}`;
    }

    // Si ya está en formato correcto o no reconocible, devolver tal cual
    return fecha;
  }

  solicitarConsentimientoMasivo(): void {
    if (this.solicitudMasivaLoading || this.solicitudMasivaEnviada) return;
    const sinConsent = this.players.filter(p => !p.consentimientoIA);
    if (!sinConsent.length) {
      this.toastr.info('Todos los jugadores ya tienen el consentimiento firmado.');
      return;
    }
    this.solicitudMasivaLoading = true;
    const peticiones = sinConsent.map(p => this.playerService.solicitarConsentimientoIA(p.playerId));
    forkJoin(peticiones).subscribe({
      next: () => {
        this.solicitudMasivaLoading = false;
        this.solicitudMasivaEnviada = true;
        this.toastr.success(`Notificación enviada a los tutores de ${sinConsent.length} jugador(es).`);
      },
      error: () => {
        this.solicitudMasivaLoading = false;
        this.toastr.error('Error al enviar algunas notificaciones.');
      }
    });
  }

  // ===== AI PANEL =====
  toggleAiPanel(): void {
    this.aiPanelOpen = !this.aiPanelOpen;
    if (this.aiPanelOpen && this.aiMessages.length === 0) {
      this.aiMessages.push({
        role: 'assistant',
        content: 'Hola, soy tu asistente IA para la sección de jugadores. Tengo acceso a los datos anonimizados del listado actual. ¿En qué puedo ayudarte?'
      });
    }
  }

  useSuggestion(suggestion: string): void {
    this.aiPrompt = suggestion;
    this.sendAiMessage();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendAiMessage();
    }
  }

  sendAiMessage(): void {
    if (!this.aiPrompt.trim() || this.aiLoading) return;

    const userMessage = this.aiPrompt.trim();
    this.aiMessages.push({ role: 'user', content: userMessage });
    this.aiPrompt = '';
    this.aiLoading = true;
    setTimeout(() => this.scrollAiToBottom(), 100);

    const { contextText, codeToReal } = this.buildAnonymizedPlayersContext();
    const bg = this.aiPageContext.getBackgroundStatsSnapshot();

    const allCodes = new Map(codeToReal);
    const parts: string[] = ['[LISTADO DE JUGADORES - DATOS ANONIMIZADOS]\n' + contextText];

    if (bg?.teamStats) {
      parts.push('[ESTADÍSTICAS DE EQUIPOS - DATOS ANONIMIZADOS]\n' + bg.teamStats.contextText);
      bg.teamStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg?.playerStats) {
      parts.push('[ESTADÍSTICAS DE JUGADORES (RENDIMIENTO) - DATOS ANONIMIZADOS]\n' + bg.playerStats.contextText);
      bg.playerStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg?.paymentStats) {
      parts.push('[PAGOS Y CUOTAS DE JUGADORES - DATOS ANONIMIZADOS]\n' + bg.paymentStats.contextText);
      bg.paymentStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg?.documentStats) {
      parts.push('[DOCUMENTOS DEL CLUB - DATOS ANONIMIZADOS]\n' + bg.documentStats.contextText);
      bg.documentStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg?.ropaStats) {
      parts.push('[EQUIPACIÓN DE JUGADORES - DATOS ANONIMIZADOS]\n' + bg.ropaStats.contextText);
      bg.ropaStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg?.notifStats) {
      parts.push('[NOTIFICACIONES ENVIADAS - DATOS ANONIMIZADOS]\n' + bg.notifStats.contextText);
      bg.notifStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg?.mediaStats) {
      parts.push('[BIBLIOTECA DE VÍDEOS DEL CLUB]\n' + bg.mediaStats.contextText);
      bg.mediaStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg?.scoutingStats) {
      parts.push('[SCOUTING - JUGADORES OBSERVADOS - DATOS ANONIMIZADOS]\n' + bg.scoutingStats.contextText);
      bg.scoutingStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }
    if (bg?.staffStats) {
      parts.push('[STAFF / USUARIOS CON ACCESO AL DASHBOARD - DATOS ANONIMIZADOS]\n' + bg.staffStats.contextText);
      bg.staffStats.codeToReal.forEach((v, k) => allCodes.set(k, v));
    }

    let anonymizedMessage = userMessage;
    allCodes.forEach((real, code) => {
      anonymizedMessage = anonymizedMessage.replace(
        new RegExp(real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), code
      );
    });

    const enrichedMessage = anonymizedMessage + '\n\n' + parts.join('\n\n');

    const history = this.aiMessages.slice(-6).map(m => ({ role: m.role, text: m.content }));

    this.aiChatService.sendMessage(
      this.userId, this.clubId, 'jugadores', enrichedMessage, 'users', null, history
    ).subscribe({
      next: (resp) => {
        let response = resp.success
          ? (resp.response || 'Sin respuesta.')
          : (resp.message || 'Error al consultar la IA.');
        Array.from(allCodes.entries())
          .sort((a, b) => b[0].length - a[0].length)
          .forEach(([code, real]) => { response = response.split(code).join(real); });
        this.aiMessages.push({ role: 'assistant', content: response });
        this.aiLoading = false;
        this.saveToHistory();
        setTimeout(() => this.scrollAiToBottom(), 100);
      },
      error: () => {
        this.aiMessages.push({ role: 'assistant', content: 'Error al conectar con la IA. Inténtalo de nuevo.' });
        this.aiLoading = false;
        setTimeout(() => this.scrollAiToBottom(), 100);
      }
    });
  }

  private buildAnonymizedPlayersContext(): { contextText: string; codeToReal: Map<string, string> } {
    const codeToReal = new Map<string, string>();
    const lines: string[] = ['Código | Posición | Dorsal | Equipo'];
    const source = this.filteredPlayers.length ? this.filteredPlayers : this.players;
    source.forEach((p, i) => {
      const code = `JUGADOR_${i + 1}`;
      const fullName = `${p.nombre || ''} ${p.apellido || ''}`.trim() || `Jugador ${i + 1}`;
      codeToReal.set(code, fullName);
      lines.push(
        `${code} | ${p.posicion || p.posicionGlobal || '-'} | ${p.dorsal ?? p.numDorsal ?? '-'} | ${p.nameTeam || '-'}`
      );
    });
    return { contextText: lines.join('\n'), codeToReal };
  }

  private scrollAiToBottom(): void {
    if (this.aiMessagesContainer) {
      const element = this.aiMessagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private saveToHistory(): void {
    const userMsgs = this.aiMessages.filter(m => m.role === 'user');
    if (userMsgs.length === 0 || !this.userId) return;
    const title = '[Jugadores] ' + userMsgs[0].content.substring(0, 40)
      + (userMsgs[0].content.length > 40 ? '...' : '');
    const convId = this.historyConvId || ('conv_jugadores_' + Date.now());
    this.historyConvId = convId;
    const messages = this.aiMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, text: m.content }));
    this.aiChatService.saveHistory(this.userId, convId, title, this.clubId, 'info-jugadores', messages).subscribe();
  }

  updateTemporada(player: any) {
    this.confirmation.confirm({
      titleKey: 'ACTIONS.CONFIRM_TITLE',
      messageKey: 'PLAYERS.MESSAGES.MOVE_SEASON_CONFIRM',
      confirmKey: 'COMMON.ACCEPT',
      cancelKey: 'COMMON.CANCEL'
    }).subscribe((confirmed) => {
      if (confirmed) {
        this.clubService.moverPlayerTemporada(this.clubId, player.playerId, this.temporadaStoredValue).subscribe({
          next: (response: Response) => {
            if (response.data) {
              this.notification.success('PLAYERS.MESSAGES.PLAYER_MOVED_SUCCESS');
            } else {
              const msg = response?.error?.msg;
              if (msg) {
                this.notification.error(msg, false);
              } else {
                this.notification.error('PLAYERS.MESSAGES.LOAD_ERROR');
              }
            }
          },
          error: () => this.notification.errorGeneric()
        });
      }
    });
  }

}
