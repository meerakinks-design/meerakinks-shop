// Scène scroll de la landing : le pot Fluffy Kinks (hero → « Vos cheveux ont des besoins. Notre gamme vous guide. ») puis la brume
// (FAQ → CTA, où elle passe SOUS la carte du CTA), deux modèles GLB dessinés dans un canvas fixe et pilotés par le défilement
// (Lenis + GSAP ScrollTrigger).
// Les POSITIONS ne sont pas ici : elles viennent des repères HTML `data-stage-anchor` (voir stage.css, variables
// --ax / --ay / --aw). Ajouter `?stage=debug` à l'adresse affiche ces repères en pointillé magenta pour les caler.

export const STAGE = {
  models: {
    // Pot Fluffy Kinks (compressé en meshopt : le décodeur est branché dans engine.ts, la CSP autorise 'wasm-unsafe-eval').
    // frontYaw : dans le fichier, l'étiquette regarde vers +X ; -π/2 la tourne vers la caméra (mettre Math.PI si l'étiquette regarde en arrière).
    jar: { url: '/models/fluffy-kinks-jar.glb', frontYaw: -Math.PI / 2 },
    brume: { url: '/models/brume-spray-200ml.glb', frontYaw: 0 },
  },
  fov: 22, // petit champ = peu de déformation quand le flacon est loin du centre
  turns: { travel: 1, hold: 1 }, // tours complets : trajet héros → section, puis pendant que la section défile
  // Pose finale du spray au-dessus de la photo du CTA (doit imiter celui que tient la femme) : lacet vers l'épaule, roulis dans le plan.
  // La carte du CTA est posée AU-DESSUS du canvas (stage.css) : le spray glisse donc sous son fond, jamais par-dessus.
  ctaRest: { yaw: -0.3, roll: 0.34 },
  // Affiche du héros SANS le pot (optionnel). Tant qu'elle est vide, le pot 3D « sort » de l'affiche et le pot imprimé (Velvet) reste dessous.
  heroCleanSrc: '' as string,
} as const;
