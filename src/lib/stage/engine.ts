import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { STAGE } from './config';

// Moteur de la scène scroll. Client uniquement, chargé à la demande par <ScrollStage />.
//  - Lenis lisse le défilement ; GSAP (ticker + ScrollTrigger) cadence tout ;
//  - un canvas fixe affiche un GLB à la fois ; sa position/taille/rotation sont des FONCTIONS du défilement (scrub),
//    calculées à partir de repères HTML (`[data-stage-anchor]`) : 1 unité three = 1 pixel CSS à z = 0.

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Anchor {
  x: number; // centre horizontal (px viewport)
  top: number; // haut « naturel » dans le document (hors effet sticky)
  h: number;
  sticky: boolean;
  stickTop: number;
  slotBottom: number; // bas du conteneur dans le document
}
interface Pose { x: number; y: number; h: number; ry: number; rz: number; pop: number }

function measure(name: string): Anchor | null {
  const el = document.querySelector<HTMLElement>(`[data-stage-anchor="${name}"]`);
  if (!el || el.offsetParent === null) return null;
  const sy = window.scrollY;
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const sticky = style.position === 'sticky';
  const slot = el.closest<HTMLElement>('[data-stage-slot]');
  const slotRect = slot?.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    // Un repère sticky est le 1er enfant de son conteneur : son haut naturel = haut du conteneur.
    top: (sticky && slotRect ? slotRect.top : rect.top) + sy,
    h: rect.height,
    sticky,
    stickTop: sticky ? parseFloat(style.top) || 0 : 0,
    slotBottom: (slotRect ? slotRect.bottom : rect.bottom) + sy,
  };
}

/** Centre vertical (px viewport) du repère quand la page est au défilement s. */
function anchorY(a: Anchor, s: number): number {
  const natural = a.top + a.h / 2 - s;
  if (!a.sticky) return natural;
  return Math.min(Math.max(natural, a.stickTop + a.h / 2), a.slotBottom - s - a.h / 2);
}

