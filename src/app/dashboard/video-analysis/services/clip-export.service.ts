import { Injectable } from '@angular/core';
import { ClipAnnotation, DrawingElement, AnimatedDrawingOverlay } from '../models/analysis.models';

/**
 * Cuts a local video file into an MP4 clip using FFmpeg.wasm.
 *
 * Strategy: load ffmpeg.js via a <script> tag from /assets/ffmpeg-wasm/.
 * This ensures webpack's public path detection resolves the worker chunk
 * (814.ffmpeg.js) correctly from the same folder — no CDN, no COOP/COEP.
 */
@Injectable({ providedIn: 'root' })
export class ClipExportService {

  private ffmpegInstance: any = null;
  private loadPromise: Promise<void> | null = null;

  private loadScript(src: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[data-ffmpeg="true"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.dataset['ffmpeg'] = 'true';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(s);
    });
  }

  private async ensureLoaded(): Promise<void> {
    if (this.ffmpegInstance?.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      // Load ffmpeg.js from assets — this sets the correct public path
      // so the worker chunk (814.ffmpeg.js) is also found from assets.
      await this.loadScript('/assets/ffmpeg-wasm/ffmpeg.js');

      const { FFmpeg } = (window as any).FFmpegWASM;
      this.ffmpegInstance = new FFmpeg();

      await this.ffmpegInstance.load({
        coreURL:  '/assets/ffmpeg-wasm/ffmpeg-core.js',
        wasmURL:  '/assets/ffmpeg-wasm/ffmpeg-core.wasm',
      });
    })();

    return this.loadPromise;
  }

  /**
   * Exports a clip from [startMs, endMs] of the given local video File and
   * triggers a browser download as `${label}.mp4`.
   *
   * @param file       - Local video File selected by the user
   * @param startMs    - Clip start in milliseconds
   * @param endMs      - Clip end in milliseconds
   * @param label      - Download file name (without extension)
   * @param onProgress - Optional callback (0–100)
   */
  async exportClip(
    file: File,
    startMs: number,
    endMs: number,
    label: string,
    onProgress?: (pct: number) => void
  ): Promise<void> {
    await this.ensureLoaded();

    const ff = this.ffmpegInstance;

    const progressHandler = ({ progress }: { progress: number }) => {
      if (onProgress) onProgress(Math.min(99, Math.round(progress * 100)));
    };
    ff.on('progress', progressHandler);

    const ts = Date.now();
    const inputName  = `in_${ts}`;
    const outputName = `out_${ts}.mp4`;

    try {
      // Write the file into FFmpeg's virtual filesystem
      const buf = await file.arrayBuffer();
      await ff.writeFile(inputName, new Uint8Array(buf));

      const startSec    = (startMs / 1000).toFixed(3);
      const durationSec = ((endMs - startMs) / 1000).toFixed(3);

      // -ss before -i → fast stream seek; -c copy → no re-encode (fast)
      await ff.exec([
        '-ss', startSec,
        '-i',  inputName,
        '-t',  durationSec,
        '-c',  'copy',
        '-movflags', '+faststart',
        outputName
      ]);

      const data = await ff.readFile(outputName) as Uint8Array;

      if (onProgress) onProgress(100);

      const blob = new Blob([data], { type: 'video/mp4' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${this.sanitize(label)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      ff.off('progress', progressHandler);
      try { await ff.deleteFile(inputName);  } catch { /* ignore */ }
      try { await ff.deleteFile(outputName); } catch { /* ignore */ }
    }
  }

  /**
   * Exports a clip with annotated freeze-frames inserted at the given positions.
   * Each annotation defines a moment T where the video pauses for D ms showing
   * a still frame with drawings on top.
   *
   * Pipeline per annotation at absolute time T, duration D:
   *   1. Cut segment [prevCut, T]  → segN.mp4  (copy codec, fast)
   *   2. Convert annotated PNG    → pauseN.mp4 (H.264 encoded, silent audio)
   *   3. Concatenate all segments via concat demuxer → output.mp4
   *
   * NOTE: Encoding pause frames requires H.264 encoding which is CPU-intensive
   * in ffmpeg.wasm's single-threaded mode. Expect 30-120s for a 30s clip.
   *
   * @param file           Local video file
   * @param startMs        Clip start in ms
   * @param endMs          Clip end in ms
   * @param label          Output filename
   * @param annotations    Sorted list of ClipAnnotation (must have thumbnailDataUrl)
   * @param onProgress     Progress callback (0-100)
   * @param onStep         Step description callback
   */
  async exportClipWithAnnotations(
    file: File,
    startMs: number,
    endMs: number,
    label: string,
    annotations: ClipAnnotation[],
    animOverlays: AnimatedDrawingOverlay[] = [],
    onProgress?: (pct: number) => void,
    onStep?: (step: string) => void
  ): Promise<void> {
    if (!annotations.length) {
      return this.exportClip(file, startMs, endMs, label, onProgress);
    }

    await this.ensureLoaded();
    const ff = this.ffmpegInstance;

    const step = (msg: string) => { if (onStep) onStep(msg); };
    const prog = (pct: number) => { if (onProgress) onProgress(Math.min(99, pct)); };

    const ts = Date.now();
    const inputName = `src_${ts}.mp4`;
    const allFiles: string[] = [];

    try {
      step('Escribiendo vídeo en memoria…');
      prog(2);
      const buf = await file.arrayBuffer();
      await ff.writeFile(inputName, new Uint8Array(buf));

      // Sort annotations by absolute frameTimeMs
      const sorted = [...annotations].sort((a, b) => a.frameTimeMs - b.frameTimeMs);

      // Build list of segments: [segStart, segEnd] interleaved with pause frames
      const segments: Array<{ type: 'video'; start: number; end: number; name: string }
                            | { type: 'pause'; pngData: string; durationMs: number; name: string }> = [];

      let cursor = startMs;
      for (let i = 0; i < sorted.length; i++) {
        const ann = sorted[i];
        const annMs = Math.max(startMs, Math.min(endMs, ann.frameTimeMs));

        // Video segment before this annotation
        if (annMs > cursor) {
          const segName = `seg_${ts}_${i}.mp4`;
          segments.push({ type: 'video', start: cursor, end: annMs, name: segName });
          allFiles.push(segName);
        }

        // Pause frame — solo si tiene thumbnail Y duración > 0
        if (ann.thumbnailDataUrl && ann.frameDurationMs > 0) {
          const pauseName = `pause_${ts}_${i}.mp4`;
          segments.push({ type: 'pause', pngData: ann.thumbnailDataUrl, durationMs: ann.frameDurationMs, name: pauseName });
          allFiles.push(pauseName);
        }

        cursor = annMs;
      }

      // Final video segment after last annotation
      if (cursor < endMs) {
        const segName = `seg_${ts}_final.mp4`;
        segments.push({ type: 'video', start: cursor, end: endMs, name: segName });
        allFiles.push(segName);
      }

      const progressPerSeg = 85 / segments.length;
      let progressBase = 5;

      // Process each segment
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        progressBase = 5 + i * progressPerSeg;

        if (seg.type === 'video') {
          step(`Procesando segmento de vídeo ${i + 1}/${segments.length}…`);
          const startSec  = (seg.start / 1000).toFixed(3);
          const durSec    = ((seg.end - seg.start) / 1000).toFixed(3);
          const segDurMs  = seg.end - seg.start;

          // Buscar overlays que se solapan con este segmento (tiempos absolutos)
          const activeOverlays = animOverlays.filter(ov =>
            ov.startMsAbs < seg.end && (ov.startMsAbs + ov.durationMs) > seg.start
          );

          if (!activeOverlays.length) {
            // Sin overlays: extracción directa
            await ff.exec([
              '-ss', startSec,
              '-i', inputName,
              '-t', durSec,
              '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-ac', '2',
              '-movflags', '+faststart',
              seg.name
            ]);
          } else {
            // Con overlays: extracción + composición canvas (garantiza alpha correcto)
            step(`Compositing overlay en segmento ${i + 1}/${segments.length}…`);
            const rawName = `raw_${ts}_${i}.mp4`;
            allFiles.push(rawName);
            await ff.exec([
              '-ss', startSec,
              '-i', inputName,
              '-t', durSec,
              '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-ac', '2', '-ar', '48000',
              '-movflags', '+faststart',
              rawName
            ]);

            const rawData = await ff.readFile(rawName) as Uint8Array;
            const ovInfos = activeOverlays.map(ov => ({
              pngDataUrl: ov.pngDataUrl,
              t0: Math.max(0, (ov.startMsAbs - seg.start) / 1000),
              t1: Math.min(segDurMs / 1000, (ov.startMsAbs + ov.durationMs - seg.start) / 1000)
            }));
            const W = activeOverlays[0].width;
            const H = activeOverlays[0].height;

            const composited = await this.canvasCompositeOverlay(rawData, ovInfos, W, H, ff, ts, i, segDurMs);
            await ff.writeFile(seg.name, composited);
          }
        } else {
          step(`Renderizando frame anotado ${i + 1}/${segments.length}…`);
          const durSec = (seg.durationMs / 1000).toFixed(3);
          const pngName = `frame_${ts}_${i}.png`;

          // Write PNG from data URL
          const pngData = this.dataUrlToUint8Array(seg.pngData);
          await ff.writeFile(pngName, pngData);
          allFiles.push(pngName);

          // Encode freeze-frame video with silent audio (48000 Hz para evitar desync)
          await ff.exec([
            '-loop', '1',
            '-i', pngName,
            '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
            '-t', durSec,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-ac', '2', '-ar', '48000',
            '-shortest',
            '-movflags', '+faststart',
            seg.name
          ]);
        }

        prog(progressBase + progressPerSeg);
      }

      // Write concat list
      step('Uniendo segmentos…');
      const concatListName = `concat_${ts}.txt`;
      const concatContent  = segments.map(s => `file '${s.name}'`).join('\n');
      const encoder = new TextEncoder();
      await ff.writeFile(concatListName, encoder.encode(concatContent));
      allFiles.push(concatListName);

      const outputName = `output_${ts}.mp4`;
      allFiles.push(outputName);

      await ff.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListName,
        '-c:v', 'copy',
        '-c:a', 'aac', '-ar', '48000', '-ac', '2',
        '-movflags', '+faststart',
        outputName
      ]);

      step('Descargando…');
      prog(97);

      const data = await ff.readFile(outputName) as Uint8Array;
      if (onProgress) onProgress(100);

      const blob = new Blob([data], { type: 'video/mp4' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${this.sanitize(label)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

    } finally {
      // Cleanup FFmpeg FS
      try { await ff.deleteFile(inputName); } catch { /* ignore */ }
      for (const f of allFiles) {
        try { await ff.deleteFile(f); } catch { /* ignore */ }
      }
    }
  }

  // ── Multi-clip export ─────────────────────────────────────────────────────

  /**
   * Concatenates multiple clips (each with optional annotations/freeze-frames)
   * from the same video file into a single MP4 and triggers a browser download.
   *
   * @param file    Local video File
   * @param clips   Array of { startMs, endMs, annotations }
   * @param label   Output filename (without extension)
   */
  async exportMultipleClips(
    file: File,
    clips: Array<{ startMs: number; endMs: number; annotations: ClipAnnotation[] }>,
    label: string,
    onProgress?: (pct: number) => void,
    onStep?: (step: string) => void
  ): Promise<void> {
    if (!clips.length) return;

    // If only one clip, reuse the single-clip path
    if (clips.length === 1) {
      const c = clips[0];
      const ready = await this.prepareAnnotationThumbnails(file, c.annotations || []);
      return ready.length
        ? this.exportClipWithAnnotations(file, c.startMs, c.endMs, label, ready, [], onProgress, onStep)
        : this.exportClip(file, c.startMs, c.endMs, label, onProgress);
    }

    await this.ensureLoaded();
    const ff   = this.ffmpegInstance;
    const step = (msg: string) => { if (onStep) onStep(msg); };
    const prog = (pct: number) => { if (onProgress) onProgress(Math.min(99, pct)); };

    const ts        = Date.now();
    const inputName = `multi_src_${ts}.mp4`;
    const allFiles: string[] = [];

    try {
      step('Escribiendo vídeo en memoria…');
      prog(2);
      const buf = await file.arrayBuffer();
      await ff.writeFile(inputName, new Uint8Array(buf));

      const clipOutputs: string[] = [];
      const progressPerClip = 85 / clips.length;

      for (let ci = 0; ci < clips.length; ci++) {
        const clip     = clips[ci];
        const clipBase = `clip_${ts}_${ci}`;
        const clipOut  = `${clipBase}_out.mp4`;
        const clipTempFiles: string[] = [];

        step(`Procesando clip ${ci + 1} de ${clips.length}…`);

        const annotations = await this.prepareAnnotationThumbnails(file, clip.annotations || []);
        const sorted      = annotations
          .filter(a => a.thumbnailDataUrl)
          .sort((a, b) => a.frameTimeMs - b.frameTimeMs);

        if (!sorted.length) {
          // Simple copy — no annotations
          const startSec = (clip.startMs / 1000).toFixed(3);
          const durSec   = ((clip.endMs - clip.startMs) / 1000).toFixed(3);
          await ff.exec([
            '-ss', startSec, '-i', inputName, '-t', durSec,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-ac', '2', '-movflags', '+faststart', clipOut
          ]);
        } else {
          // Build segments interleaved with freeze-frames
          const segments: Array<{ name: string }> = [];
          let cursor = clip.startMs;

          for (let si = 0; si < sorted.length; si++) {
            const ann   = sorted[si];
            const annMs = Math.max(clip.startMs, Math.min(clip.endMs, ann.frameTimeMs));

            if (annMs > cursor) {
              const segName = `${clipBase}_seg${si}.mp4`;
              const ss = (cursor / 1000).toFixed(3);
              const dt = ((annMs - cursor) / 1000).toFixed(3);
              await ff.exec([
                '-ss', ss, '-i', inputName, '-t', dt,
                '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-ac', '2', '-movflags', '+faststart', segName
              ]);
              clipTempFiles.push(segName);
              segments.push({ name: segName });
            }

            const pauseName = `${clipBase}_pause${si}.mp4`;
            const durSec    = (ann.frameDurationMs / 1000).toFixed(3);
            const pngName   = `${clipBase}_frame${si}.png`;
            await ff.writeFile(pngName, this.dataUrlToUint8Array(ann.thumbnailDataUrl!));
            clipTempFiles.push(pngName);
            await ff.exec([
              '-loop', '1', '-i', pngName,
              '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
              '-t', durSec,
              '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-ac', '2', '-shortest', '-movflags', '+faststart', pauseName
            ]);
            clipTempFiles.push(pauseName);
            segments.push({ name: pauseName });
            cursor = annMs;
          }

          if (cursor < clip.endMs) {
            const segName = `${clipBase}_segfinal.mp4`;
            const ss = (cursor / 1000).toFixed(3);
            const dt = ((clip.endMs - cursor) / 1000).toFixed(3);
            await ff.exec([
              '-ss', ss, '-i', inputName, '-t', dt,
              '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-ac', '2', '-movflags', '+faststart', segName
            ]);
            clipTempFiles.push(segName);
            segments.push({ name: segName });
          }

          if (segments.length === 1) {
            // Already written to one file — just rename conceptually
            await ff.exec(['-i', segments[0].name, '-c', 'copy', clipOut]);
          } else {
            const concatName = `${clipBase}_concat.txt`;
            const txt = segments.map(s => `file '${s.name}'`).join('\n');
            await ff.writeFile(concatName, new TextEncoder().encode(txt));
            clipTempFiles.push(concatName);
            await ff.exec([
              '-f', 'concat', '-safe', '0', '-i', concatName,
              '-c', 'copy', '-movflags', '+faststart', clipOut
            ]);
          }
          for (const f of clipTempFiles) { try { await ff.deleteFile(f); } catch { /* ignore */ } }
        }

        allFiles.push(clipOut);
        clipOutputs.push(clipOut);
        prog(5 + (ci + 1) * progressPerClip);
      }

      // Final concatenation of all clip outputs
      step('Uniendo todos los clips…');
      const finalConcatName = `final_concat_${ts}.txt`;
      const finalTxt = clipOutputs.map(f => `file '${f}'`).join('\n');
      await ff.writeFile(finalConcatName, new TextEncoder().encode(finalTxt));
      allFiles.push(finalConcatName);

      const outputName = `multi_out_${ts}.mp4`;
      allFiles.push(outputName);
      await ff.exec([
        '-f', 'concat', '-safe', '0', '-i', finalConcatName,
        '-c', 'copy', '-movflags', '+faststart', outputName
      ]);

      step('Descargando…');
      prog(97);
      const data = await ff.readFile(outputName) as Uint8Array;
      if (onProgress) onProgress(100);

      const blob = new Blob([data], { type: 'video/mp4' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${this.sanitize(label)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

    } finally {
      try { await ff.deleteFile(inputName); } catch { /* ignore */ }
      for (const f of allFiles) { try { await ff.deleteFile(f); } catch { /* ignore */ } }
    }
  }

  // ── Thumbnail generation ──────────────────────────────────────────────────

  /**
   * For each annotation that lacks a thumbnailDataUrl, seeks the video to
   * frameTimeMs, captures the frame, renders all drawing elements on top and
   * generates the data URL.  Annotations that already have a thumbnail are
   * returned unchanged.
   */
  async prepareAnnotationThumbnails(
    file: File,
    annotations: ClipAnnotation[]
  ): Promise<ClipAnnotation[]> {
    const result: ClipAnnotation[] = [];
    for (const ann of annotations) {
      if (ann.thumbnailDataUrl) {
        result.push(ann);
        continue;
      }
      try {
        const dataUrl = await this.captureFrameWithDrawings(file, ann.frameTimeMs, ann.drawingData || []);
        result.push({ ...ann, thumbnailDataUrl: dataUrl });
      } catch {
        result.push(ann);
      }
    }
    return result;
  }

  private captureFrameWithDrawings(
    file: File,
    frameTimeMs: number,
    drawingData: DrawingElement[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(file);
      const video   = document.createElement('video');
      video.preload = 'auto';
      video.muted   = true;

      const cleanup = () => URL.revokeObjectURL(blobUrl);

      video.addEventListener('error', () => { cleanup(); reject(new Error('video load error')); }, { once: true });

      video.addEventListener('loadedmetadata', () => {
        video.currentTime = frameTimeMs / 1000;
      }, { once: true });

      video.addEventListener('seeked', () => {
        try {
          const canvas  = document.createElement('canvas');
          canvas.width  = video.videoWidth  || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          for (const el of drawingData) {
            this.renderDrawingEl(ctx, el, canvas.width, canvas.height);
          }
          cleanup();
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch (err) {
          cleanup();
          reject(err);
        }
      }, { once: true });

      video.src = blobUrl;
      video.load();
    });
  }

  /** Renders a single DrawingElement onto an existing canvas context. */
  private renderDrawingEl(ctx: CanvasRenderingContext2D, el: DrawingElement, W: number, H: number): void {
    ctx.save();
    ctx.strokeStyle = el.color;
    ctx.fillStyle   = el.color;
    ctx.lineWidth   = el.strokeWidth;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.setLineDash([]);

    const px = (p: number) => p * W / 100;
    const py = (p: number) => p * H / 100;

    switch (el.type) {
      case 'freeDraw':
        if (!el.points || el.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(px(el.points[0].x), py(el.points[0].y));
        for (let i = 1; i < el.points.length; i++)
          ctx.lineTo(px(el.points[i].x), py(el.points[i].y));
        ctx.stroke();
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(px(el.x!), py(el.y!), px(el.radius || 0), 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case 'arrow': {
        const headLen = Math.max(12, el.strokeWidth * 4);
        const angle   = Math.atan2(py(el.y2!) - py(el.y!), px(el.x2!) - px(el.x!));
        ctx.beginPath();
        ctx.moveTo(px(el.x!), py(el.y!));
        ctx.lineTo(px(el.x2!), py(el.y2!));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px(el.x2!), py(el.y2!));
        ctx.lineTo(px(el.x2!) - headLen * Math.cos(angle - Math.PI / 6),
                   py(el.y2!) - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(px(el.x2!) - headLen * Math.cos(angle + Math.PI / 6),
                   py(el.y2!) - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'line':
        ctx.beginPath();
        ctx.moveTo(px(el.x!), py(el.y!));
        ctx.lineTo(px(el.x2!), py(el.y2!));
        ctx.stroke();
        break;

      case 'dashedLine':
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.moveTo(px(el.x!), py(el.y!));
        ctx.lineTo(px(el.x2!), py(el.y2!));
        ctx.stroke();
        ctx.setLineDash([]);
        break;

      case 'text': {
        // fontSizePct (% de H del canvas) garantiza el mismo tamaño visual
        // en cualquier resolución. Fallback para anotaciones antiguas: estima
        // a partir de fontSize CSS usando 720px como altura de referencia.
        const scaledFont = el.fontSizePct != null
          ? Math.round(el.fontSizePct * H / 100)
          : Math.round((el.fontSize || 20) * H / 720);
        ctx.font         = `bold ${Math.max(8, scaledFont)}px Arial, sans-serif`;
        ctx.fillStyle    = el.color;
        ctx.strokeStyle  = el.color === '#ffffff' ? '#000' : '#fff';
        ctx.lineWidth    = Math.max(1, scaledFont * 0.04);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign    = 'left';
        ctx.strokeText(el.text || '', px(el.x!), py(el.y!));
        ctx.fillText(el.text || '', px(el.x!), py(el.y!));
        break;
      }

      case 'spotlight': {
        const sx = px(el.x!), sy = py(el.y!), sr = px(el.radius || 10);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.arc(sx, sy, sr, 0, 2 * Math.PI, true);
        ctx.fill('evenodd');
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.strokeWidth + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * Composita overlays PNG (con alfa) sobre un segmento MP4.
   *
   * Estrategia: FFmpeg extrae los frames como JPEG → Canvas composita solo los
   * frames activos → FFmpeg recodifica → mux con audio original.
   * Esto evita los problemas de alpha del filtro overlay y los race conditions
   * del seek con HTMLVideoElement.
   */
  private async canvasCompositeOverlay(
    rawData:      Uint8Array,
    overlayInfos: Array<{ pngDataUrl: string; t0: number; t1: number }>,
    W:            number,
    H:            number,
    ff:           any,
    ts:           number,
    idx:          number,
    segDurMs:     number
  ): Promise<Uint8Array> {

    const pfx = `cmp_${ts}_${idx}`;

    console.warn(`[CAE Composite ${idx}] start — overlays=${overlayInfos.length}, segDur=${segDurMs}ms`);
    overlayInfos.forEach((ov, i) =>
      console.warn(`  [CAE Composite ${idx}] ov[${i}]: t0=${ov.t0.toFixed(3)}s  t1=${ov.t1.toFixed(3)}s  pngLen=${ov.pngDataUrl.length}`)
    );

    // ── 1. Escribir segmento y PNGs en el FS de FFmpeg ────────────────────────
    const srcName = `${pfx}_src.mp4`;
    await ff.writeFile(srcName, rawData);

    const ovNames: string[] = [];
    for (let i = 0; i < overlayInfos.length; i++) {
      const ovName = `${pfx}_ov${i}.png`;
      await ff.writeFile(ovName, this.dataUrlToUint8Array(overlayInfos[i].pngDataUrl));
      ovNames.push(ovName);
    }

    const outName    = `${pfx}_out.mp4`;
    const allTmpFiles = [srcName, ...ovNames, outName];

    try {
      // ── 2. Construir filter_complex con overlay nativo de FFmpeg ─────────────
      // Estrategia: convertir cada PNG a rgba para preservar alpha, luego encadenar overlays
      const filterParts: string[] = [];
      let prevLabel = '[0:v]';

      for (let i = 0; i < overlayInfos.length; i++) {
        const ov       = overlayInfos[i];
        const ovLabel  = `[ov${i}]`;
        const outLabel = i < overlayInfos.length - 1 ? `[v${i}]` : '[vout]';
        const enable   = `between(t,${ov.t0.toFixed(3)},${ov.t1.toFixed(3)})`;

        // Convertir PNG a rgba para asegurar canal alpha correcto
        filterParts.push(`[${i + 1}:v]format=rgba${ovLabel}`);
        // Aplicar overlay solo durante el intervalo activo
        filterParts.push(`${prevLabel}${ovLabel}overlay=x=0:y=0:enable='${enable}'${outLabel}`);
        prevLabel = outLabel;
      }

      const filterComplex = filterParts.join(';');
      console.warn(`[CAE Composite ${idx}] filter_complex: ${filterComplex}`);

      // ── 3. Inputs: vídeo + PNGs ───────────────────────────────────────────
      const inputArgs: string[] = ['-i', srcName];
      for (const ovName of ovNames) inputArgs.push('-i', ovName);

      const ret = await ff.exec([
        ...inputArgs,
        '-filter_complex', filterComplex,
        '-map', '[vout]',
        '-map', '0:a',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-ar', '48000', '-ac', '2',
        '-movflags', '+faststart',
        outName
      ]);
      console.warn(`[CAE Composite ${idx}] ffmpeg exit: ${ret}`);

      const result = await ff.readFile(outName) as Uint8Array;
      console.warn(`[CAE Composite ${idx}] resultado: ${result.byteLength} bytes`);
      return result;

    } catch (err) {
      console.error(`[CAE Composite ${idx}] ERROR — devolviendo rawData sin overlay:`, err);
      return rawData;
    } finally {
      for (const f of allTmpFiles) {
        try { await ff.deleteFile(f); } catch { /* ignorar */ }
      }
    }
  }

  /** Converts a data URL (image/png or image/jpeg) to Uint8Array. */
  private dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private sanitize(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'clip';
  }
}
