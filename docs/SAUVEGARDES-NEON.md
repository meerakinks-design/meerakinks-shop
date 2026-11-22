# Sauvegardes Neon — vérifier, tester, restaurer

Ce document couvre le point « Sauvegardes Neon » du cahier §10.2 : **vérifier la fenêtre de restauration du plan** et **tester une restauration**. Ce sont des opérations dans la console Neon : elles n'ont **pas** été exécutées (aucun accès à ton compte Neon depuis l'environnement de développement). Le script de contrôle (`scripts/verify-restore.ts`) est testé pour sa logique de comparaison, mais n'a jamais tourné contre une vraie base.

Les chiffres de Neon ci-dessous viennent de sa documentation consultée le 20/11/2026 ([fenêtre d'historique](https://neon.com/docs/introduction/restore-window), [restauration instantanée](https://neon.com/docs/postgres/backup-restore/branch-restore), [vue d'ensemble](https://neon.com/docs/guides/backup-restore)). Les offres changent : **relis la page avant de t'y fier**.

## 1. Vérifier la fenêtre de restauration

Console Neon → ton projet → **Settings** → réglage « History window » (la doc l'appelle aussi « Instant restore »). Le réglage vaut pour toutes les branches du projet.

| Offre Neon | Fenêtre par défaut | Maximum |
| --- | --- | --- |
| Free | 6 heures | 6 heures (historique plafonné à 1 Go) |
| Launch | 1 jour | 7 jours |
| Scale | 1 jour | 30 jours |

Ce que ça veut dire pour la boutique : **sur l'offre Free, une erreur découverte le lendemain matin n'est plus restaurable** avec la restauration instantanée. Une fois la boutique ouverte aux commandes, c'est à décider avec la cliente : passer à une offre avec une fenêtre de plusieurs jours, et/ou ajouter la sauvegarde hors Neon de la section 4.

À noter dans le tableau de suivi (section 6) : l'offre, la fenêtre réglée, la date de vérification.

## 2. Tester une restauration sans rien risquer

La restauration instantanée (« Restore from history ») **écrase les données actuelles** de la branche et coupe les connexions le temps de l'opération ; Neon garde l'état d'avant dans une branche de secours nommée `<branche>_old_<horodatage>`. Elle ne fonctionne que sur une **branche racine** (la branche de production en général), pas sur une branche enfant. **Ne t'entraîne donc pas dessus sur la production.**

Le test sûr passe par un **instantané (snapshot)** restauré **dans une nouvelle branche**, qu'on contrôle puis qu'on supprime :

1. **Enregistrer l'état de la production** (lecture seule, compteurs et dates, aucune donnée personnelle) :
   ```bash
   npm run db:verify-restore -- --url "<URL de connexion de la production>" --save etat-avant.json
   ```
2. Dans la console Neon, sur la branche de production : **créer un instantané manuel** (page *Backup & Restore*). Un instantané manuel est possible sur toutes les offres (limite : 1 sur Free).
3. **Restaurer cet instantané en plusieurs étapes**, ce qui crée une **nouvelle branche** à inspecter sans toucher à la production. Récupère l'URL de connexion de cette nouvelle branche.
4. **Comparer** :
   ```bash
   npm run db:verify-restore -- --url "<URL de la branche restaurée>" --compare etat-avant.json
   ```
   Attendu : « Identique » (si personne n'a commandé entre l'étape 1 et l'instantané ; sinon des différences s'expliquent par ces commandes, à vérifier à la main).
5. **Supprimer la branche de test** (et l'instantané s'il n'est plus utile, ce qui libère l'unique place de l'offre Free).
6. Noter le résultat dans le tableau de suivi.

Pour vérifier que l'historique « minute par minute » existe bien, tu peux aussi utiliser **Time Travel Assist** (requêtes en lecture seule à un instant passé, dans la fenêtre) : par exemple `SELECT COUNT(*) FROM "Order";` à une heure d'hier. Rien n'est modifié.

Si tu veux t'entraîner à une vraie restauration instantanée de bout en bout, fais-le dans un **projet Neon séparé et jetable** (recopié depuis la production avec `pg_dump`/`pg_restore`, section 4), jamais sur la production.

## 3. En cas d'incident réel (données effacées ou corrompues)

1. **Arrêter l'écriture** si possible (la commande en ligne s'éteint avec `NEXT_PUBLIC_CHECKOUT_ENABLED` vide puis un redéploiement) pour ne pas aggraver.
2. **Trouver l'heure juste avant l'incident** avec Time Travel Assist (rester dans la fenêtre !).
3. **Restore from history** sur la branche de production à cette heure. L'URL de connexion ne change pas : le site se reconnecte tout seul quand l'opération est finie.
4. **Contrôler** avec `scripts/verify-restore.ts` : compteurs et dernière commande cohérents avec ce que tu attends.
5. Les commandes passées **entre l'heure restaurée et l'incident** ne sont plus dans la base : elles sont dans la branche de secours `<branche>_old_<horodatage>`. Récupère-les à la main (ou rappelle les clientes par WhatsApp) avant de supprimer cette branche.
6. **Effacements sur demande** : si une demande d'effacement (page *Données clients*) date d'après l'heure restaurée, la fiche du client **réapparaît avec ses données**. Refais l'effacement (le numéro est dans la conversation de la demande). Note donc la date de chaque demande d'effacement, hors de la base.

## 4. Sauvegarde hors Neon (complément recommandé)

La restauration Neon dépend du compte Neon. Une copie indépendante protège aussi d'une erreur de compte ou de projet. Avec les outils PostgreSQL (`pg_dump`, `pg_restore`) et l'URL **directe** (`DIRECT_URL`, pas l'URL poolée) :

```bash
pg_dump "$DIRECT_URL" --format=custom --file="boutique-$(date +%F).dump"
# restauration dans une base vide :
pg_restore --no-owner --dbname="<URL de la base vide>" "boutique-AAAA-MM-JJ.dump"
```

Cette commande n'est **pas** testée ici. Deux précautions :
- le fichier contient les **données personnelles des clients** : chiffre-le, ne l'envoie pas par WhatsApp ni par email, garde-le sur un support protégé ;
- **durée de conservation des copies** : un client effacé sur demande reste présent dans une copie plus ancienne. Garde les copies peu de temps (par exemple 30 jours, à décider) et dis-le dans la politique de confidentialité si tu en fais.

## 5. Ce qui n'est pas couvert

- Les **images** des produits sont sur Cloudinary, pas dans la base : elles ne sont pas restaurées par Neon.
- Les **emails déjà envoyés** par Resend et les **conversations WhatsApp** ne sont pas dans la base.

## 6. Tableau de suivi (à remplir)

| Date | Offre Neon | Fenêtre réglée | Test fait (oui/non) | Résultat | Par qui |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |
