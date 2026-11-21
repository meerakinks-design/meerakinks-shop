# Boutique e-commerce WhatsApp — Arborescence & décisions (v0.9)

Niveau d'architecture : **A (CRUD métier)**. Workflow v6 : **niveau 2, application web**.
Pas de couche « domain » : la logique métier vit dans `src/server/services/`, les routes restent fines.

---

## 1. Décisions (ADR courts)

| # | Décision | Pourquoi | Ce qu'on accepte |
|---|----------|----------|------------------|
| 001 | **Next.js full-stack** (Route Handlers) + **Prisma + Neon (Postgres)**, hébergé sur Vercel | Un seul repo, un seul déploiement, pas de cold start Render au moment de « Confirmer ». Prévu par le workflow niveau 2 (« Route Handlers ou backend séparé ») | Si l'API doit servir une app mobile ou un tiers, on pourra l'extraire : les services sont isolés |
| 002 | **TypeScript strict + zod** | Argent, statuts et schéma Prisma : les erreurs doivent casser à la compilation | Un peu plus de friction qu'en JS |
| 003 | **Route Handlers `/api/v1/*`** comme contrat, pas de Server Actions pour les mutations | Règle v6 : testable au `curl` avant toute UI ; l'assistant IA pourra réutiliser les services | Un peu plus de code qu'une Server Action |
| 004 | **Session admin opaque en base** (jeton aléatoire, hash en base) + mots de passe **bcrypt** | Révocable (changement de mot de passe, compte désactivé) ; `bcryptjs` en JS pur = zéro souci de build sur Vercel | Une lecture en base par requête admin |
| 005 | **Emails via outbox** (table `EmailNotification`) + cron de reprise ; **WhatsApp via `wa.me`** | La commande n'est jamais perdue si Resend tombe ; zéro coût WhatsApp | `wa.me` n'est pas garanti : le client peut ne pas envoyer le message |
| 006 | **Argent en `Int` FCFA**, total toujours recalculé côté serveur | Pas d'arrondi flottant ; un total venu du navigateur n'est jamais officiel | — |
| 007 | **Registre `Payment`** : chaque encaissement saisi à la main = une ligne = un reçu. PDF **généré à la demande**, jamais stocké | Pas d'API de paiement pour l'instant. Le futur webhook écrira dans la même table (`providerRef` unique : un webhook rejoué ne crée pas de doublon) | Bibliothèque PDF à choisir à l'étape 5 |
| 008 | **Anti-abus en base** (`RateLimitBucket`, une seule requête SQL atomique) | Un compteur en mémoire ne marche pas sur Vercel (plusieurs instances) | Une écriture en base par tentative sensible |
| 009 | **Photos envoyées directement du navigateur à Cloudinary**, signature fournie par le serveur | Une photo de téléphone dépasse la limite de 4,5 Mo d'une requête Vercel ; le secret reste côté serveur | Une photo retirée avant enregistrement reste orpheline chez Cloudinary |
| 010 | **UI admin en CSS à tokens**, pas le Tailwind + framer-motion de Rabbit | Le style néon de Rabbit est celui de sa marque ; ici la charte de la cliente arrive par `tokens.css` | On reprend les schémas d'interaction de Rabbit (liste + formulaire, confirmation de suppression), pas ses composants |
| 011 | **Panier, commande et « Notre histoire » en modals** `<dialog>` natifs, montés dans le layout public, avec une ancre (`#panier`, `#commande`, `#notre-histoire`) | Moins d'étapes pour le client ; le bouton Retour du téléphone ferme le modal ; l'icône panier marche sur toutes les pages | Le contenu d'un modal doit être dans le HTML dès le chargement pour rester indexable |
| 012 | **Livraison et paiement = deux statuts séparés** ; **un reçu par commande, données figées** (`Receipt.data`), PDF généré à la demande avec les paiements enregistrés | Cahier v1.0 : une commande peut être confirmée sans être payée ; modifier le catalogue ou la fiche client ne doit jamais changer un ancien reçu | Les remboursements sont des lignes `Payment` de type `REFUND` |
| 013 | **Build sans base de données possible** (`SKIP_DB_AT_BUILD=1`, CI uniquement) ; pages `/produit/[slug]` et `/categorie/[slug]` générées à la demande puis mises en cache | Une intégration continue n'a pas de base ; les pages produit n'ont pas besoin d'être connues au build | Ne jamais construire la production avec ce drapeau |

