import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ClubService } from '../../../../core/services/club/club.service';

export interface PlayerPaymentRow {
  playerId: number;
  nombre: string;
  picturePlayer: string;
  teamId: number;
  nameTeam: string;
  totalPagado: number;
  totalDeuda: number;
  restante: number;
  numPagados: number;
  numTotal: number;
  progreso: string;
  estado: number; // 0=sin pagos, 1=retraso, 2=al corriente, 3=todo pagado
}

@Component({
  selector: 'app-payment-table',
  templateUrl: './payment-table.component.html',
  styleUrls: ['./payment-table.component.scss']
})
export class PaymentTableComponent implements OnInit {

  @Input() clubId!: number;
  @Input() temporada!: string;
  @Input() pagosClub: any[] = [];
  @Input() teams: any[] = [];

  @Output() onImputePayment = new EventEmitter<PlayerPaymentRow>();
  @Output() onViewHistory = new EventEmitter<PlayerPaymentRow>();
  @Output() onEditPlayer = new EventEmitter<PlayerPaymentRow>();
  @Output() onChargeSavedCard = new EventEmitter<PlayerPaymentRow>();

  players: PlayerPaymentRow[] = [];
  filteredPlayers: PlayerPaymentRow[] = [];
  loading = false;

  filterNombre = '';
  filterPagoIds: number[] = [];
  filterTeamId: number | null = null;
  filterEstado: number | null = null;

  sortColumn = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';

  page = 1;
  pageSize = 25;
  pageSizes = [25, 50, 100];

  constructor(
    private clubService: ClubService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    const filters: any = {};
    if (this.filterPagoIds.length) filters.pagos = this.filterPagoIds.join(',');
    if (this.filterTeamId) filters.team = String(this.filterTeamId);
    if (this.filterEstado !== null) filters.estado = String(this.filterEstado);

    this.clubService.getListPlayersPagosClubV2(this.clubId, this.temporada, filters).subscribe({
      next: (resp: any) => {
        this.players = resp.data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters() {
    let result = [...this.players];

    if (this.filterNombre.trim()) {
      const search = this.filterNombre.toLowerCase().trim();
      result = result.filter(p => p.nombre.toLowerCase().includes(search));
    }

    this.filteredPlayers = result;
    this.sortData();
  }

  sortData() {
    const col = this.sortColumn as keyof PlayerPaymentRow;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.filteredPlayers.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb) * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
  }

  toggleSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortData();
  }

  get paginatedPlayers() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredPlayers.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredPlayers.length / this.pageSize);
  }

  getEstadoClass(estado: number): string {
    switch (estado) {
      case 3: return 'status-green';
      case 2: return 'status-green';
      case 1: return 'status-red';
      default: return 'status-orange';
    }
  }

  getEstadoTooltip(estado: number): string {
    switch (estado) {
      case 3: return 'Todo pagado';
      case 2: return 'Al corriente';
      case 1: return 'Pago vencido';
      default: return 'Sin pagos';
    }
  }

  onFilterChange() {
    this.page = 1;
    this.loadData();
  }

  togglePagoFilter(pagoId: number) {
    const idx = this.filterPagoIds.indexOf(pagoId);
    if (idx >= 0) {
      this.filterPagoIds.splice(idx, 1);
    } else {
      this.filterPagoIds.push(pagoId);
    }
    this.onFilterChange();
  }

  imputePayment(player: PlayerPaymentRow) {
    this.onImputePayment.emit(player);
  }

  viewHistory(player: PlayerPaymentRow) {
    this.onViewHistory.emit(player);
  }

  editPlayer(player: PlayerPaymentRow) {
    this.onEditPlayer.emit(player);
  }

  chargeSavedCard(player: PlayerPaymentRow) {
    this.onChargeSavedCard.emit(player);
  }
}
