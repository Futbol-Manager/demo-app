import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

import { LoginService } from 'src/app/core/services/login/login.service';
import { ClubService } from 'src/app/core/services/club/club.service';
import { TeamService } from 'src/app/core/services/team/team.service';
import { User } from 'src/app/core/models/users/user.model';
import {
  EncuestaResumen,
  EncuestaDetalle,
  EncuestaResultados,
} from 'src/app/core/services/models/club.model';
import { getSelectedSeason } from 'src/app/core/utils/season.utils';
import { environment } from 'src/environments/environment';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';

type View = 'list' | 'create' | 'respond' | 'results';

interface RespuestaItem {
  preguntaId: number;
  opcionId?: number | null;
  respuestaTexto?: string | null;
}

@Component({
  selector: 'app-encuestas',
  templateUrl: './encuestas.component.html',
  styleUrls: ['./encuestas.component.scss'],
})
export class EncuestasComponent implements OnInit, OnDestroy {
  @Input() embedded = false;

  private destroy$ = new Subject<void>();

  usuarioActual!: User | null;
  profileId = 0;
  clubId = 0;
  userId = 0;

  // Vista activa
  view: View = 'list';

  // Lista
  encuestas: EncuestaResumen[] = [];
  loadingList = true;

  // Crear
  nuevaTitulo = '';
  nuevaDescripcion = '';
  nuevaFechaCierre = '';
  preguntas: { texto: string; tipo: string; requerida: number; opciones: string[] }[] = [];
  recipientSuggestions: any[] = [];
  recipientInput = '';
  selectedRecipients: { userId: number; label: string; sublabel: string }[] = [];
  isSearchingRecipients = false;
  sendingCreate = false;
  createError = '';
  togglingActiva: number | null = null;
  deletingEncuesta = false;

  // Resultados
  resultados: EncuestaResultados | null = null;
  resultadosEncuesta: EncuestaResumen | null = null;
  loadingResultados = false;
  refreshingResultados = false;
  encuestaSelectedId = 0;

  // Responder
  encuestaDetalle: EncuestaDetalle | null = null;
  loadingDetalle = false;
  respuestasUsuario: RespuestaItem[] = [];
  sendingRespuesta = false;
  respuestaOk = false;
  respuestaError = '';

  // Equipos para selección de destinatarios
  equipos: any[] = [];
  loadingEquipos = false;

  readonly imageBaseUrl = environment.images + 'user/';

  constructor(
    private loginService: LoginService,
    private clubService: ClubService,
    private teamService: TeamService,
    private location: Location,
    private translate: TranslateService,
    private notification: NotificationService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      this.usuarioActual = user;
      if (user) {
        this.profileId = user.profileType?.profileId ?? 0;
        this.userId = user.userId ?? 0;
        // clubId se almacena en sessionStorage por el componente de inicio al navegar al dashboard
        this.clubId = Number(sessionStorage.getItem('clubId') ?? '0') || 0;
        this.loadEncuestas();
        if (this.profileId === 1 || this.profileId === 2) {
          this.loadEquipos();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.location.back();
  }

  /** Vuelve a la lista limpiando el estado de la vista actual. */
  backToList(): void {
    this.resultados = null;
    this.encuestaDetalle = null;
    this.respuestaOk = false;
    this.respuestaError = '';
    this.sendingCreate = false;
    this.createError = '';
    this.recipientSuggestions = [];
    this.view = 'list';
  }

  // ─── Lista ────────────────────────────────────────────────────────────────

  loadEncuestas(): void {
    this.loadingList = true;
    // Club (1) y Coach (2) usan getEncuestasByClub para poder gestionar las suyas
    if (this.profileId === 1 || this.profileId === 2) {
      this.clubService
        .getEncuestasByClub(this.clubId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (r) => {
            this.encuestas = this.sortEncuestas((r?.data as EncuestaResumen[]) ?? []);
            this.loadingList = false;
          },
          error: () => {
            this.loadingList = false;
            this.notification.error('ENCUESTAS.ERROR_GENERIC');
          },
        });
    } else {
      this.clubService
        .getEncuestasByUser(this.userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (r) => {
            this.encuestas = this.sortEncuestas((r?.data as EncuestaResumen[]) ?? []);
            this.loadingList = false;
          },
          error: () => {
            this.loadingList = false;
            this.notification.error('ENCUESTAS.ERROR_GENERIC');
          },
        });
    }
  }

