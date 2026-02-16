import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { TrainingService } from 'src/app/core/services/training/training.service';
import { User } from 'src/app/core/models/users/user.model';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface CoachProfile {
  entrenadorPerfilId: number;
  userId: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  documentoIdentidad: string;
  tipoDocumento: string;
  direccion: string;
  nacionalidad: string;
  picture: string;
  imgDocFrontal: string;
  imgDocTrasera: string;
  licenciaFederativa: string;
  titulacionDeportiva: string;
  certDelitosSexuales: string;
  certAntecedentesPenales: string;
  seguroResponsabilidad: string;
  formacionPrimerosAuxilios: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
}

export interface ClubInfo {
  clubId: number;
  clubName: string;
  clubPicture: string;
}

@Component({
  selector: 'app-perfil-entrenador',
  templateUrl: './perfil-entrenador.component.html',
  styleUrls: ['./perfil-entrenador.component.scss'],
})
export class PerfilEntrenadorComponent implements OnInit {
  teamId = 0;
  playerId = 0;
  usuarioActual!: User | null;
  userId = 0;

  loading = true;
  saving = false;

  imageBaseUrlUser: string = environment.images + 'user/';
  imageBaseUrlEntrenadorDocs: string = environment.images + 'entrenador-docs/';

  tiposDocumento = ['Identificación Nacional', 'Carnet de conducir', 'Pasaporte', 'Otro'];
  tiposTitulacion = ['Monitor', 'UEFA C', 'UEFA B', 'UEFA A', 'UEFA Pro', 'Otro'];

  profile: CoachProfile = this.emptyProfile();

  /* Modal Documento de Identidad */
  mostrarModalDoc = false;
  docCara1: string | ArrayBuffer | null | undefined = null;
  docCara2: string | ArrayBuffer | null | undefined = null;
  selectedFileCara1: File | null = null;
  selectedFileCara2: File | null = null;
  uploadingDoc = false;

  /* Modal subir certificado */
  mostrarModalCert = false;
  certTipo = '';
  certLabel = '';
  selectedCertFile: File | null = null;
  uploadingCert = false;

  /* Campos dinámicos multi-club */
  coachClubs: ClubInfo[] = [];
  loadingClubs = false;
  clubFieldCounts: { [clubId: number]: number } = {};

  /* Editar perfil */
  editMode = false;
  editProfile: CoachProfile = { ...this.profile };

  /* Modal visor de archivos */
  mostrarModalVistaArchivo = false;
  vistaArchivoUrl = '';
  vistaArchivoUrlSafe: SafeResourceUrl = '';
  vistaArchivoNombre = '';
  vistaArchivoEsImagen = false;

  /* Foto de perfil */
  uploadingPhoto = false;

