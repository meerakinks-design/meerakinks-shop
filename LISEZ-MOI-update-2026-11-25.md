# Mise à jour du 25 novembre 2026 — `boutique-4` → `boutique-5` (fichiers modifiés seulement)

Copiez ce dossier **par-dessus** le projet (mêmes chemins), puis :

```bash
npm install          # ajoute recharts et met à jour package-lock.json (à valider dans le dépôt)
npm run typecheck && npm test && npm run build
```

> Rien de cela n'a pu tourner dans l'environnement de cette mise à jour (pas de réseau, pas de `node_modules`). Ont été essayés : les calculs de courbes, la validation des paramètres et le service des statistiques (avec une base simulée), le rendu des composants et du layout, et la mise en page dans Chromium à 360, 390, 720, 910 et 1280 px. **Recharts n'a pas été exécuté** : à regarder sur le site publié.

## Ce qui change

| Demande | Où |
|---|---|
| Courbes des KPI (Recharts) | `components/admin/charts/` (`KpiTrends`, `TrendChart`), `lib/admin-series.ts`, `lib/admin-chart-format.ts` ; tableau de bord (`(protege)/page.tsx`) et Analytics ; services `orders-admin` et `analytics-stats` |
| Sidebar sur PC (≥ 900 px) façon E-Carnet | `components/admin/AdminShell.tsx` (repli en rail mémorisé, menu du compte en bas), `AdminNav.tsx` (groupes), `(protege)/layout.tsx`, `styles/admin.css` |
| En-tête = celui de la landing | `AdminShell.tsx` + `admin.css` (logo, bouton orange « Boutique », bouton carré du compte) |
| Analytique maison active | `lib/constants/features.ts` : active sauf `NEXT_PUBLIC_HOME_ANALYTICS_ENABLED=0` |
| Reste à faire du cahier, relu dans le code | **Paramètres** (`/admin/parametres`, `PUT /api/v1/admin/settings`), **bouton « Renvoyer »** (`POST …/orders/[id]/emails/[emailId]/resend`) ; `TODO.md` et `Cahier_des_charges_MAJ_v3_0.md` recalés sur le code |
| Capture annotée (coche sur « Rien à traiter ») | `admin.css` : `.empty-state--done` |

Corrigé au passage : le sélecteur de période d'Analytics s'affichait « 7 jours30 jours90 jours » ; la barre du bas du téléphone passait sur deux rangées et masquait le contenu.

## À savoir

- La variable `NEXT_PUBLIC_*` est figée au build : l'analytique est active **après la prochaine publication**. Le visiteur doit accepter la bannière pour être mesuré.
- Le fichier `.env` de votre zip contient des identifiants réels : ne le partagez pas, il n'est pas dans cette mise à jour.
- Un compte « Équipe » ne voit ni Livraison, ni Paramètres, ni Analytics (propriétaire seulement, comme avant pour les deux derniers).
