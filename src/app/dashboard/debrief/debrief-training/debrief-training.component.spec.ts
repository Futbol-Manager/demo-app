import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebriefTrainingComponent } from './debrief-training.component';

describe('DebriefTrainingComponent', () => {
  let component: DebriefTrainingComponent;
  let fixture: ComponentFixture<DebriefTrainingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DebriefTrainingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DebriefTrainingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