  /** Abiertas primero; dentro de cada grupo, más recientes primero. */
  private sortEncuestas(list: EncuestaResumen[]): EncuestaResumen[] {
    return list.sort((a, b) => {
      if (a.activa !== b.activa) return b.activa - a.activa;
      return (b.fechaCreate ?? '').localeCompare(a.fechaCreate ?? '');
    });
  }

  // ─── Crear ────────────────────────────────────────────────────────────────

  loadEquipos(): void {
    const temporada = getSelectedSeason();
    // Club (1) → todos los equipos del club
    // Coach (2) → solo los equipos que dirige ese entrenador
    const request$ = this.profileId === 2
      ? this.teamService.getTeamsByClubForCombo2(this.clubId, temporada, this.userId)
      : this.teamService.getTeamsByClubForCombo(this.clubId, temporada);

    this.loadingEquipos = true;
    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (r: any) => {
        this.equipos = r?.data ?? [];
        this.loadingEquipos = false;
      },
      error: () => {
        this.loadingEquipos = false;
        this.notification.error('ENCUESTAS.ERROR_GENERIC');
      },
    });
  }

  openCreate(): void {
    this.nuevaTitulo = '';
    this.nuevaDescripcion = '';
    this.nuevaFechaCierre = '';
    this.preguntas = [this.newPreguntaRow()];
    this.selectedRecipients = [];
    this.recipientInput = '';
    this.createError = '';
    this.view = 'create';
  }

  newPreguntaRow() {
    return { texto: '', tipo: 'OPCION_MULTIPLE', requerida: 1, opciones: ['', ''] };
  }

  addPregunta(): void {
    this.preguntas.push(this.newPreguntaRow());
  }

  removePregunta(i: number): void {
    this.preguntas.splice(i, 1);
  }

  addOpcion(pi: number): void {
    this.preguntas[pi].opciones.push('');
  }

  removeOpcion(pi: number, oi: number): void {
    this.preguntas[pi].opciones.splice(oi, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onRecipientInput(val: string): void {
    this.recipientInput = val;
    if (val.length < 2) {
      this.recipientSuggestions = [];
      return;
    }
    this.isSearchingRecipients = true;
    const temporada = getSelectedSeason();
    // Para coaches: solo busca jugadores de sus propios equipos
    const coachUserId = this.profileId === 2 ? this.userId : 0;
    this.clubService
      .searchClubMembers(this.clubId, val, temporada, coachUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          const raw: any[] = r?.data ?? [];
          // El backend devuelve { fullName, role, photoUrl, userId, ... }
          // Mapeamos a { label, sublabel, photoUrl, type, userId }
          this.recipientSuggestions = raw.map((m: any) => ({
            type: 'user',
            userId: m.userId,
            playerId: m.playerId,
            label: m.fullName ?? m.label ?? '',
            sublabel: m.role === 'COACH'
              ? this.translate.instant('NOTIFICATIONS.ROLE_COACH')
              : m.role === 'PLAYER'
                ? this.translate.instant('NOTIFICATIONS.ROLE_PLAYER')
                : (m.sublabel ?? m.role ?? ''),
            photoUrl: m.photoUrl ?? null,
            hasAccount: m.hasAccount !== false,
            teamId: m.teamId,
          }));
          this.isSearchingRecipients = false;
        },
        error: () => (this.isSearchingRecipients = false),
      });
  }

  addRecipient(s: any): void {
    const already = this.selectedRecipients.some((r) => r.userId === s.userId);
    if (!already) {
      this.selectedRecipients.push({
        userId: s.userId,
        label: s.label ?? (s.firstName + ' ' + s.secondName),
        sublabel: s.sublabel ?? s.role ?? '',
      });
    }
    this.recipientInput = '';
    this.recipientSuggestions = [];
  }

  addTeamRecipients(team: any): void {
    // Añade el equipo con un teamId especial; se resolverá al enviar
    const alreadyTeam = this.selectedRecipients.some((r: any) => r.teamId === team.teamId);
    if (!alreadyTeam) {
      (this.selectedRecipients as any[]).push({
        teamId: team.teamId,
        userId: -team.teamId,
        label: team.name,
        sublabel: this.translate.instant('ENCUESTAS.TEAM_LABEL'),
      });
    }
  }

  removeRecipient(i: number): void {
    this.selectedRecipients.splice(i, 1);
  }

  submitCreate(): void {
    if (!this.nuevaTitulo.trim()) {
      this.createError = this.translate.instant('ENCUESTAS.ERROR_TITULO');
      return;
    }
    if (this.preguntas.length === 0) {
      this.createError = this.translate.instant('ENCUESTAS.ERROR_PREGUNTAS');
      return;
    }
    for (const p of this.preguntas) {
      if (!p.texto.trim()) {
        this.createError = this.translate.instant('ENCUESTAS.ERROR_PREGUNTA_TEXTO');
        return;
      }
      if (p.tipo === 'OPCION_MULTIPLE' && p.opciones.filter((o) => o.trim()).length < 2) {
        this.createError = this.translate.instant('ENCUESTAS.ERROR_OPCIONES');
        return;
      }
    }
    if (this.selectedRecipients.length === 0) {
      this.createError = this.translate.instant('ENCUESTAS.ERROR_DESTINATARIOS');
      return;
    }

    this.createError = '';
    this.sendingCreate = true;

    const recipientUserIds = this.selectedRecipients
      .filter((r: any) => !r.teamId)
      .map((r) => r.userId);
    const recipientTeamIds = (this.selectedRecipients as any[])
      .filter((r) => r.teamId)
      .map((r) => r.teamId);

    const preguntasDTO = this.preguntas.map((p, i) => ({
      orden: i + 1,
      texto: p.texto,
      tipo: p.tipo,
      requerida: p.requerida,
      opciones: p.tipo === 'OPCION_MULTIPLE'
        ? p.opciones.filter((o) => o.trim()).map((o, j) => ({ orden: j + 1, texto: o }))
        : [],
    }));

    const dto = {
      clubId: this.clubId,
      creatorUserId: this.userId,
      creatorProfileId: this.profileId,
      titulo: this.nuevaTitulo,
      descripcion: this.nuevaDescripcion,
      fechaCierre: this.nuevaFechaCierre || null,
      preguntas: preguntasDTO,
      recipientUserIds,
      recipientTeamIds,
    };

    this.clubService
      .crearEncuesta(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sendingCreate = false;
          this.notification.success('ENCUESTAS.CREATE_SUCCESS');
          this.view = 'list';
          this.loadEncuestas();
        },
        error: () => {
          this.sendingCreate = false;
          this.createError = this.translate.instant('ENCUESTAS.ERROR_GENERIC');
          this.notification.error('ENCUESTAS.ERROR_GENERIC');
        },
      });
  }

  // ─── Resultados (solo Club) ───────────────────────────────────────────────

  openResultados(enc: EncuestaResumen): void {
    this.encuestaSelectedId = enc.encuestaId;
    this.resultadosEncuesta = enc;
    this.loadingResultados = true;
    this.resultados = null;
    this.view = 'results';
    this.clubService
      .getEncuestaResultados(enc.encuestaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r?.data) {
            this.resultados = r.data as EncuestaResultados;
          }
          this.loadingResultados = false;
        },
        error: (err) => {

          this.loadingResultados = false;
          this.notification.error('ENCUESTAS.ERROR_GENERIC');
        },
      });
  }

  refreshResultados(): void {
    if (this.refreshingResultados || !this.encuestaSelectedId) return;
    this.refreshingResultados = true;
    this.clubService
      .getEncuestaResultados(this.encuestaSelectedId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r?.data) {
            this.resultados = r.data as EncuestaResultados;
          }
          this.refreshingResultados = false;
        },
        error: (err) => {

          this.refreshingResultados = false;
          this.notification.error('ENCUESTAS.ERROR_GENERIC');
        },
      });
  }

  toggleActiva(enc: EncuestaResumen | EncuestaResultados): void {
    const nuevo = enc.activa === 1 ? 0 : 1;
    this.togglingActiva = enc.encuestaId;
    this.clubService
      .toggleEncuestaActiva(enc.encuestaId, nuevo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.togglingActiva = null;
          enc.activa = nuevo;
          const listItem = this.encuestas.find((e) => e.encuestaId === enc.encuestaId);
          if (listItem) listItem.activa = nuevo;
          if (this.resultados && this.resultados.encuestaId === enc.encuestaId) {
            this.resultados.activa = nuevo;
          }
          this.notification.success('ENCUESTAS.TOGGLED_SUCCESS');
        },
        error: () => {
          this.togglingActiva = null;
          this.notification.error('ENCUESTAS.ERROR_GENERIC');
        },
      });
  }

  deleteEncuesta(enc: EncuestaResumen): void {
    this.confirmationService.confirm({
      messageKey: 'ENCUESTAS.CONFIRM_DELETE',
      confirmStyle: 'warn',
    }).subscribe(ok => {
      if (!ok) return;
      this.deletingEncuesta = true;
      this.clubService
        .deleteEncuesta(enc.encuestaId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.deletingEncuesta = false;
            this.notification.success('ENCUESTAS.DELETE_SUCCESS');
            this.view = 'list';
            this.loadEncuestas();
          },
          error: () => {
            this.deletingEncuesta = false;
            this.notification.error('ENCUESTAS.ERROR_GENERIC');
          },
        });
    });
  }

  // ─── Responder (Coach / Player) ───────────────────────────────────────────

  openResponder(enc: EncuestaResumen): void {
    if (enc.activa === 0) return;
    this.loadingDetalle = true;
    this.encuestaDetalle = null;
    this.respuestasUsuario = [];
    this.respuestaOk = false;
    this.respuestaError = '';
    this.view = 'respond';
    this.clubService
      .getEncuestaDetalle(enc.encuestaId, this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.encuestaDetalle = r?.data as EncuestaDetalle;
          this.initRespuestasForm();
          this.loadingDetalle = false;
        },
        error: () => {
          this.loadingDetalle = false;
          this.notification.error('ENCUESTAS.ERROR_GENERIC');
        },
      });
  }

  initRespuestasForm(): void {
    if (!this.encuestaDetalle) return;
    this.respuestasUsuario = this.encuestaDetalle.preguntas.map((p) => ({
      preguntaId: p.preguntaId,
      opcionId: p.respuestaPreviaOpcionId ?? null,
      respuestaTexto: p.respuestaPreviaTexto ?? null,
    }));
  }

  getRespuesta(preguntaId: number): RespuestaItem {
    return this.respuestasUsuario.find((r) => r.preguntaId === preguntaId)!;
  }

  selectOpcion(preguntaId: number, opcionId: number): void {
    const r = this.getRespuesta(preguntaId);
    if (r) r.opcionId = opcionId;
  }

  setTexto(preguntaId: number, texto: string): void {
    const r = this.getRespuesta(preguntaId);
    if (r) r.respuestaTexto = texto;
  }

  submitRespuesta(): void {
    if (!this.encuestaDetalle) return;
    for (const p of this.encuestaDetalle.preguntas) {
      const r = this.getRespuesta(p.preguntaId);
      if (p.requerida) {
        if (p.tipo === 'OPCION_MULTIPLE' && !r?.opcionId) {
          this.respuestaError = this.translate.instant('ENCUESTAS.ERROR_RESPUESTA_REQUERIDA');
          return;
        }
        if (p.tipo === 'TEXTO_LIBRE' && !r?.respuestaTexto?.trim()) {
          this.respuestaError = this.translate.instant('ENCUESTAS.ERROR_RESPUESTA_REQUERIDA');
          return;
        }
      }
    }
    this.respuestaError = '';
    this.sendingRespuesta = true;

    const dto = {
      userId: this.userId,
      playerId: 0,
      respuestas: this.respuestasUsuario,
    };

    this.clubService
      .responderEncuesta(this.encuestaDetalle.encuestaId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sendingRespuesta = false;
          this.respuestaOk = true;
          this.notification.success('ENCUESTAS.ANSWER_SENT');
          setTimeout(() => {
            this.view = 'list';
            this.loadEncuestas();
          }, 2000);
        },
        error: () => {
          this.sendingRespuesta = false;
          this.respuestaError = this.translate.instant('ENCUESTAS.ERROR_GENERIC');
          this.notification.error('ENCUESTAS.ERROR_GENERIC');
        },
      });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Un usuario puede gestionar (ver resultados, cerrar, eliminar) una encuesta si:
   * - es Club admin (profileId 1), o
   * - es Coach (profileId 2) y fue él quien la creó.
   */
  puedeGestionar(enc: EncuestaResumen): boolean {
    if (this.profileId === 1) return true;
    if (this.profileId === 2 && enc.creatorUserId === this.userId) return true;
    return false;
  }

  porcentajeBar(pct: number): string {
    return `${Math.min(100, pct)}%`;
  }

  respondidosPct(enc: EncuestaResumen): number {
    if (!enc.totalDestinatarios) return 0;
    return Math.round((enc.totalRespondieron / enc.totalDestinatarios) * 100);
  }

  // ─── Exportar resultados a CSV ────────────────────────────────────────────

  exportarCSV(): void {
    if (!this.resultados) return;
    const r = this.resultados;
    const rows: string[][] = [];

    rows.push(['Encuesta', r.titulo]);
    if (r.descripcion) rows.push(['Descripción', r.descripcion]);
    rows.push(['Respondieron', `${r.totalRespondieron} / ${r.totalDestinatarios}`]);
    rows.push([]);

    r.preguntas.forEach((p, i) => {
      rows.push([`Pregunta ${i + 1}`, p.texto, p.tipo === 'OPCION_MULTIPLE' ? 'Opción múltiple' : 'Texto libre']);

      if (p.tipo === 'OPCION_MULTIPLE') {
        rows.push(['Opción', 'Votos', 'Porcentaje', 'Respondientes']);
        (p.opciones ?? []).forEach((op) => {
          rows.push([
            op.texto,
            String(op.count),
            `${op.porcentaje}%`,
            (op.nombresRespondentes ?? []).join('; '),
          ]);
        });
      } else {
        rows.push(['Usuario', 'Fecha', 'Respuesta']);
        (p.respuestasTexto ?? []).forEach((rt) => {
          rows.push([rt.nombreDisplay, rt.fecha ?? '', rt.respuesta]);
        });
      }
      rows.push([]);
    });

    if (r.pendientes?.length) {
      rows.push(['Pendientes de responder']);
      r.pendientes.forEach((pd) => rows.push([pd.nombreDisplay]));
    }

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\r\n');

    const bom = '\ufeff'; // UTF-8 BOM para que Excel lo abra correctamente
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `encuesta_${r.encuestaId}_${r.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Convierte "2026-04-08T12:00" → "08/04/2026 12:00" */
  formatFechaCierre(fecha: string | null | undefined): string {
    if (!fecha) return '';
    // Soporta tanto "YYYY-MM-DD" como "YYYY-MM-DDTHH:mm"
    const [datePart, timePart] = fecha.split('T');
    const [y, m, d] = datePart.split('-');
    const base = `${d}/${m}/${y}`;
    return timePart ? `${base} ${timePart.substring(0, 5)}` : base;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  private readonly INITIALS_COLORS = [
    '#2196f3','#e91e63','#9c27b0','#ff5722',
    '#4caf50','#ff9800','#00bcd4','#795548',
  ];

  getInitialsBg(name: string): string {
    if (!name) return '#aaa';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return this.INITIALS_COLORS[Math.abs(hash) % this.INITIALS_COLORS.length];
  }
}
