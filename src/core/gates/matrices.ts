export interface Complex {
  re: number;
  im: number;
}

export interface Mat2 {
  a: Complex;
  b: Complex;
  c: Complex;
  d: Complex;
}

export const c = (re: number, im = 0): Complex => ({ re, im });

export const cAdd = (x: Complex, y: Complex): Complex => c(x.re + y.re, x.im + y.im);
export const cMul = (x: Complex, y: Complex): Complex =>
  c(x.re * y.re - x.im * y.im, x.re * y.im + x.im * y.re);
export const cConj = (x: Complex): Complex => c(x.re, -x.im);
export const cAbs2 = (x: Complex): number => x.re * x.re + x.im * x.im;
export const cExp = (theta: number): Complex => c(Math.cos(theta), Math.sin(theta));

export const I2: Mat2 = { a: c(1), b: c(0), c: c(0), d: c(1) };

export const H_MAT: Mat2 = {
  a: c(Math.SQRT1_2),
  b: c(Math.SQRT1_2),
  c: c(Math.SQRT1_2),
  d: c(-Math.SQRT1_2),
};

export const X_MAT: Mat2 = { a: c(0), b: c(1), c: c(1), d: c(0) };
export const Y_MAT: Mat2 = { a: c(0), b: c(0, -1), c: c(0, 1), d: c(0) };
export const Z_MAT: Mat2 = { a: c(1), b: c(0), c: c(0), d: c(-1) };
export const S_MAT: Mat2 = { a: c(1), b: c(0), c: c(0), d: c(0, 1) };
export const SDG_MAT: Mat2 = { a: c(1), b: c(0), c: c(0), d: c(0, -1) };
export const T_MAT: Mat2 = { a: c(1), b: c(0), c: c(0), d: cExp(Math.PI / 4) };
export const TDG_MAT: Mat2 = { a: c(1), b: c(0), c: c(0), d: cExp(-Math.PI / 4) };

export function RX_MAT(theta: number): Mat2 {
  const cs = Math.cos(theta / 2);
  const sn = Math.sin(theta / 2);
  return { a: c(cs), b: c(0, -sn), c: c(0, -sn), d: c(cs) };
}

export function RY_MAT(theta: number): Mat2 {
  const cs = Math.cos(theta / 2);
  const sn = Math.sin(theta / 2);
  return { a: c(cs), b: c(-sn), c: c(sn), d: c(cs) };
}

export function RZ_MAT(theta: number): Mat2 {
  return { a: cExp(-theta / 2), b: c(0), c: c(0), d: cExp(theta / 2) };
}

export function P_MAT(lambda: number): Mat2 {
  return { a: c(1), b: c(0), c: c(0), d: cExp(lambda) };
}

export function U_MAT(theta: number, phi: number, lambda: number): Mat2 {
  const cs = Math.cos(theta / 2);
  const sn = Math.sin(theta / 2);
  return {
    a: c(cs),
    b: cMul(cExp(lambda), c(-sn)),
    c: cMul(cExp(phi), c(sn)),
    d: cMul(cExp(phi + lambda), c(cs)),
  };
}
