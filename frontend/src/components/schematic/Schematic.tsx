import { useId, type ReactElement } from 'react';
import { FINISHES, GLASSES, type Drawing, type DrawingPanel, type Finish, type GlassCode } from '@vidrapro/engine';

interface Props {
  drawing: Drawing | null;
  finish: Finish;
  glassCode: GlassCode;
  /** Dimension labels (vão). `d` = lateral for corner boxes. */
  dims?: { w: number; h: number; d?: number };
  compact?: boolean;
  className?: string;
}

const darken = (hex: string, f = 0.75) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.min(255, Math.round(((n >> s) & 255) * f)).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
};

/**
 * Generic technical elevation (vista interna). The geometry comes from the
 * engine (`cutting.drawing`), so every model — current and future — renders
 * here without model-specific code.
 */
export function Schematic({ drawing, finish, glassCode, dims, compact, className }: Props) {
  const uid = useId().replace(/:/g, '');
  if (!drawing) return <svg viewBox="0 0 10 10" className={className} />;

  const W = Math.max(drawing.widthMm, 1), H = Math.max(drawing.heightMm, 1);
  const area = compact ? { w: 120, h: 96 } : { w: 380, h: 300 };
  const pad = compact ? { l: 4, t: 4, r: 4, b: 4 } : { l: 14, t: 14, r: 56, b: 46 };
  const s = Math.min(area.w / W, area.h / H);
  const w = W * s, h = H * s;
  const vbW = w + pad.l + pad.r, vbH = h + pad.t + pad.b;
  const X = (mm: number) => pad.l + mm * s;
  const Y = (mm: number) => pad.t + mm * s;
  const S = (mm: number) => mm * s;
  const sw = compact ? 0.7 : 1;

  const fin = FINISHES[finish]?.hex ?? '#cbd5e1';
  const finStroke = darken(fin, finish === 'PRETO' || finish === 'BRONZE' ? 1.7 : 0.62);
  const tint = GLASSES[glassCode]?.tint ?? '#dbeafe';
  const glassFill = `url(#g-${uid})`;
  const face = Math.max(compact ? 1.5 : 2.5, S(drawing.frameFaceMm));

  const els: ReactElement[] = [];
  let k = 0;
  const push = (e: ReactElement) => els.push(<g key={k++}>{e}</g>);

  // ---- frame --------------------------------------------------------------
  if (drawing.frame === 'aluminum') {
    push(<rect x={X(0)} y={Y(0)} width={w} height={h} fill={fin} stroke={finStroke} strokeWidth={sw} rx={0.5} />);
    push(<rect x={X(0) + face} y={Y(0) + face} width={w - 2 * face} height={h - face * (drawing.floor ? 1 : 2)} fill="#eef2f7" stroke={finStroke} strokeWidth={0.5 * sw} />);
  } else if (drawing.frame === 'facade') {
    push(<rect x={X(0)} y={Y(0)} width={w} height={h} fill="#eef2f7" stroke={finStroke} strokeWidth={face} />);
  }
  if (drawing.floor) push(<line x1={X(0) - 6} y1={Y(H)} x2={X(W) + 6} y2={Y(H)} stroke="#94a3b8" strokeWidth={sw} strokeDasharray="3 2" />);

  // ---- panels (fill + sash), rear layer first --------------------------------
  const panels = [...drawing.panels].sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));
  const fillArea = (x: number, y: number, pw: number, ph: number, p: DrawingPanel) => {
    if (p.fill === 'glass') {
      push(<>
        <rect x={x} y={y} width={pw} height={ph} fill={glassFill} stroke={darken(tint, 0.8)} strokeWidth={0.5 * sw} />
        <line x1={x + pw * 0.18} y1={y + ph * 0.14} x2={x + pw * 0.42} y2={y + ph * 0.03} stroke="#fff" strokeOpacity={0.85} strokeWidth={1.3 * sw} strokeLinecap="round" />
        <line x1={x + pw * 0.16} y1={y + ph * 0.26} x2={x + pw * 0.58} y2={y + ph * 0.07} stroke="#fff" strokeOpacity={0.55} strokeWidth={0.9 * sw} strokeLinecap="round" />
      </>);
    } else if (p.fill === 'lambri' || p.fill === 'veneziana') {
      const step = Math.max(compact ? 2.2 : 3, S(p.fill === 'lambri' ? 100 : 40));
      const rows: ReactElement[] = [];
      for (let yy = y + step; yy < y + ph - 0.5; yy += step) {
        rows.push(p.fill === 'lambri'
          ? <line key={yy} x1={x} y1={yy} x2={x + pw} y2={yy} stroke={finStroke} strokeWidth={0.5 * sw} />
          : <line key={yy} x1={x + 1} y1={yy - step * 0.55} x2={x + pw - 1} y2={yy} stroke={finStroke} strokeWidth={0.6 * sw} />);
      }
      push(<><rect x={x} y={y} width={pw} height={ph} fill={darken(fin, 0.96)} stroke={finStroke} strokeWidth={0.5 * sw} />{rows}</>);
    }
  };

  for (const p of panels) {
    const x = X(p.x), y = Y(p.y), pw = S(p.w), ph = S(p.h);
    if (p.sash) {
      const sf = Math.min(face * 0.85, pw / 4, ph / 4);
      push(<rect x={x} y={y} width={pw} height={ph} fill={p.layer === 0 ? darken(fin, 0.93) : fin} stroke={finStroke} strokeWidth={0.7 * sw} />);
      fillArea(x + sf, y + sf, pw - 2 * sf, ph - 2 * sf, p);
    } else {
      fillArea(x, y, pw, ph, p);
    }
  }

  // ---- structural lines -------------------------------------------------------
  for (const l of drawing.lines ?? []) {
    if (l.kind === 'track') push(<rect x={X(l.x1)} y={Y(l.y1) - Math.max(2, S(10))} width={S(l.x2 - l.x1)} height={Math.max(compact ? 2.5 : 3.5, S(20))} fill={fin} stroke={finStroke} strokeWidth={0.6 * sw} rx={1} />);
    else if (l.kind === 'rail') push(<rect x={X(l.x1)} y={Y(l.y1) - Math.max(1.6, S(20))} width={S(l.x2 - l.x1)} height={Math.max(compact ? 3 : 4, S(40))} fill={fin} stroke={finStroke} strokeWidth={0.6 * sw} rx={1.5} />);
    else if (l.kind === 'post') push(<rect x={X(l.x1) - Math.max(1.5, S(25))} y={Y(l.y1)} width={Math.max(compact ? 2.5 : 3, S(50))} height={S(l.y2 - l.y1)} fill={fin} stroke={finStroke} strokeWidth={0.6 * sw} />);
    else if (l.kind === 'mullion') push(<line x1={X(l.x1)} y1={Y(l.y1)} x2={X(l.x2)} y2={Y(l.y2)} stroke={fin === '#F4F6F8' ? '#cfd6de' : fin} strokeWidth={Math.max(compact ? 1.4 : 2.5, face * 0.8)} />);
    else if (l.kind === 'corner') push(<line x1={X(l.x1)} y1={Y(l.y1)} x2={X(l.x2)} y2={Y(l.y2)} stroke="#64748b" strokeWidth={sw} strokeDasharray="5 3" />);
  }

  // ---- motion symbols (drawn last, on top) -----------------------------------------
  const blue = '#1d5cf2';
  for (const p of panels) {
    const x = X(p.x), y = Y(p.y), pw = S(p.w), ph = S(p.h);
    const dash = compact ? '2 1.5' : '4 3';
    switch (p.motion) {
      case 'slide':
      case 'fold': {
        if (compact) break;
        const len = Math.min(34, pw * 0.42), cx = x + pw / 2, cy = y + ph * 0.62, a = Math.min(5, len * 0.2);
        push(<g stroke={blue} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
          <path d={`M${cx - len / 2} ${cy}H${cx + len / 2}`} />
          <path d={`M${cx - len / 2 + a} ${cy - a}L${cx - len / 2} ${cy}L${cx - len / 2 + a} ${cy + a}`} />
          {p.motion === 'slide' && <path d={`M${cx + len / 2 - a} ${cy - a}L${cx + len / 2} ${cy}L${cx + len / 2 - a} ${cy + a}`} />}
        </g>);
        break;
      }
      case 'hinge-left':
      case 'hinge-right': {
        const left = p.motion === 'hinge-left';
        const hx = left ? x : x + pw, ox = left ? x + pw : x;
        push(<path d={`M${ox} ${y}L${hx} ${y + ph / 2}L${ox} ${y + ph}`} fill="none" stroke={blue} strokeWidth={0.9 * sw} strokeDasharray={dash} opacity={0.75} />);
        push(<rect x={left ? x + pw - Math.max(3, pw * 0.08) : x + Math.max(1.5, pw * 0.04)} y={y + ph * 0.45} width={Math.max(1.4, 2.2 * sw)} height={ph * 0.1} rx={1} fill={finStroke} />);
        break;
      }
      case 'top-hung':
        push(<path d={`M${x} ${y + ph}L${x + pw / 2} ${y}L${x + pw} ${y + ph}`} fill="none" stroke={blue} strokeWidth={0.9 * sw} strokeDasharray={dash} opacity={0.75} />);
        break;
      case 'tilt':
        push(<g stroke={blue} strokeWidth={0.9 * sw} opacity={0.75} fill="none">
          <line x1={x} y1={y + ph / 2} x2={x + pw} y2={y + ph / 2} strokeDasharray={dash} />
          <path d={`M${x} ${y}L${x + pw / 2} ${y + ph}L${x + pw} ${y}`} strokeDasharray={dash} />
        </g>);
        break;
      case 'pivot': {
        const px = x + pw * 0.08;
        push(<>
          <rect x={px - 4} y={y} width={8} height={3.5} rx={1} fill={finStroke} />
          <rect x={px - 4} y={y + ph - 3.5} width={8} height={3.5} rx={1} fill={finStroke} />
          <rect x={x + pw - Math.max(5, pw * 0.07)} y={y + ph * 0.36} width={Math.max(1.6, 2.6 * sw)} height={ph * 0.26} rx={1.3} fill={finStroke} />
          <path d={`M${x + pw} ${y}L${px} ${y + ph / 2}L${x + pw} ${y + ph}`} fill="none" stroke={blue} strokeWidth={0.9 * sw} strokeDasharray={dash} opacity={0.7} />
        </>);
        break;
      }
      case 'fixed':
        if (p.label && !compact && pw > 34 && ph > 20) push(<text x={x + pw / 2} y={y + ph * 0.6} textAnchor="middle" fontSize={9} fontWeight={700} fill="#64748b" letterSpacing={1}>{p.label}</text>);
        break;
    }
  }

  // ---- dimensions -------------------------------------------------------------
  const wLabel = dims ? (dims.d ? `${dims.w} + ${dims.d} mm` : `${dims.w} mm`) : `${Math.round(W)} mm`;
  const hLabel = `${dims?.h ?? Math.round(H)} mm`;
  const wLabelW = Math.max(60, wLabel.length * 6.6);

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className} role="img" aria-label={`Esquema ${wLabel} × ${hLabel}`} preserveAspectRatio="xMidYMid meet">
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
      {els}
      {!compact && (
        <g fontSize={11} fontWeight={600} fill="#334155" fontFamily="Inter, system-ui, sans-serif">
          <line x1={X(0)} y1={Y(H) + 6} x2={X(0)} y2={Y(H) + 28} stroke="#cbd5e1" />
          <line x1={X(W)} y1={Y(H) + 6} x2={X(W)} y2={Y(H) + 28} stroke="#cbd5e1" />
          <line x1={X(0) + 1} y1={Y(H) + 22} x2={X(W) - 1} y2={Y(H) + 22} stroke="#64748b" markerStart={`url(#a-${uid})`} markerEnd={`url(#a-${uid})`} />
          <rect x={X(W / 2) - wLabelW / 2} y={Y(H) + 14} width={wLabelW} height={16} rx={8} fill="#fff" />
          <text x={X(W / 2)} y={Y(H) + 26} textAnchor="middle">{wLabel}</text>
          <line x1={X(W) + 6} y1={Y(0)} x2={X(W) + 40} y2={Y(0)} stroke="#cbd5e1" />
          <line x1={X(W) + 6} y1={Y(H)} x2={X(W) + 40} y2={Y(H)} stroke="#cbd5e1" />
          <line x1={X(W) + 32} y1={Y(0) + 1} x2={X(W) + 32} y2={Y(H) - 1} stroke="#64748b" markerStart={`url(#a-${uid})`} markerEnd={`url(#a-${uid})`} />
          <g transform={`translate(${X(W) + 36} ${Y(H / 2)}) rotate(-90)`}>
            <rect x={-30} y={-12} width={60} height={16} rx={8} fill="#fff" />
            <text x={0} y={0} textAnchor="middle">{hLabel}</text>
          </g>
        </g>
      )}
    </svg>
  );
}
