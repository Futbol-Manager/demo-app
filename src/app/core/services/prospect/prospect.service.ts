import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

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

  // ── Datos mock para el módulo de RRSS en modo demo ────────────────────────

  /** Posts sociales de ejemplo distribuidos en la semana actual (modo demo). */
  private demoSocialPosts(): any[] {
    const base = new Date();
    const at = (dayOffset: number, hour: number): string => {
      const d = new Date(base);
      d.setDate(base.getDate() + dayOffset);
      d.setHours(hour, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00:00`;
    };
    return [
      { post_id: 101, network: 'instagram', content_type: 'feature', status: 'PUBLISHED', scheduled_at: at(-1, 18),
        text_content: '¡Victoria del Juvenil A este fin de semana! 3-1 con doblete de García. 💪⚽ #FCDemo', image_url: '', is_thread: 0 },
      { post_id: 102, network: 'facebook', content_type: 'stats', status: 'APPROVED', scheduled_at: at(0, 12),
        text_content: 'Ya está abierto el plazo de inscripción para la temporada 2026/27. ¡Apúntate!', image_url: '', is_thread: 0 },
      { post_id: 103, network: 'twitter', content_type: 'tip', status: 'DRAFT', scheduled_at: at(0, 20),
        text_content: 'Consejo del cuerpo técnico: la hidratación empieza el día antes del partido. 💧', image_url: '', is_thread: 0,
        external_post_id: null },
      { post_id: 104, network: 'linkedin', content_type: 'case_study', status: 'SCHEDULED', scheduled_at: at(1, 9),
        text_content: 'Cómo digitalizamos la gestión del club con Sphaira: menos papeleo, más deporte.', image_url: '', is_thread: 0 },
      { post_id: 105, network: 'twitter', content_type: 'feature', status: 'PUBLISHED', scheduled_at: at(2, 13),
        text_content: 'Hilo: las 5 claves de la pretemporada 🧵', image_url: '', is_thread: 1,
        thread_tweets: JSON.stringify([{ text: 'Las 5 claves de la pretemporada 🧵' }, { text: '1. Carga progresiva' }]),
        external_post_id: '1789456123' },
      { post_id: 106, network: 'instagram', content_type: 'behind_scenes', status: 'REJECTED', scheduled_at: at(3, 18),
        text_content: 'Entrenamiento a puerta abierta este miércoles.', image_url: '', is_thread: 0 },
    ];
  }

  private demoNetworkConfig(network: string): any {
    const withImage = network === 'instagram' || network === 'facebook';
    return {
      network,
      topics: JSON.stringify(['Caso de éxito', 'Dato del sector', 'Tutorial']),
      tone: 'cercano',
      audience: 'Familias y jugadores del club',
      post_frequency: 1,
      default_hashtags: JSON.stringify(['#FCDemo', '#futbolbase']),
      extra_instructions: '',
      text_ai_model: 'claude-sonnet-4-6',
      image_ai_model: 'dalle3',
      include_image: withImage ? 1 : 0,
    };
  }

  // ── Social posts CRUD → Java backend (MySQL compartida) ───────────────────

  getSocialPostsJava(network?: string, status?: string, campaignId?: number): Observable<any[]> {
    if (isDemoMode()) {
      let list = this.demoSocialPosts();
      if (network) list = list.filter(p => p.network === network);
      if (status) list = list.filter(p => p.status === status);
      return of(list);
    }
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
    if (isDemoMode()) {
      return of({ ...data, post_id: Date.now() });
    }
    return this.http.post<any>(`${this.javaBase}social/posts`, data).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  updateSocialPostJava(postId: number, data: any): Observable<any> {
    if (isDemoMode()) {
      return of({ ...data, post_id: postId });
    }
    return this.http.put<any>(`${this.javaBase}social/posts/${postId}`, data).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  deleteSocialPostJava(postId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ post_id: postId, deleted: true });
    }
    return this.http.delete<any>(`${this.javaBase}social/posts/${postId}`).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  approveSocialPostJava(postId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ post_id: postId, status: 'APPROVED' });
    }
    return this.http.post<any>(`${this.javaBase}social/posts/${postId}/approve`, {}).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  rejectSocialPostJava(postId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ post_id: postId, status: 'REJECTED' });
    }
    return this.http.post<any>(`${this.javaBase}social/posts/${postId}/reject`, {}).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  schedulePostJava(postId: number, scheduledAt: string): Observable<any> {
    if (isDemoMode()) {
      return of({ post_id: postId, scheduled_at: scheduledAt });
    }
    return this.http.put<any>(`${this.javaBase}social/posts/${postId}/schedule`, { scheduled_at: scheduledAt }).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  getCalendarPostsJava(start: string, end: string): Observable<any[]> {
    if (isDemoMode()) {
      return of(this.demoSocialPosts());
    }
    return this.http.get<any>(`${this.javaBase}social/posts/calendar`, { params: { start, end } }).pipe(
      map((r: any) => r?.data ?? r ?? [])
    );
  }

  getNetworkConfigJava(network: string): Observable<any> {
    if (isDemoMode()) {
      return of(this.demoNetworkConfig(network));
    }
    return this.http.get<any>(`${this.javaBase}social/network-config/${network}`).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  updateNetworkConfigJava(network: string, config: {
    topics: string; tone: string; audience: string; post_frequency: number;
    default_hashtags: string; extra_instructions: string;
    text_ai_model: string; image_ai_model: string; include_image: number;
  }): Observable<any> {
    if (isDemoMode()) {
      return of({ network, ...config });
    }
    return this.http.put<any>(`${this.javaBase}social/network-config/${network}`, config).pipe(
      map((r: any) => r?.data ?? r)
    );
  }

  getAIKeys(): Observable<Record<string, boolean>> {
    if (isDemoMode()) {
      return of({ anthropic_api_key: true, openai_api_key: true, replicate_api_token: false, gemini_api_key: false, gcp_project_id: false });
    }
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
    if (isDemoMode()) {
      return of({ ok: true, key });
    }
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
    if (isDemoMode()) {
      return of({
        text_content: `¡En ${params.network === 'twitter' ? 'X' : params.network} tenemos novedades! Nuestro club sigue creciendo gracias a Sphaira. ⚽ #FCDemo`,
        image_prompt: 'Jugadores de fútbol base celebrando en un campo verde al atardecer',
        post_id: Date.now(),
      });
    }
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
    if (isDemoMode()) {
      return of({ ok: true, image_url: 'https://picsum.photos/seed/fcdemo' + postId + '/600/600', model_used: imageModel || 'dalle3' });
    }
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
    if (isDemoMode()) {
      const n = options.num_tweets ?? 5;
      const tweets = Array.from({ length: n }, (_, i) => ({
        text: i === 0
          ? 'Hilo: las claves de esta temporada en el FC Demo 🧵⚽'
          : `${i}. ${['Trabajo de cantera', 'Compromiso del cuerpo técnico', 'Apoyo de las familias', 'Instalaciones renovadas', 'Digitalización con Sphaira', 'Objetivos de ascenso', 'Valores de equipo'][i % 7]}.`,
      }));
      return of({ ok: true, tweets });
    }
    return this.http.post<any>(
      `${this.base}social/generate-thread`, options
    ).pipe(timeout(90_000));
  }

  getPostMetrics(postId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ ok: true, metrics: { impressions: 1240 + postId, likes: 87, retweets: 14, replies: 6 } });
    }
    return this.http.get<any>(`${this.base}social/posts/${postId}/metrics`);
  }

  adaptForNetworks(text: string, sourceNetwork: string, networks: string[]): Observable<any> {
    if (isDemoMode()) {
      return of({
        ok: true,
        versions: networks.map(net => ({
          network: net,
          is_original: net === sourceNetwork,
          text: net === sourceNetwork
            ? text
            : `[${net}] ${text}`.slice(0, net === 'twitter' ? 280 : 3000),
        })),
      });
    }
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
    if (isDemoMode()) {
      const nets = payload.networks?.length || 3;
      const created = Math.max(1, nets * 6);
      return of({ ok: true, created, post_ids: Array.from({ length: created }, (_, i) => 2000 + i), errors: [] });
    }
    return this.http.post<any>(
      `${this.base}social/generate-monthly-plan`, payload
    ).pipe(timeout(300_000));
  }

  getSocialTokens(): Observable<Record<string, boolean>> {
    if (isDemoMode()) {
      return of({ meta_access_token: true, meta_ig_user_id: true, meta_fb_page_id: true, linkedin_access_token: false, linkedin_author_urn: false, twitter_api_key: false, twitter_api_secret: false, twitter_access_token: false, twitter_access_secret: false });
    }
    return this.http.get<Record<string, boolean>>(`${this.base}social/tokens`);
  }

  updateSocialToken(key: string, value: string): Observable<any> {
    if (isDemoMode()) {
      return of({ ok: true, key });
    }
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
    if (isDemoMode()) {
      let list = [
        { log_id: 1, platform: 'instagram', status: 'PENDING', comment_text: '¿A qué hora es el partido del sábado?', reply_text: null, created_at: new Date(Date.now() - 3600_000).toISOString() },
        { log_id: 2, platform: 'facebook', status: 'REPLIED', comment_text: '¡Enhorabuena por la victoria!', reply_text: '¡Gracias por el apoyo! 💚', created_at: new Date(Date.now() - 7200_000).toISOString() },
        { log_id: 3, platform: 'instagram', status: 'SKIPPED', comment_text: 'spam link promo', reply_text: null, created_at: new Date(Date.now() - 86_400_000).toISOString() },
        { log_id: 4, platform: 'facebook', status: 'PENDING', comment_text: '¿Dónde puedo inscribir a mi hijo?', reply_text: null, created_at: new Date(Date.now() - 1800_000).toISOString() },
      ];
      if (platform) list = list.filter(c => c.platform === platform);
      if (status) list = list.filter(c => c.status === status);
      return of(list);
    }
    const params: any = { limit };
    if (platform) params['platform'] = platform;
    if (status)   params['status']   = status;
    return this.http.get<any[]>(`${this.base}social/comments`, { params });
  }

  replyComment(logId: number, replyText: string): Observable<any> {
    if (isDemoMode()) {
      return of({ ok: true, log_id: logId, reply_text: replyText });
    }
    return this.http.post<any>(`${this.base}social/comments/${logId}/reply`, { reply_text: replyText });
  }

  skipComment(logId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ ok: true, log_id: logId, status: 'SKIPPED' });
    }
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
    if (isDemoMode()) {
      return of({
        text_models: [
          { key: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'Anthropic' },
          { key: 'gpt-4.1', label: 'GPT-4.1', provider: 'OpenAI' },
          { key: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
        ],
        image_models: [
          { key: 'dalle3', label: 'DALL-E 3' },
          { key: 'flux-pro', label: 'Flux 1.1 Pro' },
        ],
        default_text_model: 'claude-sonnet-4-6',
        default_image_model: 'dalle3',
      });
    }
    return this.http.get<any>(`${this.base}social/ai-models`);
  }

  getCalendarPosts(start: string, end: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}social/posts/calendar`, { params: { start, end } });
  }

  batchSchedulePosts(slots: { network: string; scheduled_at: string; content_type: string; generate_text: boolean }[]): Observable<any> {
    if (isDemoMode()) {
      return of({ ok: true, created: slots.length, post_ids: slots.map((_, i) => 3000 + i) });
    }
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
