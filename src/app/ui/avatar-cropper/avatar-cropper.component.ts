import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Cropper de avatar circular nativo (sin dependencias externas).
 *
 * <p>UX:</p>
 * <ul>
 *   <li>Si {@link initialImage} no llega, el componente arranca con un
 *       botón "Seleccionar imagen" que abre el input file.</li>
 *   <li>Una vez la imagen está cargada, se pinta dentro de un área
 *       cuadrada con una máscara circular SVG y dos controles:
 *       arrastrar (mouse/touch) y un slider de zoom de 1x a 3x.</li>
 *   <li>Al aplicar, exportamos el contenido visible del círculo en un
 *       canvas 512×512 a PNG con fondo transparente (alpha radial).</li>
 * </ul>
 *
 * <p>API mínima: emite {@link applied} con el {@link Blob} resultante o
 * {@link cancelled} si el usuario cierra. El padre decide qué hacer con
 * el Blob (sube a backend, mantiene en memoria, etc.).</p>
 *
 * <p>Restricciones impuestas:</p>
 * <ul>
 *   <li>Solo extensiones {jpg, jpeg, png, webp}.</li>
 *   <li>Tamaño máximo 5 MB en la selección de archivo (validación
 *       cliente; el backend tiene su propio límite).</li>
 * </ul>
 */
