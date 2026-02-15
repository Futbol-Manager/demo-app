// ═══════════════════════════════════════════════════════════════════
// SPHAIRA – InjuryService
// Provides HTTP methods for injury CRUD + document management.
// Currently uses hardcoded fallback data while backend is not ready.
//
// BACKEND DEVELOPER: Each method documents the expected endpoint.
// When backend is ready, remove the hardcoded fallback blocks and
// uncomment / enable the HTTP calls.
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  Injury,
  InjuryDocument,
  InjuryNotificationConfig,
  BODY_ZONES_BASE,
  BODY_ZONES_PRO_EXTRA,
  BodyZone
} from './injury.model';

// ─── Hardcoded mock injuries (used while backend is not available) ──
const HARDCODED_INJURIES: Injury[] = [
  {
    id: 1, playerId: 0, playerName: '', zone: 'hamstring_r', zoneLabel: 'Isquiotibiales Der.',
    type: 'Muscular', severity: 'moderada',
    description: 'Rotura fibrilar grado II en isquiotibiales derechos durante el entrenamiento.',
    dateInjury: '2026-01-15', dateReturn: '2026-02-28', status: 'recuperacion',
    mechanism: 'Sprint en entrenamiento', treatment: 'Fisioterapia + fortalecimiento excéntrico',
    notes: 'Evolución favorable. Inicia carrera continua en semana 4.', rtpPhase: 4,
    createdBy: 'Entrenador', documents: []
  },
  {
    id: 2, playerId: 0, playerName: '', zone: 'ankle_l', zoneLabel: 'Tobillo Izq.',
    type: 'Ligamentosa', severity: 'leve',
    description: 'Esguince de tobillo izquierdo grado I. Ligamento peroneo-astragalino anterior.',
    dateInjury: '2026-02-01', dateReturn: '2026-02-15', dateActualReturn: '2026-02-14', status: 'cerrada',
    mechanism: 'Mal apoyo al aterrizar', treatment: 'RICE + vendaje funcional',
    notes: 'Recuperación completa.', rtpPhase: 6,
    createdBy: 'Entrenador', documents: []
  },
  {
    id: 3, playerId: 0, playerName: '', zone: 'knee_r', zoneLabel: 'Rodilla Der.',
    type: 'Articular', severity: 'grave',
    description: 'Rotura parcial de LCA en rodilla derecha.',
    dateInjury: '2025-09-10', dateReturn: '2026-03-10', dateActualReturn: '2026-03-05', status: 'cerrada',
    mechanism: 'Giro brusco en partido', treatment: 'Cirugía artroscópica + rehabilitación 6 meses',
    notes: 'Alta médica confirmada. Reintegración progresiva al grupo.', rtpPhase: 6,
    createdBy: 'Entrenador', documents: []
  }
];

@Injectable({
  providedIn: 'root'
})
export class InjuryService {

  /** Base URL for injury endpoints */
  // Backend endpoint base: POST/GET/PUT/DELETE {apiUrl}injury/
  private baseUrl = environment.apiUrl + 'injury/';

  /** Notification preferences (persisted in localStorage) */
  private _notificationConfig = new BehaviorSubject<InjuryNotificationConfig>(
    this.loadNotificationConfig()
  );
  notificationConfig$ = this._notificationConfig.asObservable();

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════════════════
  // AUTH HEADERS
  // ═══════════════════════════════════════════════════════════════

  private getHeaders(): HttpHeaders | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // ═══════════════════════════════════════════════════════════════
  // GET INJURIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all injuries for a specific player.
   * Backend endpoint: GET {apiUrl}injury/player/{playerId}
   *
   * @param playerId - The player's ID
   * @param playerName - The player's name (used for hardcoded fallback)
   * @returns Observable<Injury[]>
   */
  getInjuriesByPlayer(playerId: number, playerName: string = ''): Observable<Injury[]> {
    // ──── HARDCODED FALLBACK (remove when backend is ready) ────
    const mockInjuries = HARDCODED_INJURIES.map(i => ({
      ...i,
      playerId,
      playerName
    }));
    return of(mockInjuries).pipe(delay(300));

    // ──── REAL HTTP CALL (uncomment when backend is ready) ────
    // const headers = this.getHeaders();
    // if (!headers) return of([]);
    // return this.http.get<any>(this.baseUrl + `player/${playerId}`, { headers }).pipe(
    //   map(response => response?.data?.injuries || []),
    //   catchError(() => of([]))
    // );
  }