| 014 | **Une commande = une transaction** (`orders.service.ts`) : prix relus en base, stock réservé par `UPDATE … WHERE stock ≥ quantité`, client, zone, montants, commande, lignes, historique, reçu figé, lignes d'email. Idempotence par clé unique, vérifiée AVANT puis rattrapée sur collision (`P2002`) | Aucune étape partielle ne survit à une erreur ; deux clients sur le dernier article ne passent pas tous les deux ; un renvoi réseau ne crée jamais de doublon | Les tests tournent sur une base simulée : le comportement réel de PostgreSQL se vérifie à la main (README) |
| 015 | **Destination libre quand aucune zone n'est configurée**, frais « à confirmer » ; liste obligatoire dès qu'il existe une zone active pour ce type | RM-42 : aucune zone ni aucun tarif inventé ; la cliente n'a pas encore répondu (questions 3 et 4) | La vendeuse confirme la destination par WhatsApp (annexe B) |
| 016 | **Confirmation lue par la référence** (40 bits, non séquentielle), page `noindex`, sans `referrer`, 30 consultations / 10 min / IP ; le lien WhatsApp est reconstruit depuis la base à chaque affichage | Le bouton reste utilisable après un rechargement ; la référence est le seul secret de la page | Toute personne qui connaît la référence voit le récapitulatif : elle ne doit pas être partagée |
| 017 | **Boîte d'envoi** (`notifications.service.ts`) : réservation par mise à jour conditionnelle (identifiant, statut et `nextAttemptAt` lus), bail de 10 min, 6 tentatives (1, 5, 15, 60, 180 min), erreur définitive abandonnée tout de suite, tentative immédiate après la commande puis cron | Deux exécutions simultanées ne peuvent pas envoyer deux fois ; une interruption n'abandonne rien | Un email peut partir deux fois si le serveur s'arrête entre l'envoi et l'écriture du résultat (clé d'idempotence par tentative) |
| 018 | **Resend par son API REST** (`fetch`, sans SDK), transport injectable | Un seul endpoint, testable sans réseau, une dépendance de moins | `User-Agent` obligatoire ; comportement vérifié sur la documentation, pas contre un vrai compte |
| 019 | **Reçu PDF avec `pdf-lib`** (JavaScript pur, polices standard), généré à la demande, jamais stocké | Aucun fichier de police ni binaire à embarquer sur Vercel ; le reçu suit toujours les paiements | Latin occidental seulement : autres caractères remplacés par « ? » |
| 021 | **Effet « spaghetti » en CSS pur, sans GSAP** (v0.9, D-29) : la courbe `elastic.out(0.75, 0.3)` de Rabbit Shop est recalculée (`lib/shop/spaghetti.ts`) et écrite en `linear()` ; le texte complet reste dans le HTML serveur | Aucune dépendance de plus, rien à charger, le texte est lisible sans JavaScript, un test empêche la courbe de dériver | Le découpage se fait au rendu : un titre de plus de ~60 lettres allonge un peu le HTML ; pas de `reverse` animé (le texte est réarmé en sortant par le bas) |
| 022 | **Mini-jeu « Cosmetic Smash » : moteur pur, dessin séparé, code chargé à la demande** (v0.10, D-19, P-42) : la logique (physique, score, 30 s, pause) est dans `lib/smash/engine.ts` sans aucun accès au navigateur ; les pots sont dessinés en canvas (`pots.ts`), les éclats et la crème dans `effects.ts` ; `game.ts` relie le tout et n'est importé qu'à l'approche du footer | Le moteur se teste sans écran ni horloge (graine aléatoire, pas de temps injecté) ; le jeu ne pèse rien tant qu'on n'approche pas du footer, et ne démarre qu'au clic sur « Jouer » | Les pots sont dessinés par le code (pas de photos) : ils ont le volume et les reflets d'un rendu, pas le grain d'une photo. Le jeu est dans le footer, donc sur toutes les pages qui en ont un |
| 023 | **La barre d'achat collée est réservée à la fiche produit, et se range devant le footer** (v0.10, cahier §4.3) | Sur la landing, le composant du produit mis en avant la montrait dès le haut de la page et par-dessus tout le footer (trouvé au contrôle dans Chromium) | Sur la fiche, la barre apparaît dès que le bouton principal n'est pas à l'écran, y compris au chargement quand il est sous la ligne de flottaison d'un petit téléphone : à valider |
| 024 | **Contrôle visuel dans Chromium sans base de données** (v0.10) : `E2E_FAKE_DATA=1` remplace 5 services de lecture par des données de démonstration (`e2e/fakes/`), les vraies pages tournent telles quelles | On joue les vrais composants dans un vrai navigateur (téléphone et ordinateur) sans Neon ni Cloudinary | Refusé en production (`next.config.mjs` lève une erreur si `NODE_ENV=production`). Ne remplace pas un test contre la vraie base |
| 020 | **Cron quotidien dans `vercel.json`** | Le plan Hobby refuse tout autre rythme (déploiement en échec) ; la tentative immédiate couvre le cas normal | En production (Pro), passer à `*/10 * * * *` |

