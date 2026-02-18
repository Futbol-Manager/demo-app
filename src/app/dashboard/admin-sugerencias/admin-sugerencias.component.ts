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

  activeFilter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'REJECTED' | 'ARCHIVED' | 'TRASH' = 'ALL';

  // Modal state
  showModal = false;
  selectedSugerencia: any = null;
  modalStatus = '';
  modalResponse = '';
  savingModal = false;

  // Quick AI actions
  loadingAiAction = false;
  showRejectInput = false;
  rejectReason = '';
  aiResultMessage = '';
  aiActionDone = false;

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

  setFilter(filter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'REJECTED' | 'ARCHIVED' | 'TRASH'): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.activeFilter === 'ALL') {
      // Vista principal: excluye archivadas y papelera
      this.filteredSugerencias = this.sugerencias.filter(
        s => s.status !== 'ARCHIVED' && s.status !== 'TRASH'
      );
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
    this.showRejectInput = false;
    this.rejectReason = '';
    this.aiResultMessage = '';
    this.aiActionDone = false;
    this.loadingAiAction = false;
  }

  acceptWithAI(): void {
    if (!this.selectedSugerencia || this.loadingAiAction) return;
    this.loadingAiAction = true;
    this.aiResultMessage = '';
    this.sugerenciaService.aiRespond(this.selectedSugerencia.id, 'ACCEPT', '').subscribe({
      next: (res: any) => {
        this.loadingAiAction = false;
        this.aiActionDone = true;
        this.aiResultMessage = res?.data?.adminResponse || 'Aceptada correctamente.';
        this.toastr.success('Sugerencia aceptada. Mensaje enviado al usuario.');
        this.loadSugerencias();
      },
      error: () => {
        this.loadingAiAction = false;
        this.toastr.error('Error al procesar la acción. Inténtalo de nuevo.');
      }
    });
  }

  archiveSugerencia(): void {
    if (!this.selectedSugerencia || this.savingModal) return;
    this.savingModal = true;
    this.sugerenciaService.updateStatus(this.selectedSugerencia.id, 'ARCHIVED').subscribe({
      next: () => {
        this.savingModal = false;
        this.toastr.success('Sugerencia archivada.');
        this.closeModal();
        this.loadSugerencias();
      },
      error: () => {
        this.savingModal = false;
        this.toastr.error('Error al archivar.');
      }
    });
  }

  moveToTrash(): void {
    if (!this.selectedSugerencia || this.savingModal) return;
    this.savingModal = true;
    this.sugerenciaService.updateStatus(this.selectedSugerencia.id, 'TRASH').subscribe({
      next: () => {
        this.savingModal = false;
        this.toastr.success('Sugerencia enviada a la papelera.');
        this.closeModal();
        this.loadSugerencias();
      },
      error: () => {
        this.savingModal = false;
        this.toastr.error('Error al mover a la papelera.');
      }
    });
  }

  restoreSugerencia(): void {
    if (!this.selectedSugerencia || this.savingModal) return;
    this.savingModal = true;
    const restoreStatus = this.selectedSugerencia.status === 'ARCHIVED' ? 'DONE' : 'PENDING';
    this.sugerenciaService.updateStatus(this.selectedSugerencia.id, restoreStatus).subscribe({
      next: () => {
        this.savingModal = false;
        this.toastr.success('Sugerencia restaurada.');
        this.closeModal();
        this.loadSugerencias();
      },
      error: () => {
        this.savingModal = false;
        this.toastr.error('Error al restaurar.');
      }
    });
  }

  hardDelete(): void {
    if (!this.selectedSugerencia || this.savingModal) return;
    if (!confirm('¿Eliminar definitivamente esta sugerencia? Esta acción no se puede deshacer.')) return;
    this.savingModal = true;
    this.sugerenciaService.hardDelete(this.selectedSugerencia.id).subscribe({
      next: () => {
        this.savingModal = false;
        this.toastr.success('Sugerencia eliminada definitivamente.');
        this.closeModal();
        this.loadSugerencias();
      },
      error: () => {
        this.savingModal = false;
        this.toastr.error('Error al eliminar.');
      }
    });
  }

  archiveAllDone(): void {
    if (!confirm('¿Archivar todas las sugerencias con estado "Implementada"?')) return;
    this.sugerenciaService.archiveAllDone().subscribe({
      next: (res: any) => {
        const count = res?.data ?? 0;
        this.toastr.success(`${count} sugerencia${count !== 1 ? 's' : ''} archivada${count !== 1 ? 's' : ''}.`);
        this.loadSugerencias();
      },
      error: () => this.toastr.error('Error al archivar las sugerencias.')
    });
  }

  markAsImplemented(): void {
    if (!this.selectedSugerencia || this.savingModal) return;
    this.savingModal = true;
    this.sugerenciaService.updateStatus(this.selectedSugerencia.id, 'DONE').subscribe({
      next: () => {
        this.savingModal = false;
        this.toastr.success('Sugerencia marcada como Implementada.');
        this.closeModal();
        this.loadSugerencias();
      },
      error: () => {
        this.savingModal = false;
        this.toastr.error('Error al actualizar el estado.');
      }
    });
  }

  rejectWithAI(): void {
    if (!this.selectedSugerencia || this.loadingAiAction) return;
    if (!this.rejectReason.trim()) {
      this.toastr.warning('Por favor, indica el motivo del rechazo.');
      return;
    }
    this.loadingAiAction = true;
    this.aiResultMessage = '';
    this.sugerenciaService.aiRespond(this.selectedSugerencia.id, 'REJECT', this.rejectReason.trim()).subscribe({
      next: (res: any) => {
        this.loadingAiAction = false;
        this.aiActionDone = true;
        this.aiResultMessage = res?.data?.adminResponse || 'Rechazada correctamente.';
        this.toastr.success('Sugerencia rechazada. Mensaje enviado al usuario.');
        this.loadSugerencias();
      },
      error: () => {
        this.loadingAiAction = false;
        this.toastr.error('Error al procesar la acción. Inténtalo de nuevo.');
      }
    });
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
      case 'ARCHIVED': return 'Archivada';
      case 'TRASH': return 'Papelera';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-pending';
      case 'IN_PROGRESS': return 'badge-progress';
      case 'DONE': return 'badge-done';
      case 'REJECTED': return 'badge-rejected';
      case 'ARCHIVED': return 'badge-archived';
      case 'TRASH': return 'badge-trash';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return 'bi-clock';
      case 'IN_PROGRESS': return 'bi-gear';
      case 'DONE': return 'bi-check-circle';
      case 'REJECTED': return 'bi-x-circle';
      case 'ARCHIVED': return 'bi-archive';
      case 'TRASH': return 'bi-trash';
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
      case 'ARCHIVED': return 'Archivadas';
      case 'TRASH': return 'Papelera';
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
      case 'ARCHIVED': return 'bi-archive';
      case 'TRASH': return 'bi-trash';
      default: return 'bi-circle';
    }
  }
}
