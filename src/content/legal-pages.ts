import { DEFAULT_DELAYS, faqDelayAnswer, type DelaySummary, type DeliveryNotes } from '@/lib/shop/delivery-delay';
import { formatFcfa } from '@/lib/money';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { PAYMENT_OUTSIDE, paymentAbidjan } from '@/content/livraison';
import { HOST, LEGAL_DETAILS } from '@/content/legal-details';
import { COOKIES_TITLE, type LegalSection } from '@/content/cookies';
import { PRIVACY_TITLE } from '@/content/privacy';

// CGV, CGU et mentions légales (MD « Textes du site » §9, cahier §14, Module 8 du Juriste AKATech v8).
// 🟡 TEXTES PROPOSÉS, rédigés à partir de ce que le site fait réellement et de ce que la cliente a confirmé : à valider
// par la cliente ET par un professionnel avant publication — ceci n'est pas un avis juridique. Aucune raison sociale,
// aucune adresse, aucun identifiant n'est inventé : ils viennent des paramètres (`legalName`, `address`) ou de
// `legal-details.ts`, et une information absente n'est pas affichée. Les règles de paiement et les délais viennent de
// la source unique (`livraison.ts`, `delivery-delay.ts`) : ces pages ne peuvent pas contredire la FAQ ni le formulaire.
// Ce qui dépend d'un choix de la vendeuse (retours, remboursement de l'acompte) n'est PAS inventé : le texte le dit.

export const CGV_TITLE = 'Conditions générales de vente';
export const CGU_TITLE = 'Conditions générales d’utilisation';
export const LEGAL_NOTICE_TITLE = 'Mentions légales';

export const cgvIntro = (storeName: string) =>
  `Les présentes conditions précisent les modalités de commande, de paiement et de livraison des produits proposés par ${storeName}. Elles doivent être lues avant toute commande.`;

export const cguIntro = (storeName: string) =>
  `Ces conditions encadrent l’accès et l’utilisation du site ${storeName}. En naviguant sur le site, vous acceptez les règles applicables à son utilisation.`;

export const legalNoticeIntro = (storeName: string) => `Informations légales relatives au site ${storeName}.`;

export interface CgvOptions {
  storeName: string;
  depositAmount: number;
  delays?: DelaySummary;
  notes?: DeliveryNotes;
}

