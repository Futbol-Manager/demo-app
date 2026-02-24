import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { TeamService } from 'src/app/core/services/team/team.service';

interface SphairaPayPlayer {
  playerId: number;
  playerName: string;
  teamName: string;
  tieneTarjeta: boolean;
  cardLast4: string | null;
  cardBrand: string | null;
  cobrado: boolean;
  ultimoPago: string | null;
  facturaId: string | null;
  receiptUrl: string | null;
  importe: string | null;
}

interface SphairaPayCuota {
  pagoClubId: number;
  titulo: string;
  descripcion: string;
  importe: string;
  importeTotal: string | null;
  comisionClub: number | null;
  fechaCobro: string | null;
  tipoCobro: number;
  totalJugadores: number;
  conTarjeta: number;
  sinTarjeta: number;
  cobrados: number;
  players: SphairaPayPlayer[];
  // UI state
  expanded: boolean;
  searchQuery: string;
  statusFilter: 'all' | 'conTarjeta' | 'sinTarjeta' | 'cobrado';
}

@Component({
  selector: 'app-automatic-payments',
  templateUrl: './automatic-payments.component.html',
  styleUrls: ['./automatic-payments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomaticPaymentsComponent implements OnChanges {
  @Input() clubId!: number;
  @Input() temporada!: string;
  @Input() visible = false;

  cuotas: SphairaPayCuota[] = [];
  isLoading = false;
  hasError = false;


  constructor(
    private teamService: TeamService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.clubId) {
      this.load();
    }
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;
    this.cuotas = [];
    this.cd.markForCheck();

    const temporada = this.temporada || new Date().getFullYear().toString();

    this.teamService.getSphairaPayScheduled(this.clubId, temporada).subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res?.data) ? res.data : [];
        this.cuotas = raw.map((c) => ({
          ...c,
          expanded: false,
          statusFilter: 'all' as const,
          searchQuery: '',
        }));
        this.isLoading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
        this.cd.markForCheck();
      },
    });
  }

  filteredPlayers(cuota: SphairaPayCuota): SphairaPayPlayer[] {
    return cuota.players.filter((p) => {
      const matchStatus = this.matchesStatus(p, cuota.statusFilter);
      const q = cuota.searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.playerName ?? '').toLowerCase().includes(q) ||
        (p.teamName ?? '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }

  private matchesStatus(p: SphairaPayPlayer, filter: string): boolean {
    if (filter === 'all') return true;
    if (filter === 'conTarjeta') return p.tieneTarjeta && !p.cobrado;
    if (filter === 'sinTarjeta') return !p.tieneTarjeta;
    if (filter === 'cobrado') return p.cobrado;
    return true;
  }

  formatDate(dt: string | null): string {
    if (!dt) return '—';
    // Soporta "yyyy-MM-dd" y "yyyy-MM-dd HH:mm:ss"
    const normalized = dt.replace(' ', 'T');
    const d = new Date(normalized);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(dt: string | null): { date: string; time: string } | null {
    if (!dt) return null;
    const normalized = dt.replace(' ', 'T');
    const d = new Date(normalized);
    return {
      date: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  /** Devuelve "***876" a partir de last4 = "3876" */
  maskCard(last4: string | null): string {
    if (!last4) return '—';
    return '•••' + last4.slice(-3);
  }


  get totalConTarjeta(): number {
    return this.cuotas.reduce((s, c) => s + c.conTarjeta, 0);
  }
  get totalSinTarjeta(): number {
    return this.cuotas.reduce((s, c) => s + c.sinTarjeta, 0);
  }
  get totalCobrados(): number {
    return this.cuotas.reduce((s, c) => s + c.cobrados, 0);
  }
  get totalJugadores(): number {
    return this.cuotas.reduce((s, c) => s + c.totalJugadores, 0);
  }

  trackByCuota(_: number, c: SphairaPayCuota) { return c.pagoClubId; }
  trackByPlayer(_: number, p: SphairaPayPlayer) { return p.playerId; }
}
