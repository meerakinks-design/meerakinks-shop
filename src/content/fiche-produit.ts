// Textes fixes de la fiche produit de la vitrine (/produit/<id>). Les informations de chaque produit (mode d'emploi, précautions,
// ingrédients…) viennent de src/content/catalogue.ts ; ici seulement les intitulés et les phrases de l'interface.
// Règle éditoriale : rien d'inventé (ni délai, ni garantie, ni promesse) ; les prix et les économies sont ceux du dossier produit.

export const FICHE = {
  back: '← Retour à la boutique',
  /** Tant que la commande n'est pas ouverte (vitrine). */
  soon: 'Commande bientôt disponible.',
  question: 'Une question ? Écrivez-nous',
  /** Libellé de l'économie, tel qu'écrit dans le dossier : « Économie : 500 FCFA ». */
  saving: (amount: string) => `Économie : ${amount}`,
  oldPrice: (amount: string) => `Ancien prix ${amount}`,
  tag: { offerDuo: 'Offre duo', offerRange: 'Offre gamme complète' },
  facts: { size: 'Contenance', type: 'Type', benefits: 'Bienfaits', need: 'Besoin', contents: 'Contenu' },
  usage: 'Mode d’emploi',
  precautions: 'Précautions',
  inci: 'Ingrédients (INCI)',
  inciHelp: 'Dans l’ordre de l’étiquette.',
  label: { shelfLife: 'Conservation', madeIn: 'Fabrication', contact: 'Contact' },
  /** PAO : durée d'utilisation après ouverture. */
  shelfLife: (duration: string) => `PAO : ${duration}.`,
  contents: { duo: 'Dans ce duo', range: 'Dans cette gamme', seeSheet: 'Voir la fiche' },
  matrix: { title: 'Précautions selon les soins', product: 'Soin', yes: 'Oui', no: 'Non concerné', commonTitle: 'Pour les six soins' },
  sheetHint: 'Le mode d’emploi, les précautions et les ingrédients de chaque soin sont sur sa fiche.',
  offer: { withProduct: 'Les offres avec ce soin', range: 'Toute la gamme, pour moins', see: 'Voir l’offre' },
} as const;
