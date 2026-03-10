import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { LoginService } from 'src/app/core/services/login/login.service';
import { PlayerService } from 'src/app/core/services/player/player.service';
import { InjuryService } from 'src/app/core/services/injury/injury.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { User } from 'src/app/core/models/users/user.model';

/**
 * Standalone page for coaches to manage injuries across all players of a team.
 * Route: /dashboard/lesiones/:teamId
 */
@Component({
  selector: 'app-lesiones-equipo',
  template: `
    <div class="lesiones-equipo-page">

      <!-- ===== PAGE HEADER unificado ===== -->
      <div class="page-header">
        <div class="back-container" data-tutorial="les-volver">
          <button class="btn-back-clean" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
        <div class="header-center">
          <h2 class="table-title">
            <i class="bi bi-heart-pulse me-2"></i>{{ soloJugador ? 'Mis Lesiones' : 'Lesiones del Equipo' }}
          </h2>
          <p class="header-subtitle">{{ soloJugador ? 'Historial de tus lesiones' : 'Gestiona las lesiones de todos los jugadores' }}</p>
        </div>
        <div class="page-header-spacer"></div>
      </div>

      <div class="container-fluid px-3 px-md-4">

        <!-- Player selector: solo visible cuando no es vista "solo jugador" -->
        <div class="player-selector-card" *ngIf="!soloJugador" data-tutorial="les-selector-jugador">
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

        <!-- Lesiones component for selected player (embedded=true para no duplicar header) -->
        <div *ngIf="selectedPlayerId > 0" class="mt-3">
          <app-lesiones
            [playerId]="selectedPlayerId"
            [playerName]="selectedPlayerName"
            [teamId]="teamId"
            [embedded]="true"
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

    /* ── PAGE HEADER unificado (igual que partidos-entrevistas) ── */
    .page-header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: nowrap;
      gap: 1rem;
      min-height: 72px;
      padding: 1rem 1.5rem;
      margin-bottom: 1.25rem;
      border-radius: 18px;
      background: linear-gradient(135deg, #002c40 0%, #004d6e 55%, #31b270 100%);
      box-shadow: 0 8px 32px rgba(0,44,64,0.28), 0 2px 8px rgba(49,178,112,0.14);
      overflow: hidden;
      color: #fff;
    }

    .page-header::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
      pointer-events: none;
    }

    .page-header::before {
      content: '';
      position: absolute;
      right: -40px; top: -40px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(49,178,112,0.22) 0%, transparent 68%);
      pointer-events: none;
    }

    .back-container {
      flex-shrink: 0;
      z-index: 1;
    }

    .btn-back-clean {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      margin: 0;
      padding: 0.45rem 0.9rem;
      background: rgba(255,255,255,0.13);
      border: 1px solid rgba(255,255,255,0.24);
      border-radius: 10px;
      color: #ffffff;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.15s ease;
      backdrop-filter: blur(4px);
    }

    .btn-back-clean i { font-size: 1rem; }
    .btn-back-clean:hover { background: rgba(255,255,255,0.22); transform: translateX(-2px); }
    .btn-back-clean:active { transform: translateX(0) scale(0.98); }

    .header-center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      pointer-events: none;
      z-index: 1;
    }

    .table-title {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      letter-spacing: -0.025em;
      white-space: nowrap;
      text-shadow: 0 1px 4px rgba(0,0,0,0.22);
    }

    .header-subtitle {
      margin: 0;
      font-size: 0.78rem;
      color: rgba(255,255,255,0.72);
      text-align: center;
      white-space: nowrap;
    }

    .page-header-spacer {
      flex-shrink: 0;
      min-width: 90px;
      z-index: 1;
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
export class LesionesEquipoComponent implements OnInit, OnDestroy {

  teamId: number = 0;
  players: any[] = [];
  selectedPlayerId: number = 0;
  selectedPlayerName: string = '';
  usuarioActual: User | null = null;
  /** true cuando se entra con ?playerId= (vista solo lesiones del jugador): oculta selector y pasa readOnly a app-lesiones */
  soloJugador: boolean = false;

  // Injury counts per player loaded from backend
  private playerInjuryCounts: Record<number, number> = {};
  private tutorialSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loginService: LoginService,
    private playerService: PlayerService,
    private injuryService: InjuryService,
    private tutorialService: TutorialService
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
    setTimeout(() => this.tutorialService.start('lesiones', true), 600);

    this.tutorialSub = this.tutorialService.getState$().subscribe(state => {
      if (state?.screenId !== 'lesiones') return;
      // Paso 0 = selector de jugador; paso 1 = bienvenida. Auto-seleccionar primer jugador al pasar al paso 1 si aún no hay ninguno seleccionado.
      if (state.currentIndex === 1 && this.players.length > 0 && this.selectedPlayerId === 0) {
        this.selectPlayer(this.players[0]);
      }
    });
  }

  ngOnDestroy(): void {
    this.tutorialSub?.unsubscribe();
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

          if (this.players.length > 0) {
            const state = this.tutorialService.getState();
            if (state?.screenId === 'lesiones' && state.currentIndex === 1 && this.selectedPlayerId === 0) {
              this.selectPlayer(this.players[0]);
            }
          }

          // Load real injury counts from backend for the whole team
          this.injuryService.getInjuriesByTeam(this.teamId).subscribe(injuries => {
            this.playerInjuryCounts = {};
            injuries.forEach(inj => {
              if (inj.status !== 'alta') {
                this.playerInjuryCounts[inj.playerId] = (this.playerInjuryCounts[inj.playerId] || 0) + 1;
              }
            });
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
