import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { Response } from 'src/app/core/services/models/response.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
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

  activeDocTab: 'jugadores' | 'entrenadores' = 'jugadores';

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
  textoAutorizacion: string = '';
  customDocStep: number = 1;
  createdDocClubesId: number | null = null;

  mostrarModalEditarPersonalizado: boolean = false;
  tituloEditando: string = '';
  docEditando: any = null;
  mostrarModalEliminar = false;

  // Registros inmutables
  mostrarModalRegistros = false;
  registros: any[] = [];
  loadingRegistros = false;
  registroDetalle: any = null;
  mostrarModalRegistroDetalle = false;

  // Completion detail modal
  mostrarModalCompletionDetail = false;
  completionDetailList: any[] = [];
  loadingCompletionDetail = false;

  // Team filter
  equiposClub: any[] = [];
  selectedTeamIds: number[] = [];

  docEliminarId!: number;
  docEliminarIndex!: number;
  docEliminarNombre = '';
  loadingData = false;
  loadingEliminar = false;

  constructor(
    private location: Location,
    private clubService: ClubService,
    private teamService: TeamService,
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
      this.loadDocuments();
      this.loadEquipos();
    });
  }

  loadEquipos(): void {
    const now = new Date();
    const month = now.getMonth(); // 0-based: 0=Jan, 7=Aug
    const year = now.getFullYear();
    const temporada = (month < 7 ? year - 1 : year).toString();
    this.teamService.getTeamsByClubForCombo(this.clubId, temporada).subscribe({
      next: (res: any) => {
        this.equiposClub = res?.data || [];
        if (this.equiposClub.length === 0) {
          const fallback = (month < 7 ? year : year - 1).toString();
          this.teamService.getTeamsByClubForCombo(this.clubId, fallback).subscribe({
            next: (res2: any) => { this.equiposClub = res2?.data || []; },
            error: () => {}
          });
        }
      },
      error: () => {
        this.equiposClub = [];
      },
    });
  }

  setDocTab(tab: 'jugadores' | 'entrenadores'): void {
    this.activeDocTab = tab;
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loadingData = true;

    if (this.activeDocTab === 'entrenadores') {
      this.loadDocumentosEntrenadores();
    } else {
      this.loadDocumentosJugadores();
    }
  }

  private loadDocumentosJugadores(): void {
    this.clubService.getlistDocumentosByClub(this.clubId).subscribe({
      next: (response: any) => {
        const rawData = response?.data;

        const documentos = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.documentos)
          ? rawData.documentos
          : [];

        // Filtrar solo documentos con destinatario=0 o sin campo destinatario
        const docsJugadores = documentos.filter(
          (doc: any) => !doc.destinatario || doc.destinatario === 0
        );

        const totalPadres =
          typeof rawData?.totalPadres === 'number' &&
          !isNaN(rawData.totalPadres)
            ? rawData.totalPadres
            : 0;

        const subidosPorDocumento =
          typeof rawData?.subidosPorDocumento === 'object' &&
          rawData.subidosPorDocumento !== null
            ? rawData.subidosPorDocumento
            : {};

        this.listDocuments = docsJugadores.map((doc: any) => ({
          ...doc,
          totalPadres,
          totalSubidos:
            typeof subidosPorDocumento[doc.docClubesId] === 'number'
              ? subidosPorDocumento[doc.docClubesId]
              : 0,
        }));

        this.loadingData = false;
      },
      error: (err) => {
        console.error('Error cargando documentos', err);
        this.listDocuments = [];
        this.loadingData = false;
      },
    });
  }

  private loadDocumentosEntrenadores(): void {
    this.clubService.getlistDocumentosEntrenadoresByClub(this.clubId).subscribe({
      next: (response: any) => {
        const rawData = response?.data;

        const documentos = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.documentos)
          ? rawData.documentos
          : [];

        const totalEntrenadores =
          typeof rawData?.totalEntrenadores === 'number' &&
          !isNaN(rawData.totalEntrenadores)
            ? rawData.totalEntrenadores
            : 0;

        const subidosPorDocumento =
          typeof rawData?.subidosPorDocumento === 'object' &&
          rawData.subidosPorDocumento !== null
            ? rawData.subidosPorDocumento
            : {};

        this.listDocuments = documentos.map((doc: any) => ({
          ...doc,
          totalPadres: totalEntrenadores,
          totalSubidos:
            subidosPorDocumento[doc.docClubesId]?.totalSubidos || 0,
        }));

        this.loadingData = false;
      },
      error: (err) => {
        console.error('Error cargando documentos entrenadores', err);
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
    this.selectedTeamIds = [];
    this.mostrarModalDocumento = true;
  }

  openModalSubirSinDoc() {
    this.archivoSeleccionado = null;
    this.selectedTeamIds = [];
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
      destinatario: this.activeDocTab === 'entrenadores' ? 1 : 0,
    };

    this.clubService.uploadDocClub(this.archivoSeleccionado, dto).subscribe({
      next: (event) => {
        // 📊 PROGRESO
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round((event.loaded / event.total) * 100);
        }

        // FINALIZÓ
        if (event.type === HttpEventType.Response) {
          this.loadingUpload = false;
          this.uploadProgress = 100;

          // Save team assignments if any
          const created = (event.body as any)?.data;
          if (created?.docClubesId && this.selectedTeamIds.length > 0) {
            this.clubService.saveDocTeams(created.docClubesId, this.selectedTeamIds).subscribe({
              next: () => {
                this.loadDocuments();
                this.cerrarModalDocumento();
                this.toastr.success('Documento subido correctamente');
              },
              error: () => {
                this.loadDocuments();
                this.cerrarModalDocumento();
                this.toastr.success('Documento subido (sin asignar equipos)');
              },
            });
          } else {
            this.loadDocuments();
            this.cerrarModalDocumento();
            this.toastr.success('Documento subido correctamente');
          }
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
      visible: 0,
      file: null,
      clubId: this.clubId,
      fecCreate: null,
      requiere: 1,
      destinatario: this.activeDocTab === 'entrenadores' ? 1 : 0,
    };

    this.clubService.uploadSinDocClub(dto).subscribe({
      next: (res: any) => {
        const created = res?.data;
        if (created?.docClubesId && this.selectedTeamIds.length > 0) {
          this.clubService.saveDocTeams(created.docClubesId, this.selectedTeamIds).subscribe({
            next: () => {
              this.loadDocuments();
              this.toastr.success('Documento subido correctamente.');
              this.cerrarModalSinDocumento();
            },
            error: () => {
              this.loadDocuments();
              this.toastr.success('Documento subido (sin asignar equipos).');
              this.cerrarModalSinDocumento();
            },
          });
        } else {
          this.loadDocuments();
          this.toastr.success('Documento subido correctamente.');
          this.cerrarModalSinDocumento();
        }
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Error al subir el documento.');
      },
    });
  }

  openModalSubirPersonalizado(): void {
    this.customDocStep = 1;
    this.createdDocClubesId = null;
    this.tituloPersonalizado = '';
    this.selectedTeamIds = [];
    this.mostrarModalPersonalizado = true;
  }

  cerrarModalPersonalizado(): void {
    this.mostrarModalPersonalizado = false;
    this.requiereRespuesta = false;
    this.tituloPersonalizado = '';
    this.textoAutorizacion = '';
    this.customDocStep = 1;
    this.createdDocClubesId = null;
  }

  crearDocYAbrirBuilder(): void {
    if (!this.tituloPersonalizado.trim() || this.selectedTeamIds.length === 0) return;

    const dto = {
      docClubesId: 0,
      nombre: this.tituloPersonalizado,
      descripcion: 'Formulario personalizado',
      tipo: 'Personalizado',
      visible: 0,
      file: null,
      clubId: this.clubId,
      fecCreate: null,
      requiere: 2,
      destinatario: this.activeDocTab === 'entrenadores' ? 1 : 0,
    };

    this.clubService.uploadSinDocClub(dto).subscribe({
      next: (res: any) => {
        const created = res?.data;
        if (created?.docClubesId) {
          this.createdDocClubesId = created.docClubesId;
          if (this.selectedTeamIds.length > 0) {
            this.clubService.saveDocTeams(created.docClubesId, this.selectedTeamIds).subscribe();
          }
        } else {
          this.loadDocuments();
        }
        this.customDocStep = 2;
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Error al crear el documento.');
      },
    });
  }

  onFormBuilderSaved(fields: any[]): void {
    this.toastr.success('Campos del formulario guardados');
    // Avanzar al paso 3: texto de autorización
    this.customDocStep = 3;
  }

  onFormBuilderClosed(): void {
    // Si estamos en paso 2, avanzar al paso 3
    if (this.customDocStep === 2) {
      this.customDocStep = 3;
      return;
    }
    this.loadDocuments();
    this.cerrarModalPersonalizado();
  }

  finalizarFormularioPersonalizado(): void {
    if (this.createdDocClubesId && this.textoAutorizacion.trim()) {
      this.clubService.updateTextoAutorizacion(this.createdDocClubesId, this.textoAutorizacion).subscribe({
        next: () => {
          this.toastr.success('Formulario creado correctamente');
          this.loadDocuments();
          this.cerrarModalPersonalizado();
        },
        error: () => {
          this.toastr.error('Error al guardar el texto de autorización');
        }
      });
    } else {
      // Si no hay texto de autorización, cerrar directamente
      this.toastr.success('Formulario creado correctamente');
      this.loadDocuments();
      this.cerrarModalPersonalizado();
    }
  }

  editarPersonalizado(doc: any): void {
    this.docEditando = doc;
    this.tituloEditando = doc.nombre || '';
    this.mostrarModalEditarPersonalizado = true;
  }

  cerrarModalEditarPersonalizado(): void {
    this.mostrarModalEditarPersonalizado = false;
    this.docEditando = null;
    this.tituloEditando = '';
  }

  onEditFormBuilderSaved(fields: any[]): void {
    this.toastr.success('Formulario actualizado correctamente');
    this.loadDocuments();
    this.cerrarModalEditarPersonalizado();
  }

  onEditFormBuilderClosed(): void {
    this.cerrarModalEditarPersonalizado();
  }

  // ========== REGISTROS ==========

  openRegistros(doc: any): void {
    this.mostrarModalRegistros = true;
    this.loadingRegistros = true;
    this.registros = [];
    this.clubService.getFormRegistros(this.clubId, doc.docClubesId).subscribe({
      next: (res: any) => {
        this.registros = res?.data || [];
        this.loadingRegistros = false;
      },
      error: () => {
        this.registros = [];
        this.loadingRegistros = false;
      },
    });
  }

  cerrarModalRegistros(): void {
    this.mostrarModalRegistros = false;
    this.registros = [];
  }

  openRegistroDetalle(registro: any): void {
    this.mostrarModalRegistroDetalle = true;
    this.registroDetalle = null;
    this.clubService.getFormRegistroDetalle(registro.registroId).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data && data.datosJson) {
          try {
            data.datosParseados = JSON.parse(data.datosJson);
          } catch (e) {
            data.datosParseados = [];
          }
        }
        this.registroDetalle = data;
      },
      error: () => {
        this.registroDetalle = null;
      },
    });
  }

  cerrarModalRegistroDetalle(): void {
    this.mostrarModalRegistroDetalle = false;
    this.registroDetalle = null;
  }

  getFileUrl(fileName: string): string {
    return 'https://appsphairatech.com/images/formulario-files/' + fileName;
  }

  // ========== COMPLETION DETAIL ==========

  openCompletionDetail(doc: any): void {
    this.mostrarModalCompletionDetail = true;
    this.loadingCompletionDetail = true;
    this.completionDetailList = [];
    const tipo = this.activeDocTab === 'entrenadores' ? 'entrenadores' : 'padres';
    this.clubService.getDocCompletionDetail(doc.docClubesId, this.clubId, tipo).subscribe({
      next: (res: any) => {
        this.completionDetailList = res?.data || [];
        this.loadingCompletionDetail = false;
      },
      error: () => {
        this.completionDetailList = [];
        this.loadingCompletionDetail = false;
      },
    });
  }

  cerrarModalCompletionDetail(): void {
    this.mostrarModalCompletionDetail = false;
    this.completionDetailList = [];
  }

  // ========== TEAM FILTER ==========

  toggleTeamId(teamId: number): void {
    const idx = this.selectedTeamIds.indexOf(teamId);
    if (idx >= 0) {
      this.selectedTeamIds = this.selectedTeamIds.filter(id => id !== teamId);
    } else {
      this.selectedTeamIds = [...this.selectedTeamIds, teamId];
    }
  }

  isTeamSelected(teamId: number): boolean {
    return this.selectedTeamIds.includes(teamId);
  }

  getTeamNames(teamIds: number[]): string {
    if (!teamIds || teamIds.length === 0) return 'Todos';
    return teamIds
      .map((id) => {
        const team = this.equiposClub.find((t: any) => t.value === id);
        return team ? team.name : 'Equipo #' + id;
      })
      .join(', ');
  }
}