@Component({
  selector: 'sph-avatar-cropper',
  templateUrl: './avatar-cropper.component.html',
  styleUrls: ['./avatar-cropper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarCropperComponent {
  /** Título del modal. Si no se pasa, se usa la i18n por defecto. */
  @Input() title?: string;
  /** Imagen previa (URL o File) para precargar el cropper. */
  @Input() initialImage: string | File | null = null;
  /** Tamaño en píxeles del lado del PNG exportado (cuadrado). */
  @Input() outputSize = 512;

  @Output() applied = new EventEmitter<Blob>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;

  /** Tamaño visible del cuadrado de edición. Lo mantenemos cuadrado responsivo. */
  readonly viewSize = 320;

  imageObj: HTMLImageElement | null = null;
  hasImage = false;
  loading = false;
  errorKey: string | null = null;

  zoom = 1;
  minZoom = 1;
  maxZoom = 3;

  // Offset del centro de la imagen respecto al centro del cuadrado.
  offsetX = 0;
  offsetY = 0;

  // Drag state.
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private offsetStartX = 0;
  private offsetStartY = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.initialImage) {
      this.loadFromAny(this.initialImage);
    }
  }

  /** Disparado desde el botón "Seleccionar imagen". */
  pickFile(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Reset para permitir re-elegir el mismo archivo.
    input.value = '';
    this.loadFromFile(file);
  }

  private loadFromAny(src: string | File): void {
    if (typeof src === 'string') {
      this.loadFromUrl(src);
    } else {
      this.loadFromFile(src);
    }
  }

  private loadFromFile(file: File): void {
    this.errorKey = null;
    if (file.size > 5 * 1024 * 1024) {
      this.errorKey = 'AVATAR_CROPPER.ERROR_SIZE';
      this.cdr.markForCheck();
      return;
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      this.errorKey = 'AVATAR_CROPPER.ERROR_FORMAT';
      this.cdr.markForCheck();
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => this.loadFromUrl(String(e.target?.result || ''));
    reader.onerror = () => {
      this.errorKey = 'AVATAR_CROPPER.ERROR_READ';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  private loadFromUrl(dataUrl: string): void {
    this.loading = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.imageObj = img;
      this.hasImage = true;
      this.loading = false;
      // Reset transforms para centrar.
      this.zoom = this.computeMinZoom(img);
      this.minZoom = this.zoom;
      this.offsetX = 0;
      this.offsetY = 0;
      this.cdr.markForCheck();
      // Pintamos el canvas en el próximo tick.
      setTimeout(() => this.drawCanvas(), 0);
    };
    img.onerror = () => {
      this.loading = false;
      this.errorKey = 'AVATAR_CROPPER.ERROR_READ';
      this.cdr.markForCheck();
    };
    img.src = dataUrl;
  }

  /**
   * Calcula el zoom mínimo para que la imagen siempre cubra el círculo
   * visible (de lo contrario quedarían barras transparentes). Es el
   * equivalente a `object-fit: cover`.
   */
  private computeMinZoom(img: HTMLImageElement): number {
    const ratioImg = img.width / img.height;
    if (ratioImg >= 1) {
      // Imagen apaisada: la altura debe llenar el cuadrado.
      return this.viewSize / img.height;
    }
    // Imagen vertical: la anchura debe llenar el cuadrado.
    return this.viewSize / img.width;
  }

  // ── Drag con mouse + touch ─────────────────────────────────────────
  onPointerDown(ev: PointerEvent): void {
    if (!this.hasImage) return;
    this.isDragging = true;
    this.dragStartX = ev.clientX;
    this.dragStartY = ev.clientY;
    this.offsetStartX = this.offsetX;
    this.offsetStartY = this.offsetY;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(ev: PointerEvent): void {
    if (!this.isDragging || !this.imageObj) return;
    const dx = ev.clientX - this.dragStartX;
    const dy = ev.clientY - this.dragStartY;
    this.offsetX = this.offsetStartX + dx;
    this.offsetY = this.offsetStartY + dy;
    this.clampOffsets();
    this.drawCanvas();
  }

  @HostListener('pointerup')
  @HostListener('pointercancel')
  onPointerUp(): void {
    this.isDragging = false;
  }

  /**
   * Mantiene la imagen siempre cubriendo el cuadrado de edición. Si el
   * usuario arrastra demasiado, la imagen "se topa" con el borde y no
   * deja huecos transparentes.
   */
  private clampOffsets(): void {
    if (!this.imageObj) return;
    const scaledW = this.imageObj.width * this.zoom;
    const scaledH = this.imageObj.height * this.zoom;
    const maxX = (scaledW - this.viewSize) / 2;
    const maxY = (scaledH - this.viewSize) / 2;
    this.offsetX = Math.max(-maxX, Math.min(maxX, this.offsetX));
    this.offsetY = Math.max(-maxY, Math.min(maxY, this.offsetY));
  }

  onZoomChange(): void {
    this.clampOffsets();
    this.drawCanvas();
  }

  /**
   * Pinta la vista previa en el canvas (cuadrado completo). La máscara
   * circular se aplica vía CSS (clip-path) en el preview para feedback
   * en vivo y vía Canvas globalCompositeOperation al exportar.
   */
  private drawCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.imageObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = this.viewSize;
    canvas.height = this.viewSize;
    ctx.clearRect(0, 0, this.viewSize, this.viewSize);
    const scaledW = this.imageObj.width * this.zoom;
    const scaledH = this.imageObj.height * this.zoom;
    const drawX = (this.viewSize - scaledW) / 2 + this.offsetX;
    const drawY = (this.viewSize - scaledH) / 2 + this.offsetY;
    ctx.drawImage(this.imageObj, drawX, drawY, scaledW, scaledH);
  }

  /**
   * Genera el PNG circular del tamaño de salida configurado y emite el
   * {@link Blob} al padre. La máscara circular se aplica con
   * `globalCompositeOperation='destination-in'`.
   */
  apply(): void {
    if (!this.imageObj || !this.hasImage) return;
    const out = document.createElement('canvas');
    out.width = this.outputSize;
    out.height = this.outputSize;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    // Escalado del cuadrado de edición al outputSize.
    const scale = this.outputSize / this.viewSize;
    const scaledW = this.imageObj.width * this.zoom * scale;
    const scaledH = this.imageObj.height * this.zoom * scale;
    const drawX = (this.outputSize - scaledW) / 2 + this.offsetX * scale;
    const drawY = (this.outputSize - scaledH) / 2 + this.offsetY * scale;
    ctx.drawImage(this.imageObj, drawX, drawY, scaledW, scaledH);

    // Máscara circular.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(this.outputSize / 2, this.outputSize / 2, this.outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    out.toBlob(
      (blob) => {
        if (blob) {
          this.applied.emit(blob);
        }
      },
      'image/png',
      0.95,
    );
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
