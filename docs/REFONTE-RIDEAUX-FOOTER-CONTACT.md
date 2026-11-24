# Refonte « rideaux », footer, À propos, contact, nom complet (boutique-1 → boutique-3)

Ce document résume la mise à jour demandée sur `boutique-1.zip`. Il **remplace**, pour ces points, les décisions D-07 (« Notre histoire » en modal) et la structure du pied de page des cahiers v2.6 à v2.8.

## 1. Menu, panier, commande, confirmation : un seul mécanisme
- Composant commun : `src/components/shop/CurtainModal.tsx` (`<dialog>` natif porté par l'ancre : `#menu`, `#panier`, `#commande`, `#confirmation`).
- Entrée : deux rideaux de couleur (terracotta, orange) glissent depuis la **droite**, puis le panneau beige ; ensuite les liens du menu (et les lignes du panier, via `data-rise`) montent **un à un**. Sortie : tout repart vers la droite.
- **Ordinateur** : panneau collé à droite, largeur fixe (34 rem ; 38 rem pour commande et confirmation).
- **Téléphone** : le panneau laisse une bande du site à gauche (`--drawer-w` dans `ui.css`) : on voit d'où il vient, un toucher dessus le referme. Les bords des rideaux dépassent un peu et restent visibles en bandes de couleur.
- Mouvement réduit : ouverture et fermeture instantanées.
- `Modal.tsx` et `HistoryModal.tsx` sont supprimés.
- **Confirmation en modal** : après l'envoi, la commande (réponse du serveur) est gardée dans l'onglet (`lib/shop/confirmed-order.ts`, sessionStorage) et `#confirmation` s'ouvre à droite (`ConfirmationModal.tsx`). Le reçu « imprimé » ne se monte qu'à l'ouverture. Fermer la confirmation retire l'ancre sur place (elle ne rouvre pas le panier). La page `/commande/confirmation?ref=…` reste disponible pour un lien direct.

## 2. Pied de page en trois parties (référence Skarlett)
1. **Haut** : logo, signature « Embrassez vos kinks ! » et icônes de contact (WhatsApp, e-mail, Instagram, TikTok, Facebook : **seulement celles dont le lien existe**) à gauche · Informations (À propos, Crédits, CGV, CGU, mentions légales, confidentialité, cookies) au milieu · Navigation à droite.
2. **Milieu** : mini-jeu Cosmetic Smash sur **toute la largeur** du pied de page, plateau **carré sur téléphone**.
3. **Bas** : « MEËRA KINKS » écrit en texte (filigrane décoratif, plus de logo), puis copyright et « Créé par **AKATech Studio** » avec le logo qui apparaît au survol (`FooterCredit.tsx`, repris de Mon E-Carnet).
- Retirés : le texte de présentation (« Ma boutique vous propose… ») et le rappel de paiement (ils restent dans la FAQ, le panier et la commande).
- Logo AKATech Studio : `public/brand/akatech-studio-logo.webp` (fond transparent, tiré de l'image fournie le 23 nov.). Si le fichier manque, la carte au survol affiche « AKATech Studio » écrit.
- Lien du crédit : `https://akatech.vercel.app/` (`src/lib/constants/credits.ts`), **confirmé** le 23 nov.

## 3. Pages
- **`/a-propos`** (ancien modal « Notre histoire ») : page dédiée, dans le sitemap. Le menu, le teaser de l'accueil et le footer y mènent.
- **`/credits`** : page minimale, non indexée, hors sitemap.
- Boutique et fiches produit : déjà des pages dédiées (`/boutique`, `/produit/[slug]`) ; titres et descriptions SEO selon les textes v1.0 (`src/content/seo.ts`).

## 4. Effet élastique
Titres et surtitres de **toutes** les sections de l'accueil (héros compris, joué dès l'affichage) ; **les descriptions n'ont plus l'effet** (texte fixe). Un test le garde.

## 5. Contact : formulaire « intelligent » relié à Resend
- `POST /api/v1/contact` : interrupteur → origine → limite par IP (5 / 10 min) → corps JSON → champ piège → validation zod → limite par contact (3 / h) → envoi Resend vers l'adresse de notification des paramètres. Aucune donnée gardée en base ; le client n'est pas relancé par courriel automatique (pas de relais de spam).
- Le formulaire s'adapte : sujet « Ma commande » → référence obligatoire et vérifiée ; réponse WhatsApp → numéro avec indicatif ; réponse e-mail → adresse e-mail.
- Interrupteur : `NEXT_PUBLIC_CONTACT_FORM_ENABLED=0` masque la section (sauf coordonnées) et ferme la route. Sans clé Resend valide : 503 avec renvoi vers WhatsApp, jamais un faux succès.

## 6. Commande : « Nom complet » et case de vérification
- Un seul champ « Nom complet » (2 à 120 caractères) remplace prénom et nom ; la case « J'ai vérifié les informations de ma commande. » est **obligatoire** et contrôlée par le serveur (`infoConfirmed`, 422 sinon).
- Base : `Customer.fullName` remplace `firstName` et `lastName` ; la migration `20261123000000_customer_full_name` reprend les noms existants (prénom + espace + nom).
- Les **reçus déjà enregistrés** (JSON figé) gardent leur forme : ils sont relus comme un nom complet (`customerSchema` de `receipt.service.ts`).
- Mis à jour en conséquence : emails (« Bonjour {nom complet}, »), reçu PDF, export, anonymisation (`Client anonymisé`), recherche et fiche du back-office (lot v0.11), message WhatsApp du back-office.

## 7. Textes
Tous les textes de la landing, de la FAQ (9 questions), du panier, de la commande, des erreurs et du SEO reprennent `MEERA_KINKS_TEXTES_SITE_V1.md`, au vouvoiement. La section « À découvrir en ce moment » n'est **pas** présentée comme « favoris de la communauté » (aucune vente réelle ne fonde le classement).

## 8. À faire ensuite
- Lancer `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm test`, `npm run build`, puis `npm run e2e:visual` (rien de cela n'a tourné après la fusion).
- Appliquer la migration `customer_full_name` sur une vraie base et ouvrir un ancien reçu.
- Essayer le formulaire de contact avec un vrai compte Resend.
- Le cahier des charges est à jour : `Cahier_des_charges_MAJ_v3_0.md`.
