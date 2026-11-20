// « Reçu à télécharger tout de suite » : posé au moment où la commande est enregistrée, lu et consommé par la
// page de confirmation. Sans lui (page rouverte plus tard, lien partagé), le reçu s'affiche mais ne se télécharge
// pas tout seul : on ne relance pas un téléchargement à chaque visite. Le stockage peut être indisponible
// (navigation privée stricte) : dans ce cas, aucun téléchargement automatique, jamais d'erreur.

const PREFIX = 'receipt-fresh:';

type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): FlagStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function markFreshReceipt(reference: string, storage: FlagStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(`${PREFIX}${reference}`, '1');
  } catch {
    /* idem */
  }
}

export function isFreshReceipt(reference: string, storage: FlagStorage | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(`${PREFIX}${reference}`) === '1';
  } catch {
    return false;
  }
}

export function clearFreshReceipt(reference: string, storage: FlagStorage | null = defaultStorage()): void {
  try {
    storage?.removeItem(`${PREFIX}${reference}`);
  } catch {
    /* idem */
  }
}
