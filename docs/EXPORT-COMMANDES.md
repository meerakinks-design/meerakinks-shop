# Export des commandes (Excel et CSV)

Cahier : D-25, P-55, RM-48, §10.3, §14.2. Entré dans le MVP en v2.6.

> ⚠️ Les valeurs marquées 🟡 (propriétaire seulement, 5 000 lignes au plus) viennent du cahier et restent à valider avec la cliente. Le fichier exporté contient des données personnelles : sa garde relève ensuite de la vendeuse. Ce document n'est pas un avis juridique.

## Ce qui est construit

| Élément | Où |
| --- | --- |
| Route `GET /api/v1/admin/orders/export?format=xlsx\|csv&…` | `src/app/api/v1/admin/orders/export/route.ts` |
| Service (filtres, limite, journal) | `src/server/services/orders-export.service.ts` |
| Tableau, protection des formules, CSV | `src/lib/orders-export.ts` |
| Fichier Excel | `src/lib/orders-export-xlsx.ts` |
| Lecture des filtres | `src/lib/validation/orders-export.schema.ts` |
| Page du back-office (propriétaire) | `/admin/export-commandes` : `src/app/admin/(protege)/export-commandes/page.tsx` + `src/components/admin/OrdersExportForm.tsx` |

L'écran **Commandes** (étape 8) n'existe pas encore : le cahier demande un bouton « Exporter » sur cet écran, avec les filtres en cours. En attendant, la page `/admin/export-commandes` offre les mêmes filtres. Quand l'écran Commandes sera construit, son bouton n'aura qu'à appeler la même adresse avec ses filtres (`buildOrdersExportUrl` dans `src/lib/orders-export-form.ts`) : le contrat ne change pas.

## Paramètres de la route

| Paramètre | Valeur | Remarque |
| --- | --- | --- |
| `format` | `xlsx` ou `csv` | obligatoire |
| `from`, `to` | `AAAA-MM-JJ` | jours inclus, lus à l'heure d'Abidjan (= UTC) ; début après fin = 422 |
| `deliveryStatus` | `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPED`, `DELIVERED`, `CANCELLED` | répétable ; vide = tous |
| `paymentStatus` | `TO_CONFIRM`, `DEPOSIT_DUE`, `DEPOSIT_PAID`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`, `CANCELLED` | répétable ; vide = tous |
| `zone` | `ABIDJAN`, `INTERIOR`, `INTERNATIONAL` | répétable ; vide = toutes |

Réponses : `200` fichier en pièce jointe (`Cache-Control: private, no-store`, en-tête `X-Export-Rows` = nombre de commandes) ; `401` sans session ; `403` hors propriétaire ; `422` paramètre invalide ou plus de 5 000 commandes (message : réduire la période). Le contrôle d'accès passe avant la lecture des paramètres.

## Colonnes (ordre du cahier P-55)

Référence · Date et heure (Abidjan) · Nom · Téléphone · Email · Zone · Destination · Adresse · Lignes · Sous-total · Frais de livraison · Total · À régler pour confirmer · Encaissé · Reste à payer · Statut de livraison · Statut de paiement · Note du client.

- **Lignes** : « produit × quantité », une par ligne dans la cellule. Les variantes (D-24, étape 9 bis) ne sont pas construites : avec elles, ce sera « produit — option × quantité ».
- **Encaissé** = paiements non annulés moins remboursements ; **Reste à payer** = total − encaissé, vide tant que le total n'est pas fixé (« frais à confirmer »). Jamais de total inventé.
- **Date** : vraie date dans l'Excel (tri et filtres du tableur), texte `jj/mm/aaaa hh:mm` dans le CSV.
- **Note** : la note du **client** seulement. La note **interne** de la vendeuse ne sort pas du système (le cahier dit « note » ; à confirmer si elle doit y figurer).
- Un client effacé (voir `CONSERVATION-DONNEES.md`) apparaît comme « Client anonymisé », adresse « Adresse supprimée ».

## Formats

- **CSV** : UTF-8 avec BOM, séparateur `;`, fins de ligne CRLF, champs entre guillemets quand ils contiennent `;`, `"` ou un retour à la ligne. S'ouvre correctement dans Excel en français.
- **Excel** : une feuille « Commandes », en-têtes en gras et figés, largeurs de colonnes, montants numériques au format `#,##0`. Relu dans LibreOffice (conversion en CSV) pendant les tests de développement ; **pas essayé dans Microsoft Excel**.

