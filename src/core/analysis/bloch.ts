import type { Mat2 } from '../gates/matrices';

export interface BlochVector { x: number; y: number; z: number; }

const EPS = 1e-6;

/** r(rho) = (x,y,z), x = 2 Re(rho01), y = -2 Im(rho01) (= Tr(rho Y)), z = rho00 - rho11. */
export function blochVector(rho: Mat2): BlochVector {
  return {
    x: 2 * rho.b.re,
    y: -2 * rho.b.im,
    z: rho.a.re - rho.d.re,
  };
}

export function blochLength(r: BlochVector): number {
  return Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
}

/** Purity P(rho) = Tr(rho^2) = (1+|r|^2)/2. */
export function purity(r: BlochVector): number {
  const r2 = r.x * r.x + r.y * r.y + r.z * r.z;
  return (1 + r2) / 2;
}

export function isPure(r: BlochVector, eps = EPS): boolean {
  return blochLength(r) > 1 - eps;
}

function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/** Single-qubit entanglement entropy S(rho_k) = h((1+|r|)/2). 0 = pure/unentangled, 1 = maximally entangled with the rest. */
export function entanglementEntropy(r: BlochVector): number {
  const len = Math.min(1, blochLength(r));
  return binaryEntropy((1 + len) / 2);
}

export interface PureAmplitudes { alpha: number; beta: { re: number; im: number }; }

/** Extracts |psi> = alpha|0> + beta|1> from a pure single-qubit density matrix, normalizing global phase so alpha real >= 0. */
export function extractPureAmplitudes(rho: Mat2): PureAmplitudes {
  const alpha = Math.sqrt(Math.max(0, rho.a.re));
  if (alpha < 1e-9) {
    // |psi> = e^{i*phase}|1>; global phase convention forces alpha real, so beta absorbs everything real-positive here too
    return { alpha: 0, beta: { re: Math.sqrt(Math.max(0, rho.d.re)), im: 0 } };
  }
  // rho01 = alpha * conj(beta)  =>  beta = conj(rho01 / alpha)
  const betaRe = rho.b.re / alpha;
  const betaIm = -rho.b.im / alpha;
  return { alpha, beta: { re: betaRe, im: betaIm } };
}

export interface AngularForm { theta: number; phi: number; }

/** theta = arccos(z), phi = atan2(y,x) — spherical angles of the Bloch vector. */
export function angularForm(r: BlochVector): AngularForm {
  const len = blochLength(r) || 1;
  const theta = Math.acos(Math.max(-1, Math.min(1, r.z / len)));
  const phi = Math.atan2(r.y, r.x);
  return { theta, phi: phi < 0 ? phi + 2 * Math.PI : phi };
}
