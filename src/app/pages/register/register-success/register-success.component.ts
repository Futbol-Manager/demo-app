import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LoginService } from 'src/app/core/services/login/login.service';
import { RegisterService } from 'src/app/core/services/register/register.service';
import { ClubRegisterFormService } from 'src/app/core/services/club-register-form/club-register-form.service';
import { RegisterFormField } from 'src/app/core/services/club-register-form/club-register-form.model';
import { environment } from 'src/environments/environment';

type DeviceOs = 'ios' | 'android' | 'desktop';

/**
 * Pantalla de "Cuenta creada" que aparece tras un registro de padre desde
 * /registro-padres/{clubId}.
 */
@Component({
  selector: 'app-register-success',
  templateUrl: './register-success.component.html',
  styleUrls: ['./register-success.component.scss'],
})
export class RegisterSuccessComponent implements OnInit {
  /** URLs oficiales de las stores Sphaira (mismas que el header). */
  readonly playStoreUrl =
    'https://play.google.com/store/apps/details?id=com.futbol.sphairatech&pcampaignid=web_share';
  readonly appStoreUrl =
    'https://apps.apple.com/es/app/sphaira-tech/id6745791142';

  os: DeviceOs = 'desktop';
  clubId = 0;
  clubName = '';
  clubPicture = '';

  /** Documentos del club adjuntos al formulario personalizado. */
  clubDocuments: RegisterFormField[] = [];

  /** `true` si el auto-login tras el registro funcionó. */
  autoLoginOk = false;

  /** `true` si el club pidió añadir tarjeta en el registro. */
  pedirTarjeta = false;
  private pagoTeamId = 0;
  private pagoPlayerId = 0;

  /** `true` si el padre llega tras completar el flujo de pago. */
  pagosConfigurados = false;

  /** Hijos del alta con equipo válido a los que añadir tarjeta. */
  pagoChildren: { teamId: number; playerId: number; nombre: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private loginService: LoginService,
    private registerService: RegisterService,
    private clubRegisterFormService: ClubRegisterFormService,
  ) {}

  ngOnInit(): void {
    this.os = this.detectOs();
    this.route.queryParamMap.subscribe((params) => {
      const cid = Number(params.get('clubId') || 0);
      this.clubId = cid > 0 ? cid : 0;
      this.autoLoginOk = params.get('autoLoginOk') === '1';
      this.pagosConfigurados = params.get('pagosOk') === '1';
      const tId = Number(params.get('teamId') || 0);
      const pId = Number(params.get('playerId') || 0);
      this.pagoTeamId = tId > 0 ? tId : 0;
      this.pagoPlayerId = pId > 0 ? pId : 0;
      this.pagoChildren = this.parseChildren(params);
      this.pedirTarjeta = params.get('pedirTarjeta') === '1'
        && this.autoLoginOk
        && this.pagoChildren.length > 0;
      if (this.clubId > 0) {
        this.loadClubInfo(this.clubId);
        this.loadClubDocuments(this.clubId);
      }
    });
  }

  private parseChildren(params: ParamMap): { teamId: number; playerId: number; nombre: string }[] {
    const playerIdsRaw = params.get('playerIds');
    const teamIdsRaw = params.get('teamIds');
    const namesRaw = params.get('childNames');
    const out: { teamId: number; playerId: number; nombre: string }[] = [];

    if (playerIdsRaw && teamIdsRaw) {
      const playerIds = playerIdsRaw.split(',');
      const teamIds = teamIdsRaw.split(',');
      const names = namesRaw ? namesRaw.split(',') : [];
      const n = Math.min(playerIds.length, teamIds.length);
      for (let i = 0; i < n; i++) {
        const playerId = Number(playerIds[i]) || 0;
        const teamId = Number(teamIds[i]) || 0;
        if (playerId > 0 && teamId > 0) {
          let nombre = '';
          try {
            nombre = names[i] ? decodeURIComponent(names[i]) : '';
          } catch {
            nombre = '';
          }
          out.push({ teamId, playerId, nombre });
        }
      }
    }

    if (out.length === 0 && this.pagoTeamId > 0 && this.pagoPlayerId > 0) {
      out.push({ teamId: this.pagoTeamId, playerId: this.pagoPlayerId, nombre: '' });
    }
    return out;
  }

  irAConfigurarPago(child?: { teamId: number; playerId: number }): void {
    const target = child ?? this.pagoChildren[0];
    if (target && target.teamId > 0 && target.playerId > 0) {
      this.router.navigate(['/dashboard/cuotas', target.teamId, target.playerId], {
        queryParams: { addCard: 1, fromRegistro: 1 },
      });
    }
  }

  /** Botón principal: abre la Store según SO. */
  openStore(target: 'ios' | 'android'): void {
    const url = target === 'android' ? this.playStoreUrl : this.appStoreUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /** Botón secundario: entrar a la web. */
  continueToWeb(): void {
    if (this.autoLoginOk && this.loginService.getToken()) {
      this.router.navigate(['/dashboard/inicio']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  private detectOs(): DeviceOs {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = (navigator.userAgent || '').toLowerCase();
    const platform = ((navigator as any).platform || '').toLowerCase();
    const isIPadOS =
      /macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1;
    if (/iphone|ipad|ipod/.test(ua) || /ipad|iphone|ipod/.test(platform) || isIPadOS) {
      return 'ios';
    }
    if (/android/.test(ua)) {
      return 'android';
    }
    return 'desktop';
  }

  private loadClubInfo(clubId: number): void {
    this.registerService.getClubPublicInfo(clubId).subscribe({
      next: (res) => {
        if (res?.data) {
          this.clubName = res.data.name ?? '';
          const pic = res.data.picture ?? res.data.pictureClub;
          this.clubPicture = pic ? environment.images + 'user/' + pic : '';
        }
      },
      error: () => { /* dejar vacío: la pantalla sigue funcionando sin escudo */ },
    });
  }

  private loadClubDocuments(clubId: number): void {
    this.clubRegisterFormService.getPublicTemplate(clubId).subscribe({
      next: (res) => {
        const sections = res?.data?.schema?.sections;
        if (!Array.isArray(sections)) {
          this.clubDocuments = [];
          return;
        }
        const docs: RegisterFormField[] = [];
        for (const s of sections) {
          if (!Array.isArray(s.fields)) continue;
          for (const f of s.fields) {
            if (f.type === 'document' && f.fileUrl) {
              docs.push(f);
            }
          }
        }
        this.clubDocuments = docs;
      },
      error: () => { this.clubDocuments = []; },
    });
  }

  documentIconFor(field: RegisterFormField): string {
    const mime = (field.mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return 'bi-file-earmark-image';
    if (mime === 'application/pdf') return 'bi-file-earmark-pdf';
    if (mime.includes('word') || mime.includes('msword')) return 'bi-file-earmark-word';
    const name = (field.fileName || field.fileUrl || '').toLowerCase();
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.substring(dot + 1) : '';
    if (ext === 'pdf') return 'bi-file-earmark-pdf';
    if (ext === 'doc' || ext === 'docx') return 'bi-file-earmark-word';
    if (['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) >= 0) return 'bi-file-earmark-image';
    return 'bi-file-earmark';
  }

  formatFileSize(bytes: number | undefined | null): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  trackByDocument(_index: number, doc: RegisterFormField): string {
    return doc.id;
  }
}
