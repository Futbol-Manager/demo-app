import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformacionEquipoComponent } from './informacion-equipo.component';

describe('InformacionEquipoComponent', () => {
  let component: InformacionEquipoComponent;
  let fixture: ComponentFixture<InformacionEquipoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InformacionEquipoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InformacionEquipoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
