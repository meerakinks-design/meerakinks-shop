// Titres et descriptions des pages (textes v1.0, §11 : propositions éditoriales, à valider avec le SEO & GEO Expert).
// Le titre « absolu » remplace le modèle « % – Meëra Kinks » : il contient déjà le nom de la marque.
export const SEO = {
  home: {
    title: 'Meëra Kinks – Soins pour cheveux crépus',
    description: 'Découvrez Meëra Kinks : des soins capillaires organisés par besoin pour accompagner votre routine et célébrer vos cheveux crépus.',
  },
  shop: {
    title: 'Boutique Meëra Kinks – Soins capillaires',
    description: 'Explorez les soins Meëra Kinks : hydratation, nettoyage, pousse et nutrition. Trouvez les produits adaptés à votre routine.',
  },
  categories: {
    title: 'Nos soins par besoin – Meëra Kinks',
    description: 'Parcourez les familles de soins Meëra Kinks et choisissez les produits qui correspondent aux besoins de vos cheveux crépus.',
  },
  about: {
    title: 'Notre histoire – Meëra Kinks',
    description: 'Meëra Kinks est née d’une conviction : les cheveux crépus méritent des soins pensés pour leurs besoins et une routine que l’on comprend facilement.',
  },
  credits: {
    title: 'Crédits – Meëra Kinks',
    description: 'Les personnes et les studios derrière le site Meëra Kinks.',
  },
  /** Fiche produit sans description fournie : texte de repli validé. */
  productFallback: (name: string) => `Découvrez ${name}, ses caractéristiques, ses conseils d’utilisation et les informations utiles avant votre commande.`,
} as const;
