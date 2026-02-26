import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';

const NETWORKS = ['instagram', 'facebook', 'linkedin', 'twitter'] as const;
type Network = typeof NETWORKS[number];

/** Redes que soportan imagen generada automáticamente */
const IMAGE_NETWORKS = new Set<string>(['instagram', 'facebook']);

const CONTENT_TYPES = [
  { value: 'feature',       label: 'Funcionalidad' },
  { value: 'case_study',    label: 'Caso de éxito' },
  { value: 'tip',           label: 'Consejo' },
  { value: 'stats',         label: 'Estadística' },
  { value: 'question',      label: 'Pregunta' },
  { value: 'behind_scenes', label: 'Behind the scenes' },
];

const CHAR_LIMITS: Record<string, number> = {
  twitter: 280, instagram: 2200, facebook: 63206, linkedin: 3000,
};

const TWEET_CHAR_LIMIT = 280;

export interface ThreadTweet {
  text: string;
  image_url?: string;
}

const IMAGE_NETWORK_INFO: Record<string, { supported: boolean; hint: string; defaultOn: boolean }> = {
  instagram: { supported: true,  defaultOn: true,  hint: 'Instagram funciona mejor con imagen. Se generará automáticamente.' },
  facebook:  { supported: true,  defaultOn: true,  hint: 'Facebook admite imagen. Se generará automáticamente si está activado.' },
  linkedin:  { supported: false, defaultOn: false, hint: 'LinkedIn no genera imágenes automáticamente. Puedes subir una manualmente.' },
  twitter:   { supported: false, defaultOn: false, hint: 'Twitter/X suele publicar sin imagen. Puedes añadir una manualmente si quieres.' },
};

@Component({
  selector: 'app-post-editor-modal',
  templateUrl: './post-editor-modal.component.html',
  styleUrls: ['./post-editor-modal.component.scss'],
})
export class PostEditorModalComponent implements OnInit, OnChanges {
  @Input() post: any = null;
  @Input() presetNetwork: string | null = null;
  @Input() presetScheduledAt: string | null = null;

  @Output() saved  = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  networks     = NETWORKS;
  contentTypes = CONTENT_TYPES;
  imageInfo    = IMAGE_NETWORK_INFO;

  network:     Network = 'instagram';
  contentType  = 'feature';
  textContent  = '';
  imagePrompt  = '';
  scheduledAt  = '';
  imageUrl     = '';

  /** Indica si el usuario quiere incluir imagen en este post */
  includeImage = true;

  // ── Modo hilo (solo Twitter) ───────────────────────────────────────────────
  isThread   = false;
  threadTweets: ThreadTweet[] = [{ text: '' }, { text: '' }];

  networkConfig:  any      = null;
  networkTopics:  string[] = [];
  imageModels:    { key: string; label: string }[] = [];
  selectedImageModel = '';

  isGenerating      = false;
  isGeneratingImage = false;
  isSaving          = false;
  saveFeedback:       'ok' | 'err' | null = null;
  aiInstruction     = '';

  get charLimit(): number { return CHAR_LIMITS[this.network] ?? 3000; }
  get charPct():   number { return Math.min(100, (this.textContent.length / this.charLimit) * 100); }
  get textRows():  number { return this.network === 'twitter' ? 4 : 7; }
  get isTwitter(): boolean { return this.network === 'twitter'; }
  get tweetLimit(): number { return TWEET_CHAR_LIMIT; }

  tweetPct(tweet: ThreadTweet): number {
    return Math.min(100, ((tweet.text || '').length / TWEET_CHAR_LIMIT) * 100);
  }
  tweetOver(tweet: ThreadTweet): boolean {
    return (tweet.text || '').length > TWEET_CHAR_LIMIT;
  }

  constructor(private prospect: ProspectService) {}

