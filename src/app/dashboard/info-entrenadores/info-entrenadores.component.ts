import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import { getCurrentSeasonString, getSeasons } from 'src/app/core/utils/season.utils';

/* =========================
   INTERFACES
========================= */

export interface Trainer {
  trainerId: number;
  playerId: number;
  userId?: number;
  nombre: string;
  apellido: string;
  picturePlayer: string;
  fechaDeNacimiento: string;
  telefono: string;
  dni: string;
  email: string;
  teamId: number;
  nameTeam: string;
  teams?: string[];           // Si entrena varios equipos
  imgDniUno?: string;
  imgDniDos?: string;
  // Campos del perfil de entrenador
  documentoIdentidad?: string;
  tipoDocumento?: string;
  direccion?: string;
  nacionalidad?: string;
  licenciaFederativa?: string;
  titulacionDeportiva?: string;
  certDelitosSexuales?: string;
  certAntecedentesPenales?: string;
  seguroResponsabilidad?: string;
  formacionPrimerosAuxilios?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
}

export interface TrainerHistory {
  temporada: string;
  escudo: string;
  club: string;
  categoria: string;
  nivelEquipo: string;
  posicionTabla: number | string;
  victorias: number;
  empates: number;
  derrotas: number;
  golesAFavor: number;
  golesEnContra: number;
}

@Component({
  selector: 'app-info-entrenadores',
  templateUrl: './info-entrenadores.component.html',
  styleUrls: ['./info-entrenadores.component.scss'],
})
export class InfoEntrenadoresComponent implements OnInit {
  clubId = 0;
  loading = true;
  datosCargados = false;

  teams: any[] = [];
  trainers: Trainer[] = [];
  filteredTrainers: Trainer[] = [];

  trainerSearch = '';
  teamSelected: number = -1;

  imageBaseUrlUser: string = environment.images + 'user/';
  imageBaseUrlPlayerDni: string = environment.images + 'playerDni/';
  imageBaseUrlEntrenadorDocs: string = environment.images + 'entrenador-docs/';
  perfilesEntrenadores: any[] = [];

  seasons = getSeasons();
  temporadaStoredValue = getCurrentSeasonString();

  usuarioActual!: User | null;
  userId: number = 0;

  /* ---- Modal info entrenador ---- */
  mostrarModalInfo = false;
  selectedTrainer: any = null;

  /* ---- Modal DNI ---- */
  mostrarModalDni = false;
  dniCara1: string | ArrayBuffer | null | undefined = null;
  dniCara2: string | ArrayBuffer | null | undefined = null;
  selectedFileCara1: File | null = null;
  selectedFileCara2: File | null = null;
  indexSelected = 0;
  trainerIdSelected = 0;

  /* ---- Modal Documentos ---- */
  mostrarModalDoc = false;
  mostrarModalDocUpload = false;
  mostrarModalDocView = false;
  listaDocumentos: any[] = [];
  archivoSeleccionado!: File | null;
  docTemp: any;

  /* ---- Modal campos personalizados del perfil ---- */
  mostrarModalCustomFields = false;

  /* ---- Modal Certificados ---- */
  mostrarModalCerts = false;

  /* ---- Ordenación de tabla ---- */
  sortColumn = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  /* ---- Campos personalizados dinámicos ---- */
  customFields: any[] = [];
  customFieldResponses: { [userId: number]: { [campoId: number]: { valor: string; file: string; tipo: string } } } = {};

  /* ---- Modal Historial deportivo ---- */
  mostrarModalHistorial = false;
  historialDeportivo: TrainerHistory[] = [];
  loadingHistorial = false;

