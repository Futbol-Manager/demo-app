import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAiConfigComponent } from './admin-ai-config.component';

describe('AdminAiConfigComponent', () => {
  let component: AdminAiConfigComponent;
  let fixture: ComponentFixture<AdminAiConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminAiConfigComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAiConfigComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
