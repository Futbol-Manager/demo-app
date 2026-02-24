import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AiPendingAction } from 'src/app/core/services/ai-chat/ai-chat.service';

@Component({
  selector: 'app-ai-action-preview',
  templateUrl: './ai-action-preview.component.html',
  styleUrls: ['./ai-action-preview.component.scss']
})
export class AiActionPreviewComponent {
  @Input() actions: AiPendingAction[] = [];
  @Input() isExecuting = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  getActionIcon(action: AiPendingAction): string {
    const fn = action.function || '';
    if (fn === 'exportTableToExcel') return 'fas fa-file-excel';
    if (fn === 'movePlayerToTeam') return 'fas fa-exchange-alt';
    if (fn.includes('Injury') || fn.includes('injury')) return 'fas fa-medkit';
    if (fn.includes('Training') || fn.includes('training')) return 'fas fa-running';
    if (fn.includes('Match') || fn.includes('match')) return 'fas fa-futbol';
    if (fn.includes('Task') || fn.includes('task')) return 'fas fa-tasks';
    if (fn.includes('Player') || fn.includes('player')) return 'fas fa-user-plus';
    return 'fas fa-magic';
  }

  getActionType(action: AiPendingAction): string {
    const fn = action.function || '';
    if (fn === 'exportTableToExcel') return 'other';
    if (fn === 'movePlayerToTeam') return 'edit';
    if (fn.startsWith('create')) return 'create';
    if (fn.startsWith('edit')) return 'edit';
    if (fn.startsWith('delete')) return 'delete';
    return 'other';
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