  /**
   * Get all injuries for a specific team (all players).
   * Backend endpoint: GET {apiUrl}injury/team/{teamId}
   *
   * @param teamId - The team's ID
   * @returns Observable<Injury[]>
   */
  getInjuriesByTeam(teamId: number): Observable<Injury[]> {
    // ──── HARDCODED FALLBACK ────
    const teamInjuries = HARDCODED_INJURIES.map((inj, idx) => ({
      ...inj,
      playerId: 100 + idx,
      playerName: `Jugador ${idx + 1}`
    }));
    return of(teamInjuries).pipe(delay(300));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of([]);
    // return this.http.get<any>(this.baseUrl + `team/${teamId}`, { headers }).pipe(
    //   map(response => response?.data?.injuries || []),
    //   catchError(() => of([]))
    // );
  }

  /**
   * Get all injuries for a specific club (all teams, all players).
   * Backend endpoint: GET {apiUrl}injury/club/{clubId}
   *
   * @param clubId - The club's ID
   * @returns Observable<Injury[]>
   */
  getInjuriesByClub(clubId: number): Observable<Injury[]> {
    // ──── HARDCODED FALLBACK ────
    const clubInjuries: Injury[] = [
      {
        id: 1, playerId: 101, playerName: 'Carlos García', zone: 'hamstring_r', zoneLabel: 'Isquiotibiales Der.',
        type: 'Muscular', severity: 'moderada',
        description: 'Rotura fibrilar grado II en isquiotibiales derechos.',
        dateInjury: '2026-01-15', dateReturn: '2026-02-28', status: 'recuperacion',
        mechanism: 'Sprint en entrenamiento', treatment: 'Fisioterapia + fortalecimiento excéntrico',
        notes: 'Evolución favorable.', rtpPhase: 4, createdBy: 'Entrenador', documents: []
      },
      {
        id: 2, playerId: 102, playerName: 'Miguel López', zone: 'ankle_l', zoneLabel: 'Tobillo Izq.',
        type: 'Ligamentosa', severity: 'leve',
        description: 'Esguince de tobillo izquierdo grado I.',
        dateInjury: '2026-02-01', dateReturn: '2026-02-15', dateActualReturn: '2026-02-14', status: 'cerrada',
        mechanism: 'Mal apoyo', treatment: 'RICE + vendaje funcional',
        notes: 'Recuperación completa.', rtpPhase: 6, createdBy: 'Entrenador', documents: []
      },
      {
        id: 3, playerId: 103, playerName: 'Alejandro Ruiz', zone: 'knee_r', zoneLabel: 'Rodilla Der.',
        type: 'Articular', severity: 'grave',
        description: 'Rotura parcial de LCA en rodilla derecha.',
        dateInjury: '2025-09-10', dateReturn: '2026-03-10', dateActualReturn: '2026-03-05', status: 'cerrada',
        mechanism: 'Giro brusco en partido', treatment: 'Cirugía artroscópica + rehabilitación',
        notes: 'Alta médica confirmada.', rtpPhase: 6, createdBy: 'Entrenador', documents: []
      },
      {
        id: 4, playerId: 104, playerName: 'David Martín', zone: 'quad_r', zoneLabel: 'Muslo Der.',
        type: 'Muscular', severity: 'leve',
        description: 'Sobrecarga muscular en cuádriceps derecho.',
        dateInjury: '2026-02-20', dateReturn: '2026-03-01', status: 'activa',
        mechanism: 'Acumulación de carga', treatment: 'Descanso + crioterapia',
        notes: '', rtpPhase: 2, createdBy: 'Entrenador', documents: []
      },
      {
        id: 5, playerId: 105, playerName: 'Pablo Sánchez', zone: 'shoulder_r', zoneLabel: 'Hombro Der.',
        type: 'Articular', severity: 'moderada',
        description: 'Luxación parcial de hombro derecho en caída.',
        dateInjury: '2026-01-28', dateReturn: '2026-03-15', status: 'recuperacion',
        mechanism: 'Caída en partido', treatment: 'Inmovilización + rehabilitación',
        notes: 'Evolución normal.', rtpPhase: 3, createdBy: 'Entrenador', documents: []
      }
    ];
    return of(clubInjuries).pipe(delay(400));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of([]);
    // return this.http.get<any>(this.baseUrl + `club/${clubId}`, { headers }).pipe(
    //   map(response => response?.data?.injuries || []),
    //   catchError(() => of([]))
    // );
  }