  ngOnInit(): void {
    this.loadImageModels();
    this.initFromPost();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['post']) { this.initFromPost(); }
  }

  private loadImageModels(): void {
    this.prospect.getAiModels().subscribe({
      next: data => { this.imageModels = data.image_models || []; },
    });
  }

  private initFromPost(): void {
    if (this.post) {
      this.network     = this.post.network      || 'instagram';
      this.contentType = this.post.content_type || 'feature';
      this.textContent = this.post.text_content || '';
      this.imagePrompt = this.post.image_prompt || '';
      this.imageUrl    = this.post.image_url    || '';
      this.scheduledAt = this.post.scheduled_at ? this.toDatetimeLocal(this.post.scheduled_at) : '';
      // Hilo
      this.isThread = !!(this.post.is_thread);
      if (this.isThread && this.post.thread_tweets) {
        try {
          const parsed = typeof this.post.thread_tweets === 'string'
            ? JSON.parse(this.post.thread_tweets)
            : this.post.thread_tweets;
          this.threadTweets = Array.isArray(parsed) && parsed.length >= 1
            ? parsed
            : [{ text: this.textContent }, { text: '' }];
        } catch { this.threadTweets = [{ text: this.textContent }, { text: '' }]; }
      } else {
        this.threadTweets = [{ text: '' }, { text: '' }];
      }
    } else {
      this.network     = (this.presetNetwork as Network) || 'instagram';
      this.contentType = 'feature';
      this.textContent = '';
      this.imagePrompt = '';
      this.imageUrl    = '';
      this.scheduledAt = this.presetScheduledAt ? this.toDatetimeLocal(this.presetScheduledAt) : '';
      this.isThread    = false;
      this.threadTweets = [{ text: '' }, { text: '' }];
    }
    this.includeImage = this.imageInfo[this.network]?.defaultOn ?? false;
    this.loadNetworkConfig();
  }

  private toDatetimeLocal(dt: string): string {
    // Keep local time — just normalise the separator and take YYYY-MM-DDTHH:mm
    if (!dt) return '';
    // API returns "2026-03-02T08:01:00" or "2026-03-02 08:01:00"
    return dt.replace(' ', 'T').slice(0, 16);
  }

  loadNetworkConfig(): void {
    this.prospect.getNetworkConfig(this.network).subscribe({
      next: cfg => {
        this.networkConfig = cfg;
        try { this.networkTopics = JSON.parse(cfg.topics) || []; } catch { this.networkTopics = []; }
        // Respetar preferencia guardada de imagen si existe
        if (cfg.include_image !== undefined && cfg.include_image !== null) {
          this.includeImage = !!cfg.include_image;
        }
        this.selectedImageModel = cfg.image_ai_model || 'dalle3';
      },
    });
  }

  onNetworkChange(): void {
    this.includeImage = this.imageInfo[this.network]?.defaultOn ?? false;
    if (!this.isTwitter) { this.isThread = false; }
    this.loadNetworkConfig();
  }

  // ── Gestión del hilo ────────────────────────────────────────────────────────
  isGeneratingThread = false;
  threadNumTweets    = 5;

  toggleThread(): void {
    this.isThread = !this.isThread;
    if (this.isThread && this.threadTweets.length < 2) {
      // Si hay texto escrito, usarlo como primer tweet
      this.threadTweets = [{ text: this.textContent || '' }, { text: '' }];
    }
  }

  addTweet(): void {
    if (this.threadTweets.length < 25) {
      this.threadTweets = [...this.threadTweets, { text: '', image_url: '' }];
    }
  }

  removeTweet(i: number): void {
    if (this.threadTweets.length > 2) {
      this.threadTweets = this.threadTweets.filter((_, idx) => idx !== i);
    }
  }

  moveTweet(i: number, dir: -1 | 1): void {
    const j = i + dir;
    if (j < 0 || j >= this.threadTweets.length) return;
    const arr = [...this.threadTweets];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.threadTweets = arr;
  }

  /** Divide el texto actual en tweets de ≤280 chars (en límites de palabra) */
  autoSplitIntoThread(): void {
    const text = this.textContent.trim();
    if (!text) return;

    const LIMIT = 280;
    const words = text.split(/\s+/);
    const tweets: ThreadTweet[] = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= LIMIT) {
        current = candidate;
      } else {
        if (current) tweets.push({ text: current });
        current = word.length <= LIMIT ? word : word.slice(0, LIMIT - 1) + '…';
      }
    }
    if (current) tweets.push({ text: current });

    // Mínimo 2 tweets
    while (tweets.length < 2) tweets.push({ text: '' });

    this.threadTweets = tweets;
    this.isThread = true;
  }

  threadGenError = '';

  /** Genera con IA: hilo o post normal según el modo activo */
  generateWithAI(): void {
    if (this.isThread) {
      this._doGenerateThread();
    } else {
      this.generateText();
    }
  }

  private _doGenerateThread(): void {
    this.isGeneratingThread = true;
    this.threadGenError     = '';

    this.prospect.generateThreadStandalone({
      extra_context: this.aiInstruction || undefined,
      num_tweets:    this.threadNumTweets,
    }).subscribe({
      next: (res: any) => {
        this.isGeneratingThread = false;
        if (res.tweets?.length) {
          this.threadTweets = res.tweets.map((t: any) => ({
            text:      t.text      || '',
            image_url: t.image_url || '',
          }));
          this.textContent = this.threadTweets[0]?.text || '';
        }
      },
      error: (err: any) => {
        this.isGeneratingThread = false;
        this.threadGenError = err?.error?.detail || 'Error al generar el hilo. Inténtalo de nuevo.';
        setTimeout(() => { this.threadGenError = ''; }, 6000);
      },
    });
  }

  trackByIndex(i: number): number { return i; }

  get networkSupportsImage(): boolean {
    return IMAGE_NETWORKS.has(this.network);
  }

  get imageNetworkHint(): string {
    return this.imageInfo[this.network]?.hint || '';
  }

  addTopicToPrompt(topic: string): void {
    this.aiInstruction = this.aiInstruction ? `${this.aiInstruction}, ${topic}` : topic;
  }

  generateText(): void {
    this.isGenerating = true;
    this.prospect.generateSocialPost({
      network:       this.network,
      content_type:  this.contentType,
      extra_context: this.aiInstruction || undefined,
    }).subscribe({
      next: (res: any) => {
        this.isGenerating = false;
        this.textContent  = res.text_content || res.post?.text_content || '';
        this.imagePrompt  = res.image_prompt  || res.post?.image_prompt || this.imagePrompt;
        if (res.post_id || res.post?.post_id) {
          const pid = res.post_id || res.post?.post_id;
          this.post = { ...(this.post || {}), post_id: pid, network: this.network };
        }
      },
      error: () => { this.isGenerating = false; },
    });
  }

  generateImage(): void {
    if (!this.post?.post_id || !this.imagePrompt.trim()) return;
    this.isGeneratingImage = true;
    this.prospect.generatePostImage(
      this.post.post_id, this.imagePrompt, this.network, this.contentType,
      this.selectedImageModel
    ).subscribe({
      next: (res: any) => {
        this.isGeneratingImage = false;
        this.imageUrl = res.image_url || '';
        this.post     = { ...this.post, image_url: this.imageUrl };
      },
      error: () => { this.isGeneratingImage = false; },
    });
  }

  removeImage(): void {
    this.imageUrl    = '';
    this.imagePrompt = '';
    if (this.post) { this.post = { ...this.post, image_url: '' }; }
  }

  saveDraft():    void { this.save('DRAFT');     }
  saveApproved(): void { this.save('APPROVED');  }
  publishNow():   void { this.save('PUBLISHED'); }

  private save(status: string): void {
    this.isSaving     = true;
    this.saveFeedback = null;

    const scheduledAtIso = this.scheduledAt
      ? this.scheduledAt.replace('T', ' ') + ':00'
      : null;

    // En modo hilo el text_content es el primer tweet
    const mainText = this.isThread
      ? (this.threadTweets[0]?.text || '')
      : this.textContent;

    // Incluir tweets aunque estén vacíos para no perder el orden
    const tweetsToSave = this.isThread
      ? this.threadTweets.filter(t => (t.text || '').trim())
      : [];

    const payload: any = {
      text_content:   mainText,
      image_prompt:   this.includeImage ? this.imagePrompt : '',
      image_url:      this.imageUrl,
      status,
      scheduled_at:   scheduledAtIso,
      network:        this.network,
      content_type:   this.contentType,
      is_thread:      this.isThread ? 1 : 0,
      thread_tweets:  this.isThread && tweetsToSave.length
        ? JSON.stringify(tweetsToSave)
        : null,
    };

    const onSuccess = (result: any) => {
      this.isSaving     = false;
      this.saveFeedback = 'ok';
      // Actualizar post_id local para que los siguientes guardados sean UPDATE
      if (result?.post_id && !this.post?.post_id) {
        this.post = { ...(this.post || {}), post_id: result.post_id, network: this.network };
      }
      setTimeout(() => { this.saveFeedback = null; }, 3000);
      this.saved.emit(result);
    };
    const onError = () => {
      this.isSaving     = false;
      this.saveFeedback = 'err';
      setTimeout(() => { this.saveFeedback = null; }, 4000);
    };

    if (this.post?.post_id) {
      this.prospect.updateSocialPost(this.post.post_id, payload).subscribe({ next: onSuccess, error: onError });
    } else {
      this.prospect.createSocialPost(payload).subscribe({ next: onSuccess, error: onError });
    }
  }

  networkIcon(network: string): string {
    const icons: Record<string, string> = {
      instagram: 'bi-instagram', facebook: 'bi-facebook',
      linkedin: 'bi-linkedin',   twitter: 'bi-twitter-x',
    };
    return icons[network] || 'bi-share';
  }

  imageModelLabel(key: string): string {
    return this.imageModels.find(m => m.key === key)?.label || key;
  }
}