export function cgvSections({ storeName, depositAmount, delays = DEFAULT_DELAYS, notes }: CgvOptions): LegalSection[] {
  return [
    {
      id: 'vendeur',
      title: '1. Qui vend ?',
      paragraphs: [`Les produits sont vendus par ${storeName}, dont les coordonnées figurent ci-dessous et dans les mentions légales.`],
      showIdentity: true,
      link: { href: PUBLIC_ROUTES.legalNotice, label: LEGAL_NOTICE_TITLE },
    },
    {
      id: 'produits',
      title: '2. Produits et informations affichées',
      paragraphs: [
        'Chaque fiche produit présente le nom, la description, le prix et, lorsqu’elles existent, les variantes du produit. Ces informations sont fournies par la boutique.',
        'La disponibilité est confirmée par l’équipe avant la validation de votre commande. Les descriptions présentent les caractéristiques des produits : elles ne constituent ni un avis médical ni la garantie d’un résultat.',
      ],
    },
    {
      id: 'prix',
      title: '3. Prix et frais',
      paragraphs: [
        'Les prix sont indiqués en francs CFA (FCFA), tels qu’affichés sur le site au moment de votre commande.',
        'Le montant affiché dans le panier est une estimation : le total définitif, avec les frais de livraison, vous est communiqué par la boutique après réception de votre commande.',
        'Les frais de livraison dépendent de votre destination. Pour les commandes hors d’Abidjan et à l’international, les frais d’expédition sont inclus dans le montant à régler avant l’envoi.',
      ],
    },
    {
      id: 'commande',
      title: '4. Passer et confirmer une commande',
      paragraphs: ['La commande se fait en français, en quelques étapes :'],
      items: [
        'Vous ajoutez les produits au panier, puis vous remplissez le formulaire de commande.',
        'Avant l’envoi, vous pouvez modifier votre panier et vos informations, et relire la note sur le paiement et la livraison.',
        'À l’envoi, votre commande est enregistrée et reçoit une référence. Une page de confirmation s’affiche, avec un reçu à télécharger ; si vous avez indiqué une adresse email, un accusé de réception vous y est aussi envoyé.',
        'L’équipe vous contacte ensuite sur WhatsApp pour vérifier les informations, confirmer la disponibilité des produits, préciser les frais de livraison et communiquer les modalités de paiement.',
        'Votre commande est confirmée une fois ces points validés et le paiement demandé reçu (voir ci-dessous).',
      ],
    },
    {
      id: 'paiement',
      title: '5. Paiement',
      paragraphs: [
        paymentAbidjan(depositAmount),
        PAYMENT_OUTSIDE,
        'Le paiement s’effectue par Wave, au numéro communiqué par la vendeuse après confirmation de la commande. Le site ne collecte aucun numéro de carte bancaire.',
      ],
    },
    {
      id: 'livraison',
      title: '6. Livraison',
      paragraphs: [
        'Les zones desservies sont celles proposées dans le formulaire de commande. Les commandes de l’intérieur du pays et de l’étranger sont étudiées : l’équipe vérifie votre destination, la disponibilité des produits et les modalités d’expédition avant de confirmer.',
        faqDelayAnswer(delays),
        'Un délai indicatif n’est pas une date garantie : il peut varier selon votre destination et votre commande.',
        ...(notes?.leadTimeNote ? [notes.leadTimeNote] : []),
        ...(notes?.rules ? [notes.rules] : []),
        'Pour que la livraison se passe bien, indiquez une adresse précise et un numéro de téléphone sur lequel on peut vous joindre.',
      ],
    },
    {
      id: 'annulation',
      title: '7. Modification, annulation, retours et remboursements',
      paragraphs: [
        'Pour modifier ou annuler une commande, contactez rapidement l’équipe sur WhatsApp en indiquant votre référence de commande. La possibilité de modification ou d’annulation dépend de l’état de préparation de la commande.',
        `Les modalités de retour et de remboursement, notamment pour l’acompte de ${formatFcfa(depositAmount)}, sont confirmées par la vendeuse selon la situation de votre commande.`,
      ],
    },
    {
      id: 'reclamations',
      title: '8. Réclamations et contact',
      paragraphs: ['Pour une question ou une réclamation, contactez la boutique en indiquant votre référence de commande.'],
      showContact: true,
    },
    {
      id: 'droit',
      title: '9. Droit applicable et règlement des différends',
      paragraphs: [
        'Les présentes conditions sont soumises au droit ivoirien, y compris les actes uniformes de l’OHADA applicables au commerce.',
        'En cas de difficulté, nous vous invitons d’abord à contacter la boutique pour chercher une solution amiable. À défaut, le litige relève des juridictions compétentes.',
      ],
    },
    {
      id: 'donnees',
      title: '10. Vos données',
      paragraphs: ['Les données de votre commande sont traitées comme l’explique la politique de confidentialité.'],
      link: { href: PUBLIC_ROUTES.privacy, label: PRIVACY_TITLE },
    },
  ];
}

