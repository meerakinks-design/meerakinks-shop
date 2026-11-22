# TODO — mise à niveau Meëra Kinks

## Variantes de produits

- [ ] Ajouter `ProductVariant` avec étiquette unique, SKU facultatif, prix normal/promotionnel optionnels, stock, actif et ordre; publier un produit à variantes seulement avec une variante active.
- [ ] Faire respecter l’héritage ou le remplacement complet du prix, le stock par variante, l’indisponibilité 409 des variantes désactivées/épuisées et la restitution du stock à l’annulation.
- [ ] Permettre la sélection d’une variante dans la fiche produit et dans la feuille d’ajout depuis les cartes; afficher option, prix et quantité dans le panier.
- [ ] Figer l’étiquette de variante dans la commande, le ticket PNG, le reçu PDF, les emails et le message WhatsApp.

## Commandes et clients

- [ ] Livrer l’écran Commandes avec liste, filtres, détail, livraison, paiement, historique et tableau « à traiter aujourd’hui ».
- [ ] Enregistrer un paiement, recalculer le statut, annuler, rembourser, journaliser et restituer le stock sans double restitution.
- [ ] Ajouter la vue clients et relier les actions à l’authentification admin.
- [ ] Conserver l’export Excel/CSV filtré avec lignes « produit — option × quantité » et protection contre l’injection de formules.

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
