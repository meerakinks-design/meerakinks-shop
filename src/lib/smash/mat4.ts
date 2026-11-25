import { multiply } from './glb';

// Matrices 4×4 « colonnes » (comme WebGL et glTF) : juste ce dont le rendu des pots a besoin. PUR, testé sous Node.

export type Mat4 = Float32Array;

export const identity = (): Mat4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export function translation(x: number, y: number, z: number): Mat4 {
  const out = identity();
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}

export function scaling(x: number, y: number, z: number): Mat4 {
  const out = identity();
  out[0] = x;
  out[5] = y;
  out[10] = z;
  return out;
}

export function rotationX(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out = identity();
  out[5] = c;
  out[6] = s;
  out[9] = -s;
  out[10] = c;
  return out;
}

export function rotationY(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out = identity();
  out[0] = c;
  out[2] = -s;
  out[8] = s;
  out[10] = c;
  return out;
}

export function rotationZ(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out = identity();
  out[0] = c;
  out[1] = s;
  out[4] = -s;
  out[5] = c;
  return out;
}

/** Produit de plusieurs matrices, de gauche à droite : `chain(A, B, C)` applique C, puis B, puis A. */
export function chain(...matrices: Mat4[]): Mat4 {
  return matrices.reduce((accumulated, matrix) => multiply(accumulated, matrix));
}

/**
 * Projection orthographique qui fait coïncider le monde avec les pixels du canvas : X vers la droite, Y vers le HAUT
 * (le haut de l'écran est donc Y = 0 et le bas Y = −hauteur), Z vers l'observateur. Un point (x, −y) du monde tombe sur
 * le pixel (x, y) du canvas 2D.
 */
export function pixelProjection(width: number, height: number, depth: number): Mat4 {
  const out = new Float32Array(16);
  out[0] = 2 / width;
  out[5] = 2 / height;
  out[10] = -1 / depth;
  out[12] = -1;
  out[13] = 1;
  out[15] = 1;
  return out;
}

/** Partie rotation d'une matrice (pour les normales ; valable car les échelles sont uniformes). */
export function rotationPart(matrix: ArrayLike<number>): Float32Array {
  const out = new Float32Array(9);
  const scaleX = Math.hypot(matrix[0] as number, matrix[1] as number, matrix[2] as number) || 1;
  const scaleY = Math.hypot(matrix[4] as number, matrix[5] as number, matrix[6] as number) || 1;
  const scaleZ = Math.hypot(matrix[8] as number, matrix[9] as number, matrix[10] as number) || 1;
  out[0] = (matrix[0] as number) / scaleX;
  out[1] = (matrix[1] as number) / scaleX;
  out[2] = (matrix[2] as number) / scaleX;
  out[3] = (matrix[4] as number) / scaleY;
  out[4] = (matrix[5] as number) / scaleY;
  out[5] = (matrix[6] as number) / scaleY;
  out[6] = (matrix[8] as number) / scaleZ;
  out[7] = (matrix[9] as number) / scaleZ;
  out[8] = (matrix[10] as number) / scaleZ;
  return out;
}