**Modules activés** (justifiés) : auth admin · Resend · Cloudinary · Vercel Cron · rate-limit en base.
**Modules NON activés** : Redis, file d'attente (BullMQ), paiement en ligne, i18n, WebSocket, assistant IA (phase 6).

---

## 2. Arborescence

```
boutique/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                      # AdminUser (hash), StoreSettings, zones, produits de démo
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx · not-found.tsx · error.tsx · robots.ts · sitemap.ts
│   │   │
│   │   ├── (boutique)/              # site public — rendu ISR, indexé
│   │   │   ├── layout.tsx           # en-tête (panier + badge), pied de page, CartProvider, modals
│   │   │   ├── page.tsx             # landing : hero, collections, FAQ, « Notre histoire » (modal)
│   │   │   ├── boutique/page.tsx            # tous les produits
│   │   │   ├── categories/page.tsx          # liste des catégories
│   │   │   ├── categorie/[slug]/page.tsx    # une catégorie (redirige un ancien slug)
│   │   │   ├── produit/[slug]/page.tsx      # fiche produit (redirige un ancien slug)
│   │   │   ├── commande/confirmation/page.tsx   # ?ref=CMD-… : récapitulatif + bouton WhatsApp
│   │   │   └── cgv/ · cgu/ · mentions-legales/ · politique-de-confidentialite/
│   │   │   # PAS de pages /panier, /commander, /contact, /faq, /notre-histoire :
│   │   │   # panier et commande sont des modals ; contact et FAQ sont des sections de la landing.
│   │   │
│   │   ├── admin/                   # back-office — dynamique, noindex
│   │   │   ├── login/page.tsx
│   │   │   └── (protege)/
│   │   │       ├── layout.tsx       # exige une session valide
│   │   │       ├── page.tsx         # tableau de bord
│   │   │       ├── commandes/       # liste (recherche : référence, téléphone, nom) · [id] détail, statuts, paiements, reçu
│   │   │       ├── produits/        # liste (tous · publiés · brouillons · archivés) · nouveau · [id]
│   │   │       ├── categories/      # nom, description, couleur de section, ordre, archivage
│   │   │       ├── clients/         # fiche et historique
│   │   │       ├── livraison/       # zones et frais de livraison
│   │   │       └── parametres/      # WhatsApp, email, acompte, numéro Wave, infos du reçu
│   │   │
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── cron/send-emails/route.ts        # reprise de l'outbox (secret CRON_SECRET)
│   │       └── v1/
│   │           ├── cart/quote/route.ts          # POST public : total officiel du panier (prix du serveur)
│   │           ├── orders/route.ts              # POST public : créer une commande
│   │           └── admin/
│   │               ├── auth/{login,logout}/route.ts
│   │               ├── orders/[id]/{status,note,payments}/route.ts
│   │               ├── payments/[id]/{void,receipt}/route.ts
│   │               ├── products/ · categories/ · zones/ · settings/
│   │               └── uploads/sign/route.ts    # signature d'upload Cloudinary
│   │
│   ├── server/                      # ← ne s'exécute QUE côté serveur
│   │   ├── db.ts                    # PrismaClient singleton
│   │   ├── http.ts                  # withApi (format d'erreur standard), readJson, assertSameOrigin
│   │   ├── logger.ts                # journal JSON structuré
│   │   ├── auth/
│   │   │   ├── password.ts          # bcrypt + vérification factice (anti-énumération)
│   │   │   ├── tokens.ts            # jeton de session, sha256
│   │   │   ├── session.ts           # créer, lire, révoquer une session
│   │   │   ├── login.service.ts     # limites par IP et par email, messages génériques
│   │   │   └── guards.ts            # requireAdminPage/Api(), requireOwnerApi()
│   │   ├── services/
│   │   │   ├── orders.service.ts    # createOrder (transaction), changeStatus, recordPayment
│   │   │   ├── pricing.ts           # computeTotals() — fonction pure, testée
│   │   │   ├── stock.ts             # décrément atomique, restitution à l'annulation
│   │   │   ├── payments.service.ts  # enregistrer / annuler un paiement, recalcul de paymentStatus
│   │   │   ├── receipt.service.ts   # données du bon de commande et du reçu (fonction pure)
│   │   │   ├── catalog.queries.ts   # lectures publiques (produits publiés uniquement)
│   │   │   ├── products.service.ts
│   │   │   ├── zones.service.ts
│   │   │   ├── settings.service.ts
│   │   │   ├── notifications.service.ts   # enqueue + processOutbox
│   │   │   └── rate-limit.ts · rate-limit.sql.ts   # RateLimitBucket, SQL atomique
│   │   └── integrations/
│   │       ├── resend.ts
│   │       ├── pdf.ts                   # rendu PDF (bon de commande, reçu)
│   │       └── cloudinary.ts
│   │
│   ├── lib/                         # isomorphe (client et serveur)
│   │   ├── env.ts                   # variables d'env validées par zod, échec au démarrage
│   │   ├── validation/              # order.schema.ts · product.schema.ts · auth.schema.ts
│   │   ├── api-result.ts            # format d'erreur standard { ok, error: { code, message, retryable, fields } }
│   │   ├── api-client.ts            # seul point d'appel de l'API côté navigateur
│   │   ├── whatsapp.ts              # buildOrderMessage(), buildWaLink() — fonctions pures
│   │   ├── money.ts                 # formatFcfa()
│   │   ├── shop/spaghetti.ts        # courbe élastique de Rabbit, découpe en mots et lettres (v0.9)
│   │   ├── smash/                   # mini-jeu (v0.10) : engine.ts (logique pure) · palette.ts · pots.ts (dessin des pots) ·
│   │   │                            #   effects.ts (éclats, crème) · render.ts · game.ts (chargé à la demande)
│   │   └── constants/order-status.ts  # libellés FR, couleurs, transitions autorisées
│   │
│   ├── features/cart/               # panier : store client, persisté en localStorage
│   ├── components/
│   │   ├── ui/                      # design system (tokens de la DA)
│   │   ├── shop/                    # ProductCard, Gallery, CartDrawer, CheckoutForm, ZoneSelect…
│   │   ├── admin/                   # ProductForm, ImageUploader, CategoriesManager ✅ · OrderTable, StatusSelect… (étape 6)
│   │   └── layout/
│   │   (shop/Spaghetti.tsx : effet « spaghetti » des titres et textes, v0.9)
│   │   (shop/SmashGame.tsx : bloc du mini-jeu du footer, v0.10)
│   ├── content/                     # FAQ, livraison, à-propos : données typées, pas du JSX
│   │   ├── faq.ts                   #   → lisibles par l'assistant IA plus tard
│   │   └── livraison.ts             #   → le texte « validé » du questionnaire
│   ├── styles/
│   │   ├── tokens.css               # couleurs, typo, rayons : à brancher sur la charte graphique
│   │   ├── spaghetti.css            # courbe élastique `linear()` et états de l'effet (v0.9)
│   │   ├── smash.css                # bloc du mini-jeu (v0.10)
│   │   └── globals.css
│   └── middleware.ts                # filtre rapide /admin (cookie présent) + en-têtes noindex ;
│                                    # la vraie vérification reste dans server/auth/guards.ts
├── tests/
│   ├── unit/                        # pricing, whatsapp, stock, transitions de statut
│   ├── integration/                 # createOrder : idempotence, survente, prix falsifié
│   └── e2e/                         # parcours : produit → panier → commande → admin
├── e2e/                             # contrôle visuel dans Chromium (v0.10) : visual-check.mjs · game-check.mjs · fakes/ · fixtures.ts
│                                    #   pots-sheet.mjs et burst-sheet.mjs : planches pour juger les pots et l'éclatement
├── docs/
│   ├── adr/                         # une décision = un fichier
│   └── erd.md
├── .env.example
└── README.md
```

