import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import html2canvas from 'html2canvas';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClubService } from 'src/app/core/services/club/club.service';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';
import { SportContextService } from 'src/app/core/services/sport-context/sport-context.service';

export type MatchPostType = 'pre' | 'post';

export interface MatchPostData {
  homeTeamName: string;
  homeLogoUrl: string | null;
  awayTeamName: string;
  awayLogoUrl: string | null;
  matchDate: string;
  matchTime: string;
  competition: string;
  matchday: string;
  venue: string;
  homeScore: number | null;
  awayScore: number | null;
  scorers: string;
  primaryColor: string;
  secondaryColor: string;
}

@Component({
  selector: 'app-rrss-match-post',
  templateUrl: './rrss-match-post.component.html',
  styleUrls: ['./rrss-match-post.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RrssMatchPostComponent implements OnInit {
  @ViewChild('templateEl') templateEl!: ElementRef<HTMLElement>;

  templateType: MatchPostType = 'pre';
  exporting = false;
  clubName = '';
  sportConfig: SportConfig = getSportConfig();

  data: MatchPostData = {
    homeTeamName: '',
    homeLogoUrl: null,
    awayTeamName: '',
    awayLogoUrl: null,
    matchDate: '',
    matchTime: '18:00',
    competition: '',
    matchday: '',
    venue: '',
    homeScore: null,
    awayScore: null,
    scorers: '',
    primaryColor: '#31b270',
    secondaryColor: '#002c40',
  };

  constructor(
    private clubService: ClubService,
    private translate: TranslateService,
    private sportContext: SportContextService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.sportConfig = this.sportContext.getConfig();
    const userId = Number(sessionStorage.getItem('userId') || '0');
    if (userId) {
      this.clubService.getClubByUserId(userId).subscribe({
        next: (res: any) => {
          const club = res?.data || res;
          this.clubName = club?.name || '';
          if (!this.data.homeTeamName) {
            this.data.homeTeamName = club?.name || '';
          }
          if (club?.picture) {
            this.data.homeLogoUrl = club.picture;
          }
          if (club?.brandColor) {
            this.data.primaryColor = club.brandColor;
          }
          if (club?.altColor) {
            this.data.secondaryColor = club.altColor;
          }
          this.cdr.markForCheck();
        },
      });
    }
    this.data.matchDate = this.formatDate(new Date());
  }

  formatDate(d: Date): string {
    try {
      const lang = this.translate?.currentLang || 'es';
      return d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  }

  onHomeLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { this.data.homeLogoUrl = e.target?.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  onAwayLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { this.data.awayLogoUrl = e.target?.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  clearHomeLogo(): void { this.data.homeLogoUrl = null; }
  clearAwayLogo(): void { this.data.awayLogoUrl = null; }

  switchType(t: MatchPostType): void {
    this.templateType = t;
    if (t === 'post') {
      if (this.data.homeScore === null) this.data.homeScore = 0;
      if (this.data.awayScore === null) this.data.awayScore = 0;
    }
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
      const link = document.createElement('a');
      const label = this.templateType === 'pre' ? 'pre-partido' : 'resultado';
      const team = (this.data.homeTeamName || 'club').replace(/\s+/g, '-').toLowerCase();
      link.download = `${label}-${team}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      this.exporting = false;
      this.cdr.markForCheck();
    }
  }

  get darkerSecondary(): string {
    return this.shiftBrightness(this.data.secondaryColor, -20);
  }

  get primaryRgba20(): string { return this.hexToRgba(this.data.primaryColor, 0.2); }
  get primaryRgba10(): string { return this.hexToRgba(this.data.primaryColor, 0.1); }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private shiftBrightness(hex: string, amount: number): string {
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
