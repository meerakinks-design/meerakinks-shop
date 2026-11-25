# Mini-jeu « Cosmetic Smash » : commandes en icônes (25 novembre 2026)

## Ce qui change
- **Barre de jeu** : score et temps à gauche (étiquette petite, chiffre grand), trois boutons ronds de 44 px à droite : **Pause / Reprendre**, **Recommencer**, **Son**. Plus de texte dans les boutons : tout tient sur une ligne dès 350 px de large (en dessous, les boutons passent sous le score, centrés).
- **Pause / Reprendre** est le seul bouton plein (commande principale). Il change d'icône (pause ⇄ lecture). En pause, le plateau est voilé avec un grand bouton lecture : toucher le plateau reprend la partie.
- **Son** : icône haut-parleur ondulé (actif) ou barré (coupé). L'état est annoncé aux lecteurs d'écran (« Son coupé » / « Son activé »).
- **Temps** : passe à l'orange pendant les 5 dernières secondes.
- **Fin de partie** : voile brun profond, score final en grand, texte validé inchangé, bouton « Rejouer » avec icône. Le focus reste sur « Rejouer » (clavier).
- **Texte d'introduction** (« Envie d'une pause ludique ? … ») : affiché tant que le jeu n'est pas lancé, retiré une fois le plateau ouvert (plus de place pour jouer sur téléphone).

## Accessibilité
Chaque bouton a un `aria-label` (et une infobulle `title` au survol). Les icônes sont décoratives (`aria-hidden`). Noms exacts utilisés par `e2e/game-check.mjs` : « Pause », « Reprendre », « Recommencer », « Couper le son », « Activer le son », « Rejouer ».

## 🟡 Textes à valider (`src/content/landing.ts`, bloc `smash`)
| Clé | Texte | Usage |
|---|---|---|
| `muteAction` | Couper le son | nom du bouton quand le son est actif |
| `unmuteAction` | Activer le son | nom du bouton quand le son est coupé |
| `controls` | Commandes du jeu | nom du groupe de boutons (lecteurs d'écran) |

`soundOn` (« Son activé ») et `soundOff` (« Son coupé ») servent désormais aux annonces vocales.

## Fichiers touchés
Nouveau : `src/components/shop/SmashIcons.tsx`.
Modifiés : `src/components/shop/SmashGame.tsx`, `src/styles/smash.css`, `src/content/landing.ts`, `e2e/game-check.mjs` (six contrôles ajoutés).
