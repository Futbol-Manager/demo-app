import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebriefMatchComponent } from './debrief-match.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('DebriefMatchComponent', () => {
  let component: DebriefMatchComponent;
  let fixture: ComponentFixture<DebriefMatchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebriefMatchComponent],
      imports: [RouterTestingModule, TranslateModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DebriefMatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
