import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-documentos-club',
  templateUrl: './documentos-club.component.html',
  styleUrls: ['./documentos-club.component.scss'],
})
export class DocumentosClubComponent implements OnInit {
  listDocuments: any[] = [];
  clubId = 0;

  ordenAscendente = true;
  columnaActual = '';
  loadingUpload = false;
  uploadProgress = 0;

  mostrarModalDocumento = false;
  formDocumento!: FormGroup;
  archivoSeleccionado!: File | null;
  documentoSinSubir!: FormGroup;

  mostrarModalSinDocumento = false;

  mostrarModalPersonalizado: boolean = false;
  requiereRespuesta: boolean = false;
  tituloPersonalizado: string = '';

  mostrarModalEditarPersonalizado: boolean = false;
  contenidoEditando: string = '';
  tituloEditando: string = '';
  docEditando: any = null;
  mostrarModalEliminar = false;

  docEliminarId!: number;
  docEliminarIndex!: number;
  docEliminarNombre = '';
  loadingData = false;
  loadingEliminar = false;

  constructor(
    private location: Location,
    private clubService: ClubService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.formDocumento = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      tipo: ['', Validators.required],
      visible: [false],
      requiereD: [false],
    });

    this.documentoSinSubir = this.fb.group({
      nombreSin: ['', Validators.required],
      descripcionSin: [''],
      tipoSin: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.clubId = Number(params.get('clubId'));
      console.log('clubId:', this.clubId);
      this.loadDocuments();
    });
  }

  loadDocuments(): void {
    this.loadingData = true;

    this.clubService.getlistDocumentosByClub(this.clubId).subscribe({
      next: (response: any) => {
        const data = response?.data ?? {};

        const documentos = Array.isArray(data.documentos)
          ? data.documentos
          : [];

        // 🔐 Normalizar totalPadres
        const totalPadres =
          typeof data.totalPadres === 'number' && !isNaN(data.totalPadres)
            ? data.totalPadres
            : 0;

        const subidosPorDocumento =
          typeof data.subidosPorDocumento === 'object' &&
          data.subidosPorDocumento !== null
            ? data.subidosPorDocumento
            : {};

        // 🔥 Enriquecer documentos para la vista
        this.listDocuments = documentos.map((doc: any) => {
          const totalSubidosRaw = subidosPorDocumento[doc.docClubesId];

          return {
            ...doc,
            totalPadres,
            totalSubidos:
              typeof totalSubidosRaw === 'number' && !isNaN(totalSubidosRaw)
                ? totalSubidosRaw
                : 0,
          };
        });

        this.loadingData = false;
      },
      error: (err) => {
        console.error('Error cargando documentos', err);
        this.listDocuments = [];
        this.loadingData = false;
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  abrirPdf(nombreArchivo: string): void {
    const link =
      'https://appsphairatech.com/images/documentos/' + nombreArchivo;
    window.open(link, '_blank');
  }

  ordenarPor(campo: string) {
    if (this.columnaActual === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaActual = campo;
      this.ordenAscendente = true;
    }

    this.listDocuments.sort((a: any, b: any) => {
      const valorA = a[campo]?.toString().toLowerCase() || '';
      const valorB = b[campo]?.toString().toLowerCase() || '';

      if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
      if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
  }

  visible(doc: any, id: number, visible: number) {
    let isVisible = visible === 0 ? 1 : 0;

    this.clubService.setDocumentoVisible(id, isVisible).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        //console.log('Jugador eliminado con éxito:', response);
        doc.visible = isVisible;
      },
      (error) => {
        console.error('Error al eliminar el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  requiere(doc: any, id: number, requiere: number) {
    let isRequiere = requiere === 0 ? 1 : 0;

    this.clubService.setDocumentoRequiere(id, isRequiere).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        //console.log('Jugador eliminado con éxito:', response);
        doc.requiere = isRequiere;
      },
      (error) => {
        console.error('Error al eliminar el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
  }

  copyLink(file: string) {
    const link = 'https://appsphairatech.com/images/documentos/' + file;
    //const link = 'localhost:4200/registro-padres/' + this.clubId;

    navigator.clipboard
      .writeText(link)
      .then(() => {
        console.log('Enlace copiado al portapapeles:', link);
        this.toastr.success('¡Link copiado!');
      })
      .catch((err) => {
        console.error('Error al copiar el enlace:', err);
        this.toastr.error('No se pudo copiar el enlace. Intenta de nuevo.');
      });
  }

  confirmarEliminarDoc(index: number, id: number, nombre: string) {
    this.docEliminarId = id;
    this.docEliminarIndex = index;
    this.docEliminarNombre = nombre;
    this.mostrarModalEliminar = true;
  }

  cerrarModalEliminar() {
    this.mostrarModalEliminar = false;
    this.loadingEliminar = false;
  }
  confirmarEliminarDefinitivo() {
    this.loadingEliminar = true;
    this.eliminarDocumento(this.docEliminarId, this.docEliminarIndex);
  }

  eliminarDocumento(id: number, index: number): void {
    this.clubService
      .deleteDocumentoForClub(id)
      .pipe(
        finalize(() => {
          // 🔑 SIEMPRE se ejecuta (éxito o error)
          this.loadingEliminar = false;
          this.cerrarModalEliminar();
        })
      )
      .subscribe({
        next: () => {
          // ✅ eliminar de la tabla
          this.listDocuments.splice(index, 1);

          // opcional: feedback visual
          this.toastr.success('Documento eliminado correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar el documento:', error);
          this.toastr.error('Error al eliminar el documento');
        },
      });
  }

  openModalSubirDoc() {
    this.mostrarModalDocumento = true;
  }

  openModalSubirSinDoc() {
    this.archivoSeleccionado = null;
    this.mostrarModalSinDocumento = true;
  }

  cerrarModalDocumento() {
    this.mostrarModalDocumento = false;
    this.formDocumento.reset();
    this.archivoSeleccionado = null;
  }

  cerrarModalSinDocumento() {
    this.mostrarModalSinDocumento = false;
    this.documentoSinSubir.reset();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'doc', 'docx'].includes(ext || '')) {
        this.archivoSeleccionado = file;
      } else {
        this.toastr.error('Solo se permiten archivos PDF o Word.');
        this.archivoSeleccionado = null;
      }
    }
  }

  subirDocumento() {
    if (!this.archivoSeleccionado) return;

    this.loadingUpload = true;
    this.uploadProgress = 0;

    const formValues = this.formDocumento.value;

    const dto = {
      docClubesId: 0,
      nombre: formValues.nombre,
      descripcion: formValues.descripcion,
      tipo: formValues.tipo,
      visible: formValues.visible ? 0 : 1,
      file: null,
      clubId: this.clubId,
      fecCreate: null,
      requiere: formValues.requiereD ? 1 : 0,
    };

    this.clubService.uploadDocClub(this.archivoSeleccionado, dto).subscribe({
      next: (event) => {
        // 📊 PROGRESO
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round((event.loaded / event.total) * 100);
        }

        // ✅ FINALIZÓ
        if (event.type === HttpEventType.Response) {
          this.loadingUpload = false;
          this.uploadProgress = 100;

          this.loadDocuments();
          this.cerrarModalDocumento();

          this.toastr.success('Documento subido correctamente');
        }
      },
      error: () => {
        this.loadingUpload = false;
        this.uploadProgress = 0;
        this.toastr.error('Error al subir el documento');
      },
    });
  }

  subirSinDocumento() {
    const formValues = this.documentoSinSubir.value;
    const dto = {
      docClubesId: 0,
      nombre: formValues.nombreSin,
      descripcion: formValues.descripcionSin,
      tipo: formValues.tipoSin,
      visible: 0, // si es true, entonces 0
      file: null,
      clubId: this.clubId, // asegúrate de tener this.clubId en tu componente
      fecCreate: null,
      requiere: 1,
    };

    this.clubService.uploadSinDocClub(dto).subscribe({
      next: (res) => {
        this.loadDocuments();
        this.toastr.success('Documento subido correctamente.');
        this.cerrarModalDocumento();
        // refrescar lista si hace falta
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Error al subir el documento.');
      },
    });
  }

  openModalSubirPersonalizado(): void {
    this.mostrarModalPersonalizado = true;
  }

  cerrarModalPersonalizado(): void {
    this.mostrarModalPersonalizado = false;
    this.requiereRespuesta = false;
    this.tituloPersonalizado = '';
  }

  crearPersonalizado(contenido: string): void {
    const dto = {
      docClubesId: 0,
      nombre: this.tituloPersonalizado,
      descripcion: contenido,
      tipo: 'Personalizado',
      visible: 0, // si es true, entonces 0
      file: null,
      clubId: this.clubId, // asegúrate de tener this.clubId en tu componente
      fecCreate: null,
      requiere: 2,
    };

    this.clubService.uploadSinDocClub(dto).subscribe({
      next: (res) => {
        this.loadDocuments();
        this.toastr.success('Documento subido correctamente');
        this.cerrarModalPersonalizado();
        // refrescar lista si hace falta
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Error al subir el documento.');
      },
    });
  }

  editarPersonalizado(doc: any): void {
    this.docEditando = doc;
    this.contenidoEditando = doc.descripcion || ''; // ajusta al campo real
    this.tituloEditando = doc.nombre || ''; // ajusta al campo real
    this.mostrarModalEditarPersonalizado = true;
  }

  cerrarModalEditarPersonalizado(): void {
    this.mostrarModalEditarPersonalizado = false;
    this.docEditando = null;
    this.contenidoEditando = '';
  }

  guardarEdicionPersonalizado(): void {
    if (!this.docEditando) return;

    const contenidoActualizado = (
      document.getElementById('editorPersonalizado') as HTMLElement
    ).innerHTML;

    const dto = {
      ...this.docEditando,
      descripcion: contenidoActualizado,
      nombre: this.tituloEditando,
    };

    this.clubService.uploadSinDocClub(dto).subscribe({
      next: (res) => {
        this.toastr.success('Contenido actualizado correctamente');
        this.cerrarModalEditarPersonalizado();
        // refrescar lista si hace falta
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Error al subir el documento');
      },
    });
  }
}
