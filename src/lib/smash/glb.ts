// Lecteur de fichiers GLB (glTF binaire 2.0) pour les pots 3D du mini-jeu. PUR : aucune API du navigateur, il se teste
// sous Node. Il ne gère que ce dont les pots ont besoin : maillages triangulés, normales (calculées si absentes),
// coordonnées de texture, matériau PBR de base (couleur, texture de couleur), hiérarchie de nœuds avec transformations.
// Pas d'animation, pas de « sparse », pas de compression : un fichier qui en dépend est refusé avec une erreur claire,
// et le jeu retombe sur les pots dessinés en 2D.

export type Vec3 = readonly [number, number, number];

export interface GlbPrimitive {
  positions: Float32Array;
  /** Normales du fichier, ou calculées (lissées) si le fichier n'en a pas. */
  normals: Float32Array;
  uvs: Float32Array | null;
  indices: Uint16Array | Uint32Array;
  /** Indice dans `GlbModel.materials`, ou -1 (matériau par défaut). */
  material: number;
}

export interface GlbMaterial {
  name: string;
  baseColor: readonly [number, number, number, number];
  metallic: number;
  roughness: number;
  /** Indice dans `GlbModel.images`, ou null. */
  baseColorImage: number | null;
  doubleSided: boolean;
}

export interface GlbNode {
  name: string;
  primitives: GlbPrimitive[];
  /** Matrice 4×4 « monde » du nœud (colonnes, comme glTF). */
  matrix: Float32Array;
}

export interface GlbImage {
  mimeType: string;
  bytes: Uint8Array;
}

export interface GlbModel {
  nodes: GlbNode[];
  materials: GlbMaterial[];
  images: GlbImage[];
  /** Boîte englobante de TOUS les nœuds, transformations appliquées. */
  bounds: { min: Vec3; max: Vec3 };
}

const MAGIC = 0x46546c67; // « glTF »
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

const COMPONENT_BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_COUNT: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

interface Json {
  accessors?: { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string; normalized?: boolean; sparse?: unknown; min?: number[]; max?: number[] }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
  meshes?: { name?: string; primitives: { attributes: Record<string, number>; indices?: number; material?: number; mode?: number }[] }[];
  materials?: { name?: string; doubleSided?: boolean; pbrMetallicRoughness?: { baseColorFactor?: number[]; baseColorTexture?: { index: number }; metallicFactor?: number; roughnessFactor?: number } }[];
  textures?: { source?: number }[];
  images?: { bufferView?: number; mimeType?: string; uri?: string }[];
  nodes?: { name?: string; mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
  animations?: unknown[];
  extensionsRequired?: string[];
}

export class GlbError extends Error {}

// --- Matrices 4×4 (colonnes) -----------------------------------------------------------------------------------

export const identity = (): Float32Array => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export function multiply(a: ArrayLike<number>, b: ArrayLike<number>): Float32Array {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += (a[k * 4 + row] as number) * (b[column * 4 + k] as number);
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

function fromTrs(translation: number[] = [0, 0, 0], rotation: number[] = [0, 0, 0, 1], scale: number[] = [1, 1, 1]): Float32Array {
  const [x = 0, y = 0, z = 0, w = 1] = rotation;
  const [sx = 1, sy = 1, sz = 1] = scale;
  const out = identity();
  out[0] = (1 - 2 * (y * y + z * z)) * sx;
  out[1] = 2 * (x * y + z * w) * sx;
  out[2] = 2 * (x * z - y * w) * sx;
  out[4] = 2 * (x * y - z * w) * sy;
  out[5] = (1 - 2 * (x * x + z * z)) * sy;
  out[6] = 2 * (y * z + x * w) * sy;
  out[8] = 2 * (x * z + y * w) * sz;
  out[9] = 2 * (y * z - x * w) * sz;
  out[10] = (1 - 2 * (x * x + y * y)) * sz;
  out[12] = translation[0] ?? 0;
  out[13] = translation[1] ?? 0;
  out[14] = translation[2] ?? 0;
  return out;
}

export function transformPoint(matrix: ArrayLike<number>, x: number, y: number, z: number): [number, number, number] {
  const m = matrix;
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z + (m[12] as number),
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z + (m[13] as number),
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z + (m[14] as number),
  ];
}

// --- Lecture ------------------------------------------------------------------------------------------------

function readChunks(buffer: ArrayBuffer): { json: Json; bin: Uint8Array } {
  if (buffer.byteLength < 20) throw new GlbError('Fichier GLB trop court.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw new GlbError('Ce fichier n’est pas un GLB.');
  if (view.getUint32(4, true) !== 2) throw new GlbError('Seule la version 2 de glTF est lue.');
  const total = Math.min(view.getUint32(8, true), buffer.byteLength);
  let json: Json | null = null;
  let bin: Uint8Array | null = null;
  let offset = 12;
  while (offset + 8 <= total) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + length > buffer.byteLength) throw new GlbError('GLB tronqué.');
    if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, length))) as Json;
    else if (type === CHUNK_BIN && !bin) bin = new Uint8Array(buffer, start, length);
    offset = start + length + ((4 - (length % 4)) % 4);
  }
  if (!json) throw new GlbError('GLB sans description JSON.');
  return { json, bin: bin ?? new Uint8Array(0) };
}

