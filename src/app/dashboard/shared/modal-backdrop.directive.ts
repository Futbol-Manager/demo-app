import { Directive, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';

/**
 * Prevents a modal from closing when the user starts a text-selection drag
 * inside the modal content and releases the mouse on the backdrop.
 *
 * Usage: add the attribute `appModalBackdrop` to any backdrop/overlay element
 * that has a (click) close handler. No other changes needed.
 *
 * How it works:
 *   - A single document-level mousedown listener (shared across all instances)
 *     records the element where every mousedown originates.
 *   - When a click fires on the backdrop, we check whether the mousedown that
 *     started the gesture was on the backdrop element itself.  If not (i.e. the
 *     drag started inside the modal content), we cancel the event with
 *     stopImmediatePropagation() before Angular's (click) handler runs.
 */
@Directive({ selector: '[appModalBackdrop]' })
export class ModalBackdropDirective implements OnInit, OnDestroy {

  private static lastMousedownTarget: EventTarget | null = null;
  private static instanceCount = 0;

  private static readonly trackMousedown = (e: MouseEvent): void => {
    ModalBackdropDirective.lastMousedownTarget = e.target;
  };

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (ModalBackdropDirective.instanceCount === 0) {
      document.addEventListener('mousedown', ModalBackdropDirective.trackMousedown, true);
    }
    ModalBackdropDirective.instanceCount++;
  }

  ngOnDestroy(): void {
    ModalBackdropDirective.instanceCount--;
    if (ModalBackdropDirective.instanceCount === 0) {
      document.removeEventListener('mousedown', ModalBackdropDirective.trackMousedown, true);
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (ModalBackdropDirective.lastMousedownTarget !== this.el.nativeElement) {
      event.stopImmediatePropagation();
    }
  }
}
