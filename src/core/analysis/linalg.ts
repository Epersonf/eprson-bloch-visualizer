import { c, cAdd, cMul, type Complex } from '../gates/matrices';
import type { ComplexMat } from './density';

export function zeros(n: number, m = n): ComplexMat {
  return Array.from({ length: n }, () => Array.from({ length: m }, () => c(0)));
}

export function identity(n: number): ComplexMat {
  const m = zeros(n);
  for (let i = 0; i < n; i++) m[i][i] = c(1);
  return m;
}

export function matmul(a: ComplexMat, b: ComplexMat): ComplexMat {
  const n = a.length, k = b.length, m = b[0].length;
  const out = zeros(n, m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let sum = c(0);
      for (let t = 0; t < k; t++) sum = cAdd(sum, cMul(a[i][t], b[t][j]));
      out[i][j] = sum;
    }
  }
  return out;
}

export function scaleAdd(a: ComplexMat, lambda: Complex, n: number): ComplexMat {
  const out = a.map((row) => row.map((x) => ({ ...x })));
  for (let i = 0; i < n; i++) out[i][i] = cAdd(out[i][i], lambda);
  return out;
}

export function trace(a: ComplexMat): Complex {
  let sum = c(0);
  for (let i = 0; i < a.length; i++) sum = cAdd(sum, a[i][i]);
  return sum;
}

export function conjElementwise(a: ComplexMat): ComplexMat {
  return a.map((row) => row.map((x) => c(x.re, -x.im)));
}

export function kron(a: ComplexMat, b: ComplexMat): ComplexMat {
  const n1 = a.length, m1 = a[0].length, n2 = b.length, m2 = b[0].length;
  const out = zeros(n1 * n2, m1 * m2);
  for (let i = 0; i < n1; i++)
    for (let j = 0; j < m1; j++)
      for (let p = 0; p < n2; p++)
        for (let q = 0; q < m2; q++)
          out[i * n2 + p][j * m2 + q] = cMul(a[i][j], b[p][q]);
  return out;
}

/** Faddeev-LeVerrier: characteristic polynomial coefficients c1..cn of
 *  det(lambda*I - A) = lambda^n + c1*lambda^(n-1) + ... + cn. */
export function characteristicPolynomial(A: ComplexMat): Complex[] {
  const n = A.length;
  let M = identity(n);
  const coeffs: Complex[] = [];
  let cPrev = c(1);
  for (let k = 1; k <= n; k++) {
    const AM = matmul(A, M);
    const tr = trace(AM);
    const ck = c(-tr.re / k, -tr.im / k);
    coeffs.push(ck);
    M = scaleAdd(AM, ck, n);
    cPrev = ck;
  }
  void cPrev;
  return coeffs; // [c1, c2, ..., cn]
}

/** Durand-Kerner iterative root finder for a monic polynomial
 *  z^n + c1 z^(n-1) + ... + cn = 0, given [c1..cn]. Returns n complex roots. */
export function polyRoots(coeffs: Complex[], iterations = 200): Complex[] {
  const n = coeffs.length;
  // initial guesses spread on a circle, slightly off real axis to avoid symmetry stalls
  let roots: Complex[] = Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n + 0.5;
    return c(0.4 * Math.cos(angle) + 0.9, 0.4 * Math.sin(angle));
  });

  const evalPoly = (z: Complex): Complex => {
    // Horner's method: z^n + c1 z^(n-1) + ... + cn
    let result = c(1);
    for (let i = 0; i < n; i++) {
      result = cAdd(cMul(result, z), coeffs[i]);
    }
    return result;
  };

  for (let iter = 0; iter < iterations; iter++) {
    let maxDelta = 0;
    const next = roots.slice();
    for (let i = 0; i < n; i++) {
      const fz = evalPoly(roots[i]);
      let denom = c(1);
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        denom = cMul(denom, c(roots[i].re - roots[j].re, roots[i].im - roots[j].im));
      }
      const denomAbs2 = denom.re * denom.re + denom.im * denom.im;
      if (denomAbs2 < 1e-300) continue;
      // delta = fz / denom
      const delta = c(
        (fz.re * denom.re + fz.im * denom.im) / denomAbs2,
        (fz.im * denom.re - fz.re * denom.im) / denomAbs2,
      );
      next[i] = c(roots[i].re - delta.re, roots[i].im - delta.im);
      maxDelta = Math.max(maxDelta, Math.hypot(delta.re, delta.im));
    }
    roots = next;
    if (maxDelta < 1e-14) break;
  }
  return roots;
}
