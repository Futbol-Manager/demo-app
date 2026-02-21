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
  createProspect(data: {
    campaign_id: number; name: string; city?: string; province?: string;
    community?: string; category?: string; website?: string; email?: string;
    phone?: string; instagram?: string; twitter?: string; facebook?: string;
    estimated_teams?: number; has_youth_academy?: boolean;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}prospects`, data);
  }

  getProspectCampaigns(prospectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}prospects/${prospectId}/campaigns`);
  }

  generateEmailForProspect(prospectId: number, campaignId: number, instruction?: string): Observable<any> {
    const body = instruction ? { instruction } : {};
    return this.http.post<any>(`${this.base}prospects/${prospectId}/generate-email?campaign_id=${campaignId}`, body);
  }

  sendSingleEmail(emailId: number, recipientEmail: string): Observable<any> {
    return this.http.post<any>(`${this.base}emails/${emailId}/send-to`, { recipient_email: recipientEmail });
  }

  getCampaignPromptConfig(campaignId: number): Observable<any> {
    return this.http.get<any>(`${this.base}campaigns/${campaignId}/prompt-config`);
  }

  updateCampaignPromptConfig(campaignId: number, config: any): Observable<any> {
    return this.http.put<any>(`${this.base}campaigns/${campaignId}/prompt-config`, config);
  }

  getProspects(
    campaignId?: number, status?: string, page?: number, size: number = 50,
    search?: string, sortBy: string = 'pain_score', sortDir: string = 'desc'
  ): Observable<any> {
    let params: any = { size, sort_by: sortBy, sort_dir: sortDir };
    if (campaignId != null) params.campaign_id = campaignId;
    if (status) params.status = status;
    if (page != null) params.page = page;
    if (search) params.search = search;
    return this.http.get<any>(`${this.base}prospects`, { params });
  }

  getProspect(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}prospects/${id}`);
  }

  updateProspect(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}prospects/${id}`, data);
  }

  deleteProspect(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}prospects/${id}`);
  }

  bulkDeleteProspects(ids: number[]): Observable<any> {
    return this.http.post<any>(`${this.base}prospects/bulk-delete`, { prospect_ids: ids });
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

  deleteEmail(emailId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}emails/${emailId}`);
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

  deleteCampaign(campaignId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}campaigns/${campaignId}`);
  }

  archiveCampaign(campaignId: number): Observable<any> {
    return this.http.put<any>(`${this.base}campaigns/${campaignId}/archive`, {});
  }

  addClubsToCampaign(campaignId: number, prospectIds: number[], abRatio = 0.5): Observable<any> {
    return this.http.post<any>(`${this.base}campaigns/${campaignId}/clubs`, {
      prospect_ids: prospectIds, ab_ratio: abRatio
    });
  }

  removeClubFromCampaign(campaignId: number, prospectId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}campaigns/${campaignId}/clubs/${prospectId}`);
  }

  setClubAbGroup(campaignId: number, prospectId: number, abGroup: 'A' | 'B' | null): Observable<any> {
    return this.http.patch<any>(
      `${this.base}campaigns/${campaignId}/clubs/${prospectId}/ab-group`,
      { ab_group: abGroup }
    );
  }

  // Jobs
  getJob(jobId: string): Observable<any> {
    return this.http.get<any>(`${this.base}jobs/${jobId}`);
  }

  // AI Settings
  getSettings(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`${this.base}settings`);
  }

  updateSetting(key: string, value: string): Observable<any> {
    return this.http.put<any>(`${this.base}settings/${key}`, { value });
  }
}
