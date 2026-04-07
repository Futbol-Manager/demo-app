import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

export interface DemoTeam {
  teamId: number;
  teamName: string;
}

export interface DemoPost {
  id: number;
  clubId: number;
  teamId: number;
  teamName?: string;
  postType: 'pre' | 'post' | 'jornada';
  homeTeamName: string;
  awayTeamName: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  matchDate: string;
  matchTime?: string;
  competition?: string;
  matchday?: string;
  venue?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  scorers?: string;
  primaryColor?: string;
  altColor?: string;
  thumbnailUrl?: string;
  metadata?: string;
  createdAt?: string;
}

const DEMO_TEAMS: DemoTeam[] = [
  { teamId: 1, teamName: 'Juniors A' },
  { teamId: 2, teamName: 'Juniors B' },
  { teamId: 3, teamName: 'Juvenil Divisi\u00f3n de Honor' },
  { teamId: 4, teamName: 'Juvenil Liga Nacional' },
  { teamId: 5, teamName: 'Cadete Superliga' },
  { teamId: 6, teamName: 'Alev\u00edn Primera' },
];

const DEMO_POSTS: DemoPost[] = [
  {
    id: 1, clubId: 1, teamId: 1, teamName: 'Juniors A',
    postType: 'pre', homeTeamName: 'FC Demo', awayTeamName: 'Rival FC',
    matchDate: 'S\u00e1bado 12 de Abril', matchTime: '18:00',
    competition: 'Liga Regional', matchday: 'J22',
    primaryColor: '#31b270', altColor: '#002c40', createdAt: '2026-04-01T10:00:00',
  },
  {
    id: 2, clubId: 1, teamId: 1, teamName: 'Juniors A',
    postType: 'post', homeTeamName: 'FC Demo', awayTeamName: 'Atl\u00e9tico Norte',
    matchDate: 'Domingo 30 de Marzo', matchTime: '12:00',
    competition: 'Copa Provincial', homeScore: 3, awayScore: 1,
    scorers: 'Garc\u00eda (15\'), L\u00f3pez (44\'), Mart\u00ednez (78\')',
    primaryColor: '#31b270', altColor: '#002c40', createdAt: '2026-03-30T14:00:00',
  },
  {
    id: 3, clubId: 1, teamId: 3, teamName: 'Juvenil Divisi\u00f3n de Honor',
    postType: 'jornada', homeTeamName: 'Todos los equipos', awayTeamName: '',
    matchDate: '2026-04-05',
    primaryColor: '#e63946', altColor: '#1d3557',
    metadata: JSON.stringify({
      jornadaTitle: 'Jornada del fin de semana',
      jornadaDate: '2026-04-05',
      jornadaMatches: [
        { homeTeam: 'Juvenil DH', awayTeam: 'Barcelona B', time: '10:00', competition: 'Divisi\u00f3n de Honor' },
        { homeTeam: 'Cadete A', awayTeam: 'Espanyol A', time: '12:00', competition: 'Superliga' },
      ],
    }),
    createdAt: '2026-04-04T09:00:00',
  },
];

@Component({
  selector: 'app-club-post',
  templateUrl: './club-post.component.html',
  styleUrls: ['./club-post.component.scss'],
})
export class ClubPostComponent implements OnInit {
  teams: DemoTeam[] = [...DEMO_TEAMS];
  selectedTeamId: number | null = null;
  posts: DemoPost[] = [];
  allPosts: DemoPost[] = [...DEMO_POSTS];

  loadingTeams = false;
  loadingPosts = false;

  showModal = false;
  editingPost: DemoPost | null = null;

  constructor(
    private location: Location,
    private translate: TranslateService,
    private tutorialService: TutorialService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('club-post', true), 600);
  }

  goBack(): void { this.location.back(); }

  selectTeam(teamId: number): void {
    this.selectedTeamId = teamId;
    this.loadPosts();
  }

  loadPosts(): void {
    if (!this.selectedTeamId) return;
    this.loadingPosts = true;
    setTimeout(() => {
      this.posts = this.allPosts.filter(p => p.teamId === this.selectedTeamId);
      this.loadingPosts = false;
    }, 250);
  }

  get selectedTeamName(): string {
    return this.teams.find(t => t.teamId === this.selectedTeamId)?.teamName || '';
  }

  openNewPost(): void {
    this.editingPost = null;
    this.showModal = true;
  }

  openEditPost(post: DemoPost): void {
    this.editingPost = { ...post };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onSaved(post: DemoPost): void {
    if (post.id) {
      const idx = this.allPosts.findIndex(p => p.id === post.id);
      if (idx >= 0) {
        this.allPosts[idx] = post;
      } else {
        this.allPosts.push(post);
      }
    } else {
      post.id = Date.now();
      post.createdAt = new Date().toISOString();
      this.allPosts.push(post);
    }
    this.showModal = false;
    this.loadPosts();
  }

  duplicatePost(post: DemoPost, event: MouseEvent): void {
    event.stopPropagation();
    const clone: DemoPost = {
      ...post,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    this.allPosts.push(clone);
    this.loadPosts();
  }

  deletePost(post: DemoPost, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm('�Eliminar este post?')) return;
    this.allPosts = this.allPosts.filter(p => p.id !== post.id);
    this.loadPosts();
  }

  getThumbnailUrl(post: DemoPost): string {
    return post.thumbnailUrl || '';
  }

  postTypeLabel(type: string): string {
    if (type === 'pre')     return 'Pre-partido';
    if (type === 'jornada') return 'Jornada';
    return 'Resultado';
  }

  postTypeClass(type: string): string {
    if (type === 'pre')     return 'badge-pre';
    if (type === 'jornada') return 'badge-jornada';
    return 'badge-post';
  }

  formatCreatedAt(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
