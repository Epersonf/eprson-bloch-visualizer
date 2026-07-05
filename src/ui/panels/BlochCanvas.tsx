import { useEffect, useRef } from 'react';

export interface Vec3 { x: number; y: number; z: number; }

interface Props {
  bloch: Vec3;
  entropy: number; // 0..1
  color: string;
  size?: number;
}

const TILT = (25 * Math.PI) / 180;

function project(p: Vec3, cx: number, cy: number, R: number) {
  // rotate the view around the horizontal (x) axis so |0> (z=+1) tilts toward the top of the screen
  const yr = p.y * Math.cos(TILT) + p.z * Math.sin(TILT);
  return { x: cx + R * p.x, y: cy - R * yr };
}

function len(v: Vec3) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }

function slerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  const la = len(a), lb = len(b);
  const na = la > 1e-9 ? { x: a.x / la, y: a.y / la, z: a.z / la } : { x: 0, y: 0, z: 1 };
  const nb = lb > 1e-9 ? { x: b.x / lb, y: b.y / lb, z: b.z / lb } : { x: 0, y: 0, z: 1 };
  let dot = na.x * nb.x + na.y * nb.y + na.z * nb.z;
  dot = Math.max(-1, Math.min(1, dot));
  const theta = Math.acos(dot);
  let dir: Vec3;
  if (theta < 1e-6) {
    dir = na;
  } else {
    const s0 = Math.sin((1 - t) * theta) / Math.sin(theta);
    const s1 = Math.sin(t * theta) / Math.sin(theta);
    dir = { x: na.x * s0 + nb.x * s1, y: na.y * s0 + nb.y * s1, z: na.z * s0 + nb.z * s1 };
  }
  const l = la + (lb - la) * t;
  return { x: dir.x * l, y: dir.y * l, z: dir.z * l };
}

function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function drawSphere(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  const border = '#2e2e2e';
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;

  // outline
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // equator ellipse (z = 0 ring), squashed by tilt
  const squish = Math.cos(TILT);
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, R * squish, 0, 0, Math.PI * 2);
  ctx.stroke();

  // meridian (x = 0 great circle) — appears as a tilted ellipse too, thin
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, R * Math.sin(TILT), R, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // axes
  ctx.strokeStyle = border;
  ctx.setLineDash([2, 2]);
  const zTop = project({ x: 0, y: 0, z: 1 }, cx, cy, R);
  const zBot = project({ x: 0, y: 0, z: -1 }, cx, cy, R);
  ctx.beginPath(); ctx.moveTo(zBot.x, zBot.y); ctx.lineTo(zTop.x, zTop.y); ctx.stroke();
  const xPos = project({ x: 1, y: 0, z: 0 }, cx, cy, R);
  const xNeg = project({ x: -1, y: 0, z: 0 }, cx, cy, R);
  ctx.beginPath(); ctx.moveTo(xNeg.x, xNeg.y); ctx.lineTo(xPos.x, xPos.y); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#9a9a9a';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('|0⟩', zTop.x, zTop.y - 6);
  ctx.fillText('|1⟩', zBot.x, zBot.y + 12);
  ctx.fillText('|+⟩', xPos.x + 10, xPos.y + 4);
  ctx.fillText('|−⟩', xNeg.x - 10, xNeg.y + 4);
}

function drawVector(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, v: Vec3, color: string, alpha = 1, width = 2) {
  const p = project(v, cx, cy, R);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawEntropyRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, entropy: number, color: string) {
  if (entropy <= 0.001) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 6, -Math.PI / 2, -Math.PI / 2 + entropy * Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function BlochCanvas({ bloch, entropy, color, size = 150 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const stateRef = useRef<{ from: Vec3; to: Vec3; start: number; displayed: Vec3 }>({
    from: bloch, to: bloch, start: 0, displayed: bloch,
  });

  useEffect(() => {
    const prevDisplayed = stateRef.current.displayed;
    stateRef.current = { from: prevDisplayed, to: bloch, start: performance.now(), displayed: prevDisplayed };
    if (animRef.current == null) animRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloch.x, bloch.y, bloch.z]);

  useEffect(() => {
    // only a static redraw (entropy ring / vector color) — never touches the animation frame
    draw(stateRef.current.displayed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entropy, color]);

  useEffect(() => {
    // unmount-only: stop any in-flight animation so it doesn't tick after the canvas is gone.
    // Resetting the ref to null (not just cancelling) matters because StrictMode's dev-mode
    // mount->cleanup->mount dance runs this cleanup once even on a real mount; leaving a stale
    // non-null id behind would permanently block the "is anything already animating?" guard above.
    return () => {
      if (animRef.current != null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    };
  }, []);

  function draw(vec: Vec3) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = size / 2, cy = size / 2, R = size * 0.34;
    ctx.clearRect(0, 0, size, size);
    drawSphere(ctx, cx, cy, R);
    drawEntropyRing(ctx, cx, cy, R, entropy, 'var(--acc-ent)' === color ? '#4db8ff' : color);
    drawVector(ctx, cx, cy, R, vec, color);
  }

  function tick(now: number) {
    const st = stateRef.current;
    if (reducedMotion()) {
      st.displayed = st.to;
      draw(st.to);
      animRef.current = null;
      return;
    }
    const elapsed = now - st.start;
    const tMove = Math.min(1, elapsed / 250);
    const interp = slerpVec(st.from, st.to, easeInOut(tMove));
    st.displayed = interp;
    draw(interp);
    if (elapsed < 250) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      st.displayed = st.to;
      animRef.current = null;
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, flexShrink: 0, alignSelf: 'center' }}
    />
  );
}
