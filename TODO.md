# TODO — mise à niveau Meëra Kinks

_État au 25 novembre 2026 (boutique-4 relue dans le code + mise à jour du 25 novembre) : voir l'encart « État réel au 25 novembre » de `Cahier_des_charges_MAJ_v3_0.md`. **Le code fait foi** : les cases ci-dessous ont été recochées d'après lui._

## Catalogue Meëra Kinks (26 novembre 2026) : produits, duos, gamme complète

- [x] Boutique en trois groupes (chaque soin, les duos, la gamme complète) et dix fiches `/produit/<id>` avec prix, bienfaits, mode d'emploi, précautions, ingrédients (dossier produit v1.1) : `docs/CATALOGUE-PRODUITS.md`.
- [x] Prix des offres calculés (ancien prix = somme des prix séparés) et vérifiés par `tests/unit/catalogue.test.ts` ; `npm run db:seed:catalogue` prêt (`--dry-run`, `--sync`).
- [x] `package-lock.json` resynchronisé (`npm ci` échouait : `three` et `lenis` absents du lock) ; `three`, `lenis` et `@types/three` retirés (plus aucun import).
- [ ] **Lancer `npm ci && npm run typecheck && npm test && npm run build`** chez vous (fait ici : typecheck propre, build réussi, 38 échecs de tests déjà présents avant).
- [ ] Ouvrir la commande : lancer `npm run db:seed:catalogue -- --dry-run` puis sans l'option (Cloudinary configuré dans `.env`), puis `SHOWCASE_ENABLED = false`. **Jamais essayé contre une vraie base.**
- [ ] Valider avec la cliente : « SLIK » en capitales, l'adresse `meerakinks@gmail.com` affichée sur les fiches, l'ordre des soins (Fluffy Kinks en premier).
- [ ] Recharts 2.15 est signalé obsolète par npm (la version 3 existe) : à planifier, sans urgence.

## Mise à jour du 25 novembre (boutique-4 → boutique-5)

- [x] **Courbes des indicateurs avec Recharts** : tableau de bord (commandes par jour, encaissé par jour, cumul du mois, sélecteur 7 / 30 jours) et Analytics (visiteurs, visites, pages vues, durée moyenne). Chaque tuile ouvre sa courbe.
- [x] **Barre latérale sur ordinateur (≥ 900 px)**, repliable en rail d'icônes (choix mémorisé), compte en bas avec menu ; barre du bas du téléphone sur **une seule rangée** (icônes seules sous 576 px).
- [x] **En-tête du back-office identique à celui de la landing** (logo, bouton orange « Boutique », bouton carré du compte).
- [x] **Analytique maison active par défaut** (`NEXT_PUBLIC_HOME_ANALYTICS_ENABLED=0` la coupe).
- [x] **Écran Paramètres** (propriétaire) et **bouton « Renvoyer »** sur les emails abandonnés.
- [x] Sélecteur de période d'Analytics : il s'affichait « 7 jours30 jours90 jours » sans espace.
- [ ] **`npm install`** (ajoute `recharts` et met à jour `package-lock.json`), puis `npm run typecheck`, `npm test`, `npm run build` : rien n'a pu tourner dans l'environnement de la mise à jour (pas de réseau). Seuls les calculs de courbes, la validation des paramètres, le service des statistiques et le rendu des composants ont été essayés avec des doublures.
- [ ] Essayer sur le site publié : courbes (survol, toucher), repli de la barre latérale, enregistrement des paramètres, bouton « Renvoyer », première mesure d'une visite avec consentement.
- [ ] Vérifier que `public/brand/favicon-icon.png` est bien une icône carrée lisible (elle sert de pastille quand la barre latérale est repliée).

## Refonte du 23 novembre (boutique-3)

