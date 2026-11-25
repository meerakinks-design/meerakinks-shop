# Pots 3D de Cosmetic Smash

Dix fichiers `.glb` : pour chaque contenant, la forme **entière** (`<nom>.glb`) et la forme **découpée** (`<nom>-cut.glb` : deux moitiés et le disque de crème).

| Fichier | Contenant dans le jeu | Remarque |
|---|---|---|
| `jar` | pot | texturé (couleur 512 px, JPEG) |
| `pump` | flacon pompe | texturé (couleur 512 px, JPEG) |
| `spray` | « compte-gouttes » du moteur | le jeu 2D dessine un compte-gouttes, le jeu 3D un flacon spray |
| `tube` | tube | couleurs par matériau |
| `bottle` | flacon | couleurs par matériau |

## Comment ils sont produits

Les fichiers d'origine (livrés par la cliente / l'équipe) ne sont **pas** modifiés. `tools/optimize-smash-glb.py` les prépare pour le web :

```
python3 tools/optimize-smash-glb.py <dossier entiers> <dossier découpés> public/assets/smash
```

- textures « métal/rugosité » et « normales » (2048 px, ~2 Mo chacune) retirées, texture de couleur ramenée à 512 px en JPEG : 5 Mo → 1,3 Mo ;
- couleurs des pièces découpées des contenants procéduraux (`bottle`, `spray`, `tube`) restituées depuis la forme entière ;
- contenants procéduraux (modélisés « Z vers le haut ») redressés par une rotation de −90° autour de X sur leurs nœuds.

## Comment le jeu les utilise

`src/lib/smash/glb.ts` lit le fichier, `gl3d.ts` le dessine en WebGL (sans bibliothèque), `pose.ts` règle l'animation de coupe. Les fichiers sont servis par le site lui-même (`connect-src 'self'`) ; si l'un manque ou si WebGL est indisponible, le jeu garde ses pots dessinés en 2D.

Origine et licence des modèles : à documenter par l'équipe (les modèles texturés `jar` et `pump` viennent d'un générateur 3D : vérifier ses conditions d'utilisation commerciale).
