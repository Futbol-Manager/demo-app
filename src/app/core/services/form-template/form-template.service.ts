import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FormTemplate, FormTemplateTipo, FormTemplateResponse } from './form-template.model';

@Injectable({ providedIn: 'root' })
export class FormTemplateService {

  private base = environment.apiUrl + 'formtemplate/';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── TEMPLATES ──────────────────────────────────────────────────────────────

  getByClubAndTipo(clubId: number, tipo: FormTemplateTipo): Observable<any> {
    return this.http.get(`${this.base}byclub/${clubId}/${tipo}`, { headers: this.headers() });
  }

  getAllByClub(clubId: number): Observable<any> {
    return this.http.get(`${this.base}byclub/${clubId}`, { headers: this.headers() });
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.base}${id}`, { headers: this.headers() });
  }

  createTemplate(payload: {
    clubId: number;
    coachUserId?: number | null;
    nombre: string;
    tipo: FormTemplateTipo;
    campos: string;
  }): Observable<any> {
    return this.http.post(`${this.base}`, payload, { headers: this.headers() });
  }

  updateTemplate(id: number, payload: Partial<{ nombre: string; tipo: FormTemplateTipo; campos: string }>): Observable<any> {
    return this.http.put(`${this.base}${id}`, payload, { headers: this.headers() });
  }

  deleteTemplate(id: number): Observable<any> {
    return this.http.delete(`${this.base}${id}`, { headers: this.headers() });
  }

  // ─── RESPONSES ──────────────────────────────────────────────────────────────

  getResponseByMatch(tipo: string, entityId: number, coachId: number): Observable<any> {
    return this.http.get(`${this.base}response/match/${tipo}/${entityId}/${coachId}`, { headers: this.headers() });
  }

  getResponseByTraining(tipo: string, entityId: number, coachId: number): Observable<any> {
    return this.http.get(`${this.base}response/training/${tipo}/${entityId}/${coachId}`, { headers: this.headers() });
  }

  /** Obtiene TODAS las respuestas para un logId dado, sin filtrar por coach */
  getAllResponsesByTraining(tipo: string, trainingId: number): Observable<any> {
    return this.http.get(`${this.base}responses/training/${tipo}/${trainingId}`, { headers: this.headers() });
  }

  saveResponse(payload: {
    formTemplateId?: number | null;
    coachUserId: number;
    teamId: number;
    tipo: string;
    matchPreparationId?: number | null;
    trainingSessionId?: number | null;
    respuestas: string;
    isStandard: number;
  }): Observable<any> {
    return this.http.post(`${this.base}response`, payload, { headers: this.headers() });
  }

  updateResponse(id: number, payload: { respuestas?: string; formTemplateId?: number | null; isStandard?: number }): Observable<any> {
    return this.http.put(`${this.base}response/${id}`, payload, { headers: this.headers() });
  }

  // ─── ASSIGNMENTS ──────────────────────────────────────────────────────────

  /** Asigna un template como formulario activo para un entrenamiento/partido y notifica a los players */
  assignTemplate(payload: {
    formTemplateId: number;
    coachUserId: number;
    teamId: number;
    tipo: string;
    matchPreparationId?: number | null;
    trainingSessionId?: number | null;
  }): Observable<any> {
    return this.http.post(`${this.base}assign`, payload, { headers: this.headers() });
  }

  /** Obtiene el template asignado actualmente a un entrenamiento/partido (o null) */
  getAssignment(tipo: string, entityId: number, teamId: number): Observable<any> {
    return this.http.get(`${this.base}assign/${tipo}/${entityId}/${teamId}`, { headers: this.headers() });
  }
}
