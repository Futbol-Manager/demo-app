import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { User } from 'src/app/core/models/users/user.model';

@Component({
  selector: 'app-documentos-entrenador',
  templateUrl: './documentos-entrenador.component.html',
  styleUrls: ['./documentos-entrenador.component.scss'],
})
export class DocumentosEntrenadorComponent implements OnInit {
  clubId = 0;
  listaDocumentos: any[] = [];
  usuarioActual!: User | null;
  userId!: number;
  loading = true;

  mostrarModalDocumento = false;
  archivoSeleccionado!: File | null;
  docTemp: any;

  mostrarModalEditarPersonalizado = false;
  docEditando: any = null;

  constructor(
    private location: Location,
    private clubService: ClubService,
    private route: ActivatedRoute,
    private loginService: LoginService,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('documentos-entrenador', true), 600);
    this.route.params.subscribe((params) => {
      this.clubId = +params['clubId'];
    });

    this.loginService.usuarioActual.subscribe((user) => {
      if (!user) return;
      this.usuarioActual = user;
      this.userId = user.userId;
      this.loadDocuments();
    });
  }

  goBack(): void {
    this.location.back();
  }

  loadDocuments(): void {
    this.loading = true;
    this.clubService.getListDocumentosEntrenador(this.clubId, this.userId).subscribe(
      (response: Response) => {
        if (response.data !== null) {
          this.listaDocumentos = response.data;
        }
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar documentos del entrenador', error);
        this.loading = false;
      }
    );
  }

  descargar(doc: any): void {
    if (!doc.fileClub) return;
    if (doc.descargado === 0) {
      doc.descargado = 1;
      doc.userId = this.userId;

      this.clubService.updateDocumentoEntrenadorDescargado(doc).subscribe(
        (response: Response) => {
          if (response.data !== null) {
            console.log('Descarga registrada.');
          }
        },
        (error) => {
          console.error('Error al registrar descarga', error);
        }
      );
    }

    const url = 'https://appsphairatech.com/images/documentos/' + doc.fileClub;
    window.open(url, '_blank');
  }

  subir(doc: any): void {
    this.mostrarModalDocumento = true;
    this.docTemp = doc;
  }

  cerrarModalDocumento(): void {
    this.mostrarModalDocumento = false;
    this.archivoSeleccionado = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        this.archivoSeleccionado = file;
      } else {
        alert('Solo se permiten archivos PDF, Word o imágenes.');
        this.archivoSeleccionado = null;
      }
    }
  }

  subirDocumento(): void {
    const file = this.archivoSeleccionado;

    const dto = {
      docEntrenadoresId: this.docTemp.docEntrenadoresId || 0,
      docClubesId: this.docTemp.docClubesId,
      nombre: this.docTemp.nombre,
      file: null,
      clubId: this.docTemp.clubId,
      fecCreate: null,
      descargado: this.docTemp.descargado,
      subido: 1,
      userId: this.userId,
      descripcion: '',
      requiere: this.docTemp.requiere,
    };

    if (file) {
      this.clubService.uploadDocEntrenador(file, dto).subscribe({
        next: () => {
          this.loadDocuments();
          alert('Documento subido correctamente');
          this.cerrarModalDocumento();
        },
        error: (err) => {
          console.error(err);
          alert('Error al subir el documento');
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

  rellenarPersonalizado(doc: any): void {
    this.docEditando = doc;
    this.mostrarModalEditarPersonalizado = true;
  }

  cerrarModalEditarPersonalizado(): void {
    this.docEditando = null;
    this.mostrarModalEditarPersonalizado = false;
  }

  onFormRendererSaved(): void {
    // Mark document as submitted
    if (this.docEditando) {
      const dto = {
        docEntrenadoresId: this.docEditando.docEntrenadoresId || 0,
        docClubesId: this.docEditando.docClubesId,
        nombre: this.docEditando.nombre,
        clubId: this.docEditando.clubId,
        fecCreate: null,
        descargado: this.docEditando.descargado,
        descripcion: 'Formulario personalizado completado',
        subido: 1,
        userId: this.userId,
        requiere: this.docEditando.requiere,
      };

      this.clubService.uploadDocEntrenadorPersonalizado(dto).subscribe({
        next: () => {
          alert('Formulario enviado correctamente');
          this.cerrarModalEditarPersonalizado();
          this.loadDocuments();
        },
        error: (err) => {
          console.error(err);
          alert('Error al registrar el envío');
        },
      });
    }
  }

  onFormRendererClosed(): void {
    this.cerrarModalEditarPersonalizado();
  }

  getDocPending(doc: any): boolean {
    if (doc.requiere === 0 || doc.fileClub) return doc.descargado === 0;
    if (doc.requiere === 1 || doc.requiere === 2) return doc.subido === 0;
    return false;
  }

  getDocDone(doc: any): boolean {
    if (doc.requiere === 0 || doc.fileClub) return doc.descargado === 1;
    if (doc.requiere === 1 || doc.requiere === 2) return doc.subido === 1;
    return false;
  }

  getDocStatusIcon(doc: any): string {
    if (this.getDocDone(doc)) return 'bi-check-circle-fill';
    return 'bi-exclamation-circle-fill';
  }

  getDocStatusLabel(doc: any): string {
    if (doc.requiere === 0 || doc.fileClub) {
      return doc.descargado === 1 ? 'DOCUMENTOS_ENTRENADOR.STATUS_DOWNLOADED' : 'DOCUMENTOS_ENTRENADOR.STATUS_PENDING_DOWNLOAD';
    }
    if (doc.requiere === 1) {
      return doc.subido === 1 ? 'DOCUMENTOS_ENTRENADOR.STATUS_UPLOADED' : 'DOCUMENTOS_ENTRENADOR.STATUS_PENDING_UPLOAD';
    }
    if (doc.requiere === 2) {
      return doc.subido === 1 ? 'DOCUMENTOS_ENTRENADOR.STATUS_FILLED' : 'DOCUMENTOS_ENTRENADOR.STATUS_PENDING_FILL';
    }
    return '';
  }
}
