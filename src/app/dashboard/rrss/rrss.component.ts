import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RrssCalendarComponent } from './rrss-calendar/rrss-calendar.component';
import { RrssPostsComponent } from './rrss-posts/rrss-posts.component';
import { RrssSettingsComponent } from './rrss-settings/rrss-settings.component';
import { RrssCommentsComponent } from './rrss-comments/rrss-comments.component';
import { RrssMatchPostComponent } from './rrss-match-post/rrss-match-post.component';

type RrssTab = 'calendar' | 'posts' | 'match' | 'settings' | 'comments';

@Component({
  selector: 'app-rrss',
  templateUrl: './rrss.component.html',
  styleUrls: ['./rrss.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RrssComponent {
  activeTab: RrssTab = 'calendar';

  setTab(tab: RrssTab): void {
    this.activeTab = tab;
  }
}