## Protection des tableurs (injection de formules)

Toute cellule **de texte** qui commence par `=`, `+`, `-` ou `@` (ajoutés : tabulation et retour chariot, recommandation OWASP) est préfixée d'une apostrophe, dans les deux formats. Les montants restent des nombres.

Conséquence visible, voulue : un **numéro de téléphone** (`+225…`) s'affiche avec une apostrophe devant (`'+2250700000000`). Il reste ainsi du texte (Excel ne le transforme pas en nombre `2,25E+12`). Dans l'Excel, une cellule de texte n'est de toute façon jamais évaluée comme formule (aucune balise `<f>` dans le fichier, vérifié par un test) ; l'apostrophe y suit la lettre du cahier et protège aussi un enregistrement ultérieur en CSV. À assouplir pour la seule colonne Téléphone de l'Excel si la vendeuse le préfère : décision du cahier à rouvrir.

## Journal et conservation

- Chaque export inscrit au journal `AdminAuditLog` : action `ORDERS_EXPORTED`, compte, date, format, filtres, nombre de lignes. **Jamais** le contenu du fichier ni une donnée de client (testé).
- Le journal est écrit **avant** la remise du fichier : s'il échoue, rien n'est téléchargé.
- Le fichier est créé à la demande, envoyé dans la réponse et **jamais stocké** (ni disque, ni Cloudinary, ni base). Il n'est pas mis en cache (`no-store`).
- La page rappelle à la vendeuse que le fichier est sous sa responsabilité (cahier §10.3) : à relire avec la politique de confidentialité validée.

## Choix de la bibliothèque Excel (justification demandée par le cahier, §14.2)

Le cahier proposait `exceljs` 🟡 « à justifier ». Choix retenu : **`write-excel-file` 4.1.1** (MIT), version exacte dans `package.json`.

| | `exceljs` 4.4.0 | `write-excel-file` 4.1.1 |
| --- | --- | --- |
| Poids installé | ≈ 22 Mo | ≈ 1,8 Mo |
| Dépendances directes | 9 | 1 (`fflate`) |
| Dernière publication (relevé du 20/11/2026) | décembre 2024 | juin 2026 |
| Besoin ici | lecture, styles avancés, flux : inutiles | écrire une feuille simple : suffisant |

Raisons : surface d'attaque et poids de dépendances plus faibles pour une seule feuille de données, bibliothèque plus récemment mise à jour. Contrepartie : projet plus petit (moins de ressources en ligne qu'`exceljs`). Si un besoin nouveau apparaît (graphiques, plusieurs feuilles mises en forme), `exceljs` reste une option ; le reste du code ne dépend que de `toXlsx(table)` : le changement ne toucherait qu'un fichier.

`npm audit` signale des vulnérabilités **déjà présentes** avant l'export (Next 14.2.35, postcss, zod 3.25.76, outils de test) : aucune ne vient de `write-excel-file`. Elles demandent des montées de version majeures (Next 16, zod 4) à planifier à part.

## Tests (`npm test`)

`orders-export.test.ts` (tableau, formules neutralisées, CSV, lecture du `.xlsx` produit), `orders-export.schema.test.ts` (filtres), `orders-export.service.test.ts` (filtres appliqués à la requête, limite, journal sans donnée personnelle, journal avant remise), `orders-export.route.test.ts` (accès : 401, 403 hors propriétaire, 422), `orders-export.ui.test.tsx` (page, formulaire, téléchargement).

## À valider / non couvert

- Valeurs 🟡 : propriétaire seul, 5 000 lignes, contenu de la colonne « note ».
- Pas d'essai dans Microsoft Excel ni sur téléphone ; pas d'essai contre la vraie base (requêtes testées avec une base simulée).
- Export des clients et de l'analytique : hors MVP (cahier §15).
