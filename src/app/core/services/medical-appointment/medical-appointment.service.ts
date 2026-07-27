import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

/**
 * Cita médica/fisio/nutrición del Modo Profesional (Fase 2.4).
 *
 * Coincide con {@code MedicalAppointmentEntity} en backend. El campo
 * {@code appointmentDate} viene siempre serializado como cadena
 * {@code yyyy-MM-dd}; {@code startTime} como {@code HH:mm}.
 */
export interface MedicalAppointment {
  appointmentId: number;
  clubId: number;
  teamId: number | null;
  playerId: number | null;
  professionalUserId: number | null;
  professionalName: string | null;
  appointmentDate: string;
  startTime: string;
  durationMin: number;
  kind: AppointmentKind;
  location: string | null;
  subject: string | null;
  notes: string | null;
  status: AppointmentStatus;
  /**
   * Respuesta del jugador a la cita: `PENDING|CONFIRMED|DECLINED`.
   */
  playerConfirmation: PlayerConfirmation;
  reminderSent: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type PlayerConfirmation = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export type AppointmentKind =
  | 'PHYSIO'              // Fisioterapia
  | 'READAPTATION'       // Readaptación
  | 'MEDICAL'            // Medicina
  | 'NURSING'            // Enfermería
  | 'COMPLEMENTARY_TEST' // Prueba complementaria
  | 'PODIATRY'           // Podología
  | 'NUTRITION'          // Nutrición
  | 'INCIDENT'           // Incidencia
  // Tipos heredados (citas antiguas): ya no se ofrecen al crear, pero
  // se mantienen para mostrar correctamente datos existentes.
  | 'RECOVERY'
  | 'EVALUATION'
  | 'OTHER';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface AppointmentBundle {
  teamId?: number;
  clubId: number;
  date?: string;
  month?: string;
  appointments: MedicalAppointment[];
  /** playerId → "Nombre Apellido". */
  playerLookup: { [playerId: string]: string };
}

export interface AppointmentUpsert {
  teamId?: number | null;
  playerId?: number | null;
  clubId?: number;
  professionalUserId?: number | null;
  professionalName?: string | null;
  appointmentDate: string;
  startTime: string;
  durationMin?: number;
  kind: AppointmentKind;
  location?: string | null;
  subject?: string | null;
  notes?: string | null;
  status?: AppointmentStatus;
}

/**
 * Cliente Angular para el endpoint {@code /rest/medical-appointment/...}.
 *
 * <p>En modo demo devuelve un calendario de citas ficticio plausible sin
 * llamar al backend.</p>
 */
@Injectable({ providedIn: 'root' })
export class MedicalAppointmentService {

  private readonly baseUrl = `${environment.apiUrl}medical-appointment`;

  constructor(private http: HttpClient) {}

  /** Citas de un equipo en un mes ({@code yyyy-MM}). Vista calendario. */
  getByTeamAndMonth(teamId: number, monthYyyymm: string): Observable<AppointmentBundle> {
    if (isDemoMode()) {
      return of(this.demoBundle(teamId, monthYyyymm));
    }
    return this.http
      .get<any>(`${this.baseUrl}/team/${teamId}/month/${monthYyyymm}`)
      .pipe(map(resp => this.normalize(resp?.data ?? resp)));
  }

  /** Citas de un equipo en un día concreto. */
  getByTeamAndDate(teamId: number, dateIsoYmd: string): Observable<AppointmentBundle> {
    if (isDemoMode()) {
      const month = dateIsoYmd.substring(0, 7);
      const b = this.demoBundle(teamId, month);
      b.appointments = b.appointments.filter(a => a.appointmentDate === dateIsoYmd);
      b.date = dateIsoYmd;
      return of(b);
    }
    return this.http
      .get<any>(`${this.baseUrl}/team/${teamId}/date/${dateIsoYmd}`)
      .pipe(map(resp => this.normalize(resp?.data ?? resp)));
  }

  /** Próximas N citas SCHEDULED de un equipo (default backend = 10). */
  getUpcomingByTeam(teamId: number, limit?: number): Observable<AppointmentBundle> {
    if (isDemoMode()) {
      return of(this.demoUpcoming(teamId, limit ?? 10));
    }
    const qp = limit && limit > 0 ? `?limit=${limit}` : '';
    return this.http
      .get<any>(`${this.baseUrl}/team/${teamId}/upcoming${qp}`)
      .pipe(map(resp => this.normalize(resp?.data ?? resp)));
  }

