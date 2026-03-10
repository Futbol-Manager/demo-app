import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuEntrenadorComponent } from './menu-entrenador.component';

describe('MenuEntrenadorComponent', () => {
  let component: MenuEntrenadorComponent;
  let fixture: ComponentFixture<MenuEntrenadorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MenuEntrenadorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuEntrenadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
