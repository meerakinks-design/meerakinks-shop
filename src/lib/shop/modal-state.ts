// État des modals (panier, commande, histoire) porté par l'ADRESSE : #panier, #commande, #notre-histoire.
// Ouvrir ajoute une entrée d'historique, donc le bouton Retour du téléphone ferme le modal
// au lieu de quitter le site. Ce module ne touche à `window` que dans des fonctions appelées par le navigateur.

const EVENT = 'boutique:modal';

/** À appeler après un changement d'adresse fait par le routeur (qui ne déclenche ni popstate ni hashchange). */
export function notifyModalChange(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function getOpenModal(): string {
  return typeof window === 'undefined' ? '' : window.location.hash;
}

export function subscribeToModals(callback: () => void): () => void {
  window.addEventListener('popstate', callback);
  window.addEventListener('hashchange', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('hashchange', callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function openModal(hash: string): void {
  if (window.location.hash === hash) return;
  window.history.pushState({ modal: hash }, '', `${window.location.pathname}${window.location.search}${hash}`);
  window.dispatchEvent(new Event(EVENT));
}

export function closeModal(hash: string): void {
  if (window.location.hash !== hash) return;
  const state = window.history.state as { modal?: string } | null;
  if (state?.modal === hash) {
    window.history.back(); // on avait ajouté l'entrée : on la retire, comme le ferait le bouton Retour
    return;
  }
  // Page ouverte directement sur #panier : on retire simplement l'ancre.
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  window.dispatchEvent(new Event(EVENT));
}
