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

  // Form fields
  titulo = '';
  descripcion = '';
  submitting = false;
  showForm = false;

  clubId = 0;
  userId = 0;

  constructor(
    private location: Location,
    private sugerenciaService: SugerenciaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.clubId = Number(localStorage.getItem('clubId')) || 0;
    this.userId = Number(localStorage.getItem('userId')) || 0;
    this.loadSugerencias();
  }

  goBack(): void {
    this.location.back();
  }

  loadSugerencias(): void {
    this.loading = true;
    this.sugerenciaService.getSugerenciasByClub(this.clubId).subscribe({
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

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.titulo = '';
      this.descripcion = '';
    }
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
      description: this.descripcion.trim()
    };

    this.sugerenciaService.createSugerencia(body).subscribe({
      next: () => {
        this.toastr.success('Sugerencia enviada correctamente.');
        this.titulo = '';
        this.descripcion = '';
        this.showForm = false;
        this.submitting = false;
        this.loadSugerencias();
      },
      error: () => {
        this.toastr.error('Error al enviar la sugerencia.');
        this.submitting = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'IN_PROGRESS': return 'En desarrollo';
      case 'DONE': return 'Implementada';
      case 'REJECTED': return 'Rechazada';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-pending';
      case 'IN_PROGRESS': return 'badge-progress';
      case 'DONE': return 'badge-done';
      case 'REJECTED': return 'badge-rejected';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return 'bi-clock';
      case 'IN_PROGRESS': return 'bi-gear';
      case 'DONE': return 'bi-check-circle';
      case 'REJECTED': return 'bi-x-circle';
      default: return 'bi-question-circle';
    }
  }
}
