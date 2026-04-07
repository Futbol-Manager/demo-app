import Konva from 'konva';

// ─────────────────────────────────────────────────────────────────────────────
//  Sport Element Registry
//  Each element is drawn in top-down (aerial) view, centered at (0, 0).
//  Mouth of goals opens toward +y (downward) so coaches can rotate freely.
// ─────────────────────────────────────────────────────────────────────────────

export interface SportElementDef {
  id: string;           // unique key, stored as Konva attr 'seType'
  labelKey: string;     // i18n key
  iconColor: string;    // accent color for sidebar glow
  sports: string[];     // sport keys; ['*'] = all sports
  defaultW: number;
  defaultH: number;
  /** Inline SVG string (36×36 viewBox) used as sidebar preview icon. */
  previewSvg: string;
  draw(group: Konva.Group): void;
}

// ─── Shared palette ───────────────────────────────────────────────────────────
const WHITE      = '#f2f2f2';
const ORANGE     = '#ff9100';
const RED        = '#e53935';
const NET_FILL   = 'rgba(200,225,200,0.22)';
const NET_STROKE = 'rgba(240,240,240,0.45)';

/** Transparent hit area so the whole group is draggable / clickable. */
function hit(x: number, y: number, w: number, h: number): Konva.Rect {
  return new Konva.Rect({ x, y, width: w, height: h, fill: 'transparent', listening: true });
}

// ─── Goal factory (Konva) ─────────────────────────────────────────────────────
function drawGoal(W: number, H: number, p: number, tint = WHITE): (g: Konva.Group) => void {
  return (g) => {
    g.add(new Konva.Rect({
      x: -W / 2 + p, y: -H / 2, width: W - p * 2, height: H - p,
      fill: NET_FILL, stroke: NET_STROKE, strokeWidth: 1, dash: [3, 2], listening: false
    }));
    g.add(new Konva.Rect({ x: -W / 2, y: -H / 2, width: W, height: p, fill: tint, cornerRadius: [2, 2, 0, 0], listening: false }));
    g.add(new Konva.Rect({ x: -W / 2, y: -H / 2, width: p, height: H, fill: tint, cornerRadius: [2, 0, 0, 0], listening: false }));
    g.add(new Konva.Rect({ x: W / 2 - p, y: -H / 2, width: p, height: H, fill: tint, cornerRadius: [0, 2, 0, 0], listening: false }));
    g.add(hit(-W / 2, -H / 2, W, H));
  };
}

