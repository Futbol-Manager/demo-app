// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – InjuryService
// Provides HTTP methods for injury CRUD + document management.
// Connected to backend: /rest/injury/
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  Injury,
  InjuryDocument,
  InjuryNotificationConfig,
  BODY_ZONES_BASE,
  BODY_ZONES_PRO_EXTRA,
  BodyZone
} from './injury.model';

@Injectable({
  providedIn: 'root'
})
export class InjuryService {

  private baseUrl = environment.apiUrl + 'injury/';

  private _notificationConfig = new BehaviorSubject<InjuryNotificationConfig>(
    this.loadNotificationConfig()
  );
  notificationConfig$ = this._notificationConfig.asObservable();

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════════════════
  // GET INJURIES
  // ═══════════════════════════════════════════════════════════════

  getInjuriesByPlayer(playerId: number, playerName: string = ''): Observable<Injury[]> {
    return this.http.get<any>(this.baseUrl + `player/${playerId}`).pipe(
      map(response => {
        const injuries = response?.data || [];
        return injuries.map((i: any) => this.mapToInjury(i));
      }),
      catchError(() => of([]))
    );
  }

  getInjuriesByTeam(teamId: number): Observable<Injury[]> {
    return this.http.get<any>(this.baseUrl + `team/${teamId}`).pipe(
      map(response => {
        const injuries = response?.data || [];
        return injuries.map((i: any) => this.mapToInjury(i));
      }),
      catchError(() => of([]))
    );
  }