function readAccessor(json: Json, bin: Uint8Array, index: number): { data: Float32Array | Uint16Array | Uint32Array; components: number } {
  const accessor = json.accessors?.[index];
  if (!accessor) throw new GlbError(`Accesseur ${index} introuvable.`);
  if (accessor.sparse) throw new GlbError('Les accesseurs « sparse » ne sont pas pris en charge.');
  const components = TYPE_COUNT[accessor.type];
  const componentBytes = COMPONENT_BYTES[accessor.componentType];
  if (!components || !componentBytes) throw new GlbError('Type d’accesseur non pris en charge.');
  const total = accessor.count * components;
  const isIndex = accessor.type === 'SCALAR' && (accessor.componentType === 5121 || accessor.componentType === 5123 || accessor.componentType === 5125);
  const out = accessor.componentType === 5125 ? new Uint32Array(total) : isIndex ? new Uint16Array(total) : new Float32Array(total);
  if (accessor.bufferView === undefined) return { data: out, components };

  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (!bufferView) throw new GlbError('Vue de tampon introuvable.');
  const base = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = bufferView.byteStride && bufferView.byteStride > 0 ? bufferView.byteStride : components * componentBytes;
  if (base + (accessor.count - 1) * stride + components * componentBytes > bin.byteLength) throw new GlbError('Accesseur hors du tampon.');
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const normalized = accessor.normalized === true;

  for (let item = 0; item < accessor.count; item += 1) {
    for (let component = 0; component < components; component += 1) {
      const at = base + item * stride + component * componentBytes;
      let value: number;
      switch (accessor.componentType) {
        case 5126: value = view.getFloat32(at, true); break;
        case 5125: value = view.getUint32(at, true); break;
        case 5123: value = view.getUint16(at, true); if (normalized) value /= 65535; break;
        case 5122: value = view.getInt16(at, true); if (normalized) value = Math.max(value / 32767, -1); break;
        case 5121: value = view.getUint8(at); if (normalized) value /= 255; break;
        default: value = view.getInt8(at); if (normalized) value = Math.max(value / 127, -1);
      }
      out[item * components + component] = value;
    }
  }
  return { data: out, components };
}

/** Normales lissées : chaque sommet reçoit la moyenne des normales (pondérées par l'aire) des triangles qui le touchent. */
export function computeNormals(positions: Float32Array, indices: ArrayLike<number>): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let triangle = 0; triangle + 2 < indices.length; triangle += 3) {
    const a = (indices[triangle] as number) * 3;
    const b = (indices[triangle + 1] as number) * 3;
    const c = (indices[triangle + 2] as number) * 3;
    const ux = (positions[b] as number) - (positions[a] as number);
    const uy = (positions[b + 1] as number) - (positions[a + 1] as number);
    const uz = (positions[b + 2] as number) - (positions[a + 2] as number);
    const vx = (positions[c] as number) - (positions[a] as number);
    const vy = (positions[c + 1] as number) - (positions[a + 1] as number);
    const vz = (positions[c + 2] as number) - (positions[a + 2] as number);
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const vertex of [a, b, c]) {
      normals[vertex] = (normals[vertex] as number) + nx;
      normals[vertex + 1] = (normals[vertex + 1] as number) + ny;
      normals[vertex + 2] = (normals[vertex + 2] as number) + nz;
    }
  }
  for (let vertex = 0; vertex < normals.length; vertex += 3) {
    const x = normals[vertex] as number;
    const y = normals[vertex + 1] as number;
    const z = normals[vertex + 2] as number;
    const length = Math.hypot(x, y, z) || 1;
    normals[vertex] = x / length;
    normals[vertex + 1] = y / length;
    normals[vertex + 2] = z / length;
  }
  return normals;
}

