import {
  Component, OnInit, OnDestroy, OnChanges, AfterViewInit,
  SimpleChanges, ViewChild, ElementRef, Input, NgZone
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlayerStateService } from '../../services/player-state.service';

declare var Hls: any;
declare var YT: any;

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @Input() videoUrl = '';
  @Input() isHls = false;
  @Input() youtubeId: string | null = null;

  @ViewChild('videoElement', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('progressBar', { static: true }) progressBarRef!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private hls: any = null;
  private animFrameId: number | null = null;

  // ── YouTube IFrame ────────────────────────────────────────────────────────
  private ytPlayer: any = null;
  private ytReady = false;

  showControls = true;
  isLoadingVideo = false;
  private hideControlsTimer: any;

  readonly speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  showSpeedMenu = false;
  zoomLevel = 1;

  constructor(public ps: PlayerStateService, private zone: NgZone) {}

  ngOnInit(): void {
    this.ps.seekTo$.pipe(takeUntil(this.destroy$)).subscribe(timeMs => {
      if (this.youtubeId && this.ytPlayer && this.ytReady) {
        this.ytPlayer.seekTo(timeMs / 1000, true);
        this.ps.updateState({ currentTimeMs: timeMs });
      } else {
        const video = this.videoRef.nativeElement;
        video.currentTime = timeMs / 1000;
        this.ps.updateState({ currentTimeMs: timeMs });
      }
    });

    this.ps.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      if (this.youtubeId && this.ytPlayer && this.ytReady) {
        const ytState = this.ytPlayer.getPlayerState?.();
        const isYtPlaying = ytState === 1;
        if (state.isPlaying && !isYtPlaying) {
          this.ytPlayer.playVideo();
        } else if (!state.isPlaying && isYtPlaying) {
          this.ytPlayer.pauseVideo();
        }
        const currentRate = this.ytPlayer.getPlaybackRate?.();
        if (currentRate !== state.playbackRate) {
          this.ytPlayer.setPlaybackRate(state.playbackRate);
        }
      } else {
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
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.youtubeId) {
      this.initYouTubePlayer(this.youtubeId);
    } else {
      this.setupVideoListeners();
      this.loadVideoSource();
      this.startTimeLoop();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const urlChange = changes['videoUrl'];
    if (urlChange && !urlChange.isFirstChange() && urlChange.currentValue && !this.youtubeId) {
      this.loadVideoSource();
    }
    const ytChange = changes['youtubeId'];
    if (ytChange && !ytChange.isFirstChange() && ytChange.currentValue) {
      this.initYouTubePlayer(ytChange.currentValue);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.hls) { this.hls.destroy(); }
    if (this.animFrameId !== null) { cancelAnimationFrame(this.animFrameId); }
    clearTimeout(this.hideControlsTimer);
    if (this.ytPlayer) { try { this.ytPlayer.destroy(); } catch {} }
  }

  // ── YouTube IFrame API ───────────────────────────────────────────────────

  private initYouTubePlayer(videoId: string): void {
    this.isLoadingVideo = true;
    this.ps.updateState({ videoReady: false });

    const create = () => {
      if (this.ytPlayer) {
        try { this.ytPlayer.destroy(); } catch {}
        this.ytPlayer = null;
        this.ytReady = false;
      }
      this.ytPlayer = new YT.Player('yt-player-embed', {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, enablejsapi: 1 },
        events: {
          onReady: () => this.zone.run(() => {
            this.ytReady = true;
            this.isLoadingVideo = false;
            const dur = this.ytPlayer.getDuration() || 0;
            this.ps.updateState({ durationMs: dur * 1000, videoReady: true });
            this.startTimeLoop();
          }),
          onStateChange: (event: any) => this.zone.run(() => {
            if (!this.ytReady) return;
            const dur = this.ytPlayer.getDuration() || 0;
            if (dur > 0) this.ps.updateState({ durationMs: dur * 1000 });
            if (event.data === YT.PlayerState.PLAYING) {
              this.ps.updateState({ isPlaying: true });
            } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
              this.ps.updateState({ isPlaying: false });
            }
          }),
          onError: () => this.zone.run(() => {
            this.isLoadingVideo = false;
          })
        }
      });
    };

    if (typeof YT !== 'undefined' && YT.Player) {
      create();
    } else {
      if (!document.getElementById('yt-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      (window as any)['onYouTubeIframeAPIReady'] = () => this.zone.run(() => create());
    }
  }

  // ── Native video ─────────────────────────────────────────────────────────

  private setupVideoListeners(): void {
    const video = this.videoRef.nativeElement;
    video.addEventListener('loadedmetadata', () => {
      this.isLoadingVideo = false;
      this.ps.updateState({ durationMs: video.duration * 1000, videoReady: true });
    });
    video.addEventListener('error', () => { this.isLoadingVideo = false; });
    video.addEventListener('play',  () => this.ps.updateState({ isPlaying: true }));
    video.addEventListener('pause', () => this.ps.updateState({ isPlaying: false }));
    video.addEventListener('ended', () => this.ps.updateState({ isPlaying: false }));
  }

  private loadVideoSource(): void {
    if (!this.videoUrl) return;
    const video = this.videoRef.nativeElement;
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    this.isLoadingVideo = true;
    this.ps.updateState({ videoReady: false });
    if (this.isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
      this.hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      this.hls.loadSource(this.videoUrl);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.isLoadingVideo = false;
        this.ps.updateState({ videoReady: true });
      });
    } else {
      video.src = this.videoUrl;
      video.load();
    }
  }

  // ── Time loop (shared) ───────────────────────────────────────────────────

  private startTimeLoop(): void {
    if (this.animFrameId !== null) { cancelAnimationFrame(this.animFrameId); }
    const update = () => {
      if (this.youtubeId && this.ytPlayer && this.ytReady) {
        const t = this.ytPlayer.getCurrentTime?.() || 0;
        this.zone.run(() => this.ps.updateState({ currentTimeMs: t * 1000 }));
      } else {
        const video = this.videoRef.nativeElement;
        if (video && !video.paused) {
          this.ps.updateState({ currentTimeMs: video.currentTime * 1000 });
        }
      }
      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }

  // ── Controls ─────────────────────────────────────────────────────────────

  togglePlay(): void { this.ps.togglePlay(); }

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

  stepForward(): void  { this.ps.stepForward(); }
  stepBackward(): void { this.ps.stepBackward(); }
  skipForward(): void  { this.ps.skipForward(10); }
  skipBackward(): void { this.ps.skipBackward(10); }

  toggleMute(): void {
    if (this.youtubeId && this.ytPlayer && this.ytReady) {
      if (this.ytPlayer.isMuted()) {
        this.ytPlayer.unMute();
        this.ps.updateState({ isMuted: false });
      } else {
        this.ytPlayer.mute();
        this.ps.updateState({ isMuted: true });
      }
    } else {
      const video = this.videoRef.nativeElement;
      video.muted = !video.muted;
      this.ps.updateState({ isMuted: video.muted });
    }
  }

  onVolumeChange(event: Event): void {
    const vol = parseFloat((event.target as HTMLInputElement).value);
    if (this.youtubeId && this.ytPlayer && this.ytReady) {
      this.ytPlayer.setVolume(vol * 100);
      this.ps.updateState({ volume: vol, isMuted: vol === 0 });
    } else {
      const video = this.videoRef.nativeElement;
      video.volume = vol;
      this.ps.updateState({ volume: vol, isMuted: vol === 0 });
    }
  }

  zoomIn(): void    { this.zoomLevel = Math.min(this.zoomLevel + 0.25, 3); }
  zoomOut(): void   { this.zoomLevel = Math.max(this.zoomLevel - 0.25, 1); }
  resetZoom(): void { this.zoomLevel = 1; }

  toggleFullscreen(): void {
    const container = this.youtubeId
      ? document.querySelector('.player-container') as HTMLElement
      : this.videoRef.nativeElement.parentElement?.parentElement ?? null;
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

  get currentTime(): string { return this.ps.formatTime(this.ps.state.currentTimeMs); }
  get duration(): string    { return this.ps.formatTime(this.ps.state.durationMs); }
}
