import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { SugerenciaService } from 'src/app/core/services/sugerencia/sugerencia.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sugerencias-club',
  templateUrl: './sugerencias-club.component.html',
  styleUrls: ['./sugerencias-club.component.scss']
})
export class SugerenciasClubComponent implements OnInit {

  sugerencias: any[] = [];
  loading = true;

  titulo = '';
  descripcion = '';
  categoria = 'FEATURE';
  submitting = false;
  showForm = false;
  justSubmitted = false;

  clubId = 0;
  userId = 0;

  readonly categorias = [
    { value: 'FEATURE',     label: 'Nueva función',  icon: 'bi-rocket-takeoff' },
    { value: 'UI',          label: 'Mejora visual',  icon: 'bi-palette'         },
    { value: 'PERFORMANCE', label: 'Rendimiento',    icon: 'bi-speedometer2'    },
    { value: 'BUG',         label: 'Fallo / Error',  icon: 'bi-bug'             },
    { value: 'OTHER',       label: 'Otra idea',      icon: 'bi-stars'           }
  ];

  constructor(
    private location: Location,
    private sugerenciaService: SugerenciaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.clubId = Number(localStorage.getItem('clubId')) || 0;
    this.userId = Number(localStorage.getItem('userId')) || 0;
    this.loadSugerencias();
    // Mark all responses as read when user enters this page
    if (this.userId > 0) {
      this.sugerenciaService.markAllReadByUser(this.userId).subscribe({ error: () => {} });
    }
  }

  goBack(): void {
    this.location.back();
  }

  loadSugerencias(): void {
    this.loading = true;
    const obs = this.userId > 0
      ? this.sugerenciaService.getSugerenciasByUser(this.userId)
      : this.sugerenciaService.getSugerenciasByClub(this.clubId);

    obs.subscribe({
      next: (res: any) => {
        this.sugerencias = res?.data || [];
        this.loading = false;
      },
      error: () => {
        this.sugerencias = [];
        this.loading = false;
      }
    });
  }

  openForm(): void {
    this.showForm = true;
    this.justSubmitted = false;
    this.titulo = '';
    this.descripcion = '';
    this.categoria = 'FEATURE';
  }

  closeForm(): void {
    this.showForm = false;
    this.titulo = '';
    this.descripcion = '';
  }

  submitSugerencia(): void {
    if (!this.titulo.trim() || !this.descripcion.trim()) {
      this.toastr.warning('Completa el título y la descripción.');
      return;
    }

    this.submitting = true;
    const body = {
      clubId: this.clubId,
      userId: this.userId,
      title: this.titulo.trim(),
      description: this.descripcion.trim(),
      categoria: this.categoria
    };

    this.sugerenciaService.createSugerencia(body as any).subscribe({
      next: () => {
        this.showForm = false;
        this.justSubmitted = true;
        this.submitting = false;
        this.loadSugerencias();
        setTimeout(() => { this.justSubmitted = false; }, 8000);
      },
      error: () => {
        this.toastr.error('Error al enviar la sugerencia. Inténtalo de nuevo.');
        this.submitting = false;
      }
    });
  }

  // ── Status helpers ──────────────────────────────────────────────

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':     return 'Recibida';
      case 'IN_PROGRESS': return 'En desarrollo';
      case 'DONE':        return 'Implementada';
      case 'REJECTED':    return 'Rechazada';
      default:            return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':     return 'badge-pending';
      case 'IN_PROGRESS': return 'badge-progress';
      case 'DONE':        return 'badge-done';
      case 'REJECTED':    return 'badge-rejected';
      default:            return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING':     return 'bi-clock';
      case 'IN_PROGRESS': return 'bi-gear-fill';
      case 'DONE':        return 'bi-check-circle-fill';
      case 'REJECTED':    return 'bi-x-circle-fill';
      default:            return 'bi-question-circle';
    }
  }

  // ── Stepper helpers ─────────────────────────────────────────────
  // Steps: 0=PENDING, 1=IN_PROGRESS, 2=DONE/REJECTED

  // Paso 0 = Recibida (PENDING), 1 = En desarrollo / Rechazada (IN_PROGRESS / REJECTED), 2 = Implementada (DONE)
  isStepDone(status: string, stepIndex: number): boolean {
    const order: { [key: string]: number } = { PENDING: 0, IN_PROGRESS: 1, DONE: 2, REJECTED: 1 };
    const current = order[status] ?? 0;
    return current > stepIndex;
  }

  isStepCurrent(status: string, stepIndex: number): boolean {
    const order: { [key: string]: number } = { PENDING: 0, IN_PROGRESS: 1, DONE: 2, REJECTED: 1 };
    const current = order[status] ?? 0;
    return current === stepIndex;
  }

  // ── Category helpers ────────────────────────────────────────────

  getCatLabel(value: string): string {
    return this.categorias.find(c => c.value === value)?.label ?? value;
  }

  getCatIcon(value: string): string {
    return this.categorias.find(c => c.value === value)?.icon ?? 'bi-tag';
  }
}
