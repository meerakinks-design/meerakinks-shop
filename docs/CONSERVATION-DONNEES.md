# Conservation des données clients et suppression sur demande

Point du cahier §10.2 « Politique de conservation des données clients et procédure de suppression sur demande (une commande figée ne doit pas casser l'historique) ».

> ⚠️ La **durée** (36 mois après la dernière commande) est une **valeur proposée 🟡**, pas une règle juridique : la durée de conservation est une question ❓ ouverte du cahier. Ce document n'est pas un avis juridique ; à faire valider par la cliente et un professionnel (cahier §14.2).

## Principe : on anonymise, on ne supprime pas

Une commande figée garde ses montants, ses articles et ses dates : la comptabilité et l'historique ne cassent jamais. L'effacement ne retire que ce qui permet d'identifier une personne.

| Donnée | Après effacement |
| --- | --- |
| Fiche client : prénom, nom | « Client » / « anonymisé » |
| Fiche client : téléphone | `anon-<identifiant de la fiche>` (unique, ne correspond à aucun numéro) |
| Fiche client : email | vide |
| Commande : adresse de livraison | « Adresse supprimée » |
| Commande : message du client, note interne | vides |
| Reçu (contenu figé) : client et adresse | remplacés ; montants, lignes et dates conservés |
| Emails adressés au client (confirmation, changement de statut) | supprimés |
| Paiements et historique de statut : notes libres | vides (le motif d'annulation d'un paiement reste) |
| **Conservé** : commune/ville/pays, zone, montants, articles, dates, statuts, références de commande | oui |

Les commandes ne sont **jamais supprimées**. Seule une fiche sans commande ouverte peut être effacée : une commande qui n'est ni **livrée** ni **annulée** bloque l'effacement (409, message clair).

## 1. Suppression sur demande (propriétaire)

Back-office → **Données clients** (visible du compte propriétaire seulement) : saisir le numéro donné en commandant, cocher la confirmation, valider. L'opération est atomique (tout ou rien), répétable sans effet (une fiche déjà effacée n'est pas retouchée) et journalisée sans donnée personnelle (`CUSTOMER_ANONYMIZED` : identifiant de fiche et nombre de commandes).

API : `POST /api/v1/admin/customers/anonymize` avec `{ "phone": "...", "phoneDialCode": "225", "confirm": true }`. Sans `confirm: true`, rien n'est effacé.

## 2. Effacement automatique (fermé par défaut)

Une tâche quotidienne (`/api/cron/retention`, 03:00 UTC, déclarée dans `vercel.json`) :
- **toujours** : supprime les empreintes anti-abus expirées (adresse IP et téléphone hachés) ;
- **seulement si `RETENTION_PURGE_ENABLED=1`** : anonymise par lot de 50 les clients dont la **dernière commande** a plus de `CUSTOMER_RETENTION_MONTHS` mois (36) et qui n'ont **aucune commande ouverte**. Les clients restants sont traités le lendemain.

Pour **activer** : valider la durée avec la cliente et un professionnel, ajuster `CUSTOMER_RETENTION_MONTHS` dans `src/lib/constants/retention.ts` si besoin (la politique de confidentialité et la page *Données clients* lisent la même valeur), puis définir `RETENTION_PURGE_ENABLED=1` sur Vercel et redéployer.

Lancement à la main (par exemple pour un premier essai) :
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<ton-site>/api/cron/retention
```
La réponse indique le nombre de clients anonymisés, ignorés, en échec et restants. Chaque passage qui efface quelque chose est journalisé (`RETENTION_PURGE`).

Vercel (offre Hobby) : la tâche s'exécute une fois par jour, avec une précision d'environ ±59 minutes.

## 3. Ce que cette procédure ne couvre pas

- **Sauvegardes** : une copie antérieure contient encore les données effacées. Voir `docs/SAUVEGARDES-NEON.md` (durée de conservation des copies, effacements à refaire après une restauration).
- **WhatsApp** : les conversations avec la cliente sont sur le téléphone de la vendeuse, hors du site.
- **Resend** : le prestataire d'emails garde ses propres journaux d'envoi, selon son offre. À vérifier dans son tableau de bord.
- **Hébergeur** : les journaux techniques de Vercel suivent sa propre politique.
- **Reçus déjà téléchargés** par le client : copies sur son appareil.

## 4. À faire valider (professionnel)

Durée de conservation ; base juridique et obligations comptables locales sur les pièces de vente ; déclaration éventuelle auprès de l'autorité de protection des données ; texte de la politique de confidentialité (`src/content/privacy.ts`, marquée « provisoire » tant que `PRIVACY_TEXTS_VALIDATED` vaut `false` dans `src/content/legal-status.ts`).
