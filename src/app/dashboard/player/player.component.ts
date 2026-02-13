import { Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/core/models/users/user.model';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { Response } from 'src/app/core/services/models/response.model';
import { PagocuotasPlayerResponse, Player } from 'src/app/core/services/player/player.model';

import { Chart, registerables } from 'chart.js/auto';
import { HttpClient } from '@angular/common/http';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeamService } from 'src/app/core/services/team/team.service';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { ClubService } from 'src/app/core/services/club/club.service';
import * as XLSX from 'xlsx';
// Registra los complementos necesarios
Chart.register(...registerables);


// player.model.ts
export interface Player1 {
  id: number;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  posicion: string;
}


@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {

  @ViewChild('primerCampo', { static: false }) primerCampo!: ElementRef;

  datosCargados: boolean = false;
  usuarioActual!: User | null;
  teamId!: number;
  showModal = false;
  showModalInvitar = false;
  mostrarModalInfoJugador = false;
  infoModalActiveTab = 'personal';
  /** Pestaña activa en el modal de crear/editar jugador */
  formModalActiveTab: 'personal' | 'deportiva' = 'personal';
  selectedPlayer: Player = new Player({});
  pagosCuotasData: PagocuotasPlayerResponse | null = null;
  pagosCuotasLoading = false;
  pagosCuotasError = false;
  player: Player = new Player({});
  radarChart: Chart | null = null; // Inicializar la variable radarChart
  mostrarEdad: boolean = false;
  edadSeleccionada!: string;

  players: any[] = [];
  filteredPlayers: any[] = [];
  playersPaged: any[] = [];
  playerSearch = '';
  page = 1;
  pageSize = 25;
  pageSizes = [10, 25, 50, 100];
  totalRecords = 0;
  totalPages = 0;
  imgPlayer: string = '';
  selectedFile: File | null = null;

  nombreJugador: string = '';
  isMenor: boolean = false;
  correoElectronico: string = '';
  selectedPlayerId: number = 0;

  userForm: FormGroup = this.fb.group({
    mail: ['', Validators.email],
  });

  showPorteroOptions = false;
  showbtnupimg = false;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  showPreview: boolean = false;

  showModalMover = false;
  playerIdSelected = 0;

  teamSelected: number = 0;
  listTeamsForCombo: any[] = [];
  clubId = 0;
  categoryTypeIdActual = 0;
  indexSelected = 0;
  profileId = 0;

  showTutor1 = false;
  showTutor2 = false;
  parentTutor1 = 'Tutor 1';
  parentTutor2 = 'Tutor 2';

  countries: string[] = [
    'Afganistán', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Antigua y Barbuda', 'Arabia Saudita',
    'Argelia', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaiyán', 'Bahamas', 'Bangladés', 'Barbados',
    'Baréin', 'Bélgica', 'Belice', 'Benín', 'Bielorrusia', 'Birmania', 'Bolivia', 'Bosnia y Herzegovina', 'Botsuana',
    'Brasil', 'Brunéi', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Bután', 'Cabo Verde', 'Camboya', 'Camerún', 'Canadá',
    'Catar', 'Chad', 'Chile', 'China', 'Chipre', 'Ciudad del Vaticano', 'Colombia', 'Comoras', 'Corea del Norte',
    'Corea del Sur', 'Costa de Marfil', 'Costa Rica', 'Croacia', 'Cuba', 'Dinamarca', 'Dominica', 'Ecuador', 'Egipto',
    'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea', 'Eslovaquia', 'Eslovenia', 'Estados Unidos',
    'Estonia', 'Etiopía', 'Filipinas', 'Finlandia', 'Fiyi', 'Francia', 'Gabón', 'Gambia', 'Georgia', 'Ghana', 'Granada',
    'Grecia', 'Guatemala', 'Guinea', 'Guinea-Bisáu', 'Guinea Ecuatorial', 'Guyana', 'Haití', 'Honduras', 'Hungría',
    'India', 'Indonesia', 'Irak', 'Irán', 'Irlanda', 'Islandia', 'Islas Marshall', 'Islas Salomón', 'Israel', 'Italia',
    'Jamaica', 'Japón', 'Jordania', 'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kuwait', 'Laos', 'Lesoto',
    'Letonia', 'Líbano', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania', 'Luxemburgo', 'Madagascar', 'Malasia',
    'Malaui', 'Maldivas', 'Malí', 'Malta', 'Marruecos', 'Mauricio', 'Mauritania', 'México', 'Micronesia', 'Moldavia',
    'Mónaco', 'Mongolia', 'Montenegro', 'Mozambique', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Níger', 'Nigeria',
    'Noruega', 'Nueva Zelanda', 'Omán', 'Países Bajos', 'Pakistán', 'Palaos', 'Panamá', 'Papúa Nueva Guinea', 'Paraguay',
    'Perú', 'Polonia', 'Portugal', 'Reino Unido', 'República Centroafricana', 'República Checa', 'República de Macedonia',
    'República del Congo', 'República Democrática del Congo', 'República Dominicana', 'Ruanda', 'Rumania', 'Rusia',
    'Samoa', 'San Cristóbal y Nieves', 'San Marino', 'San Vicente y las Granadinas', 'Santa Lucía', 'Santo Tomé y Príncipe',
    'Senegal', 'Serbia', 'Seychelles', 'Sierra Leona', 'Singapur', 'Siria', 'Somalia', 'Sri Lanka', 'Suazilandia', 'Sudáfrica',
    'Sudán', 'Sudán del Sur', 'Suecia', 'Suiza', 'Surinam', 'Tailandia', 'Tanzania', 'Tayikistán', 'Timor Oriental', 'Togo',
    'Tonga', 'Trinidad y Tobago', 'Túnez', 'Turkmenistán', 'Turquía', 'Tuvalu', 'Ucrania', 'Uganda', 'Uruguay', 'Uzbekistán',
    'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Yibuti', 'Zambia', 'Zimbabue'
  ];

  playerIdsList: any[] = [];

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

  indexSelectedDni = 0;
  imageBaseUrlPlayerDni: string = environment.images + 'playerDni/';
  imageBaseUrlUser: string = environment.images + 'user/';
  rotateAngle: number = 0; // Almacena el ángulo de rotación actual
  showModalAsistencia = false;

  listAsistencia: any[] = [];

  currentIndex = 0;
  currentIndex2 = 0;
  selectedPartido: any = null;

  partidos: any = [];
  partidos2: any = [];
  partidosJugados: number = 0;
  titularidades: number = 0;
  minutosJugados: number = 0;
  goles: number = 0;
  tarjetasAmarillas: number = 0;
  tarjetasRojas: number = 0;
  numTitulares: number = 0;
  showAlertAndroid = false;

  iconos: { [key: string]: string } = {
    'V': '🟢',
    'E': '🟡',
    'D': '🔴'
  };

  temporada: string = '2025';
  userId: number = 0;
  isAndroid: boolean = false;
  isiOS: boolean = false;

  showOther = false;
  showModalPlayerInfo = false;
  playerInfo: any = [];
  teamIdPlayerSelected = 0;
  temporadaStoredValue = '2025';

  addPlayerMoved: boolean = false;

  constructor(private playerservice: PlayerService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private elementRef: ElementRef,
    private trainingService: TrainingService,
    private registerService: RegisterService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private teamService: TeamService,
    private loginService: LoginService,
    private playerService: PlayerService,
    private clubService: ClubService,
    private location: Location,
    private cdr: ChangeDetectorRef) { }

  getPositionShort(position: string | null | undefined): string {
    const pos = (position || '').toLowerCase().trim();

    if (pos.includes('portero')) return 'POR';
    if (pos.includes('defensa central')) return 'DFC';
    if (pos.includes('defensa lateral')) return 'LAT';
    if (pos.includes('carrilero')) return 'CAD';
    if (pos.includes('centrocampista defensivo')) return 'MCD';
    if (pos.includes('centrocampista ofensivo')) return 'MCO';
    if (pos.includes('centrocampista')) return 'MC';
    if (pos.includes('mediapunta')) return 'MP';
    if (pos.includes('extremo')) return 'EI';
    if (pos.includes('delantero centro')) return 'DC';
    if (pos.includes('sin definir')) return 'N/A';

    return (position || 'N/A').toUpperCase();
  }

  getPositionBadgeClass(position: string | null | undefined): string {
    const pos = (position || '').toUpperCase();

    if (pos.includes('POR')) return 'position-por';
    if (pos.includes('DEF') || pos.includes('LAT') || pos.includes('DFC')) return 'position-def';
    if (pos.includes('MED') || pos.includes('MCD') || pos.includes('MC') || pos.includes('MCO')) return 'position-med';
    if (pos.includes('DEL') || pos.includes('EXT') || pos.includes('DC')) return 'position-del';

    return 'position-default';
  }

  getOverallRating(player: any): number {
    const stats = [
      Number(player?.habilidadConBalon) || 0,
      Number(player?.pase) || 0,
      Number(player?.tiro) || 0,
      Number(player?.defensa) || 0,
      Number(player?.fisico) || 0,
      Number(player?.mentalidad) || 0
    ];

    const total = stats.reduce((acc, value) => acc + value, 0);
    const average = total / stats.length;

    if (!Number.isFinite(average)) return 0;

    return Math.max(0, Math.min(10, average));
  }

  /** Habilidad real 0–10 para el círculo de rating, normalizando si los datos vienen en escala 0–100 */
  getRealOverallRating(player: any): number {
    try {
      if (!player || typeof player !== 'object') return 0;
      const stats = [
        this.parseNumeric(player.habilidadConBalon),
        this.parseNumeric(player.pase),
        this.parseNumeric(player.tiro),
        this.parseNumeric(player.defensa),
        this.parseNumeric(player.fisico),
        this.parseNumeric(player.mentalidad)
      ];
      const total = stats.reduce((acc, value) => acc + value, 0);
      const average = total / stats.length;
      if (!Number.isFinite(average)) return 0;
      const normalized = average > 10 ? average / 10 : average;
      return Math.max(0, Math.min(10, Number(normalized.toFixed(1))));
    } catch {
      return 0;
    }
  }

  /** Número de camiseta para mostrar en la tarjeta (soporta numero, number, numeroCamiseta y valor 0) */
  getNumeroCamiseta(player: any): string {
    if (!player) return '-';
    const raw = player.numero ?? player.number ?? player.numeroCamiseta;
    if (raw === null || raw === undefined) return '-';
    const s = String(raw).trim();
    return s === '' ? '-' : s;
  }

  /** Texto para el badge unificado: "19 · LAT" o solo "LAT" si no hay número */
  getNumeroPosicionTexto(player: any): string {
    if (!player) return '';
    const pos = this.getPositionShort(player.posicion);
    const num = this.getNumeroCamiseta(player);
    return num === '-' ? pos : num + ' · ' + pos;
  }

  /** Valor numérico para mostrar en tarjeta (entero, soporta 0–10 o 0–100) */
  getStatValue(value: any): string | number {
    try {
      const n = this.parseNumeric(value);
      if (!Number.isFinite(n)) return '0';
      if (n <= 10) return Number(n.toFixed(1));
      return Math.round(n);
    } catch {
      return '0';
    }
  }

  private parseNumeric(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getCardStat(player: any, keys: string[], fallback: number = 0): number {
    for (const key of keys) {
      if (player && player[key] !== null && player[key] !== undefined && player[key] !== '') {
        return this.parseNumeric(player[key]);
      }
    }
    return fallback;
  }

  getCardRating(player: any): number {
    const apiRating = this.getCardStat(player, ['calificacion', 'rating', 'mediaCalificacion'], -1);
    if (apiRating >= 0) {
      return Math.max(0, Math.min(10, apiRating));
    }

    const goals = this.getCardStat(player, ['goles'], 0);
    const assists = this.getCardStat(player, ['asistencias'], 0);
    const minutes = this.getCardStat(player, ['minTotales', 'minutosJugados', 'min'], 0);
    const yellow = this.getCardStat(player, ['tarAmarilla', 'tarjetasAmarillas', 'amarillas'], 0);
    const red = this.getCardStat(player, ['tarRojas', 'tarjetasRojas', 'rojas'], 0);

    const computed = 6 + goals * 0.25 + assists * 0.2 + Math.min(2, minutes / 900) - yellow * 0.08 - red * 0.35;

    return Math.max(0, Math.min(10, Number(computed.toFixed(1))));
  }

  getMinutesPct(player: any): number {
    const pct = this.getCardStat(player, ['porcentajeMin', 'porcentajeMinutos', 'porcMin'], -1);
    if (pct >= 0) return Math.max(0, Math.min(100, pct));

    const minutes = this.getCardStat(player, ['minTotales', 'minutosJugados', 'min'], 0);
    const matchesRaw = player?.partidosJugados;

    if (typeof matchesRaw === 'string' && matchesRaw.includes('/')) {
      const values = matchesRaw.split('/');
      const played = this.parseNumeric(values[0]);
      if (played > 0) {
        const pctComputed = (minutes / (played * 90)) * 100;
        return Math.max(0, Math.min(100, Number(pctComputed.toFixed(0))));
      }
    }

    return 0;
  }

  getAbsencePct(player: any): number {
    const pct = this.getCardStat(player, ['porcentajeAbs', 'porcentajeAusencias', 'porcAbs'], -1);
    if (pct >= 0) return Math.max(0, Math.min(100, pct));
    return 0;
  }

  ngOnInit(): void {
    const userAgent = navigator.userAgent || navigator.vendor;

    this.isAndroid = /android/i.test(userAgent);
    this.isiOS = /iPad|iPhone|iPod/.test(userAgent) && !('MSStream' in window);
    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'];
      this.cargarListadoJugadores();
    });

    if (localStorage.getItem('temporada') != null && localStorage.getItem('temporada') != undefined) {
      this.temporadaStoredValue = localStorage.getItem('temporada')!.toString();
    }

    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
      this.profileId = this.usuarioActual!.profileType.profileId;
      //this.playerIdsList = this.usuarioActual!.playerIds;
    });
    this.getListaPostpartidos();
    this.getListaProximosPartidos();
  }

  goBack(): void {
    this.location.back();
  }

  // Método para cargar el listado de equipos
  cargarListadoJugadores(): void {
    const teamIdStr = this.teamId != null && !Number.isNaN(this.teamId) ? this.teamId.toString() : '';
    if (!teamIdStr || teamIdStr === 'NaN') {
      this.players = [];
      this.datosCargados = true;
      this.cdr.detectChanges();
      return;
    }
    this.playerservice.getPlayers(teamIdStr).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data) {
          const data = response.data;
          // Aceptar response.data.players O response.data como array (según API)
          let rawPlayers = data.players;
          if (!Array.isArray(rawPlayers) && Array.isArray(data)) {
            rawPlayers = data;
          }
          this.players = Array.isArray(rawPlayers) ? [...rawPlayers] : [];
          this.clubId = data.clubId ?? this.clubId;
          this.applyFilter();
          this.cdr.detectChanges();

          // Si el perfil es > 2, filtra los jugadores según los playerIds del usuario actual
          if (this.profileId > 2 && this.usuarioActual?.playerIds && this.players.length > 0) {
            this.players = this.players.filter(player =>
              this.usuarioActual!.playerIds!.includes(player.playerId)
            );
            this.applyFilter();
          }
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
          this.players = [];
        }
        this.datosCargados = true;
        this.cdr.detectChanges();

        let goToDatos = false;
        let playerId = 0;
        for (let a = 0; a < this.players.length; a++) {
          if (this.players[a].apellido == null) {
            goToDatos = true;
            playerId = this.players[a].playerId;
            break;
          }
        }

        if (goToDatos && this.profileId == 3) {
          this.editarJugador(playerId);
          alert('Rellena estos datos para que el Club pueda acceder a los datos de tu hij@. '
            + 'Si sigues viendo esta pantalla, revisa que has puesto el apellido correctamente y no está todo puesto en el campo del nombre.');
        }

        // Si se navegó con ?openInfo=playerId (ej. desde info-jugadores o new-cuotas), abrir modal de ver información
        const q = this.route.snapshot.queryParams;
        const openInfoId = q['openInfo'] != null && q['openInfo'] !== '' ? +q['openInfo'] : null;
        const openInfoTab = (q['tab'] != null && q['tab'] !== '') ? q['tab'] : null;
        if (openInfoId != null) {
          const pl = this.players.find(p => p.playerId === openInfoId);
          if (pl) {
            this.verInfoJugador(pl);
            if (openInfoTab === 'financiera' && (this.usuarioActual?.profileType?.profileId ?? 0) === 1) {
              this.infoModalActiveTab = 'financiera';
              this.loadPagosCuotasIfNeeded();
            }
            this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
          }
        }
      },
      (error) => {
        console.error('Error al cargar el listado de jugadores', error);
        this.players = [];
        this.datosCargados = true;
        this.cdr.detectChanges();
      }
    );
  }

  private actualizarPaginacion(): void {
    this.totalRecords = this.filteredPlayers.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.playersPaged = [...this.filteredPlayers.slice(start, end)];
  }

  normalizeText(text: string): string {
    if (!text) return '';
    return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  applyFilter(): void {
    const filter = this.normalizeText(this.playerSearch);
    if (!filter) {
      this.filteredPlayers = [...this.players];
    } else {
      this.filteredPlayers = this.players.filter(player => {
        const fullName = this.normalizeText(`${player.nombre || ''} ${player.apellido || ''}`);
        return fullName.includes(filter);
      });
    }
    this.page = 1;
    this.actualizarPaginacion();
    this.cdr.detectChanges();
  }

  exportTableToExcel(): void {
    const tableElement = document.getElementById('playersDataTable');
    if (tableElement) {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableElement);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');
      XLSX.writeFile(wb, `jugadores_equipo_${this.teamId}.xlsx`, { bookType: 'xlsx' });
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.actualizarPaginacion();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.actualizarPaginacion();
    }
  }

  onPageSizeChange(): void {
    this.pageSize = Number(this.pageSize);
    this.page = 1;
    this.actualizarPaginacion();
  }

  get paginationInfo(): string {
    if (this.totalRecords === 0) return '';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.totalRecords);
    return `Mostrando ${start}–${end} de ${this.totalRecords}`;
  }

  trackByPlayer(_index: number, player: any): number {
    return player?.playerId ?? _index;
  }

  // Método para confirmar la eliminación del jugador
  confirmarEliminarJugador(playerId: number, name: string, surname: string): void {
    const confirmacion = confirm('¿Estás seguro de que deseas eliminar el jugador ' + name + ' ' + surname + ` con ID ${playerId}? Si está en Sin equipo, se eliminará completamente...`);
    if (confirmacion) {
      this.eliminarJugador(playerId);
    }
  }

  // Método para eliminar el jugador
  eliminarJugador(playerId: number): void {
    this.playerservice.deletePlayer(playerId, this.teamId, this.temporadaStoredValue, 1).subscribe(
      () => {
        const index = this.players.findIndex(p => p.playerId === playerId);
        if (index !== -1) this.players.splice(index, 1);
        this.actualizarPaginacion();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al eliminar el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  // Método para abrir el modal de creación de equipo
  abrirModalCrearJugador(): void {
    this.inicializePlayer();

    this.showPreview = false;
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.formModalActiveTab = 'personal';
    this.showModal = true;

    setTimeout(() => {
      this.enfocarPrimerCampo();
    }, 500);
  }

  // Método para cerrar el modal de creación de equipo
  cerrarModal(): void {
    this.showModal = false;
    this.selectedFile = null;
    this.showPreview = false;
    this.imagePreviewUrl = null;
    this.inicializePlayer();
  }

  // Método para crear o actualizar jugador; si es creación y hay foto seleccionada, se sube tras guardar
  crearJugador(): void {
    if (this.player.telefonoMadre != null || this.player.telefonoPadre != null) {
      const id = this.player.playerId;
      const fileToUpload = this.selectedFile;
      this.playerservice.createUpdatePlayer(this.teamId.toString(), this.player).subscribe(
        (response) => {
          if (id === 0) {
            this.players.push(response.data);
            const newPlayerId = response.data.playerId;
            if (fileToUpload) {
              this.trainingService.createUpdateImgPlayer(newPlayerId.toString(), fileToUpload).subscribe(
                (imgResponse) => {
                  const idx = this.players.findIndex(p => p.playerId === newPlayerId);
                  if (idx !== -1) this.players[idx].picturePlayer = imgResponse.data;
                  this.cerrarModal();
                  this.showAlertAndroid = true;
                },
                (err) => {
                  console.error('Error al subir la imagen del jugador', err);
                  this.cerrarModal();
                  this.showAlertAndroid = true;
                }
              );
            } else {
              this.cerrarModal();
              this.showAlertAndroid = true;
            }
          } else {
            this.cerrarModal();
            this.showAlertAndroid = true;
          }
        },
        (error) => {
          console.error('Error al crear el jugador:', error);
        }
      );
    } else {
      alert('Es obligatorio rellenar el número de teléfono de uno de los padres.');
    }
  }

  cerrarAlertaAndroid(): void {
    this.showAlertAndroid = false;
  }

  // Método para navegar a la pantalla de calendario
  navegarACalendario(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    //this.router.navigate(['/dashboard/calendario', this.teamId, 0]);
    this.router.navigate(['/dashboard/menu-entrenador', this.teamId, 0]);
  }

  navegarAtras(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    //this.router.navigate(['/dashboard/calendario', this.teamId, 0]);
    this.router.navigate(['/dashboard/menu-entrenador', this.teamId, 0]);
  }

  inicializePlayer() {
    this.player = {
      playerId: 0,
      nombre: '',
      apellido: '',
      posicion: 'Sin definir',
      fechaDeNacimiento: '',
      altura: '',
      peso: '',
      piernaNatural: 'Derecha',
      habilidadConBalon: '60',
      habilidadConBalonControlDeBalon: '60',
      habilidadConBalonRegate: '60',
      pase: '60',
      paseCorto: '60',
      paseLargo: '60',
      centros: '60',
      tiro: '60',
      tiroPotenciaDeTiro: '60',
      tiroDefinicion: '60',
      tiroTirosLejanos: '60',
      tiroVoleas: '60',
      tiroPrecisionFalta: '60',
      tiroPenaltis: '60',
      tiroCabezazo: '60',
      defensa: '60',
      defensaMarcaje: '60',
      defensaEntradas: '60',
      defensaRobos: '60',
      fisico: '60',
      fisicoAceleracion: '60',
      fisicoVelocidad: '60',
      fisicoAgilidad: '60',
      fisicoResistencia: '60',
      fisicoFuerza: '60',
      fisicoEquilibrio: '60',
      fisicoSalto: '60',
      mentalidad: '60',
      mentalidadAgresividad: '60',
      mentalidadAnticipacion: '60',
      mentalidadInterceptacion: '60',
      mentalidadVision: '60',
      mentalidadCompostura: '60',
      portero: '60',
      porteroColocacion: '60',
      porteroEstirada: '60',
      porteroParadas: '60',
      porteroSaques: '60',
      porteroReflejos: '60',
      especialidades: '',
      opinionDelEntrenador: '',
      picturePlayer: '',
      verify: 0,
      telefono: '',
      telefonoPadre: '',
      telefonoMadre: '',
      emailPadre: '',
      emailMadre: '',
      nick: '',
      numero: '',
      dni: '',
      nombrePadre: '',
      dniPadre: '',
      nombreMadre: '',
      dniMadre: '',
      posicionDos: 'Sin definir',
      email: '',
      nacionalidad: 'España',
      direccion: '',
      municipio: '',
      imgDniUno: '',
      imgDniDos: '',
      dniPadre1: '',
      dniPadre2: '',
      dniMadre1: '',
      dniMadre2: '',
      tutor1: 0,
      tutor2: 0,
      parentesco1: 0,
      parentesco2: 0,
      entidad: '',
      titularBanco: '',
      iban: ''
    };
  }

  editarJugador(playerId: number): void {
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);
    this.player = jugadorSeleccionado;

    if (this.player.tutor1 == 0 && this.player.tutor2 == 0 && this.profileId == 3) {
      //agregamos al usuario padre al tutor 1
      this.player.tutor1 = this.userId;
      this.player.parentesco1 = this.usuarioActual!.parentesco;
    }

    if (this.profileId == 3 && (this.player.tutor1 != 0 || this.player.tutor2 != 0)) {
      if (this.player.tutor1 === this.userId) {
        this.showTutor1 = true;

        if (this.player.nombrePadre == null) {
          alert(`Rellena tus datos como padre, madre o tutor`);
        }
      } else if (this.player.tutor2 === this.userId) {
        this.showTutor2 = true;
      }
    }

    if (this.profileId < 3) {
      this.showTutor1 = true;
      this.showTutor2 = true;
    }

    if (this.profileId < 3) {
      this.parentTutor1 = 'Padre';
      this.parentTutor2 = 'Madre';
    } else {
      switch (this.player.parentesco1) {
        case 1: //padre
          this.parentTutor1 = 'Padre';
          break;
        case 2: //madre
          this.parentTutor1 = 'Madre';
          break;
      }

      switch (this.player.parentesco2) {
        case 1: //padre
          this.parentTutor2 = 'Padre';
          break;
        case 2: //madre
          this.parentTutor2 = 'Madre';
          break;
      }
    }



    this.showPortero(this.player.posicion);
    this.promedioPase();
    this.promedioDefensa();
    this.promedioFisico();
    this.promedioHabilidad();
    this.promedioMentalidad();
    this.promedioTiro();
    this.promedioPortero();
    this.showPreview = false;
    this.formModalActiveTab = 'personal';
    this.showModal = true;

    setTimeout(() => {
      this.enfocarPrimerCampo();
    }, 500);
  }

  onTutorCheck(): void {
    const confirmado = confirm(
      'Vas a firmar la confirmación de que estás autorizado por el otro progenitor o tutor para ver o rellenar sus datos, ¿estás seguro?'
    );

    if (confirmado) {
      this.showTutor2 = true;
    }
  }

  onTutorCheck2(): void {
    const confirmado = confirm(
      'Vas a firmar la confirmación de que estás autorizado por el otro progenitor o tutor para ver o rellenar sus datos, ¿estás seguro?'
    );

    if (confirmado) {
      this.showTutor1 = true;
    }
  }

  private enfocarPrimerCampo() {
    if (this.primerCampo) {
      this.primerCampo.nativeElement.focus();
    }
  }

  verInfoJugador(player: Player): void {
    this.partidosJugados = 0;
    this.titularidades = 0;
    this.minutosJugados = 0;
    this.goles = 0;
    this.tarjetasAmarillas = 0;
    this.tarjetasRojas = 0;
    this.numTitulares = 0;
    this.pagosCuotasData = null;
    this.pagosCuotasError = false;
    this.getInfoAsistencia(player.playerId);
    this.getDatosPlayer(player.playerId);
    this.selectedPlayer = player;
    this.edadSeleccionada = this.fechaEnEspañol(this.selectedPlayer.fechaDeNacimiento) + ' (' + this.calcularEdad(player.fechaDeNacimiento) + ')';
    this.mostrarEdad = true;
    this.infoModalActiveTab = 'personal';
  }

  setInfoModalTab(tab: string): void {
    this.infoModalActiveTab = tab;
    if (tab === 'financiera') {
      this.loadPagosCuotasIfNeeded();
    }
  }

  setFormModalTab(tab: 'personal' | 'deportiva'): void {
    this.formModalActiveTab = tab;
  }

  loadPagosCuotasIfNeeded(): void {
    if (this.pagosCuotasLoading || this.pagosCuotasData !== null) { return; }
    const playerId = this.selectedPlayer?.playerId;
    if (!playerId || !this.teamId) { return; }
    this.pagosCuotasLoading = true;
    this.pagosCuotasError = false;
    this.playerService.getPagocuotasPlayer(this.teamId, playerId).subscribe({
      next: (res) => {
        this.pagosCuotasData = res?.data ?? null;
        this.pagosCuotasLoading = false;
      },
      error: () => {
        this.pagosCuotasError = true;
        this.pagosCuotasLoading = false;
      }
    });
  }

  formatearPlazo(plazo: string): string {
    if (!plazo) return '—';
    const d = new Date(plazo);
    if (isNaN(d.getTime())) return plazo;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get progresoFinancieroPorcentaje(): number {
    const d = this.pagosCuotasData;
    if (!d) return 0;
    const pagado = parseFloat(d.totalPagado || '0') || 0;
    const pendiente = parseFloat(d.pendiente || '0') || 0;
    const total = pagado + pendiente;
    return total > 0 ? Math.round((pagado / total) * 100) : 0;
  }

  // Método para cargar el gráfico de radar con los datos del jugador
  cargarGraficoRadar() {
    // Antes de crear el nuevo gráfico, destruye el gráfico existente si es necesario
    if (this.radarChart) {
      this.radarChart.destroy(); // Destruye el gráfico existente
    }
    const ctx = document.getElementById('radarChart') as HTMLCanvasElement;

    let labels = ['Habilidad con balon', 'Pase', 'Tiro', 'Defensa', 'Físico', 'Mentalidad'];
    let data = [
      parseInt(this.selectedPlayer.habilidadConBalon),
      parseInt(this.selectedPlayer.pase),
      parseInt(this.selectedPlayer.tiro),
      parseInt(this.selectedPlayer.defensa),
      parseInt(this.selectedPlayer.fisico),
      parseInt(this.selectedPlayer.mentalidad)
    ];

    if (this.selectedPlayer.posicion === 'Portero') {
      labels = ['Habilidad con balon', 'Pase', 'Tiro', 'Defensa', 'Físico', 'Mentalidad', 'Portero'];
      data = [
        parseInt(this.selectedPlayer.habilidadConBalon),
        parseInt(this.selectedPlayer.pase),
        parseInt(this.selectedPlayer.tiro),
        parseInt(this.selectedPlayer.defensa),
        parseInt(this.selectedPlayer.fisico),
        parseInt(this.selectedPlayer.mentalidad),
        parseInt(this.selectedPlayer.portero)
      ];
    }

    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: '',
          data: data,
          backgroundColor: 'rgba(49, 178, 112, 0.25)',
          borderColor: 'rgb(0, 80, 40)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(0, 80, 40)',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        layout: {
          padding: { top: 4, right: 4, bottom: 4, left: 4 }
        },
        plugins: {
          title: { display: false },
          legend: { display: false }
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            angleLines: {
              display: true,
              color: 'rgba(0, 44, 64, 0.15)',
              lineWidth: 1
            },
            grid: {
              color: 'rgba(0, 44, 64, 0.12)'
            },
            pointLabels: {
              font: { size: 12 },
              color: 'rgba(0, 44, 64, 0.9)',
              backdropColor: 'transparent'
            },
            ticks: {
              display: true,
              stepSize: 25,
              font: { size: 10 },
              color: 'rgba(0, 44, 64, 0.5)'
            }
          }
        }
      }
    });
  }

  // Método para cerrar el modal de información del jugador
  cerrarModalInfoJugador() {
    this.mostrarModalInfoJugador = false;
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

  promedioDefensa() {
    const a = parseFloat(this.player.defensaMarcaje) || 0;
    const b = parseFloat(this.player.defensaEntradas) || 0;
    const c = parseFloat(this.player.defensaRobos) || 0;

    const promedio = Math.round((a + b + c) / 3); // Redondear al entero más cercano
    this.player.defensa = promedio.toString();
  }

  promedioHabilidad() {
    const a = parseFloat(this.player.habilidadConBalonControlDeBalon) || 0;
    const b = parseFloat(this.player.habilidadConBalonRegate) || 0;

    const promedio = Math.round((a + b) / 2); // Redondear al entero más cercano
    this.player.habilidadConBalon = promedio.toString();
  }

  promedioPase() {
    const a = parseFloat(this.player.paseCorto) || 0;
    const b = parseFloat(this.player.paseLargo) || 0;
    const c = parseFloat(this.player.centros) || 0;

    const promedio = Math.round((a + b + c) / 3); // Redondear al entero más cercano
    this.player.pase = promedio.toString();
  }

  promedioTiro() {
    const a = parseFloat(this.player.tiroPotenciaDeTiro) || 0;
    const b = parseFloat(this.player.tiroDefinicion) || 0;
    const c = parseFloat(this.player.tiroTirosLejanos) || 0;
    const d = parseFloat(this.player.tiroVoleas) || 0;
    const e = parseFloat(this.player.tiroPrecisionFalta) || 0;
    const f = parseFloat(this.player.tiroPenaltis) || 0;
    const g = parseFloat(this.player.tiroCabezazo) || 0;

    const promedio = Math.round((a + b + c + d + e + f + g) / 7); // Redondear al entero más cercano
    this.player.tiro = promedio.toString();
  }

  promedioFisico() {
    const a = parseFloat(this.player.fisicoAceleracion) || 0;
    const b = parseFloat(this.player.fisicoVelocidad) || 0;
    const c = parseFloat(this.player.fisicoAgilidad) || 0;
    const d = parseFloat(this.player.fisicoResistencia) || 0;
    const e = parseFloat(this.player.fisicoFuerza) || 0;
    const f = parseFloat(this.player.fisicoEquilibrio) || 0;
    const g = parseFloat(this.player.fisicoSalto) || 0;

    const promedio = Math.round((a + b + c + d + e + f + g) / 7); // Redondear al entero más cercano
    this.player.fisico = promedio.toString();
  }

  promedioMentalidad() {
    const a = parseFloat(this.player.mentalidadAgresividad) || 0;
    const b = parseFloat(this.player.mentalidadAnticipacion) || 0;
    const c = parseFloat(this.player.mentalidadInterceptacion) || 0;
    const d = parseFloat(this.player.mentalidadVision) || 0;
    const e = parseFloat(this.player.mentalidadCompostura) || 0;

    const promedio = Math.round((a + b + c + d + e) / 5); // Redondear al entero más cercano
    this.player.mentalidad = promedio.toString();
  }

  promedioPortero() {
    const a = parseFloat(this.player.porteroColocacion) || 0;
    const b = parseFloat(this.player.porteroEstirada) || 0;
    const c = parseFloat(this.player.porteroParadas) || 0;
    const d = parseFloat(this.player.porteroSaques) || 0;
    const e = parseFloat(this.player.porteroReflejos) || 0;

    const promedio = Math.round((a + b + c + d + e) / 5); // Redondear al entero más cercano
    this.player.portero = promedio.toString();
  }

  /*onFileSelected(event: any) {
    if (event.target.files[0].type === 'image/png' || event.target.files[0].type === 'image/jpeg') {
      this.selectedFile = event.target.files[0];
      this.showbtnupimg = true;
      if (this.selectedFile) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrl = e.target.result;
          this.showPreview = true; // Mostrar vista previa
        };
        reader.readAsDataURL(this.selectedFile);
      }
    } else {
      this.showbtnupimg = false;
    }
  }*/

  onSubmit(playerId: number) {
    if (this.selectedFile) {
      this.trainingService.createUpdateImgPlayer(playerId.toString(), this.selectedFile)
        .subscribe(
          (response) => {
            const updatedImgPlayer = response.data;

            // Encuentra el jugador en el arreglo y actualiza su imgPlayer
            const index = this.players.findIndex(player => player.playerId === playerId);
            if (index !== -1) {
              this.players[index].picturePlayer = updatedImgPlayer;
            }
            this.cerrarModal();
          },
          error => {
            console.error('Error al subir la imagen', error);
          }
        );
    } else {
      console.log('Ninguna imagen seleccionada.');
    }
  }


  rotateImage() {
    if (!this.imagePreviewUrl) return;

    if (typeof this.imagePreviewUrl !== 'string') {
      console.error('Error: imagePreviewUrl no es una cadena.');
      return;
    }

    const img = new Image();
    img.src = this.imagePreviewUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Incrementar el ángulo de rotación en 90 grados
      this.rotateAngle = (this.rotateAngle + 90) % 360;

      // Configurar dimensiones del canvas según el ángulo
      if (this.rotateAngle === 90 || this.rotateAngle === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Rotar el canvas
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((this.rotateAngle * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // Actualizar la URL de vista previa
      this.imagePreviewUrl = canvas.toDataURL('image/jpeg');

      // Convertir el contenido del canvas en un archivo Blob
      canvas.toBlob((blob) => {
        if (blob) {
          this.selectedFile = new File([blob], 'rotated-image.jpg', { type: 'image/jpeg' });
        }
      }, 'image/jpeg');
    };
  }



  onFileSelected(event: any) {
    const file = event.target.files[0];

    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      this.selectedFile = file;
      this.showbtnupimg = true;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const result = e.target.result;
        // Convertimos a string si es necesario
        if (typeof result === 'string') {
          this.imagePreviewUrl = result;
          this.showPreview = true;
        } else {
          console.error('El resultado del archivo no es un string.');
        }
      };

      reader.readAsDataURL(file);
    } else {
      this.showbtnupimg = false;
    }
  }



  navegarAAsistencia(): void {
    // Puedes ajustar la ruta según tu estructura de rutas
    this.router.navigate(['/dashboard/informacion_equipo/asistencia', this.teamId]);
  }

  invitarJugador(playerId: number): void {
    this.selectedPlayerId = playerId;
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);

    this.nombreJugador = jugadorSeleccionado.nombre;

    // Calcular la fecha actual
    const fechaActual = new Date();

    // Calcular la fecha de nacimiento del jugador
    const fechaNacimiento = new Date(jugadorSeleccionado.fechaDeNacimiento);

    // Calcular la edad del jugador
    let edad = fechaActual.getFullYear() - fechaNacimiento.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;
    const mesNacimiento = fechaNacimiento.getMonth() + 1;

    // Si el mes actual es menor que el mes de nacimiento o si es el mismo mes pero el día actual es menor que el día de nacimiento,
    // entonces el jugador no ha cumplido años todavía
    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && fechaActual.getDate() < fechaNacimiento.getDate())) {
      edad--;
    }

    // Comprobar si el jugador es menor de 14 años
    this.isMenor = edad < 14;
    this.showModalInvitar = true;
  }

  cerrarModalInvitar() {
    this.showModalInvitar = false;
  }

  openShowModalMover(playerId: number, index: number): void {
    const jugadorSeleccionado = this.players.find(player => player.playerId === playerId);
    this.nombreJugador = jugadorSeleccionado.nombre + ' ' + jugadorSeleccionado.apellido;
    this.playerIdSelected = playerId;

    this.teamService.getTeamsByClubForCombo(this.clubId, this.temporada).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
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

  moverJugador(): void {
    let cuotaTbm = 0;
    /*const confirmacion = confirm('Pulsa aceptar para cambiar también a las cuotas que tenga ese equipo o pulsa para cancelar y mantener la propia cuota que tenga este jugador.');
    if (confirmacion) {
      cuotaTbm = 1;
    }*/

    if (this.teamSelected == 0) {
      alert('Selecciona un equipo del desplegable.');
    } else {
      this.teamService.movePlayer(this.playerIdSelected, this.teamId, this.teamSelected, cuotaTbm, this.addPlayerMoved ? 1 : 0).subscribe(
        (response: Response) => {
          // Verifica que la propiedad 'data' exista en la respuesta
          if (response.data !== null) {
            if(!this.addPlayerMoved)
              this.players.splice(this.indexSelected, 1);

            this.showModalMover = false;
            this.addPlayerMoved = false;
            this.teamSelected = 0;
          } else {
            console.error('La respuesta del servicio no tiene la estructura esperada', response);
          }
        },
        (error) => {
          console.error('Error al cargar el listado de equipos', error);
        }
      );
    }
  }

  cerrarModalMover() {
    this.showModalMover = false;
  }

  enviarMailJugador() {
    if (this.userForm.valid) {
      let menor = 1;
      /*if (this.isMenor) {
        menor = 1;
      }*/

      const normalizedEmail = this.normalizeEmail(this.userForm.value.mail);

      this.registerService.invitePlayer(normalizedEmail, this.selectedPlayerId, menor, this.teamId).pipe().subscribe(
        res => {
          if (res.data) {
            //ocultar sobre TODO
          }
          this.cerrarModalInvitar();
          const snackBarConfig = new MatSnackBarConfig();
          snackBarConfig.duration = 5000;
          snackBarConfig.horizontalPosition = 'center';
          snackBarConfig.verticalPosition = 'bottom';
          this.snackBar.open('Invitación enviada correctamente.', 'Cerrar', snackBarConfig);
        }
      )
    }
  }

  removeAccents(text: string) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  normalizeEmail(email: string) {
    // Elimina las tildes de toda la cadena de correo electrónico
    return this.removeAccents(email.toLowerCase());
  }

  showPortero(value: string) {
    if (value === 'Portero')
      this.showPorteroOptions = true;
    else
      this.showPorteroOptions = false;
  }

  abrirModalDniJugador(player: any) {
    this.playerIdSelected = player.playerId;
    this.selectedPlayer = player;
    this.mostrarModalDniJugador = true;
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
        // Muestra un mensaje de error si el archivo no es PNG o JPEG
        alert('Formato de archivo no válido. Por favor, sube una imagen en formato PNG o JPEG.');
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
                this.player.imgDniUno = response.data;
                break;
              case 1:
                this.player.imgDniDos = response.data;
                break;
              case 2:
                this.player.dniPadre1 = response.data;
                break;
              case 3:
                this.player.dniPadre2 = response.data;
                break;
              case 4:
                this.player.dniMadre1 = response.data;
                break;
              case 5:
                this.player.dniMadre2 = response.data;
                break;
            }

            this.snackBar.open('Imagen subida correctamente.', 'Cerrar', {
              duration: 3000,
            });
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
    const urlBackend = environment.apiUrl + `commons/download-image?url=${encodeURIComponent(url)}`;

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

  getListTableAsistencia(playerId: number) {
    this.trainingService.getListsAsistenciaByTeamYPlayer(this.teamId, playerId).subscribe(
      (response) => {
        if (response.data) {
          console.log(response.data);
          this.listAsistencia = response.data;
          /*this.players = response.data.players;
          this.asistMultasPlayers = response.data.asistMultasPlayers;
          this.numTotal = this.asistMultasPlayers.length;
          this.asistTotales = response.data.asistenciaTotales;*/
        }
        this.showModalAsistencia = true;
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  cerrarModalAsistencia() {
    this.showModalAsistencia = false;
  }

  next() {
    if (this.currentIndex + 4 < this.partidos.length) {
      this.currentIndex += 4;
    }
  }

  prev() {
    if (this.currentIndex - 4 >= 0) {
      this.currentIndex -= 4;
    }
  }

  next2() {
    if (this.currentIndex2 + 4 < this.partidos2.length) {
      this.currentIndex2 += 4;
    }
  }

  prev2() {
    if (this.currentIndex2 - 4 >= 0) {
      this.currentIndex2 -= 4;
    }
  }

  getVisibleItems() {
    return this.partidos.slice(this.currentIndex, this.currentIndex + 4);
  }

  getVisibleItems2() {
    return this.partidos2.slice(this.currentIndex2, this.currentIndex2 + 4);
  }

  getListaPostpartidos() {
    this.partidos = [];
    this.playerService.getListPlayersByTeamForGalery(this.teamId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.partidos = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  getListaProximosPartidos() {
    this.partidos2 = [];
    this.playerService.getListProximosPartidos(this.teamId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response && response.data && Array.isArray(response.data)) {
          // Mapea los datos bajo 'data' a instancias del modelo Team
          this.partidos2 = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  getInfoAsistencia(playerId: number) {
    this.trainingService.getListsAsistenciaByTeamYPlayer(this.teamId, playerId).subscribe(
      (response) => {
        if (response.data) {
          console.log(response.data);
          this.listAsistencia = response.data;
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  getDatosPlayer(playerId: number) {
    this.playerService.getDatosPlayer(this.teamId, playerId).subscribe(
      (response) => {
        if (response.data) {
          //this.listAsistencia = response.data;
          this.partidosJugados = response.data.partidosJugados;
          this.minutosJugados = response.data.minutosJugados;
          this.goles = response.data.goles;
          this.tarjetasAmarillas = response.data.tarAmarillas;
          this.tarjetasRojas = response.data.tarRojas;
          this.numTitulares = response.data.numTitulares;
        }
        this.mostrarModalInfoJugador = true; // Activa el indicador para mostrar el modal
        setTimeout(() => this.cargarGraficoRadar(), 80); // Gráfica en el hero; dibujar cuando el modal ya está visible
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );

    /*partidosJugados: string = '';
    titularidades: string = '';
    minutosJugados: string = '';
    goles: string = '';
    tarjetasAmarillas: string = '';
    tarjetasRojas: string = '';*/
  }

  savePlayerInfo() {
    // Aquí iría tu llamada real al backend:
    const dto = this.playerInfo;

    this.playerService.updatePlayerInfo(dto).subscribe({
      next: (res) => {
        alert('Información guardada.');
      },
      error: (err) => {
        console.error(err);
        alert('Error al subir el documento');
      }
    });
  }

  showPlayerInfo(playerId: number) {
    this.playerService.getPlayerInfo(playerId).subscribe(
      (response) => {
        if (response.data) {
          console.log(response.data);
          this.playerInfo = response.data;
          this.showModalPlayerInfo = true
        }
      },
      (error) => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

}
