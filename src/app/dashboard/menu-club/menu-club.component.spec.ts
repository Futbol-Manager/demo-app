import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuClubComponent } from './menu-club.component';

describe('MenuClubComponent', () => {
  let component: MenuClubComponent;
  let fixture: ComponentFixture<MenuClubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MenuClubComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuClubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