  // ═══════════════════════════════════════════════════════════════
  // CREATE / UPDATE / DELETE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new injury.
   * Backend endpoint: POST {apiUrl}injury/
   * Body: Injury object (without id – backend generates it)
   *
   * @param injury - The injury data to create
   * @returns Observable<Injury> - The created injury with server-assigned id
   */
  createInjury(injury: Partial<Injury>): Observable<Injury> {
    // ──── HARDCODED FALLBACK ────
    const created: Injury = {
      id: Date.now(),  // mock id
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
    return of(created).pipe(delay(200));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of(created);
    // return this.http.post<any>(this.baseUrl, injury, { headers }).pipe(
    //   map(response => response?.data?.injury || created),
    //   catchError(() => of(created))
    // );
  }

  /**
   * Update an existing injury.
   * Backend endpoint: PUT {apiUrl}injury/{injuryId}
   * Body: Partial<Injury>
   *
   * @param injuryId - The injury id to update
   * @param changes - The fields to update
   * @returns Observable<Injury>
   */
  updateInjury(injuryId: number, changes: Partial<Injury>): Observable<Injury> {
    // ──── HARDCODED FALLBACK ────
    const updated = { ...changes, id: injuryId } as Injury;
    return of(updated).pipe(delay(200));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of(updated);
    // return this.http.put<any>(this.baseUrl + injuryId, changes, { headers }).pipe(
    //   map(response => response?.data?.injury || updated),
    //   catchError(() => of(updated))
    // );
  }

  /**
   * Delete an injury.
   * Backend endpoint: DELETE {apiUrl}injury/{injuryId}
   *
   * @param injuryId - The injury id to delete
   * @returns Observable<boolean> - true if deleted
   */
  deleteInjury(injuryId: number): Observable<boolean> {
    // ──── HARDCODED FALLBACK ────
    return of(true).pipe(delay(200));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of(false);
    // return this.http.delete<any>(this.baseUrl + injuryId, { headers }).pipe(
    //   map(() => true),
    //   catchError(() => of(false))
    // );
  }

  // ═══════════════════════════════════════════════════════════════
  // RTP (Return To Play) PHASE UPDATE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update the RTP phase for an injury.
   * Backend endpoint: PUT {apiUrl}injury/{injuryId}/rtp
   * Body: { rtpPhase: number, status?: string, dateActualReturn?: string }
   *
   * @param injuryId - The injury id
   * @param phase - The new RTP phase (1-6)
   * @returns Observable<Injury>
   */
  updateRtpPhase(injuryId: number, phase: number): Observable<any> {
    const body: any = { rtpPhase: phase };
    if (phase === 6) {
      body.status = 'cerrada';
      body.dateActualReturn = new Date().toISOString().split('T')[0];
    } else if (phase >= 1) {
      body.status = 'recuperacion';
    }
    // ──── HARDCODED FALLBACK ────
    return of(body).pipe(delay(200));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of(body);
    // return this.http.put<any>(this.baseUrl + `${injuryId}/rtp`, body, { headers }).pipe(
    //   map(response => response?.data || body),
    //   catchError(() => of(body))
    // );
  }

  // ═══════════════════════════════════════════════════════════════
  // MEDICAL DOCUMENTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all documents for an injury.
   * Backend endpoint: GET {apiUrl}injury/{injuryId}/documents
   *
   * @param injuryId - The injury id
   * @returns Observable<InjuryDocument[]>
   */
  getDocuments(injuryId: number): Observable<InjuryDocument[]> {
    // ──── HARDCODED FALLBACK ────
    const mockDocs: InjuryDocument[] = [
      {
        id: 1, injuryId, fileName: 'informe_medico.pdf', fileType: 'pdf',
        fileUrl: '', fileSize: 245000, uploadedAt: '2026-01-20T10:30:00',
        uploadedBy: 'Dr. Martínez', description: 'Informe médico inicial'
      },
      {
        id: 2, injuryId, fileName: 'radiografia_rodilla.jpg', fileType: 'image',
        fileUrl: '', fileSize: 1200000, uploadedAt: '2026-01-21T14:00:00',
        uploadedBy: 'Dr. Martínez', description: 'Radiografía lateral'
      }
    ];
    return of(mockDocs).pipe(delay(300));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of([]);
    // return this.http.get<any>(this.baseUrl + `${injuryId}/documents`, { headers }).pipe(
    //   map(response => response?.data?.documents || []),
    //   catchError(() => of([]))
    // );
  }

  /**
   * Upload a document for an injury.
   * Backend endpoint: POST {apiUrl}injury/{injuryId}/documents
   * Body: FormData with file + metadata (description, uploadedBy)
   *
   * @param injuryId - The injury id
   * @param file - The file to upload
   * @param description - Optional description
   * @param uploadedBy - Name of the uploader
   * @returns Observable<InjuryDocument>
   */
  uploadDocument(injuryId: number, file: File, description: string, uploadedBy: string): Observable<InjuryDocument> {
    // ──── HARDCODED FALLBACK ────
    const fileType: 'pdf' | 'image' | 'other' = file.type.includes('pdf') ? 'pdf'
      : file.type.startsWith('image/') ? 'image' : 'other';
    const mockDoc: InjuryDocument = {
      id: Date.now(),
      injuryId,
      fileName: file.name,
      fileType,
      fileUrl: URL.createObjectURL(file),  // local blob URL for preview
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      description
    };
    return of(mockDoc).pipe(delay(500));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of(mockDoc);
    // const formData = new FormData();
    // formData.append('file', file);
    // formData.append('description', description);
    // formData.append('uploadedBy', uploadedBy);
    // return this.http.post<any>(this.baseUrl + `${injuryId}/documents`, formData, {
    //   headers: new HttpHeaders({ 'Authorization': `Bearer ${localStorage.getItem('token')}` })
    // }).pipe(
    //   map(response => response?.data?.document || mockDoc),
    //   catchError(() => of(mockDoc))
    // );
  }

  /**
   * Delete a document from an injury.
   * Backend endpoint: DELETE {apiUrl}injury/{injuryId}/documents/{documentId}
   *
   * @param injuryId - The injury id
   * @param documentId - The document id
   * @returns Observable<boolean>
   */
  deleteDocument(injuryId: number, documentId: number): Observable<boolean> {
    // ──── HARDCODED FALLBACK ────
    return of(true).pipe(delay(200));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of(false);
    // return this.http.delete<any>(this.baseUrl + `${injuryId}/documents/${documentId}`, { headers }).pipe(
    //   map(() => true),
    //   catchError(() => of(false))
    // );
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send a notification about an injury event.
   * Backend endpoint: POST {apiUrl}injury/notification
   * Body: { injuryId, playerId, teamId, type: 'created'|'updated'|'rtp_change'|'status_change', message }
   *
   * @param payload - The notification payload
   * @returns Observable<boolean>
   */
  sendNotification(payload: {
    injuryId: number;
    playerId: number;
    teamId: number;
    type: 'created' | 'updated' | 'rtp_change' | 'status_change';
    message: string;
  }): Observable<boolean> {
    // ──── HARDCODED FALLBACK ────
    console.log('[InjuryService] Notification sent (mock):', payload);
    return of(true).pipe(delay(200));

    // ──── REAL HTTP CALL ────
    // const headers = this.getHeaders();
    // if (!headers) return of(false);
    // return this.http.post<any>(this.baseUrl + 'notification', payload, { headers }).pipe(
    //   map(() => true),
    //   catchError(() => of(false))
    // );
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION CONFIG (local storage)
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
    // Default: ask user before sending (autoNotify = false)
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

  /** Get all body zones based on mode */
  getBodyZones(isPro: boolean): BodyZone[] {
    return isPro
      ? [...BODY_ZONES_BASE, ...BODY_ZONES_PRO_EXTRA]
      : [...BODY_ZONES_BASE];
  }

  /** Find a body zone by id */
  findZone(zoneId: string, isPro: boolean): BodyZone | undefined {
    return this.getBodyZones(isPro).find(z => z.id === zoneId);
  }
}