- [x] Menu, panier, commande et confirmation : un seul mécanisme de modal « rideaux » par la droite (`CurtainModal`) ; plein écran sur téléphone (la bande du site à gauche a été retirée).
- [x] Confirmation de commande en modal (`#confirmation`) ; la page `/commande/confirmation` est conservée.
- [x] Pied de page en trois parties : logo, signature et icônes · informations · navigation ; jeu pleine largeur (carré sur téléphone) ; filigrane « MEËRA KINKS » en texte ; crédit « Créé par AKATech Studio » (logo au survol).
- [x] Pages `/a-propos` (ancien modal « Notre histoire ») et `/credits`.
- [x] Effet élastique : titres et surtitres de toutes les sections ; descriptions fixes.
- [x] Formulaire de contact intelligent + `POST /api/v1/contact` (Resend).
- [x] Commande : champ « Nom complet » et case « J'ai vérifié les informations de ma commande » ; migration `20261123000000_customer_full_name` ; anciens reçus relus.
- [x] Textes du document v1.0 (landing, FAQ, panier, commande, erreurs, SEO).
- [ ] **Lancer `npm ci`, `npm run typecheck`, `npm test`, `npm run build` puis `npm run e2e:visual`** (rien de cela n'a tourné après la fusion).
- [ ] Appliquer la migration `customer_full_name` sur une vraie base et ouvrir un ancien reçu.
- [ ] Essayer le formulaire de contact avec un vrai compte Resend.
- [ ] Valider avec la cliente les textes du document v1.0 (P-67).

## Variantes de produits

- [x] Ajouter `ProductVariant` avec étiquette unique, SKU facultatif, prix normal/promotionnel optionnels, stock, actif et ordre; publier un produit à variantes seulement avec une variante active.
- [x] Faire respecter l’héritage ou le remplacement complet du prix, le stock par variante, l’indisponibilité 409 des variantes désactivées/épuisées et la restitution du stock à l’annulation.
- [x] Permettre la sélection d’une variante dans la fiche produit et dans la feuille d’ajout depuis les cartes; afficher option, prix et quantité dans le panier.
- [ ] (vérifier avec une vraie base) Figer l’étiquette de variante dans la commande, le ticket PNG, le reçu PDF, les emails et le message WhatsApp.

## Commandes et clients

- [x] Livrer l’écran Commandes avec liste, filtres, détail, livraison, paiement, historique et tableau « à traiter aujourd’hui » (code 0.11 ; à essayer sur une vraie base).
- [x] Enregistrer un paiement, recalculer le statut, annuler, rembourser, journaliser et restituer le stock sans double restitution (code 0.11).
- [x] Ajouter la vue clients et relier les actions à l’authentification admin.
- [x] Identifiants admin depuis `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` et portail de connexion à la charte.
- [ ] Lancer `npm ci`, `npm run typecheck`, `npm test` et `npm run build` : les tests du code 0.11 n’ont jamais tourné sous vitest.
- [x] Conserver l’export Excel/CSV filtré avec lignes « produit — option × quantité » et protection contre l’injection de formules.

## Paramètres et livraison

- [x] Écran propriétaire de paramètres de boutique : nom, coordonnées, WhatsApp, emails, acompte, règles de paiement et réseaux (25 nov.).
- [x] Zones actives, frais et délais indicatifs, textes de livraison : écran `/admin/livraison` présent dans le code (à essayer sur une vraie base).

## Analytics propriétaire

- [x] (présent dans le code, à essayer) Enregistrer avec consentement les arrivées, pages, boutons, parcours, durée, provenance et localisation approximative sans IP.
- [x] (présent dans le code, à essayer) Dédupliquer/plafonner l’alerte « Nouvelle visite » dans l’outbox email existante.
- [x] Onglet Analytics du back-office (courbes Recharts ajoutées le 25 nov.) : : volume, provenance, géographie, pages, clics, durée et parcours récents.

## Mini-jeu Cosmetic Smash

- [x] (présent dans le code, à essayer sur appareil) Garder slash tactile/souris, clavier, défilement vertical et durée 30 s.
- [x] (présent dans le code, à essayer sur appareil) Afficher une traînée de coupe; tout pot croisé est séparé en deux moitiés avec tranche crème, chute et éclaboussure.
- [x] (présent dans le code, à essayer sur appareil) Ajouter son de coupe et assets GLB de pots génériques documentés dans `public/assets/smash/`.
- [x] (présent dans le code, à essayer sur appareil) Afficher effets, score 10/20/30 et état de fin/rejouer.

## Charte et livraison

- [ ] Maintenir la palette fermée et le vouvoiement sur les nouveaux écrans.
- [ ] Déclarer `manus-routes.json`, lancer les diagnostics, typecheck, tests et build.
- [ ] Sauvegarder l’itération dans le dépôt canonique Webdev.
