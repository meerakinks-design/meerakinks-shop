# Boutique e-commerce WhatsApp — v0.10

Livré : back-office (produits, catégories, photos), vitrine (landing, boutique, catégories, fiche produit, panier en modal avec devis du serveur) **et, depuis la v0.6, la commande** : formulaire en modal, `POST /api/v1/orders`, enregistrement des commandes, page de confirmation et message WhatsApp.
**Depuis la v0.7** : chaque commande déclenche l'envoi des emails (alerte à la vendeuse avec le **reçu PDF**, accusé au client) avec reprise automatique ; le reçu PDF est aussi servi au back-office.
**Depuis la v0.9** : l'**effet « spaghetti »** (D-18, D-29) anime les titres et les textes de la landing, repris de l'animation des titres de Rabbit Shop (voir « Effet spaghetti » plus bas). Rien d'autre n'a changé : ni schéma, ni API.
**Depuis la v0.10** : le **mini-jeu « Cosmetic Smash »** du footer (D-19, P-42), un **contrôle visuel dans Chromium** (téléphone et ordinateur) qui a fait trouver et corriger quatre défauts (voir « Contrôle visuel »), et deux documents de référence à jour : cahier v2.6.1 et landing v1.3.1 (dans `docs/`).
Les écrans de gestion des commandes (statuts, paiements, annulation) arrivent à l'étape suivante (voir `docs/ARBORESCENCE.md`).

## État de la livraison

