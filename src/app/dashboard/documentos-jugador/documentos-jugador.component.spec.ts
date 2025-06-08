import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentosJugadorComponent } from './documentos-jugador.component';

describe('DocumentosJugadorComponent', () => {
  let component: DocumentosJugadorComponent;
  let fixture: ComponentFixture<DocumentosJugadorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DocumentosJugadorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocumentosJugadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
