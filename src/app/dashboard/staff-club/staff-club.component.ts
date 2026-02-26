import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';

interface StaffUser {
  userId: number;
  firstName: string;
  secondName: string;
  mail: string;
  password?: string;
  clubId: number;
  permissions: string[];
  enabled: boolean;
}

interface PermissionItem {
  key: string;
  label: string;
  icon: string;
}

interface PermissionGroup {
  groupLabel: string;
  groupIcon: string;
  children: PermissionItem[];
}

@Component({
  selector: 'app-staff-club',
  templateUrl: './staff-club.component.html',
  styleUrls: ['./staff-club.component.scss'],
})
export class StaffClubComponent implements OnInit {

  // ── Definiciones de permisos ─────────────────────────────────────────────
  readonly PERMISSION_GROUPS: PermissionGroup[] = [
    {
      groupLabel: 'Cuadro de mando',
      groupIcon: 'bi-grid-1x2-fill',
      children: [
        { key: 'DASHBOARD_PLAYERS',    label: 'Jugadores',              icon: 'bi-people-fill' },
        { key: 'DASHBOARD_COACHES',    label: 'Entrenadores',           icon: 'bi-person-video3' },
        { key: 'DASHBOARD_STATS_PLR',  label: 'Estad. de jugador',     icon: 'bi-bar-chart-fill' },
        { key: 'DASHBOARD_STATS_TEAM', label: 'Estad. de equipo',      icon: 'bi-graph-up' },
        { key: 'DASHBOARD_CALENDAR',   label: 'Calendario',             icon: 'bi-calendar4-week' },
        { key: 'DASHBOARD_INJURIES',   label: 'Lesiones',               icon: 'bi-bandaid' },
      ],
    },
  ];

  readonly PERMISSION_STANDALONE: PermissionItem[] = [
    { key: 'TEAMS',          label: 'Equipos',               icon: 'bi-shield-fill' },
    { key: 'DOCUMENTS',      label: 'Documentos',            icon: 'bi-folder2-fill' },
    { key: 'PAYMENTS',       label: 'Pagos',                 icon: 'bi-cash-coin' },
    { key: 'CLOTHING',       label: 'Ropa',                  icon: 'bi-bag-fill' },
    { key: 'SPONSORS',       label: 'Patrocinadores',        icon: 'bi-building' },
    { key: 'NOTIFICATIONS',  label: 'Notificaciones',        icon: 'bi-bell-fill' },
    { key: 'VIDEO_LIBRARY',  label: 'Biblioteca de Vídeos', icon: 'bi-camera-video-fill' },
    { key: 'SCOUTING',       label: 'Scouting',              icon: 'bi-binoculars-fill' },
    { key: 'AI_ASSISTANT',   label: 'Asistente de IA',       icon: 'bi-robot' },
    { key: 'VIDEO_ANALYSIS', label: 'Análisis de vídeo',    icon: 'bi-play-circle-fill' },
    { key: 'ERP',            label: 'Gestión / ERP',         icon: 'bi-gear-fill' },
  ];

  // ── Estado del componente ────────────────────────────────────────────────
  staffList: StaffUser[] = [];
  clubId = 0;
  loading = false;
  saving = false;
  togglingId: number | null = null;
  errorMsg = '';
  successMsg = '';

  showModal = false;
  showPassword = false;
  editingUser: StaffUser | null = null;

  form: Partial<StaffUser> & { permissionsMap: Record<string, boolean> } = {
    firstName: '',
    secondName: '',
    mail: '',
    password: '',
    permissionsMap: this.buildDefaultPermissionsMap(),
  };

