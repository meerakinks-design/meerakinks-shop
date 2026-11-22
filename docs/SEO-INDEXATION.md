# SEO et indexation

Cahier §11. Cette page dit ce qui existe, ce qui a été ajouté en v0.8.1 et ce qu'il reste à faire **hors du code** (Search Console, validation des textes).

> L'indexation par Google n'est pas garantie et ne garantit pas le classement (cahier §11). Rien ici n'a été vérifié sur un site en ligne : le code est testé, pas les résultats dans Google.

## Déjà en place avant la v0.8.1 (relu, non refait)

| Exigence §11 | Où |
| --- | --- |
| Titre et méta-description uniques, générés quand le champ est vide | `generateMetadata` des fiches produit et catégorie (`seoTitle`, `metaDescription`, sinon nom + `summarize(description)`) ; gabarit de titre « %s · nom de la boutique » dans `src/app/(boutique)/layout.tsx` |
| Adresses descriptives et stables | `/produit/<slug>`, `/categorie/<slug>` |
| Anciens slugs : redirection **308** | `permanentRedirect` dans les pages produit et catégorie (`slug-redirects.service.ts`, RM-30) |
| Adresses canoniques | `alternates.canonical` sur l'accueil, `/boutique`, `/categories`, produit, catégorie |
| Données structurées Product, fil d'Ariane, FAQ | page produit (Product + BreadcrumbList), page catégorie (BreadcrumbList), landing (FAQPage, seulement si la FAQ est visible) |
| Images avec texte alternatif, dimensions déclarées, Cloudinary `f_auto,q_auto` | `ProductImage.tsx`, `LandingSections.tsx` |
| Liens internes | fiche → catégorie, boutique, « Vous aimerez aussi » ; catégorie → boutique ; pied de page |
| Back-office non indexé | en-tête `X-Robots-Tag: noindex, nofollow` (middleware), `robots` des pages, `Disallow: /admin` |
| Confirmation de commande non indexée | `robots: noindex, nofollow`, `Disallow: /commande/`, `referrer: no-referrer` |

## Ajouté en v0.8.1

- **`sitemap.xml` et `robots.txt` sans adresse locale.** Avant, sans `NEXT_PUBLIC_SITE_URL`, ils publiaient `http://localhost:3000/...`. Maintenant : hors production, repli local pour tester ; **en production sans adresse configurée, le sitemap est vide et `robots.txt` n'annonce pas de sitemap** (on n'invente pas de domaine). `src/lib/shop/seo.ts` : `siteBaseUrl()`.
- **`/boutique` et contenu dupliqué.** Les pages triées ou filtrées gardent la canonique `/boutique` (cahier). Une **recherche libre** (`/boutique?q=…`) est en `noindex, follow` **sans canonique** : noindex et canonique ensemble envoient deux signaux contradictoires.
- **Description de `/categories`** (elle n'en avait pas).
- **Product : une offre par variante** quand le produit en a (D-24). `src/lib/shop/product-json-ld.ts` (`buildProductJsonLd`). Les variantes ne sont **pas encore construites** (étape 9 bis) : la fiche passe aujourd'hui sans variante, donc une seule offre, avec la même forme qu'avant. Le moment venu, il suffira de passer `variants`.
- **Vérification Search Console** par balise meta : variable `GOOGLE_SITE_VERIFICATION` (jeton seul, validé : lettres, chiffres, `_` et `-`). Sans elle, rien n'est ajouté.
- Pages légales, `/cookies` : `noindex` tant que les textes ne sont pas validés (`PRIVACY_TEXTS_VALIDATED`, `src/content/legal-status.ts`) ; elles ne sont pas dans le sitemap.

## À faire pour la mise en ligne (non automatisable ici)

1. Renseigner `NEXT_PUBLIC_SITE_URL` (adresse définitive, `https://…`) **avant** le build de production : les adresses canoniques, le sitemap et les données structurées en dépendent. Vérifier ensuite `/sitemap.xml` et `/robots.txt` dans un navigateur.
2. **Search Console** (seul outil Google retenu, D-22) : ajouter la propriété, choisir « Balise HTML », copier **la valeur de `content`** dans `GOOGLE_SITE_VERIFICATION`, redéployer, valider ; puis envoyer `https://<site>/sitemap.xml`.
3. Contrôler quelques fiches avec l'outil « Test des résultats enrichis » de Google (Product, FAQ, fil d'Ariane).
4. Publier les pages légales validées : passer `PRIVACY_TEXTS_VALIDATED` à `true` (politique de confidentialité, `/cookies`) et retirer le `noindex` des autres pages légales quand leur contenu est validé par la cliente et un professionnel (cahier §14.2).
5. Descriptions et titres : si `seoTitle` / `metaDescription` sont vides, ils sont générés ; les relire produit par produit reste un travail de rédaction (RM-42 : rien n'est inventé).

## Limites connues

- Le sitemap ne donne pas de `lastModified` aux catégories (la requête ne le lit pas) ; sans effet sur l'exploration, à ajouter si utile.
- Pas de `hreflang` ni de `llms.txt` (expérimental, non requis, cahier §11).
- Les performances (Core Web Vitals) n'ont pas été mesurées : pas de navigateur de test connecté à un site en ligne.
