import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ClubService } from 'src/app/core/services/club/club.service';
import { ToastrService } from 'ngx-toastr';
import { FormTemplate, FormTemplateTipo } from 'src/app/core/services/form-template/form-template.model';

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
  // ── Modo clásico (documentos / perfiles) ──────────────────────────────────
  @Input() docClubesId: number | null = null;
  @Input() clubId: number | null = null;
  @Input() contexto: string = 'DOCUMENTO';

  // ── Modo template (formularios pre/post partido/entrenamiento) ─────────────
  /** Cuando es true el builder trabaja en modo autónomo sin persistir en FormularioCampo */
  @Input() templateMode = false;
  /** Tipo de formulario (pre-match, post-match, pre-training, post-training) */
  @Input() tipoFormulario: FormTemplateTipo | null = null;
  /** Nombre del template (two-way binding en templateMode) */
  @Input() templateNombre: string = '';
  /** Campos iniciales para edición de template existente */
  @Input() initialCampos: FormField[] = [];

  @Output() onSave = new EventEmitter<FormField[]>();
  @Output() onClose = new EventEmitter<void>();
  /** Emitido en templateMode al guardar, devuelve {nombre, campos} */
  @Output() templateSaved = new EventEmitter<{ nombre: string; campos: FormField[] }>();

  fields: FormField[] = [];
  loading = false;
  saving = false;
  nombreTemplate: string = '';
  nombreError = false;

  fieldTypes = [
    { value: 'TEXT_SHORT', label: 'Texto corto' },
    { value: 'TEXT_LONG', label: 'Texto largo' },
    { value: 'NUMBER', label: 'Número' },
    { value: 'DATE', label: 'Fecha' },
    { value: 'CHECKBOX', label: 'Sí / No' },
    { value: 'SELECT', label: 'Desplegable (opciones)' },
    { value: 'RATING', label: 'Valoración (1-5 estrellas)' },
    { value: 'SCALE', label: 'Escala (1-10)' },
    { value: 'FILE', label: 'Subida de archivo' },
    { value: 'SIGNATURE', label: 'Firma' },
  ];

  newOptionText = '';

  constructor(private clubService: ClubService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.nombreTemplate = this.templateNombre || '';
    if (this.templateMode) {
      this.fields = this.initialCampos.length ? [...this.initialCampos] : [];
      this.loading = false;
    } else {
      this.loadExistingFields();
    }
  }

  loadExistingFields(): void {
    this.loading = true;
    if (this.docClubesId) {
      this.clubService.getFormCamposByDoc(this.docClubesId).subscribe(
        (res: any) => { this.fields = res?.data || []; this.loading = false; },
        () => { this.loading = false; }
      );
    } else if (this.clubId) {
      this.clubService.getFormCamposByClub(this.clubId, this.contexto).subscribe(
        (res: any) => { this.fields = res?.data || []; this.loading = false; },
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
    if (!this.templateMode && field.formularioCampoId > 0) {
      this.clubService.deleteFormCampo(field.formularioCampoId).subscribe();
    }
    this.fields.splice(index, 1);
    this.updateOrders();
  }

  /** CDK Drag & Drop handler */
  onDrop(event: CdkDragDrop<FormField[]>): void {
    moveItemInArray(this.fields, event.previousIndex, event.currentIndex);
    this.updateOrders();
  }

  /** Fallback: reorder with buttons */
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
    try { return JSON.parse(field.opciones || '[]'); } catch { return []; }
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
    if (this.templateMode) {
      if (!this.nombreTemplate.trim()) {
        this.nombreError = true;
        return;
      }
      this.nombreError = false;
      this.updateOrders();
      this.templateSaved.emit({ nombre: this.nombreTemplate, campos: this.fields });
      return;
    }
    this.saving = true;
    this.updateOrders();
    this.clubService.saveFormCampos(this.fields).subscribe(
      (res: any) => {
        this.fields = res?.data || this.fields;
        this.saving = false;
        this.onSave.emit(this.fields);
      },
      () => { this.saving = false; this.toastr.error('Error al guardar los campos'); }
    );
  }

  close(): void {
    this.onClose.emit();
  }
}
