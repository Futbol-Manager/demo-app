import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export interface TacticalPlayer {
  id: string;
  number: number;
  name: string;
  x: number;
  y: number;
  color: string;
  isOpponent: boolean;
}

export interface TacticalArrow {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  style: 'solid' | 'dashed';
}

export interface TacticalNote {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface TacticalPlay {
  id?: number;
  teamId: number;
  name: string;
  sport: string;
  formation?: string;
  players: TacticalPlayer[];
  arrows: TacticalArrow[];
  notes: TacticalNote[];
  bgImage?: string;
  createdAt?: string;
}

const DEMO_PLAYS_KEY = 'sphaira_demo_tactical_plays';

@Injectable({ providedIn: 'root' })
export class TacticalBoardService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPlays(teamId: number): Observable<TacticalPlay[]> {
    if (isDemoMode()) {
      return of(this.loadDemoPlays(teamId));
    }
    return this.http
      .get<TacticalPlay[]>(`${this.api}tactical/plays/${teamId}`)
      .pipe(catchError(() => of([])));
  }

  savePlay(play: TacticalPlay): Observable<TacticalPlay> {
    if (isDemoMode()) {
      const saved = { ...play, id: play.id ?? Date.now() };
      this.saveDemoPlay(saved);
      return of(saved);
    }
    return play.id
      ? this.http.put<TacticalPlay>(`${this.api}tactical/plays/${play.id}`, play)
      : this.http.post<TacticalPlay>(`${this.api}tactical/plays`, play);
  }

  deletePlay(id: number): Observable<void> {
    if (isDemoMode()) {
      this.deleteDemoPlay(id);
      return of(undefined);
    }
    return this.http.delete<void>(`${this.api}tactical/plays/${id}`);
  }

  generateDefaultFormation(formation: string, sport: string): TacticalPlayer[] {
    const specialFormations: Record<string, TacticalPlayer[]> = {
      'bas-2-3': this.buildBasketFormation([2, 3]),
      'bas-3-2': this.buildBasketFormation([3, 2]),
      'bas-1-3-1': this.buildBasketFormation([1, 3, 1]),
      'bas-2-1-2': this.buildBasketFormation([2, 1, 2]),
      'vol-5-1': this.buildVolleyFormation([5, 1]),
      'vol-6-2': this.buildVolleyFormation([6, 2]),
      'vol-4-2': this.buildVolleyFormation([4, 2]),
      'bm-6-0': this.buildHandballFormation([6, 0]),
      'bm-5-1': this.buildHandballFormation([5, 1]),
      'bm-4-2': this.buildHandballFormation([4, 2]),
      'bm-3-3': this.buildHandballFormation([3, 3]),
      'fs-2-2': this.buildFutsalFormation([2, 2]),
      'fs-3-1': this.buildFutsalFormation([3, 1]),
      'fs-1-2-1': this.buildFutsalFormation([1, 2, 1]),
      'wp-3-3': this.buildBaseFormation([3, 3], true),
      'wp-2-4': this.buildBaseFormation([2, 4], true),
      'wp-4-2': this.buildBaseFormation([4, 2], true),
    };

    if (specialFormations[formation]) {
      return specialFormations[formation];
    }

    const parts = formation.split('-').map(Number).filter(n => !isNaN(n));
    if (!parts.length) {
      return this.buildBaseFormation([4, 3, 3], true);
    }

    const players: TacticalPlayer[] = [];
    players.push({ id: 'p0', number: 1, name: 'J1', x: 50, y: 90, color: '#f59e0b', isOpponent: false });

    let idx = 1;
    let yPos = 75;
    const yStep = Math.floor(60 / parts.length);

    for (const count of parts) {
      const step = 100 / (count + 1);
      for (let i = 1; i <= count; i++) {
        players.push({
          id: `p${idx}`,
          number: idx + 1,
          name: `J${idx + 1}`,
          x: Math.round(step * i),
          y: yPos,
          color: '#3b82f6',
          isOpponent: false,
        });
        idx++;
      }
      yPos -= yStep;
    }

    return players;
  }

