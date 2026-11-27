> **Obsolète** : la scène 3D scroll (pot et spray GLB) a été retirée (voir `RAPPORT_MODIFICATIONS.md` §23). Ce document est conservé pour mémoire.

# Fusion : scène scroll 3D + marges + v0.11

Base : `boutique_complete_v2` (votre version). La v0.11 a été construite sur une base plus ancienne (anciens modals, `firstName/lastName`,
`lib/shop/variants`) : ses fichiers partagés n'ont donc PAS été copiés tels quels, sinon ils auraient fait régresser la v2.

## Scène scroll (Lenis + GSAP ScrollTrigger + three.js)
- `src/components/shop/ScrollStage.tsx`, `src/lib/stage/{config,engine}.ts`, `src/styles/stage.css`, `public/models/*.glb`, `public/stage/*.webp`.
- Repères HTML `data-stage-anchor` (hero, why, faq, cta) : `?stage=debug` les affiche. Réglages dans `config.ts` et `stage.css`.
- Correctif de build Vercel : `engine.ts` (`requestIdleCallback`) ; CSP : `blob:` ajouté à `connect-src` (textures des GLB).

## Marges
- `ui.css` (fin de fichier) : `--gutter` fine, plus de largeur maximale sur `.container`, `.page-narrow` sans plafond (lignes de texte limitées à 78 caractères).

## v0.11 — repris
- Textes légaux (CGV, CGU, mentions, confidentialité, cookies), `LegalDocument`, `legal-pages`, `legal-details`, `legal-status`.
- Analytique maison : routes `/api/v1/track*`, `AnalyticsTracker` (layout, si `NEXT_PUBLIC_HOME_ANALYTICS_ENABLED=1` + consentement),
  onglet `/admin/analytics`, alerte « Nouvelle visite » (`email-templates`, `notifications.service`), purge dans `runRetentionJob`, effacement au refus (`consent.ts`).
- Livraison : écran `/admin/livraison`, services, schémas, API, `delivery-delay.ts`, `getPublicDelivery` / `getLegalIdentity` (`catalog.queries.ts`).
- Cosmetic Smash 3D : `lib/smash/*`, GLB dans `public/assets/smash/`, bouton « Son » (`landing.ts`).
- `AdminNav` : liens Livraison et Analytics (propriétaire), en gardant Commandes et Clients.

## v0.11 — délais de livraison côté client (reportés à la main dans VOTRE code)
- `orders.service.ts` : délai de la zone (sinon celui du type), figé dans le reçu, annoncé dans le message WhatsApp et la réponse de confirmation.
- `receipt.service.ts` (schéma facultatif : les anciens reçus restent lisibles), `pdf.ts` (ligne « Délai indicatif »), `email-templates.ts` (email client et vendeuse).
- Formulaire de commande (`CheckoutForm` / `CheckoutModal`) : ligne « Délai indicatif » sous la destination ; `OrderConfirmation`, `ConfirmationModal` et page de confirmation ; `layout.tsx` fait une seule lecture (`getPublicDelivery`).
- FAQ : la réponse « Quels sont les délais de livraison ? » vient des zones actives et des textes de la vendeuse (`faqItems(depositAmount, storeName, delays, notes)`).
- Tests : emails (délai + alerte « Nouvelle visite »), CSP (`blob:`), `delivery-delay` (nouvelle signature de `faqItems`), Hero.

## Restyle du back-office (meera-kinks-admin-restyle)
- Repris : `admin.css` (nouveau), `AdminMobileMenu`, `AdminAccount`, layout admin racine et protégé, `login`, pages produit, `ProductForm`, `OrdersExportForm`, `AnonymizeCustomerForm`, `globals.css` allégé (styles admin déplacés dans `admin.css`).
- `AdminNav` restylé + onglets Livraison et Analytics (propriétaire) avec icônes ; styles des écrans Livraison / Analytics ajoutés à `admin.css` (préfixés `.admin-root`).
- Repris côté vitrine : en-tête sans fond (`shop.css`, `ui.css`), boutons de l'en-tête sur fond beige, en-tête qui tient dans 360 px.
- PAS repris (le reste de `shop.css` / `ui.css` du restyle date d'avant vos retouches Meëra : surtitres, accordéons « Pourquoi nous », ancien formulaire de contact, menu réseaux).

## v0.11 — PAS repris (à reporter à la main si besoin)
- `data-track` sur les boutons (Header, ProductCard, CardCartControl, ProductPurchase, boutons de commande) : l'analytique fonctionne, mais sans le détail des boutons touchés.
- `prisma/seed.ts` (communes d'Abidjan à 24 h : à saisir dans `/admin/livraison`), `Footer`, `CartModal`, `CartProvider`, `globals.css` / `shop.css` de la v0.11.

## À faire de votre côté
`npm install` (met à jour `package-lock.json` : `three`, `lenis`, `@types/three`), puis `npm run typecheck && npm test && npm run build`.
