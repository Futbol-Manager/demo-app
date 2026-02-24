import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface AiConfig {
  configKey: string;
  displayName: string;
  description: string;
  model: string;
  provider: string;
  updatedAt: string | null;
}

export interface AiCreditConfig {
  model: string;
  baseCredits: number;
  updatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class AiConfigService {

  private baseUrl = environment.apiUrl + 'ai/config';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAll(): Observable<AiConfig[]> {
    return this.http.get<AiConfig[]>(this.baseUrl, { headers: this.getHeaders() });
  }

  update(key: string, model: string, provider: string): Observable<AiConfig> {
    const encodedKey = encodeURIComponent(key);
    return this.http.put<AiConfig>(
      `${this.baseUrl}/${encodedKey}`,
      { model, provider },
      { headers: this.getHeaders() }
    );
  }

  // ── Credit config ──────────────────────────────────────────────────────────

  getAllCreditConfigs(): Observable<AiCreditConfig[]> {
    return this.http.get<AiCreditConfig[]>(`${this.baseUrl}/credits`, { headers: this.getHeaders() });
  }

  updateCreditConfig(model: string, baseCredits: number): Observable<AiCreditConfig> {
    const encodedModel = encodeURIComponent(model);
    return this.http.put<AiCreditConfig>(
      `${this.baseUrl}/credits/${encodedModel}`,
      { baseCredits },
      { headers: this.getHeaders() }
    );
  }
}
