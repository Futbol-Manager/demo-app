import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'sphaira-theme';

  private _mode$ = new BehaviorSubject<ThemeMode>(this.getStoredTheme());

  /** Observable for components that need to react to theme changes */
  readonly mode$ = this._mode$.asObservable();

  /** Current value (synchronous) */
  get isDark(): boolean {
    return this._mode$.value === 'dark';
  }

  get mode(): ThemeMode {
    return this._mode$.value;
  }

  constructor() {
    this.applyTheme(this._mode$.value);
  }

  /** Toggle between light and dark */
  toggle(): void {
    this.setMode(this.isDark ? 'light' : 'dark');
  }

  /** Set an explicit mode */
  setMode(mode: ThemeMode): void {
    this._mode$.next(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.applyTheme(mode);
  }

  /** Add/remove the 'dark' class on <body> */
  private applyTheme(mode: ThemeMode): void {
    if (mode === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  /** Read stored preference; default is always light (ignores system prefers-color-scheme) */
  private getStoredTheme(): ThemeMode {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  }
}
