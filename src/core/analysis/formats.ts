import type { QState } from '../sim/state';
import type { Mat2 } from '../gates/matrices';
import { blochVector, isPure, extractPureAmplitudes, angularForm, entanglementEntropy, blochLength } from './bloch';

/** Renders an angle in radians as a readable multiple of pi when close to one (tolerance 1e-9), else decimal. */
export function formatAngle(theta: number, tol = 1e-9): string {
  if (Math.abs(theta) < tol) return '0';
  const overPi = theta / Math.PI;
  for (let den = 1; den <= 16; den++) {
    const num = overPi * den;
    if (Math.abs(num - Math.round(num)) < tol * Math.max(1, den)) {
      const r = Math.round(num);
      if (r === 0) return '0';
      const sign = r < 0 ? '-' : '';
      const ar = Math.abs(r);
      if (den === 1) return `${sign}${ar === 1 ? '' : ar}π`;
      return `${sign}${ar === 1 ? '' : ar}π/${den}`;
    }
  }
  return theta.toFixed(4);
}

export function formatComplex(re: number, im: number, digits = 2): string {
  const r = re.toFixed(digits);
  const i = Math.abs(im).toFixed(digits);
  const sign = im < 0 ? '-' : '+';
  return `${r} ${sign} ${i}i`;
}

export type EquationFormat = 'cartesian' | 'polar' | 'angular';

export interface QubitEquation {
  pure: boolean;
  text: string;
  latex: string;
}

/** |psi> = alpha|0> + beta|1> (pure) or ASCII rho matrix + MIXED annotation (entangled). Never fakes a pure-state equation for an entangled qubit. */
export function formatEquation(rho: Mat2, format: EquationFormat): QubitEquation {
  const r = blochVector(rho);
  const pure = isPure(r);

  if (!pure) {
    const len = blochLength(r).toFixed(3);
    const text = `rho = [[${rho.a.re.toFixed(2)}, ${formatComplex(rho.b.re, rho.b.im)}], [${formatComplex(rho.c.re, rho.c.im)}, ${rho.d.re.toFixed(2)}]]  MIXED (entangled)  |r|=${len}`;
    const latex = `\\rho = \\begin{pmatrix}${rho.a.re.toFixed(2)} & ${rho.b.re.toFixed(2)}${rho.b.im >= 0 ? '+' : ''}${rho.b.im.toFixed(2)}i \\\\ ${rho.c.re.toFixed(2)}${rho.c.im >= 0 ? '+' : ''}${rho.c.im.toFixed(2)}i & ${rho.d.re.toFixed(2)}\\end{pmatrix}`;
    return { pure: false, text, latex };
  }

  if (format === 'cartesian') {
    const { alpha, beta } = extractPureAmplitudes(rho);
    const text = `|ψ⟩ = ${alpha.toFixed(2)}|0⟩ + (${formatComplex(beta.re, beta.im)})|1⟩`;
    const latex = `|\\psi\\rangle = ${alpha.toFixed(2)}|0\\rangle + (${beta.re.toFixed(2)}${beta.im >= 0 ? '+' : ''}${beta.im.toFixed(2)}i)|1\\rangle`;
    return { pure: true, text, latex };
  }

  if (format === 'polar') {
    const { alpha, beta } = extractPureAmplitudes(rho);
    const p0 = alpha * alpha;
    const p1 = beta.re * beta.re + beta.im * beta.im;
    const phase = Math.atan2(beta.im, beta.re);
    const phaseStr = formatAngle(phase < 0 ? phase + 2 * Math.PI : phase);
    const text = `|ψ⟩ = √${p0.toFixed(2)} |0⟩ + √${p1.toFixed(2)} · e^{i·${phaseStr}} |1⟩`;
    const latex = `|\\psi\\rangle = \\sqrt{${p0.toFixed(2)}}|0\\rangle + \\sqrt{${p1.toFixed(2)}}e^{i${phaseStr}}|1\\rangle`;
    return { pure: true, text, latex };
  }

  // angular
  const { theta, phi } = angularForm(r);
  const thetaStr = formatAngle(theta);
  const phiStr = formatAngle(phi);
  const text = `|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩, θ=${thetaStr} φ=${phiStr}`;
  const latex = `|\\psi\\rangle = \\cos(\\theta/2)|0\\rangle + e^{i\\phi}\\sin(\\theta/2)|1\\rangle,\\ \\theta=${thetaStr},\\ \\phi=${phiStr}`;
  return { pure: true, text, latex };
}

export interface QubitDerived {
  rho: Mat2;
  bloch: { x: number; y: number; z: number };
  pure: boolean;
  entropy: number;
  p0: number;
  p1: number;
  relativePhase: number | null; // null when undefined (pole or incoherent mixture)
}

export function relativePhase(rho: Mat2): number | null {
  const r = blochVector(rho);
  const rxy = Math.hypot(r.x, r.y);
  if (rxy < 1e-6) return null;
  return Math.atan2(r.y, r.x);
}

export function qubitDerived(rho: Mat2): QubitDerived {
  const r = blochVector(rho);
  return {
    rho,
    bloch: r,
    pure: isPure(r),
    entropy: entanglementEntropy(r),
    p0: rho.a.re,
    p1: rho.d.re,
    relativePhase: relativePhase(rho),
  };
}

export interface StatevectorRow {
  index: number;
  label: string; // e.g. |010>
  probability: number;
  phase: number; // radians, in [0, 2pi)
  amplitude: { re: number; im: number };
}

/** Full basis-state distribution for the STATEVECTOR panel, little-endian (q0 = least significant). */
export function statevectorRows(s: QState): StatevectorRow[] {
  const rows: StatevectorRow[] = [];
  for (let i = 0; i < s.re.length; i++) {
    const re = s.re[i], im = s.im[i];
    const prob = re * re + im * im;
    if (prob < 1e-12) continue;
    let bits = '';
    for (let q = s.n - 1; q >= 0; q--) bits += (i >> q) & 1;
    let phase = Math.atan2(im, re);
    if (phase < 0) phase += 2 * Math.PI;
    rows.push({ index: i, label: `|${bits}⟩`, probability: prob, phase, amplitude: { re, im } });
  }
  return rows.sort((a, b) => b.probability - a.probability);
}
