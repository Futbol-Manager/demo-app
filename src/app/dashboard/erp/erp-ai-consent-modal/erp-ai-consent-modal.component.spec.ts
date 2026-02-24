import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpAiConsentModalComponent } from './erp-ai-consent-modal.component';

describe('ErpAiConsentModalComponent', () => {
  let component: ErpAiConsentModalComponent;
  let fixture: ComponentFixture<ErpAiConsentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ErpAiConsentModalComponent ]
    }).compileComponents();
    fixture = TestBed.createComponent(ErpAiConsentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
