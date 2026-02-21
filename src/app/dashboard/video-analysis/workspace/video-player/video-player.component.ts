import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../../services/player-state.service';

declare var Hls: any;

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit, OnDestroy {

  @Input() videoUrl = '';
  @Input() isHls = false;

  @ViewChild('videoElement', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('progressBar', { static: true }) progressBarRef!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private hls: any = null;
  private animFrameId: number | null = null;

  showControls = true;
  private hideControlsTimer: any;

  readonly speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];
  showSpeedMenu = false;
  zoomLevel = 1;

  constructor(public ps: PlayerStateService) {}

  ngOnInit(): void {
    this.ps.seekTo$.pipe(takeUntil(this.destroy$)).subscribe(timeMs => {
      const video = this.videoRef.nativeElement;
      video.currentTime = timeMs / 1000;
      this.ps.updateState({ currentTimeMs: timeMs });
    });

    this.ps.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      const video = this.videoRef.nativeElement;
      if (!video) return;

      if (state.isPlaying && video.paused) {
        video.play().catch(() => {});
      } else if (!state.isPlaying && !video.paused) {
        video.pause();
      }

      if (video.playbackRate !== state.playbackRate) {
        video.playbackRate = state.playbackRate;
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupVideo();
    this.startTimeLoop();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.hls) {
      this.hls.destroy();
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    clearTimeout(this.hideControlsTimer);
  }

  private setupVideo(): void {
    const video = this.videoRef.nativeElement;

    if (this.isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
      this.hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      this.hls.loadSource(this.videoUrl);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.ps.updateState({ videoReady: true });
      });
    } else if (this.videoUrl) {
      video.src = this.videoUrl;
      video.load();
    }

    video.addEventListener('loadedmetadata', () => {
      this.ps.updateState({
        durationMs: video.duration * 1000,
        videoReady: true
      });
    });

    video.addEventListener('play', () => this.ps.updateState({ isPlaying: true }));
    video.addEventListener('pause', () => this.ps.updateState({ isPlaying: false }));
    video.addEventListener('ended', () => this.ps.updateState({ isPlaying: false }));
  }

  private startTimeLoop(): void {
    const update = () => {
      const video = this.videoRef.nativeElement;
      if (video && !video.paused) {
        this.ps.updateState({ currentTimeMs: video.currentTime * 1000 });
      }
      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }

  togglePlay(): void {
    this.ps.togglePlay();
  }

  onProgressClick(event: MouseEvent): void {
    const bar = this.progressBarRef.nativeElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const timeMs = ratio * this.ps.state.durationMs;
    this.ps.seekTo(timeMs);
  }

  onProgressDrag(event: MouseEvent): void {
    if (event.buttons !== 1) return;
    this.onProgressClick(event);
  }

  setSpeed(rate: number): void {
    this.ps.setPlaybackRate(rate);
    this.showSpeedMenu = false;
  }

  stepForward(): void { this.ps.stepForward(); }
  stepBackward(): void { this.ps.stepBackward(); }
  skipForward(): void { this.ps.skipForward(10); }
  skipBackward(): void { this.ps.skipBackward(10); }

  toggleMute(): void {
    const video = this.videoRef.nativeElement;
    video.muted = !video.muted;
    this.ps.updateState({ isMuted: video.muted });
  }

  onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const vol = parseFloat(input.value);
    const video = this.videoRef.nativeElement;
    video.volume = vol;
    this.ps.updateState({ volume: vol, isMuted: vol === 0 });
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 0.25, 3);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 0.25, 1);
  }

  resetZoom(): void {
    this.zoomLevel = 1;
  }

  toggleFullscreen(): void {
    const container = this.videoRef.nativeElement.parentElement?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => this.ps.updateState({ isFullscreen: true })).catch(() => {});
    } else {
      document.exitFullscreen().then(() => this.ps.updateState({ isFullscreen: false })).catch(() => {});
    }
  }

  onMouseMove(): void {
    this.showControls = true;
    clearTimeout(this.hideControlsTimer);
    this.hideControlsTimer = setTimeout(() => {
      if (this.ps.state.isPlaying) this.showControls = false;
    }, 3000);
  }

  get progressPercent(): number {
    if (!this.ps.state.durationMs) return 0;
    return (this.ps.state.currentTimeMs / this.ps.state.durationMs) * 100;
  }

  get currentTime(): string {
    return this.ps.formatTime(this.ps.state.currentTimeMs);
  }

  get duration(): string {
    return this.ps.formatTime(this.ps.state.durationMs);
  }
}
