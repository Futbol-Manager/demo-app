import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebriefReportComponent } from './debrief-report.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('DebriefReportComponent', () => {
  let component: DebriefReportComponent;
  let fixture: ComponentFixture<DebriefReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebriefReportComponent],
      imports: [RouterTestingModule, TranslateModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DebriefReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
