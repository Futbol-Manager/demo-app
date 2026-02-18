import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { User } from 'src/app/core/models/users/user.model';

/**
 * Standalone page for coaches to manage injuries across all players of a team.
 * Route: /dashboard/lesiones/:teamId
 */
@Component({
  selector: 'app-lesiones-equipo',
  template: `
    <div class="lesiones-equipo-page">
      <!-- Back button -->
      <div class="back-container">
        <button class="btn-back-clean" (click)="goBack()">
          <i class="bi bi-arrow-left"></i>
          <span>Volver</span>
        </button>
      </div>

      <div class="container-fluid px-3 px-md-4">
        <!-- Page header -->
        <div class="lesiones-equipo-header">
          <div class="lesiones-equipo-header-content">
            <div>
              <h2 class="lesiones-equipo-title"><i class="bi bi-heart-pulse me-2"></i>{{ soloJugador ? 'Mis lesiones' : 'Lesiones del Equipo' }}</h2>
              <p class="lesiones-equipo-subtitle">{{ soloJugador ? 'Historial de tus lesiones' : 'Gestiona las lesiones de todos los jugadores' }}</p>
            </div>
          </div>
        </div>

        <!-- Player selector: solo visible cuando no es vista "solo jugador" -->
        <div class="player-selector-card" *ngIf="!soloJugador">
          <label class="selector-label">Selecciona un jugador:</label>
          <div class="player-chips">
            <button *ngFor="let p of players" class="player-chip"
                    [class.active]="selectedPlayerId === p.playerId"
                    (click)="selectPlayer(p)">
              <i class="bi bi-person-fill me-1"></i>
              {{ p.nombre }} {{ p.apellido }}
              <span class="chip-injury-badge" *ngIf="getPlayerInjuryCount(p.playerId) > 0">
                {{ getPlayerInjuryCount(p.playerId) }}
              </span>
            </button>
          </div>
        </div>

        <!-- Lesiones component for selected player -->
        <div *ngIf="selectedPlayerId > 0" class="mt-3">
          <app-lesiones
            [playerId]="selectedPlayerId"
            [playerName]="selectedPlayerName"
            [teamId]="teamId"
            [embedded]="false"
            [readOnly]="soloJugador || ((usuarioActual?.profileType?.profileId ?? 0) >= 3 && (usuarioActual?.profileType?.profileId ?? 0) < 6)">
          </app-lesiones>
        </div>

        <div *ngIf="selectedPlayerId === 0 && !soloJugador" class="empty-state-select">
          <i class="bi bi-person-check display-4 opacity-50"></i>
          <p>Selecciona un jugador para gestionar sus lesiones</p>
        </div>
        <div *ngIf="selectedPlayerId === 0 && soloJugador" class="empty-state-select">
          <i class="bi bi-heart-pulse display-4 opacity-50"></i>
          <p>Cargando tus lesiones...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lesiones-equipo-page {
      font-family: 'Archivo', sans-serif;
    }

    .back-container {
      padding: 0.75rem 1.25rem;
    }

    .btn-back-clean {
      margin-left: 16px;
      margin-top: 10px;
      padding: 0.35rem 0.6rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background-color: rgba(0, 44, 64, 0.08);
      border: none;
      border-radius: 8px;
      color: #002c40;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .btn-back-clean i { font-size: 1.1rem; }
    .btn-back-clean:hover {
      background-color: rgba(0, 44, 64, 0.14);
      transform: translateX(-2px);
    }

    .lesiones-equipo-header {
      background: linear-gradient(135deg, #002c40 0%, #1f8f8a 100%);
      border-radius: 16px;
      padding: 1.5rem 2rem;
      margin-bottom: 1.25rem;
      color: #fff;
    }

    .lesiones-equipo-title {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0;
    }

    .lesiones-equipo-subtitle {
      font-size: 0.9rem;
      opacity: 0.8;
      margin: 0.25rem 0 0;
    }

    .player-selector-card {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.07);
      padding: 1rem 1.25rem;
    }

    .selector-label {
      font-size: 0.88rem;
      font-weight: 600;
      color: #002c40;
      margin-bottom: 0.5rem;
      display: block;
    }

    .player-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .player-chip {
      padding: 0.4rem 0.9rem;
      border: 1.5px solid #d0dbe5;
      border-radius: 20px;
      background: transparent;
      font-size: 0.82rem;
      font-weight: 600;
      color: #6c757d;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;

      &:hover {
        border-color: #1f8f8a;
        color: #1f8f8a;
      }

      &.active {
        background: #002c40;
        border-color: #002c40;
        color: #fff;
      }
    }

    .chip-injury-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      background: #dc3545;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      margin-left: 0.35rem;
    }

    .empty-state-select {
      text-align: center;
      padding: 3rem 1rem;
      color: #6c757d;

      p {
        margin-top: 1rem;
        font-size: 0.95rem;
      }
    }
  `]
})
export class LesionesEquipoComponent implements OnInit {

  teamId: number = 0;
  players: any[] = [];
  selectedPlayerId: number = 0;
  selectedPlayerName: string = '';
  usuarioActual: User | null = null;
  /** true cuando se entra con ?playerId= (vista solo lesiones del jugador): oculta selector y pasa readOnly a app-lesiones */
  soloJugador: boolean = false;

  // Hardcoded injury counts per player (mock)
  private playerInjuryCounts: Record<number, number> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private playerService: PlayerService
  ) {}

  ngOnInit(): void {
    const queryPlayerId = this.route.snapshot.queryParamMap.get('playerId');
    this.soloJugador = !!(queryPlayerId && queryPlayerId !== '');

    this.loginService.usuarioActual.subscribe(user => {
      this.usuarioActual = user;
    });

    this.route.params.subscribe(params => {
      this.teamId = +params['teamId'] || 0;
      if (this.teamId) {
        this.loadPlayers();
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  loadPlayers(): void {
    this.playerService.getPlayers(String(this.teamId)).subscribe(
      (response) => {
        if (response?.data) {
          const data = response.data as any;
          let list = data.players;
          if (!Array.isArray(list) && Array.isArray(data)) list = data;
          this.players = Array.isArray(list) ? list : [];

          // Hardcoded: assign mock injury counts to first few players
          this.players.forEach((p, idx) => {
            if (idx === 0) this.playerInjuryCounts[p.playerId] = 2;
            else if (idx === 1) this.playerInjuryCounts[p.playerId] = 1;
            else this.playerInjuryCounts[p.playerId] = 0;
          });

          const queryPlayerId = this.route.snapshot.queryParamMap.get('playerId');
          if (queryPlayerId) {
            const pid = +queryPlayerId;
            const player = this.players.find((p: any) => p.playerId === pid);
            if (player) {
              this.selectPlayer(player);
            }
          }
        }
      },
      () => {
        this.players = [];
      }
    );
  }

  selectPlayer(player: any): void {
    this.selectedPlayerId = player.playerId;
    this.selectedPlayerName = (player.nombre || '') + ' ' + (player.apellido || '');
  }

  getPlayerInjuryCount(playerId: number): number {
    return this.playerInjuryCounts[playerId] || 0;
  }
}
