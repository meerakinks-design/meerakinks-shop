# TODO — mise à niveau Meëra Kinks

_État au 23 novembre 2026 (boutique-3 : boutique-1 + variantes v0.10 + lot v0.11 + refonte) : voir `Cahier_des_charges_MAJ_v3_0.md` §16 bis, qui fait foi._

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

- [ ] Créer l’écran propriétaire de paramètres de boutique : nom, coordonnées, WhatsApp, emails, acompte, règles de paiement et réseaux.
- [ ] Gérer les zones actives, frais et délais indicatifs, avec les valeurs seed prévues et une source unique pour les textes publics.

## Analytics propriétaire

- [ ] Enregistrer avec consentement les arrivées, pages, boutons, parcours, durée, provenance et localisation approximative sans IP.
- [ ] Dédupliquer/plafonner l’alerte « Nouvelle visite » dans l’outbox email existante.
- [ ] Ajouter l’onglet Analytics du back-office : volume, provenance, géographie, pages, clics, durée et parcours récents.

## Mini-jeu Cosmetic Smash

- [ ] Garder slash tactile/souris, clavier, défilement vertical et durée 30 s.
- [ ] Afficher une traînée de coupe; tout pot croisé est séparé en deux moitiés avec tranche crème, chute et éclaboussure.
- [ ] Ajouter son de coupe et assets GLB de pots génériques documentés dans `public/assets/smash/`.
- [ ] Afficher effets, score 10/20/30 et état de fin/rejouer.

## Charte et livraison

- [ ] Maintenir la palette fermée et le vouvoiement sur les nouveaux écrans.
- [ ] Déclarer `manus-routes.json`, lancer les diagnostics, typecheck, tests et build.
- [ ] Sauvegarder l’itération dans le dépôt canonique Webdev.
