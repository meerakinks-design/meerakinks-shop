# Landing page — Structure & rédaction commerciale
## Boutique e-commerce de cosmétiques et accessoires

> **Version 1.3** — décisions du 19 novembre (cahier des charges **2.6**) : formulations **neutres** (D-28), **délais indicatifs** dans la FAQ (D-26), **variantes de produit** et nouveau comportement du « + » (D-24), effet « spaghetti » = **code de Rabbit Shop relu** (D-29), Vercel Web Analytics dans la page cookies (D-22). Les textes des versions précédentes sont **conservés tels quels**, sauf ceux marqués **[Modifié v1.3]** ; tout ce qui est ajouté est marqué **[Ajout v1.3]**.

> **Version 1.2** — complétée avec la **structure de la fiche produit**, du **panier en feuille** et du **reçu de commande en ticket** (code v0.8), l'**effet typographique « spaghetti »** sur les titres et les textes, les **pots réalistes** du mini-jeu, la **bannière cookies** (analytique avec consentement) et le lien **Gérer mes cookies**. Alignée sur le cahier des charges **v2.5**. Les textes des versions 1.0 et 1.1 sont **conservés tels quels** ; tout ce qui est ajouté est marqué **[Ajout v1.2]**.

> **Version 1.1** — complétée avec les **adresses et ancres**, le **panier du header** (nombre d'articles et montant), le comportement de la section **Avis** et les éléments qui manquaient. Alignée sur le cahier des charges v2.1.
> Les textes de la version 1.0 sont **conservés tels quels** ; tout ce qui est ajouté est marqué **[Ajout v1.1]**.

> **Objectif :** transformer les visiteurs en clients en présentant clairement l'univers de la marque, en donnant envie de découvrir les produits et en rassurant sur la commande, le paiement et la livraison.
>
> **À personnaliser avant publication :** remplacer `[NOM DE LA BOUTIQUE]`, `[CONTACT WHATSAPP]`, `[LIEN INSTAGRAM]` et les autres éléments entre crochets par les informations confirmées par la cliente. Les descriptions de produits, les avis et les engagements doivent correspondre à la réalité.

---

# 0. Adresses et ancres — table de référence [Ajout v1.1]

Chaque lien de ce document pointe vers l'une de ces destinations. Le panier, la commande et « Notre histoire » sont des **modals** (pas de page) ; les autres sections de la landing sont des **ancres**.

| Élément | Destination | Type |
|---|---|---|
| Logo | `/` | page |
| Boutique (menu, « Découvrir la boutique », « Voir toute la boutique », « Voir la boutique ») | `/boutique` | page |
| Collections (menu) | `/#collections` | ancre (depuis une autre page, ramène à la landing) |
| Carte de collection | `/categorie/[slug]` — ex. `/categorie/soins-capillaires` | page |
| « Voir les offres » | `/boutique?filtre=offres` | page filtrée |
| « Voir les nouveautés » | `/boutique?tri=nouveautes` | page triée |
| « Voir nos best-sellers » | `/#best-sellers` | ancre |
| Carte produit (photo ou nom), « Découvrir le produit » | `/produit/[slug]` — ex. `/produit/beurre-de-karite-naturel` | page |
| Notre histoire | `#notre-histoire` | **modal** |
| Panier (icône du header) | `#panier` | **modal** |
| Passer commande (depuis le panier) | `#commande` | **modal** |
| Confirmation de commande | `/commande/confirmation?ref=CMD-…` | page |
| **[Ajout v1.2]** Gérer mes cookies (footer, lien de la bannière) | `/cookies` | page |
| **[Ajout v1.2]** Assistant IA (bouton flottant) | `#assistant` | **modal** |
| Avis · Instagram · FAQ · Contact | `/#avis` · `/#instagram` · `/#faq` · `/#contact` | ancres |
| « Informations de paiement et livraison » (footer) | `/#faq` | ancre |
| WhatsApp (contact, FAQ, footer) | `https://wa.me/[NUMÉRO]?text=…` (message prérempli) | lien externe |
| Pages légales | `/cgv` · `/cgu` · `/mentions-legales` · `/politique-de-confidentialite` | pages |

**Règles.**
- Les identifiants d'ancre sont en minuscules avec des tirets : `collections`, `best-sellers`, `focus-produit`, `pourquoi-nous`, `avis`, `instagram`, `faq`, `contact`.
- Les modals utilisent une ancre simple (`#panier`, `#commande`, `#notre-histoire`) : le bouton **Retour** du téléphone ferme le modal au lieu de quitter le site.
- `/boutique` accepte `categorie`, `filtre=offres`, `tri=nouveautes|prix-croissant|prix-decroissant` et `q` (recherche). Ces variantes ont pour adresse canonique `/boutique`, pour éviter le contenu dupliqué.
- Les slugs de catégorie et de produit sont ceux du back-office (minuscules, sans accents, uniques). Si un slug change, l'ancien redirige.

---

# 1. Header — Navigation

**Logo :** `[NOM DE LA BOUTIQUE]` → `/`

**Liens de navigation :**
- Boutique → `/boutique`
- Collections → `/#collections`
- Notre histoire → modal `#notre-histoire`
- Contact → `/#contact`

**Action principale :**
- `Voir la boutique` → `/boutique` *(ordinateur ; masquée sur mobile faute de place)*

**Panier — [Ajout v1.1, décision D-11] :**
- Icône panier + libellé `Mon panier` *(ordinateur)* + **badge du nombre d'articles** (somme des quantités) + **montant total** en FCFA, par exemple `3 · 15 000 FCFA`.
- **Panier vide** : pas de montant ; le badge est masqué ou affiche 0.
- Le montant du header est une **estimation** (prix chargés avec la page). Le **total officiel** est calculé par le serveur à l'ouverture du panier.
- **Mobile** : icône et badge du nombre seulement ; le montant s'affiche dans le panier.
- Un clic ouvre le modal `#panier`. Le bouton Retour du téléphone le ferme.
- **Accessibilité** : le bouton a un nom accessible complet (« Panier : 3 articles, 15 000 FCFA ») et chaque mise à jour est annoncée aux lecteurs d'écran. Le badge a une petite animation à chaque ajout, désactivée si l'utilisateur demande moins de mouvement.
- Le panier est présent **sur toutes les pages publiques** (landing, boutique, catégorie, fiche produit).

**Menu mobile :**
- Boutique
- Collections
- Notre histoire
- Contact
- Mon panier

> **[Ajout v1.1]** Sur mobile, **l'icône du panier reste visible dans la barre**, pas seulement dans le menu : on ne doit pas avoir à ouvrir le menu pour voir son panier. C'est un écart volontaire avec la version 1.0, où le panier n'apparaissait que dans le menu.

**Comportement [Ajout v1.1] :**
- Le header reste visible, ou se masque en descendant et réapparaît en remontant. Il ne cache jamais l'élément qui a le focus au clavier.
- Un lien d'évitement « Aller au contenu » est le premier élément focalisable.
- La page courante est signalée aux lecteurs d'écran.
- Les liens vers une ancre de la landing (`/#collections`, `/#contact`) fonctionnent depuis n'importe quelle page.

**Format mobile — [Ajout v1.2] (code v0.8) :**
- **Logo à gauche** ; à droite, l'**icône du panier** (avec le badge du nombre d'articles), puis le **menu hamburger**, en boutons carrés arrondis à bordure franche. Le hamburger devient une croix quand le menu est ouvert.
- Le menu s'ouvre en panneau sous la barre : Boutique · Collections · Notre histoire · Contact · Mon panier.
- Tant que le fichier du logo n'est pas fourni (§17), le **logo est le nom de la boutique en texte**.
- Sur ordinateur : navigation au centre, `Voir la boutique`, et panier avec son libellé et son montant.

---

# 2. Hero — Première impression

**Surtitre :**
`VOTRE BEAUTÉ, VOTRE MOMENT`

**Titre principal :**
# Et si prendre soin de vous devenait votre plus beau rituel ?

**Texte :**
Découvrez une sélection de produits de beauté et d'accessoires choisis pour accompagner vos envies, vos habitudes et vos petits moments rien qu'à vous.

