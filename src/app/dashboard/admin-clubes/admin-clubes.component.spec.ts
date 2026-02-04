import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminClubesComponent } from './admin-clubes.component';

describe('AdminClubesComponent', () => {
  let component: AdminClubesComponent;
  let fixture: ComponentFixture<AdminClubesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminClubesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminClubesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
