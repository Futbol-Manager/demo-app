import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, take, takeUntil, tap } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { AnalysisCategory, AnalysisTag, AnalysisTemplate } from '../models/analysis.models';

type CatShape = 'RECTANGLE' | 'CIRCLE' | 'DIAMOND' | 'SQUARE';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface EditorCategory extends AnalysisCategory {
  tags: AnalysisTag[];
  isDirty?: boolean;
  isNew?: boolean;
  /** DESCRIPTOR = template-level button positioned on canvas (no shortcut/time). */
  buttonType?: 'CATEGORY' | 'DESCRIPTOR';
  /** Opacity 0–1 for descriptor buttons only (default 1). */
  opacity?: number;
  /** When true the button cannot be moved or resized on the canvas. */
  locked?: boolean;
}

// Tags with id < 0 are "pending" (not yet saved, belong to an unsaved category)
function isPendingTag(tag: AnalysisTag): boolean {
  return tag.id < 0;
}

@Component({
  selector: 'app-template-editor',
  templateUrl: './template-editor.component.html',
  styleUrls: ['./template-editor.component.scss']
})
export class TemplateEditorComponent implements OnInit, OnDestroy {
  @ViewChild('canvasArea', { static: false }) canvasArea!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private catSave$ = new Subject<void>();
  private templateSave$ = new Subject<void>();

  templateId = 0;
  template: AnalysisTemplate | null = null;
  categories: EditorCategory[] = [];

  isLoading = true;
  isSavingTemplate = false;
  isSavingCategory = false;
  isSavingAll = false;
  isSystemTemplate = false;
  saveInfoError = '';

  showUnsavedModal = false;
  savedOk = false;
  private pendingLeave = false;
  private savedToastTimer: any = null;

  get hasUnsavedChanges(): boolean {
    return this.categories.some(c => c.isNew && c.name.trim().length > 0);
  }

  get categoryCount(): number {
    return this.categories.filter(c => c.buttonType !== 'DESCRIPTOR').length;
  }

  get descriptorCount(): number {
    return this.categories.filter(c => c.buttonType === 'DESCRIPTOR').length;
  }

  selectedCategory: EditorCategory | null = null;
  editName = '';
  editDescription = '';

  catName = '';
  catColor = '#3498DB';
  catShortcut = '';
  catPreTime = 5;
  catPostTime = 3;
  catShape: CatShape = 'RECTANGLE';
  catTextSize = 13;
  catTextColor = '#FFFFFF';
  /** Opacity 0–1 for descriptor buttons (default 1). Only used when editing a descriptor. */
  catOpacity = 1;
  newTagName = '';

  backgroundImage = '';
  bgOpacity = 0.8;

  // Canvas background color
  bgColor = '';
  showBgColorPanel = false;

  // Background image position/size as % of canvas
  bgImgX = 0;
  bgImgY = 0;
  bgImgW = 100;
  bgImgH = 100;
  bgImgSelected = false;
  bgImgLocked = false;

  // Bg image drag state
  private bgDragging = false;
  private bgDragOffsetX = 0;
  private bgDragOffsetY = 0;
  private bgDragOrigX = 0;
  private bgDragOrigY = 0;

  // Bg image resize state
  private bgResizing = false;
  private bgResizeHandle: string | null = null;
  private bgResizeStartX = 0;
  private bgResizeStartY = 0;
  private bgResizeOrigX = 0;
  private bgResizeOrigY = 0;
  private bgResizeOrigW = 0;
  private bgResizeOrigH = 0;

  // Preset canvas background colors
  readonly BG_COLOR_PRESETS = [
    // Transparente
    '',
    // Oscuros
    '#0d1117', '#1a1a1a', '#1a1a2e', '#16213e', '#111827',
    // Verdes
    '#0f2d1e', '#2d5016', '#1a3a26', '#31b270',
    // Azules
    '#1e3a5f', '#0d3b6e', '#1565c0', '#2196f3',
    // Rojos / naranjas
    '#3d1a1a', '#7f1d1d', '#e53935', '#f97316',
    // Morados
    '#2a1a3e', '#4a148c', '#7b1fa2', '#9c27b0',
    // Marrones / grises
    '#3e2723', '#37474f', '#607d8b', '#9e9e9e',
    // Claros
    '#f5f5f5', '#e3f2fd', '#e8f5e9', '#fff3e0',
    '#ffffff'
  ];

  // Drag state
  dragging = false;
  dragCat: EditorCategory | null = null;
  dragOffsetPctX = 0;
  dragOffsetPctY = 0;
  private dragOrigX = 0;
  private dragOrigY = 0;

  // Resize state
  resizing = false;
  resizeCat: EditorCategory | null = null;
  resizeHandle: ResizeHandle | null = null;
  resizeStartX = 0;
  resizeStartY = 0;
  resizeOrigPosX = 0;
  resizeOrigPosY = 0;
  resizeOrigW = 0;
  resizeOrigH = 0;

  // Ghost
  ghostX = 0;
  ghostY = 0;
  ghostW = 14;
  ghostH = 12;
  ghostShape: CatShape = 'RECTANGLE';
  showGhost = false;

  readonly SHAPES: { id: CatShape; label: string; icon: string }[] = [
    { id: 'RECTANGLE', label: 'Rectángulo', icon: 'bi-square' },
    { id: 'SQUARE', label: 'Cuadrado', icon: 'bi-square-fill' },
    { id: 'CIRCLE', label: 'Círculo', icon: 'bi-circle-fill' },
    { id: 'DIAMOND', label: 'Rombo', icon: 'bi-diamond-fill' },
  ];

  readonly COLOR_PALETTE = [
    '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
    '#1ABC9C', '#3498DB', '#9B59B6', '#EC407A',
    '#FF5722', '#8BC34A', '#00BCD4', '#5C6BC0',
    '#795548', '#607D8B', '#34495E', '#27AE60'
  ];

  readonly TEXT_COLOR_PRESETS = [
    '#FFFFFF', '#000000', '#F1C40F', '#E74C3C',
    '#3498DB', '#2ECC71', '#9B59B6', '#FF5722'
  ];

  private boundMouseMove = this.onMouseMove.bind(this);
  private boundMouseUp = this.onMouseUp.bind(this);

