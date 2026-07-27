import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { isDemoMode } from '../demo/demo-mode';

export interface ClubSocialPost {
  id?: number;
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
  matchPreparationId?: number | null;
  thumbnailUrl?: string;
  metadata?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Posts sociales de partido de ejemplo para el modo demo. */
const DEMO_POSTS: ClubSocialPost[] = [
  {
    id: 1, clubId: 9001, teamId: 1, teamName: 'Juniors A',
    postType: 'pre', homeTeamName: 'FC Demo', awayTeamName: 'Rival FC',
    matchDate: '2026-04-12', matchTime: '18:00',
    competition: 'Liga Regional', matchday: 'J22',
    primaryColor: '#31b270', altColor: '#002c40', createdAt: '2026-04-01T10:00:00',
  },
  {
    id: 2, clubId: 9001, teamId: 1, teamName: 'Juniors A',
    postType: 'post', homeTeamName: 'FC Demo', awayTeamName: 'Atlético Norte',
    matchDate: '2026-03-30', matchTime: '12:00',
    competition: 'Copa Provincial', homeScore: 3, awayScore: 1,
    scorers: "García (15'), López (44'), Martínez (78')",
    primaryColor: '#31b270', altColor: '#002c40', createdAt: '2026-03-30T14:00:00',
  },
];

@Injectable({ providedIn: 'root' })
export class ClubSocialPostService {
  private base = environment.apiUrl + 'club-social';

  constructor(private http: HttpClient) {}

  private headers(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  getPostsByTeam(clubId: number, teamId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: DEMO_POSTS.filter(p => p.teamId === teamId), status: 200 });
    }
    return this.http.get(`${this.base}/club/${clubId}/team/${teamId}`, this.headers());
  }

  getPostsByClub(clubId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: [...DEMO_POSTS], status: 200 });
    }
    return this.http.get(`${this.base}/club/${clubId}`, this.headers());
  }

  createPost(post: ClubSocialPost): Observable<any> {
    if (isDemoMode()) {
      return of({ data: { ...post, id: Date.now() }, status: 200 });
    }
    return this.http.post(this.base, post, this.headers());
  }

  updatePost(postId: number, post: ClubSocialPost): Observable<any> {
    if (isDemoMode()) {
      return of({ data: { ...post, id: postId }, status: 200 });
    }
    return this.http.put(`${this.base}/${postId}`, post, this.headers());
  }

  deletePost(postId: number): Observable<any> {
    if (isDemoMode()) {
      return of({ data: { id: postId, deleted: true }, status: 200 });
    }
    return this.http.delete(`${this.base}/${postId}`, this.headers());
  }

  getClubInfo(clubId: number): Observable<any> {
    if (isDemoMode()) {
      return of({
        data: {
          clubId, name: 'FC Demo', picture: null,
          brandColor: '#31b270', altColor: '#002c40',
        },
        status: 200,
      });
    }
    return this.http.get(
      environment.apiUrl + `club/info/${clubId}`,
      this.headers()
    );
  }

  getMatchPreparationsByTeam(teamId: number): Observable<any> {
    if (isDemoMode()) {
      return of({
        data: [
          { matchPreparationId: 1, teamId, rival: 'Rival FC', matchDate: '2026-04-12' },
          { matchPreparationId: 2, teamId, rival: 'Atlético Norte', matchDate: '2026-03-30' },
        ],
        status: 200,
      });
    }
    return this.http.get(
      environment.apiUrl + `match/listmatchpreparationsbyteam/${teamId}`,
      this.headers()
    );
  }

  uploadThumbnail(postId: number, blob: Blob): Observable<any> {
    if (isDemoMode()) {
      return of({ data: `demo-thumb-${postId}.png`, status: 200 });
    }
    const formData = new FormData();
    formData.append('files', blob, `thumb-${postId}.png`);
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(`${this.base}/upload-thumbnail/${postId}`, formData, { headers });
  }

  duplicatePost(postId: number): Observable<any> {
    if (isDemoMode()) {
      const src = DEMO_POSTS.find(p => p.id === postId) ?? DEMO_POSTS[0];
      return of({ data: { ...src, id: Date.now() }, status: 200 });
    }
    return this.http.post(`${this.base}/duplicate/${postId}`, {}, this.headers());
  }
}
