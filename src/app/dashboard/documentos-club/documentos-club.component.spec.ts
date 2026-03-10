import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentosClubComponent } from './documentos-club.component';

describe('DocumentosClubComponent', () => {
  let component: DocumentosClubComponent;
  let fixture: ComponentFixture<DocumentosClubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DocumentosClubComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocumentosClubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
