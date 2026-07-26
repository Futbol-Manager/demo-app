import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Location } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';
import { environment } from 'src/environments/environment';
import { isDemoMode } from 'src/app/core/services/demo/demo-mode';
import { DemoDataService } from 'src/app/core/services/demo/demo-data.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';

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
      groupLabel: 'STAFF.PERM_GROUP_DASHBOARD',
      groupIcon: 'bi-grid-1x2-fill',
      children: [
        { key: 'DASHBOARD_PLAYERS',    label: 'STAFF.PERM_PLAYERS',    icon: 'bi-people-fill' },
        { key: 'DASHBOARD_COACHES',    label: 'STAFF.PERM_COACHES',    icon: 'bi-person-video3' },
        { key: 'DASHBOARD_STATS_PLR',  label: 'STAFF.PERM_STATS_PLR',  icon: 'bi-bar-chart-fill' },
        { key: 'DASHBOARD_STATS_TEAM', label: 'STAFF.PERM_STATS_TEAM', icon: 'bi-graph-up' },
        { key: 'DASHBOARD_CALENDAR',   label: 'STAFF.PERM_CALENDAR',   icon: 'bi-calendar4-week' },
        { key: 'DASHBOARD_INJURIES',   label: 'STAFF.PERM_INJURIES',   icon: 'bi-bandaid' },
      ],
    },
  ];

  readonly PERMISSION_STANDALONE: PermissionItem[] = [
    { key: 'TEAMS',          label: 'STAFF.PERM_TEAMS',            icon: 'bi-shield-fill' },
    { key: 'DOCUMENTS',      label: 'STAFF.PERM_DOCUMENTS',        icon: 'bi-folder2-fill' },
    { key: 'PAYMENTS',       label: 'STAFF.PERM_PAYMENTS',         icon: 'bi-cash-coin' },
    { key: 'CLOTHING',       label: 'STAFF.PERM_CLOTHING',         icon: 'bi-bag-fill' },
    { key: 'SPONSORS',       label: 'STAFF.PERM_SPONSORS',         icon: 'bi-building' },
    { key: 'NOTIFICATIONS',  label: 'STAFF.PERM_NOTIFICATIONS',    icon: 'bi-bell-fill' },
    { key: 'VIDEO_LIBRARY',  label: 'STAFF.PERM_VIDEO_LIBRARY',    icon: 'bi-camera-video-fill' },
    { key: 'SCOUTING',       label: 'STAFF.PERM_SCOUTING',         icon: 'bi-binoculars-fill' },
    { key: 'AI_ASSISTANT',   label: 'STAFF.PERM_AI_ASSISTANT',     icon: 'bi-robot' },
    { key: 'VIDEO_ANALYSIS', label: 'STAFF.PERM_VIDEO_ANALYSIS',   icon: 'bi-play-circle-fill' },
    // ERP retirado del producto en jul-2026: no se ofrece el permiso porque el
    // apartado ya no aparece en ningún menú.
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

  /** Modal de confirmación eliminar */
  showDeleteConfirm = false;
  userToDelete: StaffUser | null = null;
  deleting = false;

  /** Modal de confirmación habilitar/deshabilitar */
  showToggleConfirm = false;
  userToToggle: StaffUser | null = null;
  togglingConfirm = false;
  pendingEnableState: boolean | null = null;

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
    private tutorialService: TutorialService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.tutorialService.start('staff-club', true), 600);

    const cached = sessionStorage.getItem('clubId');
    const fromStorage = cached ? Number(cached) : Number(localStorage.getItem('clubId'));
    if (fromStorage) {
      this.clubId = fromStorage;
      this.loadStaff();
    }
    this.loginService.usuarioActual.subscribe((user) => {
      if (user && !this.clubId) {
        this.clubId = (user as any).clubId ?? 0;
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
    if (isDemoMode()) {
      this.staffList = DemoDataService.getDemoStaffList();
      this.loading = false;
      return;
    }
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
      if (isDemoMode()) {
        // Actualizar permisos en memoria
        const target = this.staffList.find(u => u.userId === this.editingUser!.userId);
        if (target) {
          target.permissions = [...perms];
        }
        this.saving = false;
        this.successMsg = 'Permisos actualizados correctamente';
        setTimeout(() => this.closeModal(), 800);
        return;
      }
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
      if (isDemoMode()) {
        const maxId = this.staffList.reduce((max, u) => Math.max(max, u.userId), 0);
        body.userId = maxId + 1;
        this.staffList = [...this.staffList, { ...body }];
        this.saving = false;
        this.successMsg = 'Usuario Staff creado correctamente (demo)';
        setTimeout(() => this.closeModal(), 800);
        return;
      }
      const url = `${environment.apiUrl}club/staff/create`;
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

  /** Abre modal de confirmación para habilitar/deshabilitar */
  toggleEnabled(user: StaffUser): void {
    this.userToToggle = user;
    this.pendingEnableState = !user.enabled;
    this.showToggleConfirm = true;
    this.togglingConfirm = false;
  }

  confirmToggle(): void {
    if (!this.userToToggle || this.pendingEnableState === null) return;
    this.togglingConfirm = true;
    this.togglingId = this.userToToggle.userId;
    const newState = this.pendingEnableState;
    if (isDemoMode()) {
      this.userToToggle.enabled = newState;
      this.togglingId = null;
      this.closeToggleConfirm();
      return;
    }
    const url = `${environment.apiUrl}club/staff/toggle/${this.userToToggle.userId}?enable=${newState}`;
    this.http.patch<any>(url, null, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.userToToggle!.enabled = newState;
        this.togglingId = null;
        this.closeToggleConfirm();
      },
      error: () => {
        this.togglingConfirm = false;
        this.togglingId = null;
      },
    });
  }

  closeToggleConfirm(): void {
    this.showToggleConfirm = false;
    this.userToToggle = null;
    this.pendingEnableState = null;
    this.togglingConfirm = false;
    this.togglingId = null;
  }

  /** Abre modal de confirmación para eliminar */
  deleteStaff(user: StaffUser): void {
    this.userToDelete = user;
    this.showDeleteConfirm = true;
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.userToDelete) return;
    this.deleting = true;
    if (isDemoMode()) {
      this.staffList = this.staffList.filter(u => u.userId !== this.userToDelete!.userId);
      this.deleting = false;
      this.showDeleteConfirm = false;
      this.userToDelete = null;
      return;
    }
    const url = `${environment.apiUrl}club/staff/${this.userToDelete.userId}`;
    this.http.delete<any>(url, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.loadStaff();
        this.closeDeleteConfirm();
      },
      error: () => { this.deleting = false; },
    });
  }

  closeDeleteConfirm(): void {
    if (!this.deleting) {
      this.showDeleteConfirm = false;
      this.userToDelete = null;
    }
  }

  getFullName(user: StaffUser): string {
    return [user.firstName, user.secondName].filter(Boolean).join(' ') || 'Usuario';
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

  /**
   * Casillas del modal, todas a `false`. Se deriva de los catálogos en lugar de
   * repetir las claves: así no se puede quedar una casilla imposible de marcar
   * (o una clave retirada, como ERP, sobreviviendo aquí).
   */
  private buildDefaultPermissionsMap(): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    this.PERMISSION_GROUPS.forEach(g => g.children.forEach(c => (map[c.key] = false)));
    this.PERMISSION_STANDALONE.forEach(item => (map[item.key] = false));
    return map;
  }
}
