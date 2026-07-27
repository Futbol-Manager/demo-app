import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export type AccessPaymentRule = 'BLOCK' | 'WARN_GATEKEEPER' | 'WARN_MEMBER' | 'ALLOW';
export type AccessSubjectType = 'ABONADO' | 'PLAYER';
export type AccessScanResult = 'ALLOWED' | 'WARNING' | 'DENIED';
export type AccessDirection = 'IN' | 'OUT';

export type AccessQrMode = 'DYNAMIC' | 'STATIC';

export interface AccessControlConfig {
  configId: number;
  clubId: number;
  abonadoPaymentRule: AccessPaymentRule;
  abonadoGraceDays: number;
  abonadoDefaultMessage: string | null;
  playerPaymentRule: AccessPaymentRule;
  playerGraceDays: number;
  playerDefaultMessage: string | null;
  qrTokenTtlSeconds: number;
  abonadoQrMode: AccessQrMode;
  playerQrMode: AccessQrMode;
  staticQrKeyVersion: number;
}

export type OfflineBehavior = 'FAIL_OPEN' | 'FAIL_CLOSED';

export interface AccessDeviceKey {
  deviceKeyId: number;
  clubId: number;
  pointId: number;
  name: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  keyHint?: string | null;
}

export interface CreateDeviceKeyResponse {
  key: AccessDeviceKey;
  apiKey: string;
}

export interface AccessPoint {
  pointId: number;
  clubId: number;
  name: string;
  description: string | null;
  maxCapacity: number | null;
  dailyEntryLimit: number | null;
  scheduleJson: string | null;
  allowedCollectives: string | null;
  active: boolean;
  offlineBehavior: OfflineBehavior | null;
  webhookUrl: string | null;
}

export interface PointOccupancy {
  pointId: number;
  pointName: string;
  maxCapacity: number | null;
  entriesToday: number;
  exitsToday: number;
  currentOccupancy: number;
}

export interface AccessLog {
  logId: number;
  clubId: number;
  pointId: number | null;
  pointName: string | null;
  subjectType: AccessSubjectType | string;
  subjectId: number;
  subjectName: string | null;
  direction: AccessDirection;
  result: AccessScanResult;
  reason: string | null;
  paymentStatus: string | null;
  scannedByUserId: number | null;
  scannedAt: string;
}

export interface AccessQrPayload {
  token: string;
  expiresInSeconds: number;
  expiresAtEpochMs: number;
  clubId: number;
  subjectType: AccessSubjectType;
  subjectId: number;
  subjectName: string | null;
  paymentStatus: string | null;
  paymentWarning: string | null;
  paymentWarningMessage: string | null;
}

export interface AccessScanRequest {
  token: string;
  pointId?: number | null;
  direction?: AccessDirection;
  scannedByUserId?: number | null;
}

export interface AccessScanResultDto {
  allowed: boolean;
  result: AccessScanResult;
  reason: string | null;
  message: string | null;
  subjectId: number | null;
  subjectType: AccessSubjectType | string | null;
  subjectName: string | null;
  subjectPicture: string | null;
  pointId: number | null;
  pointName: string | null;
  paymentStatus: string | null;
  paymentWarning: boolean;
  paymentWarningMessage: string | null;
  logId: number | null;
}