  getInjuriesByClub(clubId: number): Observable<Injury[]> {
    return this.http.get<any>(this.baseUrl + `club/${clubId}`).pipe(
      map(response => {
        const injuries = response?.data || [];
        return injuries.map((i: any) => this.mapToInjury(i));
      }),
      catchError(() => of([]))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CREATE / UPDATE / DELETE
  // ═══════════════════════════════════════════════════════════════

  createInjury(injury: Partial<Injury>): Observable<Injury> {
    return this.http.post<any>(this.baseUrl, injury).pipe(
      map(response => this.mapToInjury(response?.data)),
      catchError(() => of(this.buildFallbackInjury(injury)))
    );
  }

  updateInjury(injuryId: number, changes: Partial<Injury>): Observable<Injury> {
    return this.http.put<any>(this.baseUrl + injuryId, changes).pipe(
      map(response => this.mapToInjury(response?.data)),
      catchError(() => of({ ...changes, id: injuryId } as Injury))
    );
  }

  deleteInjury(injuryId: number): Observable<boolean> {
    return this.http.delete<any>(this.baseUrl + injuryId).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RTP (Return To Play) PHASE UPDATE
  // ═══════════════════════════════════════════════════════════════

  updateRtpPhase(injuryId: number, phase: number): Observable<any> {
    const body: any = { rtpPhase: phase };
    if (phase === 6) {
      body.status = 'cerrada';
      body.dateActualReturn = new Date().toISOString().split('T')[0];
    } else if (phase >= 1) {
      body.status = 'recuperacion';
    }
    return this.http.put<any>(this.baseUrl + `${injuryId}/rtp`, body).pipe(
      map(response => response?.data || body),
      catchError(() => of(body))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MEDICAL DOCUMENTS
  // ═══════════════════════════════════════════════════════════════

  getDocuments(injuryId: number): Observable<InjuryDocument[]> {
    return this.http.get<any>(this.baseUrl + `${injuryId}/documents`).pipe(
      map(response => {
        const docs = response?.data || [];
        return docs.map((d: any) => this.mapToDocument(d));
      }),
      catchError(() => of([]))
    );
  }

  uploadDocument(injuryId: number, file: File, description: string, uploadedBy: string): Observable<InjuryDocument> {
    const fileType: 'pdf' | 'image' | 'other' = file.type.includes('pdf') ? 'pdf'
      : file.type.startsWith('image/') ? 'image' : 'other';

    const body = {
      fileName: file.name,
      fileType,
      fileUrl: '',
      fileSize: file.size,
      uploadedBy,
      description
    };

    return this.http.post<any>(this.baseUrl + `${injuryId}/documents`, body).pipe(
      map(response => this.mapToDocument(response?.data)),
      catchError(() => of({
        id: Date.now(),
        injuryId,
        fileName: file.name,
        fileType,
        fileUrl: URL.createObjectURL(file),
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
        description
      }))
    );
  }

  deleteDocument(injuryId: number, documentId: number): Observable<boolean> {
    return this.http.delete<any>(this.baseUrl + `${injuryId}/documents/${documentId}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════

  sendNotification(payload: {
    injuryId: number;
    playerId: number;
    teamId: number;
    type: 'created' | 'updated' | 'rtp_change' | 'status_change';
    message: string;
  }): Observable<boolean> {
    // TODO: Connect to backend notification endpoint when available
    return of(true);
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION CONFIG (local storage — no backend needed)
  // ═══════════════════════════════════════════════════════════════

  getNotificationConfig(): InjuryNotificationConfig {
    return this._notificationConfig.value;
  }

  setNotificationConfig(config: InjuryNotificationConfig): void {
    localStorage.setItem('sphaira_injury_notification_config', JSON.stringify(config));
    this._notificationConfig.next(config);
  }

  private loadNotificationConfig(): InjuryNotificationConfig {
    try {
      const stored = localStorage.getItem('sphaira_injury_notification_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      autoNotify: false,
      notifyOnCreate: true,
      notifyOnStatusChange: true,
      notifyOnRtpChange: true
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BODY ZONES HELPER
  // ═══════════════════════════════════════════════════════════════

  getBodyZones(isPro: boolean): BodyZone[] {
    return isPro
      ? [...BODY_ZONES_BASE, ...BODY_ZONES_PRO_EXTRA]
      : [...BODY_ZONES_BASE];
  }

  findZone(zoneId: string, isPro: boolean): BodyZone | undefined {
    return this.getBodyZones(isPro).find(z => z.id === zoneId);
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPERS (backend entity -> frontend model)
  // ═══════════════════════════════════════════════════════════════

  private mapToInjury(d: any): Injury {
    return {
      id: d.injuryId || d.id,
      playerId: d.playerId,
      playerName: d.playerName || '',
      zone: d.zone || '',
      zoneLabel: d.zoneLabel || '',
      type: d.type || '',
      severity: d.severity || 'leve',
      description: d.description || '',
      dateInjury: d.dateInjury || '',
      dateReturn: d.dateReturn,
      dateActualReturn: d.dateActualReturn,
      status: d.status || 'activa',
      mechanism: d.mechanism,
      treatment: d.treatment,
      notes: d.notes,
      rtpPhase: d.rtpPhase || 1,
      createdBy: d.createdBy || '',
      documents: []
    };
  }

  private mapToDocument(d: any): InjuryDocument {
    return {
      id: d.documentId || d.id,
      injuryId: d.injuryId,
      fileName: d.fileName || '',
      fileType: d.fileType || 'other',
      fileUrl: d.fileUrl || '',
      fileSize: d.fileSize || 0,
      uploadedAt: d.uploadedAt || '',
      uploadedBy: d.uploadedBy || '',
      description: d.description || ''
    };
  }

  private buildFallbackInjury(injury: Partial<Injury>): Injury {
    return {
      id: Date.now(),
      playerId: injury.playerId || 0,
      playerName: injury.playerName || '',
      zone: injury.zone || '',
      zoneLabel: injury.zoneLabel || '',
      type: injury.type || '',
      severity: (injury.severity as any) || 'leve',
      description: injury.description || '',
      dateInjury: injury.dateInjury || new Date().toISOString().split('T')[0],
      dateReturn: injury.dateReturn,
      dateActualReturn: injury.dateActualReturn,
      status: (injury.status as any) || 'activa',
      mechanism: injury.mechanism,
      treatment: injury.treatment,
      notes: injury.notes,
      rtpPhase: injury.rtpPhase || 1,
      createdBy: injury.createdBy || 'Entrenador',
      documents: []
    };
  }
}
