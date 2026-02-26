import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges
} from '@angular/core';
import { Injury, BodyZone } from 'src/app/core/services/injury/injury.model';

@Component({
  selector: 'app-body-map-anatomical',
  template: `
<div class="bma-wrap" (mouseleave)="onLeave()">

  <!-- ── View toggle ─────────────────────────────── -->
  <div class="bma-view-toggle">
    <button class="bma-btn" [class.active]="view === 'front'" (click)="setView('front')">
      <i class="bi bi-person me-1"></i>Vista anterior
    </button>
    <button class="bma-btn" [class.active]="view === 'back'" (click)="setView('back')">
      <i class="bi bi-person me-1" style="transform:scaleX(-1);display:inline-block"></i>Vista posterior
    </button>
  </div>

  <!-- ── Main SVG ────────────────────────────────── -->
  <div class="bma-svg-wrap">
    <svg viewBox="85 0 130 305" xmlns="http://www.w3.org/2000/svg" class="bma-svg">
      <defs>
        <!-- Tissue-type gradients -->
        <radialGradient id="bmaGMuscle" cx="40%" cy="30%" r="70%">
          <stop offset="0%"   stop-color="#d95555"/>
          <stop offset="100%" stop-color="#6b1818"/>
        </radialGradient>
        <radialGradient id="bmaGJoint" cx="50%" cy="40%" r="65%">
          <stop offset="0%"   stop-color="#5599dd"/>
          <stop offset="100%" stop-color="#18365e"/>
        </radialGradient>
        <radialGradient id="bmaGTendon" cx="50%" cy="50%" r="65%">
          <stop offset="0%"   stop-color="#d4b040"/>
          <stop offset="100%" stop-color="#6b4e10"/>
        </radialGradient>
        <radialGradient id="bmaGBone" cx="50%" cy="40%" r="65%">
          <stop offset="0%"   stop-color="#50aab8"/>
          <stop offset="100%" stop-color="#184848"/>
        </radialGradient>
        <radialGradient id="bmaGLigament" cx="50%" cy="40%" r="65%">
          <stop offset="0%"   stop-color="#d07030"/>
          <stop offset="100%" stop-color="#6b3010"/>
        </radialGradient>
        <!-- Glow filter for injury zones -->
        <filter id="bmaGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ══════════════════════════════════════════
           CAPA 0 — Silueta base (fondo de figura)
      ══════════════════════════════════════════ -->
      <path *ngIf="view === 'front'"
        d="M150,8 C138,8 126,18 126,32 C126,46 137,56 145,58
           C142,60 140,63 142,65
           C136,65 127,68 120,73 C113,78 104,85 103,96
           C102,106 102,120 104,124
           L96,124 C95,134 95,149 97,159
           L113,159 L113,191 C113,201 117,209 124,212
           L147,213 L147,229 C148,237 145,244 143,251
           C141,260 140,273 142,282
           L140,297 C138,300 136,305 141,305
           L159,305 C164,305 162,300 160,297
           L158,282 C160,273 159,260 157,251
           C155,244 152,237 153,229
           L153,213 L176,212 C183,209 187,201 187,191
           L187,159 L203,159 C205,149 205,134 204,124
           L196,124 C198,120 198,106 197,96
           C196,85 187,78 180,73 C173,68 164,65 158,65
           C160,63 158,60 155,58
           C163,56 174,46 174,32 C174,18 162,8 150,8 Z"
        fill="#0d1a2c" stroke="rgba(60,110,180,0.3)" stroke-width="0.8"/>

      <path *ngIf="view === 'back'"
        d="M150,8 C138,8 126,18 126,32 C126,46 137,56 145,58
           C142,60 140,63 142,65
           C136,65 127,68 120,73 C113,78 104,85 103,96
           C102,106 102,120 104,124
           L96,124 C95,134 95,149 97,159
           L113,159 L113,191 C113,201 117,209 124,212
           L147,213 L147,229 C148,237 145,244 143,251
           C141,260 140,273 142,282
           L140,297 C138,300 136,305 141,305
           L159,305 C164,305 162,300 160,297
           L158,282 C160,273 159,260 157,251
           C155,244 152,237 153,229
           L153,213 L176,212 C183,209 187,201 187,191
           L187,159 L203,159 C205,149 205,134 204,124
           L196,124 C198,120 198,106 197,96
           C196,85 187,78 180,73 C173,68 164,65 158,65
           C160,63 158,60 155,58
           C163,56 174,46 174,32 C174,18 162,8 150,8 Z"
        fill="#0d1a2c" stroke="rgba(60,110,180,0.3)" stroke-width="0.8"/>

      <!-- ══════════════════════════════════════════
           CAPA 1 — Rellenos anatómicos por zona
           (coloreados por tipo de tejido)
      ══════════════════════════════════════════ -->
      <ng-container *ngFor="let zone of activeZones">
        <path [attr.d]="zone.svgPath"
              [attr.fill]="getTissueFill(zone)"
              [attr.stroke]="getTissueStroke(zone)"
              stroke-width="0.7"
              pointer-events="none"
              class="bma-zone-fill">
        </path>
      </ng-container>

      <!-- ══════════════════════════════════════════
           CAPA 2 — Detalle anatómico FRONTAL
           (líneas de definición muscular, huesos)
      ══════════════════════════════════════════ -->
      <g *ngIf="view === 'front'" pointer-events="none" class="bma-detail">

        <!-- Clavículas (hueso) -->
        <path d="M143,58 C138,59 132,61 127,63"
              stroke="#50d0d0" stroke-width="1.3" fill="none" opacity="0.8"/>
        <path d="M157,58 C162,59 168,61 173,63"
              stroke="#50d0d0" stroke-width="1.3" fill="none" opacity="0.8"/>

        <!-- Esternón (línea ósea vertical) -->
        <line x1="150" y1="63" x2="150" y2="103"
              stroke="#40b0b0" stroke-width="1" opacity="0.55"/>

        <!-- División pectoral (surco deltopectoral) -->
        <path d="M120,74 C121,80 122,85 122,90"
              fill="none" stroke="#1a1a2a" stroke-width="0.9" opacity="0.55"/>
        <path d="M180,74 C179,80 178,85 178,90"
              fill="none" stroke="#1a1a2a" stroke-width="0.9" opacity="0.55"/>

        <!-- Cabeza clavicular pectoral (separación de haces) -->
        <path d="M143,63 C144,70 146,78 148,86"
              fill="none" stroke="#c04040" stroke-width="0.8" opacity="0.6"/>
        <path d="M157,63 C156,70 154,78 152,86"
              fill="none" stroke="#c04040" stroke-width="0.8" opacity="0.6"/>

        <!-- Serrato anterior (costillas laterales) -->
        <path d="M127,81 C124,85 123,89 124,93"
              fill="none" stroke="#c04040" stroke-width="0.9"/>
        <path d="M126,88 C123,92 122,96 124,100"
              fill="none" stroke="#c04040" stroke-width="0.8" opacity="0.8"/>
        <path d="M173,81 C176,85 177,89 176,93"
              fill="none" stroke="#c04040" stroke-width="0.9"/>
        <path d="M174,88 C177,92 178,96 176,100"
              fill="none" stroke="#c04040" stroke-width="0.8" opacity="0.8"/>

        <!-- Línea alba (recto abdominal) + intersecciones tendinosas -->
        <line x1="150" y1="104" x2="150" y2="141"
              stroke="#1a1a2a" stroke-width="1" opacity="0.6"/>
        <line x1="146" y1="112" x2="154" y2="112"
              stroke="#1a1a2a" stroke-width="0.7" opacity="0.5"/>
        <line x1="146" y1="120" x2="154" y2="120"
              stroke="#1a1a2a" stroke-width="0.7" opacity="0.5"/>
        <line x1="146" y1="128" x2="154" y2="128"
              stroke="#1a1a2a" stroke-width="0.7" opacity="0.5"/>

        <!-- Oblicuos externos (fibras diagonales) -->
        <path d="M129,97 C128,104 128,112 130,121"
              fill="none" stroke="#c04040" stroke-width="0.7" opacity="0.5"/>
        <path d="M171,97 C172,104 172,112 170,121"
              fill="none" stroke="#c04040" stroke-width="0.7" opacity="0.5"/>

        <!-- Ligamento inguinal -->
        <path d="M131,128 C136,133 142,139 145,145"
              fill="none" stroke="#d07030" stroke-width="1" opacity="0.75"/>
        <path d="M169,128 C164,133 158,139 155,145"
              fill="none" stroke="#d07030" stroke-width="1" opacity="0.75"/>

        <!-- Cresta ilíaca (prominencia ósea) -->
        <path d="M110,128 C113,123 118,121 124,121"
              fill="none" stroke="#50d0d0" stroke-width="1.1" opacity="0.65"/>
        <path d="M190,128 C187,123 182,121 176,121"
              fill="none" stroke="#50d0d0" stroke-width="1.1" opacity="0.65"/>

        <!-- Bíceps: vientre muscular y surco bicipital -->
        <path d="M108,84 C106,91 105,101 106,109 C107,114 109,117 112,118"
              fill="none" stroke="#c04040" stroke-width="0.9" opacity="0.6"/>
        <path d="M192,84 C194,91 195,101 194,109 C193,114 191,117 188,118"
              fill="none" stroke="#c04040" stroke-width="0.9" opacity="0.6"/>

        <!-- VMO — Vasto medial oblicuo (lágrima del cuádriceps) -->
        <path d="M137,200 C135,205 136,209 140,211"
              fill="none" stroke="#e04040" stroke-width="1.2" opacity="0.7"/>
        <path d="M163,200 C165,205 164,209 160,211"
              fill="none" stroke="#e04040" stroke-width="1.2" opacity="0.7"/>

        <!-- Separación cuádriceps (recto femoral / vastus lat.) -->
        <path d="M136,156 C135,170 135,185 136,199"
              fill="none" stroke="#1a1a2a" stroke-width="0.7" opacity="0.4"/>
        <path d="M164,156 C165,170 165,185 164,199"
              fill="none" stroke="#1a1a2a" stroke-width="0.7" opacity="0.4"/>

        <!-- Rótulas (articulación) -->
        <ellipse cx="134" cy="220" rx="6" ry="5"
                 fill="url(#bmaGJoint)" stroke="#4080c0" stroke-width="0.7" opacity="0.9"/>
        <ellipse cx="166" cy="220" rx="6" ry="5"
                 fill="url(#bmaGJoint)" stroke="#4080c0" stroke-width="0.7" opacity="0.9"/>

        <!-- Tibial anterior (músculo visible en espinilla) -->
        <path d="M128,233 C127,244 127,257 128,267"
              fill="none" stroke="#c04040" stroke-width="1.1" opacity="0.65"/>
        <path d="M172,233 C173,244 173,257 172,267"
              fill="none" stroke="#c04040" stroke-width="1.1" opacity="0.65"/>

        <!-- Borde medial de la tibia (hueso visible) -->
        <path d="M133,232 C133,248 133,262 133,272"
              fill="none" stroke="#40b0b0" stroke-width="0.8" opacity="0.5"/>
        <path d="M167,232 C167,248 167,262 167,272"
              fill="none" stroke="#40b0b0" stroke-width="0.8" opacity="0.5"/>

        <!-- Maléolos (tobillo) -->
        <circle cx="126" cy="289" r="3.5" fill="url(#bmaGJoint)" opacity="0.85"/>
        <circle cx="154" cy="289" r="3.5" fill="url(#bmaGJoint)" opacity="0.85"/>
      </g>

      <!-- ══════════════════════════════════════════
           CAPA 2 — Detalle anatómico POSTERIOR
      ══════════════════════════════════════════ -->
      <g *ngIf="view === 'back'" pointer-events="none" class="bma-detail">

        <!-- Trapecio: forma de diamante + fibras -->
        <path d="M150,58 L150,108"
              stroke="#1a1a2a" stroke-width="1.1" opacity="0.65"/>
        <path d="M143,62 C145,72 147,82 150,87"
              fill="none" stroke="#c04040" stroke-width="0.8" opacity="0.6"/>
        <path d="M157,62 C155,72 153,82 150,87"
              fill="none" stroke="#c04040" stroke-width="0.8" opacity="0.6"/>
        <path d="M128,80 C135,85 142,88 150,90"
              fill="none" stroke="#c04040" stroke-width="0.7" opacity="0.5"/>
        <path d="M172,80 C165,85 158,88 150,90"
              fill="none" stroke="#c04040" stroke-width="0.7" opacity="0.5"/>

        <!-- Romboides (entre escápulas, bajo trapecio) -->
        <path d="M144,74 C143,79 143,85 145,89"
              fill="none" stroke="#a03030" stroke-width="0.9" opacity="0.5"/>
        <path d="M156,74 C157,79 157,85 155,89"
              fill="none" stroke="#a03030" stroke-width="0.9" opacity="0.5"/>

        <!-- Surco deltoides posterior -->
        <path d="M120,74 C121,80 121,87 122,92"
              fill="none" stroke="#1a1a2a" stroke-width="0.9" opacity="0.55"/>
        <path d="M180,74 C179,80 179,87 178,92"
              fill="none" stroke="#1a1a2a" stroke-width="0.9" opacity="0.55"/>

        <!-- Tríceps: cabeza larga (surco axial) -->
        <path d="M111,85 C112,93 113,104 113,114"
              fill="none" stroke="#c04040" stroke-width="0.9" opacity="0.55"/>
        <path d="M189,85 C188,93 187,104 187,114"
              fill="none" stroke="#c04040" stroke-width="0.9" opacity="0.55"/>

        <!-- Dorsal ancho (borde lateral) -->
        <path d="M125,94 C123,104 122,114 124,123"
              fill="none" stroke="#c04040" stroke-width="0.9" opacity="0.55"/>
        <path d="M175,94 C177,104 178,114 176,123"
              fill="none" stroke="#c04040" stroke-width="0.9" opacity="0.55"/>

        <!-- Erectores espinales (columnas paralelas a la espina) -->
        <path d="M147,112 C146,120 145,128 146,136"
              fill="none" stroke="#d04040" stroke-width="1.3" opacity="0.65"/>
        <path d="M153,112 C154,120 155,128 154,136"
              fill="none" stroke="#d04040" stroke-width="1.3" opacity="0.65"/>

        <!-- Cresta ilíaca posterior -->
        <path d="M110,128 C115,123 122,121 128,122"
              fill="none" stroke="#50d0d0" stroke-width="1.1" opacity="0.65"/>
        <path d="M190,128 C185,123 178,121 172,122"
              fill="none" stroke="#50d0d0" stroke-width="1.1" opacity="0.65"/>

        <!-- Glúteo medio (borde superior visible) -->
        <path d="M112,130 C117,126 123,125 129,126"
              fill="none" stroke="#d05050" stroke-width="1.1" opacity="0.65"/>
        <path d="M188,130 C183,126 177,125 171,126"
              fill="none" stroke="#d05050" stroke-width="1.1" opacity="0.65"/>

        <!-- División isquiotibiales (bíceps femoral / semitendinoso) -->
        <path d="M150,160 C149,175 148,192 149,213"
              fill="none" stroke="#1a1a2a" stroke-width="0.8" opacity="0.45"/>
        <path d="M150,160 C151,175 152,192 151,213"
              fill="none" stroke="#1a1a2a" stroke-width="0.8" opacity="0.45"/>

        <!-- Fosa poplítea (hueco posterior de rodilla) -->
        <ellipse cx="134" cy="220" rx="5" ry="4"
                 fill="none" stroke="#4080c0" stroke-width="0.9" opacity="0.7"/>
        <ellipse cx="166" cy="220" rx="5" ry="4"
                 fill="none" stroke="#4080c0" stroke-width="0.9" opacity="0.7"/>

        <!-- Separación de los gemelos (medial vs lateral) -->
        <path d="M131,222 C130,232 130,244 132,254"
              fill="none" stroke="#1a1a2a" stroke-width="0.9" opacity="0.5"/>
        <path d="M169,222 C170,232 170,244 168,254"
              fill="none" stroke="#1a1a2a" stroke-width="0.9" opacity="0.5"/>

        <!-- Tendón de Aquiles (cuerda tendinosa dorada) -->
        <line x1="131" y1="277" x2="131" y2="293"
              stroke="#d4a030" stroke-width="2.2" stroke-linecap="round" opacity="0.95"/>
        <line x1="169" y1="277" x2="169" y2="293"
              stroke="#d4a030" stroke-width="2.2" stroke-linecap="round" opacity="0.95"/>
        <!-- Sombra bajo aquiles -->
        <line x1="131" y1="277" x2="131" y2="293"
              stroke="rgba(255,220,80,0.25)" stroke-width="5" stroke-linecap="round"/>
        <line x1="169" y1="277" x2="169" y2="293"
              stroke="rgba(255,220,80,0.25)" stroke-width="5" stroke-linecap="round"/>
      </g>

      <!-- ══════════════════════════════════════════
           CAPA 3 — Overlays de lesión (status color)
      ══════════════════════════════════════════ -->
      <ng-container *ngFor="let zone of activeZones">
        <path *ngIf="hasInjury(zone.id)"
              [attr.d]="zone.svgPath"
              [attr.fill]="getStatusColor(zone.id)"
              stroke="none"
              pointer-events="none"
              [class.bma-pulse]="isCritical(zone.id)"
              class="bma-injury">
        </path>
      </ng-container>

      <!-- ══════════════════════════════════════════
           CAPA 4 — Zonas interactivas (hit targets)
      ══════════════════════════════════════════ -->
      <ng-container *ngFor="let zone of activeZones">
        <path [attr.d]="zone.svgPath"
              [style.fill]="hoveredZone?.id === zone.id ? 'rgba(34,191,99,0.18)' : 'rgba(0,0,0,0)'"
              [style.stroke]="hoveredZone?.id === zone.id ? '#22bf63' : 'none'"
              style="stroke-width:1.5;cursor:pointer;"
              class="bma-hit"
              (mouseenter)="onZoneEnter(zone, $event)"
              (mousemove)="onZoneMove($event)"
              (click)="onZoneClick(zone)">
        </path>
      </ng-container>

    </svg>

    <!-- Tooltip -->
    <div class="bma-tip"
         *ngIf="hoveredZone"
         [style.left.px]="tipX"
         [style.top.px]="tipY">
      <span class="bma-tip-name">{{ getZoneLabel(hoveredZone) }}</span>
      <span class="bma-tip-tissue">{{ getTissueLabel(hoveredZone) }}</span>
      <span class="bma-tip-inj" *ngIf="injCount(hoveredZone.id) > 0">
        {{ injCount(hoveredZone.id) }}&nbsp;lesión<ng-container *ngIf="injCount(hoveredZone.id) > 1">es</ng-container>&nbsp;activa<ng-container *ngIf="injCount(hoveredZone.id) > 1">s</ng-container>
      </span>
      <span class="bma-tip-hint" *ngIf="!readOnly && injCount(hoveredZone.id) === 0">
        Clic para registrar lesión
      </span>
    </div>
  </div>

  <!-- ── Leyenda ─────────────────────────────────── -->
  <div class="bma-legend">
    <p class="bma-legend-title">Tejido</p>
    <div class="bma-legend-row" *ngFor="let t of tissueLegend">
      <i class="bma-dot" [style.background]="t.color"></i>{{ t.label }}
    </div>
    <p class="bma-legend-title" style="margin-top:10px">Estado</p>
    <div class="bma-legend-row">
      <i class="bma-dot" style="background:#dc3545;box-shadow:0 0 6px #dc354590"></i>Baja médica
    </div>
    <div class="bma-legend-row">
      <i class="bma-dot" style="background:#fd7e14"></i>Fisioterapia
    </div>
    <div class="bma-legend-row">
      <i class="bma-dot" style="background:#ffc107"></i>Readaptación
    </div>
    <div class="bma-legend-row">
      <i class="bma-dot" style="background:#0d6efd"></i>Condicionado
    </div>
  </div>

</div>
  `,
  styles: [`
    :host { display: block; }

    .bma-wrap {
      position: relative;
      background: #07101c;
      border-radius: 14px;
      padding: 16px 16px 16px 16px;
      overflow: hidden;
      box-shadow: inset 0 0 60px rgba(0,0,0,0.5);
      min-height: 420px;
    }

    /* ── Toggle ──────────────────────────────────── */
    .bma-view-toggle {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .bma-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(190,215,240,0.6);
      border-radius: 8px;
      padding: 7px 20px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.18s;
    }

    .bma-btn.active {
      background: rgba(34,191,99,0.14);
      border-color: rgba(34,191,99,0.45);
      color: #22bf63;
    }

    .bma-btn:hover:not(.active) {
      background: rgba(255,255,255,0.10);
      color: rgba(190,215,240,0.9);
    }

    /* ── SVG container ───────────────────────────── */
    .bma-svg-wrap {
      position: relative;
      max-width: 340px;
      margin: 0 auto;
    }

    .bma-svg {
      width: 100%;
      height: auto;
      display: block;
    }

    /* ── Zone layers ─────────────────────────────── */
    .bma-zone-fill {
      pointer-events: none;
    }

    .bma-detail {
      pointer-events: none;
    }

    .bma-injury {
      pointer-events: none;
      opacity: 0.52;
    }

    .bma-hit {
      transition: fill 0.12s, stroke 0.12s;
    }

    /* ── Pulse animation for 'baja' zones ─────────── */
    @keyframes bmaGlowPulse {
      0%, 100% { opacity: 0.52; }
      50%       { opacity: 0.85; }
    }

    .bma-pulse {
      animation: bmaGlowPulse 1.3s ease-in-out infinite;
    }

    /* ── Tooltip ─────────────────────────────────── */
    .bma-tip {
      position: absolute;
      background: rgba(7,16,28,0.95);
      color: #d8eaf6;
      padding: 8px 14px;
      border-radius: 9px;
      font-size: 0.79rem;
      pointer-events: none;
      transform: translate(-50%, calc(-100% - 14px));
      border: 1px solid rgba(34,191,99,0.4);
      backdrop-filter: blur(8px);
      white-space: nowrap;
      z-index: 20;
      box-shadow: 0 4px 18px rgba(0,0,0,0.55);
    }

    .bma-tip-name {
      display: block;
      font-weight: 700;
      font-size: 0.83rem;
      letter-spacing: 0.01em;
    }

    .bma-tip-tissue {
      display: block;
      font-size: 0.69rem;
      opacity: 0.42;
      margin-top: 1px;
    }

    .bma-tip-inj {
      display: inline-block;
      margin-top: 5px;
      background: #dc3545;
      color: #fff;
      border-radius: 10px;
      padding: 2px 9px;
      font-size: 0.71rem;
      font-weight: 600;
    }

    .bma-tip-hint {
      display: block;
      font-size: 0.7rem;
      opacity: 0.4;
      margin-top: 3px;
    }

    /* ── Legend ──────────────────────────────────── */
    .bma-legend {
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .bma-legend-title {
      font-size: 0.61rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(190,215,240,0.35);
      margin: 0 0 2px 0;
    }

    .bma-legend-row {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.69rem;
      color: rgba(190,215,240,0.62);
    }

    .bma-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
  `]
})
export class BodyMapAnatomicalComponent implements OnChanges {

