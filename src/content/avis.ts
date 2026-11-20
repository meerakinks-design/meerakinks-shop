// Avis clients (RM-40). LISTE VIDE AU LANCEMENT : aucun avis n'est jamais inventé.
// Chaque avis DOIT porter la preuve de l'autorisation de publication : le type l'impose, un avis sans
// autorisation ne compile pas. La note n'est renseignée que si elle a été réellement collectée.

export interface Review {
  text: string;
  displayName: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  consent: {
    /** Date de l'autorisation (AAAA-MM-JJ). */
    grantedOn: string;
    /** Comment elle a été obtenue (ex. « capture de la conversation WhatsApp du 2026-12-03 »). */
    proof: string;
  };
}

export const REVIEWS: Review[] = [];
