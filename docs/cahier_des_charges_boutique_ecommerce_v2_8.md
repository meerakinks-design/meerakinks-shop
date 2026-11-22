# Cahier des charges — Boutique e-commerce

| | |
|---|---|
| **Version** | 2.7 (remplace la v2.6) — mise à jour d'après le code v0.10 et la charte graphique Meëra Kinks v1.2 |
| **Date** | 21 novembre 2026 (v2.6 : 19 novembre) |
| **Projet** | Boutique en ligne de la marque **Meëra Kinks** (soins capillaires pour cheveux crépus, d'après la charte v1.2 ; périmètre exact du catalogue à confirmer, question 29), commandes enregistrées sur le site, récapitulatif transmis à la vendeuse via WhatsApp, gestion depuis un back-office |
| **Réalisation** | AKATech Studio (Aka), Abidjan |
| **Code livré** | `boutique-v0_10-mise-a-jour.zip` (`package.json` en 0.10.0) : base v0.10 + conservation des modules v0.8 absents de la v0.10 (sécurité, export commandes, consentement/cookies, conservation-restauration et SEO) ; fusion documentée dans `docs/FUSION-V08-V10.md` |
| **Sources** | Cahier v1.0 (`cahier_cadrage_boutique_ecommerce_akatech.md`), cahier WhatsApp initial (`cahier_cadrage_ecommerce_whatsapp.md`), questionnaire cliente (`e_commerce.html`), document de la landing (`landing_page_structure_et_writing_boutique_v1_4.md`), échanges de conception, projet v0.4, projets de référence d'Aka : **Rabbit Shop** (`rabbit-shop_1.zip`, effets typographiques ; code des titres relu dans `rabbit-shop.zip` le 19 nov.) et **site AKATech Studio** (`akatech-nextjs-11-cumul_1.zip`, back-office et analytique), **charte graphique Meëra Kinks v1.2** (`Charte_graphique_Meera_Kinks_v1_2.pdf`, 21 nov. 2026), **logo simple** (`logo_simple_meera_PDF.pdf`) et **capture de référence du pied de page de Palmo** (`palmo.co.in/story`, annotée par Aka : zones 1, 2 et 3) |

**Légende.**
✅ livré et vérifié dans le code (jusqu'à la v0.10) · 🔶 à construire · ❓ à confirmer avec la cliente · 🟡 proposé, à valider par Aka

> **Ce que ce document est.** C'est la référence du projet : ce qui est décidé, ce qui est déjà construit, les règles que le code doit respecter, et ce qui reste ouvert. Toute décision nouvelle s'ajoute au registre du §2 et au journal du §17.
> **Ce qu'il n'est pas.** Un avis juridique ou fiscal. Les pages légales et la nature du reçu (§3, §14) doivent être validées par la cliente et, si besoin, par un professionnel.

> **Nouveautés de la v2.7 (21 novembre 2026).** **1. Mise à jour d'après le code v0.10** : l'effet « spaghetti » (v0.9) et le **mini-jeu Cosmetic Smash** (v0.10) sont **livrés** ; un **contrôle visuel dans Chromium** (179 vérifications, téléphone et ordinateur) a fait corriger quatre défauts (barre d'achat collée sur la landing et sur le pied de page, erreur de typage, éclats du jeu trop pâles) ; **587 tests** (§12, §13, §17). **2. Charte graphique Meëra Kinks v1.2 reçue** (D-30) : nom, ton de voix, palette de six couleurs, polices, logos et icônes deviennent la référence (§4.7, RM-49 à RM-52, P-59 à P-61, P-64 à P-66). **3. Logo** (D-31) : logo combiné dans le header et le footer, icône seule pour le favicon `.ico`. **4. Pied de page fusionné avec l'aire de jeu** (D-32) : liens en haut (zones 1 et 2), aire de jeu au milieu, zone 3 en bas (filigrane « Meëra Kinks », © 2026, crédit), d'après la capture de Palmo annotée par Aka (§4.8, P-62). **5. Mini-jeu au « slash »** (D-33) : on tranche les pots du doigt, chaque pot est **coupé en deux** (§4.6, P-63). **Rien de ce qui touche à la charte, au logo, au pied de page et au slash (points 2 à 5) n'est encore construit : c'est l'étape 13 bis (§13).**
>
> **Nouveautés de la v2.6 (19 novembre 2026).** Décisions d'Aka sur le retour de la cliente (annexe D) : analytique = **Vercel Web Analytics + analytique maison**, pas de Google Analytics (D-22) · **acompte à Abidjan seulement**, paiement intégral ailleurs, expédition par la vendeuse (D-23) · **variantes de produit** dans le MVP (D-24, P-53, P-54, §9) · **export des commandes** dans le MVP (D-25, P-55) · **délais indicatifs selon la zone** (D-26, P-56) · **reçu, pas de facture** (D-27) · **public neutre** (D-28) · **effet « spaghetti » = code de Rabbit Shop** (D-29, P-41). **À cette date le code était en v0.8 ; depuis, l'effet « spaghetti » (v0.9) et le mini-jeu (v0.10) sont livrés, le reste de cette liste n'est pas construit.**

> **Mise à jour de fusion — 21 novembre 2026.** La v0.8 a été mise à niveau sur la base de la v0.10. Les fichiers communs utilisent la v0.10 (mini-jeu Cosmetic Smash, effet spaghetti, commande, emails, reçu PDF, contrôle Chromium) ; les fichiers présents uniquement en v0.8 ont été ajoutés et conservés (sécurité, export Excel/CSV, consentement/cookies, conservation des données, restauration, SEO et tests associés). Aucun fichier v0.8 n’a été supprimé.
>
> **État à retenir dans le code fusionné.** ✅ Déjà livré : vitrine, catalogue, panier, commande WhatsApp, emails/reçus, sécurité de base, export des commandes, consentement/cookies, SEO, effet spaghetti, mini-jeu et contrôles automatisés v0.10 ; la fusion finale passe 818 tests unitaires. 🔶 Reste à construire ou finaliser : variantes de produits, gestion opérationnelle des commandes/paiements/livraisons dans le back-office, analytique propriétaire et alerte « nouveau visiteur », paramètres, habillage final conforme à la charte (logo, couleurs, polices), footer fusionné avec le jeu, interaction slash des pots, assistant IA, tests sur vrais appareils/navigateurs et branchement des services réels (Neon, Cloudinary, Resend, Vercel). ❓ Restent à confirmer avec la cliente : catalogue/catégories, options de variantes, zones/frais et délais, modalités de paiement, textes légaux et contenus de marque.

---

## 1. Contexte et objectifs

### 1.1 Le problème
Aujourd'hui, les commandes passent par WhatsApp. La cliente constate que :
- enregistrer le numéro puis écrire est **trop long** pour beaucoup de clients ;
- répondre à de nombreux messages est **fatigant**, et il faut réexpliquer à chaque fois chaque produit ;
- des commandes arrivent désormais **de l'extérieur** (pays voisins, Europe) ;
- la **nouvelle direction artistique** de la marque s'accorde mal avec une simple conversation WhatsApp.

Les solutions du marché (Shopify avec nom de domaine) sont trop chères pour la cliente. Le choix est donc un site sur mesure, léger à héberger.

### 1.2 La solution
Un site e-commerce où le visiteur consulte les produits, remplit un panier et envoie sa commande **sans quitter le site**. La commande est enregistrée en base, la vendeuse est alertée par email, et WhatsApp s'ouvre avec le récapitulatif prérempli pour la suite des échanges. WhatsApp reste disponible pour les demandes, réclamations et avis.

### 1.3 Objectifs
1. Présenter l'univers de la marque et ses produits.
2. Permettre la consultation des produits et des catégories.
3. Gérer un panier multi-produits.
4. Collecter coordonnées et adresse de livraison, avec les règles de paiement selon la zone.
5. **Enregistrer chaque commande avant d'ouvrir WhatsApp.**
6. Donner à la vendeuse un back-office simple pour produits (avec variantes), commandes (avec **export Excel et CSV**), clients, paiements et livraisons.
7. Conserver reçus et historique des opérations.
8. Un assistant commercial IA qui explique et conseille les clients, **préparé dès maintenant, construit après l'étape 10** (§15.1).
9. Mesurer l'audience du site (provenance du visiteur, pages vues, boutons touchés, durée de visite), **avec consentement**, dans l'onglet Analytics du back-office, et **alerter la vendeuse par email à chaque nouveau visiteur** (D-17, §7.6, P-45), en complément de **Vercel Web Analytics** (D-22).

---

## 2. Registre des décisions

### 2.1 Décisions prises

| ID | Décision | Origine |
|---|---|---|
| D-01 | **Next.js 14 (App Router) full-stack**, Route Handlers, Prisma, Neon PostgreSQL, Vercel. Pas de backend séparé (ni Django, ni Express sur Render). Même architecture que le site AKATech Studio. | Aka |
| D-02 | Le back-office reprend le **périmètre de celui de Rabbit Shop** (liste + formulaire, confirmation de suppression), avec un schéma adapté. On reprend ses schémas d'interaction, pas ses composants : son style (néon, Tailwind, framer-motion) est celui de sa marque. **Le style du back-office est remplacé par D-16** (le périmètre reste). | Aka, v0.3 ; style révisé le 19 nov. |
| D-03 | La commande est **enregistrée en base d'abord**, puis WhatsApp s'ouvre avec un message prérempli (`wa.me`), action manuelle du client. **Pas d'API WhatsApp Business** : trop coûteuse. | Aka |
| D-04 | À chaque nouvelle commande, la vendeuse reçoit un **email Resend**, avec le reçu en PDF. L'email est le canal d'alerte fiable. | Aka |
| D-05 | **Paiements hors site** pour l'instant : la vendeuse met à jour la commande dans le back-office une fois le paiement reçu. Un **webhook de paiement en ligne** viendra plus tard. | Aka |
| D-06 | **L'acompte est toujours payé par Wave.** | Aka |
| D-07 | **Panier, commande et « Notre histoire » sont des modals** sur la landing. Il n'y a **pas** de pages `/panier`, `/commander`, `/notre-histoire`. | Aka |
| D-08 | **Contact et FAQ restent des sections de la landing** : pas de pages `/contact` ni `/faq`. | Aka |
| D-09 | Pages légales : **CGV, CGU, mentions légales**. | Aka |
| D-10 | Le **prix est calculé par le serveur** ; le total affiché dans le navigateur n'est qu'indicatif. | Aka |
| D-11 | Header : **icône panier avec badge** (nombre de produits et prix). Cartes produit : **bouton « + »** d'ajout au panier ; le nom ou la photo mène à la fiche (`/produit/[slug]`). | Aka |
| D-12 | **DA de la boutique** : s'il y a des catégories, une **section sticky par catégorie** avec un **carrousel** de ses produits (réf. MyFrida) ; sinon, les produits sont **disposés en grille aléatoire** dans la section boutique (réf. Hello Hello). Le bouton « Ajouter » s'affiche au survol ou au toucher. Détail produit sur une page slug. Voir §4. | Aka |
| D-13 | Le **domaine** sera acheté depuis Vercel. | Aka |
| D-14 | **Assistant commercial IA** plus tard, une fois le site prêt, même architecture que celui d'AKATech Studio. | Aka |
| D-15 | Authentification du back-office : **compte en base** (mot de passe haché, créé par un seed), et non des identifiants en variables d'environnement. | Aka, validé |
| D-16 | **Back-office dans l'esprit de celui du site AKATech Studio** : une page à onglets, une vue d'ensemble « à traiter aujourd'hui », un thème clair ou sombre mémorisé, des cartes sur mobile, des graphiques et une carte des visiteurs. On reprend l'organisation et les schémas d'interaction, pas le code ; la mise en forme reste en CSS à variables (T-10), donc la charte de la cliente se branche toujours en un seul fichier. **Remplace le style de D-02** (son périmètre reste). Détail : §7.1 et §7.6. | Aka, 19 nov. |
| D-17 | **Analytique propriétaire dans le périmètre, avec consentement** : provenance du visiteur (pays, région ou province, ville), pages vues, **tous les boutons touchés**, durée sur le site, parcours d'un visiteur ; lue dans l'onglet Analytics du back-office, **et alerte email « Nouvelle visite » envoyée à la vendeuse à chaque nouveau visiteur** (pays, province, provenance, sans adresse IP ; comme sur le site AKATech Studio). **Remplace P-08 et P-18.** Détail : §7.6, P-43, P-44, P-45. | Aka, 19 nov. |
| D-18 | **Titres de section et textes en effet « spaghetti »** (référence Rabbit Shop) sur toute la landing. Détail, limites et exceptions : P-41, §4.5, document de la landing §26. | Aka, 19 nov. |
| D-19 | **Mini-jeu : pots réalistes et bien faits** (pas des pictogrammes) : volumes, reflets, ombres, éclatement crédible. Détail : §4.6, P-42. **Livré en v0.10** (pots dessinés en canvas) ; évolution « slash » : D-33. | Aka, 19 nov. |
| D-20 | **L'étape 13 (animations avancées, mini-jeu) est traitée avant l'étape 10.** ⚠ Voir la note du §13. | Aka, 19 nov. |
| D-21 | **L'assistant IA est préparé dès maintenant**, sur le modèle de celui d'AKATech Studio mais **plus robuste** : spécification complète proposée au §15.1 (P-47 à P-52) ; construction après l'étape 10 (étape 15). Précise D-14. | Aka, 19 nov. |
| D-22 | **Analytique : pas de Google Analytics.** On retient **Vercel Web Analytics** (`@vercel/analytics`, déjà utilisé sur Rabbit Shop) **et l'analytique maison** (D-17). **L'adresse IP reste non enregistrée** (D-17, §10.3) : la cliente obtient le pays, la province et la ville approximatifs. Google **Search Console** reste utilisée pour l'indexation (§11). Détail : P-57. Remplace la réponse E4 de la cliente. | Aka, 19 nov. |
| D-23 | **Acompte de 2 000 FCFA à Abidjan seulement**, fixe pour toute commande d'Abidjan. **Hors d'Abidjan (intérieur du pays et étranger) : paiement intégral avant expédition, et la vendeuse fait elle-même l'expédition.** Confirme RM-05, RM-06 et l'annexe B ; lève le doute sur la réponse B2. | Aka, 19 nov. |
| D-24 | **Variantes de produit dans le MVP** (réponse A3 = oui) : table `ProductVariant`, ligne de commande liée à une variante, **bouton « + » revu** (feuille de choix de l'option). Remplace la mention « hors schéma MVP » du schéma v0.8. Détail : RM-43 à RM-46, P-53, P-54, §9, étape 9 bis. | Aka, 19 nov. |
| D-25 | **Export des commandes dans le MVP** (réponse D6 = oui) : Excel (.xlsx) et CSV, depuis l'écran Commandes, avec les filtres en cours. Sort de « hors MVP » (§15). Détail : RM-48, P-55. | Aka, 19 nov. |
| D-26 | **Délais de livraison indicatifs, selon la distance** : Abidjan 24 h · intérieur du pays 72 h · international 5 à 15 jours (réponse C4), **portés par chaque zone** (la vendeuse peut les affiner par commune, ville ou pays) et repris partout par la source unique (RM-41). Ce ne sont **pas** des garanties. Détail : RM-47, P-56. | Aka, 19 nov. |
| D-27 | **Reçu de commande, jamais de facture.** Le pied « Reçu de commande — ne constitue pas une facture. » (P-35) est définitif (RM-26). | Aka, 19 nov. |
| D-28 | **Public neutre** : aucune formulation au féminin dans les textes publics (« nos clientes », « Elles en parlent »…). | Aka, 19 nov. |
| D-29 | **Effet « spaghetti » = l'animation des titres de la landing de Rabbit Shop**, relue dans son code (`.elastic-title`, `lib/useGsapLenis.ts`) : ce n'est plus une interprétation mais une **reprise**. Détail : P-41, §4.5, landing §26. | Aka, 19 nov. |
| D-30 | **La charte graphique Meëra Kinks v1.2 est la référence de l'identité du site** : nom (« Meëra Kinks », avec le tréma), ton de voix (vouvoiement), palette de **six couleurs et seulement six**, polices **Poppins et Great Vibes**, logos L1 à L5 et icônes I1 à I5. Elle remplace les couleurs et polices provisoires du code. Détail : §4.7, RM-49 à RM-52. | Aka, 21 nov. (charte transmise ; réponse F0b) |
| D-31 | **Logo combiné (nom + icône aux deux puffs) dans le header et dans le footer ; l'icône seule pour le favicon (`.ico`).** La variante du logo suit le fond (charte §4 et §5) : détail et fichiers à fournir en P-60. | Aka, 21 nov. |
| D-32 | **Pied de page et aire de jeu fusionnés**, en trois zones d'après la capture de Palmo annotée par Aka : **zones 1 et 2 en haut** (logo, liens de navigation, d'aide et pages légales) ; **l'aire de jeu** au milieu ; **zone 3 en bas** (filigrane « Meëra Kinks », « © 2026 Meëra Kinks », crédit). Remplace le bloc de jeu posé au-dessus du footer en v0.10. Détail : §4.8, P-62. | Aka, 21 nov. |
| D-33 | **Mini-jeu au « slash »** : on tranche les pots avec le doigt (ou la souris) et **chaque pot touché est coupé en deux**. Remplace le « toucher pour faire éclater » de la v0.10. D-19 (pots réalistes) est maintenu. Détail : §4.6, P-63. | Aka, 21 nov. |

### 2.2 Choix techniques retenus (livrés en v0.4)

| ID | Choix | Raison |
|---|---|---|
| T-01 | TypeScript strict + zod | Argent et statuts : les erreurs doivent casser à la compilation. |
| T-02 | Route Handlers `/api/v1/*` comme contrat (pas de Server Actions pour les mutations) | Testable au `curl` avant toute interface ; l'assistant IA pourra réutiliser les services. |
| T-03 | Session admin **opaque en base** (jeton 256 bits, seul son hash est stocké) | Révocable : changement de mot de passe, compte désactivé. |
| T-04 | Photos envoyées **directement du navigateur à Cloudinary**, avec signature fournie par le serveur | Une photo de téléphone dépasse la limite de 4,5 Mo d'une requête Vercel ; le secret reste côté serveur. |
| T-05 | **Argent en entiers FCFA** | Pas d'arrondi flottant. |
| T-06 | **Deux statuts séparés** (livraison, paiement) | Une commande peut être confirmée sans être payée. |
| T-07 | **Un reçu par commande, données figées**, PDF généré à la demande | Modifier le catalogue ne change jamais un ancien reçu. |
| T-08 | **Redirections de slug** en base | Aucun lien partagé ou référencé ne casse. |
| T-09 | **Anti-abus en base** (`RateLimitBucket`, une requête SQL atomique) | Un compteur en mémoire ne marche pas sur Vercel (plusieurs instances). |
| T-10 | UI du back-office en **CSS à variables** (`tokens.css`), sans Tailwind | La charte de la cliente se branche en un seul fichier. |

### 2.3 Propositions à valider (🟡)

| ID | Proposition | Pourquoi |
|---|---|---|
| P-01 | Menu du back-office à **7 entrées** (Tableau de bord, Commandes, Produits, Clients, **Analytics**, Livraison, Paramètres) au lieu de 9 *(6 en v2.4 : Analytics revient avec D-17)* | Les reçus se téléchargent depuis la commande, les échecs d'envoi s'affichent sur la commande ; l'analytique maison est de nouveau dans le périmètre (D-17). |
| P-02 | Modals en **`<dialog>` natif** montés dans le layout public, avec une **ancre** (`#panier`, `#commande`, `#notre-histoire`) | Le bouton Retour du téléphone ferme le modal ; l'icône panier marche sur toutes les pages ; focus et Échap gratuits. |
| P-03 | Confirmation en **`/commande/confirmation?ref=CMD-…`** | Sans référence, la page ne sait pas quelle commande montrer. |
| P-04 | Bouton « + » **toujours visible sur écran tactile** ; au survol et au focus clavier sur ordinateur | Sur téléphone il n'y a pas de survol ; « toucher pour révéler puis retoucher » casse « toucher = ouvrir la fiche ». |
| P-05 | Disposition « aléatoire » **stable** (calculée à partir de l'identifiant du produit) | Une disposition recalculée à chaque chargement fait sauter la page. |
| P-06 | Section finale **« Autres produits »** pour les produits sans catégorie quand d'autres en ont | Aucun produit publié ne disparaît. |
| P-07 | Formulaire de commande avec **zone** (commune d'Abidjan / intérieur / étranger), **indicatif** téléphonique, email facultatif | La zone décide acompte ou paiement intégral et frais ; des commandes viennent de l'étranger. |
| P-08 | ~~Statistiques de visite par un **outil externe sans cookies** (Vercel Web Analytics ou Plausible) au MVP~~ — **remplacée par D-17** (analytique maison avec consentement), puis **partiellement rétablie par D-22** : Vercel Web Analytics s'ajoute à l'analytique maison (Plausible écarté) | ~~L'analytique maison est lourde et demande consentement et durée de conservation.~~ Ces contraintes sont désormais acceptées : P-43 et P-44 les traitent. |
| P-09 | Page **`/politique-de-confidentialite`** en plus de CGV, CGU, mentions légales | On collecte noms, téléphones et adresses. |
| P-10 | **Création manuelle de commande** dans le back-office après le MVP | Des clients commanderont encore par WhatsApp ; `Order.source = MANUAL` est déjà prévu. |
| P-11 | Contenu de « Notre histoire » **présent dans le HTML dès le chargement** (pas chargé au clic) | Pour rester indexable. |
| P-12 | **« Offres & nouveautés » n'est pas une catégorie** : ce sont des raccourcis de la boutique (`/boutique?filtre=offres`, `/boutique?tri=nouveautes`) | Un produit n'appartient qu'à une seule catégorie. |
| P-13 | **Best-sellers** = produits **« mis en avant »** par la vendeuse ; badge « Nouveau » **calculé** (publié depuis 30 jours ou moins) ; **pas de badge « Best-seller »** avant d'avoir de vraies ventes | Au lancement, aucune vente ne justifie « Best-seller » (règle : jamais de promesse non justifiée). |
| P-14 | **Focus produit** choisi dans les paramètres ; section masquée s'il n'y en a pas | Pas de produit inventé ni de section à trous. |
| P-15 | **Avis et publications Instagram** : listes dans le code, **vides au départ**. Section Avis réduite à l'invitation tant qu'aucun avis réel autorisé n'existe ; « Partager mon expérience » ouvre WhatsApp prérempli | Aucun avis inventé ; avis administrables plus tard (§15). |
| P-16 | **Textes de la landing dans le code** (modifiés par AKATech) ; un **test de build échoue** si un champ entre crochets reste dans un contenu publié ; une section sans données n'est pas affichée | La règle « ne jamais inventer » est appliquée par le code. |
| P-17 | **Source unique** des règles de paiement et de livraison, reprise partout (footer, FAQ, formulaire, confirmation, email) | Les textes ne peuvent pas se contredire. |
| P-18 | ~~**Pas de bannière cookies** tant qu'aucun traceur non essentiel n'est utilisé~~ — **remplacée par D-17 et P-44** (bannière de consentement et page `/cookies`) | ~~Statistiques sans cookies, pas d'intégration Instagram.~~ L'analytique maison est un traceur : la bannière devient nécessaire. |
| P-19 | `/boutique` avec **recherche, filtre par catégorie et par offres, tri** ; pages **404** et erreur aux couleurs de la marque ; états vides (panier, catégorie, boutique non alimentée) | Cahier v1.0 §5.1 (recherche et filtre) ; voir le document de la landing, §18. |
| P-20 | **Ordre de la landing** : Hero → bandeau → Collections (cartes) → **Boutique** (sections sticky par catégorie, sinon grille) → Best-sellers → Histoire → Focus → Pourquoi nous → Avis → Instagram → FAQ → Contact → CTA final | Choix fait à la construction de la vitrine. **Redondance possible** : cartes Collections, sections sticky par catégorie et Best-sellers montrent des produits de façons voisines. À arbitrer sur pièce : garder les trois, ou retirer les cartes Collections et/ou les Best-sellers. |
| P-21 | **Aucun lien mort** : « Collections », « Contact » et « Voir nos best-sellers » n'apparaissent que si leur section existe ; une section sans données n'est pas affichée | Au lancement (catalogue vide, aucun contact saisi), ces liens ne mèneraient nulle part. |
| P-22 | **Pages légales provisoires et non indexées** tant que les textes ne sont pas fournis ; **hero sans visuel** (typographique) en attendant la charte | On n'invente ni texte juridique ni image. |
| P-23 | **Destination** : liste des zones **actives** quand il en existe pour la zone choisie ; **saisie libre** (commune, ville, pays) et frais « à confirmer » quand aucune zone n'est configurée | Les réponses de la cliente sur les zones (questions 3 et 4) manquent : on n'invente ni zone ni tarif (RM-42). La vendeuse confirme la destination par WhatsApp (annexe B). |
| P-24 | **Acompte plafonné à la valeur de la commande** (une commande de 1 500 FCFA ne demande pas 2 000 FCFA d'acompte) | Règle non écrite dans le cahier ; sans elle, un acompte pourrait dépasser le prix des produits. |
| P-25 | **Téléphone** : un numéro ivoirien compte **10 chiffres, le 0 initial compris** (numérotation du 31 janvier 2021) ; pour les autres pays, un seul 0 de tête est retiré ; indicatif en liste (Côte d'Ivoire d'abord) ou « Autre pays » | Le téléphone sert de WhatsApp et d'identifiant client : il doit être exploitable. |
| P-26 | **Fiche client** : les coordonnées les plus récentes remplacent les anciennes ; un email n'est jamais effacé par une commande sans email ; la commande garde sa copie figée dans le reçu | Pas de compte client : le téléphone identifie, mais ne prouve pas l'identité. Risque faible (aucune lecture possible à partir d'un numéro). |
| P-27 | **Confirmation lue par la référence** (40 bits, non séquentielle) : page `noindex`, sans `referrer`, limitée à 30 consultations / 10 min / IP ; le lien WhatsApp est reconstruit depuis la base | Le bouton reste utilisable après rechargement ; la référence est le seul secret de la page. |
| P-28 | **Limites de commande** : 10 par 10 minutes et par IP (large : beaucoup de clients mobiles partagent une adresse), 5 par heure et par téléphone ; même clé d'idempotence = même commande si même téléphone et mêmes articles, sinon refus (409) | Anti-abus sans bloquer un vrai client. |
| P-29 | **Interrupteur `NEXT_PUBLIC_CHECKOUT_ENABLED`** appliqué aussi côté serveur (503) | Fermer le bouton ne suffit pas : l'API doit être fermée aussi. |
| P-30 | **Panier changé** (produit retiré, épuisé, stock insuffisant) : l'envoi est **refusé (409)** avec le détail ; le panier n'est jamais ajusté en silence. **Stock réservé à la commande** (RM-17, ❓ à confirmer avec la cliente) ; l'annulation d'une commande restituera le stock (étape 10) | Le client a vu un total : il ne doit pas en payer un autre sans le savoir. |
| P-31 | **Pas de case « J'accepte les CGV »** : une mention et un lien vers la politique de confidentialité sous le bouton | Non demandée dans le cahier ; à revoir avec les pages légales. |
| P-32 | **Deux emails par commande** : alerte à la vendeuse **avec le reçu PDF joint**, lien WhatsApp du client et étapes de l'annexe B ; accusé au client (si email) **sans PDF** — le reçu se remet après confirmation — avec le texte de paiement validé. Aucune garantie ni paiement « reçu » n'y est annoncé ; le **délai indicatif de la zone** (RM-47) peut y figurer, tiré de la source unique | La vendeuse agit depuis l'alerte ; le client reçoit ce qui est validé, rien d'inventé (RM-42, RM-10). |
| P-33 | **Tentative immédiate** (4 s au plus par email, jamais bloquante) après l'enregistrement, puis **cron** : 6 tentatives (1, 5, 15, 60, 180 min) puis abandon visible ; erreur définitive (adresse refusée) abandonnée tout de suite ; clé ou domaine invalide (401/403) réessayé | Une commande ne dépend jamais d'un email (RM-34) ; un défaut de configuration se corrige sans perdre l'email. Limite : un email peut partir deux fois si le serveur s'arrête après l'envoi et avant l'écriture du résultat. |
| P-34 | **Cron quotidien** dans `vercel.json` (`0 6 * * *`) ; **`*/10 * * * *` en production (plan Pro)** | Le plan gratuit refuse tout autre rythme et fait échouer le déploiement. |
| P-35 | Pied du reçu : « **Reçu de commande — ne constitue pas une facture.** » | **Définitif depuis D-27** : la cliente prend un reçu, pas une facture (RM-26). |
| P-36 | **PDF en latin occidental** : emoji et autres alphabets sont remplacés par « ? » au lieu de faire échouer le document | Un nom de produit ou de client inattendu ne doit jamais empêcher l'alerte de partir. |
| P-37 | **Une variable d'environnement laissée vide équivaut à une variable absente** | `.env.example` contient des lignes vides : sans cette règle, le copier tel quel plantait l'application. |
| P-38 | **Reçu PDF servi au back-office seulement** : `GET /api/v1/admin/orders/[id]/receipt`, avec la référence publique ou l'identifiant ; généré à la demande, jamais stocké ni mis en cache | RM-25 : le reçu suit toujours les paiements enregistrés. |
| P-39 | **Reçu de commande en ticket de caisse, téléchargé en PNG dès la validation** ✅ (v0.8) : sur la page de confirmation, une imprimante « sort » le ticket et le fichier `recu-CMD-….png` se télécharge aussitôt (une seule fois par commande ; un bouton permet de le retélécharger). Contenu : boutique, date (heure d'Abidjan), référence, destination, lignes, sous-total, frais et total **« à confirmer »** tant qu'ils ne sont pas fixés, acompte ou montant à régler, tampon **« PAIEMENT NON REÇU »**, étapes de l'annexe B, code-barres (Code 39) de la référence, pied de P-35. **Aucune donnée personnelle** (ni nom, ni téléphone, ni adresse). Le ticket affiché et le fichier viennent du même dessin. | Aka a voulu un reçu façon ticket, remis tout de suite. **Écart avec P-32** (« le reçu se remet après confirmation ») : le client reçoit désormais un **ticket de commande** immédiat et non payé (RM-10, RM-25) ; le **reçu PDF** (P-38) reste réservé à la vendeuse et suit les paiements enregistrés. |
| P-40 | **Fiche produit, panier et en-tête au format mobile de référence** ✅ (v0.8) : en-tête avec logo à gauche, panier (icône + badge) et menu hamburger à droite ; fiche produit en galerie balayable à flèches, grand titre, ligne « Quantité », bouton « Ajouter au panier ↗ » avec le prix à droite, cartes « Caractéristiques » et « Mode d'utilisation », pastilles de réassurance, texte « À propos de ce produit », barre d'achat collée en bas sur téléphone ; panier en feuille avec liste défilante et pied fixe (livraison « À confirmer », sous-total, « Passer commande »). | Captures de référence fournies par Aka. Rien n'est inventé (RM-42) : pas de promotion « pack », pas de garantie, pas de délai ; les pastilles reprennent des règles validées. |
| P-41 | **Effet « spaghetti » = reprise du code des titres de Rabbit Shop** (D-29). *Titres* : classe `.elastic-title`, boucle de `lib/useGsapLenis.ts` ; **GSAP SplitText 3.13** découpe en lettres (`charsClass: 'hero-char'`, `display: inline-block`) ; **réalisé en v0.9 sans GSAP** : la courbe est recalculée et écrite en CSS `linear()`, le découpage se fait au rendu serveur ; départ **`y: 60`, `opacity: 0`, `scale: 0.5`** ; arrivée `y: 0`, `opacity: 1`, `scale: 1`, **`duration: 1.3`, `stagger: 0.015`, `ease: 'elastic.out(0.75, 0.3)'`** ; **ScrollTrigger** `start: 'top 85%'`, `toggleActions: 'play none none reverse'` ; la découpe attend `document.fonts.ready`. *Textes courants* : **par mot**, même élasticité, décalage plus court (confirmé par Aka). **Écarts voulus avec Rabbit** : (1) découpage **`words,chars`** : chaque mot est un bloc insécable (Rabbit découpe en `chars` seuls, ce qui peut couper un mot en fin de ligne ; il a dû corriger ce défaut dans `CharSplitHeading`) ; (2) **mouvement réduit** : aucun effet (Rabbit n'en tient pas compte sur ces titres) ; (3) **Hero** : pas de délai de 0,9 s (Rabbit en a un, lié à son intro) ; le texte n'est jamais retardé ; (4) **aucun GSAP** : CSS pur, rien à charger (v0.9). **Exceptions** : prix et montants, libellés de boutons et de formulaires, messages d'erreur, pages légales. Texte complet dans le HTML dès le chargement. **Option reportée** (Aka, 20 nov. : « pas pour le moment ») : image de produit qui flotte près de la lettre survolée (`wireHoverImageChars`, ordinateur seulement) ; le même code de Rabbit l'active déjà sur ses titres, ici ce seraient des photos de produits publiés. | Aka a demandé « l'animation des titres de la landing de Rabbit Shop ». Code relu le 19 nov. : les valeurs retenues en v2.5 (60 px, 0,5, 1,3 s, 0,015 s) étaient les bonnes. **À valider sur pièce** dans la boutique (polices, longueur des titres). |
| P-42 | **Mini-jeu : pots réalistes** — des **contenants cosmétiques génériques, sans marque** (pot de crème, flacon pompe, compte-gouttes, tube, bouteille), avec volumes, reflets, ombres et matières crédibles (verre, plastique, métal) ; couleurs tirées des **couleurs de catégories** ; éclatement avec éclats et éclaboussure de crème ; partie de **30 s**. Dessinés en **SVG ou canvas détaillés** ; des **visuels fournis** par la cliente ou des **photos de produits détourées** pourront les remplacer. | « Réalistes, bien faits » (Aka). Aucune image fournie à ce jour et aucun logo ni produit inventé (RM-42). Durée et tailles : propositions, à valider en jouant. |
| P-43 | **Analytique propriétaire** (D-17). À chaque visite **avec consentement**, le serveur enregistre le **pays, la région ou province et la ville approximatifs** (lus dans les en-têtes de l'hébergeur, arrondis, jamais une position exacte), l'appareil, le navigateur, la provenance (lien balisé `utm_*`, sinon domaine du site référent), les **pages vues**, **chaque bouton ou lien touché** (liste fermée d'identifiants, jamais une chaîne libre), les événements du parcours (`product_view`, `add_to_cart`, `remove_from_cart`, `checkout_started`, `order_submitted`) et la **durée de visite** (signal d'activité toutes les 15 s tant que l'onglet est visible). **L'adresse IP n'est jamais enregistrée** (§10.3) ; aucun lien entre une visite et un client ou une commande. Lecture dans l'onglet Analytics (§7.6), réservé au propriétaire. | Aka veut savoir d'où vient le visiteur, ce qu'il touche et combien de temps il reste. Reprend l'organisation de l'analytique d'AKATech Studio, **sans** y stocker l'IP (le cahier l'interdit, §10.3). |
| P-44 | **Bannière de consentement et page `/cookies`.** Aucun identifiant ni mesure **avant le choix** ; « Refuser » = rien n'est enregistré et les données déjà enregistrées pour ce navigateur sont effacées ; le choix se modifie à tout moment depuis `/cookies` (lien « Gérer mes cookies » dans le footer) ; **l'alerte email « Nouvelle visite » (P-45) n'est envoyée que pour un visiteur qui a accepté** ; la politique de confidentialité (P-09) décrit les données, leur durée de conservation et les droits. Option ❓ : garder une **mesure strictement anonyme** (compteurs par pays, sans identifiant ni cookie) même sans consentement, à faire valider par un professionnel. | Remplace P-18 : l'analytique est un traceur. **Ce n'est pas un avis juridique** : la conformité (consentement, déclaration auprès de l'autorité ivoirienne de protection des données) est à faire valider (§14). |
| P-45 | **Alerte email « Nouvelle visite » à la vendeuse (via Resend), comme sur le site AKATech Studio.** Route dédiée `POST /api/v1/track/arrival` (distincte de `POST /api/v1/track`, qui enregistre pages vues et clics) : appelée **une seule fois**, à la première visite d'un navigateur **ayant accepté** la mesure ; elle crée une ligne d'alerte dans la **boîte d'envoi existante** (mêmes reprises par le cron, déduplication par visiteur : jamais deux alertes pour le même navigateur) et ne bloque jamais la page. **Contenu** : objet « Nouvelle visite depuis [province], [pays] » ; **pays**, **province**, **provenance** (Google, Instagram, Facebook, TikTok, WhatsApp, autre site ou accès direct), page d'arrivée, appareil, heure d'Abidjan ; **aucune adresse IP**, ni dans l'email, ni en base. **Plafond d'alertes par jour** (🟡 40, comme AKATech) : au-delà, l'événement reste visible dans l'onglet Analytics, seul l'email est ignoré. Les emails de **commande ont toujours priorité** (RM-34). | Précisé par Aka le 19 nov. (« resend envoie automatiquement un message de nouveau visiteur, comme AKATech, mais à la vendeuse… pays, province, Google ou Instagram ou Facebook… sans IP »). Remplace ma première lecture (renvoi d'un email). Le plafond protège le quota Resend au profit des emails de commande. |
| P-46 | **Route du bouton « Renvoyer »** (déjà prévu au §7.5) : `POST /api/v1/admin/notifications/[id]/resend` (admin) remet une ligne de la boîte d'envoi en file immédiatement ; limitée en fréquence, journalisée avec le compte administrateur, sans envoi concurrent (réservation conditionnelle, comme le cron). | Le bouton « Renvoyer » figurait dans le cahier v2.4 sans route : elle est précisée ici. |
| P-47 | **Assistant IA à outils de lecture, prompt court** : le catalogue n'est **pas** dans le prompt ; l'assistant interroge des **outils en lecture seule** (recherche de produits, fiche **avec ses variantes**, catégories, livraison **et délais indicatifs**, règles de paiement, FAQ) branchés sur les services existants, **données publiées uniquement** (RM-27, RM-31). Ouverture en modal `#assistant` (P-02), réponse en flux continu. | Le prompt d'AKATech (~6 000 jetons) limite son fournisseur de secours aux conversations courtes ; un catalogue de boutique ne tiendrait pas dans un prompt. Détail : §15.1. |
| P-48 | **Prix et faits jamais rédigés par le modèle** : les produits s'affichent en **cartes rendues par le site** à partir des outils ; un **contrôle de sortie** remplace toute réponse contenant un montant absent des résultats d'outils ; ingrédient, effet, promotion ou délai absent des données = « je n'ai pas cette information » + WhatsApp (RM-42) ; aucun conseil médical. | Un prix faux dit par une IA engage la boutique ; la règle « rien n'est inventé » doit être appliquée par le code, pas par la confiance. |
| P-49 | **Résilience et coûts** : cascade ordonnée de fournisseurs (Gemini puis Groq, liste en configuration) avec **délai maximal, nouvelle tentative, disjoncteur** (un fournisseur en échec répété est écarté quelques minutes), **sonde quotidienne** qui détecte un modèle retiré, repli sur WhatsApp en dernier recours ; limites par IP hachée et par session (T-09), **plafond quotidien d'appels**, **interrupteur** `NEXT_PUBLIC_ASSISTANT_ENABLED` appliqué aussi côté serveur (503, comme P-29). | AKATech apprend qu'un modèle est retiré par un email de dépréciation ; ici, la panne ne doit jamais se voir, ni coûter plus que prévu. |
| P-50 | **Vie privée de l'assistant** : il ne demande **jamais** de coordonnées (la commande passe par le formulaire) ; rappel visible avant le premier message ; téléphones et emails saisis **masqués** avant tout enregistrement ; conversations enregistrées **seulement avec le consentement de P-44**, **30 jours** 🟡 puis supprimées ; sans consentement, seuls des compteurs sans texte ; aucun lien avec un client ou une commande. | Le chat attire des données personnelles que personne n'a prévu de collecter. |
| P-51 | **Périmètre et passage à l'humain** : l'assistant conseille et oriente, il **ne prend pas de commande** et n'encaisse rien ; « Ajouter au panier » n'ajoute rien tant que le visiteur ne **touche pas le bouton** ; réclamation, remboursement, allergie ou réaction de peau, état d'une commande : **toujours WhatsApp**, avec un résumé sans coordonnées prérempli. | La commande reste sous le contrôle du client et de la vendeuse (RM-12, RM-36). |
| P-52 | **Supervision et tests** : onglet « Assistant » du back-office (conversations, passages à WhatsApp, fournisseurs et erreurs, durée de réponse, avis « Utile / Pas utile », **questions sans réponse** que la vendeuse utilise pour enrichir la FAQ) ; tests avec un fournisseur simulé, messages hostiles, garde-fou de prix et **jeu de questions d'évaluation** rejoué à chaque changement de prompt ou de modèle. | Une IA non mesurée dérive sans que personne ne le voie. |
| P-53 | **Variantes : modèle.** Table `ProductVariant` : étiquette (« 250 ml », « Noir », « M / Noir »), référence interne facultative et unique, **prix facultatif**, stock, actif, ordre ; `Product.optionLabel` (« Taille », « Format », « Couleur »…, « Option » par défaut). Un produit a **zéro** variante (cas courant : rien ne change) **ou plusieurs**. **Prix** : la variante **hérite** du prix et du prix promotionnel du produit, ou **remplace les deux** (jamais un mélange : une promotion pourrait dépasser le prix). **Stock** : si le produit a des variantes, le stock vit sur la variante, celui du produit est ignoré. **Publier** exige au moins une variante active. Une variante déjà commandée **se désactive, elle ne se supprime pas**. Photos : celles du produit. Tests prévus : prix hérité ou remplacé, stock par variante (concurrence), variante désactivée refusée (409), ligne figée avec son étiquette. | Réponse A3 = oui ; reprend l'esquisse commentée du schéma v0.8. **Une seule étiquette par variante, pas de combinaisons taille × couleur** : elles multiplient les lignes ; « M / Noir » s'écrit dans l'étiquette. |
| P-54 | **Bouton « + » et variantes.** Produit sans variante, ou avec une seule variante active : comportement inchangé (P-04, §4.2). **Produit à plusieurs variantes : le « + » ouvre une petite feuille de choix** (pastilles d'options avec leur prix, option épuisée grisée, quantité, « Ajouter au panier », lien « Voir la fiche »), sans quitter la page. **Fiche** : bloc d'options **avant** la ligne Quantité ; bouton désactivé (« Choisissez une option ») tant qu'aucune option n'est choisie ; une seule option active = présélectionnée. **Cartes et carrousels** : « à partir de … » si les prix diffèrent. Panier, commande, reçu PDF, ticket PNG, emails, message WhatsApp : « NOM — option ». | Avec 180 produits, ouvrir la fiche pour chaque variante ralentirait l'achat sur téléphone ; la feuille réutilise le motif du panier (P-40). **Repli simple** si elle est jugée trop lourde : la carte ouvre la fiche, comme en v2.5. |
| P-55 | **Export des commandes.** Bouton « Exporter » de l'écran Commandes : **Excel (.xlsx)** et **CSV** (UTF-8 avec BOM, séparateur `;`, pour s'ouvrir correctement dans Excel en français), selon les **filtres affichés** (période, statuts, zone). Colonnes : référence, date et heure d'Abidjan, nom, téléphone, email, zone, destination, adresse, lignes (« produit — option × quantité »), sous-total, frais, total, montant à régler pour confirmer, montant encaissé, reste à payer, statut de livraison, statut de paiement, note. `GET /api/v1/admin/orders/export?format=xlsx\|csv&…` : **propriétaire seulement** 🟡, 5 000 lignes au plus 🟡, **généré à la demande, jamais stocké**, **journalisé** (compte, date, filtres, nombre de lignes). **Protection des tableurs** : toute cellule de texte commençant par `=`, `+`, `-` ou `@` est préfixée d'une apostrophe, sinon un nom saisi par un client peut s'exécuter comme formule. Excel : `exceljs` 🟡 (à justifier, §14.2) ; le CSV n'en demande aucune. Tests prévus : formules neutralisées, filtres respectés, accès refusé hors propriétaire, journal écrit. | Réponse D6 de la cliente. Le fichier contient des données personnelles qui sortent du système : accès restreint et trace (§10.3). |
| P-56 | **Délais indicatifs par zone.** `DeliveryZone.deliveryMinHours` et `deliveryMaxHours` (vides = aucun délai affiché, RM-42). Seed : **Abidjan 24 h · intérieur 72 h · international 120 à 360 h (5 à 15 jours)** (réponse C4). La vendeuse les **affine par commune, ville ou pays** dans l'écran Livraison (« selon la distance »). Affichage : jusqu'à 72 h en heures (« 24 h », « 72 h »), au-delà en jours (« 5 à 15 jours »). Formulation proposée 🟡 : « Délai indicatif, à compter de la confirmation de la commande. L'équipe vous confirme le délai exact sur WhatsApp. » **Jamais** « garanti », jamais une date précise. Repris par la **source unique** (RM-41) : FAQ, formulaire (selon la zone choisie), confirmation, email, ticket. ❓ **Point de départ du délai à confirmer avec la cliente** (question 27). | La cliente a donné trois délais ; Aka veut qu'ils suivent la distance. **Le point de départ n'a pas été dit : on le propose, on ne l'invente pas.** |
| P-57 | **Vercel Web Analytics en complément de l'analytique maison (D-22).** `<Analytics />` de `@vercel/analytics/next` (activé aussi dans le tableau de bord Vercel), **monté seulement après le consentement** de P-44 🟡 : une seule règle, rien n'est mesuré avant le choix. **Option ❓** : le charger sans consentement parce qu'il n'utilise pas de cookies, **seulement si un professionnel le valide** (§14.2, point 12). Il ne remplace pas l'onglet Analytics : Vercel donne l'audience, l'analytique maison donne les boutons, les parcours et l'alerte « Nouvelle visite ». **Aucun Google Analytics.** `/cookies` et la politique de confidentialité citent Vercel. | Aka : « vercel analytique et notre analytique maison ». Les deux outils se recoupent en partie ; un régime de consentement unique évite d'en expliquer deux sur `/cookies`. |
| P-58 | **Zones et pays desservis (réponses C1 à C3).** Seed : **toutes les communes d'Abidjan** (les 13 déjà en base) ; **intérieur : tout le pays**, destination saisie librement (P-23) ; **étranger : 13 pays** en liste (Burkina Faso, Mali, Niger, Togo, Bénin, Cameroun, Congo Kinshasa, Congo Brazzaville, Gabon, Ghana, Nigeria, France, Canada). Un pays hors liste ne s'enregistre pas : « Nous ne livrons pas encore dans ce pays. Écrivez-nous sur WhatsApp. » 🟡. **Frais : toujours « à confirmer »** (RM-03), la cliente n'a pas donné de tarifs. | On ne livre que ce que la cliente a annoncé. La liste de pays vient de ses réponses : à relire avec elle avant le seed. |
| P-59 | **Palette et variables CSS.** Les six couleurs de la charte deviennent les variables de `src/styles/tokens.css` (T-10) : Beige `#F8EEDC` fond (60 %), Marron `#7F3F20` texte (30 %), Orange `#F48128` logo et boutons d'action (10 %), Jaune-orangé `#FF9500`, Terracotta `#D95525`, Pêche `#F2B590` détails. **Aucune autre couleur** : ni blanc pur, ni noir, ni gris, ni couleur métallique (RM-51) — ce qui oblige à remplacer les noirs, blancs et gris provisoires du code, y compris dans le mini-jeu (texte des points, ombres, fond de l'aire de jeu). Tableau complet : §4.7. | La charte l'impose ; un seul fichier la porte (T-10). Les contrastes publiés par la charte servent de garde-fou. |
| P-60 | **Logos et favicon.** *Header* : **L1** (logo original simple, fond Beige), 120 px de large au minimum. *Footer* : **L1** si le fond du pied de page est Beige (proposé, P-62) ; **L5** (jaune-orangé) ou **L3** (beige) si le fond est Marron — **L1 est interdit sur Marron** (« le Meëra disparaît »). *Page d'accueil et image de partage* : **L2** (avec slogan), 200 px minimum, fond Beige. *Favicon* : **I1** (icône aux couleurs d'origine) **posée sur une tuile Beige**, car la charte n'autorise I1 que sur Beige ou Pêche et qu'un onglet de navigateur peut être sombre ; `favicon.ico` contenant 32 et 48 px (la charte fixe 32 px pour un favicon), `apple-touch-icon` 180 px, icônes 192 et 512 px. Zone de protection : une marge de x (hauteur d'un puff) autour du logo. Jamais déformé, pivoté, recoloré, ombré ni recomposé dans une autre police. Texte alternatif « Meëra Kinks ». **Fichiers reçus** : le logo L1 **sur fond Beige, en PDF** (non transparent). **À fournir** : PNG transparents ou SVG de L1, de L5 (ou L3) et de L2, et de l'icône I1. *En attendant*, le nom écrit en Poppins Medium (« entête de marque », charte §7). | Charte §4 et §5 ; demande d'Aka du 21 nov. (D-31). |
| P-61 | **Typographie.** **Poppins** (graisses 100, 400, 500, 600 et 800) et **Great Vibes**, **auto-hébergées** (`next/font` ou `@fontsource`), jamais depuis un CDN tiers ; **Choret Fudyng Bubble** n'est pas chargée (réservée aux fichiers du logo). Hiérarchie de la charte : titre Poppins ExtraBold, sous-titre Regular, entête de section SemiBold, corps Regular, légende Thin, cursive Great Vibes (slogan, citations). Les tailles de la charte sont en points : équivalent web = pt × 4/3 (tableau §4.7), à rendre fluides sur téléphone. **Fin des majuscules intégrales** (la charte les interdit dans les titres) : à retirer des titres et des boutons du code actuel. Titres de 8 mots au plus ; un seul titre principal par page ; Great Vibes en une ou deux lignes, jamais pour une information pratique (prix, mode d'emploi, ingrédients). | Charte §7. La licence SIL OFL de Poppins et Great Vibes autorise l'usage commercial. |
| P-62 | **Pied de page en trois zones fusionné avec l'aire de jeu** (D-32). *Fond Beige* (proposé : le logo L1 est alors le même que dans le header, et les pots Marron restent visibles) ; **variante Marron** possible, comme sur la capture, avec L5 et texte Beige, mais les pots de la sous-gamme Nutrition (Marron) y disparaîtraient. *Bord supérieur en arches* (« formes arrondies », charte §3), en Orange. *Zone 1* : logo combiné et signature « Embrassez vos kinks ! » en Great Vibes. *Zone 2* : trois groupes de liens (Navigation, Besoin d'aide ?, Informations légales), plus « Suivez-nous » conservé (non cité par Aka) et le rappel paiement et livraison (RM-41). *Aire de jeu* : voir §4.8. *Zone 3* : filigrane « Meëra Kinks » **écrit en Poppins ExtraBold, en Pêche** (décoratif, `aria-hidden`) — **pas** le logo recomposé (charte §4) —, puis « © 2026 Meëra Kinks » et le crédit **« Site réalisé par AKATech Studio »** *(formulation et lien à valider)*. | Capture de Palmo annotée par Aka (zones 1, 2, 3) ; charte §3, §4 et §6. |
| P-63 | **Slash : règles du geste et des pots** (D-33). Détail au §4.6. En bref : un **geste** (doigt ou souris) laisse une **traînée** dans la palette ; **tout pot croisé par la traînée est coupé en deux** le long de la direction du geste, les deux moitiés s'écartent et tombent, la **tranche est crème** ; le **score est inchangé** (10, 20 ou 30 points selon la taille 🟡) ; un simple toucher coupe verticalement ; **`touch-action: pan-y` conservé** : les gestes horizontaux et peu inclinés coupent, un geste vertical fait défiler la page (le défilement n'est jamais bloqué). *Contenants adaptés à la gamme* : pot de chantilly ou de masque, flacon pompe (lait capillaire), **flacon spray** (spray hydratant, antipelliculaire — il remplace le compte-gouttes, absent de la gamme), bouteille (shampoing), tube. *Couleurs* : celles des sous-gammes (Orange, Jaune-orangé, Marron). | Demande d'Aka (slash, coupe en deux) ; gamme de la charte. Le choix de `pan-y` préserve la règle « le défilement n'est jamais bloqué » ; l'option `touch-action: none` pendant la partie permettrait des gestes verticaux mais bloquerait le défilement sous le doigt : écartée. |
| P-64 | **Catégories et sous-gammes.** La charte organise la gamme **par besoin, un besoin = une couleur** : **Hydratation** (Orange : spray hydratant, lait capillaire), **Nettoyage** et **Pousse et croissance** (Jaune-orangé : shampoing, spray antipelliculaire, produits dédiés), **Nutrition** (Marron : chantilly capillaire, masque « bientôt »). La **couleur d'accent d'une catégorie** (`accentColor`) est donc l'une de ces trois couleurs, jamais une autre ; elle désigne un besoin et ne sert pas de décor (Pêche et Terracotta ne désignent jamais un besoin). Les **six catégories** annoncées par la cliente (A2) restent à rattacher à une sous-gamme (question 29). | Charte §6 « Le code couleur des sous-gammes ». Les couleurs provisoires du code sont remplacées. |
| P-65 | **Boutons, contrastes et états.** *Boutons d'action* : fond **Orange**, libellé **Marron** en Poppins SemiBold d'au moins **19 px** (14 pt gras, seuil « grand texte » : 3,0:1) — la charte donne 3,0:1 pour Marron sur Orange et l'autorise à partir de 18 pt ; **alternative plus sûre** : fond Marron, libellé Beige (6,9:1). Texte courant : Marron sur Beige (6,9:1). Jamais de texte Orange, Jaune-orangé ou Pêche. *Focus visible* : anneau Marron. *Erreurs* : la palette n'a **pas de rouge** ; proposé : texte Marron + icône et liseré Terracotta, jamais une couleur hors palette (RM-51) — **à valider**. | Les contrastes de la charte (p. 23) ; WCAG AA (§4.5). Le 3,0:1 de Marron sur Orange est limité aux grands textes. |
| P-66 | **Textes et ton.** Vouvoiement partout (site, emails, reçu, message WhatsApp, assistant IA), phrases courtes, on part du besoin (« Vos boucles manquent de souplesse ? »), un ou deux émojis au plus, **aucune promesse médicale** (RM-52). Le **« texte de la gamme »** de la charte (« Trois couleurs, quatre besoins ») est utilisé tel quel sur le site (proposé : introduction des collections). Les textes de la landing rédigés pour une boutique générique (« produits de beauté et d'accessoires », « soins corporels ») sont **à revoir avec la cliente** (RM-38) : liste dans le document de la landing §32. | Charte §2. RM-38 : textes définitifs validés par la cliente. |

---

## 3. Règles métier

### 3.1 Prix et montants
| ID | Règle |
|---|---|
| RM-01 | Tous les montants sont des **entiers en FCFA**. |
| RM-02 | Le client paie `prix promotionnel` s'il existe, sinon `prix`. Le serveur relit les prix en base ; le total du navigateur est indicatif. |
| RM-03 | `total = sous-total + frais`. Tant que les frais ne sont pas fixés, `frais = null`, `total = null` et le site affiche **« frais à confirmer »**. **Les frais ne sont jamais inventés.** |
| RM-04 | Chaque ligne de commande **fige** le nom, le prix unitaire et la quantité. Modifier le catalogue ne change pas une commande existante. |

### 3.2 Paiement et livraison selon la zone
| ID | Règle |
|---|---|
| RM-05 | **Communes d'Abidjan** : paiement à la livraison ; **acompte de 2 000 FCFA** pour confirmer la commande ; solde réglé à la réception. **Fixe pour toute commande d'Abidjan** (D-23) ; valeur réglable dans les paramètres |
| RM-06 | **Intérieur du pays et étranger** : paiement **intégral** avant expédition ; frais d'expédition inclus dans le montant ; la vendeuse confirme le montant exact. **L'expédition est faite par la vendeuse** (D-23). |
| RM-07 | L'acompte, comme le paiement intégral hors Abidjan, passe **par Wave**, au numéro communiqué par la vendeuse **après confirmation**. |
| RM-08 | Le **numéro Wave n'est jamais affiché** sur le site public (il est dans les paramètres du back-office). |
| RM-09 | Après la commande, la vendeuse contacte le client sur WhatsApp pour : vérifier les informations, confirmer la disponibilité, préciser les frais de livraison, communiquer les modalités de paiement. |
| RM-10 | **Un paiement n'est jamais présenté comme vérifié** sans validation de la vendeuse. |
| RM-11 | Une note d'information sur le paiement et la livraison est **visible avant la validation** de la commande (texte validé en annexe B). |

### 3.3 Commande
| ID | Règle |
|---|---|
| RM-12 | La commande est **enregistrée côté serveur avant l'ouverture de WhatsApp**. La base est la source de vérité ; WhatsApp facilite la communication. |
| RM-13 | Référence unique **non séquentielle** (ex. `CMD-7K3M9QXP`) : une référence devinable permettrait de lire les commandes des autres. |
| RM-14 | Une **clé d'idempotence** unique par commande protège du double clic et des renvois réseau : la même clé renvoie la commande déjà créée. |
| RM-15 | **Pas de compte client obligatoire.** Le client est identifié par son téléphone au format international ; la fiche client est créée ou retrouvée à chaque commande. |
| RM-16 | La **livraison se met à jour à la main** par la vendeuse. Une commande **livrée ou annulée est définitive** : une erreur se corrige par une nouvelle commande. L'annulation restitue le stock s'il est suivi. |
| RM-17 | **Stock** : `null` = non suivi (le produit n'est jamais « épuisé »). Sinon décrément **atomique** à la commande (deux clients sur le dernier article ne passent pas tous les deux). ❓ À quel moment le stock diminue-t-il ? ❓ Gestion du stock dès le MVP ? Avec des variantes, le stock se décrémente **sur la variante** (RM-45). |

### 3.4 Statuts
**Livraison** : En attente → Confirmée → En préparation → En livraison → Livrée. Annulée possible tant que ce n'est pas livré.

| Statut (code) | Signification |
|---|---|
| En attente (`PENDING`) | Commande reçue, à vérifier |
| Confirmée (`CONFIRMED`) | Validée par la vendeuse |
| En préparation (`PREPARING`) | Produits en préparation |
| En livraison (`SHIPPED`) | Colis remis au livreur ou expédié |
| Livrée (`DELIVERED`) | Remise au client (définitif) |
| Annulée (`CANCELLED`) | Commande annulée (définitif) |

**Paiement** (séparé de la livraison) : À confirmer (`TO_CONFIRM`) · Acompte attendu (`DEPOSIT_DUE`) · Acompte reçu (`DEPOSIT_PAID`) · Paiement partiel (`PARTIALLY_PAID`) · Paiement intégral reçu (`PAID`) · Remboursé (`REFUNDED`) · Annulé (`CANCELLED`).

| ID | Règle |
|---|---|
| RM-18 | Chaque changement de statut est journalisé : type (livraison ou paiement), ancienne valeur, nouvelle valeur, **compte administrateur**, date, note. |
| RM-19 | Le statut de paiement est **recalculé** à partir des paiements enregistrés. « Remboursé » et « Annulé » sont posés à la main. |

### 3.5 Paiements et reçus
| ID | Règle |
|---|---|
| RM-20 | Chaque encaissement est **une ligne** de paiement : type (acompte, solde, paiement intégral, remboursement), mode (Wave, espèces, autre), montant positif, date, administrateur, note. |
| RM-21 | Une erreur de saisie **s'annule** (date et motif conservés), elle ne se supprime pas : un reçu déjà remis reste traçable. |
| RM-22 | Un **remboursement** est une ligne de type `REFUND` qui **se soustrait** du total encaissé. |
| RM-23 | Le **chiffre d'affaires** du tableau de bord = paiements réellement enregistrés, non annulés, remboursements déduits. |
| RM-24 | **Un reçu par commande**, créé dans la même transaction que la commande, avec ses **données figées** : boutique, client, adresse, lignes, montants, modalités de paiement annoncées. Numéro non séquentiel (ex. `REC-7K3M9QXP`). |
| RM-25 | Le **PDF est généré à la demande** : données figées + paiements déjà enregistrés. Avant tout paiement, il porte la mention « paiement non reçu ». |
| RM-26 | Ne pas présenter ce reçu comme une **facture fiscale** sans vérifier les obligations applicables. **Tranché (D-27) : reçu de commande, pas de facture.** |

### 3.6 Catalogue
| ID | Règle |
|---|---|
| RM-27 | **Produit** : statut Brouillon / Publié / Archivé. **Publier exige au moins une photo.** Un produit présent dans une commande **ne se supprime pas** : on l'archive. |
| RM-28 | Prix promotionnel facultatif, **strictement inférieur** au prix normal. Poids stocké en grammes (affiché en g ou kg). Référence interne facultative et unique. |
| RM-29 | **Slug** : minuscules, sans accents (ligatures gérées : œ → oe), espaces en tirets, caractères spéciaux supprimés, **unique et stable**. Chaque produit a un identifiant interne indépendant du slug. |
| RM-30 | Quand le slug d'un produit **déjà publié ou archivé** change, l'ancien est conservé et **redirige de façon permanente (308) vers le slug actuel**. Un brouillon n'a pas d'ancien lien public : pas de redirection. |
| RM-31 | Un ancien slug (redirection) d'un autre produit est **indisponible**. Revenir à son propre ancien slug est permis. Le public ne voit jamais un brouillon ni un produit archivé. |
| RM-32 | **Catégorie** : une catégorie archivée est masquée du site. La supprimer laisse ses produits en ligne, sans catégorie. Elle a une **couleur de section** facultative ; la couleur du texte (noir ou blanc) est **calculée**, jamais choisie : le contraste atteint toujours au moins 4,5:1 (vérifié par test). |
| RM-33 | **Images** : JPG, PNG ou WebP ; 8 photos maximum par produit ; 8 Mo maximum par fichier ; texte alternatif obligatoire (2 à 125 caractères). Le serveur n'accepte que des images **de notre compte Cloudinary et de notre dossier**. |

### 3.7 Notifications
| ID | Règle |
|---|---|
| RM-34 | Une commande **ne dépend jamais d'un email** : la ligne d'envoi est créée dans la transaction de la commande, l'envoi se fait après, et un cron reprend les échecs. Un identifiant de déduplication empêche les doublons. |
| RM-35 | L'email du client est **facultatif** (❓ à confirmer) ; sans email, seule la vendeuse est alertée. |
| RM-36 | Resend n'envoie pas de WhatsApp. Le message prérempli ouvert par le navigateur reste une action manuelle du client. |

### 3.8 Contenus
| ID | Règle |
|---|---|
| RM-37 | Réassurance et avis clients : **uniquement du vérifiable** (pas de promesse non justifiée, nom d'affichage autorisé, notes seulement si réellement collectées, photos avec autorisation). |
| RM-38 | Textes définitifs (slogan, histoire, FAQ, conditions) **validés par la cliente**. |
| RM-39 | **Badges** : « Nouveau » est calculé (publié depuis 30 jours ou moins) ; un prix promotionnel s'affiche barré ; « Best-seller » n'apparaît qu'avec des ventes réelles qui le justifient. |
| RM-40 | **Avis** : un avis ne s'affiche que s'il est réel **et** que l'autorisation de publication est enregistrée (avec sa preuve). Aucune note moyenne dans les données structurées sans notes réelles et vérifiables. |
| RM-41 | **Source unique** des modalités de paiement et de livraison (footer, FAQ, formulaire, confirmation, email). |
| RM-42 | **Rien n'est inventé** : avis, caractéristique produit, promotion, zone, délai, tarif ou promesse. Une information absente = section ou coordonnée **non affichée**, jamais un texte à trous. **Exception encadrée** : les **délais indicatifs** fournis par la cliente (RM-47, D-26). |
| RM-49 | **Nom de la marque** : toujours « **Meëra Kinks** » — tréma sur le « e », deux mots, deux majuscules. « Meera » et « Meerakinks » sont proscrits, sauf là où le tréma est impossible (adresses web, pseudos : `@meerakinks`). S'applique au nom de la boutique (paramètres), aux titres de page, aux emails, au reçu et au message WhatsApp. |
| RM-50 | **Vouvoiement** sur tous les textes destinés aux clients ; jamais de « tu », même sur les réseaux sociaux. |
| RM-51 | **Palette fermée** : aucune couleur hors des six de la charte (pas de blanc pur, de noir, de gris ni de métal). Le logo ne se déforme pas, ne pivote pas, ne change pas de couleur, ne reçoit ni ombre ni contour ni effet, ne se pose pas sur un fond chargé, ne se recompose pas dans une autre police. |
| RM-52 | **Pas de promesse médicale ni de résultat garanti** (« guérit », « fait repousser à coup sûr ») : la réglementation des cosmétiques l'interdit ; on écrit « accompagne », « aide à », « favorise ». Complète RM-37 et RM-42. |

### 3.9 Variantes, délais et export (D-24 à D-26) 🔶
| # | Règle |
|---|---|
| RM-43 | **Variante** : étiquette (1 à 60 caractères, unique par produit), référence interne facultative et unique, prix facultatif, stock, actif, ordre. Un produit sans variante se vend comme avant. **Publier un produit à variantes exige au moins une variante active.** |
| RM-44 | **Prix** : une variante sans prix **hérite** du prix et du prix promotionnel du produit ; une variante avec prix **remplace les deux** (son prix promotionnel, facultatif, reste strictement inférieur à son prix). Le serveur facture le prix relu en base (RM-02). |
| RM-45 | **Stock** : si le produit a des variantes, **seul le stock de la variante compte** (`null` = non suivi) ; décrément atomique à la commande, restitué à l'annulation (RM-16). Une variante épuisée ou désactivée ne peut plus être commandée (409 avec le détail, P-30). |
| RM-46 | **Lignes** : le panier, le devis et la commande identifient une ligne par **produit + variante** ; `OrderItem` fige le nom du produit **et l'étiquette de la variante** (RM-04). Une variante déjà commandée **ne se supprime pas** : on la désactive. |
| RM-47 | **Délai indicatif** par zone (D-26) : jamais une garantie, toujours présenté comme « indicatif » ; absent = non affiché (RM-42) ; repris par la source unique (RM-41). |
| RM-48 | **Export des commandes** : propriétaire seulement 🟡, généré à la demande, jamais stocké ; chaque export est journalisé (compte, date, filtres, nombre de lignes) ; cellules protégées contre l'injection de formules (P-55). |

---

## 4. Direction artistique et expérience

### 4.1 Principe
Références : **Palmo** (interactivité, mini-jeu), **My Frida** (photographie expressive, sections colorées, mise en scène des produits), **Hello Hello Outfit** (sobriété, hiérarchie typographique, parcours d'achat simple).
Proportion : **environ 80 % d'élégance et de simplicité, 20 % d'interactivité spectaculaire.** Les animations ne gênent jamais la lecture, la navigation ni la commande.

**Identité (v2.7).** L'habillage suit la **charte graphique Meëra Kinks v1.2** (D-30, §4.7) : fond Beige, écriture Marron, Orange réservé au logo et aux actions, formes rondes, vouvoiement. Les références ci-dessus donnent l'esprit des parcours ; **la charte prime sur toute couleur, police ou forme de ces références**. Les couleurs et polices actuelles du code sont **provisoires**.

### 4.2 Section « Boutique » de la landing (décision D-12) ✅ (v0.5)

**Mode A — il existe des catégories** (au moins une catégorie active avec un produit publié) :
- une **section pleine largeur par catégorie**, dans l'ordre défini, avec **sa couleur** ; texte noir ou blanc automatique ;
- les sections sont **sticky** : chacune reste collée pendant que la suivante la recouvre ; **désactivé** si l'utilisateur demande moins d'animations ;
- dans chaque section : le titre, un **carrousel horizontal** de pastilles (photo, nom, prix) avec flèches, balayage tactile et navigation clavier ;
- sous le carrousel : le **gros visuel du produit sélectionné** (sa photo principale), son bouton d'ajout et le lien vers sa fiche ;
- les produits **sans catégorie** vont dans une section finale « Autres produits » (P-06) ; une catégorie sans produit publié, ou archivée, n'a **pas** de section.

**Mode B — il n'y a pas de catégorie** :
- une **grille asymétrique** (tailles et décalages variés) ; l'ordre « aléatoire » est **stable**, calculé à partir de l'identifiant du produit (P-05) ;
- chaque carte : photo, nom, prix (promo barré), et le nom de la catégorie si elle existe.

**Bouton d'ajout (les deux modes)** :
- ordinateur : il apparaît **au survol et au focus clavier** ;
- écran tactile : un **petit « + » toujours visible** (P-04) ;
- après un ajout : message « Ajouté » (annoncé aux lecteurs d'écran) et sélecteur « − 2 + » sur la carte, **sans ouvrir le panier automatiquement** ;
- produit épuisé (ou dont toutes les variantes sont épuisées) : bouton désactivé ; **produit à plusieurs variantes : le « + » ouvre une feuille de choix de l'option** (D-24, P-54) ; le prix s'affiche « à partir de … » si les prix des variantes diffèrent.

**État de la réalisation (v0.5).** Livré : section Boutique en mode sections sticky + carrousel et en mode grille asymétrique stable ; bouton d'ajout (au survol et au focus sur ordinateur, « + » permanent sur écran tactile, « − 2 + » après ajout) ; badges « Nouveau » (calculé) et « Épuisé » ; prix promotionnel barré ; sections masquées quand les données manquent. **Vérifié par** des tests de rendu serveur et par `next build` ; **le contrôle visuel dans un navigateur reste à faire.** Les couleurs sont provisoires (palette de repli : rose, jaune, violet, vert) jusqu'à la charte graphique.

### 4.3 Fiche produit — `/produit/[slug]` ✅ (v0.5, refondue en v0.8 sur la référence mobile)
Ordre des blocs :
1. lien « Retour à la boutique » (et sa catégorie) ;
2. **galerie balayable** : défilement aimanté au doigt, **flèches précédent/suivant en surimpression**, pastilles de position, première photo chargée en priorité ;
3. badge « Nouveau » (calculé), puis **grand titre en majuscules** et prix (promotion barrée) ;
3 bis. **si le produit a des variantes** (D-24, P-54) : bloc d'options (libellé du produit, par exemple « Taille »), en pastilles avec le prix de chacune si les prix diffèrent ; une option épuisée est grisée ; **le bouton d'achat reste désactivé tant qu'aucune option n'est choisie** ;
4. **ligne « Quantité »** avec sélecteur « − 1 + » ;
5. **grand bouton « Ajouter au panier ↗ »** avec, à droite, le prix (prix × quantité, indicatif, RM-02) ;
6. cartes « Caractéristiques » et « Mode d'utilisation » ;
7. **quatre pastilles de réassurance** : confirmation sur WhatsApp · paiement à la livraison à Abidjan · livraison en Côte d'Ivoire et à l'étranger · reçu à chaque commande ;
8. carte « Paiement et livraison » (texte unique, RM-41) ;
9. section **« À propos de ce produit »** (la description, en grand) ;
10. produits associés ; données structurées produit et fil d'Ariane.

**Barre d'achat collée en bas (téléphone)** : prix et bouton « Ajouter », visible dès que le bouton principal sort de l'écran ; masquée sur ordinateur et pour un produit épuisé (un message remplace alors le bouton). Sur ordinateur : galerie à gauche, colonne d'achat collante à droite. Avec des variantes, la barre d'achat affiche l'option choisie, ou « Choisir une option ». Les pastilles ne reprennent que des règles validées ou des fonctions livrées (P-40). Textes : document de la landing §23. **v0.10** : la barre n'existe **que sur la fiche produit** (le produit mis en avant de la landing n'en a pas : elle s'y affichait dès le haut de la page et recouvrait le footer) et **se range quand le pied de page est à l'écran** (elle masquait ses liens légaux). **À trancher** : sur un téléphone de 390 × 844, le bouton principal est sous la ligne de flottaison au chargement ; la barre s'affiche donc aussitôt (le code l'affiche dès que le bouton n'est pas à l'écran), alors que ce texte dit « dès que le bouton principal sort de l'écran ».

### 4.4 Header, panier et commande (modals) ✅ header et panier (v0.5) · ✅ formulaire de commande (v0.6)
- **Header** (D-11, détail dans le document de la landing §1) : **logo combiné L1** (D-31, P-60), liens (Boutique, Collections, Notre histoire, Contact), action « Voir la boutique » (ordinateur), et **panier = icône + badge du nombre d'articles + montant en FCFA**.
  - Le **montant du header est une estimation** ; le total officiel vient du serveur à l'ouverture du panier.
  - **Mobile** (v0.8) : **logo combiné à gauche (L1, au moins 120 px de large) ; icône du panier (avec badge), puis menu hamburger, à droite**, dans la barre, en boutons carrés arrondis ; le hamburger devient une croix à l'ouverture ; le montant s'affiche dans le panier.
  - Panier vide : pas de montant. Le panier est présent **sur toutes les pages publiques**.
  - Accessibilité : nom accessible complet (« Panier : 3 articles, 15 000 FCFA »), mises à jour annoncées, animation du badge désactivée en mouvement réduit, lien d'évitement « Aller au contenu ».
  - Comportement : sticky ou masqué au défilement ; ne cache jamais l'élément qui a le focus.
- **Panier (modal, refondu en v0.8)** : **feuille** collée au bord bas de l'écran sur téléphone ; **liste défilante** (miniature, nom en majuscules, **option choisie** s'il y en a une, prix à l'unité, sélecteur « − 1 + », prix de la ligne, « Retirer » ; ancien prix barré en cas de promotion) ; **pied fixe** : ligne « Livraison — À confirmer » (RM-03), **« Sous-total »** officiel (appel serveur à l'ouverture), rappel de paiement et de livraison, bouton **« Passer commande »** ; produits dépubliés ou épuisés signalés. Textes : landing §24.
- **Commande (modal)** ✅ (v0.6) : voir §6. Elle s'ouvre depuis « Commander » ; « Modifier mon panier » y renvoie au panier ; après un envoi réussi, la page de confirmation remplace le modal.
- **Mécanique** (P-02) : `<dialog>` natif, ancres `#panier` et `#commande`, fermeture par Échap, par le bouton Retour du téléphone et par clic extérieur, focus rendu au bouton d'origine, défilement de la page bloqué, hauteur adaptée au clavier mobile.
- Le panier ne conserve que **identifiants (produit et variante) et quantités** (navigateur) ; jamais de prix.

### 4.4 bis Pages et sections de la landing
Hero (slogan, promesse, visuel, CTA « Découvrir la boutique », « Nos best-sellers ») · bandeau de marque (marquee) · collections · best-sellers · **Notre histoire (modal)** · focus produit · pourquoi choisir la marque · avis clients · Instagram · **FAQ (accordéon)** · **contact** · CTA final · footer (liens, paiement et livraison, CGV, CGU, mentions légales, confidentialité, copyright).
Structure, textes et **liens de chaque section** : `landing_page_structure_et_writing_boutique_v1.2.md` (document de référence pour la rédaction). Questions de la FAQ : comment commander ; moyens de paiement ; fonctionnement de l'acompte à Abidjan ; livraison hors d'Abidjan et à l'étranger ; frais et délais ; contacter la vendeuse. Réponses validées par la cliente.

### 4.5 Animations, performance, accessibilité
| Sujet | Règle |
|---|---|
| Outils envisagés | GSAP + ScrollTrigger (scroll), Lenis (défilement fluide **si** performances et accessibilité restent bonnes), Framer Motion (micro-interactions), CSS (transitions simples), Canvas 2D (jeu). Three.js inutile au MVP. |
| Priorité | Le parcours de commande et le back-office passent **avant** les animations avancées et le jeu. |
| Mouvement réduit | `prefers-reduced-motion` désactive sticky animé, parallaxe, marquee et jeu. |
| Mobile | Versions allégées des animations ; zones tactiles d'au moins 44 px (déjà appliqué dans les styles). |
| Images | Livrées par Cloudinary en format et qualité automatiques ; dimensions déclarées pour éviter les sauts de mise en page. |
| Objectifs 🟡 | Chargement rapide sur 4G mobile ; WCAG AA (contraste des sections garanti, libellés de formulaires, focus visible, messages d'erreur annoncés). |
| Effet « spaghetti » (D-18, D-29) | **Reprise du code des titres de Rabbit Shop** (**réalisée en CSS pur en v0.9, sans GSAP**) : départ `y: 60`, `opacity: 0`, `scale: 0.5`, arrivée en **1,3 s**, **0,015 s** entre deux lettres, `elastic.out(0.75, 0.3)`, déclenchement à `top 85%`. **Titres** lettre par lettre, **textes courants par mot** ; mots jamais coupés ; exceptions (prix, boutons, formulaires, erreurs, pages légales) ; mouvement réduit = texte tel quel ; texte complet dans le HTML ; aucune bibliothèque à charger. Détail : P-41 et landing §26. |

### 4.6 Mini-jeu « Cosmetic Smash » ✅ livré en v0.10 (toucher) · 🔶 évolution « slash » décidée le 21 nov. (D-33)
Facultatif, dans le footer : des pots sont lancés, le visiteur les touche, ils éclatent, le score augmente, **durée limitée à 30 s (🟡)**. Textes validés : document de la landing §15.

**Livré en v0.10** *(code : `src/lib/smash/`, `src/components/shop/SmashGame.tsx`)* :
- **Moteur séparé du dessin** (`engine.ts`, aucun accès au navigateur : physique, score, chronomètre, pause, toucher, balayage, clavier) ; aléatoire et temps injectés, donc **testable** (26 tests, vérifiés par mutation). Valeurs 🟡 réglables dans `SMASH` : durée 30 s, gravité, 8 pots au plus, cadence de 900 à 420 ms, trois tailles rapportant 10, 20 et 30 points (**les plus petits rapportent le plus**).
- **Pots dessinés en canvas** (D-19, P-42) : pot de crème, flacon pompe, compte-gouttes, tube, bouteille ; verre, plastique et métal construits avec des dégradés, reflets et ombres ; génériques, sans marque ni texte ; couleurs reprises des catégories. Éclatement : éclats de verre, gouttes et éclaboussure de crème, onde de choc, points qui montent. Planches de contrôle : `npm run e2e:pots`, `npm run e2e:burst`.
- **Chargement différé** : le code du jeu (chunk `smash.*.js`, 25,8 Ko) est importé quand le footer approche (700 px avant), **pas avant** ; **la partie ne démarre qu'au clic sur « Jouer »** (avant : ni canvas, ni boucle d'animation). Pas de préchargement en mode « économie de données ».
- **Accessibilité** : avec `prefers-reduced-motion`, le bouton est remplacé par le message validé et le code n'est pas chargé (réglé en CSS, sans clignotement) ; **Espace ou Entrée** casse le pot le plus bas ; « Pause » et « Recommencer » sont de vrais boutons ; pause automatique si l'onglet est masqué ou si le jeu sort de l'écran (jamais de reprise surprise) ; annonces pour les lecteurs d'écran (pause, reprise, fin) ; focus visible.
- **Le défilement n'est jamais bloqué** (`touch-action: pan-y`, aucun `preventDefault` sur les gestes) ; les liens du footer ne sont jamais recouverts.
- **Pas de son** (« désactivé par défaut » : il n'y en a pas), donc aucun bouton ajouté.
- **Vérifié dans Chromium** (téléphone et ordinateur) : partie complète de 30 s, éclatement, pause, clavier, défilement, mouvement réduit. **Non vérifié** : vrai téléphone, Safari, Firefox, plaisir de jeu (les valeurs 🟡 sont à régler en jouant).

**Évolution décidée le 21 nov. — le « slash » (D-33, P-63)** 🔶 :
1. **Le geste.** Appui puis glissé : le doigt (ou la souris) laisse une **traînée** courbe qui s'efface en un quart de seconde environ, dans les couleurs de la palette (Orange vers Pêche, sur fond Beige).
2. **La coupe en deux.** Chaque pot croisé par la traînée est **coupé selon la direction du geste** : deux moitiés, la **tranche laissant voir la crème**, s'écartent de part et d'autre de la coupe, tournent, retombent et disparaissent ; un trait et quelques gouttes de crème marquent la coupe ; peu d'éclats (la coupe est nette). Le visuel d'éclatement de la v0.10 est remplacé, pas ajouté.
3. **Le score ne change pas** : 10, 20 ou 30 points selon la taille (🟡). **Plusieurs pots tranchés d'un seul geste** comptent chacun ; pas de série ni de bonus dans cette première version.
4. **Toucher simple** (clic, tape) : le pot est coupé verticalement ; le jeu reste jouable sans geste. **Clavier** : Espace ou Entrée coupe le pot le plus bas, comme en v0.10.
5. **Défilement** : `touch-action: pan-y` est conservé (P-63). Conséquence à connaître : sur téléphone, **les gestes horizontaux ou peu inclinés tranchent** ; un geste franchement vertical fait défiler la page. L'option « aucun défilement sous le doigt pendant la partie » est **écartée** (elle contredit la règle du défilement jamais bloqué).
6. **Les pots** sont ceux de la gamme (P-63) : pot de chantilly ou de masque, flacon pompe, **flacon spray** (à la place du compte-gouttes), bouteille, tube ; leurs **couleurs sont celles des sous-gammes** (Orange, Jaune-orangé, Marron), via la couleur d'accent des catégories (P-64). Le visuel reste réaliste (D-19).
7. **Palette fermée (RM-51)** : le texte des points passe du blanc à la couleur Beige avec contour Marron ; les ombres sont d'un Marron transparent, jamais du noir ; le fond de l'aire de jeu est de la palette (§4.8).
8. **Inchangé** : 30 s, pause et « Recommencer », fin de partie (« Bien joué ! Envie de refaire une partie ? » et « Rejouer »), mouvement réduit = message à la place du jeu, chargement à l'approche du footer, démarrage au clic, aucun blocage des liens ni du parcours d'achat.
9. **À vérifier une fois construit** : fluidité sur un téléphone d'entrée de gamme (les moitiés doublent le nombre d'objets), lisibilité de la traînée sur fond Beige, tests du moteur (découpe, direction, tranche, plusieurs pots d'un geste) et de la géométrie de coupe.

### 4.7 Identité de marque — charte graphique Meëra Kinks v1.2 (D-30) ✅ reçue · 🔶 à appliquer au code
*Source : `Charte_graphique_Meera_Kinks_v1_2.pdf` (21 novembre 2026, « document de travail modifiable »). La charte fait foi ; ce paragraphe en reprend ce dont le site a besoin. Les propositions d'application sont P-59 à P-66.*

**L'ADN.** Meëra Kinks est une marque de **soins capillaires pour cheveux crépus** (souvent classés 4A, 4B, 4C), à base d'ingrédients naturels, **organisés par besoin**. *Mission* : rendre le soin des cheveux crépus simple, naturel et joyeux. *Vision* : que chaque personne aux cheveux crépus porte ses kinks avec fierté. *Promesse* : « **Un besoin, une couleur.** » *Signature* : « **Embrassez vos kinks !** ». *Valeurs* : Naturel · Joie (pop) · Clarté · Fierté · Respect. *Public* : personnes aux cheveux crépus (femmes et hommes), personnes en transition capillaire ou qui débutent, parents qui soignent les cheveux de leurs enfants — formulations neutres (D-28). *Personnalité* : une amie solaire qui connaît bien les cheveux crépus, qui vouvoie par respect sans être distante.

**Le nom (RM-49).** « Meëra Kinks » : tréma sur le « e », deux mots, deux majuscules ; « Kinks » désigne les boucles serrées en zigzag, revendiquées comme une qualité.

**Le ton de voix (RM-50, RM-52).** Naturel (mots de tous les jours, pas de jargon), pop (joyeux, imagé, une pointe d'humour, un ou deux émojis de la couleur de la sous-gamme), **vouvoiement**. Phrases courtes, un verbe d'action, on part du besoin. On nomme les sous-gammes par leur besoin et leur couleur (« la sous-gamme orange Hydratation »). Aucune promesse médicale.

**La palette — six couleurs, et seulement six (RM-51).**
| Couleur | HEX | RVB | Rôle sur le site | Part |
|---|---|---|---|---|
| **Beige** | `#F8EEDC` | 248 / 238 / 220 | Fond de marque (pages, pied de page) ; texte sur fond Marron | 60 % |
| **Marron** | `#7F3F20` | 127 / 63 / 32 | **Écriture** : titres, corps, légendes, mentions légales ; icônes ; sous-gamme Nutrition | 30 % |
| **Orange** | `#F48128` | 244 / 129 / 40 | **Logo**, boutons d'action, éléments à repérer en premier ; sous-gamme Hydratation | 10 % |
| **Jaune-orangé** | `#FF9500` | 255 / 149 / 0 | Sous-gammes Nettoyage et Pousse ; touches de détail | détails |
| **Terracotta** | `#D95525` | 217 / 85 / 37 | Sous-titres, cursive Great Vibes, filets, dégradés ; n'est plus une couleur de sous-gamme | détails |
| **Pêche** | `#F2B590` | 242 / 181 / 144 | Contours, liserés, fonds de pastilles, filigrane ; jamais pour un texte | détails |
*Le nom « Pêche » est un nom de travail (à confirmer). Les valeurs CMJN de la charte sont indicatives (à caler sur épreuve) ; elles ne servent pas au site.*

**Contrastes de référence (charte p. 22-23).** Marron sur Beige **6,9:1** (tous textes) · Beige sur Marron **6,9:1** · Marron sur Pêche 4,5:1 · Marron sur Jaune-orangé 3,6:1 · Marron sur Orange 3,0:1 et Terracotta sur Beige 3,5:1 (**18 pt et plus, graphismes seulement**) · Orange sur Beige 2,3:1 (**décor uniquement**, jamais un texte). Seuils : 4,5:1 pour le texte courant, 3:1 pour les textes de 18 pt et plus. Beige uniquement sur fond Marron ou Terracotta. Mentions légales et listes d'ingrédients : toujours en Marron sur Beige.

**Dégradés.** Permis entre couleurs de la palette : la couleur du besoin occupe **70 % au moins**, la couleur d'accompagnement 30 % au plus ; Hydratation = Orange vers Pêche, Nettoyage et Pousse = Jaune-orangé vers Orange, Nutrition = Marron vers Terracotta ; jamais deux besoins à parts égales, jamais derrière un petit texte.

**Les sous-gammes (P-64).**
| Couleur de l'étiquette | Besoin | Produits cités par la charte |
|---|---|---|
| Orange | Hydratation | Spray hydratant, lait capillaire |
| Jaune-orangé | Nettoyage ; Pousse et croissance | Shampoing, spray antipelliculaire ; produits dédiés à la pousse |
| Marron | Nutrition | Chantilly capillaire ; masque (« bientôt ») |

**La typographie (P-61).** Trois polices : **Choret Fudyng Bubble** pour le logo uniquement, **Poppins** pour tous les textes, **Great Vibes** pour les touches manuscrites. Aucune autre police, graisse ou taille.
| Élément | Police et graisse | Taille charte | Équivalent web (pt × 4/3) | Couleur |
|---|---|---|---|---|
| Titre | Poppins ExtraBold | 42 pt | 56 px | Marron |
| Sous-titre | Poppins Regular | 24 pt | 32 px | Marron |
| Entête de marque | Poppins Medium | 32 pt | 43 px | Marron |
| Sous-titre de l'entête | Great Vibes | 28 pt | 37 px | Terracotta |
| Entête de section | Poppins SemiBold | 28 pt | 37 px | Marron |
| Corps | Poppins Regular | 14 pt | 19 px | Marron |
| Citation | Great Vibes | 28 pt | 37 px | Terracotta |
| Légende | Poppins Thin | 12 pt | 16 px | Marron |
*Règles* : titre de 8 mots au plus et **pas en majuscules intégrales** ; Great Vibes jamais en majuscules, deux lignes au plus, jamais pour une information pratique ; interlignage de 1,3 à 1,5 pour le corps ; texte aligné à gauche ; trois niveaux de texte au plus sur un même visuel ; mots mis en valeur en Poppins SemiBold ; pas d'italique ; Thin jamais pour les mentions légales. Les mots « Titre » et « Entête de section » du tableau sont des **rôles typographiques** de la charte, pas les balises HTML.

**Les logos (D-31, P-60).** Cinq déclinaisons, toutes dans la palette ; on n'utilise que les fichiers fournis.
| Réf. | Déclinaison | Fond autorisé | Sur le site |
|---|---|---|---|
| **L1** | Logo original simple (« Meëra » Orange, « Kinks » Terracotta, icône Marron) | **Beige seulement** | **Header** ; footer si fond Beige ; 120 px de large au minimum |
| **L2** | L1 avec le slogan « Embrassez vos kinks ! » | Beige seulement | Accueil, **image de partage** ; 200 px au minimum ; jamais sur une petite surface |
| **L3** | Logo beige | Marron, Terracotta | Alternative de pied de page sur fond Marron ; 140 px au minimum |
| **L4** | Logo marron | Beige, Pêche, Orange, Jaune-orangé | Impressions monochromes ; reçu imprimé |
| **L5** | Logo jaune-orangé (icône à liseré clair) | Marron seulement | Pied de page sur fond Marron ; 140 px au minimum |
*Zone de protection : une marge de x (hauteur d'un puff de l'icône) sur les quatre côtés. Interdits : déformer, pivoter, changer les couleurs, ajouter ombre ou contour, poser sur un fond chargé, L1 sur Orange. Pas deux logos complets sur la même face.*

**Les icônes (D-31).** **I1** (couleurs d'origine : puffs Marron, liseré orangé) pour le **favicon**, l'avatar des réseaux et les stickers, **sur fond Beige ou Pêche seulement** ; I2 Orange (décor en grand format) ; I3 Marron (sur Orange et Jaune-orangé) ; I4 Terracotta (petites touches sur Beige) ; I5 Beige (sur Marron). Minimum : **24 px** (favicon : 32 px).

**Ce que cela change dans le code (étape 13 bis, §13)** : `tokens.css` (palette, plus de noir, blanc ni gris) · polices Poppins et Great Vibes auto-hébergées · suppression des majuscules intégrales dans les titres et les boutons · `storeName` « Meëra Kinks » dans les paramètres et le seed · logo dans le header et le footer · `favicon.ico`, `apple-touch-icon` et image de partage · couleurs des catégories = couleurs des sous-gammes · pied de page en trois zones (§4.8) · mini-jeu au slash (§4.6) · tests et contrôle visuel mis à jour.

**À compléter par la marque** *(marqué « à compléter » dans la charte)* : âge minimum d'utilisation des produits ; zone géographique, tranche d'âge principale et canaux de vente ; origine et sens du prénom « Meëra » ; nom définitif de la couleur « Pêche » ; références Pantone (pour l'impression) ; fichier et licence de la police Choret Fudyng Bubble (inutile pour le site : les logos sont des images).

### 4.8 Pied de page et aire de jeu fusionnés (D-32) 🔶 à construire
*Composition d'après la capture du pied de page de Palmo annotée par Aka. On reprend **l'ordre des zones**, pas les éléments graphiques de Palmo (palmiers, fruits, mot « PALMO »).*

```
┌────────────────────────────────────┐
│  ◠◠◠◠◠◠  bord supérieur en arches   │
│  ZONE 1   logo combiné              │
│           « Embrassez vos kinks ! » │
│  ZONE 2   Navigation                │
│           Besoin d'aide ?           │
│           Informations légales      │
│           Suivez-nous               │
│  ┌──────────────────────────────┐  │
│  │  AIRE DE JEU (slash)          │  │
│  │  carte « Une petite pause     │  │
│  │  beauté ? … Jouer »           │  │
│  │  puis : Score · Temps · Pause │  │
│  └──────────────────────────────┘  │
│  ZONE 3   filigrane « Meëra Kinks » │
│           © 2026 Meëra Kinks        │
│           Site réalisé par …        │
└────────────────────────────────────┘
```
- **Une seule surface** : plus de bloc de jeu posé au-dessus des liens (v0.10). Le footer est la page d'arrivée du jeu : liens en haut, aire de jeu juste dessous, filigrane et mentions en bas.
- **Zone 1.** Logo combiné (L1 si fond Beige, P-60) et signature en Great Vibes. Le logo mène à `/`.
- **Zone 2.** Les groupes de liens du document de la landing §14 : Navigation, Besoin d'aide ?, Informations légales (avec « Gérer mes cookies »), puis Suivez-nous (réseaux enregistrés dans les paramètres ; un réseau sans lien n'est pas affiché) et le rappel paiement et livraison (RM-41). Sur téléphone : une colonne centrée, comme sur la capture ; sur ordinateur : en rangée.
- **Aire de jeu.** Pleine largeur du conteneur, hauteur fluide. Fond de la palette ; décor discret de **formes rondes** (disques, arches en Pêche) derrière les pots. Avant « Jouer » : une **carte de départ** dans l'aire (titre et texte en effet « spaghetti », bouton « Jouer »). Pendant la partie : une **pastille** Score · Temps · Pause · Recommencer, en bas de l'aire, au-dessus du filigrane. Fin de partie : le message validé et « Rejouer ». **Mouvement réduit** : la carte affiche le message à la place du bouton ; aucun pot. Le code se charge à l'approche du footer ; la partie ne démarre qu'au clic. *(La capture de Palmo montre aussi trois points de vie et un bouton « Freeze » : **non repris**, non demandé.)*
- **Zone 3.** *Filigrane* « Meëra Kinks » en **Poppins ExtraBold, couleur Pêche**, très grand (sur deux lignes « Meëra » puis « Kinks » sur téléphone, une ligne sur ordinateur), décoratif (`aria-hidden`, non cliquable) : **ce n'est pas le logo** (que la charte interdit de recomposer). Puis `© 2026 Meëra Kinks. Tous droits réservés.` (année calculée) et le **crédit** « Site réalisé par AKATech Studio » *(formulation et lien à valider)*.
- **Contraintes.** Les liens restent atteignables et jamais recouverts, le jeu ne ralentit pas la page, aucun défilement bloqué ; la barre d'achat collée se range quand le pied de page est à l'écran (v0.10). Contrastes : Marron sur Beige partout dans les zones de texte.
- **Variante Marron** (P-62) : fond Marron, logo L5 ou L3, texte Beige, filigrane Pêche ; à éviter tant que les pots Nutrition sont Marron.

---

## 5. Structure des pages et URLs

| Page | URL | Statut |
|---|---|---|
| Accueil (landing) | `/` | ✅ |
| Boutique (tous les produits) | `/boutique` (recherche, filtre par catégorie et offres, tri) | ✅ |
| Liste des catégories | `/categories` | ✅ |
| Catégorie | `/categorie/[slug]` (ex. `/categorie/soins-capillaires`) ; un ancien slug redirige (308) | ✅ |
| Produit | `/produit/[slug]` (ex. `/produit/beurre-de-karite-naturel`) ; un ancien slug redirige (308) ; brouillon et archivé = 404 | ✅ |
| Confirmation de commande | `/commande/confirmation?ref=CMD-…` | ✅ (v0.6) ; reçu en ticket PNG en v0.8 |
| CGV · CGU · mentions légales · confidentialité | `/cgv` · `/cgu` · `/mentions-legales` · `/politique-de-confidentialite` | 🟡 pages provisoires, non indexées, en attente des textes |
| Cookies | `/cookies` (choix modifiable, ce que fait chaque choix, inventaire, droits) | 🟡 étape 10, P-44 |
| Back-office | `/admin/*` (jamais indexé) | ✅ pour connexion, produits, catégories |

**Supprimées** (décisions D-07, D-08) : `/panier`, `/commander`, `/notre-histoire`, `/contact`, `/faq`. Panier et commande sont des modals ; histoire en modal ; contact et FAQ sont des sections de la landing.

Règles d'adresses : voir RM-29 à RM-31. Les constantes d'adresses sont centralisées dans `src/lib/constants/routes.ts` (liens, sitemap, rafraîchissement du cache).

### Ancres de la landing et paramètres de `/boutique` (🟡 P-12, P-19)

| Élément | Destination |
|---|---|
| Sections de la landing | `/#collections` · `/#best-sellers` · `/#focus-produit` · `/#pourquoi-nous` · `/#avis` · `/#instagram` · `/#faq` · `/#contact` |
| Modals | `#panier` · `#commande` · `#notre-histoire` (ancres simples : le bouton Retour les ferme) |
| Offres | `/boutique?filtre=offres` (produits avec prix promotionnel) |
| Nouveautés | `/boutique?tri=nouveautes` |
| Autres paramètres | `categorie`, `tri=prix-croissant\|prix-decroissant`, `q` (recherche) — adresse canonique : `/boutique` |
| « Informations de paiement et livraison » (footer) | `/#faq` |
| WhatsApp | `https://wa.me/[numéro]?text=…` (message prérempli) |

Tableau complet des liens par bouton : document de la landing, §0.

---

## 6. Parcours de commande client ✅ (v0.6, à vérifier contre une vraie base)

### 6.1 Consultation et panier
Le visiteur parcourt les catégories, ouvre une fiche, ajoute plusieurs produits, modifie les quantités, retire des articles. Le calcul du navigateur est **indicatif**.

### 6.2 Formulaire de commande (modal)
| Champ | Règle |
|---|---|
| Nom, prénom | Obligatoires |
| Téléphone | Obligatoire, **avec indicatif international** (les commandes viennent aussi de l'étranger) ; sert de WhatsApp et d'identifiant client |
| Zone | **Commune d'Abidjan / intérieur du pays / étranger** : elle décide acompte ou paiement intégral, frais fixes ou à confirmer, et le **délai indicatif** affiché (P-56) |
| Commune, ville ou pays | Selon la zone, depuis la liste des zones desservies ; **saisie libre** si aucune zone n'est configurée pour ce type (P-23). Pour l'étranger, la ville se saisit en plus du pays |
| Adresse précise | Obligatoire (5 caractères au moins) ; précisions facultatives |
| Email | Facultatif (❓) |
| Note | Facultative |

Le récapitulatif affiche **sous-total, frais (ou « à confirmer »), total estimé**, le **montant à régler pour confirmer**, et la **note de paiement et de livraison** (annexe B, texte validé, point 1 ou 2 selon la zone, puis point 3) **avant** le bouton d'envoi (RM-11). Les protections : champ piège (honeypot), clé d'idempotence, limitation de débit, validation serveur (la même que dans le navigateur). Si le panier contient un produit retiré, épuisé ou limité, l'envoi est bloqué et le client est renvoyé vers son panier.

### 6.3 Ce que fait le serveur (`POST /api/v1/orders`)
1. Limitation de débit par IP (hachée), champ piège, validation.
2. Si la clé d'idempotence existe déjà : renvoyer la commande existante.
3. **Transaction unique** :
   - relire les produits **publiés** et leurs **variantes actives** en base, ignorer tout prix reçu ;
   - décrémenter le stock de façon atomique (produit suivi, ou variante suivie, RM-45) ;
   - retrouver ou créer le client par téléphone ;
   - résoudre la zone et les frais éventuels ;
   - calculer sous-total, frais, total, montant à régler pour confirmer ;
   - créer commande, lignes (instantanés : produit **et variante**), reçu (données figées), historique et lignes d'envoi d'email.
4. Après validation : tenter l'envoi Resend ; en cas d'échec, le cron reprend. **Livré en v0.6 : jusqu'à la création des lignes d'envoi ; l'envoi lui-même est l'étape 9.**
5. Répondre avec la référence et le lien `wa.me` **construit à partir de la commande enregistrée** (`201` ; `200` pour un renvoi de la même clé).

Détails de réalisation (v0.6) : zone choisie dans la liste → frais de la zone, sinon destination saisie et frais « à confirmer » ; `paymentStatus` = `DEPOSIT_DUE` à Abidjan, `TO_CONFIRM` ailleurs (aucun paiement n'est jamais présenté comme reçu, RM-10) ; `upfrontAmount` = acompte plafonné (Abidjan) ou total une fois les frais connus ; l'historique commence à la création (livraison `PENDING`, paiement initial) ; produit non publié, épuisé ou en quantité insuffisante : `409` avec le détail par produit.

### 6.4 Confirmation et WhatsApp
Le navigateur ouvre `/commande/confirmation?ref=…` (`router.replace` : le bouton Retour ne revient pas dans le formulaire) : récapitulatif (référence, articles, total ou « à confirmer ») et **bouton WhatsApp** (recliquable si WhatsApp ne s'ouvre pas). Le message prérempli contient : numéro de commande, identité du client, téléphone avec indicatif, adresse et zone, articles (avec l'option choisie), quantités, prix, sous-total, frais si confirmés, total estimatif ou confirmé, modalité de paiement. Une référence invalide ou inconnue ramène à l'accueil. Le bouton WhatsApp reste une **action manuelle du client** (RM-36) ; sans numéro WhatsApp configuré, aucun lien n'est affiché et la page annonce que l'équipe contactera le client. La page ne dit jamais qu'un paiement est reçu.

**Reçu de commande en ticket PNG (v0.8, P-39).** Sous le message de remerciement, une **imprimante** affiche l'avancement (« Préparation de votre reçu », « Impression de votre reçu », « Reçu prêt ») et fait sortir le ticket. Le fichier `recu-CMD-….png` se télécharge **dès que l'image est prête**, une seule fois par commande (signal posé à la validation, lu puis effacé par la page de confirmation ; une page rouverte plus tard n'en relance pas). Le bouton « Télécharger mon reçu (PNG) » le télécharge à nouveau. Si le navigateur bloque le téléchargement automatique, le ticket reste affiché et le bouton suffit ; si le dessin échoue, un message le dit et le récapitulatif reste valable. Le ticket ne contient **aucune donnée personnelle** et ne dit jamais qu'un paiement est reçu (tampon « PAIEMENT NON REÇU », frais et total « à confirmer » tant qu'ils ne sont pas fixés). Texte et mise en page : landing §25. Mouvement réduit : le ticket apparaît sans animation.

---

## 7. Back-office

Réservé à la vendeuse et aux administrateurs autorisés. Authentification obligatoire ; permissions **vérifiées côté serveur** à chaque page et chaque action.

### 7.1 Menu proposé pour le MVP (P-01)
**Tableau de bord · Commandes · Produits (catégories incluses) · Clients · Analytics · Livraison · Paramètres.**
Écarté du MVP : « Reçus » (téléchargés depuis la commande), « Notifications » (échecs d'envoi affichés sur la commande). **« Analytics » revient dans le menu** : analytique maison avec consentement (D-17, §7.6), qui remplace l'outil externe de P-08.

**Style (D-16)** : l'organisation du back-office du site AKATech Studio. Une page à **onglets** ; une **vue d'ensemble** qui commence par ce qui demande une décision aujourd'hui (commandes en attente, acomptes attendus, emails en échec, produits épuisés), rafraîchie toutes les 30 s, repliable, un clic ouvrant l'onglet concerné ; **thème clair ou sombre** mémorisé dans le navigateur ; listes triables et filtrables dans le navigateur ; graphiques et carte des visiteurs. Mise en forme en CSS à variables (T-10).
Sur téléphone, listes en **cartes** plutôt qu'en tableaux : la vendeuse sera surtout sur mobile.

### 7.2 Rôles
`OWNER` (la vendeuse : tout, y compris paramètres, comptes et **Analytics**) · `STAFF` (commandes et produits, pas les paramètres ni Analytics, 🟡). ❓ Combien de personnes auront accès ?

### 7.3 Écrans

| Écran | Contenu | Statut |
|---|---|---|
| Connexion / déconnexion | Voir §10 | ✅ |
| Produits | Liste (Tous · Publiés · Brouillons · Archivés), recherche par nom ou référence, création, modification, suppression, photos, **variantes** (D-24) | ✅ sauf variantes 🔶 |
| Catégories | Nom, description, couleur de section, ordre, archivage, suppression | ✅ |
| Tableau de bord | **« À traiter aujourd'hui »** (commandes en attente, acomptes attendus, emails en échec, produits épuisés), nombre de commandes par statut, chiffre d'affaires (paiements enregistrés), dernières commandes, produits les plus commandés. Aujourd'hui : page d'accueil provisoire | 🔶 |
| Commandes | Liste avec recherche (référence, téléphone, nom), filtres et tri ; détail : client, adresse, lignes figées, sous-total, frais, total, acompte attendu/reçu, reste à payer, statuts, notes internes, historique, paiements, reçu en PDF, bouton « Ouvrir WhatsApp », **bouton « Renvoyer » sur chaque email (P-46)**, **export Excel et CSV (D-25, P-55)** | 🔶 |
| Clients | Nom, téléphone, email, historique des commandes, première et dernière commande ; accès restreint | 🔶 |
| Analytics | Voir §7.6 | 🔶 |
| Livraison | Communes d'Abidjan, villes de l'intérieur, pays ; frais fixes ou « à confirmer » ; **délais indicatifs en heures, minimum et maximum (P-56)** | 🔶 |
| Paramètres | Nom de la boutique, numéro WhatsApp de la vendeuse, email de notification, acompte, numéro Wave, informations du reçu | 🔶 |

### 7.4 Fiche produit (back-office) ✅
| Champ | Règle |
|---|---|
| Nom | 2 à 120 caractères |
| Lien (slug) | Généré depuis le nom, modifiable ; redirection automatique de l'ancien lien (RM-30) |
| Catégorie | Facultative ; une catégorie archivée n'est pas proposée |
| Description | Obligatoire, 5 000 caractères maximum |
| Caractéristiques | Une par ligne, 20 maximum, 200 caractères chacune |
| Mode d'utilisation | Facultatif, 3 000 caractères |
| Prix | Entier FCFA, de 1 à 100 000 000 |
| Prix promotionnel | Facultatif, inférieur au prix |
| Stock | « Suivre le stock » (quantité 0 à 100 000) ou non suivi ; **ignoré quand le produit a des variantes** (RM-45) |
| **Nom de l'option** *(D-24)* | Facultatif, 30 caractères (« Taille », « Format », « Couleur »…) ; « Option » par défaut |
| **Variantes** *(D-24)* | Liste ordonnée, 50 au plus 🟡 : étiquette (unique, 60 caractères), référence interne facultative, prix et prix promotionnel facultatifs (RM-44), stock, actif ; ajout, désactivation, ordre ; **suppression refusée si la variante figure dans une commande** (RM-46). Publier exige au moins une variante active (RM-43) |
| Poids | Facultatif, saisi en g ou kg, stocké en grammes |
| Référence interne | Facultative, 40 caractères (lettres, chiffres, `.`, `-`, `_`), unique |
| Photos | 8 maximum, ordre modifiable, la première est la principale, texte alternatif obligatoire |
| Statut | Brouillon, Publié (exige une photo), Archivé |
| Titre SEO | Facultatif, 70 caractères ; sinon généré depuis le nom |
| Méta-description | Facultative, 160 caractères ; sinon générée depuis la description |
| Ordre d'affichage | 0 s'affiche en premier |

### 7.5 Notifications
Chaque envoi est une ligne d'historique (type, destinataire, statut, tentatives, erreur) : nouvelle commande, accusé de réception au client (si email), changement de statut (si activé et email), **nouvelle visite** (alerte à la vendeuse, P-45). Les échecs sont visibles sur la commande.

**Réalisé en v0.7** : la ligne d'envoi naît dans la transaction de la commande ; juste après, le serveur tente l'envoi (4 s au plus) ; le cron `GET /api/cron/send-emails` reprend les échecs (6 tentatives, puis abandon avec l'erreur lisible). Chaque ligne est réservée par une mise à jour conditionnelle : aucun double envoi concurrent. Sans clé Resend ni expéditeur valide, rien n'est envoyé ni modifié. L'écran des commandes affichera ces lignes et proposera « Renvoyer » (étape 10), par la route dédiée de P-46. L'email de changement de statut a son gabarit, pas encore son déclencheur.

### 7.6 Analytique visiteurs (D-17, P-43, P-44) 🔶 étape 10

**Principe.** Savoir d'où viennent les visiteurs, ce qu'ils touchent et combien de temps ils restent, **sans stocker d'adresse IP** et **avec consentement**. Inspirée de l'analytique du site AKATech Studio (pays, ville, boutons, durée, carte, lien balisé), adaptée aux règles de ce cahier.

| Donnée | Détail | Remarque |
|---|---|---|
| Provenance du visiteur | Pays, **région ou province**, **ville** approximatifs ; position de la ville arrondie pour la carte | Lus dans les en-têtes de l'hébergeur au moment de la requête, l'adresse est ensuite oubliée. Jamais présentés comme une position exacte (§10.3) ; « Inconnu » hors hébergeur et en local |
| Appareil | Mobile, ordinateur ou tablette ; système ; navigateur | Le user-agent brut n'est pas conservé |
| Origine de la visite | Lien balisé (`utm_source`, `utm_medium`, `utm_campaign`), sinon domaine du site référent, sinon « Direct » | Un partage WhatsApp n'envoie aucun référent : d'où le lien balisé |
| Pages vues | Chemin seul, sans paramètres ; `/commande/confirmation` sans la référence | Jamais l'adresse complète |
| **Boutons touchés** | **Chaque bouton ou lien du site public**, par un identifiant d'une **liste fermée** (attribut `data-track`) : `header_cart`, `header_menu`, `hero_shop`, `product_add`, `sticky_add`, `cart_checkout`, `order_whatsapp`, `footer_whatsapp`, `game_play`… | Le serveur refuse tout identifiant hors liste. 🟡 Un test échoue si un bouton ou un lien public n'a ni identifiant ni exclusion explicite (les champs de formulaire sont exclus) |
| Parcours | `product_view`, `add_to_cart`, `remove_from_cart`, `checkout_started`, `order_submitted` | Sans montant ni donnée client ; aucun lien avec la commande |
| **Durée** | Signal d'activité toutes les 15 s tant que l'onglet est visible, et à la fermeture (`sendBeacon`) ; durée de session = dernière activité − début ; temps par page ; session close après 30 min d'inactivité | 🟡 valeurs à ajuster |

**Consentement et vie privée (P-44).** Bannière à la première visite ; **rien n'est enregistré avant le choix** ; « Refuser » n'a aucun effet sur la navigation ni sur la commande et **efface** ce qui concerne ce navigateur ; le choix se modifie sur `/cookies`. Détail des visites conservé **90 jours** 🟡 (variable `ANALYTICS_RETENTION_DAYS`), puis supprimé par le cron quotidien (P-34) ; les compteurs agrégés restent. Le back-office, la confirmation de commande et les routes `/api/*` ne sont jamais mesurés. Les robots sont ignorés.

**Alerte « Nouvelle visite » à la vendeuse (P-45).** À la première visite d'un navigateur ayant accepté la mesure, la vendeuse reçoit **automatiquement un email Resend** : « Nouvelle visite depuis [province], [pays] », avec la **provenance** (Google, Instagram, Facebook, TikTok, WhatsApp, autre site ou accès direct), la page d'arrivée, l'appareil et l'heure d'Abidjan. **Aucune adresse IP.** Les navigateurs intégrés d'Instagram et de Facebook n'envoient souvent aucun référent : la provenance se lit aussi dans le **nom du navigateur** (« Instagram », « Facebook »), analysé puis oublié. Un lien balisé (`utm_source`) l'emporte sur le référent. Plafond quotidien et priorité des emails de commande : P-45.

**Ce que montre l'onglet Analytics** (propriétaire seulement, 🟡) :
- chiffres clés : visiteurs, sessions, pages vues, **durée moyenne**, ajouts au panier, commandes envoyées ;
- visiteurs par jour (courbe) et visiteurs récurrents (liste triable et filtrable) ;
- **pays, régions ou provinces, villes**, et **carte des visiteurs** ;
- appareils, systèmes, navigateurs ;
- provenance : réseaux sociaux, WhatsApp (liens balisés), site référent, direct ;
- **pages les plus vues** et **boutons les plus touchés** ;
- **entonnoir** : fiche produit vue → ajout au panier → commande démarrée → commande envoyée ;
- **parcours d'un visiteur** (pages et clics, dans l'ordre), chargé à la demande ;
- **générateur de lien balisé** (page, canal, campagne) avec bouton « Ouvrir WhatsApp ».

**Réalisation.** Tables de §9 bis ; `POST /api/v1/track/arrival` (alerte, une fois par navigateur) ; `POST /api/v1/track` (public, limité par IP hachée, refuse un identifiant hors liste ou un envoi sans consentement) ; `GET /api/v1/admin/stats` (agrégats calculés par le serveur) et `GET /api/v1/admin/stats/visitor/[visitorId]` ; purge dans le cron quotidien. Nouvelles dépendances : **Recharts** (graphiques) et **Leaflet** avec les tuiles OpenStreetMap (carte), à autoriser dans la Content-Security-Policy (§10.2). Tests prévus : liste fermée, aucun enregistrement sans consentement, refus ⇒ effacement, aucune IP en base, chemins sans paramètres, agrégations.

**Vercel Web Analytics (D-22, P-57).** En complément de ce qui précède, `<Analytics />` de `@vercel/analytics/next` (comme sur Rabbit Shop), **monté après le consentement** 🟡. Pas de Google Analytics. L'adresse IP reste non enregistrée par l'analytique maison.

**Écarts voulus avec l'analytique d'AKATech Studio.** L'adresse IP n'est **pas** enregistrée (le site AKATech la garde 90 jours avec consentement) ; **aucun cookie ni identifiant avant le choix** (AKATech pose deux cookies d'audience anonyme avant tout choix) ; user-agent brut non conservé ; l'alerte email « Nouvelle visite » existe aussi chez AKATech ; ici elle donne **pays, province et provenance** et ne contient **jamais d'IP**.

---

## 8. Architecture technique

### 8.1 Stack
| Élément | Technologie | Rôle |
|---|---|---|
| Frontend | Next.js 14 / React 18, TypeScript strict | Boutique et back-office |
| Backend | Route Handlers (`/api/v1/*`), services métier | API et logique |
| Base de données | Neon PostgreSQL, Prisma 5.22 | Données persistantes |
| Hébergement | Vercel | Déploiement |
| Emails | Resend | Notifications (file d'envoi avec reprise) |
| Images | Cloudinary | Photos produits |
| Validation | zod | Tous les champs, côté serveur |
| Tests | Vitest | 224 tests |
| Animations | GSAP / ScrollTrigger / SplitText (effet « spaghetti », D-18 : **réalisé sans GSAP, en CSS pur, en v0.9**), Lenis, Framer Motion, Canvas 2D | Compléments (§4.5) |
| Analytique | Tables Prisma + `POST /api/v1/track` ; **Recharts** (graphiques) ; **Leaflet** + OpenStreetMap (carte) ; **Vercel Web Analytics** (`@vercel/analytics`, D-22, P-57) | 🔶 étape 10 — nouvelles dépendances (D-17, D-22) |
| Export | CSV (aucune dépendance) et Excel (`exceljs` 🟡) | 🔶 étape 10 (D-25, P-55) |

**Modules activés** : authentification admin, Resend, Cloudinary, Vercel Cron, anti-abus en base.
**Non activés** : Redis, file d'attente, paiement en ligne, i18n, temps réel, assistant IA.

### 8.2 Organisation du code
Les décisions détaillées et l'arborescence complète sont dans `docs/ARBORESCENCE.md`. En résumé :
- `src/app/(boutique)/` : site public (rendu statique régénéré) ; `src/app/admin/` : back-office (dynamique, jamais indexé) ; `src/app/api/` : routes.
- `src/server/` : **uniquement côté serveur** — `services/` (logique métier), `auth/`, `integrations/` (Cloudinary, Resend, PDF), `http.ts`, `db.ts`.
- `src/lib/` : partagé — validation zod, constantes (statuts, routes, images), utilitaires (slug, argent, poids, couleur).
- `src/components/` : interface (`admin/`, `shop/`, `ui/`) ; `src/styles/tokens.css` : la charte (**provisoire jusqu'à l'étape 13 bis, D-30**).
- `src/lib/smash/` : le mini-jeu (v0.10) — `engine.ts` (logique pure), `palette.ts`, `pots.ts`, `effects.ts`, `render.ts`, `game.ts` (chargé à la demande) ; `e2e/` : contrôle visuel dans Chromium (`visual-check.mjs`, `game-check.mjs`, données de démonstration `fakes/`, planches `pots-sheet.mjs` et `burst-sheet.mjs`).
- La logique métier vit dans les **services**, jamais dans les routes (qui restent fines).

### 8.3 Contrat d'API
Format de réponse unique : `{ ok: true, data }` ou `{ ok: false, error: { code, message, retryable, fields?, requestId } }`. Codes : validation (422), non connecté (401), interdit (403), introuvable (404), conflit (409), limite atteinte (429), taille (413), type de contenu (415), service indisponible (503), erreur interne (500, avec une simple référence côté client).

| Méthode | Route | Accès | Statut |
|---|---|---|---|
| GET | `/api/health` | public | ✅ |
| POST | `/api/v1/admin/auth/login` · `/logout` | public (limité) · session | ✅ |
| POST | `/api/v1/admin/products` · PUT/DELETE `/products/[id]` | admin | ✅ (🔶 liste des variantes imbriquée, D-24) |
| POST | `/api/v1/admin/categories` · PUT/DELETE `/categories/[id]` | admin | ✅ |
| POST | `/api/v1/admin/uploads/sign` | admin (60 par heure) | ✅ |
| POST | `/api/v1/cart/quote` | public (limité) | ✅ (🔶 `variantId` par ligne, D-24) |
| POST | `/api/v1/orders` | public (limité, interrupteur) | ✅ v0.6 (🔶 `variantId` par ligne, D-24) |
| PUT | `/api/v1/admin/orders/[id]/status` · `/note` · POST `/payments` | admin | 🔶 |
| GET | `/api/v1/admin/orders/[id]/receipt` | admin | ✅ v0.7 |
| POST | `/api/v1/admin/payments/[id]/void` | admin | 🔶 |
| GET | `/api/v1/admin/orders/export` | admin (propriétaire) | 🔶 (D-25, P-55) |
| — | zones, paramètres, clients (admin) | admin | 🔶 |
| GET | `/api/cron/send-emails` | secret `CRON_SECRET` (`Bearer`) ; fermée sans secret | ✅ v0.7 |
| POST | `/api/v1/admin/notifications/[id]/resend` | admin | 🔶 (P-46, bouton « Renvoyer ») |
| POST | `/api/v1/track/arrival` | public (limité, consentement exigé) | 🔶 (P-45, alerte « Nouvelle visite ») |
| POST | `/api/v1/track` | public (limité, consentement exigé) | 🔶 (D-17) |
| GET | `/api/v1/admin/stats` · `/stats/visitor/[visitorId]` | admin (propriétaire) | 🔶 (D-17) |
| POST | `/api/v1/assistant` (flux continu) · `/assistant/feedback` · `/assistant/end` | public (limité, interrupteur) | 🔶 (P-47, étape 15) |

---

## 9. Modèle de données (schéma Prisma v0.4, validé)

Une seule devise (FCFA, code `XOF`). Les tables d'analytique (étape 10, D-17) sont décrites en §9 bis ; elles ne contiennent **aucune donnée client**.

| Table | Rôle et champs essentiels |
|---|---|
| `AdminUser` | Compte : nom, email unique, hash du mot de passe, rôle (`OWNER`/`STAFF`), actif, dernière connexion |
| `AdminSession` | Session : hash du jeton unique, compte, navigateur, expiration |
| `Category` | Nom, slug unique, description, **couleur** (`#RRGGBB`), image, ordre, archivée |
| `Product` | Nom, slug unique, description, caractéristiques, mode d'utilisation, prix, prix promo, poids (g), SKU unique, stock (nullable), **statut**, SEO, ordre, catégorie, **nom de l'option** (D-24) |
| `ProductImage` | URL, identifiant Cloudinary, texte alternatif, position |
| `ProductVariant` *(D-24)* | Produit, étiquette (unique par produit), SKU unique, prix et prix promo facultatifs (hérités du produit si vides), stock (nullable), actif, ordre |
| `SlugRedirect` | Entité (produit/catégorie), ancien slug, cible — unique par (entité, slug) |
| `DeliveryZone` | Nom, type (`ABIDJAN`/`INTERIOR`/`INTERNATIONAL`), frais (null = à confirmer), **délai indicatif min et max en heures** (D-26), actif, position |
| `Customer` | Prénom, nom, téléphone unique, email |
| `Order` | Référence unique, clé d'idempotence unique, source (`WEBSITE`/`MANUAL`), **statut de livraison**, **statut de paiement**, zone, adresse, notes, sous-total, frais, total, montant à régler pour confirmer |
| `OrderItem` | Nom, prix unitaire, quantité, total de ligne : **instantanés** ; produit lié (devient nul si supprimé) ; **variante liée (devient nulle si supprimée) et étiquette figée** (D-24) |
| `Payment` | Type, mode, montant, date, administrateur, note, identifiant de transaction (futur webhook, unique), annulation (date, motif) |
| `Receipt` | Un par commande : numéro unique, date, **données figées** (JSON) |
| `OrderStatusHistory` | Type de changement, ancienne et nouvelle valeur, administrateur, note, date |
| `StoreSettings` | Une ligne : nom, WhatsApp, email de notification, acompte (2 000 par défaut), numéro Wave, infos du reçu |
| `EmailNotification` | File d'envoi : type, destinataire, statut, tentatives, prochaine tentative, erreur, clé de déduplication unique |
| `RateLimitBucket` | Compteur à fenêtre fixe (clés hachées, jamais d'IP ni d'email en clair) |

Relations : une catégorie a plusieurs produits ; un produit a plusieurs images **et plusieurs variantes** ; un client a plusieurs commandes ; une commande a plusieurs lignes, plusieurs paiements, un historique et au plus un reçu.
**Écart avec le cahier v1.0** : les tables d'analytique (`Visitor`, `VisitSession`, `PageView`, `VisitorAction`) arrivent à l'étape 10 (D-17) ; la table `notifications` est la file d'envoi `EmailNotification`.

### Ajouts de schéma pour la vitrine (v0.5) ✅ livrés
| Table | Champ ajouté | Rôle |
|---|---|---|
| `Product` | `isFeatured` (booléen) | « Mis en avant » : alimente la section Best-sellers (P-13) |
| `Product` | `publishedAt` (date) | Date de première publication : sert au badge « Nouveau » (RM-39) |
| `StoreSettings` | `focusProductId` | Produit du focus (P-14) |
| `StoreSettings` | `instagramUrl`, `tiktokUrl`, `facebookUrl` | Liens du contact et du footer ; un réseau sans lien n'est pas affiché |

Zones d'Abidjan pré-remplies par le seed (frais à confirmer) : Abobo, Adjamé, Anyama, Attécoubé, Bingerville, Cocody, Koumassi, Marcory, Plateau, Port-Bouët, Songon, Treichville, Yopougon. ❓ Communes réellement desservies.

### Ajouts de schéma — deuxième migration (D-24, D-26) 🔶
La migration `init` **existe maintenant** (`prisma/migrations/20261120000000_init`, présente dans le zip du 20 nov.) : ces ajouts feront une **deuxième migration** (une table et des colonnes facultatives : aucune donnée à convertir). Esquisse (le schéma complet s'écrit à l'étape 9 bis) :

```prisma
model ProductVariant {
  id         String  @id @default(cuid())
  productId  String
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  label      String  // « 250 ml », « Noir », « M / Noir »
  sku        String? @unique
  price      Int?    // null = hérite du prix ET du prix promo du produit (RM-44)
  salePrice  Int?    // seulement si price est renseigné ; strictement < price
  stock      Int?    // null = non suivi (RM-45)
  isActive   Boolean @default(true)
  position   Int     @default(0)
  orderItems OrderItem[]

  @@unique([productId, label])
  @@index([productId, isActive, position])
}
// Product       : + optionLabel String?  + variants ProductVariant[]
// OrderItem     : + variantId String? (relation SetNull)  + variantLabelSnapshot String?
// DeliveryZone  : + deliveryMinHours Int?  + deliveryMaxHours Int?   (P-56)
```

### 9 bis. Tables d'analytique (étape 10) 🔶
| Table | Champs essentiels |
|---|---|
| `Visitor` | Identifiant aléatoire (cookie du navigateur, **posé seulement après consentement**), première et dernière visite, nombre de visites |
| `VisitSession` | Visiteur, début, dernière activité, appareil, système, navigateur, origine (domaine du référent, `utm_*`), **pays (code), région ou province, ville**, latitude et longitude **arrondies** ; **ni adresse IP ni user-agent brut** |
| `PageView` | Session, chemin (sans paramètres), date |
| `VisitorAction` | Session, type (**liste fermée** : bouton touché ou événement du parcours), cible, chemin, date |

Index sur la session, la date et le type ; suppression en cascade ; purge du détail au-delà de `ANALYTICS_RETENTION_DAYS` (90 par défaut, 🟡). Aucun lien avec `Customer` ni `Order` (P-43).

### 9 ter. Tables de l'assistant IA (étape 15) 🔶
| Table | Champs essentiels |
|---|---|
| `AssistantConversation` | Début, fin, fournisseur utilisé, consentement, issue (aucune · passage à WhatsApp · produit ajouté au panier), nombre de messages |
| `AssistantMessage` | Conversation, rôle, texte **masqué** (coordonnées retirées), outils appelés, durée, fournisseur, indicateur « sans réponse », avis |
| `ProviderHealth` | Fournisseur et modèle, échecs consécutifs, écarté jusqu'à (disjoncteur), dernier succès de la sonde |

Texte et messages conservés `ASSISTANT_RETENTION_DAYS` jours (30 par défaut, 🟡) puis supprimés par le cron quotidien ; sans consentement, ni `AssistantMessage` ni texte : compteurs seulement (P-50).

---

## 10. Sécurité et vie privée

### 10.1 En place ✅
| Sujet | Mesure |
|---|---|
| Mots de passe | bcrypt (coût 12), 12 caractères minimum, 72 octets maximum ; jamais en clair, jamais en variable d'environnement |
| Session | Jeton aléatoire 256 bits, **seul son hash est stocké** ; cookie `httpOnly`, `Secure`, `SameSite=Lax` (préfixe `__Host-` en production) ; 7 jours ; révocable |
| Connexion | Limites par IP (10) et par email (5) sur 15 minutes, **y compris pour un email inconnu** ; message identique pour email inconnu, mot de passe faux et compte désactivé ; temps de réponse égalisé |
| Vérification de session | Dans **chaque** page et chaque route du back-office ; le middleware ne fait qu'un tri rapide |
| Requêtes qui modifient | Contrôle d'origine (anti-CSRF), taille maximale du corps JSON (10 ko, 50 ko pour un produit), type de contenu exigé |
| Erreurs | Format standard ; jamais de détail technique côté client, seulement une référence ; journal JSON côté serveur |
| Anti-abus | Compteur en base (jamais d'IP ni d'email en clair) ; signature d'envoi de photo limitée à 60 par heure et par compte |
| Emails et reçu (v0.7) | Gabarits HTML dont tout texte saisi est échappé ; sujets sur une ligne ; jamais d'adresse ni de contenu dans le journal ; clé d'API masquée dans les erreurs stockées ; cron fermé sans secret, comparaison à temps constant ; reçu PDF réservé au back-office, sans cache |
| Commande (v0.6) | Prix, frais, total et acompte toujours calculés par le serveur ; transaction unique ; stock réservé de façon atomique ; clé d'idempotence ; limites par IP (10 / 10 min) et par téléphone (5 / h), hachés ; champ piège ; interrupteur côté serveur ; journal sans nom, téléphone ni adresse ; confirmation `noindex`, sans `referrer`, limitée par IP |
| Back-office | En-têtes `noindex`, `no-store` ; jamais indexé |
| En-têtes | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| Images | Signature Cloudinary limitée au dossier et aux formats ; image acceptée seulement si elle vient de notre compte |
| Secrets | En variables d'environnement ; `.env*` exclus des archives ; le mot de passe du seed n'existe que le temps du seed |

### 10.2 À faire 🔶
- **Content-Security-Policy** (autoriser `api.cloudinary.com` et `res.cloudinary.com` et, pour la carte des visiteurs du back-office, `tile.openstreetmap.org`) ; **vérifier aussi le chargement de Vercel Web Analytics** (D-22).
- **Politique de conservation** des données clients et procédure de suppression sur demande (une commande figée ne doit pas casser l'historique).
- **Sauvegardes Neon** : vérifier la fenêtre de restauration du plan et **tester une restauration**.
- Page de **changement de mot de passe** (révoque les sessions).
- **Export des commandes** : propriétaire seulement, journal des exports, protection contre l'injection de formules (P-55).
- **Bannière de consentement et page `/cookies`** (P-44) : obligatoires dès que l'analytique est active (D-17, D-22) ; **mise à jour de la politique de confidentialité** ; vérification par un professionnel (§14.2).

### 10.3 Données personnelles
Collectées : nom, prénom, téléphone, adresse, email facultatif. Pas de compte client. Les adresses IP ne sont jamais conservées en clair (compteurs anti-abus : clés hachées) **ni dans l'analytique**. Une localisation par IP n'est jamais présentée comme une position exacte. **Analytique (D-17)** : pays, région ou province, ville approximatifs, appareil, navigateur, provenance, pages vues, boutons touchés et durée de visite ; **uniquement avec consentement** ; détail conservé 90 jours 🟡 puis supprimé, compteurs agrégés conservés ; un refus efface ce qui concerne le navigateur. **Vercel Web Analytics (D-22)** : même règle de consentement 🟡 (P-57) ; à citer dans `/cookies` et dans la politique de confidentialité. **Export des commandes (D-25)** : le fichier contient noms, téléphones et adresses ; il est généré à la demande et jamais conservé par le site ; sa garde relève ensuite de la vendeuse (à lui rappeler dans l'écran d'export). **Assistant IA (P-50)** : jamais de coordonnées demandées, téléphones et emails masqués, conversations enregistrées avec consentement seulement, 30 jours 🟡. ❓ Durée de conservation des commandes et des clients. Contenu des pages légales à fournir par la cliente (identité de l'éditeur, conditions de vente, retours) et à faire valider.

---

## 11. SEO et indexation 🔶
- Titres et méta-descriptions **uniques** (générés si le champ est vide) ; URLs descriptives et stables.
- `sitemap.xml`, `robots.txt`, **URLs canoniques**.
- **Redirections 308** des anciens slugs (RM-30).
- Données structurées **Product**, avec **une offre par variante** (prix, disponibilité) quand le produit en a (D-24) (et FAQ si la FAQ est visible sur la landing) ; fil d'Ariane.
- Images optimisées avec texte alternatif ; liens internes entre catégories et produits ; pages rapides et adaptées au mobile.
- `/boutique` et la section boutique de la landing : éviter le contenu dupliqué (la landing montre une sélection, `/boutique` le catalogue complet, avec canonique).
- Back-office et confirmation de commande : **non indexés**.
- Google Search Console pour suivre l'indexation (seul outil Google retenu : Google Analytics est écarté, D-22).
- L'indexation ne garantit pas le classement. `llms.txt` : expérimental, non requis.

---

## 12. Qualité et tests

| Niveau | Contenu | État |
|---|---|---|
| Typage | TypeScript strict | ✅ sans erreur |
| Unitaires et services | **587 tests exécutés** (v0.10, vrai Vitest, client Prisma généré) : 493 attendus en v0.8, + 35 pour l'effet « spaghetti » (v0.9), + 59 en v0.10 — moteur du mini-jeu (26, **vérifiés par mutation**), couleurs des pots, éclats, dessin des pots avec un faux contexte canvas, rendu du bloc et du footer, requête des couleurs de catégories, barre d'achat collée. Détail des suites plus anciennes : commande (validation, téléphone, montants, référence, message WhatsApp, reçu figé, service avec idempotence, survente, prix falsifié, zones, route avec limites et champ piège), emails et reçu (gabarits échappés, client Resend, boîte d'envoi, reprises, cron, reçu PDF), formulaire et confirmation en rendu serveur, mots de passe | ✅ |
| Compilation | `next build` (v0.10 : le code du jeu est un chunk séparé de 25,8 Ko, **absent du premier chargement** de la landing) | ✅ |
| Contre une vraie base et un vrai Cloudinary | Liste de 8 vérifications à la main dans le `README` (puis 9 pour la commande) | 🔶 non fait |
| Rendu serveur des composants de la vitrine (sections, grille, carrousel, carte, en-tête, FAQ) avec des données d'exemple ; **hydratation** : deux rendus identiques | Tests de rendu | ✅ |
| Vitrine dans un navigateur réel (ordinateur et téléphone) : fiche, galerie, barre collée, panier en feuille, commande, ticket PNG, mini-jeu | Contrôle visuel dans **Chromium** (`npm run e2e:visual`, v0.10) : **179 vérifications**, téléphone 390 × 844 et ordinateur 1440 × 900, vraies pages, données de démonstration, sans base ; **4 défauts trouvés et corrigés** | ✅ Chromium · 🔶 **vrais appareils, Safari et Firefox non faits** |
| Intégration commande | Idempotence, survente, prix falsifié, zones, nouvelles tentatives : **base simulée** | ✅ (v0.6) |
| Emails contre un **vrai compte Resend** et de vraies messageries | Liste de vérifications à la main dans le `README` (points 18 à 25) | 🔶 non fait |
| Commande contre un **vrai PostgreSQL** (transactions Neon, concurrence réelle) | Liste de vérifications à la main dans le `README` (points 9 à 17) | 🔶 non fait |
| Parcours complet | Produit → panier → commande → back-office | 🔶 |
| Desktop et mobile | Vérification visuelle réelle | ✅ émulation Chromium · 🔶 appareils réels |

---

## 13. État d'avancement et ordre de réalisation

| # | Étape (cahier v1.0 §12) | État |
|---|---|---|
| 1 | Valider le questionnaire et les informations commerciales | ⏳ en attente des réponses de la cliente (§14) |
| 2 | Finaliser la DA et les maquettes | ✅ **charte Meëra Kinks v1.2 reçue le 21 nov.** (D-30) et logo reçu (L1 en PDF) ; ⏳ maquettes : pied de page selon la capture annotée (D-32) |
| 3 | Schéma PostgreSQL | ✅ validé — **migration à générer** (`npx prisma migrate dev --name init`) |
| 4 | Next.js et authentification | ✅ |
| 5 | Back-office produits et catégories (+ photos) | ✅ |
| 6 | Boutique, fiches produits et slugs (§4, document de la landing v1.2) | ✅ livrée en v0.5 ; **fiche produit, panier et en-tête refondus en v0.8** (contrôle visuel dans Chromium fait en v0.10, quatre défauts corrigés ; vrais appareils à faire) |
| 7 | Panier (modal, devis du serveur) ✅ · formulaire de commande (modal) ✅ livré en v0.6 | ✅ |
| 8 | Enregistrement des commandes et message WhatsApp | ✅ livré en v0.6 (transaction, idempotence, stock, confirmation, lien `wa.me`) — **à vérifier contre une vraie base** ; **reçu en ticket PNG** téléchargé à la validation en v0.8 (P-39) |
| 9 | Reçus (PDF) et notifications (Resend, cron) | ✅ livré en v0.7 (boîte d'envoi, tentative immédiate, cron, reçu PDF) — **à vérifier contre un vrai compte Resend** ; le domaine doit être acheté et vérifié |
| **9 bis** | **Variantes de produit** (D-24) : schéma (`ProductVariant`, lignes de commande, délais des zones) **dans une deuxième migration**, formulaire produit, fiche, feuille du « + » (P-54), panier, devis, commande, reçu PDF, ticket PNG, emails, message WhatsApp, tests | 🔶 **à faire avant la migration et avant l'étape 10** 🟡 |
| 10 | Statuts, paiements, livraison, clients, paramètres, tableau de bord « à traiter aujourd'hui », **onglet Analytics** (D-17, §7.6), **alerte email « Nouvelle visite » à la vendeuse** (P-45), bouton « Renvoyer » (P-46), **export Excel et CSV des commandes** (D-25), **délais indicatifs par zone** (D-26), **Vercel Web Analytics** (D-22), le tout **au style AKATech** (D-16) | 🔶 **spécification ajustée en v2.6** |
| 11 | SEO (statistiques : **Vercel Web Analytics + analytique maison**, D-22 ; pas de Google Analytics) | 🔶 |
| 12 | Tests desktop et mobile | ✅ Chromium (v0.10, 179 vérifications) · 🔶 appareils réels, Safari, Firefox |
| 13 | Animations avancées (**effet « spaghetti »**, reprise du code de Rabbit Shop : D-18, D-29) et mini-jeu (**pots réalistes**, D-19) | **Spaghetti ✅ livré en v0.9** (CSS pur, titres et textes de la landing ; vu en capture fixe seulement : l'animation elle-même n'a pas été jugée à l'œil). **Mini-jeu ✅ livré en v0.10** (toucher et balayage horizontal, contrôle Chromium) — traitée avant la 10 (D-20) |
| **13 bis** | **Habillage Meëra Kinks** (D-30, D-31) : variables et polices de la charte, logo (header, footer), favicon et image de partage, couleurs des catégories = sous-gammes (P-59, P-60, P-61, P-64, P-65) ; **pied de page en trois zones fusionné avec l'aire de jeu** (D-32, §4.8) ; **mini-jeu au slash** avec pots de la gamme (D-33, §4.6) ; textes revus (P-66) | 🔶 **à faire, proposé avant la 9 bis et la 10** 🟡 (surtout du CSS et de l'interface, sans migration) |
| 14 | Déploiement : domaine, emails, sauvegardes, indexation | 🔶 |
| 15 | **Assistant commercial IA** (D-14, D-21, §15.1) : **spécification et données préparées maintenant**, construction après l'étape 10 | 🔶 préparée en v2.5 |

**Déjà livré, en un coup d'œil** : schéma complet et aligné sur le cahier (v0.5), seed (compte propriétaire, paramètres, 13 communes, produits de démo et liens de contact facultatifs), connexion sécurisée, produits (3 statuts, promo, poids, référence, SEO, stock, photos, « mis en avant »), catégories (couleur, archivage), redirections de slug, **vitrine** (landing, boutique, catégories, fiche produit, panier en modal avec devis serveur, en-tête avec panier, SEO de base, 404).
**Commande (v0.6)** : formulaire en modal (zone, indicatif, note de paiement visible avant l'envoi), `POST /api/v1/orders` (transaction unique, idempotence, stock atomique, prix relus), page de confirmation et bouton WhatsApp.
**Emails et reçu (v0.7)** : alerte vendeuse avec PDF joint, accusé client, reprises, cron, reçu PDF à la demande pour le back-office.
**Lot v0.8** : fiche produit au format mobile de référence (galerie balayable, ligne Quantité, bouton avec prix, cartes, pastilles, barre d'achat collée), panier en feuille (liste défilante, pied fixe), en-tête logo / panier / hamburger, **reçu de commande en ticket PNG** téléchargé à la validation (P-39) ; 30 tests de plus.
**Lot v0.9** : effet « spaghetti » en CSS pur (courbe `elastic.out(0.75, 0.3)` recalculée en CSS `linear()`, titres lettre par lettre, textes par mot, texte complet dans le HTML, mouvement réduit respecté) ; 35 tests de plus. Une erreur de typage de cette livraison (`spaghetti.test.ts`) a été corrigée en v0.10.
**Lot v0.10** : **mini-jeu Cosmetic Smash** (moteur testé, pots dessinés en canvas, éclatement, chargement à l'approche du footer, accessibilité) ; **contrôle visuel dans Chromium** (`npm run e2e:visual`, 179 vérifications) et **quatre défauts corrigés** (barre d'achat collée sur la landing et sur le pied de page, erreur de typage, éclats trop pâles) ; 59 tests de plus (587 au total) ; `package.json` en 0.10.0.
**Pas encore** : migration jouée contre une vraie base (le fichier `init` existe depuis le 20 nov.), **variantes de produit (D-24)**, paiements et commandes dans le back-office, **export des commandes (D-25)**, écran Paramètres, **analytique**, **habillage Meëra Kinks, logo et favicon (D-30, D-31)**, **pied de page fusionné et slash (D-32, D-33)**, contrôle visuel sur appareils réels, déploiement.

> **Ordre décidé le 19 novembre (D-20) : l'étape 13 passe avant la 10.** ⚠ Sans l'étape 10, les commandes ne se lisent qu'en base de données et la vendeuse ne peut ni changer un statut, ni enregistrer un paiement : **la boutique ne peut pas ouvrir à la vente avant la fin de l'étape 10.**
>
> **Ordre proposé 🟡 (v2.6).** Étape **9 bis (variantes)** avant la 10, car la 10 lit les lignes de commande avec leur option. La migration `init` existe déjà : la 9 bis ajoute une **deuxième migration**. **Le spaghetti (v0.9) et le mini-jeu (v0.10) sont faits ; reste l'étape 13 bis (habillage Meëra Kinks, pied de page fusionné, slash), proposée avant la 9 bis.**

---

## 14. Informations à confirmer

### 14.1 Avec la cliente (questionnaire `e_commerce.html`)
| # | Question | Bloque |
|---|---|---|
| 1 | ✅ **Répondu (B2, D-23)** : acompte de 2 000 FCFA fixe pour toute commande **à Abidjan** ; paiement intégral ailleurs | — |
| 2 | Comment les paiements sont-ils vérifiés ? Quelle règle d'annulation ? (B3, B4) | Statuts de paiement |
| 3 | ✅ **Répondu (C1)** : toutes les communes d'Abidjan (P-58) | — |
| 4 | **Partiellement répondu (C2 à C4)** : tout le pays, 13 pays étrangers, délais indicatifs (P-56, P-58). **Frais par destination : toujours manquants** (frais « à confirmer ») | Frais |
| 5 | ✅ **Répondu (A3, D-24)** : produits à variantes, à intégrer (P-53, P-54). Reste à connaître **le type d'options** et leur nombre par produit (question 28) | Fiches produit |
| 6 | Stock géré dès le MVP ? À quel moment diminue-t-il ? — *le code réserve le stock à la commande (P-30) ; à confirmer* | Règle RM-17 |
| 7 | Email client facultatif ou obligatoire ? — *facultatif dans le formulaire (P-07)* | Formulaire, notifications |
| 8 | ✅ **Tranché (D-27)** : reçu de commande, pas de facture | — |
| 9 | **Livraisons** : la vendeuse expédie hors d'Abidjan (D-23) ; services cités : Licy Express, Yango, Zoliv Express, livreur personnel (C5). **Retours : toujours sans réponse** | Pages légales, FAQ |
| 10 | Quels produits, photos, textes, catégories sont prêts ? (F0c, F0d) | Contenu réel |
| 11 | ✅ **Charte graphique reçue (v1.2, 21 nov.)** : couleurs et typographies (D-30). **Reste** : la **couleur de chaque catégorie** = couleur de sa sous-gamme (P-64), et les points « à compléter » de la charte (âge minimum d'utilisation, zone et canaux de vente, origine du prénom « Meëra », nom de la couleur Pêche, Pantone) | Habillage |
| 12 | Numéro WhatsApp de la vendeuse (F2) et numéro Wave (F3) | Paramètres |
| 13 | Informations légales et conditions de vente à afficher | Pages légales |
| 14 | Nombre de personnes ayant accès au back-office | Rôles |
| 15 | Comment se règle le **solde à la livraison** à Abidjan (espèces, Wave, autre) ? | FAQ, formulaire, paiements |
| 16 | ✅ **Public neutre (D-28)** | — |
| 17 | Quels produits **mettre en avant**, et lequel pour le **focus produit** ? | Landing |
| 18 | La vendeuse veut-elle **modifier elle-même** les textes de la landing ? (sinon, modification par AKATech) | Back-office, §20 du document de la landing |
| 19 | Politique de **retour et d'échange** | CGV, FAQ |
| 20 | **Logo** : reçu en **PDF sur fond Beige** (L1). **À fournir** : PNG transparents ou SVG de L1, de L5 (ou L3) et de L2, icône I1 pour le favicon, image de partage. Liens Instagram, TikTok, Facebook : reçus (annexe D) | Habillage, footer |
| 21 | **Visuel du hero** (photographie ou illustration) et photos des collections | Landing |
| 22 | Quelles personnes peuvent voir l'**onglet Analytics** ? *(proposé : le propriétaire seulement)* | Rôles |
| 23 | **Durée de conservation** des données d'analytique *(proposé : 90 jours pour le détail des visites)* ; textes de la **bannière cookies**, de la **page `/cookies`** et de la **politique de confidentialité** | Analytique, pages légales |
| 24 | **Assistant IA** : ton et prénom éventuel (proposé : vouvoiement chaleureux, pas de prénom inventé) ; sujets à toujours renvoyer vers WhatsApp (proposé : réclamation, remboursement, allergie, état d'une commande) ; accord pour conserver les conversations et durée | Assistant, §15.1 |
| 25 | **Produits réels avec descriptions riches** (composition, usage, précautions) et **FAQ validée** : l'assistant ne dit que ce qui est écrit | Assistant, contenu |
| 26 | **Budget IA** : paliers gratuits des fournisseurs (proposé, avec plafond quotidien) ou formule payante | Assistant, coûts |
| 27 | **Délais indicatifs (P-56)** : à partir de quand courent-ils (confirmation de la commande, paiement reçu, expédition) ? Peut-on les préciser par pays ou par ville ? | Textes de livraison |
| 28 | **Variantes (P-53)** : quels types d'options (taille, couleur, format), combien par produit, des prix différents d'une option à l'autre ? | Saisie des produits |
| 29 | **Catalogue et catégories** : Meëra Kinks est une marque **capillaire** (charte). Les familles « soins corporels » et « accessoires » du cahier v1.0 restent-elles au catalogue ? Quelles sont les **6 catégories** (A2), et à quelle **sous-gamme** (Hydratation, Nettoyage et Pousse, Nutrition) chacune appartient-elle ? | Collections, couleurs, textes de la landing (§32 du document de la landing) |
| 30 | **Crédit du pied de page** : formulation et lien (proposé : « Site réalisé par AKATech Studio ») | Pied de page (§4.8) |

### 14.2 Côté technique (Aka)
| # | Point | Bloque |
|---|---|---|
| 1 | Créer le projet **Neon** (branches `dev` et production) et lancer la migration | Tout test réel |
| 2 | Créer le compte **Cloudinary** | Photos |
| 3 | **Acheter le domaine** (Vercel), vérifier **SPF et DKIM** dans Resend, créer la clé API et renseigner `RESEND_API_KEY` et `EMAIL_FROM` : sans cela, Resend ne livre qu'à l'adresse du compte Resend, donc pas à la vendeuse | Emails (livrés en v0.7, à tester) |
| 4 | **Plan Vercel** : l'offre gratuite est réservée à un usage non commercial et n'accepte qu'**un cron par jour** (un rythme plus fréquent fait échouer le déploiement). En production : plan Pro, `CRON_SECRET` défini, puis `*/10 * * * *` dans `vercel.json` | Production, reprise des emails |
| 5 | Valider les propositions P-01 à P-66 (§2.3) | Étapes 6 à 10 |
| 6 | **Contrôle visuel sur appareils réels** (iPhone Safari, Android Chrome) puis sur Safari et Firefox : le contrôle automatique de la v0.10 ne couvre que Chromium | Habillage |
| 7 | **Écran Paramètres** (WhatsApp, réseaux, produit du focus, acompte) : aujourd'hui posés par le seed ou en base | Contact, focus produit |
| 8 | **Vérifier la commande contre la vraie base** (`README`, points 9 à 17), puis activer `NEXT_PUBLIC_CHECKOUT_ENABLED=1` | Ouverture des commandes |
| 9 | **Vérifier les emails et le reçu PDF** contre un vrai compte Resend (`README`, points 18 à 25) avant d'ouvrir les commandes : sans eux, l'alerte à la vendeuse ne part pas | Ouverture des commandes |
| 10 | **Valider les réglages de l'alerte « Nouvelle visite »** (P-45) : plafond par jour *(proposé : 40)*, ville dans l'email *(proposé : seulement si l'hébergeur la fournit)*, alerte envoyée seulement avec consentement | Étape 10 |
| 11 | **Valider sur pièce** l'effet « spaghetti » des titres, (l'option image au survol est **reportée**, décision d'Aka du 20 nov. — P-41) et le choix des pots (P-42, P-63 : contenants de la gamme) *(textes par mot : confirmés par Aka)* | Étape 13 |
| 12 | **Faire valider l'analytique** (consentement, conservation, déclaration) par un professionnel (P-44) : ce cahier n'est pas un avis juridique | Analytique, pages légales |
| 13 | Installer et justifier les nouvelles dépendances de l'analytique (**Recharts**, **Leaflet**, **`@vercel/analytics`**) et de l'export (**`exceljs`** 🟡) | Étape 10 |
| 14 | **Créer les clés** Gemini et Groq, fixer la liste ordonnée des modèles (en configuration, jamais en dur) et vérifier les avis de dépréciation | Étape 15 |
| 15 | **Mettre la FAQ en données** (aujourd'hui dans `content/landing.ts`) et ajouter, si validé, un champ facultatif « Précautions d'usage » à la fiche produit (§7.4) | Étape 15 |
| 16 | **Activer Vercel Web Analytics** dans le projet Vercel et trancher : script chargé après le consentement (proposé) ou avant (P-57) | Étape 10 |
| 17 | **Relire avec la cliente la liste des 13 pays et les délais** avant le seed des zones (P-56, P-58) | Zones |
| 18 | **Habillage Meëra Kinks** (D-30 à D-33) : valider P-59 à P-66 ; obtenir les fichiers de logo transparents et l'icône I1 ; arbitrer le fond du pied de page (Beige proposé), les boutons Orange ou Marron (P-65) et les états d'erreur sans rouge ; régler le mini-jeu en jouant (durée, cadence, points 🟡) | Étape 13 bis |

---

## 15. Compléments hors MVP

- **Assistant commercial IA** (D-14, D-21 ; **spécification proposée au §15.1**) : même architecture que celui d'AKATech Studio. Il **lira** la base en lecture seule (recherche de produits, fiche produit, informations de livraison) pour ne **jamais inventer un prix**. À préparer dès maintenant : descriptions riches, FAQ et informations de livraison sous forme de **données** (pas écrites en dur dans les pages).
- **Paiement en ligne** : webhook alimentant le registre de paiements (identifiant de transaction unique : un webhook rejoué ne crée pas de doublon).
- **Création manuelle de commande** (P-10).
- **Analytique propriétaire : entrée dans le périmètre (D-17, §7.6).** L'**alerte email « Nouvelle visite » à la vendeuse** en fait partie (P-45), ainsi que **Vercel Web Analytics** (D-22). Restent hors MVP : export des données, segmentation avancée.
- **Export des commandes en Excel et CSV : entré dans le MVP (D-25).** Restent hors MVP : export PDF, export des clients et de l'analytique · gestion avancée des stocks · avis clients administrables · image de catégorie (le champ existe, l'envoi n'est pas encore dans l'interface) · mini-jeu et animations GSAP avancées (étape 13) · WhatsApp Business Platform.
- Nettoyage des photos envoyées puis retirées avant enregistrement (elles restent orphelines chez Cloudinary).

### 15.1 Assistant commercial IA — spécification proposée 🟡 (D-14, D-21, P-47 à P-52)

**Faut-il attendre la vendeuse ? Non.** L'architecture, les outils, les garde-fous, l'interface et les tests ne dépendent pas d'elle : ils se construisent avec les produits de démonstration. Elle intervient seulement pour le **contenu** et quelques choix (tableau « Ce qui attend la vendeuse »). Construction **après l'étape 10** (D-14 : « une fois le site prêt »).

**Rôle.** Aider un visiteur à choisir un produit, expliquer la livraison et le paiement, puis l'orienter vers le panier ou WhatsApp.

| Il fait | Il ne fait jamais |
|---|---|
| Rechercher et comparer des produits publiés, expliquer une fiche | Prendre une commande, ajouter au panier sans clic, encaisser |
| Expliquer livraison, acompte et paiement avec les textes validés (RM-41) | Annoncer un prix, un délai, une promotion ou une composition absents des données (RM-42) |
| Proposer « Ajouter au panier » (le visiteur touche le bouton) | Donner un conseil médical ou un avis sur une réaction de peau |
| Passer la main sur WhatsApp avec un résumé sans coordonnées | Demander un téléphone, une adresse ou un email |

**Architecture.**
1. Bouton flottant + modal `#assistant` (`<dialog>`, P-02).
2. `POST /api/v1/assistant` en **flux continu** : message → fournisseur IA → appels d'outils → réponse.
3. Les outils sont des **services métier existants, en lecture seule**, sur les **données publiées** uniquement (RM-27, RM-31).
4. **Prompt court généré** à chaque requête (identité, règles, textes uniques de paiement et de livraison) : il ne contient **ni catalogue, ni numéro Wave** (RM-08).

**Outils.**
| Outil | Rôle |
|---|---|
| `search_products(query, category?, maxPrice?)` | 5 produits publiés au plus : nom, lien, prix et promotion, photo, disponible ou épuisé (jamais la quantité exacte) |
| `get_product(slug)` | Fiche complète : description, caractéristiques, mode d'utilisation, poids |
| `list_categories()` | Catégories actives |
| `get_delivery_info(place?)` | Zone, frais ou **« à confirmer »** (RM-03) ; aucun délai inventé |
| `get_payment_rules(zone)` | Textes de l'annexe B (source unique) |
| `get_faq(topic)` | Réponses de la FAQ validée |
| `suggest_add_to_cart(productId, quantity)` | **N'ajoute rien** : renvoie une carte avec un bouton que le visiteur doit toucher |
| `handoff_whatsapp(summary)` | Lien `wa.me` avec un résumé **sans coordonnées** ; absent si aucun numéro n'est configuré |

*Absents volontairement* : état d'une commande (la référence est le seul secret de la page, P-27 : l'assistant renvoie vers la page de confirmation ou WhatsApp), création de commande, clients, paiements, statistiques.

**Fiabilité des réponses (P-48).**
- **Prix** : cartes rendues par le site ; **contrôle de sortie** : tout montant FCFA du texte doit figurer dans les résultats d'outils de la conversation, sinon la réponse est remplacée par « Le prix exact est affiché dans le panier ».
- **Pas de donnée, pas de réponse** : « Je n'ai pas cette information » + WhatsApp ; la question est notée « sans réponse » pour la vendeuse.
- **Injection** : messages des visiteurs et textes de produits sont des **données, jamais des instructions** ; outils sans effet de bord ; arguments validés (zod) ; liens limités au site et à `wa.me` ; longueur des réponses plafonnée.

**Résilience (P-49).** Cascade ordonnée Gemini → Groq (liste **en configuration**, pas dans le code), comme AKATech, avec en plus : **délai maximal** par appel (🟡 8 s) et nouvelle tentative espacée ; **disjoncteur** (état en base) ; **adaptateur commun** pour les appels d'outils, avec le même test de contrat pour chaque fournisseur ; **sonde quotidienne** (cron) qui prévient d'un modèle retiré ; dernier recours : message de repli + WhatsApp, jamais une erreur technique. Le prompt court tient dans les petites limites des paliers gratuits.

**Limites et coûts (P-49).** Limites par IP hachée et par session (T-09) ; 🟡 20 messages par conversation, 500 caractères par message ; **plafond quotidien d'appels** (au-delà : bascule WhatsApp) ; interrupteur `NEXT_PUBLIC_ASSISTANT_ENABLED` aussi côté serveur (503) ; script chargé **à l'ouverture seulement** : il ne ralentit jamais le site.

**Vie privée (P-50).** Voir P-50 et §10.3.

**Interface.** Bouton en bas à gauche (le bas droit est réservé au bouton WhatsApp s'il existe) ; sur une fiche produit mobile, au-dessus de la barre d'achat ; feuille plein écran sur téléphone ; réponses en flux ; puces de suggestion ; cartes produit (photo, nom, prix, `Voir la fiche`, `Ajouter au panier`) ; mention « assistant IA » ; avis `Utile` / `Pas utile` ; `Nouvelle conversation` ; focus, annonces aux lecteurs d'écran, mouvement réduit. Textes proposés : landing §29.

**Supervision (P-52).** Onglet « Assistant » (propriétaire, style D-16) : conversations, passages à WhatsApp, fournisseurs utilisés et erreurs, durée de réponse, avis, outils les plus appelés, **questions sans réponse**.

**Tests (P-52).** Fournisseur simulé déterministe ; garde-fou de prix ; outils en lecture seule (brouillons et archivés jamais renvoyés) ; jeu de messages hostiles ; limites et plafond ; repli ; masquage des coordonnées ; contrat par fournisseur ; **jeu de questions d'évaluation** rejoué à chaque changement de prompt ou de modèle.

**Ce qu'AKATech fait, et ce qui change ici.**
| Sujet | Assistant d'AKATech Studio | Ici (plus robuste) |
|---|---|---|
| Données | Services et tarifs dans le prompt (~6 000 jetons) | Outils de lecture, prompt court |
| Prix | Cités par le modèle | Cartes rendues par le site + contrôle des montants |
| Fournisseurs | Gemini (4 modèles) puis Groq, puis message WhatsApp | Idem + délai, reprise, disjoncteur, sonde quotidienne |
| Modèles retirés | Découverts par un email de dépréciation | Détectés par la sonde |
| Objectif | Qualifier un prospect et lancer un devis | Conseiller et orienter vers panier ou WhatsApp, sans collecte |
| Conversations | Enregistrées en base | Avec consentement seulement, coordonnées masquées, 30 jours |
| Suivi | Onglets leads et conversations | Onglet Assistant avec questions sans réponse et avis |

**Ce qui attend la vendeuse** (contenu et décisions) :
| Sujet | Pourquoi | Valeur proposée en attendant |
|---|---|---|
| Ton, prénom éventuel | Identité de l'assistant | Vouvoiement chaleureux ; pas de prénom inventé |
| Produits réels, descriptions riches, précautions d'usage | Il ne dit que ce qui est écrit | Produits de démonstration |
| FAQ validée, politique de retour et d'échange | Réponses fiables | Textes uniques des annexes ; « à confirmer » |
| Zones, frais, délais | Livraison | « À confirmer » (RM-03) |
| Conservation des conversations | Vie privée | Rien sans consentement ; 30 jours |
| Sujets toujours renvoyés vers WhatsApp | Périmètre | Réclamation, remboursement, allergie, commande |
| Budget IA | Limites | Paliers gratuits + plafond quotidien |

**À préparer dès maintenant** (données, pas de code) : descriptions riches et caractéristiques (une par ligne) à la création des produits ; **FAQ en données** (aujourd'hui dans `content/landing.ts`) ; règles de livraison et de paiement en source unique (déjà fait, RM-41) ; champ facultatif « Précautions d'usage » sur la fiche produit 🟡.

**Réalisation (étape 15).** Tables de §9 ter ; routes du §8.3 ; purge et sonde dans le cron quotidien (P-34) ; appels REST aux fournisseurs sans SDK si possible (moins de dépendances, 🟡) ; variables du §16.

---

## 16. Environnement et déploiement

| Variable | Rôle | Étape |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Neon (URL poolée pour l'application, URL directe pour les migrations) | ✅ |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Photos | ✅ |
| `RESEND_API_KEY`, `EMAIL_FROM` | Emails | 🔶 |
| `CRON_SECRET` | Protège la reprise des emails | 🔶 |
| `NEXT_PUBLIC_SITE_URL` | Seule variable publique | 🔶 |
| `ANALYTICS_RETENTION_DAYS` | Durée de conservation du détail des visites (90 par défaut, 🟡) | 🔶 étape 10 |
| `GEMINI_API_KEY`, `GROQ_API_KEY` | Fournisseurs de l'assistant IA (un seul suffit pour démarrer) | 🔶 étape 15 |
| `NEXT_PUBLIC_ASSISTANT_ENABLED` | Interrupteur de l'assistant (aussi appliqué côté serveur) | 🔶 étape 15 |
| `ASSISTANT_DAILY_BUDGET`, `ASSISTANT_RETENTION_DAYS` | Plafond quotidien d'appels IA ; conservation des conversations (30 jours, 🟡) | 🔶 étape 15 |
| `SEED_*` | **Uniquement** pour le seed, en local, puis à supprimer | ✅ |

- **Commande de build Vercel** : `npm run build:vercel` (génération du client Prisma, **application des migrations**, build). Sans l'application des migrations, le code part en production avec une base sans ses tables.
- Le compte propriétaire se crée en lançant le seed **une fois depuis la machine d'Aka**, avec l'URL de la base de production, puis en supprimant le mot de passe.
- Versions des dépendances **figées** (fichier de verrouillage commité).
- **Contrôle visuel (v0.10)** : `npm run e2e:visual` joue les vraies pages dans Chromium (Playwright, `npx playwright install chromium` au premier usage) avec des données de démonstration : le script pose `E2E_FAKE_DATA=1`, que `next.config.mjs` **refuse en production**. `E2E_ONLY=landing,produit,panier,ticket,jeu` joue une partie des scénarios. `npm run e2e:pots` et `npm run e2e:burst` produisent les planches des pots et de l'éclatement.
- Démarrage local, commandes et vérifications manuelles : `README.md`.

---

## 16 bis. État des tâches restantes dans le code après la fusion

| Priorité | Reste à faire | État |
|---|---|---|
| P0 | Vérifier la compatibilité complète des modules v0.8 ajoutés avec le schéma et les routes v0.10, puis valider `npm run typecheck`, `npm test` et `npm run build` | 🔶 à vérifier dans l’environnement de livraison |
| P0 | Brancher et tester une vraie base Neon, appliquer la migration, créer le compte admin et tester les sauvegardes/restaurations | 🔶 |
| P0 | Tester les emails avec un vrai domaine Resend (SPF/DKIM), la pièce jointe PDF et le cron | 🔶 |
| P1 | Ajouter les variantes `ProductVariant` et les faire suivre dans produit, panier, commande, reçu, emails et WhatsApp | 🔶 |
| P1 | Construire le back-office Commandes : statuts, paiements, annulation, livraison, clients, tableau de bord et paramètres | 🔶 |
| P1 | Construire l’analytique propriétaire avec consentement, onglet Analytics et alerte email « Nouvelle visite » | 🔶 |
| P1 | Appliquer complètement la charte v1.2 : assets de logo/favicone, six couleurs, Poppins/Great Vibes et textes validés | 🔶 / ❓ |
| P1 | Fusionner visuellement le footer et l’aire de jeu en trois zones, puis remplacer l’éclatement par le slash avec pots coupés en deux | 🔶 |
| P2 | Construire l’assistant commercial IA et ses garde-fous, limites, supervision et tests d’évaluation | 🔶 |
| P2 | Tester sur iPhone Safari, Android Chrome, Safari et Firefox ; valider le plaisir de jeu, l’accessibilité et les performances | 🔶 |
| P2 | Déployer sur Vercel, acheter/configurer le domaine et effectuer la recette finale avec les contenus réels | 🔶 / ❓ |

Cette liste complète les étapes déjà décrites au §13 ; elle ne remplace ni ne supprime l’historique du cahier.

## 17. Journal des versions

| Version | Contenu |
|---|---|
| Cahier 1.0 | Cadrage initial : vision, DA, landing, URLs, parcours, back-office, architecture, modèle, MVP, SEO, questions |
| Code 0.1 | Arborescence et schéma Prisma initiaux |
| Code 0.2 | Projet Next.js : authentification admin (sessions, limites de tentatives), seed, anti-abus, tests |
| Code 0.3 | Produits, catégories, envoi direct des photos vers Cloudinary |
| Code 0.4 | **Alignement sur le cahier v1.0** : statuts livraison/paiement séparés (7 statuts de paiement), reçu figé par commande, produit Brouillon/Publié/Archivé, prix promo, poids, SKU, SEO, redirections de slug, couleur et archivage des catégories, adresses `/boutique` `/categorie` `/produit`, 123 tests |
| **Cahier 2.0** | Premier cahier des charges : décisions (modals, DA, notifications, paiements), règles métier, état réel du projet, propositions à valider, questions ouvertes |
| **Cahier 2.1** | Intègre le document de la landing v1.1 : adresses et ancres, panier du header (nombre et montant), section Avis (aucun avis inventé), « Offres & nouveautés » en raccourcis, best-sellers « mis en avant », garde-fou de publication, états et pages à prévoir, ajouts de schéma prévus (v0.5), questions 15 à 20 |
| Code 0.5 | **Vitrine** : landing (13 sections, masquées quand les données manquent), section Boutique (sticky + carrousel ou grille stable), `/boutique` (recherche, filtres, tri), catégories, fiche produit avec redirections 308, panier en modal (devis serveur `POST /api/v1/cart/quote`), en-tête avec panier (nombre + montant), pages légales provisoires, 404 et erreur de marque, `sitemap.xml`, `robots.txt`, données structurées (Product, FAQ, Organisation, fil d'Ariane) ; schéma v0.5 (« mis en avant », date de première publication, focus produit, réseaux sociaux) ; 224 tests |
| **Cahier 2.2** | État réel après la vitrine : étape 6 livrée, propositions P-20 à P-22 (ordre de la landing et redondance possible, aucun lien mort, pages légales et hero provisoires), contrôle visuel et écran Paramètres à faire |
| Code 0.6 | **Commande** : formulaire en modal `#commande` (coordonnées, zone, indicatif, destination en liste ou saisie libre, note de paiement de l'annexe B avant l'envoi), `POST /api/v1/orders` (garde-fous, idempotence, transaction unique : prix relus, stock atomique, client par téléphone, zone et frais, montants, commande, lignes figées, historique, reçu figé, lignes d'email), page `/commande/confirmation` avec bouton WhatsApp, `ModalRouteSync`, interrupteur côté serveur ; 359 tests |
| **Cahier 2.3** | État réel après la commande : étapes 7 et 8 livrées, propositions P-23 à P-31 (destination libre, acompte plafonné, téléphone ivoirien à 10 chiffres, fiche client, confirmation par référence, limites, interrupteur serveur, panier changé et stock, pas de case CGV), vérifications à la main de la commande, étape 9 (emails, reçus) en prochaine étape |
| Code 0.7 | **Emails et reçus PDF** : boîte d'envoi (réservation conditionnelle, 6 tentatives, abandon des erreurs définitives), client Resend par API REST, tentative immédiate après la commande, cron `GET /api/cron/send-emails` fermé sans secret, gabarits d'alerte vendeuse et d'accusé client (échappés), reçu PDF (`pdf-lib`) servi au back-office, `vercel.json`, variables vides = absentes ; 463 tests |
| **Cahier 2.4** | État réel après les emails et le reçu : étape 9 livrée (à vérifier contre un vrai Resend), propositions P-32 à P-38 (deux emails, reprises, cron quotidien, pied du reçu, PDF latin, variables vides, reçu servi au back-office), vérifications à la main 18 à 25, étape 10 (statuts, paiements, clients, paramètres) en prochaine étape |
| Code 0.8 | **Fiche produit, panier, en-tête et reçu ticket** : fiche produit au format mobile de référence (galerie balayable à flèches, ligne Quantité, bouton avec prix, cartes, pastilles, barre d'achat collée), panier en feuille (liste défilante, pied fixe), en-tête logo / panier / hamburger, **reçu de commande en ticket PNG** dessiné en canvas (code-barres Code 39, tampon « paiement non reçu ») et téléchargé à la validation, date de commande renvoyée par le serveur ; 30 tests de plus |
| **Cahier 2.5** | **Ajustements de l'étape 10 et compléments** : back-office au style AKATech (D-16), analytique propriétaire avec consentement (D-17, §7.6, §9 bis, P-43, P-44) qui remplace P-08 et P-18, effet « spaghetti » (D-18, P-41), pots réalistes (D-19, P-42), étape 13 avant la 10 (D-20), **alerte email « Nouvelle visite » à la vendeuse** (P-45, précisée par Aka le 19 nov.), route du bouton « Renvoyer » (P-46), textes en effet élastique **par mot** confirmés, **assistant IA préparé** (D-21, §15.1, P-47 à P-52, étape 15), lot v0.8 (P-39 avec écart assumé sur P-32, P-40), menu du back-office à 7 entrées (P-01), correction du §5 (confirmation livrée en v0.6) |
| **Cahier 2.6** | **Décisions d'Aka sur le retour de la cliente (annexe D)** : analytique Vercel Web Analytics + maison, pas de Google Analytics, IP toujours non enregistrée (D-22, P-57) ; acompte à Abidjan seulement, paiement intégral ailleurs, expédition par la vendeuse (D-23) ; **variantes de produit** (D-24, RM-43 à RM-46, P-53, P-54, deuxième migration, étape 9 bis) ; **export des commandes** dans le MVP (D-25, RM-48, P-55) ; **délais indicatifs selon la zone** (D-26, RM-47, P-56) ; zones et pays (P-58) ; reçu et non facture (D-27) ; public neutre (D-28) ; **effet « spaghetti » = code de Rabbit Shop relu** (D-29, P-41). **Le code reste en v0.8.** |
| **Cahier 2.6 (mise à jour du 20 nov.)** | **Effet « spaghetti » livré dans le code v0.9** (D-29, P-41) : CSS pur, sans GSAP, titres et textes de la landing. **Image au survol reportée** (Aka : « pas pour le moment »). **La migration `init` est désormais dans le dépôt** : les variantes (D-24) et les délais de zone (D-26) feront une deuxième migration. |
| Code 0.9 | **Effet « spaghetti »** : courbe élastique recalculée en CSS `linear()`, titres lettre par lettre et textes par mot, rendu serveur, mouvement réduit ; 35 tests de plus |
| Code 0.10 | **Mini-jeu Cosmetic Smash** (moteur pur testé, pots canvas, éclatement, chargement à l'approche du footer, accessibilité), **contrôle visuel dans Chromium** (179 vérifications), **quatre défauts corrigés** (barre collée sur la landing et le pied de page, typage, éclats), `package.json` 0.10.0 ; 587 tests |
| **Cahier 2.7** | **Mise à jour d'après la v0.10 et la charte Meëra Kinks v1.2** : D-30 (charte), D-31 (logo combiné header et footer, icône pour le favicon), D-32 (pied de page en trois zones fusionné avec l'aire de jeu), D-33 (slash, pots coupés en deux) ; P-59 à P-66 ; RM-49 à RM-52 ; §4.6 réécrit, §4.7 (identité) et §4.8 (pied de page) ajoutés ; étape 13 bis ; questions 29 et 30 ; état du code et des tests (§12, §13). **Aucune partie de la charte, du logo, du pied de page ni du slash n'est construite.** |

---

## Annexe A — Glossaire

| Terme | Définition |
|---|---|
| **Slug** | Partie lisible d'une adresse (`beurre-de-karite-naturel`) |
| **Instantané** | Copie figée d'une information au moment de la commande (nom, prix, quantité) |
| **Acompte** | Somme demandée à Abidjan pour confirmer la commande (2 000 FCFA, ❓) |
| **Wave** | Service de paiement mobile utilisé pour l'acompte et les paiements avant expédition |
| **Reçu** | Document de suivi de commande (pas une facture fiscale, ❓) |
| **Idempotence** | Une même demande envoyée deux fois crée une seule commande |
| **Modal** | Fenêtre qui s'ouvre par-dessus la page (panier, commande, histoire) |
| **Sticky** | Section qui reste collée en haut pendant le défilement |
| **Outbox** | File d'envoi d'emails en base, avec reprise en cas d'échec |
| **ISR** | Pages publiques générées à l'avance et régénérées après une modification |
| **Effet « spaghetti »** | Texte dont les lettres apparaissent avec un rebond élastique au défilement (réf. Rabbit Shop) |
| **Analytics** | Mesure de l'audience : provenance, pages vues, boutons touchés, durée de visite (avec consentement) |
| **Alerte « Nouvelle visite »** | Email envoyé à la vendeuse à la première visite d'un navigateur ayant accepté la mesure : pays, province, provenance, sans IP (P-45) |
| **Assistant IA** | Chat qui conseille les visiteurs et les oriente vers le panier ou WhatsApp (§15.1) |
| **Appel d'outil (tool)** | Fonction en lecture seule que l'IA demande au serveur d'exécuter (recherche de produits, livraison…) |
| **Disjoncteur** | Mise à l'écart temporaire d'un fournisseur IA en échec répété |
| **UTM** | Balise ajoutée à un lien partagé (`?utm_source=whatsapp`) pour savoir d'où vient la visite |
| **Ticket (reçu PNG)** | Reçu de commande façon ticket de caisse, téléchargé à la validation (P-39) |

## Annexe B — Texte validé : commandes et livraisons

> **1. Livraison à Abidjan.** Pour les commandes dans les communes d'Abidjan : le paiement s'effectue à la livraison ; un acompte de 2 000 FCFA est demandé pour confirmer la commande ; le solde est réglé à la réception de la commande.
>
> **2. Livraison hors d'Abidjan et à l'international.** Pour les commandes provenant de l'intérieur du pays ou de l'étranger : le paiement intégral de la commande est requis avant l'expédition ; les frais d'expédition sont inclus dans le montant à régler ; le paiement s'effectue par Wave au numéro communiqué par la vendeuse après confirmation de la commande.
>
> **3. Confirmation de commande.** Après réception de la commande, l'équipe contacte le client sur WhatsApp afin de : vérifier les informations fournies ; confirmer la disponibilité des produits ; préciser les frais de livraison ; communiquer les modalités de paiement.
>
> Merci pour votre confiance !

## Annexe C — Références de direction artistique

| Référence | Ce qu'on en retient |
|---|---|
| **My Frida** (mobile) | Une section pleine largeur par catégorie, chacune de sa couleur, avec titre ; carrousel de pastilles (photo ronde, nom, flèches) ; gros visuel du produit choisi en dessous ; bords découpés entre les sections ; empilement au défilement |
| **Hello Hello Outfit** — liste | Grille asymétrique (tailles et décalages variés) ; carte = photo, nom, prix, point + catégorie ; en-tête minimal « panier (0) » et menu |
| **Hello Hello Outfit** — fiche | Lien de retour, grand titre, prix, galerie, description courte, option, sélecteur « − 1 + », grand bouton « Ajouter ↗ », pied de page typographique très large |
| **Palmo** | Interactivité et mini-jeu dans le footer (complément). **Capture du 21 nov. annotée par Aka** : zone 1 (marque), zone 2 (liens de navigation), aire de jeu, zone 3 (filigrane, copyright) → §4.8. On en reprend l'ordre des zones, pas les éléments graphiques |
| **Charte graphique Meëra Kinks v1.2** (`Charte_graphique_Meera_Kinks_v1_2.pdf`) | **Référence de l'identité** (D-30) : ADN, ton, palette de six couleurs, polices Poppins et Great Vibes, logos L1 à L5, icônes I1 à I5 → §4.7 |
| **Logo simple** (`logo_simple_meera_PDF.pdf`) | Logo L1 sur fond Beige, en PDF : sert de référence ; les fichiers transparents ou vectoriels restent à fournir (P-60) |
| **Rabbit Shop** (`rabbit-shop_1.zip`) | Titres élastiques lettre par lettre (`.elastic-title`, GSAP SplitText, `elastic.out`), image au survol d'une lettre, boutons magnétiques. **Code relu le 19 nov. (`lib/useGsapLenis.ts`) : repris pour l'effet « spaghetti » (D-29, P-41), **réalisé sans GSAP en v0.9** ; Vercel Web Analytics y est monté dans `app/layout.tsx` |
| **Site AKATech Studio** (`akatech-nextjs-11-cumul_1.zip`) | Back-office à onglets, vue d'ensemble « à traiter aujourd'hui », thème clair ou sombre, analytique (pays, ville, boutons, durée, carte des visiteurs, lien balisé), bannière cookies et page `/cookies`, assistant IA (cascade de fournisseurs, appels d'outils) |


---

## Annexe D — Retour de la cliente : réponses au questionnaire e-commerce

> **Source :** réponses transmises par la cliente dans le questionnaire HTML `questionnaire-boutique-ecommerce`. Cette annexe retranscrit les 38 réponses visibles dans les captures reçues le 19 novembre 2026. Les réponses sont conservées telles que communiquées, sans les transformer en décisions techniques.
>
> **Important :** lorsqu'une réponse entre en contradiction avec une règle déjà présente dans le cahier des charges, la contradiction est signalée à la fin de l'annexe. Elle devra être arbitrée avant d'adapter le fonctionnement du site.

### A. Catalogue et produits

| N° | Référence / question | Réponse de la cliente |
|---:|---|---|
| 1 | **A1 — Nombre de produits disponibles** | 180 |
| 2 | **A2 — Nombre de catégories de produits** | 6 |
| 3 | **A3 — Variantes (tailles, couleurs, formats)** | Oui |
| 4 | **A4 — Prix fixe par produit** | Oui |
| 5 | **A5 — Offres promotionnelles** | Oui |
| 6 | **A5b — Détails des promotions** | Les % de promotions ne sont pas encore disponibles |
| 7 | **A6 — Photos des produits disponibles** | Oui |

### B. Panier, paiement et commandes

| N° | Référence / question | Réponse de la cliente |
|---:|---|---|
| 8 | **B1 — Panier multi-produits** | Oui |
| 9 | **B2 — Acompte 2 000 FCFA fixe** | Oui, fixe pour toutes les commandes |
| 10 | **B3 — Vérification des paiements** | La cliente (la vendeuse) elle-même |
| 11 | **B4 — Annulation d'une commande** | L’acompte est retourné et le produit retourne en stock |

### C. Zones et livraison

| N° | Référence / question | Réponse de la cliente |
|---:|---|---|
| 12 | **C1 — Communes d'Abidjan desservies** | Toutes les communes |
| 13 | **C2 — Couverture nationale** | Oui, tout le pays |
| 14 | **C3 — Pays étrangers visés** | Burkina Faso, Mali, Niger, Togo, Bénin, Cameroun, Congo Kinshasa, Congo Brazzaville, Gabon, Ghana, Nigeria, France, Canada |
| 15 | **C4 — Délais de livraison** | 24h Abidjan, 72h intérieur, 5 à 15 jours international |
| 16 | **C5 — Service de livraison** | Licy Express, Yango, Zoliv Express, livreur personnel |

### D. Back-office et gestion

| N° | Référence / question | Réponse de la cliente |
|---:|---|---|
| 17 | **D1 — Accès au back-office** | La cliente uniquement (la vendeuse) |
| 18 | **D2 — Ajouter/modifier les produits** | Oui |
| 19 | **D3 — Commandes par date et statut** | Oui |
| 20 | **D4 — Historique des clients** | Oui — c'est le but |
| 21 | **D5 — Notification nouvelle commande** | Oui |
| 22 | **D5b — Canal de notification** | meerakinks@gmail.com |
| 23 | **D6 — Export des commandes** | Oui |

### E. Identité de marque et suivi des performances

| N° | Référence / question | Réponse de la cliente |
|---:|---|---|
| 24 | **E1 — Nom exact de la marque** | Meëra Kinks |
| 25 | **E2 — Fiche Google Business** | Non |
| 26 | **E3 — Concurrents appréciés** | Les secrets de loly, Jikeko beauty, Pure pousse |
| 27 | **E4 — Suivi des performances** | Oui — intégration obligatoire : provenance des visiteurs (adresse IP, pays) + suivi de leurs clics sur le site (Google Analytics + Search Console). |

### F. Identité visuelle, contenus et réseaux sociaux

| N° | Référence / question | Réponse de la cliente |
|---:|---|---|
| 28 | **F0 — Logo HD** | Oui — sera transmis |
| 29 | **F0b — Charte graphique** | Oui — charte existante |
| 30 | **F0c — Photos des produits** | Oui — sera transmis |
| 31 | **F0d — Liste des produits et prix** | Oui — sera transmis |
| 32 | **F0e — Descriptions des produits** | Oui — sera transmis |
| 33 | **F1 — Lien Instagram** | Meëra Kinks |
| 34 | **F1 — Lien TikTok** | Meërakinks |
| 35 | **F1 — Lien Facebook** | Meëra Kinks |
| 36 | **F2 — WhatsApp Business** | 0554122705 |
| 37 | **F3 — Numéro Wave** | 0554122705 |
| 38 | **F4 — Avis clients** | Oui — sera transmis |

### Documents annoncés par la cliente

La cliente indique que les éléments suivants seront transmis ou sont déjà disponibles :

- **Logo HD** — Oui, sera transmis.
- **Charte graphique** — Oui, charte existante.
- **Photos des produits** — Oui, seront transmises.
- **Liste des produits et prix** — Oui, sera transmise.
- **Descriptions des produits** — Oui, seront transmises.
- **Avis clients** — Oui, seront transmis.

### Arbitrage du 19 novembre 2026 (cahier 2.6)
| Point | Décision d'Aka | Où |
|---|---|---|
| 1. Acompte (B2) | À Abidjan seulement ; paiement intégral ailleurs ; la vendeuse expédie | D-23, RM-05, RM-06 |
| 2. Suivi des performances (E4) | Vercel Web Analytics + analytique maison ; pas de Google Analytics ; IP non enregistrée | D-22, P-57 |
| 3. Délais (C4) | Publiés comme **indicatifs**, selon la zone ; point de départ à confirmer | D-26, RM-47, P-56 |
| 4. Services de livraison (C5) | **Ouvert** : qui couvre quelle destination, et comment les frais se calculent | — |
| 5. Réseaux sociaux (F1) | **Ouvert** : liens complets à obtenir | — |
| 6. Catalogue (A1 à A6) | Variantes **intégrées** ; reste à voir les types d'options (question 28) et le contrôle à la réception des fichiers | D-24, P-53 |
| 7. Annulation (B4) | **Ouvert** : modalités de remboursement | — |
| Export des commandes (D6) | **Dans le MVP** | D-25, P-55 |
| Reçu ou facture ; public visé | **Reçu** ; **neutre** | D-27, D-28 |

### Points à arbitrer avant mise à jour des règles du projet *(liste d'origine, conservée pour l'historique)*

Les réponses ci-dessus constituent le retour de la cliente. Elles ne remplacent pas automatiquement les décisions techniques et règles déjà consignées dans le cahier des charges.

1. **Acompte de 2 000 FCFA — réponse B2 :** la cliente indique que l'acompte est fixe pour toutes les commandes. Le cahier actuel prévoit l'acompte de 2 000 FCFA pour les commandes à Abidjan et le paiement intégral avant expédition pour les commandes hors d'Abidjan et à l'international (notamment l'annexe B). Il faut confirmer si la réponse B2 signifie réellement 2 000 FCFA pour toute destination ou si elle concerne uniquement les commandes à Abidjan.
2. **Suivi des performances — réponse E4 :** la cliente demande l'adresse IP, le pays, le suivi des clics, Google Analytics et Search Console. Le cahier actuel prévoit une analytique propriétaire avec consentement, sans enregistrement de l'adresse IP (D-17, P-43 à P-45), et ne prévoit pas actuellement de dépendance obligatoire à Google Analytics. Il faut décider explicitement de la solution retenue et faire vérifier les obligations de confidentialité et de consentement avant toute collecte.
3. **Délais de livraison — réponse C4 :** les délais annoncés sont de 24 h à Abidjan, 72 h à l'intérieur du pays et de 5 à 15 jours à l'international. Ils devront être confirmés comme engagements publiables et intégrés aux textes communs du site, après clarification des conditions et éventuelles exceptions.
4. **Services de livraison — réponse C5 :** Licy Express, Yango, Zoliv Express et un livreur personnel sont cités. Il reste à préciser quels services couvrent quelles destinations et comment les frais sont calculés.
5. **Réseaux sociaux — réponses F1 :** la cliente a fourni des noms de comptes, pas des URL complètes. Les liens directs Instagram, TikTok et Facebook restent à obtenir ou à vérifier.
6. **Catalogue et contenus — réponses A1 à A6 et documents annoncés :** le catalogue annoncé comprend 180 produits et 6 catégories. Les variantes, promotions, photos, prix et descriptions devront être contrôlés à réception des fichiers ; les pourcentages de promotion ne sont pas encore disponibles.
7. **Annulation — réponse B4 :** la cliente indique que l'acompte est retourné et que le produit revient en stock. Les modalités opérationnelles du remboursement et les conditions d'annulation restent à préciser avant de les automatiser.

