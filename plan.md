# Plan — Meëra Kinks, mise à niveau opérationnelle

## Périmètre

Cette itération transforme la base v0.10 en boutique exploitable au quotidien, sans retirer les fonctions déjà livrées. Elle couvre les variantes de produits, le traitement opérationnel des commandes, les paramètres de boutique, l’analytique propriétaire consentie et la refonte du mini-jeu Cosmetic Smash en jeu de slash où chaque pot touché se sépare en deux.

## Approche d’implémentation

- **Source de vérité serveur** : Prisma/PostgreSQL conserve les variantes, les instantanés de commande, les paiements, les statuts, les zones et les événements analytics. Les montants sont recalculés côté serveur et les mutations restent exposées par Route Handlers `/api/v1/*`.
- **Variantes** : `ProductVariant` porte une étiquette unique par produit, une référence facultative, un prix normal/promotionnel optionnel, le stock, l’état actif et l’ordre. Les services de catalogue et de devis calculent un prix effectif unique (hérité du produit ou entièrement remplacé par la variante). Les lignes de panier sont indexées par produit + variante et les commandes figent l’étiquette.
- **Commandes** : le back-office ajoute une vue « à traiter aujourd’hui », des filtres, le détail d’une commande, les changements de livraison/paiement journalisés, les encaissements, annulations, remboursements et restitution atomique du stock. L’export existant reste branché sur les lignes figées et les variantes.
- **Paramètres** : écran propriétaire avec identité de la boutique, contacts, WhatsApp, email, règles de paiement, acompte, zones, frais et délais indicatifs. Les textes publics relisent cette source unique.
- **Analytics** : événements consentis côté navigateur vers des routes dédiées, sans IP stockée. La session de visite conserve provenance, localisation approximative fournie par l’hébergeur, appareil, pages, clics, durée et parcours. Le back-office expose des agrégats et les dernières visites; l’alerte d’arrivée passe par l’outbox email existante, plafonnée et dédupliquée.
- **Mini-jeu** : conserver le chargement différé, le clavier et `touch-action: pan-y`; enrichir le moteur avec le geste de slash, les événements de coupe et deux moitiés par pot. Ajouter un rendu GLB-compatible visuellement représenté dans le canvas via des assets `.glb` de pots génériques, et un son de coupe local déclenché à la coupe sans bloquer la partie.

## Design

Le projet possède déjà une identité claire et une charte documentée; elle est réutilisée, pas remplacée.

- **Mouvement** : élégance éditoriale Meëra Kinks avec une pointe de jeu tactile spectaculaire, proche d’une animation produit haut de gamme.
- **Principes** : fond beige et marron comme socle, orange réservé aux actions; cartes aérées et coins doux; densité progressive du dashboard; interaction spectaculaire uniquement dans l’aire de jeu.
- **Couleurs** : les six couleurs de la charte restent les seules couleurs de l’interface; les statuts sont différenciés par bordures, libellés et intensité plutôt que par rouge/vert ajoutés.
- **Layout** : navigation latérale compacte sur desktop et cartes empilées sur mobile; les actions critiques restent visibles dans le détail de commande; les réglages sont groupés par source métier.
- **Signatures** : badge « à traiter aujourd’hui », pastilles de variantes, ligne de coupe crème avec deux moitiés qui tombent et traînée de slash.
- **Interaction** : chaque écriture importante donne un retour explicite; les états irréversibles demandent une note et confirment l’effet stock/paiement; le consentement précède toute mesure analytics.
- **Animation** : ressort discret pour les feuilles d’options et les mises à jour de statut; pas d’animation obligatoire lorsque `prefers-reduced-motion` est actif.
- **Typographie** : conserver la hiérarchie existante et les titres animés; informations pratiques, prix et statuts restent lisibles et non décoratifs.
- **Essence de marque** : une boutique capillaire qui transforme un achat WhatsApp dispersé en parcours simple, humain et maîtrisé. Personnalité : chaleureuse, précise, joueuse.
- **Voix** : vouvoiement, phrases courtes, aucune promesse médicale. Exemples : « Choisissez votre option. » / « Délai indicatif : l’équipe vous confirme le délai exact sur WhatsApp. »
- **Logo** : réutiliser les assets reçus et le fallback typographique existant, sans recomposer le logo dans une nouvelle police.
- **Couleur signature** : Orange `#F48128`, réservé aux actions et repères de marque.

## Structure du projet

- `prisma/schema.prisma`, `prisma/migrations/` : modèles, enums et migration des variantes, opérations de commande, paramètres détaillés et analytics.
- `src/server/services/` : prix/stock/commandes, réglages, tracking et agrégats analytics.
- `src/app/api/v1/` : contrats publics, admin, tracking et exports.
- `src/components/shop/` : panier, sélection de variantes, checkout, ticket et mini-jeu.
- `src/components/admin/`, `src/app/admin/(protege)/` : navigation, tableaux de bord, commandes, clients, livraison, paramètres et analytics.
- `src/lib/smash/`, `public/assets/` : moteur de slash, rendu, sons et modèles GLB de pots.
- `manus-routes.json` : routes publiques et back-office déclarées pour Preview.

## Contraintes

Les données partagées de développement et de production restent sensibles : les vérifications privilégient typecheck, tests et inspection de code; aucun test destructif ne sera exécuté sur des données réelles. Les fournisseurs externes (Neon, Cloudinary, Resend, Vercel) restent optionnels tant que leurs secrets ne sont pas présents.
