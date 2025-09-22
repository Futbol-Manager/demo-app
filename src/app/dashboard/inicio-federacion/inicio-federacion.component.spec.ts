import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioFederacionComponent } from './inicio-federacion.component';

describe('InicioFederacionComponent', () => {
  let component: InicioFederacionComponent;
  let fixture: ComponentFixture<InicioFederacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InicioFederacionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InicioFederacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
