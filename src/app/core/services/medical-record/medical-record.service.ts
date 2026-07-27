import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Modelo de la ficha clínica del jugador (1:1 con players).
 */
export interface PlayerMedicalRecord {
  recordId?: number;
  playerId: number;
  clubId?: number | null;
  bloodType?: string | null;
  allergies?: string | null;
  currentMedication?: string | null;
  chronicConditions?: string | null;
  previousSurgeries?: string | null;
  familyHistory?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  primaryDoctorName?: string | null;
  primaryDoctorPhone?: string | null;
  insuranceCompany?: string | null;
  insurancePolicyNumber?: string | null;
  lastCheckupDate?: string | null;
  fitToCompete: boolean;
  fitNotes?: string | null;
  notes?: string | null;
  updatedByUserId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Acceso a la API de ficha clínica del jugador (Fase 1.4).
 *
 * <p>En modo demo devuelve una ficha clínica ficticia plausible.</p>
 */
@Injectable({ providedIn: 'root' })
export class MedicalRecordService {

  private readonly baseUrl = `${environment.apiUrl}medical-record`;

  constructor(private http: HttpClient) {}

  getByPlayer(playerId: number): Observable<PlayerMedicalRecord> {
    if (isDemoMode()) {
      return of(this.demoRecord(playerId));
    }
    return this.http.get<any>(`${this.baseUrl}/player/${playerId}`).pipe(
      map(resp => this.normalize(playerId, resp?.data ?? resp))
    );
  }

  upsert(playerId: number, payload: Partial<PlayerMedicalRecord>): Observable<PlayerMedicalRecord> {
    if (isDemoMode()) {
      return of(this.normalize(playerId, { ...this.demoRecord(playerId), ...payload }));
    }
    return this.http.put<any>(`${this.baseUrl}/player/${playerId}`, payload).pipe(
      map(resp => this.normalize(playerId, resp?.data ?? resp))
    );
  }

  delete(playerId: number): Observable<void> {
    if (isDemoMode()) return of(undefined);
    return this.http.delete<void>(`${this.baseUrl}/player/${playerId}`);
  }

  private demoRecord(playerId: number): PlayerMedicalRecord {
    return {
      recordId: playerId,
      playerId,
      clubId: 9001,
      bloodType: '0+',
      allergies: 'Sin alergias conocidas',
      currentMedication: null,
      chronicConditions: null,
      previousSurgeries: 'Artroscopia rodilla derecha (2022)',
      familyHistory: null,
      emergencyContactName: 'Familiar de contacto',
      emergencyContactPhone: '600123456',
      emergencyContactRelation: 'Padre/Madre',
      primaryDoctorName: 'Dr. Servicios Médicos',
      primaryDoctorPhone: '961234567',
      insuranceCompany: 'Mutua Deportiva',
      insurancePolicyNumber: 'POL-000' + playerId,
      lastCheckupDate: new Date().toISOString().substring(0, 10),
      fitToCompete: true,
      fitNotes: 'Apto sin restricciones',
      notes: 'Ficha clínica de demostración.',
      updatedByUserId: 1,
      createdAt: '2024-09-01',
      updatedAt: new Date().toISOString()
    };
  }

  private normalize(playerId: number, raw: any): PlayerMedicalRecord {
    if (!raw) {
      return { playerId, fitToCompete: true };
    }
    return {
      recordId: raw.recordId,
      playerId: raw.playerId ?? playerId,
      clubId: raw.clubId ?? null,
      bloodType: raw.bloodType ?? null,
      allergies: raw.allergies ?? null,
      currentMedication: raw.currentMedication ?? null,
      chronicConditions: raw.chronicConditions ?? null,
      previousSurgeries: raw.previousSurgeries ?? null,
      familyHistory: raw.familyHistory ?? null,
      emergencyContactName: raw.emergencyContactName ?? null,
      emergencyContactPhone: raw.emergencyContactPhone ?? null,
      emergencyContactRelation: raw.emergencyContactRelation ?? null,
      primaryDoctorName: raw.primaryDoctorName ?? null,
      primaryDoctorPhone: raw.primaryDoctorPhone ?? null,
      insuranceCompany: raw.insuranceCompany ?? null,
      insurancePolicyNumber: raw.insurancePolicyNumber ?? null,
      lastCheckupDate: this.toIsoDate(raw.lastCheckupDate),
      fitToCompete: raw.fitToCompete !== false,
      fitNotes: raw.fitNotes ?? null,
      notes: raw.notes ?? null,
      updatedByUserId: raw.updatedByUserId ?? null,
      createdAt: raw.createdAt ?? null,
      updatedAt: raw.updatedAt ?? null,
    };
  }

  private toIsoDate(raw: any): string | null {
    if (!raw) return null;
    if (typeof raw === 'string') {
      return raw.length >= 10 ? raw.substring(0, 10) : raw;
    }
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return null;
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${day}`;
    } catch {
      return null;
    }
  }
}
