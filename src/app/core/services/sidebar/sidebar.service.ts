import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private collapsedSubject = new BehaviorSubject<boolean>(true);
  collapsed$ = this.collapsedSubject.asObservable();

  get collapsed(): boolean {
    return this.collapsedSubject.value;
  }

  toggle(): void {
    this.collapsedSubject.next(!this.collapsedSubject.value);
  }

  setCollapsed(value: boolean): void {
    this.collapsedSubject.next(value);
  }
}