---

## 3. Flux `POST /api/v1/orders` (le cœur du projet)

1. **Garde-fous** : rate-limit par IP hashée, champ piège (honeypot), validation zod.
2. **Idempotence** : si `idempotencyKey` existe déjà → renvoyer la commande existante.
3. **Transaction unique** :
   - charger les produits **publiés** depuis la base, ignorer tout prix reçu ;
   - décrémenter le stock de façon atomique (`updateMany` avec `stock >= quantité`, vérifier le compte) pour les produits suivis ;
   - `upsert` du `Customer` par numéro ;
   - résoudre la zone : `zoneType`, frais éventuels ;
   - calculer `subtotal`, `deliveryFee?`, `total?`, `upfrontAmount?` ;
   - créer `Order` + `OrderItem` (snapshots) + `OrderStatusHistory` (NEW) + lignes `EmailNotification`.
4. **Après commit** : tentative d'envoi Resend ; en cas d'échec, le cron reprend.
5. **Réponse** : `reference` + lien `wa.me` construit côté serveur **à partir de la commande enregistrée** (le message correspond toujours à la base).

Règle de paiement appliquée au point 3 : `ABIDJAN` → acompte = `StoreSettings.depositAmount`, solde à la livraison ; `INTERIOR` / `INTERNATIONAL` → paiement intégral par Wave avant expédition, frais inclus, donc `upfrontAmount` reste `null` jusqu'à ce que la vendeuse fixe les frais.

