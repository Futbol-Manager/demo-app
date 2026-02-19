import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProspectService {

  private base = (environment as any).prospectorApiUrl || 'http://localhost:8100/api/';

  constructor(private http: HttpClient) { }

  // Campaigns
  getCampaigns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}campaigns`);
  }

  getCampaign(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}campaigns/${id}`);
  }

  createCampaign(name: string, description: string = ''): Observable<any> {
    return this.http.post<any>(`${this.base}campaigns`, { name, description });
  }

  getCampaignStats(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}stats/${id}`);
  }

  // Prospects
  getProspects(campaignId?: number, status?: string, page?: number, size: number = 50): Observable<any> {
    let params: any = { size };
    if (campaignId != null) params.campaign_id = campaignId;
    if (status) params.status = status;
    if (page != null) params.page = page;
    return this.http.get<any>(`${this.base}prospects`, { params });
  }

  getProspect(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}prospects/${id}`);
  }

  updateProspect(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}prospects/${id}`, data);
  }

  // Emails
  getEmails(campaignId?: number, variant?: string): Observable<any[]> {
    let params: any = {};
    if (campaignId != null) params.campaign_id = campaignId;
    if (variant) params.variant = variant;
    return this.http.get<any[]>(`${this.base}emails`, { params });
  }

  getEmailPreviewUrl(emailId: number): string {
    return `${this.base}emails/${emailId}/preview`;
  }

  updateEmail(emailId: number, subject: string, bodyHtml: string): Observable<any> {
    return this.http.put<any>(`${this.base}emails/${emailId}`, { subject, body_html: bodyHtml });
  }

  regenerateEmail(emailId: number): Observable<any> {
    return this.http.post<any>(`${this.base}emails/${emailId}/regenerate`, {});
  }

  // Pipeline actions
  discover(campaignId: number, provinces?: string[], useIsquad = true, useFutbolteca = true, useWebSearch = false): Observable<any> {
    return this.http.post<any>(`${this.base}discover`, {
      campaign_id: campaignId, provinces, use_isquad: useIsquad,
      use_futbolteca: useFutbolteca, use_web_search: useWebSearch
    });
  }

  enrich(campaignId: number, maxClubs = 50, searchWeb = false, delay = 1.5): Observable<any> {
    return this.http.post<any>(`${this.base}enrich`, {
      campaign_id: campaignId, max_clubs: maxClubs, search_web: searchWeb, delay
    });
  }

  analyze(campaignId: number, maxClubs?: number): Observable<any> {
    return this.http.post<any>(`${this.base}analyze`, {
      campaign_id: campaignId, max_clubs: maxClubs
    });
  }

  generate(campaignId: number, ratio = 0.5): Observable<any> {
    return this.http.post<any>(`${this.base}generate`, {
      campaign_id: campaignId, ratio
    });
  }

  sendEmails(campaignId: number, dryRun = true): Observable<any> {
    return this.http.post<any>(`${this.base}send`, {
      campaign_id: campaignId, dry_run: dryRun
    });
  }

  // Jobs
  getJob(jobId: string): Observable<any> {
    return this.http.get<any>(`${this.base}jobs/${jobId}`);
  }
}
