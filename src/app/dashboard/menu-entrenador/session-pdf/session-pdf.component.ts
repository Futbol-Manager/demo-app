import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Training, Task } from 'src/app/core/services/models/training.models';
import { environment } from 'src/environments/environment';

declare var html2pdf: any;

/** Extracts a YouTube video ID from various URL formats */
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

@Component({
  selector: 'app-session-pdf',
  templateUrl: './session-pdf.component.html',
  styleUrls: ['./session-pdf.component.scss']
})
export class SessionPdfComponent implements OnChanges {

  @Input() training!: Training;
  @Input() daySession = '';
  @Input() teamName = '';

  isGenerating = false;
  showPdfTemplate = false;

  /** Resolved image URLs for each task */
  taskImages: string[] = [];

  /**
   * In dev (ng serve) we use the Angular proxy to serve cross-origin images
   * as same-origin, so html2canvas can render them without tainting the canvas.
   * In production the images are served from the same domain anyway.
   */
  readonly IMG_BASE = environment.production
    ? '/images/task-board/'
    : '/proxy-images/task-board/';
  readonly BLANK_IMG = 'assets/images/no-image.png';

  constructor(private t: TranslateService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['training'] && this.training?.tasks) {
      this.resolveTaskImages();
    }
  }

  /** For each task, determine the best image URL */
  private resolveTaskImages(): void {
    this.taskImages = this.training.tasks.map(task => {
      if (task.imagenBoard) {
        return this.IMG_BASE + task.imagenBoard;
      }
      const ytId = extractYoutubeId(task.video);
      if (ytId) {
        return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
      return this.BLANK_IMG;
    });
  }

  /** Hide PDF template and reset state, forcing change detection */
  private finishGeneration(): void {
    this.isGenerating = false;
    this.showPdfTemplate = false;
    this.cdr.detectChanges();
  }

  /** Generate and download the session PDF */
  async generatePdf(): Promise<void> {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.showPdfTemplate = true;
    this.cdr.detectChanges();

    // Wait for Angular to render the template + images to load
    await this.delay(800);

    const element = document.getElementById('session-pdf-content');
    if (!element) {
      console.error('session-pdf-content element not found');
      this.finishGeneration();
      return;
    }

    const dateStr = this.daySession || new Date().toISOString().slice(0, 10);
    const filename = `sesion_${dateStr}.pdf`;

    const options = {
      margin: 0.3,
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    // Images are same-origin (via proxy), so canvas is clean → save() works fine.
    html2pdf().from(element).set(options).save().then(() => {
      this.finishGeneration();
    }).catch((err: any) => {
      console.error('Error generating PDF:', err);
      this.finishGeneration();
    });
  }

  hasVideo(task: Task): boolean {
    return !!task.video && task.video.trim().length > 0;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(this.t.currentLang || 'es', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
