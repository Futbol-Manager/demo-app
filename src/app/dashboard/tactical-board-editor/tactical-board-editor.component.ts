import {
  Component, Input, Output, EventEmitter, OnInit,
  ViewChild, ElementRef, HostListener
} from '@angular/core';
import {
  TacticalBoardService,
  TacticalPlay,
  TacticalPlayer,
  TacticalArrow,
  TacticalNote
} from 'src/app/core/services/tactical-board/tactical-board.service';
import { getSportConfig, SportConfig } from 'src/app/core/models/sport/sport-config.model';

@Component({
  selector: 'app-tactical-board-editor',
  templateUrl: './tactical-board-editor.component.html',
  styleUrls: ['./tactical-board-editor.component.scss']
})
export class TacticalBoardEditorComponent implements OnInit {

  @Input() teamId: number = 0;
  @Input() sport: string = 'futbol';
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
  @Output() playSaved = new EventEmitter<TacticalPlay>();

  @ViewChild('boardRef') boardRef!: ElementRef<HTMLDivElement>;

  sportConfig!: SportConfig;
  play!: TacticalPlay;
  savedPlays: TacticalPlay[] = [];

  selectedPlayerId: string | null = null;
  draggingId: string | null = null;
  private dragOffset = { x: 0, y: 0 };

  mode: 'move' | 'arrow' | 'note' = 'move';
  arrowStart: { x: number; y: number } | null = null;
  arrowPreview: { fromX: number; fromY: number; toX: number; toY: number } | null = null;

  saving = false;
  playName = 'Nueva jugada';
  showPlayList = false;
  showDeleteConfirm = false;
  playToDelete: TacticalPlay | null = null;

  readonly PLAYER_COLORS = [
    '#3b82f6', '#f59e0b', '#10b981', '#ef4444',
    '#8b5cf6', '#f97316', '#ffffff', '#000000'
  ];
  selectedPlayerColor = '#3b82f6';

  constructor(private tacticalService: TacticalBoardService) {}

  ngOnInit(): void {
    this.sportConfig = getSportConfig(this.sport);
    this.resetPlay();
    if (this.sportConfig.formations?.length) {
      this.loadFormation(this.sportConfig.formations[0]);
    }
    this.loadPlays();
  }

  private resetPlay(): void {
    this.play = {
      teamId: this.teamId,
      name: '',
      sport: this.sport,
      players: [],
      arrows: [],
      notes: []
    };
  }

  loadFormation(formation: string): void {
    this.play.players = this.tacticalService.generateDefaultFormation(formation, this.sport);
    this.play.formation = formation;
    this.selectedPlayerId = null;
  }