  private buildBaseFormation(lines: number[], hasGoalkeeper: boolean): TacticalPlayer[] {
    const players: TacticalPlayer[] = [];
    let idx = 0;

    if (hasGoalkeeper) {
      players.push({ id: 'p0', number: 1, name: 'J1', x: 50, y: 90, color: '#f59e0b', isOpponent: false });
      idx = 1;
    }

    let yPos = hasGoalkeeper ? 75 : 85;
    const yStep = Math.floor(65 / lines.length);

    for (const count of lines) {
      const step = 100 / (count + 1);
      for (let i = 1; i <= count; i++) {
        players.push({
          id: `p${idx}`,
          number: idx + 1,
          name: `J${idx + 1}`,
          x: Math.round(step * i),
          y: yPos,
          color: '#3b82f6',
          isOpponent: false,
        });
        idx++;
      }
      yPos -= yStep;
    }

    return players;
  }

  private buildBasketFormation(lines: number[]): TacticalPlayer[] {
    return this.buildBaseFormation(lines, false);
  }

  private buildVolleyFormation(lines: number[]): TacticalPlayer[] {
    return this.buildBaseFormation(lines, false);
  }

  private buildHandballFormation(lines: number[]): TacticalPlayer[] {
    const players: TacticalPlayer[] = [];
    players.push({ id: 'p0', number: 1, name: 'J1', x: 50, y: 92, color: '#f59e0b', isOpponent: false });
    let idx = 1;
    let yPos = 75;
    const yStep = 20;
    for (const count of lines) {
      if (count === 0) { yPos -= yStep; continue; }
      const step = 100 / (count + 1);
      for (let i = 1; i <= count; i++) {
        players.push({
          id: `p${idx}`, number: idx + 1, name: `J${idx + 1}`,
          x: Math.round(step * i), y: yPos, color: '#3b82f6', isOpponent: false,
        });
        idx++;
      }
      yPos -= yStep;
    }
    return players;
  }

  private buildFutsalFormation(lines: number[]): TacticalPlayer[] {
    const players: TacticalPlayer[] = [];
    players.push({ id: 'p0', number: 1, name: 'J1', x: 50, y: 88, color: '#f59e0b', isOpponent: false });
    let idx = 1;
    let yPos = 70;
    const yStep = 22;
    for (const count of lines) {
      const step = 100 / (count + 1);
      for (let i = 1; i <= count; i++) {
        players.push({
          id: `p${idx}`, number: idx + 1, name: `J${idx + 1}`,
          x: Math.round(step * i), y: yPos, color: '#3b82f6', isOpponent: false,
        });
        idx++;
      }
      yPos -= yStep;
    }
    return players;
  }

  private loadDemoPlays(teamId: number): TacticalPlay[] {
    try {
      const raw = localStorage.getItem(DEMO_PLAYS_KEY);
      if (!raw) return [];
      const all: TacticalPlay[] = JSON.parse(raw);
      return all.filter(p => p.teamId === teamId);
    } catch {
      return [];
    }
  }

  private saveDemoPlay(play: TacticalPlay): void {
    try {
      const raw = localStorage.getItem(DEMO_PLAYS_KEY);
      const all: TacticalPlay[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex(p => p.id === play.id);
      if (idx >= 0) {
        all[idx] = play;
      } else {
        all.push(play);
      }
      localStorage.setItem(DEMO_PLAYS_KEY, JSON.stringify(all));
    } catch { /* ignore */ }
  }

  private deleteDemoPlay(id: number): void {
    try {
      const raw = localStorage.getItem(DEMO_PLAYS_KEY);
      if (!raw) return;
      const all: TacticalPlay[] = JSON.parse(raw);
      localStorage.setItem(DEMO_PLAYS_KEY, JSON.stringify(all.filter(p => p.id !== id)));
    } catch { /* ignore */ }
  }
}
