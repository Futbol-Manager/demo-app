import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import {
  ClubNewsContent,
  ClubNewsItem,
  ClubNewsService,
} from 'src/app/core/services/club-news/club-news.service';

type NewsMode = 'new' | 'history';

/**
 * Modal de Novedades para cuentas de club. Dos modos:
 *  - `new`: aparece automáticamente al entrar si hay novedades sin leer, una a una.
 *  - `history`: se abre desde la campana del header y lista todas las novedades.
 *
 * Vive en el shell del dashboard, así que su `ngOnInit` corre una sola vez por
 * sesión: el aviso automático solo salta una vez.
 */
@Component({
  selector: 'app-club-news-modal',
  templateUrl: './club-news-modal.component.html',
  styleUrls: ['./club-news-modal.component.scss'],
})
export class ClubNewsModalComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  open = false;
  mode: NewsMode = 'new';
  loadingHistory = false;

  /** Cola de novedades sin leer (modo new). */
  newsList: ClubNewsItem[] = [];
  currentIndex = 0;

  /** Historial completo (modo history). */
  historyList: ClubNewsItem[] = [];

  private hasAutoShown = false;

  constructor(
    private clubNews: ClubNewsService,
    private translate: TranslateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.isClubUser()) return;

    // Aviso automático: al llegar novedades sin leer, abrir una vez.
    this.clubNews.unseen$.pipe(takeUntil(this.destroy$)).subscribe((list) => {
      if (!this.hasAutoShown && !this.open && list.length > 0) {
        this.newsList = list;
        this.currentIndex = 0;
        this.mode = 'new';
        this.open = true;
        this.hasAutoShown = true;
      }
    });

    // Apertura del historial desde la campana del header.
    this.clubNews.openHistory$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openHistory());

    this.clubNews.refreshUnseen();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Modo new ──────────────────────────────────────────────────────────────

  get current(): ClubNewsItem | null {
    return this.newsList[this.currentIndex] ?? null;
  }

  get isLast(): boolean {
    return this.currentIndex >= this.newsList.length - 1;
  }

  /** Avanza a la siguiente novedad marcando la actual como leída. */
  nextNews(): void {
    const cur = this.current;
    if (cur) {
      this.clubNews.markRead(cur.id).subscribe({ next: () => {}, error: () => {} });
    }
    if (!this.isLast) {
      this.currentIndex++;
    } else {
      this.close();
      this.clubNews.refreshUnseen();
    }
  }

  // ── Modo history ──────────────────────────────────────────────────────────

  openHistory(): void {
    this.mode = 'history';
    this.open = true;
    this.loadingHistory = true;
    this.clubNews
      .getHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.historyList = (res?.data as ClubNewsItem[]) ?? [];
          this.loadingHistory = false;
        },
        error: () => {
          this.historyList = [];
          this.loadingHistory = false;
        },
      });
  }

  markAllRead(): void {
    this.clubNews.markAllRead().subscribe({
      next: () => {
        this.historyList = this.historyList.map((n) => ({ ...n, read: true }));
        this.clubNews.refreshUnseen();
      },
      error: () => {},
    });
  }

  get hasUnreadInHistory(): boolean {
    return this.historyList.some((n) => !n.read);
  }

  // ── Comunes ───────────────────────────────────────────────────────────────

  close(): void {
    this.open = false;
  }

  /** Cierra el modal y abre la pantalla de Sugerencias (enviar/ver sugerencias). */
  goToSuggestions(): void {
    this.open = false;
    this.router.navigate(['/dashboard/sugerencias-club']);
  }

  content(item: ClubNewsItem | null): ClubNewsContent {
    if (!item) return { title: '', items: [] };
    return this.clubNews.resolveContent(item, this.currentLang());
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(this.currentLang(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  private currentLang(): string {
    return localStorage.getItem('lang') || this.translate.currentLang || 'es';
  }

  private isClubUser(): boolean {
    try {
      const raw = localStorage.getItem('usuario');
      if (!raw) return false;
      const user = JSON.parse(raw);
      return user?.profileType?.profileId === 1;
    } catch {
      return false;
    }
  }
}
