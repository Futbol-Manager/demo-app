import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClubService } from 'src/app/core/services/club/club.service';
import { environment } from 'src/environments/environment';

export interface FormFieldDef {
  formularioCampoId: number;
  docClubesId: number | null;
  clubId: number | null;
  tipoCampo: string;
  etiqueta: string;
  opciones: string;
  orden: number;
  obligatorio: number;
  contexto: string;
}

export interface FormResponse {
  formularioRespuestaId: number;
  formularioCampoId: number;
  userId: number;
  playerId: number;
  valor: string;
  file: string;
  bloqueado?: number;
}

@Component({
  selector: 'app-form-renderer',
  templateUrl: './form-renderer.component.html',
  styleUrls: ['./form-renderer.component.scss'],
})
export class FormRendererComponent implements OnInit {
  @Input() docClubesId: number | null = null;
  @Input() clubId: number | null = null;
  @Input() contexto: string = 'DOCUMENTO';
  @Input() userId: number = 0;
  @Input() playerId: number = 0;
  @Output() onSave = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();
  @Output() onFieldsLoaded = new EventEmitter<number>(); // emits field count

  fields: FormFieldDef[] = [];
  responses: { [campoId: number]: FormResponse } = {};
  loading = false;
  saving = false;

  // file upload tracking
  uploadingField: number | null = null;

  constructor(private clubService: ClubService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadFieldsAndResponses();
  }

  loadFieldsAndResponses(): void {
    this.loading = true;

    if (this.docClubesId) {
      // document context
      this.clubService.getFormCamposByDoc(this.docClubesId).subscribe(
        (res: any) => {
          this.fields = (res?.data || []).sort((a: any, b: any) => a.orden - b.orden);
          this.onFieldsLoaded.emit(this.fields.length);
          this.loadResponses();
        },
        () => { this.loading = false; this.onFieldsLoaded.emit(0); }
      );
    } else if (this.clubId) {
      // profile context
      this.clubService.getFormCamposByClub(this.clubId, this.contexto).subscribe(
        (res: any) => {
          this.fields = (res?.data || []).sort((a: any, b: any) => a.orden - b.orden);
          this.onFieldsLoaded.emit(this.fields.length);
          this.loadResponses();
        },
        () => { this.loading = false; this.onFieldsLoaded.emit(0); }
      );
    } else {
      this.loading = false;
      this.onFieldsLoaded.emit(0);
    }
  }

  loadResponses(): void {
    if (this.fields.length === 0) {
      this.loading = false;
      return;
    }

    if (this.docClubesId) {
      this.clubService.getFormRespuestasByDoc(this.docClubesId, this.userId, this.playerId).subscribe(
        (res: any) => {
          this.mapResponses(res?.data || []);
          this.loading = false;
        },
        () => { this.loading = false; }
      );
    } else if (this.clubId) {
      this.clubService.getFormRespuestasByProfile(this.clubId, this.userId).subscribe(
        (res: any) => {
          this.mapResponses(res?.data || []);
          this.loading = false;
        },
        () => { this.loading = false; }
      );
    } else {
      this.loading = false;
    }
  }

  mapResponses(data: any[]): void {
    this.responses = {};
    for (const item of data) {
      if (item.respuesta) {
        this.responses[item.campo.formularioCampoId] = item.respuesta;
      }
    }
    for (const f of this.fields) {
      if (!this.responses[f.formularioCampoId]) {
        this.responses[f.formularioCampoId] = {
          formularioRespuestaId: 0,
          formularioCampoId: f.formularioCampoId,
          userId: this.userId,
          playerId: this.playerId,
          valor: f.tipoCampo === 'CHECKBOX' ? 'false' : '',
          file: '',
        };
      }
    }
  }

  getOpciones(field: FormFieldDef): string[] {
    try {
      return JSON.parse(field.opciones || '[]');
    } catch {
      return [];
    }
  }

