# Rapport des modifications : 24 novembre 2026

Projet : `boutique_1.zip` (Meëra Kinks). Toutes les modifications sont dans le zip `boutique_modifie.zip`.

## 1. Retrait de `HistoryModal.tsx` et `Modal.tsx`

- Les deux fichiers sont **supprimés** (`src/components/shop/HistoryModal.tsx` et `src/components/shop/Modal.tsx`).
- Le zip ne contenait **pas de dossier `.git`**, donc je n'ai pas pu faire `git rm`. La suppression est faite sur les fichiers. Chez toi, `git add -A` enregistrera le retrait.
- Ils ne bloquaient plus que le build : `HistoryModal` n'était importé nulle part (le layout ne l'utilise plus), et `Modal` n'était importé que par `HistoryModal`. Aucun autre fichier n'est touché par ce retrait.
- Le test existant `curtain-modal-render.test.tsx` vérifie déjà que le layout ne contient plus `HistoryModal`.

## 2. Menu hamburger, panier (et commande) en plein écran sur mobile

Fichier : `src/styles/ui.css` (nouvelle règle `@media (max-width: 699px)`).

- Avant : sur téléphone, le panneau laissait une bande du site à gauche, avec des marges et des coins arrondis.
- Maintenant, sous 700 px : le panneau occupe **tout l'écran** (`--drawer-w: 100%`, marges à 0, coins droits). Les rideaux de couleur gardent leur glissement depuis la droite, mais couvrent tout l'écran.
- La hauteur utilise `100dvh` (avec repli `100vh`), pour que le bas ne soit pas masqué par la barre d'adresse du navigateur mobile.
- **Ordinateur : inchangé** (panneau collé à droite, 34 rem, site dimmé derrière).
- Le menu, le panier, la commande et la confirmation partagent le même composant (`CurtainModal`). Ils passent donc **tous** en plein écran sur mobile. Sinon, on aurait un panier plein écran qui ouvre une commande en panneau partiel.
- Commentaires mis à jour dans `CurtainModal.tsx` et `MenuModal.tsx`, ainsi que `docs/REFONTE-RIDEAUX-FOOTER-CONTACT.md` et `TODO.md`.

## 3. « Ma boutique » → « MEËRA KINKS »

« Ma boutique » n'existait que comme **nom par défaut** de la boutique (réglage `storeName`). Ce nom s'affiche dans le titre du menu, l'attribut `alt` du logo, le pied de page (© année), les e-mails, les reçus et les titres de page.

- `src/server/services/catalog.queries.ts` : valeur par défaut → `MEËRA KINKS`.
- `prisma/seed.ts` : nom de boutique créé au seed → `MEËRA KINKS` (toujours remplaçable par `SEED_STORE_NAME`).
- `src/server/services/notifications.service.ts` : valeur de repli (était `Meëra Kinks`) → `MEËRA KINKS`, pour être cohérent.
- **Nouvelle migration** `prisma/migrations/20261124000000_store_name_meera_kinks/migration.sql` : met à jour les bases **déjà créées** qui portent encore « Ma boutique ». Sans elle, ta base existante garderait l'ancien nom malgré le changement du code. Un nom que tu aurais choisi toi-même n'est pas écrasé (`WHERE "storeName" = 'Ma boutique'`). Elle s'applique avec `prisma migrate deploy` (ce que fait `build:vercel`).
- Test `catalog.queries.test.ts` adapté.
- Je n'ai pas modifié les anciens cahiers des charges versionnés, qui citent « Ma boutique vous propose… » comme texte historique.

## 4. Header : « Boutique » → « Commander »

- `src/components/shop/Header.tsx` : le bouton orange du header affiche maintenant **Commander**.
- Il mène toujours au catalogue (`/boutique`), puisqu'on choisit les produits avant de commander. Le panier et le formulaire de commande s'ouvrent ensuite depuis l'icône panier. Si tu préfères qu'il ouvre directement le panier, c'est une ligne à changer.
- J'ai compris « ma boutique au header » comme ce bouton. Dis-moi si tu voulais autre chose.
- L'entrée « Boutique » du menu (hamburger) n'est pas changée, puisque tu as parlé du header.
- Tests `shop-render` et `product-cart-render` mis à jour.

