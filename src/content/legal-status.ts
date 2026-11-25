// Statut de validation des textes de confidentialité (cahier P-22 et §14.2 : « ceci n'est pas un avis juridique »).
// Tant que la valeur est `false`, la politique de confidentialité et la page /cookies :
//   - affichent un bandeau « version provisoire » ;
//   - ne sont pas indexées (noindex).
// Passer à `true` UNIQUEMENT après validation par la cliente ET par un professionnel (landing §21, case « textes
// de la politique de confidentialité, de la bannière cookies et de la page /cookies validés »).
export const PRIVACY_TEXTS_VALIDATED = false;

export const PROVISIONAL_NOTICE = 'Version provisoire : ce texte est en cours de validation par la boutique.';

/** Date de la dernière mise à jour des textes légaux (donnée, jamais écrite à la main dans un texte). */
export const LEGAL_LAST_UPDATED = '24 novembre 2026';
