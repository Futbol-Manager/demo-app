import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProspectService {

  private base = (environment as any).prospectorApiUrl || 'http://localhost:8001/api/';

  constructor(private http: HttpClient) { }

  getAIKeys(): Observable<Record<string, boolean>> {
    return this.http.get<Record<string, boolean>>(`${this.base}settings/ai-keys`);
  }

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

  // ── Follow-up sequences ──────────────────────────────────────────────────

  getFollowupConfig(campaignId: number): Observable<any> {
    return this.http.get<any>(`${this.base}campaigns/${campaignId}/followup-config`);
  }

  updateFollowupConfig(campaignId: number, config: any): Observable<any> {
    return this.http.put<any>(`${this.base}campaigns/${campaignId}/followup-config`, config);
  }

  getFollowupStats(campaignId: number): Observable<any> {
    return this.http.get<any>(`${this.base}campaigns/${campaignId}/followup-stats`);
  }

  scheduleFollowup(emailId: number): Observable<any> {
    return this.http.post<any>(`${this.base}emails/${emailId}/schedule-followup`, {});
  }

  // ── Social posts (RRSS) ──────────────────────────────────────────────────

  getSocialMeta(): Observable<any> {
    return this.http.get<any>(`${this.base}social/meta`);
  }

  generateSocialPost(params: {
    network: string;
    content_type: string;
    extra_context?: string;
    campaign_id?: number | null;
    cta_url?: string;
    tone?: string;
    objective?: string;
    target_audience?: string;
    specific_feature?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}social/generate`, params);
  }

  optimizeSocialPrompt(params: {
    raw_context: string;
    network: string;
    content_type: string;
    tone: string;
    objective: string;
    target_audience: string;
    specific_feature: string;
  }): Observable<{ optimized_prompt: string }> {
    return this.http.post<{ optimized_prompt: string }>(`${this.base}social/optimize-prompt`, params);
  }

  autoplanSocialContent(numPosts: number = 7, platforms: string = 'instagram,facebook,linkedin,twitter'): Observable<{ plan: any[]; count: number }> {
    return this.http.post<{ plan: any[]; count: number }>(
      `${this.base}social/auto-plan?num_posts=${numPosts}&platforms=${platforms}`, {}
    );
  }

  getSocialHistory(days: number = 60): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}social/history?days=${days}`);
  }

  getSocialPosts(network?: string, status?: string, campaignId?: number): Observable<any[]> {
    let params: any = {};
    if (network) params.network = network;
    if (status) params.status = status;
    if (campaignId != null) params.campaign_id = campaignId;
    return this.http.get<any[]>(`${this.base}social/posts`, { params });
  }

  updateSocialPost(postId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}social/posts/${postId}`, data);
  }

  approveSocialPost(postId: number): Observable<any> {
    return this.http.post<any>(`${this.base}social/posts/${postId}/approve`, {});
  }

  rejectSocialPost(postId: number): Observable<any> {
    return this.http.post<any>(`${this.base}social/posts/${postId}/reject`, {});
  }

  publishSocialPost(postId: number): Observable<any> {
    return this.http.post<any>(`${this.base}social/posts/${postId}/publish`, {});
  }

  deleteSocialPost(postId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}social/posts/${postId}`);
  }

  generatePostImage(postId: number, imagePrompt: string, network: string, contentType: string, imageModel = ''): Observable<{ok: boolean, image_url: string, model_used: string}> {
    return this.http.post<any>(`${this.base}social/posts/${postId}/generate-image`, {
      image_prompt: imagePrompt,
      network,
      content_type: contentType,
      image_model: imageModel,
    }).pipe(timeout(120_000));  // 2 min para modelos lentos como Ideogram/Recraft
  }

  getImageModels(): Observable<{models: {key: string, label: string}[], default: string, current: string}> {
    return this.http.get<any>(`${this.base}social/image-models`);
  }

  setImageModel(modelKey: string): Observable<any> {
    return this.http.put<any>(`${this.base}social/image-model`, { model_key: modelKey });
  }

  generateImagePrompt(textContent: string, network: string, contentType: string, imageModel: string): Observable<{ok: boolean, image_prompt: string}> {
    return this.http.post<any>(`${this.base}social/generate-image-prompt`, {
      text_content: textContent,
      network,
      content_type: contentType,
      image_model: imageModel,
    }).pipe(timeout(30_000));
  }

  getSocialTokens(): Observable<Record<string, boolean>> {
    return this.http.get<Record<string, boolean>>(`${this.base}social/tokens`);
  }

  updateSocialToken(key: string, value: string): Observable<any> {
    return this.http.put<any>(`${this.base}social/tokens/${key}`, { value });
  }

  // ── Prospect DMs ─────────────────────────────────────────────────────────

  generateProspectDMs(prospectId: number, network?: string): Observable<any> {
    return this.http.post<any>(`${this.base}prospects/${prospectId}/generate-dm`,
      network ? { network } : {}
    );
  }

  getProspectDMs(prospectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}prospects/${prospectId}/dms`);
  }

  updateDMStatus(prospectId: number, dmId: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.base}prospects/${prospectId}/dms/${dmId}/status`, { status });
  }

  // ── DM Templates ──────────────────────────────────────────────────────────

  getDMTemplates(network?: string): Observable<any[]> {
    const params: any = {};
    if (network) params['network'] = network;
    return this.http.get<any[]>(`${this.base}dm-templates`, { params });
  }

  createDMTemplate(network: string, templateName: string, templateText: string): Observable<any> {
    return this.http.post<any>(`${this.base}dm-templates`, {
      network, template_name: templateName, template_text: templateText,
    });
  }

  deleteDMTemplate(templateId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}dm-templates/${templateId}`);
  }

  useDMTemplate(templateId: number): Observable<any> {
    return this.http.post<any>(`${this.base}dm-templates/${templateId}/use`, {});
  }

  // ── Comment auto-reply ────────────────────────────────────────────────────

  getCommentGuidelines(): Observable<any> {
    return this.http.get<any>(`${this.base}social/comment-guidelines`);
  }

  updateCommentGuidelines(config: any): Observable<any> {
    return this.http.put<any>(`${this.base}social/comment-guidelines`, config);
  }

  getCommentLogs(platform?: string, status?: string, limit = 50): Observable<any[]> {
    const params: any = { limit };
    if (platform) params['platform'] = platform;
    if (status)   params['status']   = status;
    return this.http.get<any[]>(`${this.base}social/comments`, { params });
  }

  replyComment(logId: number, replyText: string): Observable<any> {
    return this.http.post<any>(`${this.base}social/comments/${logId}/reply`, { reply_text: replyText });
  }

  skipComment(logId: number): Observable<any> {
    return this.http.post<any>(`${this.base}social/comments/${logId}/skip`, {});
  }

  getWebhookInfo(): Observable<any> {
    return this.http.get<any>(`${this.base}social/webhook-info`);
  }

  // ── Engagement scores ─────────────────────────────────────────────────────

  recalculateCampaignScores(campaignId: number): Observable<any> {
    return this.http.post<any>(`${this.base}campaigns/${campaignId}/recalculate-scores`, {});
  }

  recalculateProspectScore(prospectId: number): Observable<any> {
    return this.http.post<any>(`${this.base}prospects/${prospectId}/recalculate-score`, {});
  }

  // ── Schedule social post ──────────────────────────────────────────────────

  schedulePost(postId: number, scheduledAt: string): Observable<any> {
    return this.http.put<any>(`${this.base}social/posts/${postId}/schedule`, { scheduled_at: scheduledAt });
  }
}
