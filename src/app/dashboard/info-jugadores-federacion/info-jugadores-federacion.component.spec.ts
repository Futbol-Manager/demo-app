import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoJugadoresFederacionComponent } from './info-jugadores-federacion.component';

describe('InfoJugadoresFederacionComponent', () => {
  let component: InfoJugadoresFederacionComponent;
  let fixture: ComponentFixture<InfoJugadoresFederacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InfoJugadoresFederacionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoJugadoresFederacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