### Réalisé en v0.6 (écarts avec le plan ci-dessus)

- **Garde-fous, dans l'ordre** : origine → interrupteur (`NEXT_PUBLIC_CHECKOUT_ENABLED`, 503 sinon) → limite par IP → corps JSON (415, 413, 422) → champ piège (faux succès `201`, rien d'enregistré) → validation zod → limite par téléphone → service.
- **Idempotence** : même clé et même demande (téléphone + articles) → `200` avec la commande existante ; même clé et autre demande → `409`. Deux envois simultanés : la base refuse le second (`P2002` sur `idempotencyKey`), on renvoie la commande du premier. Collision de référence ou de téléphone (première commande simultanée d'un même numéro) : 3 tentatives au plus.
- **Panier changé** (produit retiré, épuisé, stock insuffisant) : `409` avec le détail par produit ; le panier n'est jamais ajusté en silence, le client revoit son panier et le devis est rafraîchi.
- **Montants** : `computeTotal`, `computeUpfrontAmount` (Abidjan = acompte plafonné à la valeur de la commande ; ailleurs = total, `null` tant que les frais ne sont pas fixés) et `initialPaymentStatus` (`DEPOSIT_DUE` à Abidjan, sinon `TO_CONFIRM`) sont dans `lib/shop/order-amounts.ts`, partagés avec l'estimation du formulaire.
- **Client** : retrouvé ou créé par téléphone normalisé (`+<indicatif><numéro>`) ; les coordonnées les plus récentes remplacent les anciennes, un email n'est jamais effacé ; chaque commande garde sa copie figée dans `Receipt.data`.
- **Email** : la ligne d'envoi naît dans la transaction (`dedupeKey = <référence>:<type>`). Étape 4 s'arrête avant l'envoi : le point 4 du flux (« après commit : tentative d'envoi ») est l'étape 9.
- **Fichiers** : `app/api/v1/orders/route.ts` · `server/services/orders.service.ts` · `receipt.service.ts` · `order-reference.ts` · `lib/validation/order.schema.ts` · `lib/shop/{phone,order-amounts,order-message,order-types,checkout-form,zones}.ts` · `components/shop/{CheckoutModal,CheckoutForm,OrderSummary,OrderConfirmation,ModalRouteSync}.tsx` · `app/(boutique)/commande/confirmation/page.tsx`.