## 5. Formulaire de contact : un seul champ « Contact » avec select WhatsApp / E-mail

Fichiers : `src/components/shop/ContactForm.tsx`, `src/content/landing.ts`, `src/styles/ui.css`.

- Les deux boutons radio « Sur WhatsApp / Par e-mail » **et** les deux champs séparés sont remplacés par **un seul champ « Contact »** :
  - un **select** `WhatsApp | E-mail` ;
  - à côté, un champ qui s'adapte : **WhatsApp** → indicatif + numéro ; **E-mail** → adresse e-mail.
- Sur téléphone, le select prend toute la largeur, et le champ passe en dessous (testé à 390 px).
- Le modèle de données et le schéma ne changent pas (`replyChannel`, `phone`, `email`) : l'API `/api/v1/contact` reste identique.
- Textes (`landing.ts`) : `replyLabel`, `phoneLabel` et `emailLabel` (devenus inutiles) sont remplacés par `contactLabel`, `contactHelp`, `channelAria` et `phoneHelp`.

## 6. Indicatif tapé librement (contact ET commande)

**Ta question : « et s'il n'y a pas son indicatif, il fait comment ? »** Avec une liste fermée, il ne pouvait pas. Maintenant il n'y a plus de liste.

- Nouveau composant partagé `src/components/shop/PhoneInput.tsx`, utilisé par le contact **et** par la commande, donc le même comportement partout :

  `+ [ 225 ] [ numéro ]`

  - L'indicatif est un champ où le client **tape** son indicatif (225 par défaut, chiffres seulement, 4 maximum). Un « + » ou des espaces collés sont retirés automatiquement.
  - Si l'indicatif est connu, on affiche le pays (« Pays : Côte d'Ivoire »). S'il ne l'est pas : « Pays non listé : aucun souci, votre indicatif est accepté tel quel ». **Tout indicatif est accepté.**
  - Le client peut aussi coller son numéro complet avec « + » dans le champ du numéro (c'était déjà géré).
- **Commande** (`CheckoutForm.tsx`, `checkout-form.ts`) : le select de pays et l'option « Autre pays » (avec son second champ) sont supprimés. `OTHER_DIAL_CODE` et `otherDialCode` n'existent plus.
- **Sécurité de saisie** (`contact.schema.ts`) : un indicatif **effacé** par le client n'est plus remplacé en silence par 225. Sinon, un numéro français « 06… » aurait été enregistré comme un numéro ivoirien. Il reçoit maintenant « Indiquez l'indicatif du pays (ex. 225) ». La validation de la commande se comportait déjà ainsi.
- `phone.ts` : ajout de `sanitizeDialCode` et `dialCountryName`. La liste `DIAL_CODES` est conservée : elle sert à reconnaître le pays et au formulaire admin d'anonymisation.
- `README.md` mis à jour (ligne sur le téléphone).

## 7. Tests ajoutés ou adaptés

- Nouveau `tests/unit/contact-form-render.test.tsx` : le champ Contact (select + indicatif libre) et la règle CSS plein écran mobile.
- `phone.test.ts` : indicatif nettoyé, pays reconnu ou inconnu, numéro complet avec « + ».
- `contact.schema.test.ts` : indicatif inconnu accepté, indicatif effacé refusé.
- `checkout-form.test.ts` et `checkout-render.test.tsx` : plus de « Autre pays », indicatif libre.

## 8. Ce que j'ai vérifié, et ce que je n'ai pas pu vérifier

Le projet n'avait pas de `node_modules` et l'installation de paquets est désactivée ici. Je n'ai donc **pas pu lancer `npm run build`, `npm run typecheck` ni `npm test`**. Lance-les chez toi avant de déployer.

Ce que j'ai vérifié à la place, en exécutant le vrai code du projet :

- Rendu serveur de `ContactForm` et de `PhoneInput` (balisage, ids, `aria-*`, labels reliés).
- Logique : indicatif inconnu (971) accepté dans le contact et dans la commande (`+971501234567`) ; indicatif vide refusé avec le bon message ; numéro collé avec « + » accepté.
- Rendu navigateur (Chromium) avec les vraies feuilles de style :
  - panneau du menu = 390×844 sur mobile (plein écran), et collé à droite sur ordinateur ;
  - champ Contact bien aligné sur mobile et sur ordinateur.

À contrôler chez toi : l'animation GSAP des rideaux sur un vrai téléphone, et les tests unitaires que j'ai écrits sans pouvoir les lancer.

## 9. Fusion du patch `boutique-ui-patch.zip`

Le patch (11 fichiers) était basé sur le zip d'origine. Je l'ai fusionné avec mes modifications.

**Copiés tels quels** (je n'y avais pas touché) : `LandingSections.tsx`, `Spaghetti.tsx`, `a-propos/page.tsx`, `(boutique)/page.tsx`, `tokens.css`, `tests/unit/spaghetti-render.test.tsx`, `tests/unit/shop-content.test.ts`.

**Fusionnés à trois voies** (modifiés des deux côtés) :
- `landing.ts` : ajout des `titleGhost` du patch à côté de mes textes du champ Contact. Aucun conflit. J'ai vérifié que chaque mot « ghost » est bien un mot de son titre (11 sections).
- `shop.css` : aucun conflit (ses règles `.why-*` et sections orange, mes règles `.phone-row` / `.dial-group`).
- `ContactForm.tsx` : les trois `field-full` du patch (référence de commande, message, consentement) + mon champ Contact.
- `ui.css` : **1 conflit**, sur le bloc « Contact ». Le patch restyle le formulaire en grille à 2 colonnes avec des champs à bordure pointillée. Résolution : j'ai gardé son bloc en entier, retiré sa règle `.phone-row select` (il n'y a plus de select de pays), et ajouté mes règles du champ Contact et de l'indicatif adaptées à son style.

**Adaptation faite pour que les deux tiennent ensemble** :
- Le champ « Contact » est en pleine largeur (`field-full`) dans la grille à 2 colonnes : « Votre sujet » et « Nom complet » restent côte à côte, mais le select + l'indicatif + le numéro auraient été trop serrés dans une demi-colonne.
- Le select WhatsApp / E-mail et le champ d'indicatif reprennent la bordure pointillée et les coins arrondis du patch.
- Rendu vérifié à 390 px et 1280 px.

**Non vérifié** : le reste du patch (sections de la landing, titres « ghost », cartes « Le soin en toute simplicité », sections orange). Je ne l'ai pas modifié et je n'ai pas pu lancer le site en entier ici. Les tests du patch n'ont pas été exécutés (pas de vitest installé).

## Liste des fichiers

**Supprimés** : `src/components/shop/HistoryModal.tsx`, `src/components/shop/Modal.tsx`

**Créés** : `src/components/shop/PhoneInput.tsx`, `prisma/migrations/20261124000000_store_name_meera_kinks/migration.sql`, `tests/unit/contact-form-render.test.tsx`, `RAPPORT_MODIFICATIONS.md`

**Modifiés** : `README.md`, `TODO.md`, `docs/REFONTE-RIDEAUX-FOOTER-CONTACT.md`, `prisma/seed.ts`, `src/components/shop/{CheckoutForm,ContactForm,CurtainModal,Header,MenuModal}.tsx`, `src/content/landing.ts`, `src/lib/shop/{checkout-form,phone}.ts`, `src/lib/validation/contact.schema.ts`, `src/server/services/{catalog.queries,notifications.service}.ts`, `src/styles/{shop,ui}.css`, `tests/unit/{catalog.queries,checkout-form,checkout-render,contact.schema,phone,product-cart-render,shop-render}.test.ts(x)`

---

# Suite du 24 novembre 2026 : eyebrows, rideaux, filigrane, icônes

## 10. Retrait complet des eyebrows

- Plus aucun surtitre au-dessus des titres : la clé `eyebrow` est retirée de chaque section de `src/content/landing.ts`, et les balises correspondantes de `LandingSections.tsx`, `(boutique)/page.tsx`, `a-propos/page.tsx`, `NotFoundContent.tsx` (« ERREUR 404 ») et `OrderConfirmation.tsx` (« Commande enregistrée »).
- CSS : règles `.eyebrow`, `.hero-eyebrow` et la pastille marron `.section-brand .eyebrow` supprimées (`shop.css`, `ui.css`).
- Le haut du héros reçoit un peu plus d'air (`.hero` : `padding-block: clamp(2.5rem, 8vw, 4rem) 0`) puisque le surtitre n'est plus là.
- La confirmation de commande en modal garde son titre (« Merci… ») dans l'en-tête du panneau ; rien n'est perdu.
- Test `tests/unit/no-eyebrow.test.ts` : échoue si le mot « eyebrow » réapparaît dans `src/`.

## 11. Rideaux (menu, panier, commande, confirmation) : l'animation rejoue à chaque fois

- **Cause** : à la 2e ouverture d'un même modal, rideaux et panneau sont encore rangés hors écran à droite quand `showModal()` donne le focus au bouton ✕. Le navigateur faisait défiler le `<dialog>` (`overflow: hidden`) pour le montrer : le panneau semblait déjà en place et les rideaux partaient à gauche. La 1re ouverture de chaque modal marchait, les suivantes non.
- **Correctif** : `CurtainModal.tsx` remet `scrollLeft`/`scrollTop` à 0 juste après `showModal()` ; `ui.css` ajoute `overflow: clip` (aucun défilement possible) avec `overflow: hidden` en repli.
- **Vérifié dans Chromium** (vrai composant, vrai CSS, GSAP) : sur l'ancien code, échec dès la 2e ouverture du menu ; sur le nouveau, 5 ouvertures/fermetures alternées menu et panier + enchaînement menu → panier, sans décalage. Test de régression : `tests/unit/curtain-replay.test.ts`.
- Non vérifié : sur un vrai téléphone, et dans l'application Next complète (banc d'essai isolé).

