import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';
import { PostEditorModalComponent } from '../post-editor-modal/post-editor-modal.component';

const NETWORK_ORDER = ['instagram', 'facebook', 'linkedin', 'twitter'];
const NETWORK_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook:  'Facebook',
  linkedin:  'LinkedIn',
  twitter:   'Twitter / X',
};

export interface NetworkGroup {
  network: string;
  label: string;
  posts: any[];
  collapsed: boolean;
}

@Component({
  selector: 'app-rrss-posts',
  templateUrl: './rrss-posts.component.html',
  styleUrls: ['./rrss-posts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RrssPostsComponent implements OnInit {
  posts: any[] = [];
  groups: NetworkGroup[] = [];
  loading = false;
  networkFilter = '';
  statusFilter = '';

  showEditorModal = false;
  editingPost: any = null;

  // Métricas: post_id → datos
  metrics: Record<number, any> = {};
  loadingMetrics: Record<number, boolean> = {};

  approvingId: number | null = null;
  rejectingId: number | null = null;
  deletingId: number | null = null;

  constructor(
    private prospect: ProspectService,
    private notification: NotificationService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  loadMetrics(post: any): void {
    if (post.network !== 'twitter' || !post.external_post_id) return;
    if (this.metrics[post.post_id] || this.loadingMetrics[post.post_id]) return;
    this.loadingMetrics[post.post_id] = true;
    this.prospect.getPostMetrics(post.post_id).subscribe({
      next: (res: any) => {
        this.loadingMetrics[post.post_id] = false;
        if (res.ok && res.metrics) this.metrics[post.post_id] = res.metrics;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingMetrics[post.post_id] = false; this.cdr.markForCheck(); },
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const net = this.networkFilter || undefined;
    const st  = this.statusFilter  || undefined;
    this.prospect.getSocialPostsJava(net, st).subscribe({
      next: posts => {
        this.posts = posts;
        this.buildGroups();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  buildGroups(): void {
    const order = this.networkFilter
      ? [this.networkFilter]
      : NETWORK_ORDER;

    this.groups = order
      .map(net => {
        const existing = this.groups.find(g => g.network === net);
        return {
          network:   net,
          label:     NETWORK_LABELS[net] || net,
          posts:     this.posts
            .filter(p => p.network === net)
            .sort((a, b) => {
              const da = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
              const db = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
              return da - db;
            }),
          collapsed: existing ? existing.collapsed : false,
        };
      })
      .filter(g => g.posts.length > 0 || !this.networkFilter);
  }

  toggleGroup(group: NetworkGroup): void {
    group.collapsed = !group.collapsed;
  }

  openEdit(post: any): void {
    this.editingPost = { ...post };
    this.showEditorModal = true;
  }

  openCreate(): void {
    this.editingPost = null;
    this.showEditorModal = true;
  }

  onEditorSaved(post: any): void {
    const idx = this.posts.findIndex(p => p.post_id === post.post_id);
    if (idx >= 0) {
      this.posts[idx] = post;
    } else {
      this.posts = [post, ...this.posts];
    }
    this.buildGroups();
    this.showEditorModal = false;
  }

  onEditorClosed(): void {
    this.showEditorModal = false;
  }

  approve(post: any): void {
    if (this.approvingId === post.post_id) return;
    this.approvingId = post.post_id;
    this.prospect.approveSocialPostJava(post.post_id).subscribe({
      next: (updated: any) => {
        this.approvingId = null;
        const idx = this.posts.findIndex(p => p.post_id === (updated?.post_id ?? post.post_id));
        if (idx >= 0) this.posts[idx] = updated ?? { ...this.posts[idx], status: 'APPROVED' };
        this.buildGroups();
        this.notification.success('COMMON.CHANGES_SAVED');
        this.cdr.markForCheck();
      },
      error: () => { this.approvingId = null; this.notification.errorGeneric(); this.cdr.markForCheck(); }
    });
  }

  reject(post: any): void {
    if (this.rejectingId === post.post_id) return;
    this.rejectingId = post.post_id;
    this.prospect.rejectSocialPostJava(post.post_id).subscribe({
      next: () => {
        this.rejectingId = null;
        const idx = this.posts.findIndex(p => p.post_id === post.post_id);
        if (idx >= 0) this.posts[idx] = { ...this.posts[idx], status: 'REJECTED' };
        this.buildGroups();
        this.notification.success('COMMON.CHANGES_SAVED');
        this.cdr.markForCheck();
      },
      error: () => { this.rejectingId = null; this.notification.errorGeneric(); this.cdr.markForCheck(); }
    });
  }

  deletePost(post: any): void {
    if (this.deletingId === post.post_id) return;
    this.confirmationService.confirm({ message: `¿Borrar el post de ${post.network}? Esta acción no se puede deshacer.`, confirmStyle: 'warn' }).subscribe(ok => {
      if (!ok) return;
      this.deletingId = post.post_id;
      this.cdr.markForCheck();
      this.prospect.deleteSocialPostJava(post.post_id).subscribe({
        next: () => {
          this.deletingId = null;
          this.posts = this.posts.filter(p => p.post_id !== post.post_id);
          if (this.editingPost?.post_id === post.post_id) this.showEditorModal = false;
          this.buildGroups();
          this.notification.deleteSuccess();
          this.cdr.markForCheck();
        },
        error: () => { this.deletingId = null; this.notification.errorGeneric(); this.cdr.markForCheck(); }
      });
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador', APPROVED: 'Aprobado', SCHEDULED: 'Programado',
      PUBLISHED: 'Publicado', REJECTED: 'Rechazado',
    };
    return map[status] || status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'status-draft', APPROVED: 'status-approved', SCHEDULED: 'status-scheduled',
      PUBLISHED: 'status-published', REJECTED: 'status-rejected',
    };
    return map[status] || 'status-draft';
  }

  networkIcon(network: string): string {
    const icons: Record<string, string> = {
      instagram: 'bi-instagram', facebook: 'bi-facebook',
      linkedin: 'bi-linkedin', twitter: 'bi-twitter-x',
    };
    return icons[network] || 'bi-share';
  }
}