export interface AccessLogPage {
  content: AccessLog[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface AccessLogFilters {
  from?: string | null;
  to?: string | null;
  subjectType?: AccessSubjectType | null;
  subjectId?: number | null;
  pointId?: number | null;
  result?: AccessScanResult | null;
  page?: number;
  size?: number;
}

/**
 * Cliente del módulo de Control de accesos por QR. En modo demo devuelve
 * configuración, puntos, logs y ocupación mock sin tocar la red.
 */
@Injectable({ providedIn: 'root' })
export class AccessControlService {

  private readonly baseUrl = `${environment.apiUrl}access-control`;

  constructor(private http: HttpClient) {}

  // ─────────────── mocks demo ───────────────

  private demoConfig(clubId: number): AccessControlConfig {
    return {
      configId: 1,
      clubId,
      abonadoPaymentRule: 'WARN_GATEKEEPER',
      abonadoGraceDays: 15,
      abonadoDefaultMessage: 'Recuerda renovar tu cuota de socio.',
      playerPaymentRule: 'WARN_MEMBER',
      playerGraceDays: 10,
      playerDefaultMessage: 'Tienes una cuota pendiente.',
      qrTokenTtlSeconds: 60,
      abonadoQrMode: 'DYNAMIC',
      playerQrMode: 'DYNAMIC',
      staticQrKeyVersion: 1,
    };
  }

  private demoPoints(clubId: number): AccessPoint[] {
    return [
      {
        pointId: 101,
        clubId,
        name: 'Puerta principal',
        description: 'Acceso principal al recinto',
        maxCapacity: 500,
        dailyEntryLimit: null,
        scheduleJson: null,
        allowedCollectives: 'ABONADO,PLAYER',
        active: true,
        offlineBehavior: 'FAIL_CLOSED',
        webhookUrl: null,
      },
      {
        pointId: 102,
        clubId,
        name: 'Acceso gimnasio',
        description: 'Sala de musculación y fitness',
        maxCapacity: 40,
        dailyEntryLimit: null,
        scheduleJson: null,
        allowedCollectives: 'ABONADO',
        active: true,
        offlineBehavior: 'FAIL_OPEN',
        webhookUrl: null,
      },
    ];
  }

  private demoLogs(clubId: number): AccessLog[] {
    const now = Date.now();
    const mk = (i: number, name: string, type: AccessSubjectType, dir: AccessDirection, res: AccessScanResult, reason: string | null): AccessLog => ({
      logId: 9000 + i,
      clubId,
      pointId: 101,
      pointName: 'Puerta principal',
      subjectType: type,
      subjectId: 5000 + i,
      subjectName: name,
      direction: dir,
      result: res,
      reason,
      paymentStatus: res === 'WARNING' ? 'PENDIENTE' : 'AL_CORRIENTE',
      scannedByUserId: 1,
      scannedAt: new Date(now - i * 7 * 60 * 1000).toISOString(),
    });
    return [
      mk(1, 'Lucía Fernández Gómez', 'ABONADO', 'IN', 'ALLOWED', null),
      mk(2, 'Sergio Ruiz Martín', 'ABONADO', 'IN', 'WARNING', 'Cuota pendiente'),
      mk(3, 'Carlos García López', 'PLAYER', 'IN', 'ALLOWED', null),
      mk(4, 'Miguel Martín Sánchez', 'PLAYER', 'OUT', 'ALLOWED', null),
      mk(5, 'Carmen López Díaz', 'ABONADO', 'IN', 'DENIED', 'Socio dado de baja'),
    ];
  }

  private demoOccupancy(clubId: number): PointOccupancy[] {
    return [
      { pointId: 101, pointName: 'Puerta principal', maxCapacity: 500, entriesToday: 128, exitsToday: 74, currentOccupancy: 54 },
      { pointId: 102, pointName: 'Acceso gimnasio', maxCapacity: 40, entriesToday: 31, exitsToday: 19, currentOccupancy: 12 },
    ];
  }

  // -------------------------------------------------------------------------
  // Configuración
  // -------------------------------------------------------------------------

  getConfig(clubId: number): Observable<AccessControlConfig> {
    if (isDemoMode()) return of(this.demoConfig(clubId));
    return this.http.get<any>(`${this.baseUrl}/${clubId}/config`)
      .pipe(map(r => r?.data ?? r));
  }

  saveConfig(clubId: number, body: Partial<AccessControlConfig>): Observable<AccessControlConfig> {
    if (isDemoMode()) return of({ ...this.demoConfig(clubId), ...body } as AccessControlConfig);
    return this.http.put<any>(`${this.baseUrl}/${clubId}/config`, body)
      .pipe(map(r => r?.data ?? r));
  }

  rotateStaticKeys(clubId: number): Observable<AccessControlConfig> {
    if (isDemoMode()) {
      const cfg = this.demoConfig(clubId);
      cfg.staticQrKeyVersion += 1;
      return of(cfg);
    }
    return this.http.post<any>(`${this.baseUrl}/${clubId}/rotate-static-keys`, {})
      .pipe(map(r => r?.data ?? r));
  }

  // -------------------------------------------------------------------------
  // Puntos de acceso
  // -------------------------------------------------------------------------

  listPoints(clubId: number): Observable<AccessPoint[]> {
    if (isDemoMode()) return of(this.demoPoints(clubId));
    return this.http.get<any>(`${this.baseUrl}/${clubId}/points`)
      .pipe(map(r => r?.data ?? []));
  }

  createPoint(clubId: number, body: Partial<AccessPoint>): Observable<AccessPoint> {
    if (isDemoMode()) {
      const point: AccessPoint = {
        pointId: Date.now(),
        clubId,
        name: body.name || 'Nuevo punto',
        description: body.description ?? null,
        maxCapacity: body.maxCapacity ?? null,
        dailyEntryLimit: body.dailyEntryLimit ?? null,
        scheduleJson: null,
        allowedCollectives: body.allowedCollectives ?? 'ABONADO,PLAYER',
        active: body.active ?? true,
        offlineBehavior: body.offlineBehavior ?? null,
        webhookUrl: body.webhookUrl ?? null,
      };
      return of(point);
    }
    return this.http.post<any>(`${this.baseUrl}/${clubId}/points`, body)
      .pipe(map(r => r?.data ?? r));
  }

  updatePoint(pointId: number, body: Partial<AccessPoint>): Observable<AccessPoint> {
    if (isDemoMode()) {
      return of({
        pointId,
        clubId: 9000,
        name: body.name || 'Punto',
        description: body.description ?? null,
        maxCapacity: body.maxCapacity ?? null,
        dailyEntryLimit: body.dailyEntryLimit ?? null,
        scheduleJson: null,
        allowedCollectives: body.allowedCollectives ?? 'ABONADO,PLAYER',
        active: body.active ?? true,
        offlineBehavior: body.offlineBehavior ?? null,
        webhookUrl: body.webhookUrl ?? null,
      } as AccessPoint);
    }
    return this.http.put<any>(`${this.baseUrl}/points/${pointId}`, body)
      .pipe(map(r => r?.data ?? r));
  }

  deactivatePoint(pointId: number): Observable<void> {
    if (isDemoMode()) return of(void 0);
    return this.http.delete<any>(`${this.baseUrl}/points/${pointId}`)
      .pipe(map(() => void 0));
  }

  // -------------------------------------------------------------------------
  // QR del miembro
  // -------------------------------------------------------------------------

  getQr(clubId: number, subjectType: AccessSubjectType, subjectId: number): Observable<AccessQrPayload> {
    if (isDemoMode()) {
      const ttl = 60;
      return of({
        token: `DEMO-QR-${subjectType}-${subjectId}-${Math.floor(Date.now() / 1000)}`,
        expiresInSeconds: ttl,
        expiresAtEpochMs: Date.now() + ttl * 1000,
        clubId,
        subjectType,
        subjectId,
        subjectName: subjectType === 'ABONADO' ? 'Lucía Fernández Gómez' : 'Carlos García López',
        paymentStatus: 'AL_CORRIENTE',
        paymentWarning: null,
        paymentWarningMessage: null,
      });
    }
    const params = new HttpParams()
      .set('clubId', String(clubId))
      .set('subjectType', subjectType)
      .set('subjectId', String(subjectId));
    return this.http.get<any>(`${this.baseUrl}/qr`, { params })
      .pipe(map(r => r?.data ?? r));
  }

  // -------------------------------------------------------------------------
  // Escaneo (lector)
  // -------------------------------------------------------------------------

  scan(req: AccessScanRequest): Observable<AccessScanResultDto> {
    if (isDemoMode()) {
      return of({
        allowed: true,
        result: 'ALLOWED',
        reason: null,
        message: 'Acceso permitido',
        subjectId: 5001,
        subjectType: 'ABONADO',
        subjectName: 'Lucía Fernández Gómez',
        subjectPicture: null,
        pointId: req.pointId ?? 101,
        pointName: 'Puerta principal',
        paymentStatus: 'AL_CORRIENTE',
        paymentWarning: false,
        paymentWarningMessage: null,
        logId: Date.now(),
      });
    }
    return this.http.post<any>(`${this.baseUrl}/scan`, req)
      .pipe(map(r => r?.data ?? r));
  }

  // -------------------------------------------------------------------------
  // Logs
  // -------------------------------------------------------------------------

  getLogs(clubId: number, from?: string | null, to?: string | null): Observable<AccessLog[]> {
    if (isDemoMode()) return of(this.demoLogs(clubId));
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<any>(`${this.baseUrl}/${clubId}/logs`, { params })
      .pipe(map(r => r?.data ?? []));
  }

  searchLogs(clubId: number, filters: AccessLogFilters = {}): Observable<AccessLogPage> {
    if (isDemoMode()) {
      let content = this.demoLogs(clubId);
      if (filters.subjectType) content = content.filter(l => l.subjectType === filters.subjectType);
      if (filters.result) content = content.filter(l => l.result === filters.result);
      if (filters.pointId != null) content = content.filter(l => l.pointId === filters.pointId);
      return of({
        content,
        totalElements: content.length,
        totalPages: 1,
        page: filters.page ?? 0,
        size: filters.size ?? 50,
      });
    }
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.subjectType) params = params.set('subjectType', filters.subjectType);
    if (filters.subjectId != null) params = params.set('subjectId', String(filters.subjectId));
    if (filters.pointId != null) params = params.set('pointId', String(filters.pointId));
    if (filters.result) params = params.set('result', filters.result);
    params = params.set('page', String(filters.page ?? 0));
    params = params.set('size', String(filters.size ?? 50));
    return this.http.get<any>(`${this.baseUrl}/${clubId}/logs/search`, { params })
      .pipe(map(r => r?.data ?? { content: [], totalElements: 0, totalPages: 0, page: 0, size: 50 }));
  }

  getLogsBySubject(clubId: number, subjectType: AccessSubjectType, subjectId: number,
                   page = 0, size = 50): Observable<AccessLogPage> {
    if (isDemoMode()) {
      const content = this.demoLogs(clubId)
        .filter(l => l.subjectType === subjectType)
        .map(l => ({ ...l, subjectId, subjectName: subjectType === 'ABONADO' ? 'Lucía Fernández Gómez' : 'Carlos García López' }));
      return of({ content, totalElements: content.length, totalPages: 1, page, size });
    }
    const params = new HttpParams()
      .set('type', subjectType)
      .set('id', String(subjectId))
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<any>(`${this.baseUrl}/${clubId}/logs/subject`, { params })
      .pipe(map(r => r?.data ?? { content: [], totalElements: 0, totalPages: 0, page: 0, size }));
  }

  downloadCarnetsPdf(clubId: number, subjectType: AccessSubjectType, ids: number[]): Observable<Blob> {
    if (isDemoMode()) {
      return of(new Blob(
        [`PDF demo de carnets (${subjectType}) para el club ${clubId}: ${ids.join(', ')}`],
        { type: 'application/pdf' },
      ));
    }
    const params = new HttpParams()
      .set('subjectType', subjectType)
      .set('ids', ids.join(','));
    return this.http.get(`${this.baseUrl}/${clubId}/carnets.pdf`, {
      params,
      responseType: 'blob',
    });
  }

  // -------------------------------------------------------------------------
  // Ocupación
  // -------------------------------------------------------------------------

  getOccupancy(clubId: number): Observable<PointOccupancy[]> {
    if (isDemoMode()) return of(this.demoOccupancy(clubId));
    return this.http.get<any>(`${this.baseUrl}/${clubId}/occupancy`)
      .pipe(map(r => r?.data ?? []));
  }

  // -------------------------------------------------------------------------
  // Claves de dispositivo
  // -------------------------------------------------------------------------

  listDeviceKeys(clubId: number, pointId: number): Observable<AccessDeviceKey[]> {
    if (isDemoMode()) {
      return of([
        {
          deviceKeyId: 201,
          clubId,
          pointId,
          name: 'Torno entrada A',
          active: true,
          createdAt: '2025-09-01T08:00:00',
          lastUsedAt: new Date().toISOString(),
          keyHint: '••••3f2a',
        },
      ]);
    }
    return this.http.get<any>(`${this.baseUrl}/${clubId}/points/${pointId}/keys`)
      .pipe(map(r => r?.data ?? []));
  }

  createDeviceKey(clubId: number, pointId: number, name: string): Observable<CreateDeviceKeyResponse> {
    if (isDemoMode()) {
      const keyId = Date.now();
      return of({
        key: {
          deviceKeyId: keyId,
          clubId,
          pointId,
          name,
          active: true,
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          keyHint: '••••demo',
        },
        apiKey: `sk_demo_${keyId}_do_not_use_in_prod`,
      });
    }
    return this.http.post<any>(
      `${this.baseUrl}/${clubId}/points/${pointId}/keys`,
      { name },
    ).pipe(map(r => r?.data ?? r));
  }

  revokeDeviceKey(clubId: number, pointId: number, keyId: number): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http.delete<any>(`${this.baseUrl}/${clubId}/points/${pointId}/keys/${keyId}`)
      .pipe(map(() => undefined));
  }
}
