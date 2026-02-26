import { Component } from '@angular/core';

type RrssTab = 'calendar' | 'posts' | 'settings' | 'comments';

@Component({
  selector: 'app-rrss',
  templateUrl: './rrss.component.html',
  styleUrls: ['./rrss.component.scss'],
})
export class RrssComponent {
  activeTab: RrssTab = 'calendar';

  setTab(tab: RrssTab): void {
    this.activeTab = tab;
  }
}
