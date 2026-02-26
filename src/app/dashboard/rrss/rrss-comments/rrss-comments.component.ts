import { Component, OnInit } from '@angular/core';
import { ProspectService } from 'src/app/core/services/prospect/prospect.service';

@Component({
  selector: 'app-rrss-comments',
  templateUrl: './rrss-comments.component.html',
  styleUrls: ['./rrss-comments.component.scss'],
})
export class RrssCommentsComponent implements OnInit {
  comments: any[] = [];
  loading = false;
  platformFilter = '';
  statusFilter = '';
  replyingId: number | null = null;
  replyText = '';

  constructor(private prospect: ProspectService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.prospect.getCommentLogs(this.platformFilter || undefined, this.statusFilter || undefined, 100)
      .subscribe({
        next: data => { this.comments = data; this.loading = false; },
        error: () => { this.loading = false; },
      });
  }

  startReply(id: number): void {
    this.replyingId = id;
    this.replyText = '';
  }

  sendReply(logId: number): void {
    if (!this.replyText.trim()) return;
    this.prospect.replyComment(logId, this.replyText).subscribe(() => {
      this.replyingId = null;
      this.load();
    });
  }

  skipComment(logId: number): void {
    this.prospect.skipComment(logId).subscribe(() => this.load());
  }
}
