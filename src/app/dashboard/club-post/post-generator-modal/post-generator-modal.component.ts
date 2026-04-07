import {
  Component, ElementRef, EventEmitter, Input,
  OnInit, Output, ViewChild
} from '@angular/core';
import html2canvas from 'html2canvas';
import { TranslateService } from '@ngx-translate/core';
import { DemoPost, DemoTeam } from '../club-post.component';

export type PostType = 'pre' | 'post' | 'jornada';

export interface JornadaMatch {
  homeTeam: string;
  awayTeam: string;
  time: string;
  competition: string;
}

@Component({
  selector: 'app-post-generator-modal',
  templateUrl: './post-generator-modal.component.html',
  styleUrls: ['./post-generator-modal.component.scss'],
})
export class PostGeneratorModalComponent implements OnInit {
  @ViewChild('templateEl') templateEl!: ElementRef<HTMLElement>;

  @Input() clubId = 0;
  @Input() teamId = 0;
  @Input() teamName = '';
  @Input() teams: DemoTeam[] = [];
  @Input() existingPost: DemoPost | null = null;

  @Output() saved = new EventEmitter<DemoPost>();
  @Output() closed = new EventEmitter<void>();

  templateType: PostType = 'pre';
  exporting = false;
  saving = false;
  clubName = 'FC Demo';
  clubLogoUrl: string | null = null;

  workingTeamId = 0;
  workingTeamName = '';

  homeTeamName = '';
  awayTeamName = '';
  homeLogoUrl: string | null = null;
  awayLogoUrl: string | null = null;
  matchDate = '';
  matchTime = '18:00';
  competition = '';
  matchday = '';
  venue = '';
  homeScore: number | null = null;
  awayScore: number | null = null;
  scorers = '';
  primaryColor = '#31b270';
  altColor = '#002c40';

  jornadaDate = '';
  jornadaTitle = 'Jornada del fin de semana';
  jornadaMatches: JornadaMatch[] = [];

  sportEmoji = '\u26bd';
  lockedHintVisible = false;
  private lockedHintTimer: any = null;

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.workingTeamId   = this.teamId;
    this.workingTeamName = this.teamName;
    this.jornadaDate     = this.rawDate(new Date());

