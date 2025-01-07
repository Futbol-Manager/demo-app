import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioDeportesComponent } from './inicio-deportes.component';

describe('InicioDeportesComponent', () => {
  let component: InicioDeportesComponent;
  let fixture: ComponentFixture<InicioDeportesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InicioDeportesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InicioDeportesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
