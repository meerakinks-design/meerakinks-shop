# Vitrine photo de la boutique

Étape 1 (25 novembre 2026) : les photos. Étape 2 (26 novembre 2026) : **chaque produit, puis les duos, puis la gamme complète**, avec les informations et les prix **sur les fiches** `/produit/<id>`. Le détail de l'étape 2 (prix, règles d'affichage, seed, passage à la base) est dans **`docs/CATALOGUE-PRODUITS.md`**. Les cartes de la grille n'affichent toujours pas de prix.

## Où ça s'affiche
- Landing, section `#boutique` : titre, texte, puis la grille (recherche, filtres et tri masqués : ils dépendent des prix et des catégories). Elle est **juste après la section « guide »**.
- `/boutique` n'est plus une page : elle est redirigée (308) vers `/#boutique` par `next.config.mjs`. Le bouton « Voir toute la boutique » de la landing est retiré (il aurait renvoyé à la même section).

## Les produits (`src/content/catalogue.ts`)
Les dix cartes (six soins, trois duos, la gamme complète) viennent de `src/content/catalogue.ts` (dossier produit v1.1) ; l'ordre est le champ `sortOrder` : **Fluffy Kinks, SLIK, Mousse Kinky, Velvet, Elixir Wunter, Brume**, puis les trois duos, puis la gamme complète. Photos : `public/products/*.webp` (864 px de large, 15 fichiers, moins de 60 Ko chacun). `src/content/vitrine.ts` ne garde que l'interrupteur `SHOWCASE_ENABLED` et les deux libellés de la grille.

## Disposition (`src/styles/showcase.css`)
- **Chaque groupe** (soins, duos, gamme) reprend la disposition à zéro. **Téléphone** (6 colonnes) : deux photos côte à côte · une grande à droite · deux côte à côte (la seconde plus basse) · une grande à gauche. L'enchaînement se répète tous les six soins.
- **Ordinateur** (12 colonnes) : trois photos par rangée, décalées en hauteur.
- La disposition dépend seulement de la place dans la liste : elle est identique à chaque chargement.

## Deuxième photo : sur la fiche, en slide
Plus de deuxième image au survol ni au toucher sur les cartes : une carte = une photo, et elle mène à `/produit/<id>`. Sur la fiche (`ShowcaseProductView`), les photos du soin défilent en slide avec la galerie du catalogue (balayage, flèches, pastilles) quand il en a deux (Fluffy Kinks, Velvet, Elixir Wunter), une seule image sinon. La fiche (étape 2) affiche le prix, la fiche express, le mode d'emploi, les précautions et les ingrédients (voir `docs/CATALOGUE-PRODUITS.md`) et dit « Commande bientôt disponible. » (`FICHE.soon`, `src/content/fiche-produit.ts`). Un identifiant inconnu donne une 404 ; `generateStaticParams` prérend les dix fiches.

## Passer au catalogue de la base (étape détails et prix)
Lancer d'abord `npm run db:seed:catalogue` (voir `docs/CATALOGUE-PRODUITS.md`), puis dans `src/content/vitrine.ts` mettre `SHOWCASE_ENABLED` à `false`. La landing reprend alors le catalogue du back-office : la section `#boutique` devient le composant `ShopCatalog` (cartes, panier, recherche, catégories, offres, tri), suivi des sections par catégorie (`#par-categorie`). Tant que la vitrine est active, la landing ne lit pas le catalogue et masque la section « Collections » (ses liens n'auraient plus de cible).

## Fichiers touchés
Nouveaux (étape 1) : `src/content/vitrine.ts`, `src/components/shop/ShowcaseGrid.tsx`, `src/components/shop/ShowcaseCard.tsx`, `src/styles/showcase.css`, `public/products/*.webp` (9), `tests/unit/showcase.test.tsx`, ce document.
Modifiés : `src/app/(boutique)/page.tsx`, `src/app/(boutique)/layout.tsx` (import du CSS et lien « Collections » masqué). Supprimé : `src/app/(boutique)/boutique/page.tsx` (la boutique est dans la landing, voir `RAPPORT_MODIFICATIONS.md` §17).

## Fichiers de la mise à jour « slide + scène »
Nouveau : `src/components/shop/ShowcaseProductView.tsx`. Modifiés : `ShowcaseCard.tsx` (plus de 2e image, lien vers la fiche), `ShowcaseGrid.tsx`, `vitrine.ts` (ordre, `findShowcaseProduct`), `produit/[slug]/page.tsx` (fiche vitrine tant que `SHOWCASE_ENABLED`), `showcase.css`, `tests/unit/showcase.test.tsx`.

## Contrôles
- Rendu réel des composants dans Chromium (téléphone 390 px et ordinateur 1440 px).
- `tests/unit/showcase.test.tsx` : 12 vérifications passées avec un lanceur provisoire (pas de `node_modules` ici). **À relancer : `npm ci && npm run typecheck && npm test && npm run build`.**

## Fichiers de l'étape 2 (informations et prix)
Nouveaux : `src/content/catalogue.ts`, `src/content/fiche-produit.ts`, `src/lib/shop/catalogue.ts`, `src/components/shop/ShowcaseGroups.tsx`, `FichePrice.tsx`, `FicheSections.tsx`, `src/styles/fiche.css`, `prisma/seed-catalogue.ts`, `public/products/` (6 photos : duos et gamme), `tests/unit/catalogue.test.ts`, `docs/CATALOGUE-PRODUITS.md`.
Réécrits : `src/content/vitrine.ts` (n'a plus les produits), `ShowcaseCard.tsx`, `ShowcaseGrid.tsx`, `ShowcaseProductView.tsx`, `showcase.css`, `tests/unit/showcase.test.tsx`. Modifiés : `(boutique)/page.tsx`, `(boutique)/layout.tsx` (import de `fiche.css`), `produit/[slug]/page.tsx`, `package.json` (script `db:seed:catalogue`).
