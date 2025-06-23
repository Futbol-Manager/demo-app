import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { Response } from 'src/app/core/services/models/response.model';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { User } from 'src/app/core/models/users/user.model';

@Component({
  selector: 'app-documentos-jugador',
  templateUrl: './documentos-jugador.component.html',
  styleUrls: ['./documentos-jugador.component.scss']
})
export class DocumentosJugadorComponent implements OnInit {

  teamId = 0;
  playerId = 0;
  listaDocumentos: any[] = [];
  usuarioActual!: User | null;
  clubId!: number;  // Ajusta el valor según el clubId del equipo actual
  userId!: number;
  mostrarModalDocumento = false;
  archivoSeleccionado!: File | null;
  docPadreTemp: any;

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
    private fb: FormBuilder,
    private loginService: LoginService,) { }

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
      this.userId = this.usuarioActual!.userId;
    });
    this.route.params.subscribe(params => {
      // Obtener el valor de clubId de los parámetros
      this.teamId = +params['teamId'];  // El + convierte el valor a número
      this.playerId = +params['playerId'];  // El + convierte el valor a número
    });

    this.loadDocuments();
  }

  goBack(): void {
    this.location.back();
  }

  loadDocuments() {
    this.clubService.getListDocumentosPlayer(this.teamId, this.playerId).subscribe(
      (response: Response) => {
        // Verifica que la propiedad 'data' exista en la respuesta
        if (response.data !== null) {
          this.listaDocumentos = response.data;
        } else {
          console.error('La respuesta del servicio no tiene la estructura esperada', response);
        }
      },
      (error) => {
        console.error('Error al cargar el listado de equipos', error);
      }
    );
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

  subir(doc: any) {
    console.log('Subir:', doc);
    // Aquí iría la lógica para subir el documento
    this.mostrarModalDocumento = true;
    this.docPadreTemp = doc;
  }

  cerrarModalDocumento() {
    this.mostrarModalDocumento = false;
  }

  onFileSelected(event: Event) {
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
          alert('Documento subido correctamente');
          this.cerrarModalDocumento();
          // refrescar lista si hace falta
        },
        error: (err) => {
          console.error(err);
          alert('Error al subir el documento');
        }
      });
    } else {
      alert('Selecciona un archivo para subir.');
    }
  }

  esImagen(nombreArchivo: string): boolean {
    const extensionesImagen = ['.jpg', '.jpeg', '.png', '.gif'];
    const extension = nombreArchivo?.toLowerCase().split('.').pop();
    return extensionesImagen.includes('.' + extension);
  }

  rellenarPersonalizado(doc: any): void {
    this.docEditando = doc;
    this.contenidoEditando = doc.descripcion || ''; // ajusta al campo real
    this.tituloEditando = doc.nombre || ''; // ajusta al campo real
    this.mostrarModalEditarPersonalizado = true;
  }

  cerrarModalEditarPersonalizado(): void {
    this.docEditando = null;
    this.mostrarModalEditarPersonalizado = false;
  }

  guardarEdicionPersonalizado(): void {
    if (!this.requiereRespuesta) {
       alert('Debes aceptar la autorización o condiciones puestas por el club.');
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
        //this.loadDocuments();
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