  @Input() injuries: Injury[]  = [];
  @Input() zones:    BodyZone[] = [];
  @Input() readOnly  = false;
  @Input() isPro     = false;

  @Output() zoneSelected = new EventEmitter<BodyZone>();

  view: 'front' | 'back' = 'front';
  hoveredZone: BodyZone | null = null;
  tipX = 0;
  tipY = 0;
  activeZones: BodyZone[] = [];

  readonly tissueLegend = [
    { label: 'Muscular',    color: '#c44040' },
    { label: 'Articular',   color: '#3a70b8' },
    { label: 'Ligamentoso', color: '#c07830' },
    { label: 'Tendinoso',   color: '#c0b030' },
    { label: 'Óseo',        color: '#3a9898' },
  ];

  ngOnChanges(_c: SimpleChanges): void {
    this.activeZones = this.zones.filter(z => z.view === this.view);
  }

  setView(v: 'front' | 'back'): void {
    this.view = v;
    this.hoveredZone = null;
    this.activeZones = this.zones.filter(z => z.view === v);
  }

  onZoneEnter(zone: BodyZone, event: MouseEvent): void {
    this.hoveredZone = zone;
    this.updateTip(event);
  }

  onZoneMove(event: MouseEvent): void {
    if (this.hoveredZone) this.updateTip(event);
  }

