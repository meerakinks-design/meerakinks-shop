# Catalogue Meëra Kinks : produits, duos, gamme complète (étape 2 : informations et prix)

Livré le 26 novembre 2026, d'après le **Dossier produit v1.1 (25 novembre 2026)** : 6 produits, 3 duos, 1 gamme complète.

## Ce que voit le visiteur
- **Landing, section `#boutique`** : la légende des couleurs (jaune = lavage et pousse, orange = hydratation, marron = nutrition), puis trois groupes dans cet ordre : **Nos soins** (les six produits), **Nos duos** (jaune, orange, marron), **La gamme complète** (une seule grande carte, centrée). Les duos et la gamme portent une pastille « Offre ». **Pas de prix sur les cartes** : ils sont sur les fiches.
- **Fiche `/produit/<id>`** (les dix identifiants du dossier : `mousse-kinky`, `elixir-wunter`, `slik`, `brume`, `fluffy-kinks`, `velvet`, `duo-jaune`, `duo-orange`, `duo-marron`, `gamme-kinks-complete`) :
  - photos en slide, couleur ou type d'offre, nom (police Modak), sous-titre de l'étiquette, **prix**, fiche express (contenance, type, bienfaits) ;
  - un soin : **mode d'emploi** (étapes numérotées), **précautions**, **ingrédients (INCI)** repliables (ouverts au départ), conservation (PAO 12 mois) et fabrication (Made in Côte d'Ivoire, contact) ; puis « Les offres avec ce soin » (son duo et la gamme complète, avec leur économie) ;
  - une offre : les produits réunis (chacun avec son lien, sa contenance, son prix), la matrice « Précautions selon les soins » (page 11 du dossier), puis la gamme complète sur la fiche d'un duo.
- **Règle d'affichage du dossier** : un produit seul n'a qu'un prix. Un duo ou la gamme complète affiche l'**ancien prix barré d'un seul trait**, puis le **prix réel en évidence**, puis « Économie : … FCFA ». L'ancien prix est la somme des prix des produits achetés séparément.
- **Commande** : pas encore ouverte (la fiche dit « Commande bientôt disponible. » et renvoie vers le contact). Aucune offre (prix, stock) n'est annoncée dans les données structurées Google tant que la commande n'est pas ouverte.

## Les prix du dossier (vérifiés par `tests/unit/catalogue.test.ts`)
| Produit | Contenance | Prix |
|---|---|---|
| Mousse Kinky | 250 ml | 6 000 FCFA |
| Elixir Wunter | 50 ml | 4 500 FCFA |
| SLIK | 250 ml | 6 000 FCFA |
| Brume | 200 ml | 6 000 FCFA |
| Fluffy Kinks | 120 g | 4 000 FCFA |
| Velvet | 250 ml | 8 000 FCFA |

| Offre | Ancien prix | Prix réel | Économie |
|---|---|---|---|
| Duo jaune (Mousse Kinky + Elixir Wunter) | 10 500 | 10 000 | 500 |
| Duo orange (SLIK + Brume) | 12 000 | 11 500 | 500 |
| Duo marron (Fluffy Kinks + Velvet) | 12 000 | 11 500 | 500 |
| Gamme Kinks complète (les six) | 34 500 | 32 500 | 2 000 |

## Où modifier quoi
| Je veux changer… | Fichier |
|---|---|
| un nom, un prix, un texte, un mode d'emploi, une précaution, des ingrédients, la composition d'une offre, les photos, l'ordre | `src/content/catalogue.ts` (champ `sortOrder` pour l'ordre) |
| l'ancien prix d'une offre | rien : il est **calculé** (somme des prix des produits). Changer le prix d'un produit met à jour l'ancien prix et l'économie des offres qui le contiennent ; le prix réel d'une offre se règle sur l'offre |
| un intitulé de l'interface (« Mode d'emploi », « Commande bientôt disponible. »…) | `src/content/fiche-produit.ts` |
| la grille, les couleurs, la fiche | `src/styles/showcase.css` (boutique), `src/styles/fiche.css` (fiche) |

Après un changement : `npm test`. Les tests comparent le fichier au dossier (prix, économies, nombre d'étapes et d'ingrédients, matrice des précautions, photos présentes, textes sans prix, validité pour le back-office).

**Tant que la vitrine est active (`SHOWCASE_ENABLED = true`), la boutique et les fiches se lisent dans `src/content/catalogue.ts`, sans base de données : les prix affichés sont ceux de ce fichier.**

## Passer au catalogue de la base (panier et commande)
1. `npm run db:seed:catalogue` : crée les 3 catégories et les 10 produits (statut publié, stock non suivi). Relançable sans danger : **ne modifie aucun produit déjà présent**. Options : `-- --dry-run` (affiche le plan sans rien écrire) et `-- --sync` (réaligne nom, textes, prix, ordre, catégorie et photos du seed sur le fichier ; ne touche jamais au stock, au statut, ni aux photos que la vendeuse a envoyées).
   - Un soin garde son prix. Une offre enregistre **l'ancien prix comme prix normal et le prix réel comme prix promotionnel** : le client paie toujours le prix réel, calculé par le serveur.
   - Les photos sont envoyées chez Cloudinary (`boutique/products/…`, identifiants fixes, pas de doublon) si `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` et `CLOUDINARY_API_SECRET` sont dans `.env`. **C'est nécessaire** : le back-office refuse d'enregistrer un produit dont les photos ne viennent pas de Cloudinary. Sans ces variables, le seed enregistre les photos locales (l'affichage est correct) et le dit ; relancer ensuite avec `--sync`.
2. `SHOWCASE_ENABLED = false` dans `src/content/vitrine.ts` : la landing reprend le catalogue de la base (cartes avec prix, panier, recherche, catégories, offres, tri).
3. Ensuite la base fait foi pour les prix et les photos (back-office). Le mode d'emploi, les précautions et les ingrédients continuent de venir de `catalogue.ts`.
4. Si vous changez le prix d'un produit dans le back-office, pensez à mettre à jour l'ancien prix des duos et de la gamme qui le contiennent (le back-office ne les recalcule pas).

## À confirmer
- **« SLIK »** s'écrit en capitales dans le dossier (la vitrine précédente disait « Slik »). C'est le dossier qui a été suivi.
- **L'adresse `meerakinks@gmail.com`** (étiquettes, dossier) est affichée sur chaque fiche, en lien `mailto`. À retirer de `FicheLabel` (`FicheSections.tsx`) si vous préférez le seul formulaire de contact.
- **L'ordre des soins** est celui de la vitrine (Fluffy Kinks en premier), pas celui du dossier (Mousse Kinky en premier).
- **Le nom de l'huile** : « Elixir Wunter » partout (dossier et étiquette), alors que la scène 3D supprimée s'appelait `elixir-winter`.

## Contrôles faits ici
- `npm run typecheck` propre ; `npm test` : 1 195 réussis, 38 échecs **déjà présents avant ce travail** (`orders.service`, `orders-admin.service`, `customer-data.service`, `cookie-ui` : jamais passés sous vitest, voir `TODO.md`) ; `next build` : réussi, les dix fiches sont prérendues.
- Rendu réel dans Chromium à 390 px et 1 440 px (boutique, fiches d'un soin, d'un duo et de la gamme) : aucun débordement horizontal, aucune image cassée, aucune erreur console.
- **Non vérifié ici : le seed contre une vraie base** (pas de base de données dans cet environnement). Son plan (créer / réaligner / laisser) et les lignes qu'il enregistre sont testés ; à lancer d'abord avec `--dry-run`, sur une base de test.
