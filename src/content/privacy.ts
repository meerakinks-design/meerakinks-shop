import { ANALYTICS_DETAIL_RETENTION_DAYS, CUSTOMER_RETENTION_MONTHS, RATE_LIMIT_FINGERPRINT_MAX_DAYS } from '@/lib/constants/retention';
import { DATA_AUTHORITY } from '@/content/legal-details';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { COOKIES_TITLE, type LegalSection } from '@/content/cookies';

// Politique de confidentialité (cahier P-09, P-44). 🟡 TEXTE PROPOSÉ, rédigé à partir de ce que le site fait réellement
// (formulaire de commande, prestataires, durées) : à valider par la cliente et par un professionnel — ceci n'est pas
// un avis juridique (cahier §14.2). Les durées viennent de `retention.ts` : texte et comportement ne peuvent pas diverger.

export const PRIVACY_TITLE = 'Politique de confidentialité';

export function privacyIntro(storeName: string): string {
  return `${storeName} (« la boutique ») explique ici quelles données elle collecte quand vous visitez le site ou passez commande, pourquoi, avec qui elles sont partagées, combien de temps elles sont gardées et comment exercer vos droits.`;
}

export function privacySections(options: { homeAnalytics: boolean }): LegalSection[] {
  const { homeAnalytics } = options;

  return [
    {
      id: 'responsable',
      title: 'Qui est responsable de vos données ?',
      paragraphs: ['La boutique est responsable des données collectées sur ce site. Pour la joindre, voir « Vos droits » plus bas.'],
      showIdentity: true,
    },
    {
      id: 'donnees',
      title: 'Quelles données sont collectées ?',
      paragraphs: [],
      items: [
        'Quand vous commandez : nom complet, numéro de téléphone, adresse email (facultative), zone de livraison, commune, ville ou pays, adresse de livraison et précisions, message éventuel et contenu de la commande.',
        'Ensuite, la boutique enregistre le suivi de votre commande : statuts, paiements (montants et dates) et notes de suivi.',
        'Le site ne collecte aucun numéro de carte bancaire.',
        `Quand vous visitez le site : des données techniques (adresse IP, date, page demandée) sont traitées par l’hébergeur pour afficher le site et le protéger. Pour limiter les abus (commandes répétées, tentatives de connexion), le site compte les demandes pendant 10 minutes à 1 heure à partir d’une empreinte de votre adresse IP et de votre numéro de téléphone (et non des valeurs elles-mêmes), supprimée automatiquement au plus tard ${RATE_LIMIT_FINGERPRINT_MAX_DAYS} jours après.`,
        homeAnalytics
          ? 'Si vous l’acceptez : des statistiques de visite (pays, région et ville approximatifs, type d’appareil et navigateur, provenance de la visite, pages vues, boutons touchés, durée de visite). La zone est déduite de votre connexion par l’hébergeur : la boutique n’en conserve pas votre adresse IP. Ces statistiques ne sont pas reliées à votre commande ni à votre identité.'
          : 'Si vous l’acceptez : des statistiques de visite (pays, ville approximative, pages vues, provenance de la visite). Aucune adresse IP n’est conservée.',
      ],
    },
    {
      id: 'finalites',
      title: 'Pourquoi ces données ?',
      paragraphs: [],
      items: [
        'Enregistrer, confirmer et livrer votre commande.',
        'Vous contacter (appel, WhatsApp ou email) au sujet de votre commande.',
        'Établir votre reçu et suivre les paiements.',
        'Protéger le site contre les abus.',
        'Mesurer l’audience du site pour l’améliorer, uniquement si vous l’acceptez.',
      ],
    },
    {
      id: 'fondement',
      title: 'Sur quel fondement ?',
      paragraphs: [
        'Traiter votre commande, vous contacter et vous livrer est nécessaire pour répondre à votre demande. Protéger le site contre les abus répond à un besoin de sécurité de la boutique.',
        'La mesure d’audience repose uniquement sur votre accord : vous pouvez le donner ou le refuser sans conséquence sur votre commande, et le retirer à tout moment.',
      ],
    },
    {
      id: 'destinataires',
      title: 'Qui reçoit vos données ?',
      paragraphs: [],
      items: [
        'La vendeuse et les personnes qu’elle autorise à gérer les commandes.',
        'Le livreur ou le service de livraison choisi par la boutique : votre nom, votre téléphone et votre adresse, pour livrer votre commande.',
        'Vercel : hébergement du site et, si vous l’acceptez, mesure d’audience.',
        'Neon : base de données où sont enregistrées les commandes.',
        'Resend : envoi des emails (confirmation de commande si vous avez indiqué votre adresse email, alertes à la boutique).',
        'Cloudinary : diffusion des photos des produits (votre navigateur les télécharge depuis ses serveurs).',
        'WhatsApp : si vous choisissez d’écrire à la boutique par WhatsApp, votre message passe par ce service, selon ses propres conditions.',
        'Wave : le paiement s’effectue par Wave, selon ses propres conditions.',
        'La boutique ne vend pas vos données et ne les transmet pas à des sociétés de publicité.',
      ],
    },
    {
      id: 'transferts',
      title: 'Vos données quittent-elles la Côte d’Ivoire ?',
      paragraphs: [
        'Oui, en partie : Vercel, Neon et Cloudinary peuvent traiter vos données dans d’autres pays, notamment aux États-Unis ou en Europe. Chacun publie ses engagements de protection des données (accords de traitement des données, clauses contractuelles types). Resend et WhatsApp appliquent leurs propres conditions.',
      ],
    },
    {
      id: 'durees',
      title: 'Combien de temps ?',
      paragraphs: [
        `Vos données de commande (nom, téléphone, email, adresse) sont conservées ${CUSTOMER_RETENTION_MONTHS} mois après votre dernière commande, puis anonymisées : votre nom, votre téléphone, votre email et votre adresse sont effacés. Les montants, les dates et les articles des commandes sont gardés par la boutique, sans rien qui permette de vous identifier.`,
        'Les emails envoyés à votre attention sont effacés en même temps.',
        'La mesure d’audience a ses propres durées, indiquées sur la page « ' + COOKIES_TITLE + ' ».',
        ...(homeAnalytics ? [`Le détail des visites mesurées par la boutique est supprimé au bout de ${ANALYTICS_DETAIL_RETENTION_DAYS} jours.`] : []),
      ],
      link: { href: PUBLIC_ROUTES.cookies, label: COOKIES_TITLE },
    },
    {
      id: 'securite',
      title: 'Comment vos données sont-elles protégées ?',
      paragraphs: [],
      items: [
        'Le site est servi par une connexion chiffrée (HTTPS).',
        'Le suivi des commandes est réservé aux personnes autorisées par la boutique, protégé par un mot de passe.',
        'La boutique ne garde qu’une empreinte, et non les valeurs elles-mêmes, de votre adresse IP et de votre téléphone pour limiter les abus.',
      ],
    },
    {
      id: 'droits',
      title: 'Vos droits',
      paragraphs: [
        'Vous pouvez demander à accéder à vos données, à les faire corriger ou à les faire supprimer. Si vous demandez la suppression, votre nom, votre téléphone, votre email et votre adresse sont effacés ; la commande reste dans les comptes de la boutique, sans rien qui permette de vous identifier. Une commande encore en cours (ni livrée ni annulée) doit d’abord être terminée.',
        'Vous pouvez aussi retirer votre accord à la mesure d’audience à tout moment, sur la page « ' + COOKIES_TITLE + ' ».',
        'La boutique vous répond dans les meilleurs délais.',
        `Si vous estimez que vos droits ne sont pas respectés, vous pouvez vous adresser à l’ARTCI, l’autorité ivoirienne de protection des données personnelles, à l’adresse ${DATA_AUTHORITY.email}.`,
      ],
      showContact: true,
    },
    {
      id: 'mises-a-jour',
      title: 'Mises à jour de cette page',
      paragraphs: ['Cette page peut évoluer, par exemple si la boutique change de prestataire. La date de la dernière mise à jour est indiquée en haut de la page.'],
    },
  ];
}
