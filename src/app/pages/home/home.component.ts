import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  screen: number = 1; // es 1 para el login y 2 para el registro

  constructor() { }

  ngOnInit(): void {
  }

  toRegister(event: Event) {
    event.preventDefault();
    this.screen = 2;
  }

  toLogin(event: Event){
    event.preventDefault();
    this.screen = 1;
  }

}
