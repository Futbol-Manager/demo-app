import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import {
  ClubModulesService,
  ClubModules,
  ClubMenuSport,
  MENU_SPORTS,
  DEFAULT_MENU_SPORT,
} from 'src/app/core/services/club/club-modules.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

/**
 * Pantalla "Permisos del club" (admin).
 * Ruta: /dashboard/permisos-club
 */
@Component({
  selector: 'app-permisos-club',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permisos-club.component.html',
  styleUrls: ['./permisos-club.component.scss'],
})
export class PermisosClubComponent implements OnInit {
  clubId = 0;
  modules: ClubModules = {
    clubId: 0,
    wellnessEnabled: false,
    rpeEnabled: false,
    professionalModeEnabled: false,
    accessControlEnabled: false,
    menuSport: DEFAULT_MENU_SPORT,
  };
  loading = true;
  saving = false;

  /** Emoji por deporte para el selector de menú. */
  private static readonly SPORT_EMOJIS: Record<ClubMenuSport, string> = {
    'futbol': '⚽',
    'voley': '🏐',
    'baloncesto': '🏀',
    'futbol-sala': '👟',
  };

  /** Deportes seleccionables para la imagen del menú. */
  readonly menuSports = MENU_SPORTS;

  sportEmoji(sport: ClubMenuSport): string {
    return PermisosClubComponent.SPORT_EMOJIS[sport] || '🏅';
  }

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private loginService: LoginService,
    private clubService: ClubService,
    private clubModulesService: ClubModulesService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    const paramClubId = +this.route.snapshot.params['clubId'];
    if (paramClubId) {
      this.clubId = paramClubId;
      this.loadModules();
      return;
    }
    const storedClubId = Number(sessionStorage.getItem('clubId') ?? '0');
    if (storedClubId > 0) {
      this.clubId = storedClubId;
      this.loadModules();
      return;
    }
    this.loginService.usuarioActual.subscribe((user) => {
      const userId = user?.userId;
      if (!userId) {
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }
      this.clubService.getClubForEntrenador(userId).subscribe({
        next: (resp: any) => {
          this.clubId = resp?.data ?? 0;
          if (this.clubId) {
            sessionStorage.setItem('clubId', String(this.clubId));
            this.loadModules();
          } else {
            this.loading = false;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
    });
  }

  loadModules(): void {
    this.loading = true;
    this.clubModulesService.getModules(this.clubId).subscribe({
      next: (m) => {
        this.modules = m;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onToggleWellness(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    const desired = !!target.checked;
    this.saving = true;
    this.clubModulesService.toggleWellness(this.clubId, desired).subscribe({
      next: (m) => {
        this.modules = m;
        this.saving = false;
        this.notification.success(
          this.translate.instant(
            desired ? 'PERMISOS_CLUB.NOTIF_WELLNESS_ON' : 'PERMISOS_CLUB.NOTIF_WELLNESS_OFF',
          ),
          false,
        );
        this.cdr.markForCheck();
      },
      error: () => {
        target.checked = !desired;
        this.saving = false;
        this.notification.error(this.translate.instant('PERMISOS_CLUB.NOTIF_ERR'), false);
        this.cdr.markForCheck();
      },
    });
  }

  onToggleRpe(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    const desired = !!target.checked;
    this.saving = true;
    this.clubModulesService.toggleRpe(this.clubId, desired).subscribe({
      next: (m) => {
        this.modules = m;
        this.saving = false;
        this.notification.success(
          this.translate.instant(desired ? 'PERMISOS_CLUB.NOTIF_RPE_ON' : 'PERMISOS_CLUB.NOTIF_RPE_OFF'),
          false,
        );
        this.cdr.markForCheck();
      },
      error: () => {
        target.checked = !desired;
        this.saving = false;
        this.notification.error(this.translate.instant('PERMISOS_CLUB.NOTIF_ERR'), false);
        this.cdr.markForCheck();
      },
    });
  }

  onToggleProfessionalMode(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    const desired = !!target.checked;
    this.saving = true;
    this.clubModulesService.toggleProfessionalMode(this.clubId, desired).subscribe({
      next: (m) => {
        this.modules = m;
        this.saving = false;
        this.notification.success(
          this.translate.instant(desired ? 'PERMISOS_CLUB.NOTIF_PRO_ON' : 'PERMISOS_CLUB.NOTIF_PRO_OFF'),
          false,
        );
        this.cdr.markForCheck();
      },
      error: () => {
        target.checked = !desired;
        this.saving = false;
        this.notification.error(this.translate.instant('PERMISOS_CLUB.NOTIF_ERR'), false);
        this.cdr.markForCheck();
      },
    });
  }

  onToggleAccessControl(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    const desired = !!target.checked;
    this.saving = true;
    this.clubModulesService.toggleAccessControl(this.clubId, desired).subscribe({
      next: (m) => {
        this.modules = m;
        this.saving = false;
        this.notification.success(
          this.translate.instant(
            desired ? 'PERMISOS_CLUB.NOTIF_ACCESS_ON' : 'PERMISOS_CLUB.NOTIF_ACCESS_OFF',
          ),
          false,
        );
        this.cdr.markForCheck();
      },
      error: () => {
        target.checked = !desired;
        this.saving = false;
        this.notification.error(this.translate.instant('PERMISOS_CLUB.NOTIF_ERR'), false);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Cambia el deporte de las imágenes del menú del club. Optimista con
   * rollback: si falla, restaura el deporte previo y avisa.
   */
  onSelectSport(sport: ClubMenuSport): void {
    if (this.saving || this.modules.menuSport === sport) {
      return;
    }
    const previous = this.modules.menuSport;
    this.modules = { ...this.modules, menuSport: sport };
    this.saving = true;
    this.cdr.markForCheck();
    this.clubModulesService.setMenuSport(this.clubId, sport).subscribe({
      next: (m) => {
        this.modules = m;
        this.saving = false;
        this.notification.success(
          this.translate.instant('PERMISOS_CLUB.SPORT.NOTIF_OK'),
          false,
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.modules = { ...this.modules, menuSport: previous };
        this.saving = false;
        this.notification.error(this.translate.instant('PERMISOS_CLUB.NOTIF_ERR'), false);
        this.cdr.markForCheck();
      },
    });
  }

  goBack(): void {
    this.location.back();
  }
}