  /* ---- Datos demo historial ---- */
  private demoHistorial: TrainerHistory[] = [
    {
      temporada: '2024-2025',
      escudo: '',
      club: 'Club actual',
      categoria: 'Juvenil A',
      nivelEquipo: 'División de Honor',
      posicionTabla: 3,
      victorias: 18,
      empates: 5,
      derrotas: 7,
      golesAFavor: 52,
      golesEnContra: 31,
    },
    {
      temporada: '2023-2024',
      escudo: '',
      club: 'Club anterior',
      categoria: 'Cadete B',
      nivelEquipo: 'Preferente',
      posicionTabla: 1,
      victorias: 22,
      empates: 4,
      derrotas: 4,
      golesAFavor: 68,
      golesEnContra: 22,
    },
    {
      temporada: '2022-2023',
      escudo: '',
      club: 'Club anterior',
      categoria: 'Infantil A',
      nivelEquipo: '1ª División',
      posicionTabla: 5,
      victorias: 14,
      empates: 8,
      derrotas: 8,
      golesAFavor: 41,
      golesEnContra: 35,
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private clubService: ClubService,
    private loginService: LoginService,
    private snackBar: MatSnackBar,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user) => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
    });

    this.route.params.subscribe((params) => {
      this.clubId = +params['clubId'];
    });

    const temporadaLS = localStorage.getItem('temporada');
    if (temporadaLS) {
      this.temporadaStoredValue = temporadaLS;
    }

    this.cargarListadoEntrenadores();
  }

  /* =========================
     TEMPORADA
  ========================= */

  onTemporadaChange(): void {
    localStorage.setItem('temporada', this.temporadaStoredValue);
    this.cargarListadoEntrenadores();
  }

  /* =========================
     CARGA DE DATOS
  ========================= */

  cargarListadoEntrenadores(): void {
    this.loading = true;

    // Usamos el mismo endpoint de jugadores del club agrupado por equipos.
    // Los entrenadores vienen en response.data.trainers si existe, o simulamos
    // con los datos del endpoint de jugadores agrupados por equipo.
    this.clubService
      .getListEntrenadoresByClubForTemp(this.clubId, this.temporadaStoredValue)
      .subscribe(
        (response: Response) => {
          if (response && response.data) {
            this.teams = response.data.teams || [];
            const allTrainers: Trainer[] = [];

            for (const team of this.teams) {
              if (team.trainers && team.trainers.length > 0) {
                for (const t of team.trainers) {
                  // Check if trainer already exists (may train multiple teams)
                  // Use userId for deduplication (playerId can be 0 for coaches)
                  const existing = allTrainers.find(
                    (tr) => tr.userId === t.userId
                  );
                  if (existing) {
                    if (!existing.teams) existing.teams = [existing.nameTeam];
                    existing.teams.push(team.nameTeam);
                  } else {
                    allTrainers.push({
                      ...t,
                      teamId: team.teamId,
                      nameTeam: team.nameTeam,
                      teams: [team.nameTeam],
                    });
                  }
                }
              }
            }

            this.trainers = allTrainers;
            this.filteredTrainers = [...allTrainers];

            // Cargar perfiles de entrenadores para enriquecer datos
            this.cargarPerfilesEntrenadores();
            // Cargar campos personalizados dinámicos
            this.cargarCamposPersonalizados();
          }
          this.datosCargados = true;
          this.loading = false;
        },
        (error) => {
          console.error('Error al cargar entrenadores', error);
          this.loading = false;
          this.datosCargados = true;
        }
      );
  }

  cargarPerfilesEntrenadores(): void {
    this.clubService.getPerfilesEntrenadoresByClub(this.clubId).subscribe(
      (response: any) => {
        if (response?.data) {
          this.perfilesEntrenadores = response.data;
          // Enriquecer trainers con datos del perfil
          for (const trainer of this.trainers) {
            const perfil = this.perfilesEntrenadores.find(
              (p: any) => p.userId === trainer.trainerId
            );
            if (perfil) {
              trainer.documentoIdentidad = perfil.documentoIdentidad || trainer.dni;
              trainer.tipoDocumento = perfil.tipoDocumento;
              trainer.direccion = perfil.direccion;
              trainer.nacionalidad = perfil.nacionalidad;
              trainer.licenciaFederativa = perfil.licenciaFederativa;
              trainer.titulacionDeportiva = perfil.titulacionDeportiva;
              trainer.certDelitosSexuales = perfil.certDelitosSexuales;
              trainer.certAntecedentesPenales = perfil.certAntecedentesPenales;
              trainer.seguroResponsabilidad = perfil.seguroResponsabilidad;
              trainer.formacionPrimerosAuxilios = perfil.formacionPrimerosAuxilios;
              trainer.contactoEmergenciaNombre = perfil.contactoEmergenciaNombre;
              trainer.contactoEmergenciaTelefono = perfil.contactoEmergenciaTelefono;
              trainer.imgDniUno = perfil.imgDocFrontal;
              trainer.imgDniDos = perfil.imgDocTrasera;
            }
          }
          this.filteredTrainers = [...this.trainers];
        }
      }
    );
  }

  /* =========================
     FILTROS
  ========================= */

  applyFilter(): void {
    const filter = this.normalizeText(this.trainerSearch);
    let list = this.trainers;

    // Filtrar por equipo
    if (this.teamSelected >= 0) {
      const teamName = this.teams[this.teamSelected]?.nameTeam;
      if (teamName) {
        list = list.filter(
          (t) =>
            t.nameTeam === teamName ||
            (t.teams && t.teams.includes(teamName))
        );
      }
    }

    if (!filter) {
      this.filteredTrainers = list;
      return;
    }

    this.filteredTrainers = list.filter((t) => {
      const fullName = this.normalizeText(`${t.nombre} ${t.apellido}`);
      return (
        fullName.includes(filter) ||
        (t.nameTeam && this.normalizeText(t.nameTeam).includes(filter)) ||
        (t.telefono && this.normalizeText(t.telefono).includes(filter)) ||
        (t.dni && this.normalizeText(t.dni).includes(filter)) ||
        (t.email && this.normalizeText(t.email).includes(filter)) ||
        (t.documentoIdentidad && this.normalizeText(t.documentoIdentidad).includes(filter)) ||
        (t.nacionalidad && this.normalizeText(t.nacionalidad).includes(filter)) ||
        (t.licenciaFederativa && this.normalizeText(t.licenciaFederativa).includes(filter)) ||
        (t.titulacionDeportiva && this.normalizeText(t.titulacionDeportiva).includes(filter))
      );
    });
  }

  loadTrainersOfTeam(): void {
    this.applyFilter();
  }

  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /* =========================
     EXCEL
  ========================= */

  exportTableToExcel(): void {
    const tableElement = document.getElementById('dataTableEntrenadores');
    if (tableElement) {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(tableElement);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Entrenadores');
      XLSX.writeFile(wb, 'entrenadores.xlsx', { bookType: 'xlsx' });
    }
  }

  /* =========================
     MODAL INFO
  ========================= */

  abrirModalInfo(trainer: any): void {
    this.selectedTrainer = trainer;
    this.mostrarModalInfo = true;
  }

  cerrarModalInfo(): void {
    this.mostrarModalInfo = false;
    this.selectedTrainer = null;
  }

  /* =========================
     MODAL DNI
  ========================= */

  abrirModalDni(trainer: any, index: number): void {
    this.indexSelected = index;
    this.trainerIdSelected = trainer.playerId;
    this.selectedTrainer = trainer;
    this.mostrarModalDni = true;
  }

  cerrarModalDni(): void {
    this.dniCara1 = null;
    this.dniCara2 = null;
    this.mostrarModalDni = false;
  }

  onFileChangeDni(event: any, cara: string): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
        alert('Formato no válido. Solo PNG o JPEG.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (cara === 'cara1') {
          this.dniCara1 = e.target?.result;
          this.selectedFileCara1 = file;
        } else {
          this.dniCara2 = e.target?.result;
          this.selectedFileCara2 = file;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  /* =========================
     MODAL DOCUMENTOS
  ========================= */

  abrirModalDoc(trainer: any, index: number): void {
    this.indexSelected = index;
    this.trainerIdSelected = trainer.playerId;
    this.selectedTrainer = trainer;
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.clubService
      .getListDocumentosPlayer(0, this.trainerIdSelected)
      .subscribe(
        (response: Response) => {
          if (response.data !== null) {
            this.listaDocumentos = response.data;
            this.mostrarModalDoc = true;
          }
        },
        (error) => {
          console.error('Error al cargar documentos', error);
        }
      );
  }

  cerrarModalDoc(): void {
    this.mostrarModalDoc = false;
  }

  subir(doc: any): void {
    this.mostrarModalDocUpload = true;
    this.docTemp = doc;
  }

  cerrarModalDocUpload(): void {
    this.mostrarModalDocUpload = false;
  }

  verDocSubido(doc: any): void {
    this.mostrarModalDocView = true;
    this.docTemp = doc;
  }

  cerrarModalDocView(): void {
    this.mostrarModalDocView = false;
  }

  descargar(doc: any): void {
    if (!doc.fileClub) return;
    const url = 'https://appsphairatech.com/images/documentos/' + doc.fileClub;
    window.open(url, '_blank');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        this.archivoSeleccionado = file;
      } else {
        alert('Solo se permiten archivos PDF o Word.');
        this.archivoSeleccionado = null;
      }
    }
  }

  subirDocumento(): void {
    const file = this.archivoSeleccionado;
    const dto = {
      docPadresId: this.docTemp.docPadresId,
      docClubesId: this.docTemp.docClubesId,
      nombre: this.docTemp.nombre,
      file: null,
      clubId: this.docTemp.clubId,
      fecCreate: null,
      descargado: this.docTemp.descargado,
      subido: 1,
      playerId: this.docTemp.playerId,
      userId: this.userId,
      descripcion: '',
      requiere: this.docTemp.requiere,
    };

    if (file) {
      this.clubService.uploadDocPadres(file, dto).subscribe({
        next: () => {
          this.loadDocuments();
          this.snackBar.open('Documento subido correctamente', 'Cerrar', { duration: 3000 });
          this.cerrarModalDocUpload();
        },
        error: () => {
          this.snackBar.open('Error al subir el documento', 'Cerrar', { duration: 3000 });
        },
      });
    } else {
      alert('Selecciona un archivo para subir.');
    }
  }

  esImagen(nombreArchivo: string): boolean {
    const extensiones = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = nombreArchivo?.toLowerCase().split('.').pop();
    return extensiones.includes('.' + ext);
  }

  /* =========================
     HISTORIAL DEPORTIVO
  ========================= */

  abrirModalHistorial(trainer: any): void {
    this.selectedTrainer = trainer;
    this.loadingHistorial = true;
    this.mostrarModalHistorial = true;

    // TODO: Reemplazar con llamada real al servicio cuando esté disponible
    // this.clubService.getTrainerHistory(trainer.playerId).subscribe(...)
    setTimeout(() => {
      this.historialDeportivo = this.demoHistorial;
      this.loadingHistorial = false;
    }, 600);
  }

  cerrarModalHistorial(): void {
    this.mostrarModalHistorial = false;
    this.historialDeportivo = [];
  }

  /* =========================
     UTILIDADES
  ========================= */

  formatFechaEspana(fecha: string): string {
    if (!fecha) return '';
    const isoFormat = /^\d{4}-\d{2}-\d{2}$/;
    if (isoFormat.test(fecha)) {
      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    }
    const spanishWithDashes = /^\d{2}-\d{2}-\d{4}$/;
    if (spanishWithDashes.test(fecha)) {
      const [day, month, year] = fecha.split('-');
      return `${day}/${month}/${year}`;
    }
    return fecha;
  }

  /* =========================
     CAMPOS PERSONALIZADOS PERFIL
  ========================= */

  abrirModalCustomFields(): void {
    this.mostrarModalCustomFields = true;
  }

  cerrarModalCustomFields(): void {
    this.mostrarModalCustomFields = false;
  }

  onCustomFieldsSaved(fields: any[]): void {
    this.snackBar.open('Campos personalizados guardados', 'Cerrar', { duration: 3000 });
    this.cerrarModalCustomFields();
    // Recargar campos personalizados para actualizar las columnas dinámicas
    this.cargarCamposPersonalizados();
  }

  /* =========================
     MODAL CERTIFICADOS
  ========================= */

  abrirModalCerts(trainer: any): void {
    this.selectedTrainer = trainer;
    this.mostrarModalCerts = true;
  }

  cerrarModalCerts(): void {
    this.mostrarModalCerts = false;
  }

  /* =========================
     ORDENACIÓN DE TABLA
  ========================= */

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      // Ciclar: asc -> desc -> sin orden
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortDirection = '';
        this.sortColumn = '';
      } else {
        this.sortDirection = 'asc';
      }
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    if (!this.sortColumn || !this.sortDirection) {
      this.applyFilter();
      return;
    }

    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.filteredTrainers.sort((a: any, b: any) => {
      let valA = a[this.sortColumn] || '';
      let valB = b[this.sortColumn] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'bi-chevron-expand';
    if (this.sortDirection === 'asc') return 'bi-chevron-up';
    if (this.sortDirection === 'desc') return 'bi-chevron-down';
    return 'bi-chevron-expand';
  }

  /* =========================
     CAMPOS PERSONALIZADOS DINÁMICOS
  ========================= */

  cargarCamposPersonalizados(): void {
    this.clubService.getFormCamposByClub(this.clubId, 'PERFIL_ENTRENADOR').subscribe(
      (res: any) => {
        this.customFields = (res?.data || []).sort((a: any, b: any) => a.orden - b.orden);
        // Para cada trainer, cargar sus respuestas
        if (this.customFields.length > 0) {
          this.cargarRespuestasCustomFields();
        }
      }
    );
  }

  cargarRespuestasCustomFields(): void {
    for (const trainer of this.trainers) {
      const tUserId = trainer.userId || trainer.trainerId;
      this.clubService.getFormRespuestasByProfile(this.clubId, tUserId).subscribe(
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
          this.customFieldResponses[tUserId] = map;
        }
      );
    }
  }

  getCustomFieldValue(trainer: any, campoId: number): string {
    const tUserId = trainer.userId || trainer.trainerId;
    const map = this.customFieldResponses[tUserId];
    if (!map || !map[campoId]) return '—';
    const entry = map[campoId];
    // Para firmas y archivos, el valor está en file, no en valor
    if (entry.tipo === 'SIGNATURE' || entry.tipo === 'FILE') {
      return entry.file ? '✓' : '—';
    }
    return entry.valor || '—';
  }

  isSignatureOrFile(campo: any): boolean {
    return campo.tipoCampo === 'SIGNATURE' || campo.tipoCampo === 'FILE';
  }

  hasSignatureOrFile(trainer: any, campoId: number, tipoCampo: string): boolean {
    const tUserId = trainer.userId || trainer.trainerId;
    const map = this.customFieldResponses[tUserId];
    if (!map || !map[campoId]) return false;
    return !!(map[campoId].file);
  }

  getSignatureFileUrl(trainer: any, campoId: number): string {
    const tUserId = trainer.userId || trainer.trainerId;
    const map = this.customFieldResponses[tUserId];
    if (!map || !map[campoId]) return '';
    return environment.images + 'formulario-files/' + map[campoId].file;
  }

  /* ---- Modal firma/archivo ---- */
  mostrarModalFirma = false;
  firmaUrl = '';

  abrirModalFirma(trainer: any, campoId: number): void {
    this.firmaUrl = this.getSignatureFileUrl(trainer, campoId);
    this.mostrarModalFirma = true;
  }

  cerrarModalFirma(): void {
    this.mostrarModalFirma = false;
    this.firmaUrl = '';
  }

  goBack(): void {
    this.location.back();
  }
}
