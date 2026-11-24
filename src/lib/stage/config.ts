// Scène scroll de la landing : un élixir (hero → « Le soin en toute simplicité ») puis la brume (FAQ → CTA),
// deux modèles GLB dessinés dans un canvas fixe et pilotés par le défilement (Lenis + GSAP ScrollTrigger).
// Les POSITIONS ne sont pas ici : elles viennent des repères HTML `data-stage-anchor` (voir stage.css, variables
// --ax / --ay / --aw). Ajouter `?stage=debug` à l'adresse affiche ces repères en pointillé magenta pour les caler.

export const STAGE = {
  models: {
    elixir: { url: '/models/elixir-winter-50ml.glb', frontYaw: 0 }, // frontYaw : mettre Math.PI si l'étiquette regarde en arrière
    brume: { url: '/models/brume-spray-200ml.glb', frontYaw: 0 },
  },
  fov: 22, // petit champ = peu de déformation quand le flacon est loin du centre
  turns: { travel: 1, hold: 1 }, // tours complets : trajet héros → section, puis pendant que la section défile
  // Pose finale du spray sur la photo du CTA (doit imiter celui que tient la femme) : lacet vers l'épaule, roulis dans le plan.
  ctaRest: { yaw: -0.3, roll: 0.34 },
  // Affiche du héros SANS l'élixir (optionnel). Tant qu'elle est vide, l'élixir 3D « sort » de l'affiche et l'élixir imprimé reste dessous.
  heroCleanSrc: '' as string,
} as const;