  /** Clipboard for copy/paste of canvas buttons. */
  clipboard: EditorCategory | null = null;
  /** Brief flash to indicate copy was done. */
  copiedFlash = false;
  private copiedFlashTimer: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analysisService: VideoAnalysisService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.setupAutoSave();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.templateId = Number(params['id']);
      this.loadTemplate();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private setupAutoSave(): void {
    this.catSave$.pipe(
      debounceTime(600),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.selectedCategory && !this.selectedCategory.isNew) {
        this.persistCategoryProps();
      }
    });

    this.templateSave$.pipe(
      debounceTime(800),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.doSaveTemplateInfo().subscribe();
    });
  }

  private loadTemplate(): void {
    this.isLoading = true;
    this.selectedCategory = null;
    this.analysisService.getTemplate(this.templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const data = res.data;
          this.template = data.template;
          this.isSystemTemplate = this.template?.isSystem ?? false;
          this.editName = this.template?.name ?? '';
          this.editDescription = this.template?.description ?? '';
          this.backgroundImage = this.template?.backgroundImage ?? '';
          this.bgOpacity = (this.template as any)?.backgroundOpacity ?? 0.8;
          this.bgColor = (this.template as any)?.bgColor ?? '';
          this.bgImgX = (this.template as any)?.bgImgX ?? 0;
          this.bgImgY = (this.template as any)?.bgImgY ?? 0;
          this.bgImgW = (this.template as any)?.bgImgW ?? 100;
          this.bgImgH = (this.template as any)?.bgImgH ?? 100;
          this.bgImgLocked = (this.template as any)?.bgImgLocked ?? false;
          this.bgImgSelected = false;

          const catItems: EditorCategory[] = (data.categories || []).map((item: any, index: number) => {
            const cat = item.category ?? item;
            const tags = item.tags ?? [];
            return {
              ...cat,
              tags,
              isDirty: false,
              isNew: false,
              buttonType: 'CATEGORY' as const,
              posX: cat.posX ?? 5 + (index % 5) * 16,
              posY: cat.posY ?? 5 + Math.floor(index / 5) * 15,
              sizeW: cat.sizeW ?? 14,
              sizeH: cat.sizeH ?? 12,
              shape: cat.shape ?? 'RECTANGLE',
              textSize: cat.textSize ?? 13,
              textColor: cat.textColor ?? '#FFFFFF',
              opacity: cat.opacity ?? 1,
              locked: cat.locked ?? false
            } as EditorCategory;
          });

          const descItems: EditorCategory[] = (data.descriptors || []).map((desc: any, index: number) => {
            return {
              id: desc.id,
              templateId: this.templateId,
              parentId: undefined,
              name: desc.name,
              color: desc.color || '#9B59B6',
              icon: undefined,
              shortcutKey: undefined,
              defaultDurationSec: 0,
              preTimeSec: 0,
              postTimeSec: 0,
              gridX: 0, gridY: 0, gridW: 2, gridH: 1,
              sortOrder: desc.sortOrder ?? index,
              tags: [],
              isDirty: false,
              isNew: false,
              buttonType: 'DESCRIPTOR' as const,
              posX: desc.posX ?? 5 + (index % 5) * 18,
              posY: desc.posY ?? 80,
              sizeW: desc.sizeW ?? 14,
              sizeH: desc.sizeH ?? 10,
              shape: (desc.shape ?? 'RECTANGLE') as CatShape,
              textSize: desc.textSize ?? 13,
              textColor: desc.textColor ?? '#FFFFFF',
              opacity: desc.opacity ?? 1,
              locked: desc.locked ?? false
            } as EditorCategory;
          });

          this.categories = [...catItems, ...descItems];
          this.categories.sort((a, b) => {
            if (a.buttonType !== b.buttonType) return a.buttonType === 'CATEGORY' ? -1 : 1;
            return a.sortOrder - b.sortOrder;
          });
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  // ── Canvas helpers ──

  private getCanvasRect(): DOMRect | null {
    return this.canvasArea?.nativeElement?.getBoundingClientRect() ?? null;
  }

  private pxToPct(clientX: number, clientY: number): { px: number; py: number } {
    const r = this.getCanvasRect();
    if (!r) return { px: 0, py: 0 };
    return {
      px: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      py: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100))
    };
  }

  // ── Drag ──

  onBtnMouseDown(event: MouseEvent, cat: EditorCategory): void {
    if (this.isSystemTemplate || event.button !== 0) return;
    if (cat.locked) { this.selectCategory(cat); return; }
    const target = event.target as HTMLElement;
    if (target.closest('.resize-handle')) return;

    event.preventDefault();
    event.stopPropagation();
    this.selectCategory(cat);

    const { px, py } = this.pxToPct(event.clientX, event.clientY);
    this.dragging = true;
    this.dragCat = cat;
    this.dragOffsetPctX = px - cat.posX;
    this.dragOffsetPctY = py - cat.posY;
    this.dragOrigX = cat.posX;
    this.dragOrigY = cat.posY;

    // No ghost for drag — the button moves directly
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  // ── Resize ──

  onResizeMouseDown(event: MouseEvent, cat: EditorCategory, handle: string): void {
    if (this.isSystemTemplate || event.button !== 0 || cat.locked) return;
    event.preventDefault();
    event.stopPropagation();

    this.selectCategory(cat);
    this.resizing = true;
    this.resizeCat = cat;
    this.resizeHandle = handle as ResizeHandle;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.resizeOrigPosX = cat.posX;
    this.resizeOrigPosY = cat.posY;
    this.resizeOrigW = cat.sizeW;
    this.resizeOrigH = cat.sizeH;

    this.showGhost = true;
    this.ghostX = cat.posX;
    this.ghostY = cat.posY;
    this.ghostW = cat.sizeW;
    this.ghostH = cat.sizeH;
    this.ghostShape = cat.shape;

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.bgDragging) {
      const { px, py } = this.pxToPct(e.clientX, e.clientY);
      this.bgImgX = Math.max(-50, Math.min(100, px - this.bgDragOffsetX));
      this.bgImgY = Math.max(-50, Math.min(100, py - this.bgDragOffsetY));
    }

    if (this.bgResizing) {
      const r = this.getCanvasRect();
      if (!r) return;
      const dpx = ((e.clientX - this.bgResizeStartX) / r.width) * 100;
      const dpy = ((e.clientY - this.bgResizeStartY) / r.height) * 100;
      const h = this.bgResizeHandle;
      const MIN = 10;
      let x = this.bgResizeOrigX, y = this.bgResizeOrigY;
      let w = this.bgResizeOrigW, hh = this.bgResizeOrigH;
      if (h?.includes('e')) w = Math.max(MIN, this.bgResizeOrigW + dpx);
      if (h?.includes('w')) { const nw = Math.max(MIN, this.bgResizeOrigW - dpx); x = this.bgResizeOrigX + (this.bgResizeOrigW - nw); w = nw; }
      if (h?.includes('s')) hh = Math.max(MIN, this.bgResizeOrigH + dpy);
      if (h?.includes('n')) { const nh = Math.max(MIN, this.bgResizeOrigH - dpy); y = this.bgResizeOrigY + (this.bgResizeOrigH - nh); hh = nh; }
      this.bgImgX = x; this.bgImgY = y; this.bgImgW = w; this.bgImgH = hh;
    }

    if (this.dragging && this.dragCat) {
      const { px, py } = this.pxToPct(e.clientX, e.clientY);
      let newX = px - this.dragOffsetPctX;
      let newY = py - this.dragOffsetPctY;
      newX = Math.max(0, Math.min(100 - this.dragCat.sizeW, newX));
      newY = Math.max(0, Math.min(100 - this.dragCat.sizeH, newY));
      // Move the button directly — no ghost needed
      this.dragCat.posX = newX;
      this.dragCat.posY = newY;
    }

    if (this.resizing && this.resizeCat) {
      const r = this.getCanvasRect();
      if (!r) return;
      const dpx = ((e.clientX - this.resizeStartX) / r.width) * 100;
      const dpy = ((e.clientY - this.resizeStartY) / r.height) * 100;
      const h = this.resizeHandle;
      const MIN = 5;

      let x = this.resizeOrigPosX, y = this.resizeOrigPosY;
      let w = this.resizeOrigW, hh = this.resizeOrigH;

      if (h?.includes('e')) w = Math.max(MIN, this.resizeOrigW + dpx);
      if (h?.includes('w')) {
        const nw = Math.max(MIN, this.resizeOrigW - dpx);
        x = this.resizeOrigPosX + (this.resizeOrigW - nw);
        w = nw;
      }
      if (h?.includes('s')) hh = Math.max(MIN, this.resizeOrigH + dpy);
      if (h?.includes('n')) {
        const nh = Math.max(MIN, this.resizeOrigH - dpy);
        y = this.resizeOrigPosY + (this.resizeOrigH - nh);
        hh = nh;
      }

      // Keep square/circle/diamond aspect ratio during resize
      if (this.resizeCat.shape === 'SQUARE' || this.resizeCat.shape === 'CIRCLE' || this.resizeCat.shape === 'DIAMOND') {
        const bigger = Math.max(w, hh);
        w = bigger;
        hh = bigger;
      }

      x = Math.max(0, x);
      y = Math.max(0, y);
      if (x + w > 100) w = 100 - x;
      if (y + hh > 100) hh = 100 - y;

      this.ghostX = x;
      this.ghostY = y;
      this.ghostW = w;
      this.ghostH = hh;
    }
  }

  private onMouseUp(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);

    if (this.bgDragging) {
      const moved = this.bgImgX !== this.bgDragOrigX || this.bgImgY !== this.bgDragOrigY;
      if (moved) this.templateSave$.next();
      this.bgDragging = false;
    }

    if (this.bgResizing) {
      this.templateSave$.next();
      this.bgResizing = false;
      this.bgResizeHandle = null;
    }

    if (this.dragging && this.dragCat) {
      const moved = this.dragCat.posX !== this.dragOrigX || this.dragCat.posY !== this.dragOrigY;
      if (moved && !this.dragCat.isNew) this.persistCategoryLayout(this.dragCat);
    }

    if (this.resizing && this.resizeCat) {
      const changed = this.resizeCat.posX !== this.ghostX || this.resizeCat.posY !== this.ghostY ||
                      this.resizeCat.sizeW !== this.ghostW || this.resizeCat.sizeH !== this.ghostH;
      this.resizeCat.posX = this.ghostX;
      this.resizeCat.posY = this.ghostY;
      this.resizeCat.sizeW = this.ghostW;
      this.resizeCat.sizeH = this.ghostH;
      if (changed && !this.resizeCat.isNew) this.persistCategoryLayout(this.resizeCat);
    }

    this.dragging = false;
    this.dragCat = null;
    this.resizing = false;
    this.resizeCat = null;
    this.resizeHandle = null;
    this.showGhost = false;
  }

  private persistCategoryLayout(cat: EditorCategory): void {
    if (cat.buttonType === 'DESCRIPTOR') {
      this.analysisService.updateTag(cat.id, {
        posX: cat.posX, posY: cat.posY,
        sizeW: cat.sizeW, sizeH: cat.sizeH,
        shape: cat.shape
      }).pipe(takeUntil(this.destroy$)).subscribe();
    } else {
      this.analysisService.updateCategory(cat.id, {
        posX: cat.posX, posY: cat.posY,
        sizeW: cat.sizeW, sizeH: cat.sizeH,
        shape: cat.shape
      }).pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  // ── Canvas click ──

  onCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('canvas-surface')) {
      this.deselectCategory();
      this.bgImgSelected = false;
    }
  }

  // ── Shape helper for CSS ──

  getShapeClip(shape: CatShape): string {
    switch (shape) {
      case 'DIAMOND': return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
      default: return 'none';
    }
  }

  getShapeRadius(shape: CatShape): string {
    switch (shape) {
      case 'CIRCLE': return '50%';
      case 'SQUARE': return '4px';
      case 'RECTANGLE': return '8px';
      default: return '8px';
    }
  }

  // ── Category editing ──

  selectCategory(cat: EditorCategory): void {
    this.selectedCategory = cat;
    this.catName = cat.name;
    this.catColor = cat.color;
    this.catShortcut = cat.shortcutKey ?? '';
    this.catPreTime = cat.preTimeSec ?? 5;
    this.catPostTime = cat.postTimeSec ?? 3;
    this.catShape = cat.shape ?? 'RECTANGLE';
    this.catTextSize = cat.textSize ?? 13;
    this.catTextColor = cat.textColor ?? '#FFFFFF';
    this.catOpacity = cat.opacity ?? 1;
    this.newTagName = '';
  }

  deselectCategory(): void {
    this.selectedCategory = null;
  }

  // ── Real-time field changes: apply immediately to canvas + debounced save ──

  private applyFormToCategory(): void {
    if (!this.selectedCategory) return;
    this.selectedCategory.name = this.catName;
    this.selectedCategory.color = this.catColor;
    this.selectedCategory.shortcutKey = this.catShortcut;
    this.selectedCategory.preTimeSec = this.catPreTime;
    this.selectedCategory.postTimeSec = this.catPostTime;
    this.selectedCategory.shape = this.catShape;
    this.selectedCategory.textSize = this.catTextSize;
    this.selectedCategory.textColor = this.catTextColor;
    this.selectedCategory.opacity = this.catOpacity;
  }

  onCatFieldChange(): void {
    this.applyFormToCategory();
    if (this.selectedCategory && !this.selectedCategory.isNew) {
      this.catSave$.next();
    }
  }

  onShapeChange(shape: CatShape): void {
    if (this.isSystemTemplate) return;
    this.catShape = shape;
    if (this.selectedCategory) {
      this.selectedCategory.shape = shape;
      if (shape === 'SQUARE' || shape === 'CIRCLE' || shape === 'DIAMOND') {
        const side = Math.max(this.selectedCategory.sizeW, this.selectedCategory.sizeH);
        const s = side < 8 ? 14 : side;
        this.selectedCategory.sizeW = s;
        this.selectedCategory.sizeH = s;
      }
      if (!this.selectedCategory.isNew) {
        this.catSave$.next();
      }
    }
  }

  selectColor(color: string): void {
    if (this.isSystemTemplate) return;
    this.catColor = color;
    this.onCatFieldChange();
  }

  // ── Template save (auto-debounced) ──

  onTemplateNameChange(): void {
    this.templateSave$.next();
  }

  onTemplateDescChange(): void {
    this.templateSave$.next();
  }

  onBackgroundChange(): void {
    this.templateSave$.next();
  }

  onBgOpacityChange(): void {
    this.templateSave$.next();
  }

  clearBackground(): void {
    this.backgroundImage = '';
    this.bgImgX = 0; this.bgImgY = 0; this.bgImgW = 100; this.bgImgH = 100;
    this.bgImgSelected = false;
    this.templateSave$.next();
  }

  onBgColorChange(): void {
    this.templateSave$.next();
  }

  selectBgColor(c: string): void {
    if (this.isSystemTemplate) return;
    this.bgColor = c;
    this.templateSave$.next();
  }

  // ── Background image drag ──

  onBgMouseDown(event: MouseEvent): void {
    if (this.isSystemTemplate || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.resize-handle')) return;
    if (this.bgImgLocked) { this.bgImgSelected = true; this.deselectCategory(); return; }
    event.preventDefault();
    event.stopPropagation();
    this.bgImgSelected = true;
    this.deselectCategory();

    const { px, py } = this.pxToPct(event.clientX, event.clientY);
    this.bgDragging = true;
    this.bgDragOffsetX = px - this.bgImgX;
    this.bgDragOffsetY = py - this.bgImgY;
    this.bgDragOrigX = this.bgImgX;
    this.bgDragOrigY = this.bgImgY;

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  // ── Background image resize ──

  onBgResizeDown(event: MouseEvent, handle: string): void {
    if (this.isSystemTemplate || event.button !== 0 || this.bgImgLocked) return;
    event.preventDefault();
    event.stopPropagation();

    this.bgResizing = true;
    this.bgResizeHandle = handle;
    this.bgResizeStartX = event.clientX;
    this.bgResizeStartY = event.clientY;
    this.bgResizeOrigX = this.bgImgX;
    this.bgResizeOrigY = this.bgImgY;
    this.bgResizeOrigW = this.bgImgW;
    this.bgResizeOrigH = this.bgImgH;

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  onBackgroundFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10 MB');
      input.value = '';
      return;
    }
    // Compress the image to stay well under MySQL max_allowed_packet (4-16 MB).
    // Resizes to max 1200×800, JPEG at 0.75 quality → typically < 300 KB as base64.
    this.compressImageToBase64(file).then(compressed => {
      this.ngZone.run(() => {
        this.backgroundImage = compressed;
        this.templateSave$.next();
      });
    }).catch(() => {
      this.ngZone.run(() => alert('Error al procesar la imagen'));
    });
    input.value = '';
  }

  private compressImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        const MAX_W = 1400;
        const MAX_H = 900;
        let { width, height } = img;
        if (width > MAX_W) { height = Math.round(height * MAX_W / width); width = MAX_W; }
        if (height > MAX_H) { width = Math.round(width * MAX_H / height); height = MAX_H; }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.80));
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(); };
      img.src = blobUrl;
    });
  }

  private doSaveTemplateInfo(): Observable<any> {
    if (!this.editName.trim() || this.isSystemTemplate) return of(null);
    this.isSavingTemplate = true;
    this.saveInfoError = '';
    return this.analysisService.updateTemplate(this.templateId, {
      name: this.editName,
      description: this.editDescription,
      backgroundImage: this.backgroundImage || null,
      backgroundOpacity: this.bgOpacity,
      bgColor: this.bgColor || null,
      bgImgX: this.bgImgX,
      bgImgY: this.bgImgY,
      bgImgW: this.bgImgW,
      bgImgH: this.bgImgH,
      bgImgLocked: this.bgImgLocked
    }).pipe(
      take(1),
      tap(() => {
        this.isSavingTemplate = false;
        if (this.template) {
          this.template.name = this.editName;
          this.template.description = this.editDescription;
          this.template.backgroundImage = this.backgroundImage;
        }
      }),
      catchError((err) => {
        this.isSavingTemplate = false;
        // Extract the most useful error message from various response shapes
        const msg = err?.error?.error?.msg
          || err?.error?.message
          || err?.message
          || 'Error al guardar la plantilla';
        this.showErrorToast(msg);
        console.error('Error saving template info:', err);
        return of(null);
      })
    );
  }

  // ── Category/Descriptor persist (auto-save for existing) ──

  private persistCategoryProps(): void {
    if (!this.selectedCategory || !this.catName.trim()) return;

    if (this.selectedCategory.buttonType === 'DESCRIPTOR') {
      this.persistDescriptorProps();
      return;
    }

    const body: any = {
      name: this.catName,
      color: this.catColor,
      shortcutKey: this.catShortcut || null,
      preTimeSec: this.catPreTime,
      postTimeSec: this.catPostTime,
      defaultDurationSec: this.catPreTime + this.catPostTime,
      sortOrder: this.selectedCategory.sortOrder,
      posX: this.selectedCategory.posX,
      posY: this.selectedCategory.posY,
      sizeW: this.selectedCategory.sizeW,
      sizeH: this.selectedCategory.sizeH,
      shape: this.catShape,
      textSize: this.catTextSize,
      textColor: this.catTextColor
    };

    this.isSavingCategory = true;
    this.analysisService.updateCategory(this.selectedCategory.id, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSavingCategory = false;
          const idx = this.categories.findIndex(c => c.id === this.selectedCategory!.id);
          if (idx >= 0) {
            this.categories[idx] = {
              ...this.categories[idx],
              ...res.data,
              tags: this.categories[idx].tags,
              buttonType: 'CATEGORY',
              isDirty: false
            };
            this.selectedCategory = this.categories[idx];
          }
        },
        error: () => { this.isSavingCategory = false; }
      });
  }

  private persistDescriptorProps(): void {
    if (!this.selectedCategory || !this.catName.trim()) return;

    const body: any = {
      name: this.catName,
      color: this.catColor,
      sortOrder: this.selectedCategory.sortOrder,
      posX: this.selectedCategory.posX,
      posY: this.selectedCategory.posY,
      sizeW: this.selectedCategory.sizeW,
      sizeH: this.selectedCategory.sizeH,
      shape: this.catShape,
      textSize: this.catTextSize,
      textColor: this.catTextColor,
      opacity: this.catOpacity
    };

    this.isSavingCategory = true;
    this.analysisService.updateTag(this.selectedCategory.id, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSavingCategory = false;
          const idx = this.categories.findIndex(c => c.id === this.selectedCategory!.id);
          if (idx >= 0) {
            this.categories[idx] = {
              ...this.categories[idx],
              name: res.data.name,
              color: res.data.color,
              posX: res.data.posX,
              posY: res.data.posY,
              sizeW: res.data.sizeW,
              sizeH: res.data.sizeH,
              shape: res.data.shape,
              textSize: res.data.textSize,
              textColor: res.data.textColor,
              opacity: res.data.opacity ?? 1,
              buttonType: 'DESCRIPTOR',
              isDirty: false
            };
            this.selectedCategory = this.categories[idx];
          }
        },
        error: () => { this.isSavingCategory = false; }
      });
  }

  // ── Create new category/descriptor (only needed for isNew) ──

  createCategory(): void {
    if (!this.selectedCategory?.isNew || !this.catName.trim() || this.isSystemTemplate) return;

    if (this.selectedCategory.buttonType === 'DESCRIPTOR') {
      this.createDescriptor();
      return;
    }

    this.isSavingCategory = true;
    this.applyFormToCategory();

    const body: any = {
      name: this.catName,
      color: this.catColor,
      shortcutKey: this.catShortcut || undefined,
      preTimeSec: this.catPreTime,
      postTimeSec: this.catPostTime,
      defaultDurationSec: this.catPreTime + this.catPostTime,
      sortOrder: this.categories.length,
      posX: this.selectedCategory.posX,
      posY: this.selectedCategory.posY,
      sizeW: this.selectedCategory.sizeW,
      sizeH: this.selectedCategory.sizeH,
      shape: this.catShape,
      textSize: this.catTextSize,
      textColor: this.catTextColor,
      opacity: this.catOpacity
    };

    const pendingTags = this.selectedCategory.tags.filter(t => isPendingTag(t));

    this.analysisService.addCategory(this.templateId, body)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const savedCatId: number = res.data.id;
          const saved: EditorCategory = {
            ...res.data,
            tags: this.selectedCategory!.tags.filter(t => !isPendingTag(t)),
            isDirty: false,
            isNew: false,
            buttonType: 'CATEGORY',
            textSize: res.data.textSize ?? this.catTextSize,
            textColor: res.data.textColor ?? this.catTextColor,
            opacity: res.data.opacity ?? 1
          };
          const idx = this.categories.findIndex(c => c === this.selectedCategory);
          if (idx >= 0) this.categories[idx] = saved;
          this.selectedCategory = saved;
          this.isSavingCategory = false;
          this.savePendingTags(savedCatId, saved, pendingTags, () => {});
        },
        error: () => { this.isSavingCategory = false; }
      });
  }

  private createDescriptor(): void {
    if (!this.selectedCategory?.isNew || !this.catName.trim()) return;
    this.isSavingCategory = true;
    this.applyFormToCategory();

    const body: any = {
      name: this.catName,
      color: this.catColor,
      sortOrder: this.categories.filter(c => c.buttonType === 'DESCRIPTOR').length,
      posX: this.selectedCategory.posX,
      posY: this.selectedCategory.posY,
      sizeW: this.selectedCategory.sizeW,
      sizeH: this.selectedCategory.sizeH,
      shape: this.catShape,
      textSize: this.catTextSize,
      textColor: this.catTextColor,
      opacity: this.catOpacity
    };

    this.analysisService.addDescriptor(this.templateId, body)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const saved: EditorCategory = {
            id: res.data.id,
            templateId: this.templateId,
            parentId: undefined,
            name: res.data.name,
            color: res.data.color,
            icon: undefined,
            shortcutKey: undefined,
            defaultDurationSec: 0,
            preTimeSec: 0,
            postTimeSec: 0,
            gridX: 0, gridY: 0, gridW: 2, gridH: 1,
            sortOrder: res.data.sortOrder,
            tags: [],
            isDirty: false,
            isNew: false,
            buttonType: 'DESCRIPTOR',
            posX: res.data.posX ?? this.selectedCategory!.posX,
            posY: res.data.posY ?? this.selectedCategory!.posY,
            sizeW: res.data.sizeW ?? this.selectedCategory!.sizeW,
            sizeH: res.data.sizeH ?? this.selectedCategory!.sizeH,
            shape: (res.data.shape ?? this.catShape) as CatShape,
            textSize: res.data.textSize ?? this.catTextSize,
            textColor: res.data.textColor ?? this.catTextColor,
            opacity: res.data.opacity ?? 1
          };
          const idx = this.categories.findIndex(c => c === this.selectedCategory);
          if (idx >= 0) this.categories[idx] = saved;
          this.selectedCategory = saved;
          this.isSavingCategory = false;
        },
        error: () => { this.isSavingCategory = false; }
      });
  }

  addNewCategory(): void {
    if (this.isSystemTemplate || this.isSavingCategory) return;
    const spot = this.findFreeSpot();
    const color = this.COLOR_PALETTE[this.categories.length % this.COLOR_PALETTE.length];
    const sortOrder = this.categories.length + 1;

    // Placeholder while saving
    const tempId = -(Date.now());
    const placeholder: EditorCategory = {
      id: tempId, templateId: this.templateId,
      name: 'Nuevo botón', color,
      shortcutKey: '', preTimeSec: 5, postTimeSec: 3,
      defaultDurationSec: 8, sortOrder,
      gridX: 0, gridY: 0, gridW: 2, gridH: 1,
      posX: spot.x, posY: spot.y, sizeW: 14, sizeH: 12,
      shape: 'RECTANGLE', textSize: 13, textColor: '#FFFFFF', opacity: 1,
      tags: [], isDirty: false, isNew: true, buttonType: 'CATEGORY'
    };
    this.categories.push(placeholder);
    this.selectCategory(placeholder);
    this.isSavingCategory = true;

    this.analysisService.addCategory(this.templateId, {
      name: placeholder.name, color, sortOrder,
      shortcutKey: undefined, preTimeSec: 5, postTimeSec: 3, defaultDurationSec: 8,
      posX: spot.x, posY: spot.y, sizeW: 14, sizeH: 12,
      shape: 'RECTANGLE', textSize: 13, textColor: '#FFFFFF'
    }).pipe(take(1)).subscribe({
      next: (res) => {
        // Preserve buttonType if the user toggled it while the save was in-flight
        const currentInArray = this.categories.find(c => c.id === tempId);
        const preservedType = currentInArray?.buttonType ?? 'CATEGORY';
        const saved: EditorCategory = {
          ...placeholder, ...res.data,
          tags: [], isDirty: false, isNew: false,
          buttonType: preservedType,
          opacity: 1
        };
        const idx = this.categories.findIndex(c => c.id === tempId);
        if (idx >= 0) this.categories[idx] = saved;
        this.selectedCategory = saved;
        this.selectCategory(saved);
        this.isSavingCategory = false;
      },
      error: () => {
        this.categories = this.categories.filter(c => c.id !== tempId);
        this.selectedCategory = null;
        this.isSavingCategory = false;
        this.showErrorToast('Error al crear el botón. Inténtalo de nuevo.');
      }
    });
  }

  /**
   * Toggles an item between CATEGORY and DESCRIPTOR.
   * - For NEW (unsaved) items: simple in-memory switch, no API call.
   * - For SAVED items: deletes the old record and creates the new type,
   *   then updates the local item with the new id.
   */
  setButtonType(newType: 'CATEGORY' | 'DESCRIPTOR'): void {
    if (!this.selectedCategory || this.isSystemTemplate) return;
    const cat = this.selectedCategory;
    if (cat.buttonType === newType) return;

    if (cat.isNew) {
      cat.buttonType = newType;
      if (newType === 'DESCRIPTOR') {
        // Adjust color to violet palette and clear category-only fields
        const descPalette = ['#9B59B6', '#8E44AD', '#6C3483', '#7D3C98', '#A569BD'];
        const descCount = this.categories.filter(c => c.buttonType === 'DESCRIPTOR').length;
        cat.color = descPalette[descCount % descPalette.length];
        cat.shortcutKey = '';
        cat.preTimeSec = 0;
        cat.postTimeSec = 0;
      } else {
        cat.preTimeSec = 5;
        cat.postTimeSec = 3;
        cat.opacity = 1;
      }
      this.selectCategory(cat);
      return;
    }

    // Saved item: use atomic backend conversion endpoint
    this.isSavingCategory = true;

    if (newType === 'DESCRIPTOR') {
      this.analysisService.categoryToDescriptor(cat.id).pipe(take(1)).subscribe({
        next: (res) => {
          const saved: EditorCategory = {
            ...cat, id: res.data.id, buttonType: 'DESCRIPTOR',
            opacity: res.data.opacity ?? 1,
            isNew: false, isDirty: false, tags: []
          };
          const idx = this.categories.findIndex(c => c === cat);
          if (idx >= 0) this.categories[idx] = saved;
          this.selectedCategory = saved;
          this.catOpacity = saved.opacity ?? 1;
          this.selectCategory(saved);
          this.isSavingCategory = false;
        },
        error: () => {
          this.isSavingCategory = false;
          this.showErrorToast('Error al convertir a descriptor. Inténtalo de nuevo.');
        }
      });
    } else {
      this.analysisService.descriptorToCategory(cat.id).pipe(take(1)).subscribe({
        next: (res) => {
          const saved: EditorCategory = {
            ...cat, id: res.data.id, buttonType: 'CATEGORY',
            opacity: 1, isNew: false, isDirty: false, tags: [],
            preTimeSec: res.data.preTimeSec ?? 5,
            postTimeSec: res.data.postTimeSec ?? 3
          };
          const idx = this.categories.findIndex(c => c === cat);
          if (idx >= 0) this.categories[idx] = saved;
          this.selectedCategory = saved;
          this.catOpacity = 1;
          this.selectCategory(saved);
          this.isSavingCategory = false;
        },
        error: () => {
          this.isSavingCategory = false;
          this.showErrorToast('Error al convertir a categoría. Inténtalo de nuevo.');
        }
      });
    }
  }

  private findFreeSpotDescriptor(): { x: number; y: number } {
    let x = 3, y = 75;
    for (let i = 0; i < 50; i++) {
      const overlap = this.categories.some(c =>
        x < c.posX + c.sizeW && x + 14 > c.posX &&
        y < c.posY + c.sizeH && y + 10 > c.posY
      );
      if (!overlap) return { x, y };
      x += 16;
      if (x + 14 > 95) { x = 3; y += 12; }
      if (y + 10 > 95) return { x: 3, y: 75 };
    }
    return { x: 3, y: 75 };
  }

  private findFreeSpot(): { x: number; y: number } {
    let x = 3, y = 3;
    for (let i = 0; i < 50; i++) {
      const overlap = this.categories.some(c =>
        x < c.posX + c.sizeW && x + 14 > c.posX &&
        y < c.posY + c.sizeH && y + 12 > c.posY
      );
      if (!overlap) return { x, y };
      x += 16;
      if (x + 14 > 95) { x = 3; y += 14; }
      if (y + 12 > 95) return { x: 3, y: 3 };
    }
    return { x: 3, y: 3 };
  }

  // ── Lock / Unlock ──

  toggleLock(): void {
    if (!this.selectedCategory || this.isSystemTemplate || this.selectedCategory.isNew) return;
    const cat = this.selectedCategory;
    const newLocked = !cat.locked;
    cat.locked = newLocked;

    if (cat.buttonType === 'DESCRIPTOR') {
      this.analysisService.updateTag(cat.id, { locked: newLocked })
        .pipe(takeUntil(this.destroy$)).subscribe();
    } else {
      this.analysisService.updateCategory(cat.id, { locked: newLocked })
        .pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  toggleBgLock(): void {
    if (this.isSystemTemplate) return;
    this.bgImgLocked = !this.bgImgLocked;
    this.templateSave$.next();
  }

  deleteCategory(): void {
    if (!this.selectedCategory || this.isSystemTemplate) return;
    const label = this.selectedCategory.buttonType === 'DESCRIPTOR' ? 'descriptor' : 'categoría';
    if (!confirm(`¿Eliminar el ${label} "${this.selectedCategory.name}"?`)) return;
    if (this.selectedCategory.isNew) {
      this.categories = this.categories.filter(c => c !== this.selectedCategory);
      this.selectedCategory = null;
      return;
    }
    const id = this.selectedCategory.id;
    const removeLocal = () => {
      this.categories = this.categories.filter(c => c.id !== id);
      this.selectedCategory = null;
    };

    if (this.selectedCategory.buttonType === 'DESCRIPTOR') {
      this.analysisService.deleteTag(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => removeLocal(),
          error: () => this.showErrorToast('Error al eliminar el descriptor. Inténtalo de nuevo.')
        });
    } else {
      this.analysisService.deleteCategory(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => removeLocal(),
          error: () => this.showErrorToast('Error al eliminar la categoría. Inténtalo de nuevo.')
        });
    }
  }

  addTag(): void {
    if (!this.selectedCategory || !this.newTagName.trim() || this.isSystemTemplate) return;

    if (this.selectedCategory.isNew) {
      // Store as pending tag (negative temp id) — will be saved when the category is created
      const pending: AnalysisTag = {
        id: -(Date.now()),
        categoryId: this.selectedCategory.id,
        name: this.newTagName.trim(),
        color: undefined,
        sortOrder: (this.selectedCategory.tags?.length ?? 0) + 1
      };
      this.selectedCategory.tags = [...(this.selectedCategory.tags ?? []), pending];
      this.newTagName = '';
      return;
    }

    const body = { name: this.newTagName.trim(), sortOrder: (this.selectedCategory.tags?.length ?? 0) + 1 };
    this.analysisService.addTag(this.selectedCategory.id, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => {
        this.selectedCategory!.tags = [...(this.selectedCategory!.tags ?? []), res.data];
        this.newTagName = '';
      }});
  }

  // Returns unique tag names from ALL other categories (including other isNew) that current category doesn't have
  get allTemplateTags(): { name: string; color: string }[] {
    if (!this.selectedCategory) return [];
    const existingNames = new Set(
      (this.selectedCategory.tags || []).map(t => t.name.toLowerCase())
    );
    const seen = new Set<string>();
    const result: { name: string; color: string }[] = [];
    for (const cat of this.categories) {
      if (cat === this.selectedCategory) continue;
      for (const tag of cat.tags || []) {
        const key = tag.name.toLowerCase();
        if (!existingNames.has(key) && !seen.has(key)) {
          seen.add(key);
          result.push({ name: tag.name, color: tag.color || cat.color });
        }
      }
    }
    return result;
  }

  copyTagFromTemplate(item: { name: string; color: string }): void {
    if (!this.selectedCategory || this.isSystemTemplate) return;

    if (this.selectedCategory.isNew) {
      // Pending tag for unsaved category
      const pending: AnalysisTag = {
        id: -(Date.now()),
        categoryId: this.selectedCategory.id,
        name: item.name,
        color: item.color,
        sortOrder: (this.selectedCategory.tags?.length ?? 0) + 1
      };
      this.selectedCategory.tags = [...(this.selectedCategory.tags ?? []), pending];
      return;
    }

    const body = {
      name: item.name,
      color: item.color,
      sortOrder: (this.selectedCategory.tags?.length ?? 0) + 1
    };
    this.analysisService.addTag(this.selectedCategory.id, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => {
        if (this.selectedCategory) {
          this.selectedCategory.tags = [...(this.selectedCategory.tags ?? []), res.data];
        }
      }});
  }

  updateTagColor(tag: AnalysisTag, event: Event): void {
    if (this.isSystemTemplate) return;
    const color = (event.target as HTMLInputElement).value;
    tag.color = color;
    this.analysisService.updateTag(tag.id, { color })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => { if (res?.data?.color) tag.color = res.data.color; } });
  }

  deleteTag(tag: AnalysisTag, event: Event): void {
    event.stopPropagation();
    if (this.isSystemTemplate) return;
    // Pending tags (id < 0) only exist in memory — just remove from array
    if (isPendingTag(tag)) {
      if (this.selectedCategory) {
        this.selectedCategory.tags = this.selectedCategory.tags.filter(t => t.id !== tag.id);
      }
      return;
    }
    this.analysisService.deleteTag(tag.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => {
        if (this.selectedCategory) {
          this.selectedCategory.tags = this.selectedCategory.tags.filter(t => t.id !== tag.id);
        }
      }});
  }

  onShortcutInput(event: KeyboardEvent): void {
    event.preventDefault();
    const key = event.key;
    if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
      this.catShortcut = key.toUpperCase();
    } else if (key === 'Backspace' || key === 'Delete') {
      this.catShortcut = '';
    }
    this.onCatFieldChange();
  }

  duplicateTemplate(): void {
    const clubId = Number(sessionStorage.getItem('clubId')) || Number(localStorage.getItem('clubId')) || 0;
    const userId = Number(localStorage.getItem('userId')) || 0;
    this.analysisService.duplicateTemplate(this.templateId, clubId, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => {
        if (res.data?.id) this.router.navigate(['/dashboard/video-analysis/template', res.data.id]);
      }});
  }

  goBack(): void {
    if (this.hasUnsavedChanges) {
      this.showUnsavedModal = true;
      return;
    }
    this.router.navigate(['/dashboard/video-analysis/templates']);
  }

  // ── Save all pending new categories + template metadata ──

  saveAll(thenLeave = false): void {
    if (this.isSavingAll) return;

    this.isSavingAll = true;
    if (thenLeave) this.pendingLeave = true;

    // Step 1: save template metadata (name, description, background image, opacity).
    // Uses take(1) so it is never cancelled by navigation.
    this.doSaveTemplateInfo().subscribe(() => {

      const newItems = this.categories.filter(c => c.isNew && c.name.trim());

      // Step 2: if no new items, we are done
      if (newItems.length === 0) {
        this.isSavingAll = false;
        this.showSavedToast();
        if (this.pendingLeave) {
          this.pendingLeave = false;
          this.showUnsavedModal = false;
          this.router.navigate(['/dashboard/video-analysis/templates']);
        }
        return;
      }

      // Step 3: save each new category or descriptor (and its pending tags)
      let completed = 0;
      const tryFinish = () => {
        completed++;
        if (completed >= newItems.length) {
          this.isSavingAll = false;
          this.showSavedToast();
          if (this.pendingLeave) {
            this.pendingLeave = false;
            this.showUnsavedModal = false;
            this.router.navigate(['/dashboard/video-analysis/templates']);
          }
        }
      };

      for (const item of newItems) {
        if (item.buttonType === 'DESCRIPTOR') {
          this.saveSingleNewDescriptor(item, tryFinish);
        } else {
          this.saveSingleNewCategory(item, tryFinish);
        }
      }
    });
  }

  private showSavedToast(): void {
    this.savedOk = true;
    this.saveInfoError = '';
    if (this.savedToastTimer) clearTimeout(this.savedToastTimer);
    this.savedToastTimer = setTimeout(() => { this.savedOk = false; }, 2500);
  }

  private showErrorToast(msg: string): void {
    this.saveInfoError = msg;
    if (this.savedToastTimer) clearTimeout(this.savedToastTimer);
    this.savedToastTimer = setTimeout(() => { this.saveInfoError = ''; }, 4000);
  }

  private saveSingleNewCategory(cat: EditorCategory, onDone: () => void): void {
    const body: any = {
      name: cat.name,
      color: cat.color,
      shortcutKey: cat.shortcutKey || undefined,
      preTimeSec: cat.preTimeSec,
      postTimeSec: cat.postTimeSec,
      defaultDurationSec: cat.preTimeSec + cat.postTimeSec,
      sortOrder: cat.sortOrder,
      posX: cat.posX, posY: cat.posY,
      sizeW: cat.sizeW, sizeH: cat.sizeH,
      shape: cat.shape, textSize: cat.textSize, textColor: cat.textColor
    };

    this.analysisService.addCategory(this.templateId, body)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const savedCatId: number = res.data.id;
          const pendingTags = cat.tags.filter(t => isPendingTag(t));
          const idx = this.categories.findIndex(c => c === cat);
          const saved: EditorCategory = {
            ...res.data,
            tags: cat.tags.filter(t => !isPendingTag(t)),
            isDirty: false,
            isNew: false,
            buttonType: 'CATEGORY',
            textSize: res.data.textSize ?? cat.textSize,
            textColor: res.data.textColor ?? cat.textColor
          };
          if (idx >= 0) {
            this.categories[idx] = saved;
            if (this.selectedCategory === cat) this.selectedCategory = saved;
          }
          // Persist pending tags then call onDone
          this.savePendingTags(savedCatId, saved, pendingTags, onDone);
        },
        error: () => onDone()
      });
  }

  private saveSingleNewDescriptor(desc: EditorCategory, onDone: () => void): void {
    const body: any = {
      name: desc.name,
      color: desc.color,
      sortOrder: desc.sortOrder,
      posX: desc.posX, posY: desc.posY,
      sizeW: desc.sizeW, sizeH: desc.sizeH,
      shape: desc.shape, textSize: desc.textSize, textColor: desc.textColor,
      opacity: desc.opacity ?? 1
    };

    this.analysisService.addDescriptor(this.templateId, body)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const saved: EditorCategory = {
            id: res.data.id,
            templateId: this.templateId,
            parentId: undefined,
            name: res.data.name,
            color: res.data.color,
            icon: undefined,
            shortcutKey: undefined,
            defaultDurationSec: 0,
            preTimeSec: 0,
            postTimeSec: 0,
            gridX: 0, gridY: 0, gridW: 2, gridH: 1,
            sortOrder: res.data.sortOrder,
            tags: [],
            isDirty: false,
            isNew: false,
            buttonType: 'DESCRIPTOR',
            posX: res.data.posX ?? desc.posX,
            posY: res.data.posY ?? desc.posY,
            sizeW: res.data.sizeW ?? desc.sizeW,
            sizeH: res.data.sizeH ?? desc.sizeH,
            shape: (res.data.shape ?? desc.shape) as CatShape,
            textSize: res.data.textSize ?? desc.textSize,
            textColor: res.data.textColor ?? desc.textColor,
            opacity: res.data.opacity ?? desc.opacity ?? 1
          };
          const idx = this.categories.findIndex(c => c === desc);
          if (idx >= 0) {
            this.categories[idx] = saved;
            if (this.selectedCategory === desc) this.selectedCategory = saved;
          }
          onDone();
        },
        error: () => onDone()
      });
  }

  private savePendingTags(
    catId: number,
    savedCat: EditorCategory,
    pendingTags: AnalysisTag[],
    onDone: () => void
  ): void {
    if (pendingTags.length === 0) { onDone(); return; }
    let done = 0;
    for (const pt of pendingTags) {
      const body = { name: pt.name, color: pt.color, sortOrder: pt.sortOrder };
      this.analysisService.addTag(catId, body)
        .pipe(take(1))
        .subscribe({
          next: (res) => {
            savedCat.tags = [...savedCat.tags, res.data];
            done++;
            if (done >= pendingTags.length) onDone();
          },
          error: () => { done++; if (done >= pendingTags.length) onDone(); }
        });
    }
  }

  // ── Unsaved modal actions ──

  confirmSaveAndLeave(): void {
    this.saveAll(true);
  }

  confirmLeaveWithoutSave(): void {
    this.showUnsavedModal = false;
    this.pendingLeave = false;
    this.router.navigate(['/dashboard/video-analysis/templates']);
  }

  cancelLeave(): void {
    this.showUnsavedModal = false;
    this.pendingLeave = false;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  // ── Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete/Supr ──

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ignore when typing inside an input, textarea or contenteditable
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const isEditing = tag === 'input' || tag === 'textarea' ||
                      (event.target as HTMLElement)?.isContentEditable;
    if (isEditing) return;

    // Delete / Supr — delete selected button
    if ((event.key === 'Delete' || event.key === 'Backspace') && !event.ctrlKey && !event.metaKey) {
      if (this.selectedCategory && !this.isSystemTemplate) {
        event.preventDefault();
        this.deleteCategory();
      }
      return;
    }

    const ctrl = event.ctrlKey || event.metaKey;
    if (!ctrl) return;

    // Ctrl+C — copy selected button
    if (event.key === 'c' || event.key === 'C') {
      if (this.selectedCategory && !this.isSystemTemplate) {
        event.preventDefault();
        this.clipboard = { ...this.selectedCategory };
        this.triggerCopiedFlash();
      }
      return;
    }

    // Ctrl+V — paste copied button
    if (event.key === 'v' || event.key === 'V') {
      if (this.clipboard && !this.isSystemTemplate && !this.isSavingCategory) {
        event.preventDefault();
        this.pasteCopiedButton();
      }
      return;
    }
  }

  private triggerCopiedFlash(): void {
    this.copiedFlash = true;
    if (this.copiedFlashTimer) clearTimeout(this.copiedFlashTimer);
    this.copiedFlashTimer = setTimeout(() => { this.copiedFlash = false; }, 1200);
  }

  private pasteCopiedButton(): void {
    if (!this.clipboard) return;
    const src = this.clipboard;

    // Offset position so the pasted button doesn't overlap the original
    const offsetX = 3;
    const offsetY = 3;
    const newX = Math.min(100 - src.sizeW, src.posX + offsetX);
    const newY = Math.min(100 - src.sizeH, src.posY + offsetY);
    const sortOrder = this.categories.length + 1;

    const tempId = -(Date.now());
    const placeholder: EditorCategory = {
      ...src,
      id: tempId,
      posX: newX, posY: newY,
      sortOrder,
      tags: [],
      isDirty: false,
      isNew: true,
      locked: false
    };
    this.categories.push(placeholder);
    this.selectCategory(placeholder);
    this.isSavingCategory = true;

    if (src.buttonType === 'DESCRIPTOR') {
      this.analysisService.addDescriptor(this.templateId, {
        name: src.name,
        color: src.color,
        sortOrder,
        posX: newX, posY: newY,
        sizeW: src.sizeW, sizeH: src.sizeH,
        shape: src.shape,
        textSize: src.textSize,
        textColor: src.textColor,
        opacity: src.opacity ?? 1
      }).pipe(take(1)).subscribe({
        next: (res) => {
          const saved: EditorCategory = {
            id: res.data.id,
            templateId: this.templateId,
            parentId: undefined,
            name: res.data.name,
            color: res.data.color,
            icon: undefined,
            shortcutKey: undefined,
            defaultDurationSec: 0,
            preTimeSec: 0, postTimeSec: 0,
            gridX: 0, gridY: 0, gridW: 2, gridH: 1,
            sortOrder: res.data.sortOrder,
            tags: [],
            isDirty: false, isNew: false,
            buttonType: 'DESCRIPTOR',
            posX: res.data.posX ?? newX,
            posY: res.data.posY ?? newY,
            sizeW: res.data.sizeW ?? src.sizeW,
            sizeH: res.data.sizeH ?? src.sizeH,
            shape: (res.data.shape ?? src.shape) as CatShape,
            textSize: res.data.textSize ?? src.textSize,
            textColor: res.data.textColor ?? src.textColor,
            opacity: res.data.opacity ?? src.opacity ?? 1,
            locked: false
          };
          const idx = this.categories.findIndex(c => c.id === tempId);
          if (idx >= 0) this.categories[idx] = saved;
          this.selectedCategory = saved;
          this.selectCategory(saved);
          this.isSavingCategory = false;
        },
        error: () => {
          this.categories = this.categories.filter(c => c.id !== tempId);
          this.selectedCategory = null;
          this.isSavingCategory = false;
          this.showErrorToast('Error al pegar el descriptor.');
        }
      });
    } else {
      this.analysisService.addCategory(this.templateId, {
        name: src.name,
        color: src.color,
        sortOrder,
        shortcutKey: undefined,
        preTimeSec: src.preTimeSec ?? 5,
        postTimeSec: src.postTimeSec ?? 3,
        defaultDurationSec: (src.preTimeSec ?? 5) + (src.postTimeSec ?? 3),
        posX: newX, posY: newY,
        sizeW: src.sizeW, sizeH: src.sizeH,
        shape: src.shape,
        textSize: src.textSize,
        textColor: src.textColor
      }).pipe(take(1)).subscribe({
        next: (res) => {
          const saved: EditorCategory = {
            ...placeholder, ...res.data,
            tags: [],
            isDirty: false, isNew: false,
            buttonType: 'CATEGORY',
            opacity: 1,
            locked: false
          };
          const idx = this.categories.findIndex(c => c.id === tempId);
          if (idx >= 0) this.categories[idx] = saved;
          this.selectedCategory = saved;
          this.selectCategory(saved);
          this.isSavingCategory = false;
        },
        error: () => {
          this.categories = this.categories.filter(c => c.id !== tempId);
          this.selectedCategory = null;
          this.isSavingCategory = false;
          this.showErrorToast('Error al pegar la categoría.');
        }
      });
    }
  }

  trackByCategory(_: number, cat: EditorCategory): number { return cat.id; }
  trackByTag(_: number, tag: AnalysisTag): number { return tag.id; }
  trackByTagName(_: number, t: { name: string; color: string }): string { return t.name; }
}
