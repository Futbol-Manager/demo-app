import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProspectService {

  private base = (environment as any).prospectorApiUrl || 'http://localhost:8001/api/';
  private javaBase: string = (environment as any).apiUrl || 'http://localhost:8080/api/rest/';

  /** Base del servidor del prospector sin el segmento /api/ (para URLs de /static/) */
  get staticBase(): string {
    return this.base.replace(/\/api\/?$/, '');
  }

  constructor(private http: HttpClient) { }

  // ── Social posts CRUD → Java backend (MySQL compartida) ───────────────────

  getSocialPostsJava(network?: string, status?: string, campaignId?: number): Observable<any[]> {
    let params: any = {};
    if (network) params['network'] = network;
    if (status) params['status'] = status;
    if (campaignId != null) params['campaign_id'] = campaignId;
    return this.http.get<any>(`${this.javaBase}social/posts`, { params }).pipe(
      map((r: any) => r?.data ?? r ?? [])
    );
  }

  createSocialPostJava(data: {
    network: string; content_type?: string; text_content?: string;
    image_prompt?: string; image_url?: string; hashtags?: string;
    scheduled_at?: string | null; status?: string;
    is_thread?: number; thread_tweets?: string | null;
  }): Observable<any> {
    return this.http.post<any>(`${this.javaBase}social/posts`, data).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  updateSocialPostJava(postId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.javaBase}social/posts/${postId}`, data).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  deleteSocialPostJava(postId: number): Observable<any> {
    return this.http.delete<any>(`${this.javaBase}social/posts/${postId}`).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  approveSocialPostJava(postId: number): Observable<any> {
    return this.http.post<any>(`${this.javaBase}social/posts/${postId}/approve`, {}).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  rejectSocialPostJava(postId: number): Observable<any> {
    return this.http.post<any>(`${this.javaBase}social/posts/${postId}/reject`, {}).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  schedulePostJava(postId: number, scheduledAt: string): Observable<any> {
    return this.http.put<any>(`${this.javaBase}social/posts/${postId}/schedule`, { scheduled_at: scheduledAt }).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  getCalendarPostsJava(start: string, end: string): Observable<any[]> {
    return this.http.get<any>(`${this.javaBase}social/posts/calendar`, { params: { start, end } }).pipe(
      map((r: any) => r?.data ?? r ?? [])
    );
  }

  getNetworkConfigJava(network: string): Observable<any> {
    return this.http.get<any>(`${this.javaBase}social/network-config/${network}`).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  updateNetworkConfigJava(network: string, config: {
    topics: string; tone: string; audience: string; post_frequency: number;
    default_hashtags: string; extra_instructions: string;
    text_ai_model: string; image_ai_model: string; include_image: number;
  }): Observable<any> {
    return this.http.put<any>(`${this.javaBase}social/network-config/${network}`, config).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

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

  updateProspect(id: number, data: Partial<{
    name: string; city: string; province: string; community: string;
    email: string; phone: string; website: string;
    instagram: string; twitter: string; facebook: string;
    estimated_teams: number; has_youth_academy: number;
    category: string; status: string; ab_group: string; notes: string;
  }>): Observable<any> {
    return this.http.put<any>(`${this.base}prospects/${id}`, data);
  }

  deleteProspect(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}prospects/${id}`);
  }

  convertToClient(id: number, notes?: string, clubId?: number): Observable<any> {
    return this.http.post<any>(`${this.base}prospects/${id}/convert-to-client`, {
      notes: notes ?? null,
      club_id: clubId ?? null,
    });
  }

  revertToProspect(id: number): Observable<any> {
    return this.http.post<any>(`${this.base}prospects/${id}/revert-to-prospect`, {});
  }

  getClients(search = '', page = 0, size = 50): Observable<{ total: number; items: any[] }> {
    const params: any = { page, size };
    if (search) params.search = search;
    return this.http.get<{ total: number; items: any[] }>(`${this.base}prospects/clients`, { params });
  }

  bulkDeleteProspects(ids: number[]): Observable<any> {
    return this.http.post<any>(`${this.base}prospects/bulk-delete`, { prospect_ids: ids });
  }

  // ── Importación CSV/Excel ────────────────────────────────────────────────

  importPreview(file: File): Observable<{
    columns: string[];
    mapping: Record<string, string | null>;
    sample: Record<string, string>[];
    total_rows: number;
  }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${this.base}prospects/import/preview`, form);
  }

  importConfirm(payload: {
    campaign_id?: number;
    mapping: Record<string, string | null>;
    file_b64: string;
    filename: string;
    skip_duplicates?: boolean;
  }): Observable<{ ok: boolean; inserted: number; duplicates: number; errors: string[]; total_processed: number }> {
    return this.http.post<any>(`${this.base}prospects/import/confirm`, payload);
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
  discover(campaignId: number, provinces?: string[], sources?: string[]): Observable<any> {
    return this.http.post<any>(`${this.base}discover`, {
      campaign_id: campaignId, provinces: provinces?.length ? provinces : undefined,
      sources: sources?.length ? sources : undefined
    });
  }

  getDiscoverSources(): Observable<{sources: {id: string, region: string, note: string}[]}> {
    return this.http.get<any>(`${this.base}discover/sources`);
  }

  enrich(campaignId: number, maxClubs = 50, searchWeb = true, delay = 1.5, forceReEnrich = false): Observable<any> {
    return this.http.post<any>(`${this.base}enrich`, {
      campaign_id: campaignId, max_clubs: maxClubs, search_web: searchWeb,
      delay, force_re_enrich: forceReEnrich
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

  createSocialPost(data: {
    network: string; content_type?: string; text_content?: string;
    image_prompt?: string; scheduled_at?: string | null; status?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}social/posts`, data);
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

  generateImagePrompt(textContent: string, network: string, contentType: string, imageModel: string, userDescription?: string): Observable<{ok: boolean, image_prompt: string}> {
    return this.http.post<any>(`${this.base}social/generate-image-prompt`, {
      text_content: textContent,
      network,
      content_type: contentType,
      image_model: imageModel,
      user_description: userDescription || '',
    }).pipe(timeout(30_000));
  }

  generateThread(postId: number, options: {
    extra_context?: string;
    num_tweets?: number;
    tone?: string;
    objective?: string;
  }): Observable<{ ok: boolean; tweets: { text: string; image_url?: string }[]; post_id: number }> {
    return this.http.post<any>(
      `${this.base}social/posts/${postId}/generate-thread`, options
    ).pipe(timeout(90_000));
  }

  generateThreadStandalone(options: {
    extra_context?: string;
    num_tweets?: number;
    tone?: string;
    objective?: string;
  }): Observable<{ ok: boolean; tweets: { text: string; image_url?: string }[] }> {
    return this.http.post<any>(
      `${this.base}social/generate-thread`, options
    ).pipe(timeout(90_000));
  }

  getPostMetrics(postId: number): Observable<any> {
    return this.http.get<any>(`${this.base}social/posts/${postId}/metrics`);
  }

  adaptForNetworks(text: string, sourceNetwork: string, networks: string[]): Observable<any> {
    return this.http.post<any>(`${this.base}social/adapt-for-networks`, {
      text, source_network: sourceNetwork, networks,
    }).pipe(timeout(120_000));
  }

  generateMonthlyPlan(payload: {
    start_date:    string;
    end_date:      string;
    times?:        string[];
    networks:      { network: string; posts_per_day: number; thread_ratio?: number }[];
    content_mix?:  { features: number; stories: number; tips: number; data: number; cta: number };
    tone?:         string;
    extra_context?: string;
  }): Observable<{ ok: boolean; created: number; post_ids: number[]; errors: string[] }> {
    return this.http.post<any>(
      `${this.base}social/generate-monthly-plan`, payload
    ).pipe(timeout(300_000));
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

  // ── Network config (RRSS module) ──────────────────────────────────────────

  getNetworkConfig(network: string): Observable<any> {
    return this.http.get<any>(`${this.base}social/network-config/${network}`);
  }

  updateNetworkConfig(network: string, config: {
    topics: string;
    tone: string;
    audience: string;
    post_frequency: number;
    default_hashtags: string;
    extra_instructions: string;
    text_ai_model: string;
    image_ai_model: string;
    include_image: number;
  }): Observable<any> {
    return this.http.put<any>(`${this.base}social/network-config/${network}`, config);
  }

  getAiModels(): Observable<{
    text_models: { key: string; label: string; provider: string }[];
    image_models: { key: string; label: string }[];
    default_text_model: string;
    default_image_model: string;
  }> {
    return this.http.get<any>(`${this.base}social/ai-models`);
  }

  getCalendarPosts(start: string, end: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}social/posts/calendar`, { params: { start, end } });
  }

  batchSchedulePosts(slots: { network: string; scheduled_at: string; content_type: string; generate_text: boolean }[]): Observable<any> {
    return this.http.post<any>(`${this.base}social/posts/batch-schedule`, { slots });
  }

  // ── CRM: Pipeline stages ──────────────────────────────────────────────────

  getPipelineStages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}pipeline/stages`);
  }

  createPipelineStage(name: string, color: string, position: number): Observable<any> {
    return this.http.post<any>(`${this.base}pipeline/stages`, { name, color, position });
  }

  updatePipelineStage(stageId: number, data: Partial<{ name: string; color: string; position: number; is_won: boolean; is_lost: boolean }>): Observable<any> {
    return this.http.put<any>(`${this.base}pipeline/stages/${stageId}`, data);
  }

  deletePipelineStage(stageId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}pipeline/stages/${stageId}`);
  }

  setProspectPipelineStage(prospectId: number, stageId: number | null, lostReason?: string): Observable<any> {
    return this.http.patch<any>(`${this.base}prospects/${prospectId}/pipeline-stage`, {
      stage_id: stageId, lost_reason: lostReason ?? null
    });
  }

  getKanban(campaignId?: number): Observable<any[]> {
    const params: any = {};
    if (campaignId) params.campaign_id = campaignId;
    return this.http.get<any[]>(`${this.base}pipeline/kanban`, { params });
  }

  // ── CRM: Interactions (Activity Log) ─────────────────────────────────────

  getInteractions(prospectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}prospects/${prospectId}/interactions`);
  }

  createInteraction(prospectId: number, data: {
    type: string; interaction_date: string; summary?: string;
    outcome: string; next_action_date?: string; next_action_text?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}prospects/${prospectId}/interactions`, data);
  }

  updateInteraction(interactionId: number, data: Partial<{
    type: string; interaction_date: string; summary: string;
    outcome: string; next_action_date: string; next_action_text: string;
  }>): Observable<any> {
    return this.http.put<any>(`${this.base}interactions/${interactionId}`, data);
  }

  deleteInteraction(interactionId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}interactions/${interactionId}`);
  }

  getPendingActions(daysAhead: number = 7): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}crm/pending-actions`, { params: { days_ahead: daysAhead } });
  }

  // ── CRM: Tags ─────────────────────────────────────────────────────────────

  getAllTags(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}tags`);
  }

  createTag(name: string, color: string): Observable<any> {
    return this.http.post<any>(`${this.base}tags`, { name, color });
  }

  deleteTagGlobal(tagId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}tags/${tagId}`);
  }

  getProspectTags(prospectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}prospects/${prospectId}/tags`);
  }

  assignTag(prospectId: number, tagId: number): Observable<any> {
    return this.http.post<any>(`${this.base}prospects/${prospectId}/tags/${tagId}`, {});
  }

  removeTag(prospectId: number, tagId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}prospects/${prospectId}/tags/${tagId}`);
  }

  // ── CRM: Analytics ────────────────────────────────────────────────────────

  getSalesFunnel(campaignId?: number): Observable<any[]> {
    const params: any = {};
    if (campaignId) params.campaign_id = campaignId;
    return this.http.get<any[]>(`${this.base}analytics/funnel`, { params });
  }

  getConversionStats(campaignId?: number): Observable<any> {
    const params: any = {};
    if (campaignId) params.campaign_id = campaignId;
    return this.http.get<any>(`${this.base}analytics/conversion`, { params });
  }

  getMonthlyTrends(months: number = 6): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}analytics/trends`, { params: { months } });
  }
}
