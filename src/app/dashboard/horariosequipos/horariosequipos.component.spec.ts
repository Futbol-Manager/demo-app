import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorariosequiposComponent } from './horariosequipos.component';

describe('HorariosequiposComponent', () => {
  let component: HorariosequiposComponent;
  let fixture: ComponentFixture<HorariosequiposComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HorariosequiposComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HorariosequiposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