  onMouseDown(event: MouseEvent, playerId: string): void {
    if (this.mode !== 'move') return;
    event.preventDefault();
    event.stopPropagation();
    this.draggingId = playerId;
    this.selectedPlayerId = playerId;

    const rect = this.boardRef.nativeElement.getBoundingClientRect();
    const player = this.play.players.find(p => p.id === playerId);
    if (player) {
      this.dragOffset = {
        x: event.clientX - rect.left - (player.x / 100) * rect.width,
        y: event.clientY - rect.top - (player.y / 100) * rect.height,
      };
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.visible) return;

    if (this.draggingId && this.boardRef) {
      const rect = this.boardRef.nativeElement.getBoundingClientRect();
      const x = Math.max(2, Math.min(98, ((event.clientX - rect.left - this.dragOffset.x) / rect.width) * 100));
      const y = Math.max(2, Math.min(98, ((event.clientY - rect.top - this.dragOffset.y) / rect.height) * 100));
      const player = this.play.players.find(p => p.id === this.draggingId);
      if (player) {
        player.x = x;
        player.y = y;
      }
    }

    if (this.mode === 'arrow' && this.arrowStart && this.boardRef) {
      const rect = this.boardRef.nativeElement.getBoundingClientRect();
      this.arrowPreview = {
        fromX: this.arrowStart.x,
        fromY: this.arrowStart.y,
        toX: ((event.clientX - rect.left) / rect.width) * 100,
        toY: ((event.clientY - rect.top) / rect.height) * 100,
      };
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.draggingId = null;
  }

  onBoardClick(event: MouseEvent): void {
    if (!this.boardRef) return;
    const rect = this.boardRef.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (this.mode === 'arrow') {
      if (!this.arrowStart) {
        this.arrowStart = { x, y };
      } else {
        this.play.arrows.push({
          id: `arr${Date.now()}`,
          fromX: this.arrowStart.x,
          fromY: this.arrowStart.y,
          toX: x,
          toY: y,
          color: '#ffffff',
          style: 'solid',
        });
        this.arrowStart = null;
        this.arrowPreview = null;
      }
      return;
    }

    if (this.mode === 'note') {
      const text = prompt('Texto de la nota:');
      if (text?.trim()) {
        this.play.notes.push({
          id: `note${Date.now()}`,
          x,
          y,
          text: text.trim(),
        });
      }
      return;
    }

    this.selectedPlayerId = null;
  }

  addOpponent(): void {
    const id = `opp${Date.now()}`;
    this.play.players.push({
      id,
      number: 0,
      name: 'R',
      x: 50,
      y: 20,
      color: '#ef4444',
      isOpponent: true,
    });
  }

  deleteSelectedPlayer(): void {
    if (!this.selectedPlayerId) return;
    this.play.players = this.play.players.filter(p => p.id !== this.selectedPlayerId);
    this.selectedPlayerId = null;
  }

  changeSelectedPlayerColor(color: string): void {
    const player = this.play.players.find(p => p.id === this.selectedPlayerId);
    if (player) {
      player.color = color;
    }
  }

  getSelectedPlayer(): TacticalPlayer | undefined {
    return this.play.players.find(p => p.id === this.selectedPlayerId);
  }

  cancelArrow(): void {
    this.arrowStart = null;
    this.arrowPreview = null;
  }

  deleteLastArrow(): void {
    if (this.play.arrows.length) {
      this.play.arrows.pop();
    }
  }

  getArrowPath(arrow: TacticalArrow | typeof this.arrowPreview): string {
    if (!arrow) return '';
    const a = arrow as { fromX: number; fromY: number; toX: number; toY: number };
    return `M ${a.fromX},${a.fromY} L ${a.toX},${a.toY}`;
  }

  getArrowMarker(color: string): string {
    return color === '#ffffff' ? 'url(#arrowWhite)' : 'url(#arrowColor)';
  }

  savePlay(): void {
    if (!this.playName.trim()) return;
    this.play.name = this.playName;
    this.play.teamId = this.teamId;
    this.play.sport = this.sport;
    this.saving = true;

    this.tacticalService.savePlay(this.play).subscribe({
      next: saved => {
        this.play = saved;
        this.saving = false;
        this.playSaved.emit(saved);
        this.loadPlays();
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  newPlay(): void {
    this.resetPlay();
    this.playName = 'Nueva jugada';
    if (this.sportConfig.formations?.length) {
      this.loadFormation(this.sportConfig.formations[0]);
    }
  }

  loadPlay(play: TacticalPlay): void {
    this.play = {
      ...play,
      players: [...play.players],
      arrows: [...play.arrows],
      notes: [...play.notes],
    };
    this.playName = play.name;
    this.showPlayList = false;
    this.selectedPlayerId = null;
  }

  confirmDeletePlay(play: TacticalPlay, event: MouseEvent): void {
    event.stopPropagation();
    this.playToDelete = play;
    this.showDeleteConfirm = true;
  }

  executeDeletePlay(): void {
    if (!this.playToDelete?.id) return;
    this.tacticalService.deletePlay(this.playToDelete.id).subscribe({
      next: () => {
        this.savedPlays = this.savedPlays.filter(p => p.id !== this.playToDelete!.id);
        if (this.play.id === this.playToDelete!.id) {
          this.newPlay();
        }
        this.playToDelete = null;
        this.showDeleteConfirm = false;
      },
      error: () => {
        this.playToDelete = null;
        this.showDeleteConfirm = false;
      },
    });
  }

  loadPlays(): void {
    if (!this.teamId) return;
    this.tacticalService.getPlays(this.teamId).subscribe(plays => {
      this.savedPlays = plays;
    });
  }

  exportAsImage(): void {
    const board = this.boardRef?.nativeElement;
    if (!board) return;

    import('html2canvas')
      .then(({ default: html2canvas }) => {
        html2canvas(board, { useCORS: true }).then(canvas => {
          const link = document.createElement('a');
          link.download = `jugada-${this.playName.replace(/\s/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      })
      .catch(() => {
        alert('Para exportar im\u00e1genes instala: npm install html2canvas');
      });
  }

  close(): void {
    this.closed.emit();
  }
}