  /* Documentos del club (para el entrenador) */
  clubDocuments: { clubId: number; clubName: string; docs: any[] }[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService,
    private clubService: ClubService,
    private teamService: TeamService,
    private trainingService: TrainingService,
    private snackBar: MatSnackBar,
    private location: Location,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.teamId = +params['teamId'] || 0;
      if (params['playerId']) {
        this.playerId = +params['playerId'];
      }
    });

    this.loginService.usuarioActual.subscribe((user) => {
      if (!user) return;
      this.usuarioActual = user;
      this.userId = user.userId;
      this.playerId = user.playerId;

      this.cargarPerfil();
      this.loadAllClubs();
    });
  }

  /**
   * Carga todos los clubs a los que pertenece el entrenador,
   * para mostrar campos personalizados agrupados por club.
   */
  loadAllClubs(): void {
    this.loadingClubs = true;
    this.clubService.getAllClubsForEntrenador(this.userId).subscribe(
      (response: any) => {
        this.coachClubs = response?.data || [];
        this.loadingClubs = false;
        this.loadClubDocuments();
      },
      () => {
        this.coachClubs = [];
        this.loadingClubs = false;
      }
    );
  }

  /**
   * Para cada club, carga los documentos requeridos al entrenador
   * (certificados, docs a subir, formularios personalizados)
   */
  loadClubDocuments(): void {
    this.clubDocuments = [];
    for (const club of this.coachClubs) {
      this.clubService.getListDocumentosEntrenador(club.clubId, this.userId).subscribe(
        (response: any) => {
          const docs = response?.data || [];
          if (docs.length > 0) {
            this.clubDocuments.push({
              clubId: club.clubId,
              clubName: club.clubName,
              docs: docs
            });
          }
        }
      );
    }
  }

  onDynamicFieldsSaved(): void {
    this.snackBar.open('Campos guardados correctamente', 'Cerrar', { duration: 3000 });
  }

  onClubFieldsLoaded(clubId: number, count: number): void {
    this.clubFieldCounts[clubId] = count;
  }

  /* =========================
     CARGA DATOS
  ========================= */

  cargarPerfil(): void {
    this.loading = true;

    this.clubService.getPerfilEntrenador(this.userId).subscribe(
      (response: any) => {
        if (response?.data) {
          this.profile = { ...this.emptyProfile(), ...response.data };
        } else {
          this.profile = this.emptyProfile();
          this.profile.userId = this.userId;
          this.profile.nombre = this.usuarioActual?.firstName || '';
          this.profile.apellido = this.usuarioActual?.secondName || '';
          this.profile.email = this.usuarioActual?.mail || '';
          this.profile.telefono = this.usuarioActual?.mobile || '';
          this.profile.picture = this.usuarioActual?.pictureUser || '';
        }
        this.loading = false;
      },
      () => {
        this.profile = this.emptyProfile();
        this.profile.userId = this.userId;
        this.loading = false;
      }
    );
  }

  /* =========================
     EDITAR PERFIL
  ========================= */

  enableEdit(): void {
    this.editProfile = { ...this.profile };
    this.editMode = true;
  }

  cancelEdit(): void {
    this.editMode = false;
  }

  saveProfile(): void {
    this.saving = true;
    const dto = { ...this.editProfile, userId: this.userId };
    this.clubService.createUpdatePerfilEntrenador(dto).subscribe(
      (response: any) => {
        if (response?.data) {
          this.profile = { ...this.emptyProfile(), ...response.data };
        }
        this.editMode = false;
        this.saving = false;
        this.snackBar.open('Perfil actualizado correctamente', 'Cerrar', { duration: 3000 });
      },
      () => {
        this.saving = false;
        this.snackBar.open('Error al guardar el perfil', 'Cerrar', { duration: 3000 });
      }
    );
  }

  /* =========================
     DOCUMENTO DE IDENTIDAD
  ========================= */

  abrirModalDoc(): void {
    this.mostrarModalDoc = true;
  }

  cerrarModalDoc(): void {
    this.docCara1 = null;
    this.docCara2 = null;
    this.selectedFileCara1 = null;
    this.selectedFileCara2 = null;
    this.mostrarModalDoc = false;
  }

  onFileChangeDoc(event: any, cara: string): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
        alert('Formato no válido. Solo PNG o JPEG.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (cara === 'cara1') {
          this.docCara1 = e.target?.result;
          this.selectedFileCara1 = file;
        } else {
          this.docCara2 = e.target?.result;
          this.selectedFileCara2 = file;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  guardarDocIdentidad(): void {
    this.uploadingDoc = true;
    let pendingUploads = 0;
    let completedUploads = 0;

    if (this.selectedFileCara1) pendingUploads++;
    if (this.selectedFileCara2) pendingUploads++;

    if (pendingUploads === 0) {
      this.uploadingDoc = false;
      return;
    }

    const checkDone = () => {
      completedUploads++;
      if (completedUploads >= pendingUploads) {
        this.uploadingDoc = false;
        this.cerrarModalDoc();
        this.cargarPerfil();
        this.snackBar.open('Documento de identidad actualizado', 'Cerrar', { duration: 3000 });
      }
    };

    if (this.selectedFileCara1) {
      this.clubService.uploadDocPerfilEntrenador(this.selectedFileCara1, this.userId, 'doc_frontal').subscribe(
        () => checkDone(),
        () => { this.uploadingDoc = false; this.snackBar.open('Error al subir anverso', 'Cerrar', { duration: 3000 }); }
      );
    }

    if (this.selectedFileCara2) {
      this.clubService.uploadDocPerfilEntrenador(this.selectedFileCara2, this.userId, 'doc_trasera').subscribe(
        () => checkDone(),
        () => { this.uploadingDoc = false; this.snackBar.open('Error al subir reverso', 'Cerrar', { duration: 3000 }); }
      );
    }
  }

  /* =========================
     CERTIFICADOS
  ========================= */

  abrirModalCert(tipo: string, label: string): void {
    this.certTipo = tipo;
    this.certLabel = label;
    this.selectedCertFile = null;
    this.mostrarModalCert = true;
  }

  cerrarModalCert(): void {
    this.mostrarModalCert = false;
    this.selectedCertFile = null;
  }

  onCertFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedCertFile = file;
    }
  }

  guardarCertificado(): void {
    if (!this.selectedCertFile) return;
    this.uploadingCert = true;
    this.clubService.uploadDocPerfilEntrenador(this.selectedCertFile, this.userId, this.certTipo).subscribe(
      () => {
        this.uploadingCert = false;
        this.cerrarModalCert();
        this.cargarPerfil();
        this.snackBar.open('Documento subido correctamente', 'Cerrar', { duration: 3000 });
      },
      () => {
        this.uploadingCert = false;
        this.snackBar.open('Error al subir el documento', 'Cerrar', { duration: 3000 });
      }
    );
  }

  getCertFileName(value: string): string {
    if (!value) return '';
    return value.substring(value.lastIndexOf('-') + 1);
  }

  /* =========================
     VISOR DE ARCHIVOS (modal)
  ========================= */

  abrirModalVistaArchivo(filename: string): void {
    const url = this.imageBaseUrlEntrenadorDocs + filename;
    this.vistaArchivoUrl = url;
    this.vistaArchivoUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.vistaArchivoNombre = this.getCertFileName(filename);
    this.vistaArchivoEsImagen = this.isImage(filename);
    this.mostrarModalVistaArchivo = true;
  }

  cerrarModalVistaArchivo(): void {
    this.mostrarModalVistaArchivo = false;
  }

  /* =========================
     FOTO DE PERFIL
  ========================= */

  onProfilePhotoChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Solo se permiten imágenes', 'Cerrar', { duration: 3000 });
      return;
    }
    this.uploadingPhoto = true;
    this.trainingService.createUpdateImgUser(this.userId.toString(), file).subscribe(
      (response: any) => {
        this.uploadingPhoto = false;
        this.cargarPerfil();
        // Actualizar la foto en localStorage para que se refleje en el header
        const storedUser = localStorage.getItem('usuario');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (response?.data?.pictureUser) {
              userData.pictureUser = response.data.pictureUser;
            }
            localStorage.setItem('usuario', JSON.stringify(userData));
          } catch (e) {}
        }
        this.snackBar.open('Foto de perfil actualizada', 'Cerrar', { duration: 3000 });
      },
      () => {
        this.uploadingPhoto = false;
        this.snackBar.open('Error al subir la foto', 'Cerrar', { duration: 3000 });
      }
    );
  }

  /* =========================
     DOCUMENTOS DEL CLUB (para el entrenador)
  ========================= */

  descargarDocClub(doc: any): void {
    if (doc.fileClub) {
      window.open('https://appsphairatech.com/images/documentos/' + doc.fileClub, '_blank');
    }
  }

  subirDocClub(doc: any, event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    const dto = {
      docPadresId: doc.docPadresId || 0,
      docClubesId: doc.docClubesId,
      nombre: doc.nombre,
      file: null,
      clubId: doc.clubId,
      fecCreate: null,
      descargado: doc.descargado || 0,
      subido: 1,
      playerId: 0,
      userId: this.userId,
      descripcion: '',
      requiere: doc.requiere,
    };
    this.clubService.uploadDocEntrenador(file, dto).subscribe(
      () => {
        this.loadClubDocuments();
        this.snackBar.open('Documento subido correctamente', 'Cerrar', { duration: 3000 });
      },
      () => {
        this.snackBar.open('Error al subir el documento', 'Cerrar', { duration: 3000 });
      }
    );
  }

  verDocSubidoClub(doc: any): void {
    if (doc.filePadre) {
      const url = 'https://appsphairatech.com/images/docs-padres/' + doc.filePadre;
      this.vistaArchivoUrl = url;
      this.vistaArchivoUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.vistaArchivoNombre = doc.filePadre;
      this.vistaArchivoEsImagen = this.isImage(doc.filePadre);
      this.mostrarModalVistaArchivo = true;
    }
  }

  eliminarDoc(tipo: string): void {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return;
    this.clubService.deleteDocPerfilEntrenador(this.userId, tipo).subscribe(
      () => {
        this.cargarPerfil();
        this.snackBar.open('Documento eliminado correctamente', 'Cerrar', { duration: 3000 });
      },
      () => {
        this.snackBar.open('Error al eliminar el documento', 'Cerrar', { duration: 3000 });
      }
    );
  }

  getCertFileUrl(filename: string): string {
    return this.imageBaseUrlEntrenadorDocs + filename;
  }

  isImage(filename: string): boolean {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  }

  /* =========================
     UTILIDADES
  ========================= */

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(fecha)) {
      const [y, m, d] = fecha.split('-');
      return `${d}/${m}/${y}`;
    }
    return fecha;
  }

  calcularEdad(fecha: string): number {
    if (!fecha) return 0;
    const nac = new Date(fecha);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  goBack(): void {
    this.location.back();
  }

  private emptyProfile(): CoachProfile {
    return {
      entrenadorPerfilId: 0,
      userId: 0,
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      fechaNacimiento: '',
      documentoIdentidad: '',
      tipoDocumento: 'DNI',
      direccion: '',
      nacionalidad: '',
      picture: '',
      imgDocFrontal: '',
      imgDocTrasera: '',
      licenciaFederativa: '',
      titulacionDeportiva: '',
      certDelitosSexuales: '',
      certAntecedentesPenales: '',
      seguroResponsabilidad: '',
      formacionPrimerosAuxilios: '',
      contactoEmergenciaNombre: '',
      contactoEmergenciaTelefono: '',
    };
  }
}
