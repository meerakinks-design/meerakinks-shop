import { GAMME_KEYS, GAMMES } from '@/content/catalogue';
import { SHOWCASE } from '@/content/vitrine';
import { showcaseGroups, type ShowcaseGroup } from '@/lib/shop/catalogue';
import { GammeDot } from './ShowcaseCard';
import { ShowcaseGrid } from './ShowcaseGrid';

/** Code couleur du dossier : jaune = lavage et pousse, orange = hydratation, marron = nutrition. */
export function GammeLegend() {
  return (
    <ul className="gamme-legend" aria-label={SHOWCASE.legendLabel}>
      {GAMME_KEYS.map((key) => (
        <li key={key}>
          <GammeDot gamme={key} />
          <span>
            <strong>{GAMMES[key].label}</strong> · {GAMMES[key].need}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * La boutique de la landing : la légende des couleurs, puis un groupe par catégorie — chaque soin, puis les duos, puis la gamme
 * complète. Les titres de groupe sont des h3 (le h2 est le titre de la section, dans la landing) et les cartes des h4.
 */
export function ShowcaseGroups({ groups = showcaseGroups() }: { groups?: readonly ShowcaseGroup[] }) {
  return (
    <div className="showcase-groups">
      <GammeLegend />
      {groups.map((group, index) => (
        <section key={group.key} id={`boutique-${group.key}`} className="showcase-group" aria-labelledby={`vitrine-${group.key}`}>
          <header className="showcase-group-head">
            <h3 id={`vitrine-${group.key}`} className="showcase-group-title">
              {group.name}
            </h3>
            <p>{group.description}</p>
          </header>
          <ShowcaseGrid cards={group.cards} priorityCount={index === 0 ? 2 : 0} />
        </section>
      ))}
    </div>
  );
}