  constructor(
    private http: HttpClient,
    private loginService: LoginService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loginService.usuarioActual.subscribe((user) => {
      if (user) {
        const cached = sessionStorage.getItem('clubId');
        this.clubId = cached ? Number(cached) : ((user as any).clubId ?? 0);
        if (this.clubId) this.loadStaff();
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadStaff(): void {
    this.loading = true;
    const url = `${environment.apiUrl}club/staff/list/${this.clubId}`;
    this.http.get<any>(url, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        this.staffList = res?.data ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  openCreateModal(): void {
    this.editingUser = null;
    this.showPassword = false;
    this.form = {
      firstName: '',
      secondName: '',
      mail: '',
      password: '',
      permissionsMap: this.buildDefaultPermissionsMap(),
    };
    this.showModal = true;
    this.errorMsg = '';
    this.successMsg = '';
  }

  openEditModal(user: StaffUser): void {
    this.editingUser = user;
    const map = this.buildDefaultPermissionsMap();
    user.permissions.forEach((p) => { map[p] = true; });
    this.form = {
      firstName: user.firstName,
      secondName: user.secondName,
      mail: user.mail,
      password: '',
      permissionsMap: map,
    };
    this.showModal = true;
    this.errorMsg = '';
    this.successMsg = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.errorMsg = '';
    this.successMsg = '';
  }

  // ── Helpers de grupo ──────────────────────────────────────────────────────
  isGroupAllChecked(group: PermissionGroup): boolean {
    return group.children.every(c => this.form.permissionsMap![c.key]);
  }

  isGroupPartiallyChecked(group: PermissionGroup): boolean {
    const checked = group.children.filter(c => this.form.permissionsMap![c.key]).length;
    return checked > 0 && checked < group.children.length;
  }

  toggleGroup(group: PermissionGroup): void {
    const allChecked = this.isGroupAllChecked(group);
    group.children.forEach(c => { this.form.permissionsMap![c.key] = !allChecked; });
  }

  // ── Guardar / Crear ───────────────────────────────────────────────────────
  saveStaff(): void {
    this.saving = true;
    this.errorMsg = '';
    const perms = Object.entries(this.form.permissionsMap ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (this.editingUser) {
      const url = `${environment.apiUrl}club/staff/permissions/${this.editingUser.userId}`;
      const body = { clubId: this.clubId, permissions: perms };
      this.http.put<any>(url, body, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.saving = false;
          this.successMsg = 'Permisos actualizados correctamente';
          this.loadStaff();
          setTimeout(() => this.closeModal(), 1200);
        },
        error: () => { this.saving = false; this.errorMsg = 'Error al actualizar permisos'; },
      });
    } else {
      if (!this.form.mail || !this.form.password) {
        this.saving = false;
        this.errorMsg = 'El email y la contraseña son obligatorios';
        return;
      }
      const url = `${environment.apiUrl}club/staff/create`;
      const body: StaffUser = {
        userId: 0,
        firstName: this.form.firstName ?? '',
        secondName: this.form.secondName ?? '',
        mail: this.form.mail ?? '',
        password: this.form.password ?? '',
        clubId: this.clubId,
        permissions: perms,
        enabled: true,
      };
      this.http.post<any>(url, body, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.saving = false;
          this.successMsg = 'Usuario Staff creado correctamente';
          this.loadStaff();
          setTimeout(() => this.closeModal(), 1200);
        },
        error: (err) => {
          this.saving = false;
          this.errorMsg = err?.error?.data ?? 'Error al crear el usuario';
        },
      });
    }
  }

  toggleEnabled(user: StaffUser): void {
    const newState = !user.enabled;
    this.togglingId = user.userId;
    const url = `${environment.apiUrl}club/staff/toggle/${user.userId}?enable=${newState}`;
    this.http.patch<any>(url, null, { headers: this.getHeaders() }).subscribe({
      next: () => {
        user.enabled = newState;
        this.togglingId = null;
      },
      error: () => { this.togglingId = null; },
    });
  }

  deleteStaff(user: StaffUser): void {
    if (!confirm(`¿Eliminar al usuario "${user.firstName} ${user.secondName}"?`)) return;
    const url = `${environment.apiUrl}club/staff/${user.userId}`;
    this.http.delete<any>(url, { headers: this.getHeaders() }).subscribe({
      next: () => this.loadStaff(),
    });
  }

  goBack(): void {
    this.closeModal();
    this.location.back();
  }

  permissionLabel(key: string): string {
    for (const group of this.PERMISSION_GROUPS) {
      const item = group.children.find(c => c.key === key);
      if (item) return item.label;
    }
    return this.PERMISSION_STANDALONE.find(p => p.key === key)?.label ?? key;
  }

  private buildDefaultPermissionsMap(): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    const groupKeys = [
      'DASHBOARD_PLAYERS', 'DASHBOARD_COACHES', 'DASHBOARD_STATS_PLR',
      'DASHBOARD_STATS_TEAM', 'DASHBOARD_CALENDAR', 'DASHBOARD_INJURIES',
    ];
    const standaloneKeys = [
      'TEAMS', 'DOCUMENTS', 'PAYMENTS', 'CLOTHING', 'SPONSORS',
      'NOTIFICATIONS', 'VIDEO_LIBRARY', 'SCOUTING', 'AI_ASSISTANT',
      'VIDEO_ANALYSIS', 'ERP',
    ];
    [...groupKeys, ...standaloneKeys].forEach(k => (map[k] = false));
    return map;
  }
}
