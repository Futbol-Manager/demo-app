import { Component, OnInit, OnDestroy } from '@angular/core';
import { ErpAiConsentService } from '../../../core/services/erp/erp-ai-consent.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-erp-ai-consent-modal',
  templateUrl: './erp-ai-consent-modal.component.html',
  styleUrls: ['./erp-ai-consent-modal.component.scss']
})
export class ErpAiConsentModalComponent implements OnInit, OnDestroy {

  visible = false;
  confirmed = false;
  saving = false;

  userId = 0;
  clubId = 0;

  private sub!: Subscription;

  constructor(private consentService: ErpAiConsentService) {}

  ngOnInit(): void {
    this.userId = Number(sessionStorage.getItem('userId') || '0');
    this.clubId = Number(sessionStorage.getItem('clubId') || '0');
    this.sub = this.consentService.showModal$.subscribe(show => {
      this.visible = show;
      if (show) this.confirmed = false;
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  accept(): void {
    if (!this.confirmed) return;
    this.saving = true;
    this.consentService.accept(this.userId, this.clubId);
    this.saving = false;
  }

  dismiss(): void {
    this.consentService.dismiss();
  }
}
