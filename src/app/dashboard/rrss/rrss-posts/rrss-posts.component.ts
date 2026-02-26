import { Component, OnInit } from '@angular/core';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';

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
})
export class RrssPostsComponent implements OnInit {
  posts: any[] = [];
  groups: NetworkGroup[] = [];
  loading = false;
  networkFilter = '';
  statusFilter = '';

  showEditorModal = false;
  editingPost: any = null;

  constructor(private prospect: ProspectService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const net = this.networkFilter || undefined;
    const st  = this.statusFilter  || undefined;
    this.prospect.getSocialPosts(net, st).subscribe({
      next: posts => {
        this.posts = posts;
        this.buildGroups();
        this.loading = false;
      },
      error: () => { this.loading = false; },
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
          posts:     this.posts.filter(p => p.network === net),
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
    this.prospect.approveSocialPost(post.post_id).subscribe({
      next: (updated: any) => {
        const idx = this.posts.findIndex(p => p.post_id === updated.post_id);
        if (idx >= 0) this.posts[idx] = updated;
        this.buildGroups();
      },
    });
  }

  reject(post: any): void {
    this.prospect.rejectSocialPost(post.post_id).subscribe({
      next: () => {
        const idx = this.posts.findIndex(p => p.post_id === post.post_id);
        if (idx >= 0) this.posts[idx] = { ...this.posts[idx], status: 'REJECTED' };
        this.buildGroups();
      },
    });
  }

  deletePost(post: any): void {
    if (!confirm(`¿Borrar el post de ${post.network}? Esta acción no se puede deshacer.`)) return;
    this.prospect.deleteSocialPost(post.post_id).subscribe({
      next: () => {
        this.posts = this.posts.filter(p => p.post_id !== post.post_id);
        if (this.editingPost?.post_id === post.post_id) this.showEditorModal = false;
        this.buildGroups();
      },
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
