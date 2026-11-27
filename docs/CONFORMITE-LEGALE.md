# Conformité légale — textes de la boutique (v0.11)

> **Ceci n'est pas un avis juridique.** Les textes sont des propositions, rédigées à partir de ce que le site fait réellement
> (cahier v2.9), de la direction éditoriale (« Textes du site » V1) et du Juriste AKATech v8 (Module 8, registre Côte d'Ivoire).
> Ils restent **provisoires** (bandeau visible, pages non indexées) tant que `PRIVACY_TEXTS_VALIDATED` vaut `false` dans
> `src/content/legal-status.ts`. Le passer à `true` seulement après validation par la cliente ET par un professionnel.

Légende : ✅ vérifié dans une source lue · ⚠️ source non officielle ou à reconfirmer · ❓ non trouvé, à poser à un juriste ou à l'ARTCI · 🟡 choix de la cliente.

## 1. Où sont les textes

| Page | Fichier du texte | Ce qui est dynamique (jamais écrit à la main) |
|---|---|---|
| `/cgv` | `src/content/legal-pages.ts` (`cgvSections`) | acompte, règles de paiement (`livraison.ts`), délais et textes de livraison (écran Livraison) |
| `/cgu` | `src/content/legal-pages.ts` (`cguSections`) | nom de la boutique |
| `/mentions-legales` | `src/content/legal-pages.ts` (`legalNoticeSections`) | identité légale et adresse (paramètres), `legal-details.ts` |
| `/politique-de-confidentialite` | `src/content/privacy.ts` | durées (`retention.ts`), mesure maison selon `NEXT_PUBLIC_HOME_ANALYTICS_ENABLED` (active sauf `=0`) |
| `/cookies` | `src/content/cookies.ts` | noms et durées des cookies (constantes du code) |

Règle du projet (RM-42) : une information absente n'est **pas affichée** et la page l'annonce sans texte à trous. Les tests
(`tests/unit/legal-pages.test.ts`, `legal-content.test.ts`) interdisent crochets, « à compléter », tutoiement, promesse de
garantie de délai, retour ou remboursement inventés.

## 2. À fournir par la cliente avant la mise en ligne (bloquant)

| # | Information | Où la renseigner | Pourquoi |
|---|---|---|---|
| 1 | Identité légale du vendeur (nom ou raison sociale) et adresse | colonnes `legalName` et `address` de `StoreSettings` (écran Paramètres à venir : en attendant, seed ou SQL) | loi 2013-546, art. 5 ✅ |
| 2 | N° d'immatriculation (RCCM) et, si la forme en a un, capital | `src/content/legal-details.ts` | idem ✅ |
| 3 | Identifiant fiscal si la boutique est assujettie à la TVA | idem | idem ✅ |
| 4 | Directeur ou responsable de la publication | idem | usage des mentions légales ⚠️ |
| 5 | Statut du vendeur (particulier, entreprise individuelle, société) | décide 1 à 4 | le Juriste v8 rappelle de le fixer avant tout |
| 6 | Numéro WhatsApp : confirmer **+225 05 54 12 27 05** (MD « Textes du site » §12) | `StoreSettings.sellerWhatsApp` | contact affiché partout |

## 3. Décisions de la vendeuse (🟡) — le texte ne les invente pas

| Sujet | État dans les CGV | À décider |
|---|---|---|
| Retours et échanges | non traité : « confirmées par la vendeuse selon la situation » | accepte-t-elle les retours ? sous quel délai ? produits ouverts ? |
| Acompte de 2 000 FCFA : remboursable ? | idem | cas d'annulation par la cliente / par la boutique |
| Point de départ du délai de livraison | « délai indicatif » sans point de départ (question 27 du cahier) | à compter de la commande, de l'acompte, de la confirmation ? À inscrire dans le champ « Précision sur les délais » de l'écran Livraison |
| Régime de taxe affiché sur les prix | « prix en FCFA tels qu'affichés » | TVA ou non ? loi 2013-546, art. 6 : « préciser les taxes » ✅ |
| Droits sur les photos, le logo et le nom | « sauf mention contraire… accord de leurs titulaires » | la boutique détient-elle les droits ? marque déposée ? |

## 4. Points à faire confirmer par un juriste ivoirien ou l'ARTCI (❓ / ⚠️)

1. **Droit de rétractation / retour** pour une vente à distance de cosmétiques : la loi ivoirienne sur la consommation n'a pas été lue ici ❓. Aucun délai n'est promis dans les textes.
2. **Juridiction compétente** : le texte dit « juridictions compétentes » (le MD demande une validation juridique) ; droit ivoirien et actes uniformes OHADA affirmés d'après loi 2013-546, art. 3, 8 et 9 ✅.
3. **Déclaration ou autorisation ARTCI** du traitement (commandes, clients, mesure d'audience) : obligatoire avant tout traitement ✅ (loi 2013-450, chap. III) ; le régime exact (déclaration, norme simplifiée, autorisation) reste ❓. **Aucun texte n'affirme que cette formalité est faite.**
4. **Transfert hors Côte d'Ivoire** (Vercel, Neon, Resend, Cloudinary, WhatsApp) : autorisation préalable de l'ARTCI à prévoir ⚠️ ; les accords de traitement des prestataires reposent sur le RGPD et ne la remplacent pas. Le texte dit seulement que les données peuvent quitter le pays et que les prestataires publient leurs engagements.
5. **Délais de réponse aux droits et de notification d'incident** : non trouvés ❓ → « dans les meilleurs délais », aucun chiffre promis.
6. **Mesure d'audience et consentement** : la loi 2013-450 ne traite pas expressément des cookies ✅ ; la boutique demande quand même l'accord avant toute mesure (meilleure pratique), sans le présenter comme une obligation légale.

## 5. Faits relevés (source et statut)

| Affirmation dans les textes | Source | Statut |
|---|---|---|
| Identité, adresse, e-mail, téléphone, RCCM, capital, identifiant fiscal à afficher | loi 2013-546, art. 5 | ✅ |
| Prix clair avec précision sur les taxes | art. 6 | ✅ |
| Conditions conservables et reproductibles ; étapes, correction d'erreurs, langue, archivage ; confirmation et accusé de réception | art. 21 et 22 | ✅ |
| Loi ivoirienne applicable si une partie est établie en Côte d'Ivoire ; actes uniformes OHADA | art. 3, 8, 9 | ✅ |
| Autorité de protection des données : ARTCI, infos-apdp@artci.ci ; la personne peut la saisir | registre Juriste v8 §2 et §6 | ✅ |
| Hébergeur : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis | plusieurs mentions légales de sites hébergés par Vercel (2026) et registre ARIN, lus le 24 novembre 2026 | ⚠️ à reconfirmer sur vercel.com/legal avant validation |
| Vercel, Neon, Cloudinary publient accords de traitement et clauses types | registre Juriste v8 §8 | ✅ / ⚠️ (plan utilisé à confirmer) |
| Délais 24 h / 72 h / 5 à 15 jours, indicatifs | réponse C4 de la cliente, cahier D-26, RM-47 | ✅ client |
| Acompte 2 000 FCFA à Abidjan, paiement intégral ailleurs, par Wave | cahier annexe B (source unique `livraison.ts`) | ✅ client |

## 6. Ce que le site fait réellement (et que les textes décrivent)

- Aucun numéro de carte bancaire collecté. Paiement par Wave, hors du site.
- Données de commande conservées 24 mois après la dernière commande, puis anonymisées (`CUSTOMER_RETENTION_MONTHS`).
- Empreinte (pas la valeur) de l'IP et du téléphone pour limiter les abus, supprimée au plus tard après `RATE_LIMIT_FINGERPRINT_MAX_DAYS`.
- Mesure d'audience maison (active par défaut ; coupée seulement si `NEXT_PUBLIC_HOME_ANALYTICS_ENABLED=0`) : seulement après « Accepter » ; cookie `boutique_vid` 90 jours ; repère d'onglet `boutique_arrival` ; détail supprimé après 90 jours ; refus = effacement dans le navigateur **et** sur le serveur ; jamais lié à une commande ni à un client ; aucune IP ni user-agent conservés.
- Alerte email « Nouvelle visite » : une par navigateur, plafonnée à 40 par jour, sans IP ni identité.
- Vercel Web Analytics reste actif avec le même consentement.

## 7. Avant de passer `PRIVACY_TEXTS_VALIDATED` à `true`

1. Renseigner les points du §2 et trancher le §3.
2. Faire relire CGV, CGU, mentions légales, confidentialité et cookies par un professionnel (§4).
3. Reconfirmer l'adresse de l'hébergeur (§5).
4. Vérifier le catalogue réel (fourni par la cliente) : les textes n'en dépendent pas, mais les fiches produits oui.
5. Relancer `npm test` : les tests de contenu protègent contre l'ajout de promesses non tenues.
