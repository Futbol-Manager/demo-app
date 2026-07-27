import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';

@Component({
  selector: 'app-rrss-comments',
  templateUrl: './rrss-comments.component.html',
  styleUrls: ['./rrss-comments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RrssCommentsComponent implements OnInit {
  comments: any[] = [];
  loading = false;
  platformFilter = '';
  statusFilter = '';
  replyingId: number | null = null;
  replyText = '';
  sendingReply = false;
  skippingId: number | null = null;

  constructor(private prospect: ProspectService, private notification: NotificationService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.prospect.getCommentLogs(this.platformFilter || undefined, this.statusFilter || undefined, 100)
      .subscribe({
        next: data => { this.comments = data; this.loading = false; this.cdr.markForCheck(); },
        error: () => { this.loading = false; this.cdr.markForCheck(); },
      });
  }

  startReply(id: number): void {
    this.replyingId = id;
    this.replyText = '';
  }

  sendReply(logId: number): void {
    if (!this.replyText.trim() || this.sendingReply) return;
    this.sendingReply = true;
    this.prospect.replyComment(logId, this.replyText).subscribe({
      next: () => {
        this.sendingReply = false;
        this.replyingId = null;
        this.replyText = '';
        this.load();
        this.notification.success('COMMON.SEND_OK');
        this.cdr.markForCheck();
      },
      error: () => { this.sendingReply = false; this.notification.errorGeneric(); this.cdr.markForCheck(); }
    });
  }

  skipComment(logId: number): void {
    if (this.skippingId === logId) return;
    this.skippingId = logId;
    this.prospect.skipComment(logId).subscribe({
      next: () => { this.skippingId = null; this.load(); this.notification.saveSuccess(); this.cdr.markForCheck(); },
      error: () => { this.skippingId = null; this.notification.errorGeneric(); this.cdr.markForCheck(); }
    });
  }
}
