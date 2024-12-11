import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntrenamientosCreadosComponent } from './entrenamientos-creados.component';

describe('EntrenamientosCreadosComponent', () => {
  let component: EntrenamientosCreadosComponent;
  let fixture: ComponentFixture<EntrenamientosCreadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EntrenamientosCreadosComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EntrenamientosCreadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
