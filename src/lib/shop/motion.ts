// Préférence « réduire les animations » : le loader, les transitions de page et le menu animé s'effacent devant elle.
export const INTRO_SEEN_KEY = 'meera-intro-seen';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
