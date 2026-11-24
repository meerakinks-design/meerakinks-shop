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