export function cguSections({ storeName }: { storeName: string }): LegalSection[] {
  return [
    {
      id: 'service',
      title: '1. Présentation du service',
      paragraphs: [
        `Le site ${storeName} présente une sélection de produits de beauté et d’accessoires et permet d’envoyer une commande à la boutique. Le mini-jeu Cosmetic Smash, au bas des pages, est un simple divertissement : il est gratuit, sans lot ni gain, et vos scores ne sont pas enregistrés.`,
      ],
    },
    {
      id: 'acces',
      title: '2. Accès au site et disponibilité',
      paragraphs: [
        'Le site est accessible gratuitement depuis un navigateur. La boutique s’efforce de le maintenir disponible, sans garantir l’absence d’interruption (maintenance, incident technique, indisponibilité d’un prestataire).',
        'Cela ne limite pas les droits que vous tenez de la loi lorsque vous passez une commande.',
      ],
    },
    {
      id: 'catalogue',
      title: '3. Utilisation du catalogue et des contenus',
      paragraphs: ['Le catalogue, les fiches produits et les textes du site sont destinés à votre usage personnel. Vous vous engagez à ne pas :'],
      items: [
        'perturber le fonctionnement du site ou chercher à en contourner les protections ;',
        'utiliser des moyens automatisés pour passer des commandes ou copier le catalogue ;',
        'envoyer de fausses commandes ou des informations qui ne sont pas les vôtres.',
      ],
    },
    {
      id: 'exactitude',
      title: '4. Exactitude des informations que vous transmettez',
      paragraphs: [
        'Les informations saisies dans le formulaire de commande (nom, téléphone, destination, adresse) doivent être exactes : elles servent à vous contacter et à vous livrer. Une information erronée peut retarder ou empêcher la livraison.',
      ],
    },
    {
      id: 'propriete',
      title: '5. Propriété intellectuelle',
      paragraphs: [
        `Sauf mention contraire, le nom ${storeName}, le logo, les textes, les photographies et les visuels du site appartiennent à la boutique ou sont utilisés avec l’accord de leurs titulaires. Toute reproduction ou réutilisation sans autorisation écrite est interdite.`,
      ],
    },
    {
      id: 'responsabilite',
      title: '6. Responsabilité',
      paragraphs: [
        'La boutique apporte le plus grand soin aux informations du site, mais ne garantit pas qu’il soit exempt d’erreurs. En cas d’erreur manifeste sur une fiche produit, l’équipe vous en informe avant de confirmer votre commande.',
        'Les liens vers d’autres services (WhatsApp, Instagram, TikTok, Facebook) mènent à des sites que la boutique ne contrôle pas ; leurs conditions leur sont propres.',
      ],
    },
    {
      id: 'donnees',
      title: '7. Données personnelles et cookies',
      paragraphs: ['Les données collectées et vos choix de mesure d’audience sont expliqués dans deux pages dédiées.'],
      link: { href: PUBLIC_ROUTES.privacy, label: PRIVACY_TITLE },
    },
    {
      id: 'droit',
      title: '8. Contact et droit applicable',
      paragraphs: ['Pour toute question sur l’utilisation du site, contactez la boutique. Ces conditions sont soumises au droit ivoirien.'],
      showContact: true,
      link: { href: PUBLIC_ROUTES.cookies, label: COOKIES_TITLE },
    },
  ];
}

export function legalNoticeSections({ storeName }: { storeName: string }): LegalSection[] {
  const { publicationDirector } = LEGAL_DETAILS;
  return [
    {
      id: 'editeur',
      title: 'Éditeur du site',
      paragraphs: [`Le site ${storeName} est édité par le vendeur dont l’identité figure ci-dessous.`],
      showIdentity: true,
    },
    ...(publicationDirector
      ? [{ id: 'publication', title: 'Directeur de la publication', paragraphs: [publicationDirector] } satisfies LegalSection]
      : []),
    {
      id: 'contact',
      title: 'Contact',
      paragraphs: [],
      showContact: true,
    },
    {
      id: 'hebergeur',
      title: 'Hébergeur',
      paragraphs: [`Le site est hébergé par ${HOST.name}, ${HOST.address}. Site web : ${HOST.website.replace('https://', '')}.`],
    },
    {
      id: 'propriete',
      title: 'Propriété intellectuelle',
      paragraphs: [
        `Sauf mention contraire, le nom ${storeName}, le logo, les textes, les photographies et les visuels du site appartiennent à la boutique ou sont utilisés avec l’accord de leurs titulaires. Toute reproduction sans autorisation écrite est interdite.`,
      ],
    },
    {
      id: 'donnees',
      title: 'Données personnelles',
      paragraphs: ['Le traitement de vos données et vos choix de mesure d’audience sont expliqués dans la politique de confidentialité et sur la page de gestion des cookies.'],
      link: { href: PUBLIC_ROUTES.privacy, label: PRIVACY_TITLE },
    },
  ];
}