export async function startStage(canvas: HTMLCanvasElement): Promise<() => void> {
  const [THREE, { GLTFLoader }, { RoomEnvironment }, { gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/environments/RoomEnvironment.js'),
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('lenis'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  const root = document.documentElement;
  if (new URLSearchParams(location.search).get('stage') === 'debug') root.dataset.stageDebug = '';

  // ---------- Rendu ----------
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-300, 500, 700);
  scene.add(key, new THREE.HemisphereLight(0xfff1dc, 0xf47c26, 0.5));
  const camera = new THREE.PerspectiveCamera(STAGE.fov, 1, 1, 10);

  let vw = 0;
  let vh = 0;
  function resize() {
    vw = document.documentElement.clientWidth;
    vh = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(vw, vh, false);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    const z = vh / 2 / Math.tan((STAGE.fov * Math.PI) / 360);
    camera.aspect = vw / vh;
    camera.near = z * 0.2;
    camera.far = z * 3;
    camera.position.set(0, 0, z);
    camera.updateProjectionMatrix();
  }

  // ---------- Modèles ----------
  const loader = new GLTFLoader();
  async function loadModel(url: string): Promise<Group> {
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as MeshStandardMaterial;
      material.envMapIntensity = 1.1;
    });
    const inner = new THREE.Group();
    inner.add(model);
    inner.scale.setScalar(1 / size.y); // hauteur = 1
    const pivot = new THREE.Group();
    pivot.rotation.order = 'ZYX'; // lacet autour du flacon, roulis dans le plan de l'écran
    pivot.visible = false;
    pivot.add(inner);
    scene.add(pivot);
    return pivot;
  }
  let elixir: Group | null = null;
  let brume: Group | null = null;
  let disposed = false;
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 1500 }) : window.setTimeout(cb, 300));
  idle(() => {
    loadModel(STAGE.models.elixir.url).then((m) => { if (!disposed) elixir = m; }).catch(() => undefined);
    loadModel(STAGE.models.brume.url).then((m) => { if (!disposed) brume = m; }).catch(() => undefined);
  });

  // ---------- Trajectoires ----------
  let hero: Anchor | null = null;
  let why: Anchor | null = null;
  let faq: Anchor | null = null;
  let cta: Anchor | null = null;
  // défilements clés
  let sWhyIn = 0, sWhyOut = 0, sFaqEnter = 0, sFaqIn = 0, sFaqOut = 0, sCtaFrom = 0, sCtaRest = 0;

  const arrive = (a: Anchor) => a.top + a.h / 2 - (a.sticky ? a.stickTop + a.h / 2 : vh / 2);
  const release = (a: Anchor) => (a.sticky ? Math.max(a.slotBottom - a.h - a.stickTop, arrive(a) + vh * 0.5) : arrive(a) + a.h);

  function layout() {
    hero = measure('hero');
    why = measure('why');
    faq = measure('faq');
    cta = measure('cta');
    if (why) { sWhyIn = Math.max(arrive(why), 1); sWhyOut = release(why); }
    if (faq) {
      sFaqEnter = faq.top - vh;
      sFaqIn = arrive(faq);
      sFaqOut = release(faq);
    }
    if (cta) {
      const ctaY = cta.top + cta.h / 2;
      sCtaRest = Math.max(ctaY - vh * 0.55, (faq ? (faq.sticky ? sFaqOut : sFaqIn) : 0) + vh * 0.5);
      sCtaFrom = faq?.sticky ? sFaqOut : Math.max(ctaY - vh * 1.3, (faq ? sFaqOut : 0) + vh * 0.8);
      if (sCtaRest <= sCtaFrom + 1) sCtaRest = sCtaFrom + vh * 0.4;
    }
  }

  function elixirPose(s: number): Pose | null {
    if (!hero || !why) return null;
    if (s <= sWhyIn) {
      const f = clamp(s / sWhyIn);
      const y0 = hero.top + hero.h / 2; // héros : défilement 0
      const yA = anchorY(why, sWhyIn);
      return { x: lerp(hero.x, why.x, f), y: lerp(y0, yA, f), h: lerp(hero.h, why.h, f), ry: TAU * STAGE.turns.travel * f, rz: 0, pop: smooth(clamp(s / (vh * 0.12))) };
    }
    const hold = clamp((s - sWhyIn) / Math.max(sWhyOut - sWhyIn, 1));
    const y = anchorY(why, s);
    return { x: why.x, y, h: why.h, ry: TAU * (STAGE.turns.travel + STAGE.turns.hold * hold), rz: 0, pop: 1 - smooth(clamp((s - sWhyOut - vh * 0.5) / (vh * 0.4))) };
  }

  function brumePose(s: number): Pose | null {
    if (!faq || !cta || s < sFaqEnter) return null;
    const ctaY = cta.top + cta.h / 2;
    const rest = STAGE.ctaRest;
    const { travel, hold } = STAGE.turns;
    if (s < sCtaFrom) {
      // Phase FAQ : le flacon suit son repère (qui monte, se fixe sur ordinateur, puis repart avec la page).
      const turnsDone = s < sFaqIn
        ? travel * clamp((s - sFaqEnter) / Math.max(sFaqIn - sFaqEnter, 1))
        : travel + hold * clamp((s - sFaqIn) / Math.max(sFaqOut - sFaqIn, 1));
      return { x: faq.x, y: anchorY(faq, s), h: faq.h, ry: TAU * turnsDone, rz: 0, pop: 1 };
    }
    // Phase CTA : le flacon atterrit sur celui de la photo (qui, lui, monte avec la page), puis reste collé à elle.
    const g = clamp((s - sCtaFrom) / Math.max(sCtaRest - sCtaFrom, 1));
    const targetY = ctaY - s;
    if (faq.sticky) {
      const e = smooth(g);
      return { x: lerp(faq.x, cta.x, e), y: lerp(anchorY(faq, sCtaFrom), targetY, e), h: lerp(faq.h, cta.h, e), ry: TAU * (travel + hold) + rest.yaw * e, rz: rest.roll * e, pop: 1 };
    }
    // Mobile : le repère FAQ est déjà parti avec la page, le flacon revient avec la photo en faisant un tour.
    return { x: cta.x, y: targetY, h: cta.h, ry: rest.yaw + TAU * (1 - easeOut(g)), rz: rest.roll * smooth(g), pop: smooth(clamp(g * 4)) };
  }

  function place(model: Group | null, pose: Pose | null, frontYaw: number) {
    if (!model) return false;
    const visible = !!pose && pose.pop > 0.01 && pose.y + pose.h / 2 > -40 && pose.y - pose.h / 2 < vh + 40;
    model.visible = visible;
    if (!visible || !pose) return false;
    model.scale.setScalar(pose.h * (0.7 + 0.3 * pose.pop));
    model.position.set(pose.x - vw / 2, vh / 2 - pose.y, 0);
    model.rotation.set(0, pose.ry + frontYaw, pose.rz);
    return true;
  }

  // ---------- Boucle : Lenis → ScrollTrigger → rendu ----------
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => {
    lenis.raf(time * 1000);
    if (document.hidden) return;
    const s = window.scrollY;
    const a = place(elixir, elixirPose(s), STAGE.models.elixir.frontYaw);
    const b = place(brume, brumePose(s), STAGE.models.brume.frontYaw);
    if (a || b || wasDrawn) renderer.render(scene, camera);
    wasDrawn = a || b;
    if (!ready && (elixir || brume)) { ready = true; root.dataset.stage = 'on'; }
  };
  let wasDrawn = false;
  let ready = false;
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // Un ScrollTrigger recale les mesures à chaque « refresh » (images, polices, redimensionnement).
  ScrollTrigger.addEventListener('refresh', layout);
  const refreshTrigger = ScrollTrigger.create({ start: 0, end: 'max' });
  const revealCheck = gsap.from('.cta-checks li', {
    autoAlpha: 0,
    y: 18,
    stagger: 0.08,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: { trigger: '.cta-card', start: 'top 68%', once: true },
  });

  resize();
  layout();
  let timer = 0;
  const relayout = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { resize(); layout(); ScrollTrigger.refresh(); }, 150);
  };
  window.addEventListener('resize', relayout);
  const resizeObserver = new ResizeObserver(relayout);
  resizeObserver.observe(document.body);
  void document.fonts?.ready.then(relayout);

  // Pas de défilement lissé sous une fenêtre modale (panier, commande, menu).
  const syncScrollLock = () => {
    const locked = getComputedStyle(document.body).overflow === 'hidden' || !!document.querySelector('dialog[open], [aria-modal="true"]');
    if (locked) lenis.stop(); else lenis.start();
  };
  const lockObserver = new MutationObserver(syncScrollLock);
  lockObserver.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true });

  return () => {
    disposed = true;
    window.clearTimeout(timer);
    window.removeEventListener('resize', relayout);
    resizeObserver.disconnect();
    lockObserver.disconnect();
    gsap.ticker.remove(tick);
    ScrollTrigger.removeEventListener('refresh', layout);
    refreshTrigger.kill();
    revealCheck.scrollTrigger?.kill();
    revealCheck.kill();
    lenis.destroy();
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const material = mesh.material as MeshStandardMaterial;
      for (const value of Object.values(material)) if (value && (value as { isTexture?: boolean }).isTexture) (value as { dispose(): void }).dispose();
      material.dispose();
    });
    envTexture.dispose();
    pmrem.dispose();
    renderer.dispose();
    delete root.dataset.stage;
    delete root.dataset.stageDebug;
  };
}
