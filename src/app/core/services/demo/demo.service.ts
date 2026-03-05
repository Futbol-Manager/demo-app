import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export type DemoRole = 'club' | 'coach' | 'player';

const KEY_DEMO_ROLE = 'demoRole';
const KEY_CLUB_ID = 'clubId';
const KEY_TEAM_ID = 'it_lastTeamId';
const KEY_PLAYER_ID = 'demoPlayerId';

/** True si la app se carga desde el dominio de demo (ej. demo.sphairatech.com) */
function isDemoHostname(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h === 'demo.sphairatech.com' || h.startsWith('demo.');
}

/** IDs fijos para datos demo (coinciden con DemoDataService) */
export const DEMO_IDS = {
  clubId: 9001,
  teamId: 9001,
  playerId: 8001,
} as const;

@Injectable({
  providedIn: 'root',
})
export class DemoService {

  /** Modo demo: por build (environment.demo) o por URL (demo.sphairatech.com / demo.*) */
  isDemoMode(): boolean {
    return !!(environment as { demo?: boolean }).demo || isDemoHostname();
  }

  getDemoRole(): DemoRole | null {
    if (!this.isDemoMode()) return null;
    const r = sessionStorage.getItem(KEY_DEMO_ROLE);
    if (r === 'club' || r === 'coach' || r === 'player') return r;
    return null;
  }

  setDemoRole(role: DemoRole): void {
    sessionStorage.setItem(KEY_DEMO_ROLE, role);
    sessionStorage.setItem(KEY_CLUB_ID, String(DEMO_IDS.clubId));
    sessionStorage.setItem(KEY_TEAM_ID, String(DEMO_IDS.teamId));
    sessionStorage.setItem(KEY_PLAYER_ID, String(DEMO_IDS.playerId));
  }

  clearDemoRole(): void {
    sessionStorage.removeItem(KEY_DEMO_ROLE);
    sessionStorage.removeItem(KEY_CLUB_ID);
    sessionStorage.removeItem(KEY_PLAYER_ID);
  }

  getDemoProfileId(): 1 | 2 | 3 {
    const r = this.getDemoRole();
    if (r === 'club') return 1;
    if (r === 'coach') return 2;
    if (r === 'player') return 3;
    return 2;
  }
}
