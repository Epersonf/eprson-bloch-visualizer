import { useEffect, useRef, useState } from 'react';

export interface Vec3 { x: number; y: number; z: number; }

interface Props {
  bloch: Vec3;
  entropy: number; // 0..1
  color: string;
  size?: number;
}

const DEFAULT_ROT_X = (25 * Math.PI) / 180;
const DEFAULT_ROT_Z = 0;
const MAX_ROT_X = (85 * Math.PI) / 180;
const DRAG_SENSITIVITY = 0.008; // radians per pixel dragged
const TWO_PI = Math.PI * 2;

/** Rotates a point by rotZ (spin around the vertical |0>/|1> axis) then rotX (camera tilt). */
function rotate(p: Vec3, rotX: number, rotZ: number): Vec3 {
  const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
  const x1 = p.x * cz - p.y * sz;
  const y1 = p.x * sz + p.y * cz;
  const z1 = p.z;

  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  const y2 = y1 * cx + z1 * sx;
  const z2 = -y1 * sx + z1 * cx; // depth after rotation: positive = toward the viewer

  return { x: x1, y: y2, z: z2 };
}

function project(rotated: Vec3, cx: number, cy: number, R: number) {
  return { x: cx + R * rotated.x, y: cy - R * rotated.y };
}

function circlePoints(plane: 'z' | 'x', segments = 64): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TWO_PI;
    pts.push(plane === 'z' ? { x: Math.cos(a), y: Math.sin(a), z: 0 } : { x: 0, y: Math.cos(a), z: Math.sin(a) });
  }
  return pts;
}
const EQUATOR = circlePoints('z');
const MERIDIAN = circlePoints('x');

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

/** Draws a great-circle outline as a polyline, dimming the half that's rotated behind the sphere. */
function drawCircle3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, pts: Vec3[], rotX: number, rotZ: number, color: string) {
  const rotated = pts.map((p) => rotate(p, rotX, rotZ));
  ctx.lineWidth = 1;
  for (let i = 0; i < rotated.length - 1; i++) {
    const a = rotated[i], b = rotated[i + 1];
    const avgZ = (a.z + b.z) / 2;
    ctx.strokeStyle = color;
    ctx.globalAlpha = avgZ >= 0 ? 0.9 : 0.25; // front hemisphere solid, back hemisphere faint
    const pa = project(a, cx, cy, R), pb = project(b, cx, cy, R);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSphere(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, rotX: number, rotZ: number) {
  const border = '#2e2e2e';

  // outline — an orthographic projection of a sphere is always a circle, regardless of rotation
  ctx.strokeStyle = border;
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TWO_PI);
  ctx.stroke();

  drawCircle3D(ctx, cx, cy, R, EQUATOR, rotX, rotZ, border);
  drawCircle3D(ctx, cx, cy, R, MERIDIAN, rotX, rotZ, border);

  // axes
  ctx.strokeStyle = border;
  ctx.setLineDash([2, 2]);
  const zTop = project(rotate({ x: 0, y: 0, z: 1 }, rotX, rotZ), cx, cy, R);
  const zBot = project(rotate({ x: 0, y: 0, z: -1 }, rotX, rotZ), cx, cy, R);
  ctx.beginPath(); ctx.moveTo(zBot.x, zBot.y); ctx.lineTo(zTop.x, zTop.y); ctx.stroke();
  const xPos = project(rotate({ x: 1, y: 0, z: 0 }, rotX, rotZ), cx, cy, R);
  const xNeg = project(rotate({ x: -1, y: 0, z: 0 }, rotX, rotZ), cx, cy, R);
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

function drawVector(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, v: Vec3, color: string, rotX: number, rotZ: number, width = 2) {
  const rotated = rotate(v, rotX, rotZ);
  const p = project(rotated, cx, cy, R);
  ctx.globalAlpha = rotated.z >= 0 ? 1 : 0.45; // dim it when it points to the far side of the sphere
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3, 0, TWO_PI);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawEntropyRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, entropy: number, color: string) {
  if (entropy <= 0.001) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 6, -Math.PI / 2, -Math.PI / 2 + entropy * TWO_PI);
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
  // mutable view rotation — kept out of React state so dragging redraws imperatively
  // instead of re-rendering the component on every pointermove
  const rotRef = useRef({ x: DEFAULT_ROT_X, z: DEFAULT_ROT_Z });
  const dragRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

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
    const { x: rotX, z: rotZ } = rotRef.current;
    ctx.clearRect(0, 0, size, size);
    drawSphere(ctx, cx, cy, R, rotX, rotZ);
    drawEntropyRing(ctx, cx, cy, R, entropy, 'var(--acc-ent)' === color ? '#4db8ff' : color);
    drawVector(ctx, cx, cy, R, vec, color, rotX, rotZ);
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

  function resetRotation() {
    rotRef.current = { x: DEFAULT_ROT_X, z: DEFAULT_ROT_Z };
    draw(stateRef.current.displayed);
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragRef.current = { lastX: e.clientX, lastY: e.clientY };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    const rot = rotRef.current;
    rot.z = (rot.z + dx * DRAG_SENSITIVITY) % TWO_PI;
    rot.x = Math.max(-MAX_ROT_X, Math.min(MAX_ROT_X, rot.x + dy * DRAG_SENSITIVITY));
    draw(stateRef.current.displayed);
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, alignSelf: 'center' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={resetRotation}
        title="drag to rotate — double-click to reset"
        style={{ display: 'block', width: size, height: size, touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
      />
      <button
        onClick={resetRotation}
        title="Reset rotation"
        style={{
          position: 'absolute', top: 2, right: 2, width: 18, height: 18, lineHeight: '16px',
          padding: 0, fontSize: 11, background: 'var(--bg-1)', color: 'var(--fg-1)',
          border: '1px solid var(--border)',
        }}
      >
        ⟲
      </button>
    </div>
  );
}