## 12. Filigrane du pied de page dans la police du logo

- Le logo est écrit en **Choret Fudyng Bubble** (Alit Design) : gratuite en usage personnel seulement, licence commerciale payante, fichier absent du projet. Je ne l'ai pas embarquée.
- Police libre la plus proche : **Modak** (licence OFL, usage commercial libre), auto-hébergée : `public/fonts/modak-latin-400.woff2` + `modak-OFL.txt`. Variable `--font-logo` dans `tokens.css` ; le filigrane l'utilise (`.footer-watermark`).
- Modak ressemble au lettrage « Meëra » mais n'est pas identique. Si la licence de Choret Fudyng Bubble est achetée : déposer le `.woff2` dans `public/fonts`, déclarer son `@font-face` dans `tokens.css` et placer son nom en tête de `--font-logo` (une seule ligne).
- Taille : `clamp(2.2rem, 14.5vw, 11.5rem)`, le texte occupe environ 88 % de la largeur sur téléphone.

## 13. Icônes WhatsApp, Instagram, TikTok, Facebook

- Nouveau `src/lib/shop/socials.ts` (`buildSocialLinks`) : source unique, ordre WhatsApp, Instagram, TikTok, Facebook. Un réseau sans lien n'apparaît pas (aucun lien fabriqué).
- **Pied de page** : sous le logo, mêmes icônes (l'e-mail reste en dernier s'il est renseigné).
- **Menu hamburger** : rangée d'icônes rondes au pied du menu (remplace les liens texte Instagram/TikTok/Facebook ; WhatsApp y est ajouté). Chaque icône a un `aria-label`.
- **Pourquoi elles ne s'affichaient pas chez toi** : les liens viennent des réglages en base, il n'existe pas d'écran pour les saisir et le seed ne réécrit jamais une base existante. Solution sans toucher à la base : variables `INSTAGRAM_URL`, `TIKTOK_URL`, `FACEBOOK_URL` (https://, Vercel > Environment Variables, puis redéployer). Elles ne comblent que les liens vides ; un lien saisi en base l'emporte. Le numéro WhatsApp vient toujours des réglages (`sellerWhatsApp`).
- Tests : `tests/unit/socials.test.tsx` (ordre, pied de page, filigrane, repli par l'environnement) ; `shop-render.test.tsx` mis à jour.

## 14. Tests

- Suite complète : 914 réussis, 35 échecs. **Les 35 échecs existaient avant ces modifications** (`orders.service.test.ts` : 34, `orders-admin.service.test.ts` : 1, champ `infoConfirmed` absent des données de test) et ne sont pas touchés ici. Avant : 904 réussis, 35 échecs.
- `npm run typecheck` : aucune erreur dans les fichiers modifiés ; les erreurs restantes viennent du client Prisma non généré hors ligne (`prisma generate` à lancer chez toi).
- `npm run build` non lancé.

**Fichiers modifiés** : `.env.example`, `public/fonts/` (+ `modak-latin-400.woff2`, `modak-OFL.txt`), `src/app/(boutique)/{layout,page}.tsx`, `src/app/(boutique)/a-propos/page.tsx`, `src/components/shop/{CurtainModal,Footer,LandingSections,MenuModal,NotFoundContent,OrderConfirmation}.tsx`, `src/content/landing.ts`, `src/lib/shop/socials.ts` (nouveau), `src/server/services/catalog.queries.ts`, `src/styles/{shop,tokens,ui}.css`, `tests/unit/{shop-render,spaghetti-render}.test.tsx`, nouveaux : `tests/unit/{no-eyebrow,curtain-replay,socials}.test(s)`.

---

# Mise à jour du 25 novembre 2026 : landing (hero, pot 3D, boutique, contact, marges, polices)

## 15. Hero
- `public/stage/hero2.webp` remplacée par la nouvelle photo (1086 × 1448, WebP, 253 Ko). Même nom de fichier : aucune référence à changer. `width`/`height` et `posterAlt` mis à jour.
- Le paragraphe « Hydratation, nettoyage ou nutrition… Une routine plus claire commence ici. » est **retiré** (clé `LANDING.hero.text` supprimée, balise `<p class="lead hero-lead">` supprimée). La phrase de réassurance sous les boutons reste.
- Le titre du hero est écrit en **Modak** (voir §20). La taille venait d'une règle `.hero h1` (shop.css) qui écrasait `--text-hero` : corrigé dans `titles.css`.

## 16. Pot 3D Fluffy Kinks à la place de l'élixir
- `public/models/fluffy-kinks-jar.glb` (fourni) remplace `elixir-winter-50ml.glb` (supprimé). `STAGE.models.elixir` devient `STAGE.models.jar` (`src/lib/stage/config.ts`, `engine.ts`).
- Le fichier est compressé en **meshopt** (`EXT_meshopt_compression`) : `engine.ts` branche `MeshoptDecoder` sur le `GLTFLoader`. Sans cela, le modèle ne se charge pas.
- **CSP** : `'wasm-unsafe-eval'` ajouté à `script-src` (`config/security-headers.mjs`) : le décodeur meshopt est du WebAssembly. Cela n'autorise ni `eval()` ni `new Function()`. Test ajouté dans `csp.test.ts`.
- Orientation : l'étiquette du fichier regarde vers +X ; `frontYaw = -π/2` la tourne vers la caméra (déterminé en décodant les sommets et la texture du fichier).
- Le repère du hero (`.stage-anchor-hero`) est posé sur le pot « Velvet » de la nouvelle affiche ; les repères de la section « guide » ont les proportions du pot (largeur / hauteur ≈ 0,9) au lieu de celles d'un flacon.

## 17. La page boutique est dans la landing
- Nouveau composant `ShopCatalog` (`src/components/shop/ShopCatalog.tsx`) : l'ancienne page `/boutique` (recherche, catégories, offres, tri, grille) devient la section `#boutique`, **juste après la section « guide »** (`Why`). Filtrage dans le navigateur (`filterShopProducts` dans `src/lib/shop/search.ts`) : la landing reste statique.
- `PUBLIC_ROUTES.shop` vaut maintenant `/#boutique` (en-tête, menu, panier, fiches, catégories).
- `/boutique` est redirigée définitivement (308) vers `/#boutique` dans `next.config.mjs`, avec sa requête (`/boutique?filtre=offres` → `/?filtre=offres#boutique`, relue par le catalogue). La page `src/app/(boutique)/boutique/page.tsx` est supprimée, `/boutique` quitte le sitemap.
- Les sections « produits par catégorie » (cartes sticky) restent plus bas ; leur ancre devient `#par-categorie` (l'ancre `#boutique` est celle du catalogue).
- Ordre de la landing : hero → bandeau → guide → **boutique** → collections → produits par catégorie → FAQ → **contact** → CTA.

## 18. Contact avant le CTA
- « Parlons de votre routine. » + texte à gauche, **fixes** (sticky ≥ 900 px) ; formulaire à droite, qui défile. Empilé sur téléphone. Placé avant le CTA.
- Note du CTA : « …Écrivez-nous juste au-dessus. » (elle disait « en dessous »).

## 19. Spray sous le fond du CTA
- `.cta-card` passe à `position: relative; z-index: 31` : au-dessus du canvas 3D (30). Le spray glisse sous la carte du CTA.

## 20. Marges et polices
- `--gutter: clamp(1.25rem, 6.25vw, 8rem)` : ≈ 100 px de chaque côté à 1600 px (les repères rouges de la capture), 20 px mini sur téléphone. S'applique à `.container` : en-tête, sections, pied de page et toutes les pages.
- Nouveau `src/styles/titles.css` (chargé en dernier) : **Modak**, la police du filigrane (`--font-logo`), pour le grand titre du hero et les titres de sections. Graisse 400 + `font-synthesis: none` (Modak n'a pas de gras). Préchargée dans le layout.

## 21. Tests
- Ajoutés : `tests/unit/shop-catalog.test.tsx` (filtre, tri, rendu du catalogue), cas `wasm-unsafe-eval` dans `csp.test.ts`.
- Adaptés : `spaghetti-render`, `shop-render` (hero sans description, liens `/#boutique`), `seo-indexation` (plus de `/boutique` ni de sitemap `/boutique`), `routes-weight-color`.
- **Non exécutés ici** : pas de réseau, donc pas de `npm install`. Vérifié : syntaxe de tous les fichiers modifiés (esbuild) et logique du filtre (exécutée sous Node). À lancer chez toi : `npm run typecheck && npm test && npm run build`.

## 22. Fusion avec `boutique-complet.zip` (vitrine photo)
- Base de la fusion : `boutique-complet.zip` (vitrine photo des six soins, jeu Cosmetic Smash retouché). Fusion à trois voies avec la version d'origine : seuls `layout.tsx`, `landing.ts` et `page.tsx` étaient touchés des deux côtés, plus `boutique/page.tsx` (modifiée par la vitrine, supprimée ici).
- `src/app/(boutique)/page.tsx` : en mode vitrine (`SHOWCASE_ENABLED`), la section `#boutique` (ShowcaseGrid) est **juste après la section « guide »**. Hors vitrine, c'est `ShopCatalog`, puis les collections et `#par-categorie`. Le bouton « Voir toute la boutique » est retiré : il pointait vers `/boutique`, désormais cette même section.
- `src/app/(boutique)/boutique/page.tsx` (et sa version `ShowcasePage`) : supprimée ; `/boutique` redirige vers `/#boutique`.
- `src/app/(boutique)/layout.tsx` : `showcase.css` conservé, `titles.css` chargé après `stage.css`, préchargement de Modak.
- `src/content/landing.ts` : les clés du jeu (`muteAction`, `unmuteAction`, `controls`) sont conservées ; hero sans description, nouvelle `posterAlt`, note du CTA corrigée.
- `src/styles/showcase.css` : règles `.showcase-page` et `.showcase-more` retirées (plus de page `/boutique`, plus de bouton).
- `docs/VITRINE-PHOTOS.md` : mis à jour (où ça s'affiche, passage au catalogue, fichiers touchés).
- Non exécuté ici (pas de `node_modules`) : `npm ci && npm run typecheck && npm test && npm run build`.
