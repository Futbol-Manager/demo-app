import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfReportOptions {
  fileName: string;
  title: string;
  subtitle?: string;
  type?: 'training' | 'match' | 'financial' | 'video' | 'default';
  /** Club emisor del informe (opcional; usado para marca de agua/branding). */
  clubId?: number;
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {

  private readonly BRAND_DARK = '#002C3F';
  private readonly BRAND_GREEN = '#3BB271';
  private readonly BRAND_WHITE = '#FFFFFF';
  private readonly BRAND_LIGHT = '#F4F7FA';

  // Base64 encoded Sphaira logo (white version for dark header)
  // Loaded dynamically from assets
  private logoBase64: string | null = null;

  async exportReport(
    element: HTMLElement,
    options: PdfReportOptions
  ): Promise<void> {
    const { fileName, title, subtitle, type = 'default' } = options;

    // Ensure logo is loaded
    if (!this.logoBase64) {
      this.logoBase64 = await this.loadLogoAsBase64();
    }

    // Capture the content element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (el) => el.classList.contains('no-print')
    });

    const imgData = canvas.toDataURL('image/png');

    // A4 dimensions in mm
    const A4_W = 210;
    const A4_H = 297;
    const MARGIN = 14;
    const HEADER_H = 38;
    const FOOTER_H = 12;
    const CONTENT_W = A4_W - MARGIN * 2;
    const CONTENT_START_Y = HEADER_H + 6;
    const CONTENT_MAX_H = A4_H - CONTENT_START_Y - FOOTER_H - MARGIN;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // ── Calculate total pages needed ──
    const canvasAspect = canvas.width / canvas.height;
    const totalImgH = CONTENT_W / canvasAspect;
    const totalPages = Math.ceil(totalImgH / CONTENT_MAX_H);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      this.drawHeader(doc, title, subtitle || '', type, A4_W, HEADER_H);
      this.drawFooter(doc, page + 1, totalPages, A4_W, A4_H, FOOTER_H);

      // Crop and place content slice for this page
      const srcY = page * (canvas.height * CONTENT_MAX_H / totalImgH);
      const sliceH = Math.min(
        canvas.height * CONTENT_MAX_H / totalImgH,
        canvas.height - srcY
      );

      if (sliceH > 0) {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, -srcY);

        const sliceImg = sliceCanvas.toDataURL('image/png');
        const sliceDisplayH = (sliceH / canvas.height) * totalImgH;
        doc.addImage(sliceImg, 'PNG', MARGIN, CONTENT_START_Y, CONTENT_W, sliceDisplayH);
      }
    }

    doc.save(`${fileName}.pdf`);
  }

  private drawHeader(
    doc: jsPDF,
    title: string,
    subtitle: string,
    type: string,
    pageW: number,
    headerH: number
  ): void {
    // Background
    doc.setFillColor(this.BRAND_DARK);
    doc.roundedRect(0, 0, pageW, headerH, 0, 0, 'F');

    // Accent stripe
    const accentColor = type === 'financial' ? '#F59E0B' : this.BRAND_GREEN;
    doc.setFillColor(accentColor);
    doc.rect(0, headerH - 3, pageW, 3, 'F');

    // Logo (white) - if available
    if (this.logoBase64) {
      try {
        doc.addImage(this.logoBase64, 'PNG', 10, 6, 48, 13);
      } catch {
        this.drawTextLogo(doc, 10, 16);
      }
    } else {
      this.drawTextLogo(doc, 10, 16);
    }

    // Vertical separator
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
    doc.line(68, 8, 68, headerH - 8);
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // Title
    doc.setTextColor(this.BRAND_WHITE);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 74, 18, { maxWidth: pageW - 90 });

    // Subtitle / date
    if (subtitle) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 210, 195);
      doc.text(subtitle, 74, 27, { maxWidth: pageW - 90 });
    }

    // Date on the right
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    doc.setFontSize(7.5);
    doc.setTextColor(160, 200, 185);
    doc.text(dateStr, pageW - 12, 24, { align: 'right' });
  }

  private drawTextLogo(doc: jsPDF, x: number, y: number): void {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.BRAND_GREEN);
    doc.text('SPHAIRA', x, y);
    doc.setTextColor(this.BRAND_WHITE);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TECH', x + 36, y);
  }

  private drawFooter(
    doc: jsPDF,
    currentPage: number,
    totalPages: number,
    pageW: number,
    pageH: number,
    footerH: number
  ): void {
    const y = pageH - footerH;

    // Separator line
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.line(14, y, pageW - 14, y);

    // Left: branding
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 155, 170);
    doc.text('Generado por Sphaira Tech · appsphairatech.com', 14, y + 5);

    // Right: page number
    doc.setTextColor(100, 115, 130);
    doc.setFont('helvetica', 'bold');
    doc.text(`${currentPage} / ${totalPages}`, pageW - 14, y + 5, { align: 'right' });
  }

  private async loadLogoAsBase64(): Promise<string | null> {
    try {
      // Try to load a PNG version from assets first, then fallback to SVG
      const response = await fetch('/assets/images/logo_white.svg');
      if (!response.ok) return null;
      const svgText = await response.text();

      // Convert SVG to PNG via canvas
      return await this.svgToPngBase64(svgText, 300, 80);
    } catch {
      return null;
    }
  }

  private svgToPngBase64(svgText: string, width: number, height: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Add dark background to make white SVG visible in PDF header
      const svgWithBg = svgText.replace(
        '<svg',
        `<svg style="background:${this.BRAND_DARK}"`
      );

      const blob = new Blob([svgWithBg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = this.BRAND_DARK;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')); };
      img.src = url;
    });
  }
}
