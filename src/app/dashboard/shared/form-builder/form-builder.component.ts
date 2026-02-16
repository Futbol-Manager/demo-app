import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ClubService } from 'src/app/core/services/club/club.service';

export interface FormField {
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

@Component({
  selector: 'app-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss'],
})
export class FormBuilderComponent implements OnInit {
  @Input() docClubesId: number | null = null;
  @Input() clubId: number | null = null;
  @Input() contexto: string = 'DOCUMENTO';
  @Output() onSave = new EventEmitter<FormField[]>();
  @Output() onClose = new EventEmitter<void>();

  fields: FormField[] = [];
  loading = false;
  saving = false;

  fieldTypes = [
    { value: 'TEXT_SHORT', label: 'Texto corto' },
    { value: 'TEXT_LONG', label: 'Texto largo' },
    { value: 'NUMBER', label: 'Número' },
    { value: 'DATE', label: 'Fecha' },
    { value: 'CHECKBOX', label: 'Sí / No (checkbox)' },
    { value: 'SELECT', label: 'Desplegable (opciones)' },
    { value: 'FILE', label: 'Subida de archivo' },
    { value: 'SIGNATURE', label: 'Firma' },
  ];

  newOptionText = '';

  constructor(private clubService: ClubService) {}

  ngOnInit(): void {
    this.loadExistingFields();
  }

  loadExistingFields(): void {
    this.loading = true;
    if (this.docClubesId) {
      this.clubService.getFormCamposByDoc(this.docClubesId).subscribe(
        (res: any) => {
          this.fields = res?.data || [];
          this.loading = false;
        },
        () => { this.loading = false; }
      );
    } else if (this.clubId) {
      this.clubService.getFormCamposByClub(this.clubId, this.contexto).subscribe(
        (res: any) => {
          this.fields = res?.data || [];
          this.loading = false;
        },
        () => { this.loading = false; }
      );
    } else {
      this.loading = false;
    }
  }

  addField(): void {
    this.fields.push({
      formularioCampoId: 0,
      docClubesId: this.docClubesId,
      clubId: this.clubId,
      tipoCampo: 'TEXT_SHORT',
      etiqueta: '',
      opciones: '[]',
      orden: this.fields.length + 1,
      obligatorio: 0,
      contexto: this.contexto,
    });
  }

  removeField(index: number): void {
    const field = this.fields[index];
    if (field.formularioCampoId > 0) {
      this.clubService.deleteFormCampo(field.formularioCampoId).subscribe();
    }
    this.fields.splice(index, 1);
    this.updateOrders();
  }

  moveField(index: number, direction: -1 | 1): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.fields.length) return;
    const temp = this.fields[index];
    this.fields[index] = this.fields[newIndex];
    this.fields[newIndex] = temp;
    this.updateOrders();
  }

  updateOrders(): void {
    this.fields.forEach((f, i) => (f.orden = i + 1));
  }

  getOpciones(field: FormField): string[] {
    try {
      return JSON.parse(field.opciones || '[]');
    } catch {
      return [];
    }
  }

  addOpcion(field: FormField, opcion: string): void {
    if (!opcion.trim()) return;
    const opts = this.getOpciones(field);
    opts.push(opcion.trim());
    field.opciones = JSON.stringify(opts);
    this.newOptionText = '';
  }

  removeOpcion(field: FormField, index: number): void {
    const opts = this.getOpciones(field);
    opts.splice(index, 1);
    field.opciones = JSON.stringify(opts);
  }

  saveFields(): void {
    this.saving = true;
    this.updateOrders();
    this.clubService.saveFormCampos(this.fields).subscribe(
      (res: any) => {
        this.fields = res?.data || this.fields;
        this.saving = false;
        this.onSave.emit(this.fields);
      },
      () => {
        this.saving = false;
        alert('Error al guardar los campos');
      }
    );
  }

  close(): void {
    this.onClose.emit();
  }
}
