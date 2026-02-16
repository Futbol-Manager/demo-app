import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { SugerenciaService } from 'src/app/core/services/sugerencia/sugerencia.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-sugerencias',
  templateUrl: './admin-sugerencias.component.html',
  styleUrls: ['./admin-sugerencias.component.scss']
})
export class AdminSugerenciasComponent implements OnInit {

  sugerencias: any[] = [];
  filteredSugerencias: any[] = [];
  loading = true;

  activeFilter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'REJECTED' = 'ALL';

  // Modal state
  showModal = false;
  selectedSugerencia: any = null;
  modalStatus = '';
  modalResponse = '';
  savingModal = false;

  constructor(
    private location: Location,
    private sugerenciaService: SugerenciaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSugerencias();
  }

  goBack(): void {
    this.location.back();
  }

  loadSugerencias(): void {
    this.loading = true;
    this.sugerenciaService.getAllSugerencias().subscribe({
      next: (res: any) => {
        this.sugerencias = res?.data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.sugerencias = [];
        this.filteredSugerencias = [];
        this.loading = false;
      }
    });
  }

  setFilter(filter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'REJECTED'): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.activeFilter === 'ALL') {
      this.filteredSugerencias = [...this.sugerencias];
    } else {
      this.filteredSugerencias = this.sugerencias.filter(s => s.status === this.activeFilter);
    }
  }

  getFilterCount(filter: string): number {
    if (filter === 'ALL') return this.sugerencias.length;
    return this.sugerencias.filter(s => s.status === filter).length;
  }

  // ===== MODAL =====

  openModal(sug: any): void {
    this.selectedSugerencia = sug;
    this.modalStatus = sug.status || 'PENDING';
    this.modalResponse = sug.adminResponse || '';
    this.showModal = true;

    if (!sug.read) {
      this.sugerenciaService.markAsRead(sug.id).subscribe({
        next: () => {
          sug.read = true;
        },
        error: () => {}
      });
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedSugerencia = null;
    this.modalStatus = '';
    this.modalResponse = '';
    this.savingModal = false;
  }

  saveChanges(): void {
    if (!this.selectedSugerencia) return;

    this.savingModal = true;
    const id = this.selectedSugerencia.id;
    let statusChanged = this.modalStatus !== this.selectedSugerencia.status;
    let responseChanged = this.modalResponse.trim() !== (this.selectedSugerencia.adminResponse || '').trim();

    const updateStatus = () => {
      if (statusChanged) {
        return this.sugerenciaService.updateStatus(id, this.modalStatus);
      }
      return null;
    };

    const updateResponse = () => {
      if (responseChanged && this.modalResponse.trim()) {
        return this.sugerenciaService.respond(id, this.modalResponse.trim());
      }
      return null;
    };

    const statusObs = updateStatus();
    const responseObs = updateResponse();

    if (!statusObs && !responseObs) {
      this.toastr.info('No hay cambios que guardar.');
      this.savingModal = false;
      return;
    }

    let completedCalls = 0;
    const totalCalls = (statusObs ? 1 : 0) + (responseObs ? 1 : 0);

    const onComplete = () => {
      completedCalls++;
      if (completedCalls >= totalCalls) {
        this.toastr.success('Sugerencia actualizada correctamente.');
        this.savingModal = false;
        this.closeModal();
        this.loadSugerencias();
      }
    };

    const onError = () => {
      this.toastr.error('Error al actualizar la sugerencia.');
      this.savingModal = false;
    };

    if (statusObs) {
      statusObs.subscribe({ next: onComplete, error: onError });
    }
    if (responseObs) {
      responseObs.subscribe({ next: onComplete, error: onError });
    }
  }

  // ===== HELPERS =====

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

  getFilterLabel(filter: string): string {
    switch (filter) {
      case 'ALL': return 'Todas';
      case 'PENDING': return 'Pendientes';
      case 'IN_PROGRESS': return 'En Desarrollo';
      case 'DONE': return 'Implementadas';
      case 'REJECTED': return 'Rechazadas';
      default: return filter;
    }
  }

  getFilterIcon(filter: string): string {
    switch (filter) {
      case 'ALL': return 'bi-collection';
      case 'PENDING': return 'bi-clock';
      case 'IN_PROGRESS': return 'bi-gear';
      case 'DONE': return 'bi-check-circle';
      case 'REJECTED': return 'bi-x-circle';
      default: return 'bi-circle';
    }
  }
}
