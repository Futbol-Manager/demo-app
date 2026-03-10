import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() icon: string = 'bi-inbox';
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() ctaText: string = '';
  @Input() ctaIcon: string = '';
  @Input() variant: 'default' | 'compact' | 'inline' = 'default';
  @Output() ctaClick = new EventEmitter<void>();

  onCtaClick(): void {
    this.ctaClick.emit();
  }
}
