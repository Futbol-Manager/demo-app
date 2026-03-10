import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DebriefService } from '../../../core/services/debrief/debrief.service';
import { TutorialService } from '../../../core/services/tutorial/tutorial.service';
import { DebriefHistoryItem } from '../../../core/models/debrief/debrief.model';

@Component({
  selector: 'app-debrief-history',
  templateUrl: './debrief-history.component.html',
  styleUrls: ['./debrief-history.component.scss']
})
export class DebriefHistoryComponent implements OnInit {

  teamId: number = 0;
  historyItems: DebriefHistoryItem[] = [];
  filteredItems: DebriefHistoryItem[] = [];
  isLoading = true;

  activeFilter: 'all' | 'training' | 'match' = 'all';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private debriefService: DebriefService,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    this.teamId = +(this.route.snapshot.paramMap.get('teamId') || '0');
    this.loadHistory();
    setTimeout(() => this.tutorialService.start('debrief-history', true), 600);
  }

  private loadHistory(): void {
    this.isLoading = true;
    this.debriefService.getHistory(this.teamId).subscribe({
      next: (items) => {
        this.historyItems = items;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.historyItems = [];
        this.applyFilter();
        this.isLoading = false;
      }
    });
  }

  setFilter(filter: 'all' | 'training' | 'match'): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.filteredItems = [...this.historyItems];
    } else {
      this.filteredItems = this.historyItems.filter(i => i.type === this.activeFilter);
    }
  }

  openReport(item: DebriefHistoryItem): void {
    if (item.status === 'completed') {
      this.router.navigate(['/dashboard/debrief/report', item.debriefId, item.type]);
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'draft': return 'status-draft';
      default: return '';
    }
  }

  getTypeIcon(type: string): string {
    return type === 'training' ? 'bi-clipboard-check' : 'bi-trophy';
  }

  goBack(): void {
    window.history.back();
  }

  get trainingCount(): number {
    return this.historyItems.filter(i => i.type === 'training').length;
  }

  get matchCount(): number {
    return this.historyItems.filter(i => i.type === 'match').length;
  }
}