  onLeave(): void {
    this.hoveredZone = null;
  }

  onZoneClick(zone: BodyZone): void {
    if (this.readOnly) return;
    this.zoneSelected.emit(zone);
  }

  private updateTip(event: MouseEvent): void {
    const wrap = (event.target as Element).closest('.bma-svg-wrap') as HTMLElement | null;
    if (wrap) {
      const r = wrap.getBoundingClientRect();
      this.tipX = event.clientX - r.left;
      this.tipY = event.clientY - r.top;
    }
  }

  getZoneLabel(zone: BodyZone): string {
    return this.isPro ? (zone.labelPro || zone.labelBase) : zone.labelBase;
  }

  getTissueLabel(zone: BodyZone): string {
    const m: Record<string, string> = {
      muscular: 'Músculo', articular: 'Articulación',
      ligamentoso: 'Ligamento', tendinoso: 'Tendón', oseo: 'Hueso'
    };
    return m[zone.tissueType] ?? zone.tissueType;
  }

  injCount(zoneId: string): number {
    return this.injuries.filter(i => i.zone === zoneId && i.status !== 'alta').length;
  }

  hasInjury(zoneId: string): boolean {
    return this.injuries.some(i => i.zone === zoneId && i.status !== 'alta');
  }

  isCritical(zoneId: string): boolean {
    return this.injuries.some(i => i.zone === zoneId && i.status === 'baja');
  }

  getStatusColor(zoneId: string): string {
    const a = this.injuries.filter(i => i.zone === zoneId && i.status !== 'alta');
    if (!a.length) return 'transparent';
    if (a.some(i => i.status === 'baja'))         return '#dc3545';
    if (a.some(i => i.status === 'fisioterapia')) return '#fd7e14';
    if (a.some(i => i.status === 'readaptacion')) return '#ffc107';
    return '#0d6efd';
  }

  getTissueFill(zone: BodyZone): string {
    const m: Record<string, string> = {
      muscular:    '#8b2222',
      articular:   '#1a4478',
      ligamentoso: '#8b5218',
      tendinoso:   '#8b7c18',
      oseo:        '#1a5858',
    };
    return m[zone.tissueType] ?? '#1a4478';
  }

  getTissueStroke(zone: BodyZone): string {
    const m: Record<string, string> = {
      muscular:    '#f07070',
      articular:   '#5090e0',
      ligamentoso: '#f0a040',
      tendinoso:   '#f0e040',
      oseo:        '#50d0d0',
    };
    return m[zone.tissueType] ?? '#5090e0';
  }
}
