'use client';

import { gsap } from 'gsap';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/shop/motion';

/**
 * Transition entre les pages : « 05 · WebGL Tunnel Vortex » du laboratoire de transitions.
 * Un tourbillon orange part du centre, recouvre l'écran, la page change derrière, puis le tourbillon se referme.
 * Le shader est celui du labo, écrit en WebGL natif (pas de three.js : 600 Ko de moins), avec trois corrections :
 * l'ondulation s'éteint aux extrémités (plus de tache au repos), le cercle couvre les coins, et le bord est lissé.
 *
 * Sont laissés au navigateur, sans animation : ctrl/cmd/maj + clic, nouvel onglet, téléchargement, lien externe,
 * simple ancre ou changement de modal sur la même page, `data-no-transition`, et « réduire les animations ».
 */
const VERTEX = `attribute vec2 aPosition; varying vec2 vUv; void main(){ vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }`;
const FRAGMENT = `
precision mediump float;
uniform float uProgress;
uniform vec2 uRes;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  c.x *= uRes.x / uRes.y;
  float angle = atan(c.y, c.x);
  float maxR = length(vec2(0.5 * uRes.x / uRes.y, 0.5));
  float d = length(c) / maxR;
  float wobble = sin(angle * 5.0 + uProgress * 5.0) * 0.1 * sin(uProgress * 3.14159);
  float edge = uProgress * 1.1 + wobble;
  float inside = 1.0 - smoothstep(edge - 0.004, edge + 0.004, d);
  float rim = smoothstep(edge - 0.05, edge - 0.04, d);
  vec3 orange = vec3(0.957, 0.486, 0.149);
  vec3 brown = vec3(0.498, 0.247, 0.125);
  gl_FragColor = vec4(mix(orange, brown, rim), inside);
  gl_FragColor.rgb *= gl_FragColor.a;
}`;

interface Renderer {
  render: (progress: number) => void;
  resize: () => void;
}

function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uProgress = gl.getUniformLocation(program, 'uProgress');
  const uRes = gl.getUniformLocation(program, 'uRes');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const render = (progress: number) => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uProgress, progress);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  resize();
  return { render, resize };
}

function shouldIntercept(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!anchor || anchor.hasAttribute('download') || anchor.hasAttribute('data-no-transition')) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname) return null; // ancre, modal ou paramètres : même page
  return anchor;
}

export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const progress = useRef({ value: 0 });
  const busy = useRef(false);
  const waitingFor = useRef<string | null>(null);
  const fallbackTimer = useRef<number | undefined>(undefined);

  const uncover = () => {
    window.clearTimeout(fallbackTimer.current);
    waitingFor.current = null;
    const canvas = canvasRef.current;
    gsap.to(progress.current, {
      value: 0,
      duration: 0.7,
      ease: 'power2.inOut',
      onUpdate: () => renderer.current?.render(progress.current.value),
      onComplete: () => {
        if (canvas) canvas.style.visibility = 'hidden';
        busy.current = false;
      },
    });
  };

  // La nouvelle page est affichée : le tourbillon se referme.
  useEffect(() => {
    if (waitingFor.current !== null && pathname === waitingFor.current) {
      window.setTimeout(uncover, 80); // laisse la page peindre son premier écran
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let unsupported = false;
    const onResize = () => renderer.current?.resize();
    window.addEventListener('resize', onResize);

    const onClick = (event: MouseEvent) => {
      if (unsupported || busy.current || prefersReducedMotion()) return;
      const anchor = shouldIntercept(event);
      if (!anchor) return;
      renderer.current ??= createRenderer(canvas);
      if (!renderer.current) {
        unsupported = true; // pas de WebGL : navigation normale, sans transition
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      busy.current = true;
      const url = new URL(anchor.href, window.location.href);
      canvas.style.visibility = 'visible';
      // Un menu ou un panier ouvert passerait au-dessus du calque (couche supérieure du navigateur) : on le referme.
      document.querySelectorAll('dialog[open]').forEach((dialog) => (dialog as HTMLDialogElement).close());
      progress.current.value = 0;
      gsap.to(progress.current, {
        value: 1,
        duration: 0.65,
        ease: 'power2.inOut',
        onUpdate: () => renderer.current?.render(progress.current.value),
        onComplete: () => {
          waitingFor.current = url.pathname;
          router.push(`${url.pathname}${url.search}${url.hash}`);
          // Filet de sécurité : si la page ne change pas (erreur réseau), on ne laisse jamais l'écran bloqué.
          fallbackTimer.current = window.setTimeout(uncover, 5000);
        },
      });
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('resize', onResize);
      window.clearTimeout(fallbackTimer.current);
      gsap.killTweensOf(progress.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return <canvas ref={canvasRef} className="page-transition" aria-hidden="true" />;
}
