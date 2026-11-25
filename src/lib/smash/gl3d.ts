import type { PotKind } from './engine';
import { parseGlb, transformPoint, type GlbModel, type GlbNode } from './glb';
import { chain, pixelProjection, rotationPart, rotationX, rotationY, rotationZ, scaling, translation, type Mat4 } from './mat4';

// Rendu 3D des pots du mini-jeu, en WebGL NATIF (aucune bibliothèque : ni three.js, ni rien à télécharger de plus que les
// .glb). Un canvas WebGL hors page dessine les pots ; le jeu en recopie le résultat dans son canvas 2D (drawImage), ce qui
// garde l'ordre des couches : taches de crème, pots, ondes, gouttes, éclats, points.
//
// Éclairage : ambiante « ciel / sol », lumière principale en haut à gauche (comme les pots dessinés), reflet brillant,
// reflet d'environnement et liseré de Fresnel. Un « teint » ré-colore la matière principale d'un pot avec la couleur de
// sa catégorie. Toute erreur (WebGL absent, fichier introuvable ou illisible) rend `create` → null : le jeu garde alors
// ses pots dessinés en 2D.

export type Rgb = readonly [number, number, number];

/** Nom du fichier .glb de chaque contenant (le « compte-gouttes » du jeu 2D est le flacon spray du 3D). */
export const POT_MODEL_FILES: Record<PotKind, string> = { jar: 'jar', pump: 'pump', dropper: 'spray', tube: 'tube', bottle: 'bottle' };

/** Matériaux ré-colorés par la couleur de la catégorie, et à quel point (les pots texturés gardent surtout leur texture). */
export const TINT_CONFIG: Record<PotKind, { materials: readonly number[]; amount: number }> = {
  jar: { materials: [0], amount: 0.3 },
  pump: { materials: [0], amount: 0.3 },
  dropper: { materials: [0], amount: 0.8 },
  tube: { materials: [0], amount: 0.8 },
  bottle: { materials: [0], amount: 0.8 },
};

export interface Pose {
  /** Position du centre du pot, en pixels du canvas (Y vers le bas). */
  x: number;
  y: number;
  /** Hauteur du pot en pixels. */
  size: number;
  /** Rotation dans le plan de l'écran (radians, sens horaire visuel comme `ctx.rotate`). */
  roll: number;
  /** Rotation autour de l'axe vertical du pot : le fait tourner sur lui-même. */
  yaw: number;
  /** Inclinaison vers l'observateur : laisse voir le dessus du pot. */
  pitch: number;
  opacity: number;
  /** Couleur de la catégorie (teint). */
  tint: Rgb;
}

interface GpuMaterial {
  /** Indice du matériau dans le fichier (sert à choisir ceux que le teint ré-colore). */
  index: number;
  color: readonly [number, number, number, number];
  texture: WebGLTexture | null;
  metallic: number;
  roughness: number;
  doubleSided: boolean;
  cream: boolean;
}

interface GpuPrimitive {
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
  count: number;
  indexType: number;
  material: GpuMaterial;
}

interface GpuPart {
  matrix: Mat4;
  primitives: GpuPrimitive[];
}

export interface PotModel {
  whole: GpuPart[];
  pos: GpuPart[];
  neg: GpuPart[];
  core: GpuPart[];
  hasCut: boolean;
  /** Passe du repère du fichier au repère « pot de hauteur 1, centré sur l'origine ». */
  normalize: Mat4;
  /** Écart (en hauteurs de pot) à rendre à chaque moitié pour que les deux collent à la forme entière. */
  seam: number;
  /** Axe vertical autour duquel chaque moitié pivote : [x, z], en hauteurs de pot. */
  pivotPos: readonly [number, number];
  pivotNeg: readonly [number, number];
}

