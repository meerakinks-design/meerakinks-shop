// Vitrine de la boutique (section #boutique de la landing et fiches /produit/<id>).
//
// Tant que SHOWCASE_ENABLED vaut true, la boutique affiche les produits de src/content/catalogue.ts (dossier produit v1.1) en trois
// groupes — chaque soin, puis les duos, puis la gamme complète — sous forme de grandes photos (grille asymétrique, réf. Hello Hello),
// sans lire la base. Chaque carte mène à sa fiche /produit/<id> : photos en slide, prix, bienfaits, mode d'emploi, précautions,
// ingrédients. La commande n'est pas encore ouverte (voir FICHE.soon dans src/content/fiche-produit.ts).
//
// Passer SHOWCASE_ENABLED à false quand les produits sont dans la base (`npm run db:seed:catalogue`, puis back-office) : la landing
// reprend le catalogue complet (ShopCatalog : panier, recherche, catégories, offres, tri) et les fiches du catalogue.
// Rien n'a été supprimé : les deux modes cohabitent dans le code.

export const SHOWCASE_ENABLED: boolean = true;

export const SHOWCASE = {
  /** Pastille sur la photo d'un duo ou de la gamme complète. */
  offerBadge: 'Offre',
  /** Nom accessible de la légende des couleurs. */
  legendLabel: 'Code couleur : un besoin, une couleur',
} as const;
