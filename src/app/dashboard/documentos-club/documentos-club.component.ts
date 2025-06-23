import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-documentos-club',
  templateUrl: './documentos-club.component.html',
  styleUrls: ['./documentos-club.component.scss']
})
export class DocumentosClubComponent implements OnInit {

  listDocuments: any[] = [];
  clubId = 0;

  ordenAscendente = true;
  columnaActual = '';

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

  constructor(
    private location: Location,
    private clubService: ClubService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder) {

    this.formDocumento = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      tipo: ['', Validators.required],
      visible: [false],
      requiereD: [false]
    });

    this.documentoSinSubir = this.fb.group({
      nombreSin: ['', Validators.required],
      descripcionSin: [''],
      tipoSin: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // Obtener el valor de clubId de los parámetros
      this.clubId = +params['clubId'];  // El + convierte el valor a número
      console.log('clubId:', this.clubId);
    });

    this.loadDocuments();
  }

  loadDocuments() {
    this.clubService.getlistDocumentosByClub(this.clubId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listDocuments = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
  }

  goBack(): void {
    this.location.back();
  }

  abrirPdf(nombreArchivo: string): void {
    const link = 'https://appsphairatech.com/images/documentos/' + nombreArchivo;
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

    navigator.clipboard.writeText(link)
      .then(() => {
        console.log('Enlace copiado al portapapeles:', link);
        // Opcional: puedes usar un toast o alert para avisar al usuario
        alert('¡Link copiado!');
      })
      .catch(err => {
        console.error('Error al copiar el enlace:', err);
        alert('No se pudo copiar el enlace. Intenta de nuevo.');
      });
  }

  confirmarEliminarDoc(index: number, id: number, nombre: string) {
    const confirmacion = confirm('¿Estás seguro de que deseas eliminar el documento ' + nombre + '?');
    if (confirmacion) {
      // Llama al método para eliminar el equipo
      this.eliminarDocumento(id, index);
    }
  }

  eliminarDocumento(id: number, index: number): void {
    // Lógica para eliminar el equipo llamando al servicio correspondiente
    this.clubService.deleteDocumentoForClub(id).subscribe(
      (response) => {
        // Manejar la respuesta según tus necesidades
        //console.log('Jugador eliminado con éxito:', response);
        this.listDocuments.splice(index, 1);
      },
      (error) => {
        console.error('Error al eliminar el jugador:', error);
        // Puedes manejar el error según tus necesidades
      }
    );
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
        alert('Solo se permiten archivos PDF o Word.');
        this.archivoSeleccionado = null;
      }
    }
  }

  subirDocumento() {
    const formValues = this.formDocumento.value;
    const dto = {
      docClubesId: 0,
      nombre: formValues.nombre,
      descripcion: formValues.descripcion,
      tipo: formValues.tipo,
      visible: formValues.visible ? 0 : 1, // si es true, entonces 0
      file: null,
      clubId: this.clubId, // asegúrate de tener this.clubId en tu componente
      fecCreate: null,
      requiere: formValues.requiereD ? 1 : 0
    };

    const file = this.archivoSeleccionado;
    if (file) {
      this.clubService.uploadDocClub(file, dto).subscribe({
        next: (res) => {
          this.loadDocuments();
          alert('Documento solicitado correctamente');
          this.cerrarModalDocumento();
        },
        error: (err) => {
          console.error(err);
          alert('Error al subir el documento');
        }
      });
    }
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
      requiere: 1
    };

    this.clubService.uploadSinDocClub(dto).subscribe({
      next: (res) => {
        this.loadDocuments();
        alert('Documento subido correctamente');
        this.cerrarModalDocumento();
        // refrescar lista si hace falta
      },
      error: (err) => {
        console.error(err);
        alert('Error al subir el documento');
      }
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
      requiere: 2
    };

    this.clubService.uploadSinDocClub(dto).subscribe({
      next: (res) => {
        this.loadDocuments();
        alert('Documento subido correctamente');
        this.cerrarModalPersonalizado();
        // refrescar lista si hace falta
      },
      error: (err) => {
        console.error(err);
        alert('Error al subir el documento');
      }
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

    const contenidoActualizado = (document.getElementById('editorPersonalizado') as HTMLElement).innerHTML;

    const dto = {
      ...this.docEditando,
      descripcion: contenidoActualizado,
      nombre: this.tituloEditando
    };

    this.clubService.uploadSinDocClub(dto).subscribe({
      next: (res) => {
        alert('Contenido actualizado correctamente');
        this.cerrarModalEditarPersonalizado();
        // refrescar lista si hace falta
      },
      error: (err) => {
        console.error(err);
        alert('Error al subir el documento');
      }
    });
  }

}
