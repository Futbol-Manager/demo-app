import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ExternalClip {
  id?: number;
  projectId?: number;
  title: string;
  startSec: number;
  endSec: number;
  durationSec?: number;
  notes?: string;
  tags?: string;
  displayOrder?: number;
  createdAt?: string;
}

export interface ExternalProject {
  id?: number;
  clubId: number;
  createdBy?: number;
  title: string;
  sourceType: string;
  videoUrl: string;
  videoTitle?: string;
  status?: string;
  createdAt?: string;
  clipCount?: number;
  clips?: ExternalClip[];
}

@Injectable({ providedIn: 'root' })
export class ExternalVideoService {

  private base = environment.apiUrl + 'external-video';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: 'Bearer ' + (localStorage.getItem('token') || '') });
  }

  createProject(body: Partial<ExternalProject>): Observable<any> {
    return this.http.post<any>(`${this.base}/project`, body, { headers: this.headers() });
  }

  listProjects(clubId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/club/${clubId}/projects`, { headers: this.headers() });
  }

  getProject(projectId: number, clubId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/project/${projectId}?clubId=${clubId}`, { headers: this.headers() });
  }

  deleteProject(projectId: number, clubId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/project/${projectId}?clubId=${clubId}`, { headers: this.headers() });
  }

  addClip(projectId: number, clubId: number, clip: Partial<ExternalClip>): Observable<any> {
    return this.http.post<any>(`${this.base}/project/${projectId}/clip?clubId=${clubId}`, clip, { headers: this.headers() });
  }

  updateClip(projectId: number, clipId: number, clubId: number, changes: Partial<ExternalClip>): Observable<any> {
    return this.http.put<any>(`${this.base}/project/${projectId}/clip/${clipId}?clubId=${clubId}`, changes, { headers: this.headers() });
  }

  deleteClip(projectId: number, clipId: number, clubId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/project/${projectId}/clip/${clipId}?clubId=${clubId}`, { headers: this.headers() });
  }
}
