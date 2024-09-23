import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoutingPlayerComponent } from './scouting-player.component';

describe('ScoutingPlayerComponent', () => {
  let component: ScoutingPlayerComponent;
  let fixture: ComponentFixture<ScoutingPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScoutingPlayerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScoutingPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