**CTA principal :**
`Découvrir la boutique`

**CTA secondaire :**
`Voir nos best-sellers`

**Micro-réassurance :**
`Quelques clics pour choisir. Une commande simple pour vous faire plaisir.`

**Direction visuelle :**
Une composition photographique forte mettant en scène plusieurs produits de la boutique. Le visuel doit refléter l'identité réelle de la marque et donner immédiatement envie d'explorer le catalogue.

**Liens [Ajout v1.1] :** CTA principal → `/boutique` · CTA secondaire → `/#best-sellers`.
**Image du hero [Ajout v1.1] :** chargée en priorité (c'est le premier élément visible), avec un texte alternatif et des dimensions déclarées. Pas de vidéo qui se lance toute seule.

---

# 3. Marquee — Bandeau de marque

**Expressions à faire défiler :**

`BEAUTÉ • SOIN • ÉCLAT • CONFIANCE • STYLE • VOTRE RITUEL •`

**Variante de texte :**

`PRENEZ DU TEMPS POUR VOUS • CHOISISSEZ VOS ESSENTIELS • CÉLÉBREZ VOTRE BEAUTÉ •`

Le bandeau sert de respiration visuelle et installe l'univers de la boutique. L'animation doit rester lente et discrète.

**Accessibilité [Ajout v1.1] :** le bandeau est purement décoratif (masqué aux lecteurs d'écran), il se met en pause au survol et au focus, et il s'arrête si l'utilisateur demande moins de mouvement.

---

# 4. Collections — Explorer par envie

**Surtitre :**
`TROUVEZ VOTRE BONHEUR`

**Titre :**
# Vos essentiels, réunis au même endroit.

**Texte :**
Que vous cherchiez à prendre soin de vous, à compléter votre routine ou à ajouter une touche de style, explorez nos différentes collections et trouvez les produits qui vous correspondent.

**Cartes de collections — exemples à confirmer avec le catalogue :**

### Soins corporels
`Accordez à votre peau l'attention qu'elle mérite avec notre sélection de soins corporels.`

CTA : `Explorer la collection`

### Soins capillaires
`Découvrez des essentiels pour accompagner vos gestes beauté et prendre soin de vos cheveux.`

CTA : `Explorer la collection`

### Accessoires
`Les petits détails qui complètent votre routine et apportent une touche de style.`

CTA : `Explorer la collection`

### Offres & nouveautés
`Retrouvez les nouveautés et les offres disponibles en boutique.`

CTA : `Voir les offres`

> Ne conserver que les catégories réellement présentes et actives dans le catalogue. Les noms et descriptions doivent être adaptés aux produits effectivement vendus.

**Liens et données [Ajout v1.1] :**
- Chaque carte mène à `/categorie/[slug]` (ex. `/categorie/soins-corporels`).
- Les cartes viennent du **catalogue** : catégories actives qui ont au moins un produit publié, dans l'ordre défini en back-office, avec leur couleur. Rien n'est écrit en dur dans la page.
- **« Offres & nouveautés » n'est pas une catégorie** : un produit n'appartient qu'à une seule catégorie. C'est un raccourci vers `/boutique?filtre=offres` (produits ayant un prix promotionnel) et `/boutique?tri=nouveautes` (produits récemment publiés).
- Chaque collection reprend la couleur définie pour sa catégorie dans le back-office.

---

# 5. Best-sellers — Les produits à découvrir

**Surtitre :**
`ILS MÉRITENT VOTRE ATTENTION`

**Titre :**
# Vos prochains coups de cœur sont peut-être ici.

**Texte :**
Découvrez une sélection de produits à ne pas manquer. Prenez le temps de parcourir leurs détails, de comparer et de choisir ceux qui vous font envie.

**Éléments des cartes produits :**
- Photo du produit
- Nom du produit
- Prix en FCFA
- Prix promotionnel barré, uniquement lorsqu'une promotion existe
- Badge « Nouveau » ou « Best-seller » uniquement si l'information est justifiée
- Bouton `Ajouter au panier`
- Accès à la fiche produit

**CTA de section :**
`Voir toute la boutique`

**Microcopie après ajout :**
`Ajouté à votre panier`

**Données et liens [Ajout v1.1] :**
- Produits affichés : ceux cochés **« mis en avant »** dans le back-office, dans l'ordre d'affichage (8 maximum). S'il n'y en a aucun, les produits publiés les plus récents.
- **Badges** : « Nouveau » est **calculé** (publié depuis 30 jours ou moins) ; un prix promotionnel s'affiche barré ; **aucun badge « Best-seller » tant qu'il n'y a pas de ventes réelles qui le justifient**.
- Le bouton `Ajouter au panier` a le comportement défini au cahier des charges (§4.2) : sur écran tactile un « + » toujours visible, sur ordinateur au survol et au clavier. Produit épuisé : bouton désactivé. **[Modifié v1.3]** Produit à plusieurs variantes : le « + » ouvre une petite feuille de choix de l'option (`Choisissez une option`, pastilles avec leur prix, quantité, `Ajouter au panier`, lien `Voir la fiche`) ; le prix s'affiche `À partir de …` si les prix des variantes diffèrent.
- Après un ajout, `Ajouté à votre panier` est annoncé aux lecteurs d'écran et le badge du header se met à jour. Le panier ne s'ouvre pas tout seul.
- `Voir toute la boutique` → `/boutique`.

---

# 6. Notre histoire — L'univers de la marque

> Cette section ouvre une fenêtre modale. Le contenu doit être présent dans le HTML dès le chargement et raconter l'histoire réelle de la boutique.

**Surtitre :**
`DERRIÈRE LA BOUTIQUE`

**Titre :**
# Une boutique pensée pour vos envies et vos moments de soin.

**Texte d'introduction :**
[NOM DE LA BOUTIQUE] est née d'une envie simple : vous proposer un espace où découvrir des produits de beauté et des accessoires qui trouvent naturellement leur place dans votre quotidien.

À travers notre sélection, nous souhaitons vous aider à découvrir vos essentiels, à composer votre routine et à vous faire plaisir en toute simplicité.

**Bloc — Notre vision :**
Faire de chaque visite une découverte et de chaque commande une expérience simple, claire et agréable.

**Bloc — Notre engagement :**
Vous présenter les produits avec des informations utiles, vous accompagner dans votre commande et rester disponibles pour répondre à vos questions.

**CTA :**
`Découvrir la boutique`

> Ajouter ici les véritables éléments de l'histoire de la fondatrice, les valeurs et les engagements confirmés. Ne pas inventer une date de création, une origine, une expertise ou une promesse produit.

**Sur la landing [Ajout v1.1] :** un bloc d'aperçu (surtitre, titre, premières lignes) avec un bouton `Lire notre histoire` qui ouvre le modal `#notre-histoire`. Le contenu complet est dans le HTML dès le chargement (pour l'indexation) et masqué jusqu'à l'ouverture. À la fermeture, le focus revient au bouton d'origine ; le CTA `Découvrir la boutique` ferme le modal et mène à `/boutique`.

---

# 7. Focus produit — La sélection du moment

**Surtitre :**
`LE PRODUIT À L'HONNEUR`

**Titre :**
# Un essentiel qui mérite sa place dans votre routine.

**Texte :**
Découvrez `[NOM DU PRODUIT]`, présenté dans ses détails pour vous aider à savoir s'il correspond à vos envies.

**Informations à afficher :**
- `[NOM DU PRODUIT]`
- `[PRIX EN FCFA]`
- `[DESCRIPTION COURTE ET VÉRIFIÉE]`
- `[CARACTÉRISTIQUES / COMPOSITION, SI DISPONIBLES]`
- `[MODE D'UTILISATION, SI PERTINENT ET FOURNI]`

**CTA principal :**
`Découvrir le produit`

**CTA secondaire :**
`Ajouter au panier`

> Le produit mis en avant, son prix, ses caractéristiques et son mode d'utilisation doivent provenir des informations réelles du catalogue. Éviter les promesses médicales ou les résultats garantis.

**Données et liens [Ajout v1.1] :**
- Le produit mis en avant est **choisi dans les paramètres** du back-office. S'il n'est pas choisi (ou s'il n'est plus publié), la section **n'est pas affichée**.
- `Découvrir le produit` → `/produit/[slug]`.
- `Ajouter au panier` ajoute 1 exemplaire avec le même retour visuel que les cartes ; **[Modifié v1.3]** si le produit a plusieurs variantes, ce bouton ouvre la même feuille de choix de l'option.

---

# 8. Pourquoi choisir la boutique ?

**Surtitre :**
`UNE EXPÉRIENCE SIMPLE`

**Titre :**
# Tout est pensé pour vous aider à commander sereinement.

**Texte d'introduction :**
Choisir un produit devrait être simple. Nous faisons en sorte que vous puissiez découvrir la sélection, retrouver les informations utiles et passer votre commande sans complication.

### Une sélection à découvrir
`Parcourez les collections et découvrez les produits disponibles dans la boutique.`

### Des informations claires
`Consultez les détails et les prix affichés avant d'ajouter vos articles au panier.`

### Une commande simple
`Composez votre panier et transmettez votre commande directement depuis le site.`

### Un accompagnement sur WhatsApp
`Après réception de votre commande, notre équipe vous contacte sur WhatsApp pour vérifier les informations, confirmer la disponibilité et vous communiquer les modalités de paiement et de livraison.`

---

# 9. Avis clients — Ce qu'on en dit [Modifié v1.3]

**Surtitre :**
`VOS RETOURS COMPTENT`

**Titre :**
# Vos expériences donnent vie à notre boutique.

**Texte :**
Chaque retour nous aide à mieux vous accompagner. Découvrez les expériences partagées par notre clientèle.

**Structure d'une carte d'avis :**
- `[AVIS CLIENT AUTHENTIQUE]`
- `[NOM OU PRÉNOM AUTORISÉ À AFFICHER]`
- `[NOTE, UNIQUEMENT SI ELLE A ÉTÉ RÉELLEMENT COLLECTÉE]`

**CTA :**
`Partager mon expérience`

**Règle de publication :**
N'afficher que des témoignages authentiques, avec un nom d'affichage et une photo uniquement si la personne a donné son autorisation. Ne pas publier les exemples de rédaction comme s'il s'agissait de vrais avis. Si aucun avis n'est encore disponible, remplacer temporairement cette section par une invitation à partager un retour après achat.

**Texte temporaire si aucun avis n'est disponible :**
`Vous avez déjà commandé chez nous ? Votre retour peut aider d'autres personnes à découvrir la boutique.`

**Comportement au lancement [Ajout v1.1] — la section est bonne, à ces conditions :**
- **Aucun avis inventé, jamais.** Tant qu'il n'y a pas d'avis réel autorisé, la section n'affiche **que** le texte temporaire et l'invitation à partager un retour : pas de cartes, pas d'étoiles, pas de note moyenne.
- Dès qu'il existe **au moins un avis réel avec autorisation de publication**, les cartes s'affichent (6 au maximum, en carrousel tactile sans défilement automatique).
- **Source des avis au MVP** : une liste dans le code, **vide au départ**. Chaque avis contient le texte, le nom d'affichage autorisé, la note (seulement si elle a été réellement collectée) et la **preuve d'autorisation** (par exemple une capture de la conversation WhatsApp). Un avis sans autorisation enregistrée **ne peut pas s'afficher**. Des avis administrables avec modération viendront plus tard.
- **`Partager mon expérience`** ouvre WhatsApp avec un message prérempli (« Bonjour, je souhaite partager mon avis sur ma commande. », avec la référence si le client vient de la page de confirmation). La demande d'autorisation de publication se fait dans cette conversation.
- **Aucune note moyenne** dans les données structurées du site tant que des notes réelles et vérifiables n'existent pas.
- Ancre : `/#avis`.
- **[Modifié v1.3] Public neutre (D-28)** : les formulations au féminin (« Elles en parlent », « nos clientes ») sont remplacées par des formulations neutres (« Ce qu'on en dit », « notre clientèle »). Aucun texte public ne suppose le genre du visiteur.

---

# 10. Instagram — Rejoindre la communauté

**Surtitre :**
`RESTONS CONNECTÉS`

**Titre :**
# Un peu plus de beauté dans votre fil d'actualité.

**Texte :**
Retrouvez-nous sur Instagram pour découvrir nos produits, nos nouveautés, nos inspirations et les actualités de la boutique.

**CTA principal :**
`Suivre sur Instagram`

**Lien :**
`[LIEN INSTAGRAM]`

**Grille :**
Afficher 4 à 6 publications réelles et récentes de la boutique.

**Microcopie sous la grille :**
`Retrouvez toutes nos actualités sur Instagram.`

> Les publications peuvent être ajoutées manuellement pour la première version. Utiliser des visuels appartenant à la marque ou dont l'utilisation est autorisée.

**Données et liens [Ajout v1.1] :**
- Tant qu'il y a moins de 4 publications, la section n'est **pas affichée**.
- Les publications sont ajoutées à la main (image hébergée sur Cloudinary, texte alternatif, lien vers la publication). Pas d'intégration Instagram : plus rapide, et aucun traceur tiers.
- Les liens s'ouvrent dans un nouvel onglet, sans transmettre le site d'origine.
- `Suivre sur Instagram` → `[LIEN INSTAGRAM]` (enregistré dans les paramètres du back-office).
- Ancre : `/#instagram`.

---

# 11. FAQ — Les réponses avant de commander

**Surtitre :**
`BESOIN D'UNE PRÉCISION ?`

**Titre :**
# Tout ce qu'il faut savoir avant de commander.

**Texte d'introduction :**
Vous avez une question sur votre commande, le paiement ou la livraison ? Retrouvez ici les informations essentielles.

### Comment passer une commande ?

Parcourez la boutique, choisissez les produits qui vous intéressent et ajoutez-les à votre panier. Lorsque votre sélection est prête, ouvrez votre panier, vérifiez les articles et remplissez le formulaire de commande. Votre commande est enregistrée sur le site. Notre équipe vous contacte ensuite sur WhatsApp pour vérifier les informations et confirmer les prochaines étapes.

### Quels sont les moyens de paiement ?

Le paiement de l'acompte à Abidjan et le paiement intégral des commandes hors d'Abidjan et à l'international s'effectuent par Wave. Le numéro de paiement et les instructions vous sont communiqués par la vendeuse après confirmation de votre commande. Le numéro Wave n'est pas affiché publiquement sur le site.

### Comment fonctionne l'acompte à Abidjan ?

Pour les commandes dans les communes d'Abidjan, un acompte de **2 000 FCFA** est demandé pour confirmer la commande. Le solde est réglé à la réception. L'équipe vous contacte après réception de votre commande pour vérifier les informations et vous communiquer les modalités de paiement.

### Livrez-vous hors d'Abidjan et à l'étranger ?

**[Modifié v1.3]** Oui. Nous livrons dans tout le pays et dans les pays proposés dans le formulaire de commande. Pour ces destinations, le paiement intégral est requis avant l'expédition, et l'expédition est assurée par la vendeuse. L'équipe vous contacte afin de confirmer la disponibilité des produits, la destination et les modalités d'expédition.

### Quels sont les frais et les délais de livraison ?

**[Modifié v1.3]** Les délais sont indicatifs et comptés à partir de la confirmation de votre commande : **24 h à Abidjan, 72 h à l'intérieur du pays, 5 à 15 jours à l'international**. Ils peuvent varier selon la destination ; l'équipe vous confirme le délai exact sur WhatsApp. Les frais exacts sont communiqués par la vendeuse après réception de votre commande et vérification de votre destination. Pour les commandes hors d'Abidjan et à l'international, les frais d'expédition sont inclus dans le montant à régler.

> **[Modifié v1.3]** Les délais viennent des réponses de la cliente (C4), **le point de départ du délai est à confirmer avec elle** 🟡 (cahier, question 27). Dans l'application, ils sont portés par chaque zone (cahier P-56) et repris par le texte unique, jamais retapés à la main.

### Comment contacter la vendeuse ?

Vous pouvez échanger avec notre équipe sur WhatsApp. Après l'envoi de votre commande, nous vous contactons également sur WhatsApp pour vérifier les informations, confirmer la disponibilité des produits et vous communiquer les modalités de paiement et de livraison.

**CTA sous la FAQ :**
`Une autre question ? Écrivez-nous sur WhatsApp`

**Lien :**
`[CONTACT WHATSAPP]`

> Les réponses ci-dessus reprennent les règles de paiement et de livraison du cahier des charges v2.1. **[Modifié v1.3]** Les frais par destination restent à confirmer avec la cliente. Les réponses définitives doivent être validées avant publication.

**Comportement [Ajout v1.1] :**
- Ancre : `/#faq`. C'est aussi la destination du lien « Informations de paiement et livraison » du footer.
- Accordéon accessible : chaque question est un bouton qui indique si la réponse est ouverte ; on peut tout ouvrir au clavier.
- Les réponses sont publiées dans les données structurées « FAQ » du site.
- **Source unique** : les règles de paiement et de livraison viennent d'**un seul texte** repris à l'identique dans la FAQ, le rappel du footer, le formulaire de commande, la page de confirmation et l'email. Elles ne peuvent donc jamais se contredire.
- **À confirmer** : comment se règle le **solde à la livraison** à Abidjan (espèces, Wave, autre) ? La FAQ ne le dit pas encore.

---

# 12. Contact — Parlons de votre commande

**Surtitre :**
`NOUS SOMMES À VOTRE ÉCOUTE`

**Titre :**
# Une question ? Notre équipe est là pour vous répondre.

**Texte :**
Besoin d'un renseignement sur un produit, une commande ou une livraison ? Contactez-nous. Nous vous accompagnerons pour obtenir les informations dont vous avez besoin.

**CTA principal :**
`Nous écrire sur WhatsApp`

**Coordonnées :**
- WhatsApp : `[CONTACT WHATSAPP]`
- Instagram : `[LIEN INSTAGRAM]`
- Email : `[ADRESSE E-MAIL, SI DISPONIBLE]`

> N'afficher que les coordonnées confirmées par la cliente. Le numéro Wave ne doit jamais être exposé dans cette section.

**Liens [Ajout v1.1] :**
- Ancre : `/#contact`.
- `Nous écrire sur WhatsApp` → `https://wa.me/[NUMÉRO]?text=Bonjour%2C%20j%27ai%20une%20question.`
- Email → lien `mailto:` ; Instagram → `[LIEN INSTAGRAM]`.
- Seules les coordonnées confirmées sont affichées : une coordonnée absente des paramètres n'apparaît pas.

---

# 13. CTA final — Dernière invitation

**Surtitre :**
`VOTRE PROCHAIN COUP DE CŒUR VOUS ATTEND`

**Titre :**
# Faites de la place à vos nouveaux essentiels.

**Texte :**
Explorez nos collections, découvrez les produits disponibles et composez votre panier en quelques instants. Votre prochaine découverte commence ici.

**CTA principal :**
`Découvrir la boutique`

**CTA secondaire :**
`Voir les nouveautés`

**Liens [Ajout v1.1] :** `Découvrir la boutique` → `/boutique` · `Voir les nouveautés` → `/boutique?tri=nouveautes`.

---

# 14. Footer — Informations & navigation

**Présentation courte :**

`[NOM DE LA BOUTIQUE] vous propose une sélection de produits de beauté et d'accessoires pour accompagner vos envies et vos routines au quotidien.`

### Navigation
- Accueil
- Boutique
- Collections
- Notre histoire

### Besoin d'aide ?
- Contact WhatsApp
- Questions fréquentes
- Informations de paiement et livraison

### Suivez-nous
- Instagram : `[LIEN INSTAGRAM]`
- TikTok : `[LIEN TIKTOK, SI DISPONIBLE]`
- Facebook : `[LIEN FACEBOOK, SI DISPONIBLE]`

### Informations légales
- Conditions générales de vente
- Conditions générales d'utilisation
- Mentions légales
- Politique de confidentialité
- Gérer mes cookies **[Ajout v1.2]**

**Rappel paiement & livraison :**

`À Abidjan : acompte de 2 000 FCFA pour confirmer la commande, puis solde à la livraison. Hors d'Abidjan et à l'international : paiement intégral avant expédition. Les modalités sont communiquées par la vendeuse après confirmation de la commande.`

**Copyright :**

`© [ANNÉE] [NOM DE LA BOUTIQUE]. Tous droits réservés.`

**Liens [Ajout v1.1] :**
- Accueil → `/` · Boutique → `/boutique` · Collections → `/#collections` · Notre histoire → `#notre-histoire` (modal).
- Contact WhatsApp → `https://wa.me/[NUMÉRO]` · Questions fréquentes → `/#faq` · Informations de paiement et livraison → `/#faq`.
- Instagram, TikTok, Facebook → liens enregistrés dans les paramètres ; un réseau sans lien n'est pas affiché.
- Pages légales → `/cgv` · `/cgu` · `/mentions-legales` · `/politique-de-confidentialite`. **[Ajout v1.2]** Gérer mes cookies → `/cookies`.
- Le **rappel paiement et livraison** reprend le texte unique décrit dans la FAQ.

---

# 15. Mini-jeu facultatif — Cosmetic Smash

> Le mini-jeu est un complément d'expérience, pas un élément nécessaire à la conversion. Il ne doit jamais gêner le footer, les liens utiles ou le parcours d'achat. Il peut être ajouté après la mise en place du catalogue et du parcours de commande.

**Titre :**
# Une petite pause beauté ?

**Texte :**
Envie d'une petite pause ludique ? Lancez Cosmetic Smash et amusez-vous quelques instants.

**Bouton :**
`Jouer`

**Pendant la partie :**
- `Score : [SCORE]`
- `Temps : [CHRONOMÈTRE]`
- `Pause`
- `Recommencer`

**Fin de partie :**
`Bien joué ! Envie de refaire une partie ?`

**Bouton :**
`Rejouer`

Le jeu doit être adapté au tactile, proposer une pause, garder le son désactivé par défaut, respecter la préférence de réduction des animations et se charger uniquement lorsque le visiteur approche du footer.

**[Ajout v1.2] Pots réalistes (décision D-19, cahier P-42).**
- Les pots doivent être **réalistes et bien faits**, pas des pictogrammes : **contenants cosmétiques génériques, sans marque ni nom de produit inventé** (pot de crème, flacon pompe, compte-gouttes, tube, bouteille), avec **volumes, reflets, ombres et matières crédibles** (verre, plastique, métal).
- Leurs **couleurs reprennent celles des catégories** de la boutique.
- **Éclatement crédible** au toucher : éclats et éclaboussure de crème.
- **Partie de 30 secondes** 🟡 (le chronomètre `Temps : …` décompte) ; trois tailles de pots, les plus petits rapportant le plus 🟡.
- Les pots sont dessinés en **SVG ou en canvas détaillés** ; des visuels fournis par la cliente ou des photos de produits détourées pourront les remplacer (§17).
- Le **titre et le texte** du bloc suivent l'effet « spaghetti » (§26).
- **Si le visiteur demande moins d'animations**, le jeu n'est pas lancé et le bloc affiche, à la place du bouton `Jouer` : `Le jeu est désactivé car vous avez demandé moins d’animations.` 🟡
- **Rien n'est chargé** (ni script, ni dessin) tant que le jeu n'est pas lancé : le footer et les liens utiles restent instantanés.

---

# 16. Parcours de conversion — Résumé

1. **Attirer :** le Hero présente immédiatement l'univers de la boutique et propose d'explorer les produits.
2. **Orienter :** les collections aident le visiteur à trouver rapidement ce qu'il recherche.
3. **Donner envie :** les best-sellers et le focus produit mettent en valeur les articles disponibles.
4. **Rassurer :** la présentation de la marque, les éléments de réassurance, les avis authentiques et la FAQ répondent aux hésitations.
5. **Créer le lien :** Instagram et WhatsApp permettent de prolonger la relation avec la boutique.
6. **Faire agir :** les CTA renvoient vers la boutique ou le panier, sans détour inutile.
7. **Confirmer :** les informations de paiement et de livraison expliquent clairement les prochaines étapes.

**[Ajout v1.1]** Le panier du header reste visible à chaque étape du parcours : c'est lui qui ramène le visiteur vers la commande.

---

# 17. Éléments à obtenir avant publication

- [ ] Nom définitif de la boutique et logo.
- [ ] Slogan et présentation officielle de la marque.
- [ ] Histoire réelle de la fondatrice et valeurs à mettre en avant.
- [ ] Catégories réellement disponibles.
- [ ] Photos, noms, prix et descriptions exactes des produits.
- [ ] Produit à mettre en avant dans le focus produit.
- [ ] Avis authentiques et autorisations de publication.
- [ ] 4 à 6 visuels/publications Instagram.
- [ ] Liens des réseaux sociaux.
- [ ] Numéro WhatsApp de contact.
- [x] Communes, villes et pays effectivement desservis. **[Modifié v1.3]** Toutes les communes d'Abidjan, tout le pays, 13 pays (cahier P-58) ; liste des pays à relire avec la cliente.
- [ ] Frais de livraison par destination. *[Modifié v1.3]* Délais indicatifs reçus le 19 nov. (Abidjan 24 h, intérieur 72 h, international 5 à 15 jours) ; **point de départ du délai à confirmer**.
- [x] Confirmation du caractère fixe ou variable de l'acompte de 2 000 FCFA. **[Modifié v1.3]** Fixe, **pour Abidjan seulement** (D-23).
- [ ] Conditions générales, mentions légales et politique de confidentialité validées.
- [x] **[Ajout v1.1]** Public visé (formulations au féminin ou neutres). **[Modifié v1.3]** Neutres (D-28).
- [ ] **[Ajout v1.1]** Comment se règle le solde à la livraison à Abidjan.
- [ ] **[Ajout v1.1]** Produits à « mettre en avant » (best-sellers) et produit du focus.
- [ ] **[Ajout v1.1]** Logo en fichier vectoriel, favicon et image de partage (réseaux sociaux, WhatsApp).
- [ ] **[Ajout v1.1]** Politique de retour et d'échange (pour les CGV et la FAQ).
- [ ] **[Ajout v1.1]** Souhait de la vendeuse de modifier elle-même les textes de la landing (sinon : modification par AKATech).
- [ ] **[Ajout v1.2]** Textes de la **politique de confidentialité**, de la **bannière cookies** et de la page `/cookies` validés, avec la **durée de conservation** des données d'analytique (§27).
- [ ] **[Ajout v1.2]** Choix des **pots du mini-jeu** : dessins génériques sans marque (proposé) ou visuels fournis par la cliente.
- [ ] **[Ajout v1.2]** Validation de l'**effet « spaghetti »** sur pièce, titres puis textes (§26). **[Modifié v1.3]** Code de Rabbit relu : valeurs confirmées.
- [ ] **[Ajout v1.3]** Variantes : types d'options (taille, couleur, format), nombre par produit, prix différents ou non (cahier, question 28).

**Règle éditoriale :** ne jamais inventer un avis, une caractéristique produit, une promotion, une zone de livraison, un délai, un tarif ou une promesse commerciale. En cas d'information manquante, utiliser un champ à compléter ou attendre la confirmation de la cliente.

---

# 18. Pages et états à prévoir [Ajout v1.1]

| Cas | Ce que voit le visiteur |
|---|---|
| **Page introuvable (404)** | Page aux couleurs de la marque, avec liens vers `/boutique` et `/`. Un produit brouillon ou archivé se comporte comme une page introuvable ; un **ancien slug** redirige vers le slug actuel. |
| **Panier vide** | « Votre panier est vide » + bouton `Découvrir la boutique`. |
| **Produit épuisé** | Mention « Épuisé », bouton d'ajout désactivé. |
| **Catégorie sans produit** | Elle n'est pas affichée sur la landing ; sa page affiche un message et un lien vers la boutique. |
| **Boutique pas encore alimentée** | Les sections qui dépendent de produits ne s'affichent pas ; la landing garde ses textes de marque. Aucun faux produit. |
| **`/boutique`** | **Recherche** par nom, filtre par catégorie et par offres, tri (nouveautés, prix croissant, prix décroissant). |
| **Chargement** | Squelettes (blocs gris) à la place du contenu, pas de page blanche. |
| **Panier : durée** | Le panier garde **identifiants et quantités** dans le navigateur (jamais de prix), se synchronise entre onglets, et expire après 30 jours. |
| **Produit devenu indisponible** | À l'ouverture du panier, il est signalé et retiré du total. |
| **Commande : erreur réseau** | Message clair (« Connexion impossible, vos informations sont conservées »), bouton pour réessayer, jamais de double commande. |
| **Commande réussie** | Le panier est vidé et la page de confirmation s'affiche. |
| **Commande échouée** | Le panier est conservé. |
| **Confirmation sans référence valide** | Retour à l'accueil. |
| **Erreur du serveur** | Page d'erreur avec une référence à communiquer, sans détail technique. |
| **Reçu de commande : dessin impossible** [Ajout v1.2] | Message « Le reçu n’a pas pu être généré. Le récapitulatif ci-dessous reste valable : gardez votre référence. » ; la confirmation et le bouton WhatsApp restent disponibles. |
| **Téléchargement automatique du reçu bloqué** [Ajout v1.2] | Le ticket reste affiché ; le bouton `Télécharger mon reçu (PNG)` le télécharge. |
| **Alerte « Nouvelle visite » non envoyée** [Ajout v1.2] (quota du jour atteint ou échec d'envoi) | Rien de visible pour le visiteur ; la visite reste dans l'onglet Analytics ; le cron reprend les échecs. |
| **Assistant indisponible** [Ajout v1.2] (panne, plafond du jour atteint, interrupteur fermé) | Le bouton ne s'affiche pas si l'assistant est fermé ; en cas de panne : `Je suis indisponible pour le moment. Écrivez-nous sur WhatsApp, l’équipe vous répondra.` + bouton WhatsApp. |
| **Cookies refusés** [Ajout v1.2] | Aucune mesure ; le site, le panier et la commande fonctionnent à l'identique ; le choix se modifie sur `/cookies`. |

---

# 19. Éléments transverses oubliés [Ajout v1.1]

- **Référencement** : titre et description uniques par page, image de partage (réseaux sociaux, WhatsApp), `sitemap.xml`, `robots.txt`, adresses canoniques, données structurées (organisation, produit, FAQ, fil d'Ariane). Page de confirmation et back-office non indexés.
- **Identité** : favicon et icônes pour l'écran d'accueil du téléphone ; langue de la page déclarée en français.
- **Traceurs et bannière cookies** : **[Modifié v1.2]** l'analytique maison (cahier D-17) est un traceur. Une **bannière de consentement** s'affiche à la première visite ; **aucune mesure n'a lieu avant le choix** ; le lien **Gérer mes cookies** (footer, `/cookies`) permet de le modifier. Textes proposés : §27. *(Version 1.1 : « aucune bannière tant qu'aucun traceur non essentiel n'est utilisé » — remplacé.)*
- **Bouton WhatsApp flottant** *(facultatif)* : discret, qui ne masque ni le panier ni les modals.
- **Polices** hébergées avec le site (pas de service tiers) ; images livrées au bon format et à la bonne taille.
- **Performance** : image du hero prioritaire, images suivantes chargées à la demande, animations avancées et mini-jeu chargés seulement quand c'est utile.
- **Accessibilité** : contraste suffisant (le texte des sections de couleur est noir ou blanc, calculé), focus visible, zones tactiles de 44 px, formulaires avec libellés, messages d'erreur annoncés.

---

# 20. D'où viennent les contenus [Ajout v1.1]

| Contenu | Source | Qui le modifie |
|---|---|---|
| Hero, marquee, histoire, « pourquoi choisir », FAQ, footer, CTA | Fichier de contenu typé dans le code | AKATech (déploiement) — la vendeuse pourra le faire plus tard si elle le demande |
| Collections | Catégories actives du back-office | La vendeuse |
| Best-sellers | Produits « mis en avant » du back-office | La vendeuse |
| Focus produit | Paramètres du back-office | La vendeuse |
| WhatsApp, email, liens Instagram / TikTok / Facebook | Paramètres du back-office | La vendeuse |
| Avis | Liste dans le code, **vide au départ** | AKATech, sur demande de la vendeuse |
| Publications Instagram | Liste dans le code (images Cloudinary) | AKATech, sur demande de la vendeuse |
| Règles de paiement et de livraison | **Un seul texte** réutilisé partout | AKATech, après validation de la cliente |
| Pages légales | Textes validés par la cliente | AKATech |

---

# 21. Garde-fou de publication [Ajout v1.1]

La règle éditoriale (« ne jamais inventer ») est appliquée par le code :
- une section dont les données manquent **n'est pas affichée** au lieu d'afficher un texte à trous ;
- un **test de build échoue** si un champ entre crochets (`[NOM DE LA BOUTIQUE]`, `[CONTACT WHATSAPP]`, `[LIEN INSTAGRAM]`…) reste dans un contenu destiné à être publié ;
- un avis sans autorisation enregistrée ne peut pas s'afficher ;
- une coordonnée ou un réseau absent des paramètres n'apparaît pas.

---

# 22. Journal de la version 1.1

- Ajout de la **table des adresses et ancres** (§0) et des liens de chaque section.
- **Panier du header** : nombre d'articles **et montant**, panier-vide, accessibilité, visible sur toutes les pages et sur mobile dans la barre.
- **Avis** : comportement au lancement, source des données, preuve d'autorisation, destination de `Partager mon expérience`, pas de note moyenne sans notes réelles, formulation à confirmer.
- **Offres & nouveautés** : raccourcis de la boutique, pas une catégorie.
- **Best-sellers** : produits « mis en avant » ; « Nouveau » calculé ; pas de badge « Best-seller » sans ventes.
- **Focus produit** : choisi dans les paramètres ; masqué s'il n'existe pas.
- Nouveaux paragraphes : pages et états (§18), éléments transverses (§19), origine des contenus (§20), garde-fou de publication (§21).

---

# 23. Fiche produit — structure et textes [Ajout v1.2]

Adresse : `/produit/[slug]`. Format mobile de référence (code v0.8). Les libellés ci-dessous sont ceux du code.

**Ordre des blocs :**
1. `← Retour à la boutique` (suivi de la catégorie du produit).
2. **Galerie balayable** : défilement aimanté au doigt ; flèches `Photo précédente` / `Photo suivante` en surimpression ; pastilles `Voir la photo 2 sur 3` ; première photo en priorité.
3. Badge `Nouveau` (calculé, RM-39), puis **grand titre en majuscules** (nom du produit), puis prix ; prix promotionnel avec l'ancien prix barré.
3 bis. **[Ajout v1.3] Options** (seulement si le produit a des variantes) : libellé du produit (par exemple `Taille`), pastilles d'options avec le prix de chacune si les prix diffèrent ; une option épuisée est grisée (`Épuisé`) ; une seule option active est présélectionnée.
4. **Ligne `Quantité`** avec sélecteur « − 1 + ».
5. **Grand bouton `Ajouter au panier ↗`**, avec à droite le prix (prix × quantité, indicatif) ; après un ajout : `Ajouté ✓` pendant deux secondes. Sous le bouton, s'il y en a déjà : `Déjà dans votre panier : 2`. **[Ajout v1.3]** Tant qu'aucune option n'est choisie, le bouton est désactivé et indique `Choisissez une option` ; la barre d'achat du téléphone affiche l'option choisie.
6. Carte **`Caractéristiques`** : une ligne par caractéristique saisie au back-office, puis `Poids : …` si renseigné. Carte non affichée s'il n'y a rien.
7. Carte **`Mode d'utilisation`** : texte du back-office ; non affichée s'il est vide.
8. **Quatre pastilles de réassurance** (uniquement des règles validées ou des fonctions livrées) :
   - `Confirmation sur WhatsApp`
   - `Paiement à la livraison à Abidjan`
   - `Livraison en Côte d’Ivoire et à l’étranger`
   - `Reçu à chaque commande`
9. Carte **`Paiement et livraison`** : le rappel unique de la FAQ (RM-41).
10. Section **`À propos de ce produit`** : la description, en grand, un paragraphe par bloc de texte.
11. Produits associés ; données structurées produit ; fil d'Ariane.

**Barre d'achat collée en bas (téléphone) :** nom du produit, prix et bouton `Ajouter` ; elle apparaît dès que le bouton principal sort de l'écran. Masquée sur ordinateur.

**Produit épuisé :** à la place du bouton, `Ce produit est épuisé pour le moment.` ; pas de barre d'achat.

**Ordinateur :** galerie à gauche, colonne d'achat collante à droite.

**Interdits (RM-42) :** promotion « pack » ou « 3 pour… », garantie, **délai de livraison autre que le délai indicatif de la source unique** (RM-47, D-26), note ou avis non réels, mention « Best-seller » sans ventes.

---

# 24. Panier en feuille — structure et textes [Ajout v1.2]

Ouverture : icône du header (`#panier`). Sur téléphone, **feuille collée au bord bas** ; sur ordinateur, fenêtre centrée.

- **Titre :** `Mon panier` (majuscules). Bouton de fermeture carré arrondi, en haut à droite.
- **Liste défilante** : miniature · nom du produit (majuscules) · **[Ajout v1.3] option choisie** (`Taille : 250 ml`) · `10 000 FCFA l’unité` · sélecteur « − 1 + » · **prix de la ligne** (ancien prix barré si promotion) · `Retirer`.
- **Produit devenu indisponible ou limité** : message sous le nom, ligne retirée du total.
- **Rappel** de paiement et de livraison (texte unique de la FAQ), dans la partie défilante.
- **Pied fixe** :
  - `Livraison` — `À confirmer` *(les frais ne sont jamais inventés, RM-03)* ;
  - `Sous-total` — montant officiel calculé par le serveur ; `Mise à jour…` pendant le calcul ;
  - texte validé sur les frais de livraison ;
  - **barre sombre** avec le bouton **`Passer commande →`** (le seul bouton principal de la feuille).
- **Panier vide :** `Votre panier est vide.` + bouton `Découvrir la boutique` (pas de pied).
- **Commande fermée** (interrupteur) : bouton désactivé et `La commande en ligne ouvre très bientôt.`

---

# 25. Reçu de commande en ticket de caisse — structure et textes [Ajout v1.2]

**Où :** page de confirmation `/commande/confirmation?ref=CMD-…`, sous le message de remerciement. **Quand :** juste après l'enregistrement de la commande.

**Animation d'imprimante :** un écran affiche l'avancement, puis le ticket sort de la fente (par à-coups, comme une imprimante thermique). Statuts : `Préparation de votre reçu` → `Impression de votre reçu` → `Reçu prêt`. L'écran montre la référence et le montant : `29 000 FCFA`, ou `29 000 FCFA + livraison` tant que les frais ne sont pas fixés. Mouvement réduit : le ticket apparaît directement.

**Téléchargement :** le fichier `recu-CMD-XXXXXXXX.png` se télécharge **dès que l'image est prête**, une seule fois par commande. Bouton : `Télécharger mon reçu (PNG)`. Message : `Votre reçu a été téléchargé sur votre appareil.` — ou, s'il n'a pas démarré : `Gardez-le : il rappelle votre référence et le détail de votre commande.` Une page rouverte plus tard **ne relance pas** le téléchargement.

**Contenu du ticket (de haut en bas) :**
1. `[NOM DE LA BOUTIQUE]` en capitales ; `REÇU DE COMMANDE` ; date et heure (heure d'Abidjan).
2. `Commande` + référence ; `Livraison` + destination.
3. Une ligne par produit : `2 × Nom du produit` + prix de la ligne ; **[Ajout v1.3]** l'option choisie s'écrit sous le nom (`Taille : 250 ml`) ; sous la ligne, `10 000 FCFA l’unité` si la quantité dépasse 1.
4. `Sous-total` ; `Frais de livraison` ; `TOTAL` — **`à confirmer`** tant que les frais ne sont pas fixés (RM-03).
5. `Acompte pour confirmer` (Abidjan) ou `À régler avant expédition` (ailleurs).
6. **Tampon** : `PAIEMENT NON REÇU` + `Commande enregistrée, en attente de confirmation.`
7. Les étapes de l'annexe B, point 3 : `Après réception de la commande, l’équipe contacte le client sur WhatsApp afin de :` vérifier les informations fournies · confirmer la disponibilité des produits · préciser les frais de livraison · communiquer les modalités de paiement.
8. **Code-barres** (Code 39) de la référence, avec la référence en dessous.
9. `Merci pour votre confiance !` ; pied : `Reçu de commande — ne constitue pas une facture.`

**Règles :**
- **Jamais** « payé », « paiement reçu » ou « confirmé » : le ticket annonce une commande **enregistrée**, pas un paiement (RM-10, RM-25).
- **Aucune donnée personnelle** : ni nom, ni téléphone, ni adresse précise, ni email.
- Le ticket affiché et le fichier téléchargé viennent du **même dessin** ; le fichier le pose sur le fond de la charte avec une ombre douce.
- Le **reçu PDF** (cahier P-38) reste réservé à la vendeuse : il suit les paiements enregistrés.

---

# 26. Effet « spaghetti » — titres et textes [Ajout v1.2]

**Décisions D-18 et D-29 (Aka) :** tous les titres de section et tous les textes de la landing suivent l'effet « spaghetti » de **Rabbit Shop**. **[Modifié v1.3]** Ce n'est plus une interprétation : l'animation est **reprise du code de Rabbit Shop**, relu le 19 novembre (classe `.elastic-title`, fichier `lib/useGsapLenis.ts`). Reste à la **valider sur pièce** dans la boutique (polices, longueur des titres).

**Titres** (Hero, Collections, Best-sellers, Notre histoire, Focus produit, Pourquoi choisir la boutique, Avis, Instagram, FAQ, Contact, CTA final, titre du footer, titre du mini-jeu, `À propos de ce produit`) :
- texte découpé **en lettres** ; au défilement, chaque lettre part **décalée vers le bas, réduite et transparente** et arrive avec un **rebond élastique** ;
- valeurs de référence (Rabbit Shop), **confirmées dans son code** : décalage 60 px, échelle 0,5 → 1, durée 1,3 s, 0,015 s entre deux lettres, courbe élastique (`elastic.out`), déclenchement quand le titre atteint 85 % de la hauteur de l'écran, retour en arrière en remontant ; en GSAP : `y: 60, opacity: 0, scale: 0.5` → `y: 0, opacity: 1, scale: 1`, `duration: 1.3`, `stagger: 0.015`, `ease: 'elastic.out(0.75, 0.3)'`, ScrollTrigger `start: 'top 85%'`, `toggleActions: 'play none none reverse'` ;
- les mots ne sont **jamais coupés** (chaque mot est un bloc insécable) ; sur mobile, le retour à la ligne se fait entre les mots.

**Textes courants** (sous-titres, paragraphes, descriptions) — **confirmé par Aka le 19 novembre** :
- effet élastique **par mot** (jamais lettre par lettre : trop lourd et pénible à lire), avec la même élasticité et un décalage plus court entre deux mots.

**Exceptions** (lisibilité, accessibilité) : prix et montants · libellés de boutons et de formulaires · messages d'erreur · pages légales · contenu du panier et de la commande · réponses de la FAQ une fois dépliées.

**Règles :**
- le **texte complet est dans le HTML dès le chargement** (référencement, lecteurs d'écran, absence de JavaScript) ; la découpe ne change pas ce que lit un lecteur d'écran (nom accessible sur le titre, lettres masquées) ;
- **mouvement réduit** (`prefers-reduced-motion`) : aucun effet, texte affiché tel quel ;
- **aucun saut de mise en page** : la découpe attend le chargement des polices ;
- **mobile** : effet allégé ; GSAP (SplitText) chargé à la demande, jamais avant que le premier titre approche ;
- l'effet ne doit **jamais** retarder le texte du Hero (priorité à l'affichage) : Rabbit anime son Hero avec un délai de 0,9 s, **ce délai n'est pas repris** ;
- **[Ajout v1.3] Écarts voulus avec le code de Rabbit :** (1) découpage **en mots puis en lettres** (`words,chars`), car le découpage en lettres seules de Rabbit peut couper un mot en fin de ligne ; (2) **mouvement réduit respecté** (Rabbit ne le gère pas sur ces titres) ; (3) GSAP chargé **à la demande**.

**Option ❓ :** au survol d'un titre (ordinateur seulement), une image de produit flotte près de la lettre la plus proche du curseur (effet « hover image » de Rabbit Shop). **[Modifié v1.3]** Rabbit l'active déjà sur ses titres avec le même code ; ici, ce seraient des photos de **produits publiés**. À décider après essai.

---

# 27. Bannière cookies et page `/cookies` [Ajout v1.2]

> **Textes proposés 🟡 — à valider par la cliente et par un professionnel. Ceci n'est pas un avis juridique.**

**Bannière (première visite) :**
`Nous mesurons l’audience du site pour l’améliorer : pays et ville approximatifs, pages vues, boutons touchés et durée de visite. Aucune adresse IP n’est conservée. Vous pouvez refuser, cela ne change rien à votre commande.`
Boutons : `Accepter` · `Refuser`. Lien : `En savoir plus sur les cookies` → `/cookies`.

**Comportement :**
- aucun identifiant ni mesure avant le choix ; la bannière ne bloque ni le panier ni la commande ;
- `Refuser` : rien n'est enregistré et ce qui concerne ce navigateur est effacé ;
- le choix est mémorisé dans le navigateur et se modifie à tout moment.

**Page `/cookies` — `Gérer mes cookies` :**
1. **Ce qui est mesuré** : pays, région ou province et ville approximatifs, appareil, navigateur, provenance de la visite, pages vues, boutons touchés, durée de visite. La boutique reçoit un email indiquant le pays, la province et la provenance (Google, Instagram, Facebook…) de chaque nouveau visiteur, **sans adresse IP**. **[Ajout v1.3]** Un second outil, **Vercel Web Analytics**, mesure aussi les pages vues et le pays ; il suit le même choix 🟡 (cahier P-57).
2. **Ce que fait chaque choix** : `Accepter` active la mesure ; `Refuser` la coupe et efface les données du navigateur.
3. **Ce qui est enregistré dans votre navigateur** : un identifiant aléatoire de visiteur et votre choix *(noms et durées à fixer à la construction)*.
4. **Conservation** : le détail des visites est supprimé au bout de 90 jours 🟡 ; seuls des compteurs sans identifiant sont conservés.
5. **Vos droits** : demander la suppression de vos données ; contact par WhatsApp ou email *(coordonnées des paramètres)*.
6. **Votre choix actuel**, avec les boutons `Accepter` et `Refuser`.

La **politique de confidentialité** reprend ces informations (cahier P-09, P-44).

---

# 28. Email « Nouvelle visite » à la vendeuse [Ajout v1.2]

> Email **automatique**, envoyé par Resend à l'adresse de notification de la vendeuse (paramètres), à la **première visite d'un navigateur ayant accepté la mesure** (cahier P-45). Il n'est pas visible des visiteurs. **Textes proposés 🟡.**

**Objet :** `Nouvelle visite depuis [PROVINCE], [PAYS]` — si la province est inconnue : `Nouvelle visite depuis [PAYS]` ; si rien n'est connu : `Nouvelle visite sur la boutique`.

**Corps :**
- Titre : `Nouveau visiteur sur [NOM DE LA BOUTIQUE]`
- `Pays : Côte d’Ivoire`
- `Province : …`
- `Provenance : Google` *(ou Instagram, Facebook, TikTok, WhatsApp, un autre site avec son nom de domaine, ou « Accès direct »)*
- `Page d’arrivée : /produit/…`
- `Appareil : Mobile · Android · Chrome`
- `Heure : 19 nov. 2026 · 14:05 (Abidjan)`
- Bouton : `Voir dans Analytics` → `/admin/analytics`
- Pied : `Aucune adresse IP n’est conservée ni transmise. Le lieu est approximatif et donné à titre indicatif. Cette alerte n’est envoyée que pour les visiteurs ayant accepté la mesure d’audience.`

**Règles de provenance :**

| Ce qui est lu | Provenance affichée |
|---|---|
| Lien balisé `utm_source` (`whatsapp`, `instagram`, `facebook`, `tiktok`…) | Le canal du lien (il l'emporte sur le reste) |
| Site référent Google (`google.*`) | Google |
| Site référent Instagram (`instagram.com`, `l.instagram.com`) ou navigateur intégré d'Instagram | Instagram |
| Site référent Facebook (`facebook.com`, `l.facebook.com`, `fb.com`) ou navigateur intégré de Facebook | Facebook |
| Site référent TikTok | TikTok |
| Autre site référent | Son nom de domaine seulement |
| Aucun référent | Accès direct |

Les navigateurs intégrés d'Instagram et de Facebook n'envoient souvent aucun référent : on lit donc aussi le **nom du navigateur**, analysé puis oublié.

**Garde-fous :**
- **jamais d'adresse IP**, ni dans l'email ni en base ;
- **un seul email par navigateur** ;
- **plafond d'alertes par jour** (🟡 40) : au-delà, la visite reste dans l'onglet Analytics, seul l'email est ignoré ;
- les emails de **commande ont toujours priorité** sur ces alertes ;
- aucun email sans consentement ; aucun lien avec un client ou une commande.

---

# 29. Assistant IA — bouton, textes et états [Ajout v1.2]

> Spécification : cahier §15.1 (P-47 à P-52). **Tous les textes ci-dessous sont proposés 🟡**, à valider par la cliente. Règle : l'assistant ne promet **aucun délai** (il ne rappelle que le délai indicatif de la source unique, RM-47), aucun prix hors données, aucune promotion (RM-42).

**Bouton flottant :** `Demander à l’assistant` (nom accessible : `Ouvrir l’assistant de [NOM DE LA BOUTIQUE]`). En bas à gauche ; sur une fiche produit mobile, au-dessus de la barre d'achat ; masqué quand un autre modal est ouvert. Ouvre le modal `#assistant` (le bouton Retour du téléphone le ferme).

**Message d'accueil :**
`Bonjour ! Je suis l’assistant de [NOM DE LA BOUTIQUE], une intelligence artificielle. Je peux vous aider à trouver un produit et vous expliquer la livraison et le paiement. Pour une commande, une réclamation ou une question de santé, l’équipe vous répond sur WhatsApp.`

**Rappel sous la zone de saisie :** `Ne saisissez ni téléphone, ni adresse, ni email ici. Les réponses sont générées par une IA : vérifiez prix et disponibilité dans le panier.`

**Puces de suggestion :** `Que me conseillez-vous ?` · `Comment commander ?` · `Comment fonctionne l’acompte ?` · `Livrez-vous chez moi ?`

**Cartes produit** (dans la conversation) : photo · nom · prix (promotion barrée) · `Voir la fiche` · `Ajouter au panier`. Le bouton `Ajouter au panier` est **le seul moyen** d'ajouter : l'assistant n'ajoute jamais seul. Après l'ajout : `Ajouté ✓`.

**Réponses types :**
- Information absente : `Je n’ai pas cette information et je préfère ne pas me tromper. Posez la question à l’équipe sur WhatsApp.`
- Sujet sensible (allergie, réaction de peau, grossesse, enfant, remboursement, réclamation) : `Pour cette question, il vaut mieux parler à l’équipe, et à un professionnel de santé si c’est une question de santé.` + bouton `Écrire sur WhatsApp`.
- État d'une commande : `Votre référence ouvre la page de confirmation de votre commande. Pour toute question, écrivez-nous sur WhatsApp.`
- Frais de livraison non fixés : `Les frais sont à confirmer par l’équipe après votre commande.` (RM-03)

**Boutons :** `Écrire sur WhatsApp` (résumé de la conversation prérempli, **sans coordonnées** ; absent si aucun numéro n'est configuré) · `Nouvelle conversation` · avis `Utile` / `Pas utile`.

**États :**
| Cas | Ce que voit le visiteur |
|---|---|
| Réponse en cours | Texte qui s'affiche au fil de l'eau ; animation désactivée en mouvement réduit |
| Trop de questions (limite atteinte) | `Vous avez posé beaucoup de questions. L’équipe vous répond volontiers sur WhatsApp.` + bouton WhatsApp |
| Panne, plafond du jour, aucun fournisseur disponible | `Je suis indisponible pour le moment. Écrivez-nous sur WhatsApp, l’équipe vous répondra.` + bouton WhatsApp |
| Assistant fermé (interrupteur) | Bouton non affiché |
| Cookies refusés | L'assistant fonctionne ; rien n'est enregistré (cahier P-50) |

**Interdits :** demander un téléphone, une adresse ou un email · annoncer un délai autre que le délai indicatif de la source unique (RM-47), une garantie ou une promotion · citer un prix qui ne vient pas d'une carte produit · donner un conseil médical.

---

# 30. Journal de la version 1.2

- **Fiche produit** (§23), **panier en feuille** (§24) et **en-tête mobile** (§1) alignés sur le code v0.8 et sur la référence mobile fournie.
- **Reçu de commande en ticket de caisse** téléchargé en PNG à la validation (§25) ; tampon « paiement non reçu », aucune donnée personnelle.
- **Effet « spaghetti »** sur les titres et les textes (§26, décision D-18) : textes **par mot** confirmés, titres à valider sur pièce.
- **Assistant IA** : bouton, accueil, cartes produit, réponses types et états (§29) ; ancre `#assistant` (§0) ; cahier §15.1.
- **Email « Nouvelle visite »** envoyé automatiquement à la vendeuse (§28, cahier P-45) : pays, province et provenance (Google, Instagram, Facebook…), sans adresse IP.
- **Mini-jeu** : pots réalistes, partie de 30 s, désactivé en mouvement réduit, rien de chargé avant le lancement (§15, décision D-19).
- **Cookies** : l'analytique maison (cahier D-17) impose une bannière de consentement et une page `/cookies` ; le paragraphe « aucune bannière » de la version 1.1 (§19) est remplacé (§27).
- Footer : lien **Gérer mes cookies** (§14) ; table des adresses (§0) ; états ajoutés (§18) ; éléments à obtenir ajoutés (§17).
- Ancrages : §0 à §22 et leurs textes de la version 1.1 sont inchangés, hors les ajouts marqués **[Ajout v1.2]**.

---

# 31. Journal de la version 1.3 [Ajout v1.3]

- **Public neutre** (D-28) : « Ce qu'on en dit » et « notre clientèle » remplacent les formulations au féminin de la section Avis (§9).
- **Délais indicatifs** (D-26) dans la FAQ (§11) : Abidjan 24 h, intérieur 72 h, international 5 à 15 jours ; point de départ à confirmer ; les frais restent à confirmer. L'assistant (§29) et les interdits (§23) citent ces délais comme **indicatifs**, jamais comme une garantie.
- **Variantes de produit** (D-24) : choix de l'option sur la fiche, feuille de choix au « + », option affichée dans le panier et sur le ticket (§23, §24, §25).
- **Effet « spaghetti »** (§26, D-29) : valeurs confirmées dans le code de Rabbit Shop ; trois écarts voulus (mots insécables, mouvement réduit, pas de délai sur le Hero).
- **Cookies** (§27) : Vercel Web Analytics ajouté à la liste de ce qui est mesuré (D-22).
- Aucun texte de la version 1.2 n'a été supprimé en dehors des passages marqués **[Modifié v1.3]**.