  onFileChange(event: any, field: FormFieldDef): void {
    const file: File = event.target.files[0];
    if (!file) return;
    this.uploadingField = field.formularioCampoId;
    this.clubService.uploadFormFile(file, field.formularioCampoId, this.userId, this.playerId).subscribe(
      (res: any) => {
        const fileName = res?.data;
        if (fileName) {
          this.responses[field.formularioCampoId].file = fileName;
          this.responses[field.formularioCampoId].valor = fileName;
        }
        this.uploadingField = null;
      },
      () => {
        alert('Error al subir el archivo');
        this.uploadingField = null;
      }
    );
  }

  saveResponses(): void {
    this.saving = true;
    const respArr: FormResponse[] = [];
    for (const f of this.fields) {
      if (f.tipoCampo === 'FILE' || f.tipoCampo === 'SIGNATURE') continue; // files handled separately
      const r = this.responses[f.formularioCampoId];
      if (r) {
        respArr.push(r);
      }
    }

    this.clubService.saveFormRespuestas(respArr).subscribe(
      () => {
        this.saving = false;
        this.snackBar.open('Formulario enviado correctamente', 'OK', {
          duration: 4000,
          panelClass: ['snackbar-success'],
        });
        this.onSave.emit();
      },
      () => {
        this.saving = false;
        this.snackBar.open('Error al guardar las respuestas', 'OK', {
          duration: 4000,
          panelClass: ['snackbar-error'],
        });
      }
    );
  }

  close(): void {
    this.onClose.emit();
  }

  getFileUrl(fileName: string): string {
    return environment.images + 'formulario-files/' + fileName;
  }

  // Signature pad support
  signaturePadField: FormFieldDef | null = null;
  signatureCanvas: HTMLCanvasElement | null = null;
  signatureCtx: CanvasRenderingContext2D | null = null;
  isDrawing = false;

  openSignaturePad(field: FormFieldDef): void {
    this.signaturePadField = field;
    setTimeout(() => {
      const canvas = document.getElementById('signatureCanvas-' + field.formularioCampoId) as HTMLCanvasElement;
      if (canvas) {
        this.signatureCanvas = canvas;
        this.signatureCtx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = 150;
        if (this.signatureCtx) {
          this.signatureCtx.strokeStyle = '#000';
          this.signatureCtx.lineWidth = 2;
          this.signatureCtx.lineCap = 'round';
        }
      }
    }, 100);
  }

  startDraw(event: MouseEvent | TouchEvent): void {
    this.isDrawing = true;
    const pos = this.getDrawPos(event);
    this.signatureCtx?.beginPath();
    this.signatureCtx?.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing || !this.signatureCtx) return;
    event.preventDefault();
    const pos = this.getDrawPos(event);
    this.signatureCtx.lineTo(pos.x, pos.y);
    this.signatureCtx.stroke();
  }

  endDraw(): void {
    this.isDrawing = false;
  }

  clearSignature(): void {
    if (this.signatureCanvas && this.signatureCtx) {
      this.signatureCtx.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
    }
  }

  saveSignature(field: FormFieldDef): void {
    if (!this.signatureCanvas) return;
    this.signatureCanvas.toBlob((blob: Blob | null) => {
      if (!blob) return;
      const file = new File([blob], 'firma.png', { type: 'image/png' });
      this.uploadingField = field.formularioCampoId;
      this.clubService.uploadFormFile(file, field.formularioCampoId, this.userId, this.playerId).subscribe(
        (res: any) => {
          const fileName = res?.data;
          if (fileName) {
            this.responses[field.formularioCampoId].file = fileName;
            this.responses[field.formularioCampoId].valor = fileName;
          }
          this.uploadingField = null;
          this.signaturePadField = null;
        },
        () => {
          alert('Error al guardar la firma');
          this.uploadingField = null;
        }
      );
    }, 'image/png');
  }

  private getDrawPos(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.signatureCanvas!;
    const rect = canvas.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    } else {
      const touch = event.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
  }
}