### Réalisé en v0.7 (étape 5 du plan)

- **Après la commande** : `POST /api/v1/orders` appelle `sendOrderEmailsNow(référence)` (4 s au plus par email, concurrence 2, **ne lève jamais**), uniquement pour une commande créée (ni rejeu, ni robot, ni refus). Next 14.2 n'a pas d'`after()` stable : l'attente est donc dans la requête ; avec Next 15, passer par `after()`.
- **Cron** : `GET /api/cron/send-emails` (`CRON_SECRET` en `Bearer`, comparaison d'empreintes à temps constant, **fermé** sans secret) → `processOutbox()` : 20 lignes et 25 s au plus par exécution, une à la fois (limite Resend : 2 requêtes par seconde).
- **Contenu** : alerte vendeuse = récapitulatif + lien `wa.me` du client + étapes de l'annexe B + PDF joint ; accusé client = remerciement + texte de paiement de la zone, sans PDF ; statut = libellé du statut (déclencheur à l'étape 6). Tout texte saisi est échappé ; rien n'est inventé (délai, garantie, paiement).
- **Reçu PDF** : `integrations/pdf.ts` (`renderReceiptPdf`) lit `Receipt.data` revalidé par zod (`parseReceiptData`) et les paiements non annulés ; `GET /api/v1/admin/orders/[id]/receipt` (référence ou identifiant) le sert au back-office.
- **Environnement** : une variable vide vaut une variable absente (`.env.example` en contient) ; sans `RESEND_API_KEY` et `EMAIL_FROM` valides, rien n'est envoyé ni modifié.
- **Fichiers** : `server/integrations/{resend,pdf}.ts` · `server/services/{notifications,email-templates,receipt-pdf}.service.ts` · `server/auth/cron.ts` · `app/api/cron/send-emails/route.ts` · `app/api/v1/admin/orders/[id]/receipt/route.ts` · `lib/constants/payment.ts` · `lib/shop/payments.ts` · `vercel.json`.

### Statuts, reçus et paiements (saisis à la main pour l'instant)

