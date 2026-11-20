import { useId, type ReactElement } from 'react';
import { FINISHES, GLASSES, type Finish, type GlassCode, type TypologyId } from '@vidrapro/engine';

interface Props {
  typology: TypologyId;
  widthMm: number;
  heightMm: number;
  finish: Finish;
  glassCode: GlassCode;
  /** fixed flags from the cutting list (box frontal) — optional */
  fixed?: boolean[];
  compact?: boolean;   // thumbnails: no dimension lines
  className?: string;
}

const darken = (hex: string, f = 0.75) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
};

/**
 * Technical elevation drawing (vista interna), scaled to the real proportions.
 * Pure SVG, prints crisp and scales on any screen.
 */
export function Schematic({ typology, widthMm, heightMm, finish, glassCode, fixed, compact, className }: Props) {
  const uid = useId().replace(/:/g, '');
  const W = Math.max(widthMm || 1, 100);
  const H = Math.max(heightMm || 1, 100);

  const area = compact ? { w: 120, h: 96 } : { w: 360, h: 300 };
  const pad = compact ? { l: 4, t: 4, r: 4, b: 4 } : { l: 14, t: 14, r: 54, b: 46 };
  const s = Math.min(area.w / W, area.h / H);
  const w = W * s;
  const h = H * s;
  const vbW = w + pad.l + pad.r;
  const vbH = h + pad.t + pad.b;
  const x0 = pad.l;
  const y0 = pad.t;

  const fin = FINISHES[finish]?.hex ?? '#cbd5e1';
  const finStroke = darken(fin, finish === 'PRETO' ? 1.6 : 0.62);
  const tint = GLASSES[glassCode]?.tint ?? '#dbeafe';
  const isTempered = typology === 'BOX_FRONTAL' || typology === 'PORTA_PIVOTANTE';
  const t = isTempered ? Math.max(2, Math.min(w, h) * 0.018) : Math.max(3.5, Math.min(w, h) * 0.04);
  const sw = compact ? 0.8 : 1;

  const glassFill = `url(#g-${uid})`;

  const Glass = ({ x, y, gw, gh }: { x: number; y: number; gw: number; gh: number }) => (
    <g>
      <rect x={x} y={y} width={gw} height={gh} fill={glassFill} stroke={darken(tint, 0.8)} strokeWidth={0.6 * sw} />
      {/* reflections */}
      <line x1={x + gw * 0.18} y1={y + gh * 0.12} x2={x + gw * 0.42} y2={y + gh * 0.02 + 2} stroke="#fff" strokeOpacity={0.8} strokeWidth={1.4 * sw} strokeLinecap="round" />
      <line x1={x + gw * 0.16} y1={y + gh * 0.24} x2={x + gw * 0.58} y2={y + gh * 0.06 + 2} stroke="#fff" strokeOpacity={0.55} strokeWidth={1 * sw} strokeLinecap="round" />
    </g>
  );

  const Arrow = ({ cx, cy, len }: { cx: number; cy: number; len: number }) => {
    const a = Math.min(5, len * 0.18);
    return (
      <g stroke="#1d5cf2" strokeWidth={1.4 * sw} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
        <path d={`M${cx - len / 2} ${cy}H${cx + len / 2}`} />
        <path d={`M${cx - len / 2 + a} ${cy - a}L${cx - len / 2} ${cy}L${cx - len / 2 + a} ${cy + a}`} />
        <path d={`M${cx + len / 2 - a} ${cy - a}L${cx + len / 2} ${cy}L${cx + len / 2 - a} ${cy + a}`} />
      </g>
    );
  };

  const body: ReactElement[] = [];

  if (typology === 'JANELA_CORRER_2F' || typology === 'JANELA_CORRER_4F' || typology === 'PORTA_CORRER_2F') {
    const N = typology === 'JANELA_CORRER_4F' ? 4 : 2;
    body.push(<rect key="frame" x={x0} y={y0} width={w} height={h} fill={fin} stroke={finStroke} strokeWidth={sw} rx={1} />);
    const ix = x0 + t, iy = y0 + t, iw = w - 2 * t, ih = h - 2 * t;
    body.push(<rect key="open" x={ix} y={iy} width={iw} height={ih} fill="#eef2f7" stroke={finStroke} strokeWidth={0.6 * sw} />);
    const ov = Math.min(10, iw * 0.035);
    const lw = N === 2 ? (iw + ov) / 2 : (iw / 2 + ov) / 2;
    const xs = N === 2 ? [0, iw - lw] : [0, lw - ov, iw - 2 * lw + ov, iw - lw];
    const back = N === 2 ? [0] : [1, 2]; // draw rear-track leaves first
    const order = [...back, ...xs.map((_, i) => i).filter((i) => !back.includes(i))];
    const lt = t * 0.85;
    for (const i of order) {
      const lx = ix + xs[i];
      const isBack = back.includes(i);
      body.push(
        <g key={`leaf${i}`}>
          <rect x={lx} y={iy} width={lw} height={ih} fill={isBack ? darken(fin, 0.94) : fin} stroke={finStroke} strokeWidth={0.8 * sw} />
          <Glass x={lx + lt} y={iy + lt} gw={lw - 2 * lt} gh={ih - 2 * lt} />
          {!compact && <Arrow cx={lx + lw / 2} cy={iy + ih * 0.62} len={Math.min(34, lw * 0.4)} />}
          {typology === 'PORTA_CORRER_2F' && i === 1 && (
            <rect x={lx + lt * 0.3} y={iy + ih * 0.45} width={Math.max(1.5, lt * 0.4)} height={ih * 0.12} rx={1} fill={finStroke} />
          )}
        </g>,
      );
    }
  } else if (typology === 'BOX_FRONTAL') {
    const N = fixed?.length ?? (W <= 1400 ? 2 : 4);
    const flags = fixed ?? (N === 2 ? [true, false] : [true, false, false, true]);
    // top track + U sides
    body.push(<rect key="track" x={x0} y={y0} width={w} height={t * 1.8} fill={fin} stroke={finStroke} strokeWidth={sw} />);
    body.push(<rect key="ul" x={x0} y={y0} width={t} height={h} fill={fin} stroke={finStroke} strokeWidth={0.6 * sw} />);
    body.push(<rect key="ur" x={x0 + w - t} y={y0} width={t} height={h} fill={fin} stroke={finStroke} strokeWidth={0.6 * sw} />);
    body.push(<line key="floor" x1={x0 - 6} y1={y0 + h} x2={x0 + w + 6} y2={y0 + h} stroke="#94a3b8" strokeWidth={sw} strokeDasharray="3 2" />);
    const ix = x0 + t, iw = w - 2 * t;
    const top = y0 + t * 1.8;
    const ov = Math.min(14, iw * 0.05);
    const pw = N === 2 ? (iw + ov) / 2 : (iw + 2 * ov) / 4;
    const xs = N === 2 ? [0, iw - pw] : [0, pw - ov, iw - 2 * pw + ov, iw - pw];
    xs.forEach((px, i) => {
      const fixedPanel = flags[i];
      const ph = fixedPanel ? h - t * 1.8 - t * 0.6 : h - t * 1.8 - t * 1.6;
      const x = ix + px;
      body.push(
        <g key={`p${i}`}>
          <Glass x={x} y={top} gw={pw} gh={ph} />
          {fixedPanel && <rect x={x} y={top + ph} width={pw} height={t * 0.6} fill={fin} stroke={finStroke} strokeWidth={0.5 * sw} />}
          {!fixedPanel && (
            <>
              <circle cx={x + pw * 0.15} cy={top + 2.4} r={Math.max(1.4, t * 0.5)} fill={finStroke} />
              <circle cx={x + pw * 0.85} cy={top + 2.4} r={Math.max(1.4, t * 0.5)} fill={finStroke} />
              <rect x={i < N / 2 ? x + pw - 6 * sw : x + 3 * sw} y={top + ph * 0.42} width={2.2 * sw} height={ph * 0.16} rx={1.1} fill={finStroke} />
              {!compact && <Arrow cx={x + pw / 2} cy={top + ph * 0.62} len={Math.min(30, pw * 0.4)} />}
            </>
          )}
          {!compact && fixedPanel && (
            <text x={x + pw / 2} y={top + ph * 0.62} textAnchor="middle" fontSize={9} fontWeight={700} fill="#64748b" letterSpacing={1}>FIXO</text>
          )}
        </g>,
      );
    });
  } else {
    // PORTA_PIVOTANTE
    body.push(<line key="floor" x1={x0 - 6} y1={y0 + h} x2={x0 + w + 6} y2={y0 + h} stroke="#94a3b8" strokeWidth={sw} strokeDasharray="3 2" />);
    body.push(<rect key="bat" x={x0 + w - t} y={y0} width={t} height={h} fill={fin} stroke={finStroke} strokeWidth={0.6 * sw} />);
    const gx = x0 + 1.5, gy = y0 + 1, gw = w - t - 3, gh = h - 3;
    body.push(<Glass key="g" x={gx} y={gy} gw={gw} gh={gh} />);
    const px = gx + gw * 0.08;
    body.push(<rect key="pt" x={px - 4} y={gy} width={8} height={4} fill={finStroke} rx={1} />);
    body.push(<rect key="pb" x={px - 4} y={gy + gh - 4} width={8} height={4} fill={finStroke} rx={1} />);
    body.push(<rect key="h" x={gx + gw - 9} y={gy + gh * 0.38} width={2.6 * sw} height={gh * 0.24} rx={1.3} fill={finStroke} />);
    body.push(<rect key="lock" x={gx + gw - 14} y={gy + gh - 10} width={10} height={6} rx={1} fill={finStroke} opacity={0.8} />);
    if (!compact) {
      body.push(
        <path key="swing" d={`M${gx + gw} ${gy}L${px} ${gy + gh / 2}L${gx + gw} ${gy + gh}`}
          fill="none" stroke="#1d5cf2" strokeWidth={0.9} strokeDasharray="4 3" opacity={0.7} />,
      );
    }
  }

  const dim = (n: number) => `${Math.round(n)}`;

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className} role="img"
      aria-label={`Esquema ${typology} ${widthMm} × ${heightMm} mm`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint} stopOpacity={0.95} />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity={0.55} />
          <stop offset="1" stopColor={tint} stopOpacity={0.95} />
        </linearGradient>
        <marker id={`a-${uid}`} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L8 4L0 8z" fill="#64748b" />
        </marker>
      </defs>
      {body}
      {!compact && (
        <g fontSize={11} fontWeight={600} fill="#334155" fontFamily="Inter, system-ui, sans-serif">
          {/* width */}
          <line x1={x0} y1={y0 + h + 6} x2={x0} y2={y0 + h + 28} stroke="#cbd5e1" />
          <line x1={x0 + w} y1={y0 + h + 6} x2={x0 + w} y2={y0 + h + 28} stroke="#cbd5e1" />
          <line x1={x0 + 1} y1={y0 + h + 22} x2={x0 + w - 1} y2={y0 + h + 22} stroke="#64748b"
            markerStart={`url(#a-${uid})`} markerEnd={`url(#a-${uid})`} />
          <rect x={x0 + w / 2 - 30} y={y0 + h + 14} width={60} height={16} rx={8} fill="#fff" />
          <text x={x0 + w / 2} y={y0 + h + 26} textAnchor="middle">{dim(widthMm)} mm</text>
          {/* height */}
          <line x1={x0 + w + 6} y1={y0} x2={x0 + w + 40} y2={y0} stroke="#cbd5e1" />
          <line x1={x0 + w + 6} y1={y0 + h} x2={x0 + w + 40} y2={y0 + h} stroke="#cbd5e1" />
          <line x1={x0 + w + 32} y1={y0 + 1} x2={x0 + w + 32} y2={y0 + h - 1} stroke="#64748b"
            markerStart={`url(#a-${uid})`} markerEnd={`url(#a-${uid})`} />
          <g transform={`translate(${x0 + w + 36} ${y0 + h / 2}) rotate(-90)`}>
            <rect x={-30} y={-12} width={60} height={16} rx={8} fill="#fff" />
            <text x={0} y={0} textAnchor="middle">{dim(heightMm)} mm</text>
          </g>
        </g>
      )}
    </svg>
  );
}