// ─── SVG icon helpers ─────────────────────────────────────────────────────────
/** Goal SVG (36×36), opening faces downward. */
function goalSvg(postW: number, netColor = 'rgba(180,210,180,0.28)', postColor = '#e8e8e8'): string {
  const lp = postW, rp = 36 - postW, netTop = 6, mouthBottom = 30;
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
    <rect x='${lp}' y='${netTop}' width='${rp - lp}' height='${mouthBottom - netTop - postW}' rx='1' fill='${netColor}' stroke='rgba(220,240,220,0.4)' stroke-width='0.5' stroke-dasharray='2,2'/>
    <rect x='2' y='${netTop}' width='32' height='${postW + 1}' rx='2.5' fill='${postColor}'/>
    <rect x='2' y='${netTop}' width='${postW + 1}' height='${mouthBottom - netTop}' rx='2.5' fill='${postColor}'/>
    <rect x='${33 - postW}' y='${netTop}' width='${postW + 1}' height='${mouthBottom - netTop}' rx='2.5' fill='${postColor}'/>
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const SPORT_ELEMENTS: SportElementDef[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMMON — shown for every sport
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'ladder-agility',
    labelKey: 'TBOARD.EL_LADDER',
    iconColor: '#ff9100',
    sports: ['*'],
    defaultW: 50, defaultH: 150,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='4' y='2' width='6' height='32' rx='3' fill='#ff9100'/>
      <rect x='26' y='2' width='6' height='32' rx='3' fill='#ff9100'/>
      <rect x='4' y='2' width='28' height='5' rx='2' fill='#ff9100'/>
      <rect x='4' y='10' width='28' height='5' rx='2' fill='#ffa726'/>
      <rect x='4' y='18' width='28' height='5' rx='2' fill='#ff9100'/>
      <rect x='4' y='26' width='28' height='5' rx='2' fill='#ffa726'/>
      <rect x='4' y='31' width='28' height='5' rx='2' fill='#ff9100'/>
    </svg>`,
    draw(g) {
      const W = 50, H = 150, rungs = 8;
      g.add(new Konva.Rect({ x: -W / 2,     y: -H / 2, width: 6, height: H, fill: ORANGE, cornerRadius: 3, listening: false }));
      g.add(new Konva.Rect({ x: W / 2 - 6,  y: -H / 2, width: 6, height: H, fill: ORANGE, cornerRadius: 3, listening: false }));
      for (let i = 0; i <= rungs; i++) {
        const y = -H / 2 + (H / rungs) * i;
        g.add(new Konva.Rect({ x: -W / 2, y: y - 3, width: W, height: 6, fill: ORANGE, listening: false }));
      }
      g.add(hit(-W / 2, -H / 2, W, H));
    }
  },

  {
    id: 'hurdle',
    labelKey: 'TBOARD.EL_HURDLE',
    iconColor: '#f0f0f0',
    sports: ['*'],
    defaultW: 60, defaultH: 36,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='2' y='11' width='32' height='10' rx='3' fill='#e8e8e8'/>
      <rect x='2' y='15' width='32' height='3' rx='1.5' fill='#ff9100'/>
      <rect x='4' y='21' width='7' height='13' rx='2.5' fill='#e8e8e8'/>
      <rect x='25' y='21' width='7' height='13' rx='2.5' fill='#e8e8e8'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Rect({ x: -30, y: -10, width: 60, height: 10, fill: WHITE, cornerRadius: 2, listening: false }));
      g.add(new Konva.Rect({ x: -30, y: -5,  width: 60, height: 3,  fill: ORANGE, listening: false }));
      g.add(new Konva.Rect({ x: -28, y: 0, width: 8, height: 18, fill: WHITE, cornerRadius: [0, 0, 2, 2], listening: false }));
      g.add(new Konva.Rect({ x:  20, y: 0, width: 8, height: 18, fill: WHITE, cornerRadius: [0, 0, 2, 2], listening: false }));
      g.add(hit(-30, -10, 60, 28));
    }
  },

  {
    id: 'mannequin',
    labelKey: 'TBOARD.EL_MANNEQUIN',
    iconColor: '#e53935',
    sports: ['*'],
    defaultW: 32, defaultH: 72,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <circle cx='18' cy='5' r='5' fill='#ef5350'/>
      <rect x='15' y='10' width='6' height='17' rx='2' fill='#ef5350'/>
      <rect x='5' y='12' width='26' height='7' rx='3.5' fill='#ef5350'/>
      <ellipse cx='18' cy='31' rx='10' ry='4' fill='#b71c1c' opacity='0.6'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Circle({ x: 0, y: -36, radius: 8, fill: RED, listening: false }));
      g.add(new Konva.Rect({ x: -5, y: -28, width: 10, height: 63, fill: RED, cornerRadius: 2, listening: false }));
      g.add(new Konva.Rect({ x: -20, y: -24, width: 40, height: 9, fill: RED, cornerRadius: 3, listening: false }));
      g.add(new Konva.Ellipse({ x: 0, y: 35, radiusX: 14, radiusY: 5, fill: 'rgba(229,57,53,0.55)', listening: false }));
      g.add(hit(-20, -44, 40, 79));
    }
  },

  {
    id: 'direction-arrow',
    labelKey: 'TBOARD.EL_ARROW',
    iconColor: '#4caf50',
    sports: ['*'],
    defaultW: 34, defaultH: 50,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <polygon points='18,2 32,16 25,16 25,34 11,34 11,16 4,16' fill='#f5f5f5' stroke='#66bb6a' stroke-width='1.5'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Line({
        points: [0, -25, 14, -5, 6, -5, 6, 25, -6, 25, -6, -5, -14, -5],
        closed: true, fill: '#ffffff', stroke: 'rgba(0,200,83,0.5)', strokeWidth: 1.5, listening: false
      }));
      g.add(hit(-14, -25, 28, 50));
    }
  },

  {
    id: 'zone-area',
    labelKey: 'TBOARD.EL_ZONE',
    iconColor: '#ffea00',
    sports: ['*'],
    defaultW: 100, defaultH: 70,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='3' y='3' width='30' height='30' rx='4' fill='rgba(255,234,0,0.16)' stroke='#ffea00' stroke-width='2' stroke-dasharray='5,3'/>
      <circle cx='3' cy='3' r='2' fill='#ffea00' opacity='0.7'/>
      <circle cx='33' cy='3' r='2' fill='#ffea00' opacity='0.7'/>
      <circle cx='3' cy='33' r='2' fill='#ffea00' opacity='0.7'/>
      <circle cx='33' cy='33' r='2' fill='#ffea00' opacity='0.7'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Rect({
        x: -50, y: -35, width: 100, height: 70,
        fill: 'rgba(255,234,0,0.14)', stroke: 'rgba(255,234,0,0.65)',
        strokeWidth: 2, dash: [8, 5], cornerRadius: 6, listening: false
      }));
      g.add(hit(-50, -35, 100, 70));
    }
  },

  {
    id: 'cone',
    labelKey: 'TBOARD.EL_CONE',
    iconColor: '#ff6d00',
    sports: ['*'],
    defaultW: 28, defaultH: 34,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <ellipse cx='18' cy='32' rx='13' ry='3.5' fill='rgba(0,0,0,0.28)'/>
      <polygon points='18,4 31,30 5,30' fill='#ff6d00'/>
      <polygon points='11,19 25,19 27,24 9,24' fill='rgba(255,255,255,0.5)'/>
      <polygon points='18,4 23,14 13,14' fill='rgba(255,255,255,0.18)'/>
      <ellipse cx='18' cy='30' rx='13' ry='3' fill='#c03e00'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Ellipse({ x: 0, y: 17, radiusX: 15, radiusY: 4.5, fill: 'rgba(0,0,0,0.28)', listening: false }));
      g.add(new Konva.Line({
        points: [0, -17, 15, 13, -15, 13],
        closed: true, fill: '#ff6d00', stroke: 'rgba(160,40,0,0.4)', strokeWidth: 1, listening: false
      }));
      g.add(new Konva.Line({
        points: [-7, 1, 7, 1, 9, 6, -9, 6],
        closed: true, fill: 'rgba(255,255,255,0.5)', listening: false
      }));
      g.add(new Konva.Ellipse({ x: 0, y: 13, radiusX: 15, radiusY: 3.5, fill: '#c03e00', listening: false }));
      g.add(hit(-15, -17, 30, 34));
    }
  },

  {
    id: 'disc-marker',
    labelKey: 'TBOARD.EL_DISC',
    iconColor: '#ffea00',
    sports: ['*'],
    defaultW: 30, defaultH: 20,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <ellipse cx='18' cy='30' rx='14' ry='4.5' fill='rgba(0,0,0,0.2)'/>
      <ellipse cx='18' cy='27' rx='14' ry='4' fill='#b8920a'/>
      <ellipse cx='18' cy='23' rx='14' ry='9' fill='#ffea00'/>
      <ellipse cx='14' cy='20' rx='5' ry='3' fill='rgba(255,255,255,0.22)'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Ellipse({ x: 0, y: 12, radiusX: 17, radiusY: 5, fill: 'rgba(0,0,0,0.2)', listening: false }));
      g.add(new Konva.Ellipse({ x: 0, y: 7, radiusX: 17, radiusY: 5, fill: '#b8920a', listening: false }));
      g.add(new Konva.Ellipse({ x: 0, y: 1, radiusX: 17, radiusY: 12, fill: '#ffea00', listening: false }));
      g.add(new Konva.Ellipse({ x: -5, y: -3, radiusX: 6, radiusY: 3.5, fill: 'rgba(255,255,255,0.22)', listening: false }));
      g.add(hit(-17, -11, 34, 23));
    }
  },

  {
    id: 'slalom-pole',
    labelKey: 'TBOARD.EL_POLE',
    iconColor: '#e53935',
    sports: ['*'],
    defaultW: 14, defaultH: 80,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <ellipse cx='18' cy='34' rx='6' ry='2.5' fill='rgba(0,0,0,0.3)'/>
      <rect x='14' y='31' width='8' height='4' rx='2' fill='#b0bec5'/>
      <rect x='15' y='4'  width='6' height='7' rx='1' fill='#e53935'/>
      <rect x='15' y='11' width='6' height='7' rx='0' fill='#ffffff'/>
      <rect x='15' y='18' width='6' height='7' rx='0' fill='#e53935'/>
      <rect x='15' y='25' width='6' height='6' rx='0' fill='#ffffff'/>
      <rect x='15' y='31' width='6' height='1' rx='0' fill='#e53935'/>
      <circle cx='18' cy='4' r='3' fill='#e53935'/>
    </svg>`,
    draw(g) {
      const H = 80, hw = 7;
      g.add(new Konva.Ellipse({ x: 0, y: H / 2 + 3, radiusX: 10, radiusY: 3, fill: 'rgba(0,0,0,0.28)', listening: false }));
      g.add(new Konva.Rect({ x: -12, y: H / 2 - 5, width: 24, height: 6, fill: '#b0bec5', cornerRadius: 2, listening: false }));
      const stripes = ['#e53935', '#ffffff', '#e53935', '#ffffff'];
      const sh = H / stripes.length;
      stripes.forEach((c, i) => {
        g.add(new Konva.Rect({ x: -hw, y: -H / 2 + i * sh, width: hw * 2, height: sh, fill: c, listening: false }));
      });
      g.add(new Konva.Circle({ x: 0, y: -H / 2, radius: hw, fill: '#e53935', listening: false }));
      g.add(hit(-hw, -H / 2, hw * 2, H));
    }
  },

  {
    id: 'agility-ring',
    labelKey: 'TBOARD.EL_RING',
    iconColor: '#29b6f6',
    sports: ['*'],
    defaultW: 50, defaultH: 50,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <ellipse cx='18' cy='22' rx='15' ry='6' fill='rgba(0,0,0,0.16)'/>
      <ellipse cx='18' cy='20' rx='15' ry='11' fill='none' stroke='#29b6f6' stroke-width='5'/>
      <ellipse cx='18' cy='17' rx='7' ry='4' fill='none' stroke='rgba(130,220,255,0.35)' stroke-width='1.5'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Ellipse({ x: 0, y: 14, radiusX: 24, radiusY: 7, fill: 'rgba(0,0,0,0.16)', listening: false }));
      g.add(new Konva.Ellipse({ x: 0, y: 0, radiusX: 25, radiusY: 17, fill: 'transparent', stroke: '#29b6f6', strokeWidth: 7, listening: false }));
      g.add(hit(-25, -17, 50, 34));
    }
  },

  {
    id: 'blocking-pad',
    labelKey: 'TBOARD.EL_PAD',
    iconColor: '#78909c',
    sports: ['*'],
    defaultW: 32, defaultH: 72,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='8'  y='4'  width='20' height='28' rx='5' fill='#78909c'/>
      <rect x='12' y='8'  width='12' height='4'  rx='2' fill='rgba(255,255,255,0.25)'/>
      <rect x='12' y='15' width='12' height='4'  rx='2' fill='rgba(255,255,255,0.25)'/>
      <rect x='8'  y='4'  width='5'  height='28' rx='4' fill='rgba(255,255,255,0.1)'/>
      <rect x='10' y='30' width='7'  height='5'  rx='2' fill='#546e7a'/>
      <rect x='19' y='30' width='7'  height='5'  rx='2' fill='#546e7a'/>
    </svg>`,
    draw(g) {
      const W = 32, H = 72;
      g.add(new Konva.Rect({ x: -W / 2, y: -H / 2, width: W, height: H - 10, fill: '#78909c', cornerRadius: 6, listening: false }));
      [-20, -6, 8].forEach(y => {
        g.add(new Konva.Rect({ x: -10, y, width: 20, height: 7, fill: 'rgba(255,255,255,0.22)', cornerRadius: 2, listening: false }));
      });
      g.add(new Konva.Rect({ x: -W / 2, y: -H / 2, width: 7, height: H - 10, fill: 'rgba(255,255,255,0.1)', cornerRadius: [6, 0, 0, 6], listening: false }));
      g.add(new Konva.Rect({ x: -W / 2 + 2, y: H / 2 - 12, width: 12, height: 9, fill: '#546e7a', cornerRadius: 2, listening: false }));
      g.add(new Konva.Rect({ x: W / 2 - 14, y: H / 2 - 12, width: 12, height: 9, fill: '#546e7a', cornerRadius: 2, listening: false }));
      g.add(hit(-W / 2, -H / 2, W, H));
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  FOOTBALL (⚽)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'speed-gate',
    labelKey: 'TBOARD.EL_SPEED_GATE',
    iconColor: '#e0e0e0',
    sports: ['futbol', 'futbol-sala'],
    defaultW: 80, defaultH: 60,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='3'  y='11' width='5' height='20' rx='2.5' fill='#e8e8e8'/>
      <rect x='28' y='11' width='5' height='20' rx='2.5' fill='#e8e8e8'/>
      <rect x='3'  y='9'  width='30' height='5' rx='2.5' fill='#e8e8e8'/>
      <rect x='3'  y='11' width='30' height='2' fill='#ff9100'/>
      <rect x='1'  y='29' width='9'  height='3' rx='1.5' fill='#cccccc'/>
      <rect x='26' y='29' width='9'  height='3' rx='1.5' fill='#cccccc'/>
    </svg>`,
    draw(g) {
      const W = 80, postH = 50, bar = 12;
      g.add(new Konva.Rect({ x: -W / 2, y: -postH / 2, width: bar, height: postH, fill: WHITE, cornerRadius: 3, listening: false }));
      g.add(new Konva.Rect({ x:  W / 2 - bar, y: -postH / 2, width: bar, height: postH, fill: WHITE, cornerRadius: 3, listening: false }));
      g.add(new Konva.Rect({ x: -W / 2, y: -postH / 2 - bar, width: W, height: bar, fill: WHITE, cornerRadius: 3, listening: false }));
      g.add(new Konva.Rect({ x: -W / 2, y: -postH / 2 - bar + 4, width: W, height: 4, fill: ORANGE, listening: false }));
      g.add(new Konva.Rect({ x: -W / 2 - 5, y: postH / 2, width: 20, height: 5, fill: '#cccccc', cornerRadius: 2, listening: false }));
      g.add(new Konva.Rect({ x:  W / 2 - 15, y: postH / 2, width: 20, height: 5, fill: '#cccccc', cornerRadius: 2, listening: false }));
      g.add(hit(-W / 2, -postH / 2 - bar, W, postH + bar + 5));
    }
  },

  {
    id: 'goal-football',
    labelKey: 'TBOARD.EL_GOAL',
    iconColor: '#e8e8e8',
    sports: ['futbol'],
    // FIFA: 7.32 m wide × 2 m deep → at 10 px/m: 73 × 20 px
    defaultW: 73, defaultH: 20,
    previewSvg: goalSvg(4),
    draw: drawGoal(73, 20, 5)
  },

  {
    id: 'goal-small',
    labelKey: 'TBOARD.EL_GOAL_SMALL',
    iconColor: '#cccccc',
    sports: ['futbol'],
    defaultW: 44, defaultH: 16,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='9' y='9' width='18' height='9' rx='1' fill='rgba(180,210,180,0.28)' stroke='rgba(220,240,220,0.4)' stroke-width='0.5' stroke-dasharray='2,2'/>
      <rect x='6' y='9' width='24' height='4' rx='2' fill='#e8e8e8'/>
      <rect x='6' y='9' width='4' height='18' rx='2' fill='#e8e8e8'/>
      <rect x='26' y='9' width='4' height='18' rx='2' fill='#e8e8e8'/>
    </svg>`,
    draw: drawGoal(44, 16, 5)
  },

  {
    id: 'corner-flag',
    labelKey: 'TBOARD.EL_CORNER_FLAG',
    iconColor: '#ffea00',
    sports: ['futbol'],
    defaultW: 20, defaultH: 28,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='15' y='5' width='5' height='28' rx='2.5' fill='#e8e8e8'/>
      <polygon points='20,5 34,12 20,18' fill='#ffea00'/>
      <circle cx='17.5' cy='34' r='3' fill='none' stroke='#e8e8e8' stroke-width='1.5'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Rect({ x: -3, y: -14, width: 6, height: 28, fill: WHITE, cornerRadius: 2, listening: false }));
      g.add(new Konva.Line({ points: [0, -14, 14, -6, 0, 2], closed: true, fill: '#ffea00', stroke: 'rgba(255,200,0,0.5)', strokeWidth: 1, listening: false }));
      g.add(hit(-6, -14, 22, 28));
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  HANDBALL (🤾)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'goal-handball',
    labelKey: 'TBOARD.EL_GOAL',
    iconColor: '#e8e8e8',
    sports: ['balonmano'],
    // IHF: 3 m wide × 1 m deep → at 26.25px/m(W) 34px/m(H): 79 × 34 px
    defaultW: 79, defaultH: 34,
    previewSvg: goalSvg(4, 'rgba(180,210,180,0.28)'),
    draw: drawGoal(79, 34, 5)
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  FUTSAL (👟)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'goal-futsal',
    labelKey: 'TBOARD.EL_GOAL',
    iconColor: '#e8e8e8',
    sports: ['futbol-sala'],
    // FIFA Futsal: 3 m wide × 1 m deep → at 26.25px/m(W) 34px/m(H): 79 × 34 px
    defaultW: 79, defaultH: 34,
    previewSvg: goalSvg(4, 'rgba(180,210,180,0.28)'),
    draw: drawGoal(79, 34, 5)
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  BASKETBALL (🏀)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'basket-basketball',
    labelKey: 'TBOARD.EL_BASKET',
    iconColor: '#e65100',
    sports: ['baloncesto'],
    defaultW: 54, defaultH: 32,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='2' y='3' width='32' height='7' rx='2' fill='#e8e8e8'/>
      <rect x='11' y='3' width='14' height='7' rx='1' fill='none' stroke='#e8e8e8' stroke-width='1.5'/>
      <rect x='16' y='10' width='4' height='5' fill='#e8e8e8'/>
      <circle cx='18' cy='26' r='9' fill='none' stroke='#e65100' stroke-width='3'/>
      <line x1='11' y1='26' x2='10' y2='34' stroke='rgba(200,200,200,0.55)' stroke-width='1.5'/>
      <line x1='18' y1='26' x2='18' y2='35' stroke='rgba(200,200,200,0.55)' stroke-width='1.5'/>
      <line x1='25' y1='26' x2='26' y2='34' stroke='rgba(200,200,200,0.55)' stroke-width='1.5'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Rect({ x: -27, y: -16, width: 54, height: 8, fill: WHITE, cornerRadius: 2, listening: false }));
      g.add(new Konva.Rect({ x: -12, y: -16, width: 24, height: 8, fill: 'transparent', stroke: WHITE, strokeWidth: 2, listening: false }));
      g.add(new Konva.Rect({ x: -3, y: -8, width: 6, height: 8, fill: WHITE, listening: false }));
      g.add(new Konva.Circle({ x: 0, y: 10, radius: 11, fill: 'transparent', stroke: '#e65100', strokeWidth: 3.5, listening: false }));
      [-6, 0, 6].forEach(dx => {
        g.add(new Konva.Line({ points: [dx, 10, dx * 0.4, 22], stroke: 'rgba(200,200,200,0.5)', strokeWidth: 1.5, listening: false }));
      });
      g.add(hit(-27, -16, 54, 38));
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  RUGBY / AMERICAN FOOTBALL (🏉🏈)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'posts-rugby',
    labelKey: 'TBOARD.EL_POSTS',
    iconColor: '#e8e8e8',
    sports: ['rugby', 'futbol-americano'],
    defaultW: 60, defaultH: 50,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='3' y='17' width='30' height='5' rx='2.5' fill='#e8e8e8'/>
      <rect x='3' y='5' width='5' height='17' rx='2.5' fill='#e8e8e8'/>
      <rect x='28' y='5' width='5' height='17' rx='2.5' fill='#e8e8e8'/>
      <rect x='15.5' y='22' width='5' height='12' rx='2.5' fill='#e8e8e8'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Rect({ x: -25, y: -5, width: 50, height: 8, fill: WHITE, cornerRadius: 2, listening: false }));
      g.add(new Konva.Rect({ x: -4, y: 3, width: 8, height: 22, fill: WHITE, cornerRadius: [0, 0, 2, 2], listening: false }));
      g.add(new Konva.Rect({ x: -28, y: -22, width: 7, height: 25, fill: WHITE, cornerRadius: [2, 2, 0, 0], listening: false }));
      g.add(new Konva.Rect({ x:  21, y: -22, width: 7, height: 25, fill: WHITE, cornerRadius: [2, 2, 0, 0], listening: false }));
      g.add(hit(-28, -22, 56, 47));
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  VOLLEYBALL (🏐)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'net-volleyball',
    labelKey: 'TBOARD.EL_NET',
    iconColor: '#e8e8e8',
    sports: ['voley'],
    defaultW: 130, defaultH: 20,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='2' y='11' width='5' height='16' rx='2.5' fill='#e8e8e8'/>
      <rect x='29' y='11' width='5' height='16' rx='2.5' fill='#e8e8e8'/>
      <rect x='7' y='11' width='22' height='6' rx='2' fill='#e8e8e8'/>
      <rect x='7' y='17' width='22' height='7' rx='1' fill='none' stroke='rgba(200,200,200,0.6)' stroke-width='1' stroke-dasharray='3,2'/>
      <rect x='9' y='7' width='2' height='12' rx='1' fill='#ef5350' opacity='0.85'/>
      <rect x='25' y='7' width='2' height='12' rx='1' fill='#ef5350' opacity='0.85'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Rect({ x: -67, y: -5, width: 8, height: 18, fill: WHITE, cornerRadius: 2, listening: false }));
      g.add(new Konva.Rect({ x:  59, y: -5, width: 8, height: 18, fill: WHITE, cornerRadius: 2, listening: false }));
      g.add(new Konva.Rect({ x: -59, y: -5, width: 118, height: 8, fill: WHITE, cornerRadius: 1, listening: false }));
      g.add(new Konva.Rect({ x: -59, y: 3, width: 118, height: 9, fill: 'rgba(200,200,200,0.18)', stroke: 'rgba(200,200,200,0.5)', strokeWidth: 1, dash: [4, 4], listening: false }));
      g.add(hit(-67, -5, 134, 23));
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  FIELD HOCKEY (🏑)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'goal-hockey-field',
    labelKey: 'TBOARD.EL_GOAL',
    iconColor: '#e8e8e8',
    sports: ['hockey'],
    // FIH: 3.66 m wide × 1.2 m deep → at 11.49px/m(W) 12.36px/m(H): 42 × 15 px
    defaultW: 42, defaultH: 15,
    previewSvg: goalSvg(4),
    draw: drawGoal(42, 15, 4)
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  ICE HOCKEY (🏒)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'goal-hockey-ice',
    labelKey: 'TBOARD.EL_GOAL',
    iconColor: '#c0e8ff',
    sports: ['hockey-hielo'],
    // NHL: 1.83 m wide × 1.12 m deep → at 17.22px/m(W) 26.25px/m(H): 32 × 29 px
    defaultW: 32, defaultH: 29,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='10' y='8' width='16' height='14' rx='1' fill='rgba(100,180,255,0.18)' stroke='rgba(150,200,255,0.35)' stroke-width='0.5' stroke-dasharray='2,2'/>
      <rect x='8'  y='8' width='20' height='4'  rx='2' fill='#c0e8ff'/>
      <rect x='8'  y='8' width='4'  height='20' rx='2' fill='#c0e8ff'/>
      <rect x='24' y='8' width='4'  height='20' rx='2' fill='#c0e8ff'/>
    </svg>`,
    draw: drawGoal(32, 29, 4, '#a0d4ff')
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  WATER POLO (🤽)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'goal-waterpolo',
    labelKey: 'TBOARD.EL_GOAL',
    iconColor: '#5db8ff',
    sports: ['waterpolo'],
    // FINA: 3 m wide × 0.45 m deep → at 35px/m(W) 34px/m(H): 105 × 15 px
    defaultW: 105, defaultH: 15,
    previewSvg: goalSvg(4, 'rgba(100,180,255,0.22)', '#90caf9'),
    draw: drawGoal(105, 15, 5, '#a0d4ff')
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  BASEBALL (⚾)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'base-baseball',
    labelKey: 'TBOARD.EL_BASE',
    iconColor: '#e8e8e8',
    sports: ['beisbol'],
    defaultW: 26, defaultH: 26,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <rect x='10' y='10' width='16' height='16' rx='2' fill='#e8e8e8' transform='rotate(45 18 18)'/>
      <circle cx='18' cy='18' r='2' fill='rgba(180,180,180,0.5)'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Rect({ x: -10, y: -10, width: 20, height: 20, fill: WHITE, rotation: 45, cornerRadius: 2, listening: false }));
      g.add(hit(-14, -14, 28, 28));
    }
  },

  {
    id: 'mound-baseball',
    labelKey: 'TBOARD.EL_MOUND',
    iconColor: '#a0785a',
    sports: ['beisbol'],
    defaultW: 34, defaultH: 34,
    previewSvg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'>
      <circle cx='18' cy='18' r='15' fill='#8d6e63' stroke='#a1887f' stroke-width='1.5'/>
      <rect x='10' y='15' width='16' height='6' rx='2' fill='#e8e8e8'/>
    </svg>`,
    draw(g) {
      g.add(new Konva.Circle({ radius: 17, fill: 'rgba(160,120,90,0.7)', stroke: 'rgba(200,170,140,0.8)', strokeWidth: 2, listening: false }));
      g.add(new Konva.Rect({ x: -9, y: -3, width: 18, height: 6, fill: WHITE, cornerRadius: 1, listening: false }));
      g.add(hit(-17, -17, 34, 34));
    }
  },

];

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getSportElements(sport: string): SportElementDef[] {
  return SPORT_ELEMENTS.filter(el =>
    el.sports.includes('*') || el.sports.includes(sport)
  );
}

export function getCommonElements(): SportElementDef[] {
  return SPORT_ELEMENTS.filter(el => el.sports.includes('*'));
}

export function getSportSpecificElements(sport: string): SportElementDef[] {
  return SPORT_ELEMENTS.filter(el =>
    !el.sports.includes('*') && el.sports.includes(sport)
  );
}

export function findSportElementDef(id: string): SportElementDef | undefined {
  return SPORT_ELEMENTS.find(el => el.id === id);
}