| Contrôle | Résultat |
|----------|----------|
| Schéma Prisma validé (Prisma 5.22) | ✅ |
| `tsc --noEmit` (TypeScript strict) | ✅ |
| Tests (`npm test`) : 463 tests, dont la requête SQL de limitation exécutée sur un vrai Postgres en mémoire, la signature Cloudinary vérifiée sur l'exemple officiel et, pour la commande, idempotence, survente, prix falsifié, zones et frais (base simulée) ; pour les emails, reprises, abandon, réservation anti-doublon, gabarits échappés, client Resend (réseau simulé) et contenu du PDF relu en texte | ✅ |
| `next build` (commande activée) | ✅ |
| **Migration SQL** | ✅ présente dans le dépôt (`prisma/migrations/20261120000000_init`) ; je ne l'ai pas rejouée contre une vraie base |
| Testé contre une vraie base Neon et un vrai compte Cloudinary | ❌ non (logique couverte par des tests avec base et Cloudinary simulés ; la **commande** n'a jamais tourné contre un vrai PostgreSQL) : voir « À vérifier à la main » |
| Emails testés contre un **vrai compte Resend** et un vrai lecteur de messagerie | ❌ non (client Resend testé avec un réseau simulé, d'après la documentation officielle) : voir « À vérifier à la main » 18 à 25 |
| Mise en page du reçu PDF | ✅ un exemple rendu en image et relu à l'œil ; pas de contrôle sur un vrai téléphone |
| **v0.9 — effet « spaghetti »** : 31 tests ajoutés (courbe, CSS, découpe, rendu serveur) et test de rendu de la vitrine adapté | ✅ passés, mais **avec un lanceur provisoire** (pas de `node_modules` ni de réseau dans mon environnement) ; **relance `npm test` et `npm run typecheck`** |
| **v0.10 — `tsc --noEmit`** | ✅ propre. La v0.9 livrée avait une erreur de typage dans `tests/unit/spaghetti.test.ts` (corrigée : `match[1]` pouvait être `undefined`) |
| **v0.10 — tests (`npm test`)** | ✅ **587 tests** (528 hérités de la v0.9 + 59), lancés avec le vrai Vitest. Nouveaux : moteur du jeu (26), couleurs (6), éclats (7), dessin des pots (8), rendu du bloc et du footer (7), requête des couleurs (3), barre collée (2). Le moteur a été vérifié par **mutation** (le casser volontairement fait échouer les tests) |
| **v0.10 — contrôle dans Chromium** (`npm run e2e:visual`) | ✅ **179 vérifications sur 179**, téléphone 390 × 844 et ordinateur 1440 × 900, sur les vraies pages avec des données de démonstration. Captures relues à l'œil. **Pas** sur un vrai téléphone, **pas** sur Safari ni Firefox |
| **v0.10 — `next build`** (commande activée, sans base) | ✅ ; le code du jeu est un chunk à part (`smash.*.js`, 25,8 Ko), **absent** du premier chargement de la landing |
| Déployé | ❌ non |

## Démarrage local

1. `npm ci`
2. Crée un projet **Neon** et une branche **`dev`** (ne teste jamais sur la base de production).
3. Copie `.env.example` en `.env.local` et renseigne :
   - `DATABASE_URL` : URL **poolée** (hôte contenant `-pooler`)
   - `DIRECT_URL` : URL **directe**
4. **Migration** (génère le SQL, à commiter) :
   ```bash
   npx prisma migrate dev --name init
   ```
   Si Prisma se plaint de la base « shadow », utilise `DIRECT_URL` et vérifie que le rôle Neon peut créer une base.
5. **Seed** : renseigne dans `.env.local` `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (12 caractères minimum), puis :
   ```bash
   npm run db:seed
   ```
   Ensuite **supprime `SEED_ADMIN_PASSWORD`** de `.env.local` : le mot de passe n'existe qu'en haché, en base.
   Options : `SEED_DEMO=1` (3 produits de démo, refusé en production), `SEED_RESET_PASSWORD=1` (réinitialise un compte existant et révoque ses sessions).
6. `npm run dev`, puis ouvre `/admin/login`.

## Vitrine (v0.5)

| Page | Adresse |
|---|---|
| Landing (hero, bandeau, collections, boutique, best-sellers, histoire, focus, pourquoi nous, avis, Instagram, FAQ, contact) | `/` |
| Boutique : recherche, filtre par catégorie et offres, tri | `/boutique` |
| Catégories | `/categories`, `/categorie/[slug]` |
| Fiche produit | `/produit/[slug]` |
| CGV, CGU, mentions légales, confidentialité | pages **provisoires, non indexées** : le texte doit venir de la cliente |
| Plan du site, robots | `/sitemap.xml`, `/robots.txt` |

- **Section Boutique de la landing** : s'il y a des catégories actives avec des produits publiés → une section sticky par catégorie avec carrousel ; sinon → grille asymétrique stable. Les produits sans catégorie vont dans « Autres produits ».
- **Panier** : modal natif `#panier`, identifiants et quantités seulement dans le navigateur, **prix toujours relus par le serveur** (`POST /api/v1/cart/quote`). Le bouton « Commander » est **désactivé** tant que `NEXT_PUBLIC_CHECKOUT_ENABLED` n'est pas à `1` (voir « Commande »).
- **Aucun lien mort** : « Collections », « Contact » et le lien « best-sellers » n'apparaissent que si leur section existe. Une section sans données n'est pas affichée (avis, Instagram, focus produit, contact).
- **Aucun contenu inventé** : listes d'avis et de publications Instagram **vides** ; un test échoue si un champ entre crochets reste dans `src/content/`.
- **Pour voir la vitrine remplie en local** : `SEED_DEMO=1 npm run db:seed` (3 produits de démo dont un « focus ») puis `npm run dev`. Les liens de contact se règlent par `SEED_*` : **il n'existe pas encore d'écran Paramètres** (étape 10).
- **Build sans base (CI)** : `SKIP_DB_AT_BUILD=1 npm run build`. Les listes sont alors vides. **Jamais pour la production.**

## Changements de la v0.4 (à connaître avant de migrer)

Le schéma a changé **avant** la première migration : `prisma migrate dev --name init` part directement de la version alignée.
Statuts de livraison et de paiement séparés (7 statuts de paiement), produit avec statut Brouillon / Publié / Archivé, redirections de slug (`SlugRedirect`), `Receipt` par commande avec données figées, couleur et archivage des catégories. Adresses publiques : `/boutique`, `/categorie/[slug]`, `/produit/[slug]`, `/commande/confirmation`.

## Commande (v0.6)

- **Activation** : `NEXT_PUBLIC_CHECKOUT_ENABLED=1` ouvre le bouton « Commander » **et** `POST /api/v1/orders` (qui répond 503 sinon). À activer après les vérifications « Commande » ci-dessous.
- **Parcours** : panier → « Commander » → modal `#commande` (coordonnées, livraison, note de paiement visible avant l'envoi) → `POST /api/v1/orders` → page `/commande/confirmation?ref=CMD-…` avec le bouton WhatsApp. Le panier n'est vidé qu'après succès ; un échec réseau garde toutes les informations saisies.
- **Dans une seule transaction**, le serveur : relit les produits **publiés** (aucun prix reçu n'est utilisé), réserve le stock de façon atomique (`stock ≥ quantité` dans l'UPDATE), retrouve ou crée le client par téléphone, résout la zone et les frais, calcule sous-total, frais, total et acompte, puis crée commande + lignes figées + historique + reçu figé + lignes d'envoi d'email. Une erreur annule tout, réservations de stock comprises.
- **Idempotence** : une clé par tentative (créée à l'envoi, conservée si le réseau échoue, changée si le panier change). Le même envoi rejoué renvoie la même commande (200) ; la même clé avec un autre téléphone ou d'autres articles est refusée (409).
- **Destination** : liste des zones **actives** quand il en existe pour la zone choisie ; sinon saisie libre et frais « à confirmer » (aucune zone ni aucun tarif inventé). Rien n'est seedé pour l'intérieur et l'étranger tant que la cliente n'a pas répondu.
- **Téléphone** : indicatif en liste (Côte d'Ivoire par défaut) ou « Autre pays ». Un numéro ivoirien compte 10 chiffres, le 0 initial compris (numérotation du 31 janvier 2021).
- **Protections** : contrôle d'origine, limite par IP (10 / 10 min) et par téléphone (5 / h), champ piège (faux succès, rien d'enregistré), corps JSON limité, validation identique côté navigateur et côté serveur, journal sans donnée personnelle. La page de confirmation est `noindex`, sans `referrer`, et limitée à 30 consultations / 10 min par IP : la référence (40 bits) en est le seul secret.
- **Emails** : les lignes d'envoi (vendeuse ; client si email) sont créées avec la commande en statut `PENDING` ; voir « Emails et reçus PDF » ci-dessous.
- **Test au `curl`** (avec la commande activée, un produit publié et `npm run dev`) :

```bash
curl -s -X POST http://localhost:3000/api/v1/orders -H 'Content-Type: application/json' -d '{
  "idempotencyKey": "essai-0123456789abcdef",
  "items": [{ "productId": "<id d'un produit publié>", "quantity": 1 }],
  "firstName": "Awa", "lastName": "Koné", "phoneDialCode": "225", "phone": "07 00 00 00 00",
  "zoneType": "ABIDJAN", "placeName": "Cocody", "address": "Riviera Palmeraie, rue des jardins"
}'
```

Le même appel répété renvoie la même référence (200 au lieu de 201).

## Emails et reçus PDF (v0.7)

- **Ce qui part** : à chaque commande, une **alerte à la vendeuse** (email de notification des paramètres) avec le **reçu PDF en pièce jointe**, le lien WhatsApp du client et les étapes à suivre ; et, si le client a donné un email, un **accusé de réception** (récapitulatif + texte de paiement validé de l'annexe B, **sans PDF** : le reçu se remet après confirmation). Aucun délai de livraison ni paiement « reçu » n'y est annoncé.
- **Comment** : la ligne d'envoi naît dans la transaction de la commande. Juste après l'enregistrement, le serveur **tente l'envoi** (4 s au plus par email, jamais bloquant : une commande n'échoue jamais à cause d'un email). Ce qui échoue est repris par le cron `GET /api/cron/send-emails`. Si Resend est lent, le client peut attendre jusqu'à 4 à 6 s avant la page de confirmation (avec Next 15, ce serait un `after()`).
- **Reprises** : 6 tentatives au plus, aux délais 1, 5, 15, 60 puis 180 min, puis abandon (`FAILED`, erreur lisible sur la ligne). Erreur définitive (adresse refusée, 422) : abandon immédiat. Clé ou domaine Resend invalide (401/403) : on réessaie, c'est une configuration qui se corrige. Chaque ligne est **réservée** par une mise à jour conditionnelle : la tentative immédiate et le cron ne peuvent pas envoyer deux fois le même email ; une réservation interrompue expire après 10 min. Limite connue : si le serveur s'arrête après l'envoi mais avant l'écriture du résultat, l'email peut partir une seconde fois.
- **Sans configuration** : sans `RESEND_API_KEY` **et** `EMAIL_FROM` valide, rien n'est envoyé ni modifié ; les emails restent `PENDING` et partent dès que les variables existent.
- **Variables** : `RESEND_API_KEY`, `EMAIL_FROM` (domaine vérifié dans Resend, SPF et DKIM : sinon Resend ne livre qu'à l'adresse du compte Resend), `CRON_SECRET` (16 caractères minimum ; la route est **fermée** sans lui). Une variable laissée vide, comme dans `.env.example`, équivaut à une variable absente.
- **Cron** : `vercel.json` planifie `0 6 * * *` (une fois par jour, la seule fréquence que le plan Hobby accepte : il refuse le déploiement sinon). **En production (plan Pro), remplace par `*/10 * * * *`.** Lancement à la main : `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/send-emails` (renvoie un bilan : envoyés, à réessayer, abandonnés).
- **Reçu PDF** : généré à la demande à partir des données **figées** de la commande et des paiements enregistrés, jamais stocké. Avant tout paiement : « Paiement non reçu ». Les remboursements sont soustraits, les paiements annulés ignorés. Le pied de page porte « Reçu de commande — ne constitue pas une facture » (question 8 du cahier encore ouverte). La police standard ne connaît que le latin occidental : emoji et autres alphabets sont remplacés par « ? » au lieu de faire échouer le document. Pour l'ouvrir : connecte-toi au back-office puis ouvre `/api/v1/admin/orders/<référence CMD-… ou identifiant>/receipt`.
- **Changement de statut** : le gabarit d'email existe, mais rien ne le déclenche avant l'écran des commandes (étape suivante).

## Effet « spaghetti » (v0.9)

- **Quoi** : les titres (h1, h2) arrivent **lettre par lettre**, les textes courants (surtitres, paragraphes d'introduction, sous-titres, descriptions) **mot par mot**, avec le rebond élastique des titres de Rabbit Shop.
- **Reprise exacte du code de Rabbit** (`lib/useGsapLenis.ts`, boucle `.elastic-title`) : départ 60 px plus bas, échelle 0,5, transparent ; arrivée en 1,3 s ; 15 ms entre deux lettres ; courbe `elastic.out(0.75, 0.3)` ; déclenchement quand le titre atteint 85 % de la hauteur de l'écran.
- **Sans GSAP** : la courbe de GSAP est recalculée (`src/lib/shop/spaghetti.ts`, `elasticOut`) puis écrite en CSS `linear()` (`src/styles/spaghetti.css`). Aucune dépendance ajoutée, aucun `package-lock.json` modifié. Un test relit le CSS et le compare à la courbe calculée : elle ne peut pas dériver.
- **Le texte complet est dans le HTML** dès le rendu serveur : lisible sans JavaScript, par un robot et par un lecteur d'écran (le titre garde un `aria-label` complet, les lettres sont masquées). Un mot n'est jamais coupé en fin de ligne (chaque mot est un bloc insécable).
- **Comment ça démarre** : Hero = dès l'affichage, sans aucun délai (Rabbit en met un de 0,9 s : non repris) ; ailleurs, un texte encore sous la ligne des 85 % de l'écran est masqué puis joué à son arrivée ; un texte déjà visible reste tel quel. Il se rejoue s'il repasse sous l'écran puis revient.
- **Mouvement réduit** (réglage du système) et **impression** : aucun effet, le texte s'affiche tel quel. **Téléphone** : effet allégé (durée et décalage × 0,75). **Navigateur sans `linear()`** : un rebond simple de repli.
- **Où** : `components/shop/Spaghetti.tsx` (composant) · `LandingSections.tsx` (Hero, Collections, Boutique, Best-sellers, Histoire, Focus, Pourquoi nous, Avis, Instagram, FAQ, Contact, appel final) · fiche produit (« À propos de ce produit »).
- **Pas concernés** (exceptions de la landing §26) : prix et montants, libellés de boutons et de formulaires, messages d'erreur, pages légales, contenu du panier, réponses de la FAQ, avis réels, titres de catégories venus de la base, titres de navigation du pied de page.
- **Pas encore** : le titre du pied de page et celui du mini-jeu (le mini-jeu n'existe pas encore, étape 13) ; l'**image qui flotte près de la lettre survolée** (option laissée de côté pour l'instant).

## Mini-jeu « Cosmetic Smash » (v0.10)

Dans le footer (donc sur toutes les pages qui en ont un). Cahier §4.6, D-19, P-42 ; textes validés : landing §15.

- **Principe** : des pots cosmétiques sont lancés depuis le bas du terrain, le visiteur les touche, ils éclatent (éclats de verre, éclaboussure de crème, points qui montent). 30 secondes. Trois tailles : **les plus petits rapportent le plus** (10 / 20 / 30 points). Les pots reprennent les **couleurs des catégories** de la boutique (palette de repli si aucune).
- **Moteur séparé du dessin** : `src/lib/smash/engine.ts` ne connaît ni le navigateur ni le canvas (physique, score, chronomètre, pause, toucher, balayage, clavier). Aléatoire et temps sont injectés : 26 tests.
- **Pots dessinés en canvas** (`pots.ts`) : pot de crème, flacon pompe, compte-gouttes, tube, bouteille ; verre, plastique et métal construits avec des dégradés, reflets, ombres. Génériques : aucune marque, aucun texte. `npm run e2e:pots` régénère une planche-contact pour les juger à l'œil.
- **Chargement** : le code du jeu (`game.ts`) est importé quand le footer approche (700 px avant), pas avant ; pas de préchargement en mode « économie de données ». **Le jeu ne démarre qu'au clic sur « Jouer »** : avant, ni canvas ni boucle d'animation.
- **Accessibilité** : avec « réduire les animations », le bouton disparaît et le message validé s'affiche (réglé en CSS, sans clignotement ; le code n'est même pas chargé). Clavier : **Espace ou Entrée** casse le pot le plus bas ; « Pause » et « Recommencer » sont de vrais boutons. Pause automatique si l'onglet est masqué ou si le jeu sort de l'écran (jamais de reprise surprise). Annonces pour les lecteurs d'écran : pause, reprise, fin de partie.
- **Le défilement n'est jamais bloqué** : `touch-action: pan-y`, aucun `preventDefault` sur les gestes. Sur téléphone, un **toucher** ou un **balayage horizontal** joue ; un glissement vertical fait défiler la page.
- **Pas de son** dans cette version (« son désactivé par défaut » : il n'y en a pas). Aucun bouton ajouté, les libellés n'étant pas validés.
- **Valeurs à régler 🟡** : toutes dans `SMASH` (`engine.ts`) : durée, tailles, points, cadence des pots, gravité.
- **Textes à valider** (ajoutés par le code, absents de la landing §15, dans `content/landing.ts` → `smash`) : « Reprendre » (bouton après Pause), l'aide « Touchez ou cliquez les pots… Au clavier : Espace ou Entrée. », le nom de la zone pour les lecteurs d'écran, et les annonces « Partie en pause. » / « Partie reprise. ».
- **Écart entre les documents** : la landing §15 dit « rien n'est chargé tant que le jeu n'est pas lancé » ; le cahier §4.6 dit « chargement différé quand le footer approche ». J'ai suivi le cahier (et ta consigne) : le code se charge à l'approche du footer, le jeu ne démarre qu'au clic.

## Contrôle visuel dans Chromium (v0.10)

`npm run e2e:visual` joue les **vraies pages** dans un vrai Chromium, au format téléphone et ordinateur, **sans base de données** : `E2E_FAKE_DATA=1` (posé par le script) remplace cinq services de lecture (`e2e/fakes/`) par des données de démonstration (`e2e/fixtures.ts`). Refusé pour un build de production. Les photos Cloudinary sont remplacées par des dessins. Prérequis : `npx playwright install chromium`. `E2E_ONLY=jeu,ticket` (liste de scénarios : `landing`, `produit`, `panier`, `ticket`, `jeu`) ne joue qu'une partie. Sorties : `e2e/output/` (captures, `report.json`), code de sortie 1 en cas d'échec.

Ce qui est vérifié : fiche produit (galerie, flèches, pastilles, balayage au doigt, quantité), barre d'achat collée, panier en feuille (ancrage, quantités, Échap, `#panier`), commande → confirmation → imprimante à ticket (étapes, **PNG téléchargé tout seul, une seule fois**, pas de nouveau téléchargement à la réouverture, mouvement réduit), mini-jeu complet (partie de 30 s comprise), erreurs de console et de réseau.

**Quatre défauts trouvés et corrigés :**
1. **Barre d'achat collée sur la landing** : elle s'affichait dès le haut de la page (à 7 000 px de son produit) et restait par-dessus tout, **footer compris** (liens légaux masqués). Prévue pour la fiche produit seulement (cahier §4.3) : désactivée sur la landing (`stickyBar={false}`).
2. **Barre collée sur la fiche** : recouvrait aussi le pied de page. Elle se range maintenant quand le footer est à l'écran.
3. **`tsc` en erreur** dans `tests/unit/spaghetti.test.ts` (livré en v0.9).
4. Mes premiers éclats du jeu étaient trop pâles sur le fond clair : contraste, tailles et forme de la crème revus après une planche (`npm run e2e:burst`).

**À savoir** : sur un petit téléphone (390 × 844), le bouton « Ajouter au panier » de la fiche est sous la ligne de flottaison au chargement ; la barre collée s'affiche donc tout de suite (le code l'affiche dès que le bouton n'est pas à l'écran). Le cahier dit « dès que le bouton principal sort de l'écran » : **à trancher** (voir décision 023).

## Médias (Cloudinary)

**Tout média passe par Cloudinary : rien n'est stocké sur le disque du serveur** (système de fichiers éphémère sur Vercel).

### 1. Envois depuis le back-office
1. Crée un compte Cloudinary et renseigne dans `.env.local` : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
2. Le navigateur envoie les fichiers **directement à Cloudinary** avec une signature fournie par `POST /api/v1/admin/uploads/sign` (valable 1 h, administrateur connecté, 60 signatures/heure). Le secret ne quitte jamais le serveur, et un fichier de téléphone ne passe pas par Vercel (limite de 4,5 Mo par requête).
   - `kind: "image"` (défaut) : dossier `boutique/products`, formats **JPG, PNG, WebP, GIF, AVIF** (8 Mo max côté interface).
   - `kind: "video"` : dossier `boutique/videos`, formats **WebM, MP4, MOV** (100 Mo max). Prêt côté serveur et client (`uploadMediaToCloudinary`) ; le formulaire produit n'envoie pour l'instant que des photos.
   - SVG jamais accepté depuis le back-office (un SVG peut embarquer du script). Cloudinary vérifie le format sur le contenu réel du fichier, pas sur l'extension.
3. À l'enregistrement, le serveur n'accepte que des images de **ton** compte et de **ton** dossier : une URL externe est refusée.
4. L'affichage se fait depuis Cloudinary (`res.cloudinary.com`, format et qualité automatiques via `f_auto,q_auto`). Sans les variables, tout fonctionne sauf l'ajout de médias : « Le service d'images n'est pas configuré ».

### 2. Médias du dossier `public/` (logo…)
- `npm run media:sync` (`scripts/upload-cloudinary.js`) envoie `public/` vers Cloudinary dans `meera/public/…` : images (png, jpg, webp, gif, avif, svg…), vidéos (webm, mp4, mov…), sons (mp3, wav…) et, à défaut, tout autre fichier en « raw ». `--force` renvoie tout, `npm run media:sync:dry` simule. Relançable sans doublon.
- Le site les lit avec `cld('/brand/logo-meera-kinks.png')` (`src/lib/cloudinary-static.ts`), comme `cld()` de rabbit. La configuration (dossier racine, formats, fichiers locaux) est dans `config/cloudinary-media.json`, lue par le script ET par le site.
- **Restent locaux** : les polices (`public/fonts/`) et les icônes de site (`/favicon.ico`, `brand/favicon-icon.png`, `brand/apple-touch-icon.png`), réclamées par le navigateur avant tout le reste.
- Ordre de mise en ligne : 1) `npm run media:sync`, 2) renseigner `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (même valeur que `CLOUDINARY_CLOUD_NAME`) sur Vercel, 3) redéployer. Sans cette variable, le site sert les fichiers locaux.
- La CSP autorise `res.cloudinary.com` en `img-src` et `media-src`, `api.cloudinary.com` en `connect-src`.

Limite connue : un média envoyé puis retiré **avant** d'enregistrer le produit reste chez Cloudinary (non référencé). À nettoyer plus tard par une tâche planifiée.

## Interface et animations

- **Loader d'entrée** (`IntroLoader`) : sur l'accueil seulement, une fois par session (`sessionStorage`) — cercles concentriques, objets de la marque, logo, puis rideau retiré. Le contenu de la page est dans le HTML dès le début : le loader n'est qu'un calque.
- **Transition entre les pages** (`PageTransition`) : variante 05 du labo (vortex WebGL), en WebGL natif (pas de three.js). Elle intercepte les liens internes qui changent de page ; le reste (ctrl/cmd + clic, nouvel onglet, ancres, modals, liens externes) est laissé au navigateur. Pour exclure un lien : `data-no-transition`. Sans WebGL, navigation normale.
- **Menu et panier** : deux `<dialog>` natifs portés par l'ancre (`#menu`, `#panier`) — bouton Retour du téléphone, Échap et focus piégé fonctionnent. Le menu (`MenuModal`) utilise des rideaux de couleur et des liens qui montent un à un (GSAP).
- **Réduire les animations** (réglage système) : pas de loader, pas de transition, menu sans animation, hero fixe.
- **Échelle typographique** (`tokens.css`) : `--text-hero` (4), `--text-content` (1), `--text-section` (2), `--text-desc` (3) ; polices de la charte (Poppins, Great Vibes).
- **Logos** : `logo-meera-kinks.png` (L1, sur fond beige) et `logo-meera-kinks-beige.png` (L3, sur fond marron — grand logo du pied de page), tous deux synchronisés par `npm run media:sync`.

## À vérifier à la main (une fois la base et Cloudinary branchés)

1. Se connecter, se déconnecter, se reconnecter ; 6 mauvais mots de passe de suite → message « Trop de tentatives ».
2. Créer deux catégories ; changer l'ordre ; en supprimer une.
3. Créer un produit en brouillon **sans** photo ; essayer de le publier → refusé avec « Ajoute au moins une photo ».
4. Ajouter 3 photos depuis un téléphone, réordonner, supprimer une, enregistrer ; vérifier dans Cloudinary que la photo retirée a disparu.
5. Créer deux produits au même nom → le second reçoit le lien `-2`.
6. Activer le suivi de stock, saisir 0 → « Épuisé » dans la liste ; le désactiver → « Stock non suivi ».
7. Supprimer un produit sans commande → OK. (Le refus pour produit déjà commandé se testera avec les commandes.)
8. Ouvrir `/admin/produits` sur téléphone : boutons de 44 px, liste lisible.

**Commande** (avant d'activer `NEXT_PUBLIC_CHECKOUT_ENABLED=1` en production ; la migration doit être appliquée) :

9. Commander depuis un téléphone (Abidjan) : page de confirmation avec une référence `CMD-…`, panier vidé, bouton WhatsApp qui ouvre le message prérempli (référence, articles, montants, « à confirmer » pour les frais).
10. En base : une `Order` (statut `PENDING`, paiement `DEPOSIT_DUE`, acompte = paramètre), ses `OrderItem` (nom et prix figés), 2 lignes d'`OrderStatusHistory`, un `Receipt` `REC-…`, 1 ou 2 `EmailNotification` en `PENDING`, un `Customer` au téléphone `+225…`.
11. Double-clic sur « Envoyer », puis coupure du réseau avant la réponse et nouvel envoi : **une seule** commande en base.
12. Produit à stock 1 : deux navigateurs commandent en même temps → un seul passe ; l'autre voit « Votre panier a changé », le stock vaut 0.
13. Modifier le prix d'un produit en base après la commande : la commande, la confirmation et le message gardent l'ancien prix.
14. Commande depuis l'intérieur ou l'étranger, sans zone configurée : frais et total « à confirmer », paiement `TO_CONFIRM`, montant à régler « confirmé par la vendeuse ».
15. Ouvrir `/commande/confirmation?ref=CMD-AAAAAAAA` (référence inconnue) → retour à l'accueil.
16. Un produit présent dans une commande ne peut plus être supprimé depuis le back-office (reprise du point 7).
17. Si la commande échoue en production avec une erreur de transaction ou de « prepared statement » : vérifier l'URL poolée Neon (Prisma recommande `pgbouncer=true` derrière un pooler de ce type) avant de chercher ailleurs.

**Emails et reçu PDF** (après avoir vérifié le domaine dans Resend : SPF et DKIM) :

18. Renseigne `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, puis passe une commande avec ton propre email : l'alerte arrive à l'email de notification avec le PDF joint, l'accusé arrive au client ; en base, 2 lignes `SENT` avec un `providerMessageId`.
19. Ouvre le PDF joint sur ton téléphone : lisible, accents corrects, montants justes, « Paiement non reçu ». Regarde aussi les deux emails dans Gmail et dans une autre messagerie.
20. Mets une fausse clé Resend et passe une commande : la commande réussit quand même, la ligne reste `PENDING` avec une `lastError` (403) ; remets la bonne clé et lance le `curl` du cron : les emails partent.
21. Retire `RESEND_API_KEY` : aucun envoi, lignes `PENDING` intactes, le `curl` du cron répond `configured: false`.
22. Cron : sans en-tête → 401 ; avec le secret → 200 et un bilan ; sans `CRON_SECRET` configuré → 503.
23. Passe une commande de test dont le prénom contient `<b>essai</b>` : l'email de la vendeuse l'affiche comme du texte.
24. Ajoute un paiement à la main (table `Payment`, `kind` DEPOSIT) : le PDF de `/api/v1/admin/orders/<référence>/receipt` affiche le paiement, le total encaissé et le reste à payer.
25. Vérifie que ton plan Vercel accepte la fréquence du cron choisie (le déploiement est refusé sinon).
26. **Le jeu sur un vrai téléphone** (iPhone Safari et Android Chrome) : fluidité, taille des pots, facilité à toucher un petit pot, un geste vertical qui défile bien la page, rotation de l'écran en pleine partie.
27. **Le jeu, à jouer** : 30 secondes, cadence et points (valeurs 🟡 dans `SMASH`) ; ce que je vois dans les captures ne dit rien du plaisir de jeu. Jouer aussi avec un lecteur d'écran et au clavier seul.
28. **Les pots** à l'œil sur ton écran, dans les vraies couleurs de catégories (`npm run e2e:pots` donne la planche).
29. **Safari et Firefox** : le contrôle automatique ne couvre que Chromium (`color-mix`, `touch-action` et `IntersectionObserver` sont utilisés).

## Commandes

| Commande | Rôle |
|----------|------|
| `npm test` | Tests unitaires |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:migrate` | Nouvelle migration (dev) |
| `npm run db:deploy` | Applique les migrations existantes (prod) |
| `npm run build:vercel` | `prisma generate` + `migrate deploy` + `next build` |

## Déploiement Vercel

- **Migrations automatiques en production** : `vercel.json` lance `npm run build:vercel` uniquement quand `VERCEL_ENV=production` ; les aperçus utilisent `npm run build` et ne migrent donc pas la base de production. `build:vercel` exécute `prisma generate`, `prisma migrate deploy`, puis `next build`.
- Variables d'environnement Vercel : `DATABASE_URL`, `DIRECT_URL` (indispensable pour `migrate deploy`). **Pas** de `SEED_*` en production.
- Crée le compte propriétaire en production en lançant le seed **une seule fois depuis ta machine**, avec `DATABASE_URL` pointant vers la base de production, puis supprime `SEED_ADMIN_PASSWORD`.
- Vercel Hobby est réservé à un usage non commercial : une boutique réelle demande le plan Pro.

## Sécurité en place

- Mots de passe hachés (bcrypt, coût 12) ; jamais en clair, jamais en variable d'environnement.
- Session : jeton aléatoire de 256 bits, **seul son hash est stocké**, cookie `httpOnly` + `Secure` + `SameSite=Lax` (préfixe `__Host-` en production), expiration à 7 jours, révocable.
- Commande : prix, frais, total et acompte **toujours calculés par le serveur** (le navigateur n'envoie que des identifiants et des quantités) ; transaction unique ; stock réservé de façon atomique ; clé d'idempotence ; limites par IP et par téléphone ; champ piège ; journal sans nom, téléphone ni adresse.
- Emails : gabarits HTML dont tout texte saisi par le client est **échappé**, sujets sur une seule ligne, jamais d'adresse ni de contenu dans le journal, clé d'API masquée dans les erreurs stockées, route cron **fermée** sans secret et comparée à temps constant, reçu PDF réservé au back-office et sans cache.
- Connexion : limite par IP (10 / 15 min) et par email (5 / 15 min), appliquée aussi aux emails inconnus ; message d'erreur identique pour email inconnu, mot de passe faux et compte désactivé ; temps de réponse égalisé.
- IP et email ne sont jamais écrits en clair dans la table de limitation (hash).
- Vérification de session dans **chaque** page et route du back-office (le middleware ne fait qu'un tri rapide), contrôle d'origine sur les requêtes qui modifient des données, taille maximale du corps JSON, format d'erreur standard sans détail technique.
- En-têtes `noindex` et `no-store` sur tout le back-office.

## Pas encore fait (à ne pas oublier)

- **Effet « spaghetti » à l'œil** : en v0.10 les titres et textes ont été vus **en capture fixe** dans Chromium (ils s'affichent complets, sans erreur) ; l'**animation elle-même** (rebond, vitesse) n'a pas été jugée. À regarder sur ordinateur et téléphone, avec et sans « réduire les animations » ; titres longs et polices de la charte une fois reçues.
- **Contrôle visuel sur vrais appareils** : fait dans Chromium (voir plus haut), pas sur un vrai téléphone ni sur Safari et Firefox.
- **Emails et reçu PDF jamais testés contre un vrai Resend** ni dans de vraies messageries : points 18 à 25 ci-dessus. Le gabarit « changement de statut » attend l'écran des commandes. Un lien « Renvoyer » pour les emails abandonnés (`requeueEmail`) attend ce même écran.
- **Commandes dans le back-office** (liste, statuts, paiements, annulation qui **restitue le stock**) : étape 10. D'ici là, une commande se lit en base.
- **Revalidation des pages** quand la vendeuse modifiera les zones ou l'acompte (écran Livraison/Paramètres, étape 10) : les pages publiques embarquent la liste des zones.
- **Écran Paramètres** (WhatsApp, réseaux, produit du focus, acompte) : en attendant, valeurs posées par le seed ou en base.
- **Charte graphique** : les couleurs de `tokens.css` et la palette de repli des sections sont provisoires ; la landing n'a pas encore de visuel de hero.

- **Content-Security-Policy** : à poser avec la vitrine ; il faudra autoriser `https://api.cloudinary.com` (envoi) et `https://res.cloudinary.com` (images).
- **Politique de conservation** des données clients et procédure de suppression sur demande.
- **Sauvegardes Neon** : vérifier la fenêtre de restauration du plan choisi et faire un test de restauration.
- Page de **changement de mot de passe** (appellera `revokeAllSessions`).