    if (this.existingPost) {
      this.populateFromPost(this.existingPost);
    } else {
      this.matchDate    = this.formatDate(new Date());
      this.homeTeamName = this.clubName;
    }
  }

  onTeamSelected(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const t = this.teams.find(x => x.teamId === id);
    if (!t) return;
    this.workingTeamId   = t.teamId;
    this.workingTeamName = t.teamName;
    if (!this.homeTeamName) this.homeTeamName = t.teamName;
  }

  private populateFromPost(post: DemoPost): void {
    this.templateType    = post.postType as PostType;
    this.homeTeamName    = post.homeTeamName || '';
    this.awayTeamName    = post.awayTeamName || '';
    this.homeLogoUrl     = post.homeLogoUrl || null;
    this.awayLogoUrl     = post.awayLogoUrl || null;
    this.matchDate       = post.matchDate || this.formatDate(new Date());
    this.matchTime       = post.matchTime || '18:00';
    this.competition     = post.competition || '';
    this.matchday        = post.matchday || '';
    this.venue           = post.venue || '';
    this.homeScore       = post.homeScore ?? null;
    this.awayScore       = post.awayScore ?? null;
    this.scorers         = post.scorers || '';
    this.primaryColor    = post.primaryColor || '#31b270';
    this.altColor        = post.altColor || '#002c40';
    this.workingTeamId   = post.teamId || this.teamId;
    this.workingTeamName = post.teamName || this.teamName;

    if (post.metadata) {
      try {
        const meta = JSON.parse(post.metadata);
        if (meta.jornadaDate)    this.jornadaDate    = meta.jornadaDate;
        if (meta.jornadaTitle)   this.jornadaTitle   = meta.jornadaTitle;
        if (meta.jornadaMatches) this.jornadaMatches = meta.jornadaMatches;
      } catch { /* ignore */ }
    }
  }

  onHomeLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { this.homeLogoUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  onAwayLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { this.awayLogoUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  clearHomeLogo(): void { this.homeLogoUrl = null; }
  clearAwayLogo(): void { this.awayLogoUrl = null; }

  switchType(t: PostType): void {
    this.templateType = t;
    if (t === 'post') {
      if (this.homeScore === null) this.homeScore = 0;
      if (this.awayScore === null) this.awayScore = 0;
    }
    if (t === 'jornada' && this.jornadaMatches.length === 0) {
      this.addJornadaMatch();
    }
  }

  addJornadaMatch(): void {
    this.jornadaMatches = [...this.jornadaMatches, {
      homeTeam: '', awayTeam: '', time: '12:00', competition: ''
    }];
  }

  removeJornadaMatch(index: number): void {
    this.jornadaMatches = this.jornadaMatches.filter((_, i) => i !== index);
  }

  trackByIndex(index: number): number { return index; }

  showLockedHint(): void {
    this.lockedHintVisible = true;
    if (this.lockedHintTimer) clearTimeout(this.lockedHintTimer);
    this.lockedHintTimer = setTimeout(() => { this.lockedHintVisible = false; }, 2500);
  }

  savePost(): void {
    if (this.saving) return;
    this.saving = true;

    const metadata = this.templateType === 'jornada'
      ? JSON.stringify({ jornadaDate: this.jornadaDate, jornadaTitle: this.jornadaTitle, jornadaMatches: this.jornadaMatches })
      : undefined;

    const post: DemoPost = {
      id:            this.existingPost?.id || 0,
      clubId:        this.clubId,
      teamId:        this.workingTeamId,
      teamName:      this.workingTeamName,
      postType:      this.templateType,
      homeTeamName:  this.homeTeamName,
      awayTeamName:  this.awayTeamName,
      homeLogoUrl:   this.homeLogoUrl || undefined,
      awayLogoUrl:   this.awayLogoUrl || undefined,
      matchDate:     this.templateType === 'jornada' ? this.jornadaDate : this.matchDate,
      matchTime:     this.matchTime,
      competition:   this.competition,
      matchday:      this.matchday,
      venue:         this.venue,
      homeScore:     this.templateType === 'post' ? this.homeScore : null,
      awayScore:     this.templateType === 'post' ? this.awayScore : null,
      scorers:       this.scorers,
      primaryColor:  this.primaryColor,
      altColor:      this.altColor,
      metadata,
      createdAt:     this.existingPost?.createdAt || new Date().toISOString(),
    };

    setTimeout(() => {
      this.saving = false;
      this.saved.emit(post);
    }, 400);
  }

  async exportPng(): Promise<void> {
    if (this.exporting || !this.templateEl) return;
    this.exporting = true;
    try {
      const canvas = await html2canvas(this.templateEl.nativeElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      const link  = document.createElement('a');
      const label = this.templateType === 'pre' ? 'pre-partido'
                  : this.templateType === 'post' ? 'resultado'
                  : 'jornada';
      const team  = (this.workingTeamName || 'club').replace(/\s+/g, '-').toLowerCase();
      link.download = `${label}-${team}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      this.exporting = false;
    }
  }

  get darkerAlt(): string { return this.shiftBrightness(this.altColor, -20); }
  get primaryRgba20(): string { return this.hexToRgba(this.primaryColor, 0.2); }
  get primaryRgba10(): string { return this.hexToRgba(this.primaryColor, 0.1); }

  formatDate(d: Date): string {
    try {
      const lang = this.translate?.currentLang || 'es';
      return d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  }

  rawDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatJornadaDate(raw: string): string {
    if (!raw) return '';
    const d = new Date(raw + 'T12:00:00');
    return this.formatDate(d);
  }

  private hexToRgba(hex: string, alpha: number): string {
    if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private shiftBrightness(hex: string, amount: number): string {
    if (!hex || hex.length < 7) return hex;
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }
}
