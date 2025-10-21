import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificacionesFederacionComponent } from './notificaciones-federacion.component';

describe('NotificacionesFederacionComponent', () => {
  let component: NotificacionesFederacionComponent;
  let fixture: ComponentFixture<NotificacionesFederacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NotificacionesFederacionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificacionesFederacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
