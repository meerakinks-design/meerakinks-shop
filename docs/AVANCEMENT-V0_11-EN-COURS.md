# Avancement v0.11

Base : `boutique-fusion-v0_10`. Rien n'a pu être lancé avec `next build`, `vitest` ni `prisma` dans l'environnement de travail
(pas de réseau, pas de `node_modules`). Ce qui a été vérifié : les modules purs et les services avec une base simulée (mini-runner
esbuild + remplaçant de Vitest), le rendu WebGL et une vraie partie dans Chromium (captures), le rendu des pages légales avec React,
et le typage des fichiers touchés (TypeScript, avec des déclarations factices pour React / Next / Prisma).
**À faire de ton côté : `npm ci && npm run typecheck && npm test && npm run build`**, puis ouvrir le jeu et les écrans admin.

## 1. Zones de livraison et délais indicatifs — FAIT
- `src/lib/shop/delivery-delay.ts` : délais par défaut de la cliente (24 h / 72 h / 5 à 15 jours), formatage, textes « indicatif ».
- Écran `/admin/livraison` (propriétaire) : zones, frais, délais min/max en heures, archivage, textes de la vendeuse.
- Affichés : formulaire de commande, FAQ, CGV, confirmation, message WhatsApp, emails client et vendeuse, PDF du reçu (délai figé dans le reçu, facultatif donc compatible avec les anciens reçus).
- Seed : communes d'Abidjan à 24 h. Aucune migration.

## 2. Analytique maison — FAIT (hors carte)
- Routes `POST /api/v1/track`, `/track/arrival`, `/track/forget` ; traqueur `AnalyticsTracker` (si `NEXT_PUBLIC_HOME_ANALYTICS_ENABLED=1` ET consentement) ; `data-track` sur les boutons principaux ; étapes du parcours.
- Onglet `/admin/analytics` (propriétaire) + générateur de lien balisé. Alerte « Nouvelle visite » (une par navigateur, 40/jour max). Purge à 90 jours dans le cron existant. Refus = effacement aussi côté serveur.
- Pas de migration (tables `VisitorSession` / `VisitorEvent` existantes).
- Pas fait : la carte ; le test automatique « chaque bouton public est balisé ».

## 3. Textes légaux — FAIT, À VALIDER
- CGV, CGU, mentions légales rédigées ; confidentialité et cookies mis à jour (mesure maison, durées, effacement serveur, ARTCI, transferts, sécurité). Pages provisoires et non indexées tant que `PRIVACY_TEXTS_VALIDATED` vaut `false`.
- Rien n'est inventé : identité, immatriculation, retours, remboursement, tribunal. Tout est listé dans `docs/CONFORMITE-LEGALE.md` (à fournir, à décider, à faire confirmer).
- Le catalogue réel reste à fournir par la cliente.

## 4. Jeu Cosmetic Smash — FAIT
- Pots 3D (GLB) en WebGL natif, repli automatique sur les pots dessinés. Coupe : les moitiés s'ouvrent comme un livre, face de coupe, disque de crème, éclair, secousse. Traînée de coupe. Bruitages synthétisés (lame, crème, verre ou plastique, hauteur qui monte à chaque pot du même geste, départ et fin). Bouton « Son ».
- GLB optimisés dans `public/assets/smash/` (5 Mo → 1,3 Mo) par `tools/optimize-smash-glb.py` ; tes fichiers d'origine ne sont pas modifiés. Servis en local (CSP `connect-src 'self'`), déclarés dans `config/cloudinary-media.json`.
- Libellés du bouton « Son » (🟡 à valider) dans `src/content/landing.ts`.
