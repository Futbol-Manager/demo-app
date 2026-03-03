// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – InjuryService
// Provides HTTP methods for injury CRUD + document management.
// Connected to backend: /rest/injury/
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  Injury,
  InjuryDocument,
  InjuryEvolutionNote,
  InjuryNoteAttachment,
  InjuryNotificationConfig,
  BODY_ZONES_BASE,
  BODY_ZONES_PRO_EXTRA,
  BodyZone,
  getSuggestedStatus,
  migrateStatus
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
        return Array.isArray(injuries) ? injuries.map((i: any) => this.mapToInjury(i)) : [];
      }),
      catchError(err => throwError(() => err))
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
    const body: any = { rtpPhase: phase, status: getSuggestedStatus(phase) };
    if (phase === 6) {
      body.dateActualReturn = new Date().toISOString().split('T')[0];
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

  uploadDocument(
    injuryId: number,
    file: File,
    description: string,
    uploadedBy: string,
    documentCategory?: string
  ): Observable<InjuryDocument> {
    const fileType: 'pdf' | 'image' | 'other' = file.type.includes('pdf') ? 'pdf'
      : file.type.startsWith('image/') ? 'image' : 'other';

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('description', description || '');
    formData.append('uploadedBy', uploadedBy || '');
    if (documentCategory) formData.append('documentCategory', documentCategory);

    return this.http.post<any>(this.baseUrl + `${injuryId}/documents/upload`, formData).pipe(
      map(response => this.mapToDocument(response?.data)),
      catchError(() => of({
        id: Date.now(),
        injuryId,
        fileName: file.name,
        fileType,
        documentCategory,
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
  // EVOLUTION NOTES
  // ═══════════════════════════════════════════════════════════════

  getEvolutionNotes(injuryId: number): Observable<InjuryEvolutionNote[]> {
    return this.http.get<any>(this.baseUrl + `${injuryId}/notes`).pipe(
      map(response => {
        const notes = response?.data || [];
        return notes.map((n: any) => this.mapToNote(n));
      }),
      catchError(() => of([]))
    );
  }

  createEvolutionNote(injuryId: number, note: Partial<InjuryEvolutionNote>): Observable<InjuryEvolutionNote> {
    return this.http.post<any>(this.baseUrl + `${injuryId}/notes`, note).pipe(
      map(response => this.mapToNote(response?.data)),
      catchError(() => of({ ...note, noteId: Date.now(), injuryId } as InjuryEvolutionNote))
    );
  }

  updateEvolutionNote(noteId: number, changes: Partial<InjuryEvolutionNote>): Observable<InjuryEvolutionNote> {
    return this.http.put<any>(this.baseUrl + `notes/${noteId}`, changes).pipe(
      map(response => this.mapToNote(response?.data)),
      catchError(() => of({ ...changes, noteId } as InjuryEvolutionNote))
    );
  }

  deleteEvolutionNote(noteId: number): Observable<boolean> {
    return this.http.delete<any>(this.baseUrl + `notes/${noteId}`).pipe(
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
      teamId: d.teamId,
      teamName: d.teamName || '',
      clubId: d.clubId,
      zone: d.zone || '',
      zoneLabel: d.zoneLabel || '',
      type: d.type || '',
      severity: d.severity || 'leve',
      description: d.description || '',
      dateInjury: d.dateInjury || '',
      dateReturn: d.dateReturn,
      dateActualReturn: d.dateActualReturn,
      status: migrateStatus(d.status || 'baja'),
      mechanism: d.mechanism,
      treatment: d.treatment,
      notes: d.notes,
      rtpPhase: d.rtpPhase || 1,
      rtpCategory: d.rtpCategory,
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
      documentCategory: d.documentCategory,
      fileUrl: d.fileUrl || '',
      fileSize: d.fileSize || 0,
      uploadedAt: d.uploadedAt || '',
      uploadedBy: d.uploadedBy || '',
      description: d.description || ''
    };
  }

  private mapToNote(n: any): InjuryEvolutionNote {
    return {
      noteId: n.noteId || n.id,
      injuryId: n.injuryId,
      noteDate: n.noteDate || '',
      content: n.content || '',
      rtpPhaseAtTime: n.rtpPhaseAtTime,
      statusAtTime: n.statusAtTime,
      createdByName: n.createdByName || '',
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      attachments: n.attachments || []
    };
  }

  private buildFallbackInjury(injury: Partial<Injury>): Injury {
    return {
      id: Date.now(),
      playerId: injury.playerId || 0,
      playerName: injury.playerName || '',
      teamId: injury.teamId,
      teamName: injury.teamName,
      clubId: injury.clubId,
      zone: injury.zone || '',
      zoneLabel: injury.zoneLabel || '',
      type: injury.type || '',
      severity: (injury.severity as any) || 'leve',
      description: injury.description || '',
      dateInjury: injury.dateInjury || new Date().toISOString().split('T')[0],
      dateReturn: injury.dateReturn,
      dateActualReturn: injury.dateActualReturn,
      status: migrateStatus((injury.status as any) || 'baja'),
      mechanism: injury.mechanism,
      treatment: injury.treatment,
      notes: injury.notes,
      rtpPhase: injury.rtpPhase || 1,
      rtpCategory: injury.rtpCategory,
      createdBy: injury.createdBy || 'Entrenador',
      documents: []
    };
  }
}
