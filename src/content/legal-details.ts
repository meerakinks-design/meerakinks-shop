// Informations légales qui ne viennent pas des paramètres de la boutique : à renseigner AVEC les documents de la
// cliente au moment de la validation des textes (cahier §14.2, MD « Textes du site » §9 : « ne pas inventer de raison
// sociale, d'adresse, d'identifiant fiscal… »). `null` = non communiqué : la ligne n'est pas affichée et la page
// annonce que l'information sera indiquée dès sa confirmation. L'identité légale (`legalName`) et l'adresse se
// règlent dans les paramètres de la boutique (colonnes `legalName` et `address`).

export interface LegalDetails {
  /** Numéro d'immatriculation (RCCM) ou équivalent applicable à l'activité. */
  registration: string | null;
  /** Capital social, si la forme juridique en a un. */
  capital: string | null;
  /** Identifiant fiscal (obligatoire à l'affichage si la boutique est assujettie à la TVA : loi 2013-546, art. 5). */
  taxId: string | null;
  /** Directeur ou responsable de la publication du site. */
  publicationDirector: string | null;
}

export const LEGAL_DETAILS: LegalDetails = {
  registration: null,
  capital: null,
  taxId: null,
  publicationDirector: null,
};

/**
 * Hébergeur du site (Vercel). Adresse relevée le 24 novembre 2026 sur plusieurs mentions légales de sites hébergés par
 * Vercel et dans le registre de l'ARIN ; À RECONFIRMER sur vercel.com/legal avant la validation finale.
 */
export const HOST = {
  name: 'Vercel Inc.',
  address: '340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis',
  website: 'https://vercel.com',
} as const;

/** Autorité ivoirienne de protection des données (loi n° 2013-450 du 19 juin 2013). */
export const DATA_AUTHORITY = {
  name: 'Autorité de régulation des télécommunications/TIC de Côte d’Ivoire (ARTCI), direction de la protection des données personnelles',
  email: 'infos-apdp@artci.ci',
} as const;