- **Deux statuts séparés** (cahier v1.0). Livraison : En attente → Confirmée → En préparation → En livraison → Livrée, ou Annulée tant que ce n'est pas livré (`DELIVERY_TRANSITIONS`). Paiement : À confirmer, Acompte attendu, Acompte reçu, Paiement partiel, Paiement intégral reçu, Remboursé, Annulé. Chaque changement est écrit dans `OrderStatusHistory` (type, ancienne valeur, nouvelle valeur, compte admin, date).
- **À la création de la commande**, dans la même transaction : `Order` + `OrderItem` (instantanés) + `Receipt` (données figées : boutique, client, adresse, lignes, montants, modalités de paiement annoncées). L'email d'alerte à la vendeuse contient le **PDF**, généré à la demande à partir de ces données et des paiements déjà enregistrés. Elle le télécharge, répond au client sur WhatsApp et le lui remet une fois la commande confirmée.
- **Paiement reçu** : saisi dans le back-office (type, mode, montant, date) → ligne `Payment`, statut de paiement recalculé, reçu mis à jour à la prochaine génération. L'acompte passe toujours par Wave. Le chiffre d'affaires du tableau de bord = paiements réellement enregistrés, remboursements déduits.
- **Erreur de saisie** : on **annule** le paiement (`voidedAt` et motif), on ne le supprime pas.
- **Futur paiement en ligne** : le webhook crée la même ligne `Payment` avec `providerRef` et sans `recordedById`.

### Menu du back-office proposé pour le MVP (6 entrées, pas 9)

Tableau de bord · Commandes · Produits (catégories incluses) · Clients · Livraison · Paramètres.
Les « Reçus » se téléchargent depuis la commande, les « Notifications » (échecs d'envoi) s'affichent sur la commande concernée, et les statistiques de visites viennent d'un outil externe sans cookies (Vercel Web Analytics ou Plausible) tant que l'analytique maison n'est pas justifiée.

---

## 4. Variables d'environnement

| Variable | Rôle |
|----------|------|
| `DATABASE_URL`, `DIRECT_URL` | Neon (poolée / directe) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Emails : sans les deux, rien n'est envoyé (les lignes attendent). Domaine vérifié (SPF, DKIM) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Images |
| `CRON_SECRET` | Protège `/api/cron/send-emails` (16 caractères minimum) ; route fermée sans lui |
| `NEXT_PUBLIC_SITE_URL` | Variable publique |
| `NEXT_PUBLIC_CHECKOUT_ENABLED` | `1` = commande en ligne ouverte (bouton « Commander » et `POST /api/v1/orders`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | **Uniquement pour `prisma db seed`**, en local, puis supprimées. Le mot de passe est haché en base et n'existe pas en production |

**Domaine.** À acheter avant l'étape 5. Resend n'envoie depuis une adresse à ton nom (`commandes@ton-domaine`) qu'après vérification DNS (SPF et DKIM) ; sans cela il ne livre qu'à l'adresse du compte Resend, donc pas à la vendeuse.

---

## 5. Ordre de construction (v6) et dépendances au questionnaire

| Étape | Contenu | Bloqué par le questionnaire ? |
|-------|---------|-------------------------------|
| 1 ✅ | Repo, Neon, Prisma, `env.ts` | Non |
| 2 ✅ | Migration (à lancer chez toi) · seed · auth admin · CRUD produits et catégories · envoi de photos | Non |
| 3 ✅ | Vitrine : landing, boutique, catégories, fiche produit (redirections de slug), panier en modal avec devis serveur | Non (tokens de DA provisoires) |
| 4 ✅ | Formulaire de commande (modal), `POST /api/v1/orders`, page de confirmation, message WhatsApp, tests (idempotence, survente, prix falsifié, zones). **À vérifier contre une vraie base** (README) | B2–B4 (statuts de paiement exacts), C1–C3 (zones : sans réponse, destination libre) |
| 5 ✅ | Outbox Resend + cron + PDF (reçu), tentative immédiate après la commande. **À vérifier contre un vrai compte Resend** (README) | F2 (numéro WhatsApp) · domaine acheté et vérifié · plan Vercel Pro pour un cron fréquent |
| 6 | Dashboard, commandes, zones, paramètres | C1–C3 (zones à seeder) |
| 7 | Habillage final, vrais produits | F0b–F0d (charte, photos, produits, prix) |
| 8 | Variantes | A3, seulement si « oui » |
