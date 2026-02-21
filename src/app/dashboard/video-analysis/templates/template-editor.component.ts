import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { VideoAnalysisService } from '../../../core/services/video-analysis/video-analysis.service';
import { AnalysisCategory, AnalysisTag, AnalysisTemplate } from '../models/analysis.models';

type CatShape = 'RECTANGLE' | 'CIRCLE' | 'DIAMOND' | 'SQUARE';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface EditorCategory extends AnalysisCategory {
  tags: AnalysisTag[];
  isDirty?: boolean;
  isNew?: boolean;
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
  isSystemTemplate = false;

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
  newTagName = '';

  backgroundImage = '';
  bgOpacity = 0.8;

  // Drag state
  dragging = false;
  dragCat: EditorCategory | null = null;
  dragOffsetPctX = 0;
  dragOffsetPctY = 0;

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
      this.doSaveTemplateInfo();
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

          this.categories = (data.categories || []).map((item: any, index: number) => {
            const cat = item.category ?? item;
            const tags = item.tags ?? [];
            return {
              ...cat,
              tags,
              isDirty: false,
              isNew: false,
              posX: cat.posX ?? 5 + (index % 5) * 16,
              posY: cat.posY ?? 5 + Math.floor(index / 5) * 15,
              sizeW: cat.sizeW ?? 14,
              sizeH: cat.sizeH ?? 12,
              shape: cat.shape ?? 'RECTANGLE',
              textSize: cat.textSize ?? 13,
              textColor: cat.textColor ?? '#FFFFFF'
            } as EditorCategory;
          });

          this.categories.sort((a, b) => a.sortOrder - b.sortOrder);
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

    this.showGhost = true;
    this.ghostX = cat.posX;
    this.ghostY = cat.posY;
    this.ghostW = cat.sizeW;
    this.ghostH = cat.sizeH;
    this.ghostShape = cat.shape;

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  // ── Resize ──

  onResizeMouseDown(event: MouseEvent, cat: EditorCategory, handle: string): void {
    if (this.isSystemTemplate || event.button !== 0) return;
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
    if (this.dragging && this.dragCat) {
      const { px, py } = this.pxToPct(e.clientX, e.clientY);
      let newX = px - this.dragOffsetPctX;
      let newY = py - this.dragOffsetPctY;
      newX = Math.max(0, Math.min(100 - this.dragCat.sizeW, newX));
      newY = Math.max(0, Math.min(100 - this.dragCat.sizeH, newY));
      this.ghostX = newX;
      this.ghostY = newY;
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

    if (this.dragging && this.dragCat) {
      const moved = this.dragCat.posX !== this.ghostX || this.dragCat.posY !== this.ghostY;
      this.dragCat.posX = this.ghostX;
      this.dragCat.posY = this.ghostY;
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
    this.analysisService.updateCategory(cat.id, {
      posX: cat.posX, posY: cat.posY,
      sizeW: cat.sizeW, sizeH: cat.sizeH,
      shape: cat.shape
    }).pipe(takeUntil(this.destroy$)).subscribe();
  }

  // ── Canvas click ──

  onCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('canvas-surface') || target.classList.contains('canvas-bg')) {
      this.deselectCategory();
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
    this.templateSave$.next();
  }

  onBackgroundFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5 MB');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.ngZone.run(() => {
        this.backgroundImage = e.target!.result as string;
        this.templateSave$.next();
      });
    };
    reader.onerror = () => {
      this.ngZone.run(() => alert('Error al leer la imagen'));
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  private doSaveTemplateInfo(): void {
    if (!this.editName.trim() || this.isSystemTemplate) return;
    this.isSavingTemplate = true;
    this.analysisService.updateTemplate(this.templateId, {
      name: this.editName,
      description: this.editDescription,
      backgroundImage: this.backgroundImage || null,
      backgroundOpacity: this.bgOpacity
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSavingTemplate = false;
        if (this.template) {
          this.template.name = this.editName;
          this.template.description = this.editDescription;
          this.template.backgroundImage = this.backgroundImage;
        }
      },
      error: () => { this.isSavingTemplate = false; }
    });
  }

  // ── Category persist (auto-save for existing) ──

  private persistCategoryProps(): void {
    if (!this.selectedCategory || !this.catName.trim()) return;

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
              isDirty: false
            };
            this.selectedCategory = this.categories[idx];
          }
        },
        error: () => { this.isSavingCategory = false; }
      });
  }

  // ── Create new category (only needed for isNew) ──

  createCategory(): void {
    if (!this.selectedCategory?.isNew || !this.catName.trim() || this.isSystemTemplate) return;
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
      textColor: this.catTextColor
    };

    this.analysisService.addCategory(this.templateId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSavingCategory = false;
          const saved: EditorCategory = {
            ...res.data,
            tags: [],
            isDirty: false,
            isNew: false,
            textSize: res.data.textSize ?? this.catTextSize,
            textColor: res.data.textColor ?? this.catTextColor
          };
          const idx = this.categories.findIndex(c => c === this.selectedCategory);
          if (idx >= 0) this.categories[idx] = saved;
          this.selectedCategory = saved;
        },
        error: () => { this.isSavingCategory = false; }
      });
  }

  addNewCategory(): void {
    if (this.isSystemTemplate) return;
    const tempId = -(Date.now());
    const spot = this.findFreeSpot();
    const newCat: EditorCategory = {
      id: tempId, templateId: this.templateId,
      name: 'Nueva categoría',
      color: this.COLOR_PALETTE[this.categories.length % this.COLOR_PALETTE.length],
      shortcutKey: '', preTimeSec: 5, postTimeSec: 3,
      defaultDurationSec: 8, sortOrder: this.categories.length + 1,
      gridX: 0, gridY: 0, gridW: 2, gridH: 1,
      posX: spot.x, posY: spot.y, sizeW: 14, sizeH: 12,
      shape: 'RECTANGLE',
      textSize: 13, textColor: '#FFFFFF',
      tags: [], isDirty: true, isNew: true
    };
    this.categories.push(newCat);
    this.selectCategory(newCat);
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

  deleteCategory(): void {
    if (!this.selectedCategory || this.isSystemTemplate) return;
    if (!confirm(`¿Eliminar la categoría "${this.selectedCategory.name}"?`)) return;
    if (this.selectedCategory.isNew) {
      this.categories = this.categories.filter(c => c !== this.selectedCategory);
      this.selectedCategory = null;
      return;
    }
    this.analysisService.deleteCategory(this.selectedCategory.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => {
        this.categories = this.categories.filter(c => c.id !== this.selectedCategory!.id);
        this.selectedCategory = null;
      }});
  }

  addTag(): void {
    if (!this.selectedCategory || !this.newTagName.trim() || this.isSystemTemplate) return;
    if (this.selectedCategory.isNew) return;
    const body = { name: this.newTagName.trim(), sortOrder: (this.selectedCategory.tags?.length ?? 0) + 1 };
    this.analysisService.addTag(this.selectedCategory.id, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => {
        this.selectedCategory!.tags = [...(this.selectedCategory!.tags ?? []), res.data];
        this.newTagName = '';
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
    this.router.navigate(['/dashboard/video-analysis/templates']);
  }

  trackByCategory(_: number, cat: EditorCategory): number { return cat.id; }
  trackByTag(_: number, tag: AnalysisTag): number { return tag.id; }
}
