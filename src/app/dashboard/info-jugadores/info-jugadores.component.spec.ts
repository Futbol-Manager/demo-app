import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoJugadoresComponent } from './info-jugadores.component';

describe('InfoJugadoresComponent', () => {
  let component: InfoJugadoresComponent;
  let fixture: ComponentFixture<InfoJugadoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InfoJugadoresComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoJugadoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
