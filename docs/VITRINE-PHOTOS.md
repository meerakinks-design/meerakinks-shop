# Vitrine photo de la boutique (étape 1 : les images)

Livré le 25 novembre 2026. Les six soins sont affichés avec leurs photos, dans une grille asymétrique inspirée de la référence Hello Hello. **Pas de prix, pas de fiche produit, pas de panier** : c'est l'étape suivante.

## Où ça s'affiche
- `/boutique` : titre « Boutique » puis la grille (recherche, filtres et tri masqués : ils dépendent des prix et des catégories).
- Landing, section `#boutique` : titre, texte, la même grille, bouton « Voir toute la boutique ».

## Les produits (`src/content/vitrine.ts`)
| Soin | Type (étiquette) | Contenance | Photos |
|---|---|---|---|
| Velvet | Masque capillaire nourrissant | 250 ml | 2 |
| Slik | Lait capillaire ultra hydratant | 250 ml | 1 |
| Mousse Kinky | Shampoing ambunu & shikakai | 250 ml | 1 |
| Fluffy Kinks | Chantilly capillaire | 120 g | 2 |
| Elixir Wunter | Huile de croissance capillaire | 50 ml | 2 |
| Brume | Spray capillaire hydratant | 200 ml | 1 |

Photos : `public/products/*.webp` (864 px de large, ~50 Ko chacune). Les noms, types et contenances sont recopiés des étiquettes. L'étiquette de l'huile dit « WUNTER » (la scène 3D s'appelle `elixir-winter`) : à confirmer.

## Disposition (`src/styles/showcase.css`)
- **Téléphone** (6 colonnes) : deux photos côte à côte · une grande à droite · deux côte à côte (la seconde plus basse) · une grande à gauche. L'enchaînement se répète tous les six soins.
- **Ordinateur** (12 colonnes) : trois photos par rangée, décalées en hauteur.
- La disposition dépend seulement de la place dans la liste : elle est identique à chaque chargement.

## Deuxième photo
Velvet, Fluffy Kinks et Elixir Wunter ont deux photos. Ordinateur : la deuxième apparaît au survol. Téléphone : un toucher bascule d'une photo à l'autre (deux petits points l'indiquent). Au clavier : le bouton « Voir l'autre photo de … ».

## Passer au catalogue de la base (étape détails et prix)
Dans `src/content/vitrine.ts`, mettre `SHOWCASE_ENABLED` à `false`. `/boutique` et la landing reprennent alors le catalogue du back-office (cartes, panier, fiches, filtres, sections par catégorie) ; rien n'a été supprimé. Tant que la vitrine est active, la landing ne lit pas le catalogue et masque la section « Collections » (ses liens n'auraient plus de cible).

## Fichiers touchés
Nouveaux : `src/content/vitrine.ts`, `src/components/shop/ShowcaseGrid.tsx`, `src/components/shop/ShowcaseCard.tsx`, `src/styles/showcase.css`, `public/products/*.webp` (9), `tests/unit/showcase.test.tsx`, ce document.
Modifiés : `src/app/(boutique)/boutique/page.tsx`, `src/app/(boutique)/page.tsx`, `src/app/(boutique)/layout.tsx` (import du CSS et lien « Collections » masqué).

## Contrôles
- Rendu réel des composants dans Chromium (téléphone 390 px et ordinateur 1440 px) : grille, survol, toucher.
- `tests/unit/showcase.test.tsx` : 9 vérifications passées avec un lanceur provisoire (pas de `node_modules` ici). **À relancer : `npm ci && npm run typecheck && npm test && npm run build`.**
