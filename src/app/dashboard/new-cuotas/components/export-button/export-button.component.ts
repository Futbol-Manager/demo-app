import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ClubService } from '../../../../core/services/club/club.service';

@Component({
  selector: 'app-export-button',
  templateUrl: './export-button.component.html',
  styleUrls: ['./export-button.component.scss']
})
export class ExportButtonComponent {

  @Input() clubId!: number;
  @Input() temporada!: string;

  exporting = false;

  constructor(
    private clubService: ClubService,
    private translate: TranslateService,
    private toastr: ToastrService
  ) {}

  exportExcel(): void {
    this.download('excel', 'pagos.xlsx');
  }

  exportPdf(): void {
    this.download('pdf', 'pagos.pdf');
  }

  private download(format: string, filename: string): void {
    this.exporting = true;
    this.clubService.exportPagos(this.clubId, this.temporada, format).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting = false;
      },
      error: () => {
        this.toastr.error(this.translate.instant('PAYMENTS.EXPORT.ERROR'));
        this.exporting = false;
      }
    });
  }
}
