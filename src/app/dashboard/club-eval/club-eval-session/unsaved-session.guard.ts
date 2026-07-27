import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmationService } from 'src/app/core/services/confirmation/confirmation.service';

export interface CanDeactivateUnsaved {
  hasUnsavedChanges(): boolean;
}

@Injectable({ providedIn: 'root' })
export class UnsavedSessionGuard implements CanDeactivate<CanDeactivateUnsaved> {

  constructor(private confirmationService: ConfirmationService) {}

  canDeactivate(component: CanDeactivateUnsaved): boolean | Observable<boolean> {
    if (component.hasUnsavedChanges()) {
      return this.confirmationService.confirm({
        titleKey: 'CLUB_EVAL.SESSION.UNSAVED_TITLE',
        messageKey: 'CLUB_EVAL.SESSION.UNSAVED_WARNING',
        confirmKey: 'CLUB_EVAL.SESSION.UNSAVED_CONFIRM',
        cancelKey: 'COMMON.CANCEL',
        confirmStyle: 'warn'
      });
    }
    return true;
  }
}
