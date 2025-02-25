import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClasificacionResultadosComponent } from './clasificacion-resultados.component';

describe('ClasificacionResultadosComponent', () => {
  let component: ClasificacionResultadosComponent;
  let fixture: ComponentFixture<ClasificacionResultadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClasificacionResultadosComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClasificacionResultadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
