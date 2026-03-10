import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebriefHistoryComponent } from './debrief-history.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('DebriefHistoryComponent', () => {
  let component: DebriefHistoryComponent;
  let fixture: ComponentFixture<DebriefHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebriefHistoryComponent],
      imports: [RouterTestingModule, TranslateModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DebriefHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