  /** Próximas N citas SCHEDULED de un jugador (default backend = 20). */
  getUpcomingByPlayer(playerId: number, limit?: number): Observable<AppointmentBundle> {
    if (isDemoMode()) {
      const b = this.demoUpcoming(9001, limit ?? 20);
      b.appointments = b.appointments.filter(a => a.playerId === playerId);
      return of(b);
    }
    const qp = limit && limit > 0 ? `?limit=${limit}` : '';
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/upcoming${qp}`)
      .pipe(map(resp => this.normalize(resp?.data ?? resp)));
  }

  /**
   * TODAS las citas de un jugador (pasadas + futuras, cualquier estado).
   */
  getAllByPlayer(playerId: number): Observable<AppointmentBundle> {
    if (isDemoMode()) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const b = this.demoBundle(9001, month);
      b.appointments = b.appointments.filter(a => a.playerId === playerId);
      return of(b);
    }
    return this.http
      .get<any>(`${this.baseUrl}/player/${playerId}/all`)
      .pipe(map(resp => this.normalize(resp?.data ?? resp)));
  }

  create(body: AppointmentUpsert): Observable<MedicalAppointment> {
    if (isDemoMode()) {
      return of(this.demoFromUpsert(body, Date.now()));
    }
    return this.http
      .post<any>(`${this.baseUrl}`, body)
      .pipe(map(resp => resp?.data ?? resp));
  }

  update(appointmentId: number, body: Partial<AppointmentUpsert>): Observable<MedicalAppointment> {
    if (isDemoMode()) {
      return of(this.demoFromUpsert(body as AppointmentUpsert, appointmentId));
    }
    return this.http
      .put<any>(`${this.baseUrl}/${appointmentId}`, body)
      .pipe(map(resp => resp?.data ?? resp));
  }

  delete(appointmentId: number): Observable<{ appointmentId: number; deleted: boolean }> {
    if (isDemoMode()) {
      return of({ appointmentId, deleted: true });
    }
    return this.http
      .delete<any>(`${this.baseUrl}/${appointmentId}`)
      .pipe(map(resp => resp?.data ?? resp));
  }

  cancel(appointmentId: number): Observable<MedicalAppointment> {
    if (isDemoMode()) {
      return of(this.demoStub(appointmentId, 'CANCELLED'));
    }
    return this.http
      .post<any>(`${this.baseUrl}/${appointmentId}/cancel`, {})
      .pipe(map(resp => resp?.data ?? resp));
  }

  complete(appointmentId: number): Observable<MedicalAppointment> {
    if (isDemoMode()) {
      return of(this.demoStub(appointmentId, 'COMPLETED'));
    }
    return this.http
      .post<any>(`${this.baseUrl}/${appointmentId}/complete`, {})
      .pipe(map(resp => resp?.data ?? resp));
  }

  /** Garantiza siempre las claves esperadas. */
  private normalize(raw: any): AppointmentBundle {
    return {
      teamId: raw?.teamId ?? undefined,
      clubId: raw?.clubId ?? 0,
      date: raw?.date ?? undefined,
      month: raw?.month ?? undefined,
      appointments: Array.isArray(raw?.appointments) ? raw.appointments : [],
      playerLookup: raw?.playerLookup ?? {}
    };
  }

  // ─── DEMO ──────────────────────────────────────────────────────────
  private static readonly DEMO_NAMES: { [id: number]: string } = {
    8001: 'Carlos García', 8002: 'Miguel López', 8003: 'Antonio Ruiz',
    8004: 'David Martín', 8005: 'Pablo Sánchez', 8006: 'Javier Pérez',
    8009: 'Diego Fernández', 8014: 'Iván Moreno'
  };

  private demoPlayerLookup(): { [playerId: string]: string } {
    const lk: { [playerId: string]: string } = {};
    Object.entries(MedicalAppointmentService.DEMO_NAMES).forEach(([id, name]) => lk[id] = name);
    return lk;
  }

  private ymd(y: number, m: number, d: number): string {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  /** Genera un calendario de citas ficticio para el mes indicado. */
  private demoBundle(teamId: number, monthYyyymm: string): AppointmentBundle {
    const [y, m] = monthYyyymm.split('-').map(n => parseInt(n, 10));
    const daysInMonth = new Date(y, m, 0).getDate();
    const pick = (base: number, offset: number) => Math.min(daysInMonth, base + offset);
    const appts: MedicalAppointment[] = [
      this.appt(1, teamId, 8001, 'PHYSIO', this.ymd(y, m, pick(3, 0)), '10:00', 30, 'SCHEDULED', 'Sala fisio 1', 'Tratamiento tobillo', 'Crioterapia + movilidad', 'CONFIRMED'),
      this.appt(2, teamId, 8003, 'MEDICAL', this.ymd(y, m, pick(3, 0)), '11:30', 20, 'SCHEDULED', 'Consulta médica', 'Revisión general', null, 'PENDING'),
      this.appt(3, teamId, 8005, 'READAPTATION', this.ymd(y, m, pick(6, 0)), '09:30', 45, 'SCHEDULED', 'Gimnasio', 'Sesión readaptación isquios', 'Fase RTT', 'CONFIRMED'),
      this.appt(4, teamId, 8009, 'NUTRITION', this.ymd(y, m, pick(8, 0)), '12:00', 30, 'SCHEDULED', 'Sala nutrición', 'Control de peso y pliegues', null, 'PENDING'),
      this.appt(5, teamId, 8002, 'PHYSIO', this.ymd(y, m, pick(10, 0)), '10:30', 30, 'COMPLETED', 'Sala fisio 2', 'Descarga gemelo', 'Sesión completada', 'CONFIRMED'),
      this.appt(6, teamId, 8014, 'COMPLEMENTARY_TEST', this.ymd(y, m, pick(12, 0)), '17:00', 60, 'SCHEDULED', 'Centro externo', 'Ecografía muslo', 'Derivación externa', 'DECLINED'),
      this.appt(7, teamId, 8006, 'PODIATRY', this.ymd(y, m, pick(15, 0)), '16:00', 30, 'SCHEDULED', 'Podología', 'Estudio de la pisada', null, 'PENDING'),
      this.appt(8, teamId, 8004, 'NURSING', this.ymd(y, m, pick(18, 0)), '09:00', 15, 'CANCELLED', 'Enfermería', 'Cura', 'Cancelada por el jugador', 'PENDING'),
      this.appt(9, teamId, 8001, 'PHYSIO', this.ymd(y, m, pick(20, 0)), '10:00', 30, 'SCHEDULED', 'Sala fisio 1', 'Seguimiento tobillo', null, 'CONFIRMED'),
    ];
    return {
      teamId,
      clubId: 9001,
      month: monthYyyymm,
      appointments: appts,
      playerLookup: this.demoPlayerLookup()
    };
  }

  /** Próximas citas SCHEDULED a partir de hoy. */
  private demoUpcoming(teamId: number, limit: number): AppointmentBundle {
    const today = new Date();
    const iso = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const appts: MedicalAppointment[] = [
      this.appt(101, teamId, 8001, 'PHYSIO', iso(1), '10:00', 30, 'SCHEDULED', 'Sala fisio 1', 'Tratamiento tobillo', 'Crioterapia', 'CONFIRMED'),
      this.appt(102, teamId, 8005, 'READAPTATION', iso(2), '09:30', 45, 'SCHEDULED', 'Gimnasio', 'Readaptación isquios', 'Fase RTT', 'PENDING'),
      this.appt(103, teamId, 8009, 'NUTRITION', iso(4), '12:00', 30, 'SCHEDULED', 'Sala nutrición', 'Control de peso', null, 'PENDING'),
      this.appt(104, teamId, 8003, 'MEDICAL', iso(6), '11:30', 20, 'SCHEDULED', 'Consulta médica', 'Revisión', null, 'CONFIRMED'),
      this.appt(105, teamId, 8006, 'PODIATRY', iso(9), '16:00', 30, 'SCHEDULED', 'Podología', 'Estudio de la pisada', null, 'PENDING'),
    ].slice(0, limit);
    return {
      teamId,
      clubId: 9001,
      appointments: appts,
      playerLookup: this.demoPlayerLookup()
    };
  }

  private appt(
    id: number, teamId: number, playerId: number, kind: AppointmentKind,
    date: string, startTime: string, durationMin: number, status: AppointmentStatus,
    location: string | null, subject: string | null, notes: string | null,
    confirm: PlayerConfirmation
  ): MedicalAppointment {
    return {
      appointmentId: id,
      clubId: 9001,
      teamId,
      playerId,
      professionalUserId: 1,
      professionalName: 'Staff médico',
      appointmentDate: date,
      startTime,
      durationMin,
      kind,
      location,
      subject,
      notes,
      status,
      playerConfirmation: confirm,
      reminderSent: false
    };
  }

  private demoFromUpsert(body: AppointmentUpsert, id: number): MedicalAppointment {
    return {
      appointmentId: id,
      clubId: body.clubId ?? 9001,
      teamId: body.teamId ?? 9001,
      playerId: body.playerId ?? null,
      professionalUserId: body.professionalUserId ?? 1,
      professionalName: body.professionalName ?? 'Staff médico',
      appointmentDate: body.appointmentDate,
      startTime: body.startTime,
      durationMin: body.durationMin ?? 30,
      kind: body.kind,
      location: body.location ?? null,
      subject: body.subject ?? null,
      notes: body.notes ?? null,
      status: body.status ?? 'SCHEDULED',
      playerConfirmation: 'PENDING',
      reminderSent: false
    };
  }

  private demoStub(id: number, status: AppointmentStatus): MedicalAppointment {
    return {
      appointmentId: id,
      clubId: 9001,
      teamId: 9001,
      playerId: null,
      professionalUserId: 1,
      professionalName: 'Staff médico',
      appointmentDate: new Date().toISOString().substring(0, 10),
      startTime: '10:00',
      durationMin: 30,
      kind: 'PHYSIO',
      location: null,
      subject: null,
      notes: null,
      status,
      playerConfirmation: 'PENDING',
      reminderSent: false
    };
  }
}