export function parseGlb(buffer: ArrayBuffer): GlbModel {
  const { json, bin } = readChunks(buffer);
  if (json.extensionsRequired && json.extensionsRequired.length > 0) {
    throw new GlbError(`Extension glTF requise non prise en charge : ${json.extensionsRequired.join(', ')}.`);
  }

  const images: GlbImage[] = (json.images ?? []).map((image) => {
    if (image.bufferView === undefined) throw new GlbError('Image externe non prise en charge (GLB autonome attendu).');
    const view = json.bufferViews?.[image.bufferView];
    if (!view) throw new GlbError('Image sans vue de tampon.');
    const start = view.byteOffset ?? 0;
    return { mimeType: image.mimeType ?? 'image/png', bytes: bin.slice(start, start + view.byteLength) };
  });

  const materials: GlbMaterial[] = (json.materials ?? []).map((material, index) => {
    const pbr = material.pbrMetallicRoughness ?? {};
    const factor = pbr.baseColorFactor ?? [1, 1, 1, 1];
    const texture = pbr.baseColorTexture ? json.textures?.[pbr.baseColorTexture.index]?.source : undefined;
    return {
      name: material.name ?? `matériau ${index}`,
      baseColor: [factor[0] ?? 1, factor[1] ?? 1, factor[2] ?? 1, factor[3] ?? 1],
      metallic: pbr.metallicFactor ?? 1,
      roughness: pbr.roughnessFactor ?? 1,
      baseColorImage: texture === undefined ? null : texture,
      doubleSided: material.doubleSided === true,
    };
  });

  const nodeJson = json.nodes ?? [];
  const sceneRoots = json.scenes?.[json.scene ?? 0]?.nodes ?? nodeJson.map((_, index) => index);
  const nodes: GlbNode[] = [];

  const visit = (index: number, parent: Float32Array, depth: number) => {
    const node = nodeJson[index];
    if (!node || depth > 32) return;
    const local = node.matrix && node.matrix.length === 16 ? Float32Array.from(node.matrix) : fromTrs(node.translation, node.rotation, node.scale);
    const world = multiply(parent, local);
    if (node.mesh !== undefined) {
      const mesh = json.meshes?.[node.mesh];
      if (!mesh) throw new GlbError('Maillage introuvable.');
      const primitives: GlbPrimitive[] = [];
      for (const primitive of mesh.primitives) {
        if (primitive.mode !== undefined && primitive.mode !== 4) throw new GlbError('Seuls les triangles sont pris en charge.');
        const positionIndex = primitive.attributes.POSITION;
        if (positionIndex === undefined) throw new GlbError('Maillage sans positions.');
        const positions = readAccessor(json, bin, positionIndex).data as Float32Array;
        const vertexCount = positions.length / 3;
        let indices: Uint16Array | Uint32Array;
        if (primitive.indices !== undefined) {
          indices = readAccessor(json, bin, primitive.indices).data as Uint16Array | Uint32Array;
        } else {
          indices = vertexCount > 65535 ? new Uint32Array(vertexCount) : new Uint16Array(vertexCount);
          for (let i = 0; i < vertexCount; i += 1) indices[i] = i;
        }
        const normalIndex = primitive.attributes.NORMAL;
        const uvIndex = primitive.attributes.TEXCOORD_0;
        primitives.push({
          positions,
          normals: normalIndex === undefined ? computeNormals(positions, indices) : (readAccessor(json, bin, normalIndex).data as Float32Array),
          uvs: uvIndex === undefined ? null : (readAccessor(json, bin, uvIndex).data as Float32Array),
          indices,
          material: primitive.material ?? -1,
        });
      }
      nodes.push({ name: node.name ?? mesh.name ?? `nœud ${index}`, primitives, matrix: world });
    }
    for (const child of node.children ?? []) visit(child, world, depth + 1);
  };
  for (const root of sceneRoots) visit(root, identity(), 0);
  if (nodes.length === 0) throw new GlbError('GLB sans maillage.');

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const node of nodes) {
    for (const primitive of node.primitives) {
      for (let vertex = 0; vertex < primitive.positions.length; vertex += 3) {
        const [x, y, z] = transformPoint(node.matrix, primitive.positions[vertex] as number, primitive.positions[vertex + 1] as number, primitive.positions[vertex + 2] as number);
        if (x < min[0]) min[0] = x;
        if (y < min[1]) min[1] = y;
        if (z < min[2]) min[2] = z;
        if (x > max[0]) max[0] = x;
        if (y > max[1]) max[1] = y;
        if (z > max[2]) max[2] = z;
      }
    }
  }
  return { nodes, materials, images, bounds: { min, max } };
}