const VERTEX_SHADER = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform mat4 uMvp;
uniform mat3 uRot;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vNormal = uRot * aNormal;
  vUv = aUv;
  gl_Position = uMvp * vec4(aPos, 1.0);
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec3 vNormal;
varying vec2 vUv;
uniform vec4 uColor;
uniform sampler2D uTex;
uniform float uHasTex;
uniform vec3 uTint;
uniform float uTintAmount;
uniform float uMetal;
uniform float uRough;
uniform float uOpacity;
uniform float uCream;
void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec4 base = uColor;
  if (uHasTex > 0.5) base *= texture2D(uTex, vUv);
  vec3 albedo = base.rgb;
  float luma = dot(albedo, vec3(0.299, 0.587, 0.114));
  vec3 recolor = uTint * (0.38 + 0.95 * luma);
  albedo = mix(albedo, recolor, uTintAmount);

  vec3 light = normalize(vec3(-0.5, 0.62, 0.78));
  float ndl = dot(n, light);
  float wrap = clamp(ndl * 0.72 + 0.28, 0.0, 1.0);
  vec3 ambient = mix(vec3(0.46, 0.40, 0.38), vec3(0.96, 0.94, 0.92), n.y * 0.5 + 0.5);
  vec3 lit = albedo * (ambient * 0.62 + vec3(1.0, 0.96, 0.9) * wrap * 0.66);

  vec3 view = vec3(0.0, 0.0, 1.0);
  vec3 half_ = normalize(light + view);
  float gloss = 1.0 - uRough;
  float spec = pow(max(dot(n, half_), 0.0), mix(14.0, 140.0, gloss)) * (0.25 + 0.75 * gloss);
  vec3 refl = reflect(-view, n);
  float sky = smoothstep(-0.35, 0.85, refl.y);
  vec3 env = mix(vec3(0.30, 0.24, 0.22), vec3(1.0, 0.97, 0.93), sky);
  float fresnel = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  vec3 color = lit + env * (fresnel * (0.18 + 0.5 * gloss) + uMetal * 0.5 * luma) + vec3(1.0, 0.98, 0.94) * spec * (0.5 + 0.5 * gloss);
  color += uCream * albedo * 0.16 * (1.0 - clamp(ndl, 0.0, 1.0));
  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color * uOpacity, uOpacity);
}`;

/** Couleur HSL (h en degrés, s et l en %) → RVB 0..1. */
export function hslToRgb(h: number, s: number, l: number): Rgb {
  const saturation = Math.min(1, Math.max(0, s / 100));
  const lightness = Math.min(1, Math.max(0, l / 100));
  const hue = (((h % 360) + 360) % 360) / 360;
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channel = (offset: number) => {
    let t = hue + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(1 / 3), channel(0), channel(-1 / 3)];
}

interface Uniforms {
  mvp: WebGLUniformLocation | null;
  rot: WebGLUniformLocation | null;
  color: WebGLUniformLocation | null;
  tex: WebGLUniformLocation | null;
  hasTex: WebGLUniformLocation | null;
  tint: WebGLUniformLocation | null;
  tintAmount: WebGLUniformLocation | null;
  metal: WebGLUniformLocation | null;
  rough: WebGLUniformLocation | null;
  opacity: WebGLUniformLocation | null;
  cream: WebGLUniformLocation | null;
}

type FetchLike = (url: string) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer> }>;

export interface Pots3DOptions {
  /** Dossier des .glb (avec ou sans « / » final). */
  baseUrl: string;
  kinds: readonly PotKind[];
  fetcher?: FetchLike;
  /** Création du canvas WebGL (remplaçable en test). */
  makeCanvas?: () => HTMLCanvasElement;
}

export class Pots3D {
  private readonly models = new Map<PotKind, PotModel>();
  private width = 1;
  private height = 1;
  private lost = false;
  private readonly uniforms: Uniforms;

  private constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGLRenderingContext,
    private readonly program: WebGLProgram,
  ) {
    const location = (name: string) => gl.getUniformLocation(program, name);
    this.uniforms = {
      mvp: location('uMvp'), rot: location('uRot'), color: location('uColor'), tex: location('uTex'), hasTex: location('uHasTex'),
      tint: location('uTint'), tintAmount: location('uTintAmount'), metal: location('uMetal'), rough: location('uRough'),
      opacity: location('uOpacity'), cream: location('uCream'),
    };
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.lost = true;
    });
  }

  /** null si WebGL est indisponible ou si un fichier manque : le jeu garde alors ses pots dessinés. */
  static async create(options: Pots3DOptions): Promise<Pots3D | null> {
    try {
      const canvas = options.makeCanvas ? options.makeCanvas() : document.createElement('canvas');
      const attributes = { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, preserveDrawingBuffer: false, powerPreference: 'low-power' } as const;
      const gl = (canvas.getContext('webgl2', attributes) ?? canvas.getContext('webgl', attributes)) as WebGLRenderingContext | null;
      if (!gl) return null;
      const program = buildProgram(gl);
      if (!program) return null;
      const renderer = new Pots3D(canvas, gl, program);
      const fetcher: FetchLike = options.fetcher ?? ((url) => fetch(url));
      const base = options.baseUrl.replace(/\/+$/, '');
      await Promise.all(
        options.kinds.map(async (kind) => {
          const file = POT_MODEL_FILES[kind];
          const [whole, cut] = await Promise.all([fetchBuffer(fetcher, `${base}/${file}.glb`), fetchBuffer(fetcher, `${base}/${file}-cut.glb`)]);
          renderer.models.set(kind, await renderer.upload(kind, parseGlb(whole), parseGlb(cut)));
        }),
      );
      return renderer;
    } catch {
      return null;
    }
  }

  get ready(): boolean {
    return !this.lost && this.models.size > 0;
  }

  hasModel(kind: PotKind): boolean {
    return this.models.has(kind);
  }

  model(kind: PotKind): PotModel | undefined {
    return this.models.get(kind);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
  }

  begin(): void {
    const { gl } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** Le pot entier. */
  drawWhole(kind: PotKind, pose: Pose): void {
    const model = this.models.get(kind);
    if (!model) return;
    const world = chain(this.placement(pose), rotationY(pose.yaw), model.normalize);
    this.drawParts(kind, model.whole, world, pose, false);
  }

  /**
   * Une moitié du pot découpé. `yaw` la fait pivoter autour de SON axe vertical : à ±90° sa face de coupe se tourne
   * vers l'observateur et montre l'intérieur. `spread` (en hauteurs de pot) l'écarte encore de la coupe.
   */
  drawHalf(kind: PotKind, side: 'pos' | 'neg', pose: Pose, spread = 0): void {
    const model = this.models.get(kind);
    if (!model) return;
    const direction = side === 'pos' ? 1 : -1;
    const [px, pz] = side === 'pos' ? model.pivotPos : model.pivotNeg;
    const shift = direction * (model.seam + spread);
    const pivotX = px + shift;
    const world = chain(this.placement(pose), translation(pivotX, 0, pz), rotationY(pose.yaw), translation(-pivotX, 0, -pz), translation(shift, 0, 0), model.normalize);
    this.drawParts(kind, side === 'pos' ? model.pos : model.neg, world, pose, true);
  }

  /** Le disque de crème visible au cœur de la coupe : il pivote pour faire face à l'observateur. */
  drawCore(kind: PotKind, pose: Pose, grow: number): void {
    const model = this.models.get(kind);
    if (!model) return;
    const world = chain(this.placement(pose), rotationY(pose.yaw), scaling(grow, grow, grow), model.normalize);
    this.drawParts(kind, model.core, world, pose, true);
  }

  /** Le canvas contenant l'image, à recopier dans le canvas 2D. */
  end(): HTMLCanvasElement {
    return this.canvas;
  }

  dispose(): void {
    const { gl } = this;
    for (const model of this.models.values()) {
      for (const part of [...model.whole, ...model.pos, ...model.neg, ...model.core]) {
        for (const primitive of part.primitives) {
          gl.deleteBuffer(primitive.vbo);
          gl.deleteBuffer(primitive.ibo);
          if (primitive.material.texture) gl.deleteTexture(primitive.material.texture);
        }
      }
    }
    this.models.clear();
    gl.deleteProgram(this.program);
  }

  // --- Interne -------------------------------------------------------------------------------------------------

  /** Place le pot : translation vers son centre, roulis dans l'écran, inclinaison, puis mise à l'échelle en pixels. */
  private placement(pose: Pose): Mat4 {
    return chain(translation(pose.x, -pose.y, 0), rotationZ(-pose.roll), rotationX(pose.pitch), scaling(pose.size, pose.size, pose.size));
  }

  private drawParts(kind: PotKind, parts: readonly GpuPart[], world: Mat4, pose: Pose, forceDoubleSided: boolean): void {
    if (parts.length === 0 || this.lost) return;
    const { gl, uniforms } = this;
    const projection = pixelProjection(this.width, this.height, Math.max(1000, pose.size * 4));
    const tint = TINT_CONFIG[kind];
    gl.clear(gl.DEPTH_BUFFER_BIT);
    for (const part of parts) {
      const matrix = chain(world, part.matrix);
      gl.uniformMatrix4fv(uniforms.mvp, false, chain(projection, matrix));
      gl.uniformMatrix3fv(uniforms.rot, false, rotationPart(matrix));
      for (const primitive of part.primitives) {
        const { material } = primitive;
        const tinted = material.cream || tint.materials.includes(material.index);
        gl.uniform4f(uniforms.color, material.color[0], material.color[1], material.color[2], material.color[3]);
        gl.uniform3f(uniforms.tint, pose.tint[0], pose.tint[1], pose.tint[2]);
        gl.uniform1f(uniforms.tintAmount, material.cream ? 0.88 : tinted ? tint.amount : 0);
        gl.uniform1f(uniforms.metal, material.metallic);
        gl.uniform1f(uniforms.rough, material.roughness);
        gl.uniform1f(uniforms.opacity, pose.opacity);
        gl.uniform1f(uniforms.cream, material.cream ? 1 : 0);
        if (material.texture) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, material.texture);
          gl.uniform1i(uniforms.tex, 0);
          gl.uniform1f(uniforms.hasTex, 1);
        } else {
          gl.uniform1f(uniforms.hasTex, 0);
        }
        if (forceDoubleSided || material.doubleSided) gl.disable(gl.CULL_FACE);
        else {
          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.BACK);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, primitive.vbo);
        const stride = 8 * 4;
        const attribute = (name: string, size: number, offset: number) => {
          const index = gl.getAttribLocation(this.program, name);
          if (index < 0) return;
          gl.enableVertexAttribArray(index);
          gl.vertexAttribPointer(index, size, gl.FLOAT, false, stride, offset);
        };
        attribute('aPos', 3, 0);
        attribute('aNormal', 3, 12);
        attribute('aUv', 2, 24);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.ibo);
        gl.drawElements(gl.TRIANGLES, primitive.count, primitive.indexType, 0);
      }
    }
  }

  private async upload(kind: PotKind, whole: GlbModel, cut: GlbModel): Promise<PotModel> {
    const { gl } = this;
    const wholeTextures = await this.textures(whole);
    const cutTextures = await this.textures(cut);

    const height = whole.bounds.max[1] - whole.bounds.min[1] || 1;
    const scale = 1 / height;
    const center = [(whole.bounds.min[0] + whole.bounds.max[0]) / 2, (whole.bounds.min[1] + whole.bounds.max[1]) / 2, (whole.bounds.min[2] + whole.bounds.max[2]) / 2] as const;
    const normalize = chain(scaling(scale, scale, scale), translation(-center[0], -center[1], -center[2]));

    const toPart = (node: GlbNode, model: GlbModel, textures: (WebGLTexture | null)[]): GpuPart => ({
      matrix: node.matrix,
      primitives: node.primitives.map((primitive) => {
        const vertexCount = primitive.positions.length / 3;
        const data = new Float32Array(vertexCount * 8);
        for (let vertex = 0; vertex < vertexCount; vertex += 1) {
          data.set(primitive.positions.subarray(vertex * 3, vertex * 3 + 3), vertex * 8);
          data.set(primitive.normals.subarray(vertex * 3, vertex * 3 + 3), vertex * 8 + 3);
          if (primitive.uvs) data.set(primitive.uvs.subarray(vertex * 2, vertex * 2 + 2), vertex * 8 + 6);
        }
        const vbo = gl.createBuffer();
        const ibo = gl.createBuffer();
        if (!vbo || !ibo) throw new Error('Tampon WebGL indisponible.');
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, primitive.indices, gl.STATIC_DRAW);
        const source = model.materials[primitive.material];
        const image = source?.baseColorImage ?? null;
        const material: GpuMaterial = {
          index: primitive.material,
          color: source?.baseColor ?? [0.8, 0.8, 0.8, 1],
          texture: image === null ? null : (textures[image] ?? null),
          metallic: source?.metallic ?? 0,
          roughness: source?.roughness ?? 0.5,
          doubleSided: source?.doubleSided ?? false,
          cream: source?.name === 'Cream interior',
        };
        return { vbo, ibo, count: primitive.indices.length, indexType: primitive.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, material };
      }),
    });

    const nodeCenterX = (node: GlbNode): number => {
      let min = Infinity;
      let max = -Infinity;
      for (const primitive of node.primitives) {
        for (let vertex = 0; vertex < primitive.positions.length; vertex += 3) {
          const [x] = transformPoint(node.matrix, primitive.positions[vertex] as number, primitive.positions[vertex + 1] as number, primitive.positions[vertex + 2] as number);
          if (x < min) min = x;
          if (x > max) max = x;
        }
      }
      return (min + max) / 2;
    };

    const wholeParts = whole.nodes.map((node) => toPart(node, whole, wholeTextures));
    const pos: GpuPart[] = [];
    const neg: GpuPart[] = [];
    const core: GpuPart[] = [];
    const posBounds = { min: [Infinity, Infinity], max: [-Infinity, -Infinity] };
    const negBounds = { min: [Infinity, Infinity], max: [-Infinity, -Infinity] };
    for (const node of cut.nodes) {
      const part = toPart(node, cut, cutTextures);
      if (node.name.endsWith('cream_core')) {
        core.push(part);
        continue;
      }
      const isPositive = nodeCenterX(node) >= 0;
      (isPositive ? pos : neg).push(part);
      const bounds = isPositive ? posBounds : negBounds;
      for (const primitive of node.primitives) {
        for (let vertex = 0; vertex < primitive.positions.length; vertex += 3) {
          const [x, , z] = transformPoint(node.matrix, primitive.positions[vertex] as number, primitive.positions[vertex + 1] as number, primitive.positions[vertex + 2] as number);
          bounds.min[0] = Math.min(bounds.min[0] as number, x);
          bounds.max[0] = Math.max(bounds.max[0] as number, x);
          bounds.min[1] = Math.min(bounds.min[1] as number, z);
          bounds.max[1] = Math.max(bounds.max[1] as number, z);
        }
      }
    }
    const pivot = (bounds: typeof posBounds, fallbackX: number): readonly [number, number] => [
      Number.isFinite(bounds.min[0]) ? (((bounds.min[0] as number) + (bounds.max[0] as number)) / 2 - center[0]) * scale : fallbackX,
      Number.isFinite(bounds.min[1]) ? (((bounds.min[1] as number) + (bounds.max[1] as number)) / 2 - center[2]) * scale : 0,
    ];
    // Les moitiés du fichier sont rapprochées de la coupe : on leur rend l'écart qui les fait coller à la forme entière.
    const seam = Math.max(0, (whole.bounds.max[0] - cut.bounds.max[0]) * scale);
    return { whole: wholeParts, pos, neg, core, hasCut: pos.length + neg.length > 0, normalize, seam, pivotPos: pivot(posBounds, 0.2), pivotNeg: pivot(negBounds, -0.2) };
  }

  private async textures(model: GlbModel): Promise<(WebGLTexture | null)[]> {
    const { gl } = this;
    return Promise.all(
      model.images.map(async (image) => {
        const bitmap = await createImageBitmap(new Blob([image.bytes.slice().buffer], { type: image.mimeType }), { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        const texture = gl.createTexture();
        if (!texture) return null;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        bitmap.close();
        return texture;
      }),
    );
  }
}

async function fetchBuffer(fetcher: FetchLike, url: string): Promise<ArrayBuffer> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Fichier introuvable : ${url}`);
  return response.arrayBuffer();
}

function buildProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

