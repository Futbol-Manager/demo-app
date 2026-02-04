import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminInicioComponent } from './admin-inicio.component';

describe('AdminInicioComponent', () => {
  let component: AdminInicioComponent;
  let fixture: ComponentFixture<AdminInicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminInicioComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminInicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
