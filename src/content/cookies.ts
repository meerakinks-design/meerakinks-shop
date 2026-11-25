import { CART_STORAGE_KEY, CART_TTL_MS } from '@/lib/shop/cart';
import { CONSENT_COOKIE_DAYS, CONSENT_COOKIE_NAME, type ConsentState } from '@/lib/consent';
import { ANALYTICS_STORAGE_KEYS } from '@/lib/consent';
import { ANALYTICS_DETAIL_RETENTION_DAYS, ANALYTICS_VISITOR_COOKIE_DAYS } from '@/lib/constants/retention';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';

// Textes de la bannière et de la page /cookies (landing §27, v1.3). 🟡 PROPOSÉS : à valider par la cliente et par un
// professionnel — ceci n'est pas un avis juridique. Ils décrivent ce qui est RÉELLEMENT mesuré : tant que l'analytique
// maison (étape 10) n'existe pas (`homeAnalytics` = false), seul Vercel Web Analytics est mentionné (D-22, RM-42).

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  /** Affiche, sous la section, les moyens de contact configurés dans les paramètres (jamais inventés). */
  showContact?: boolean;
  /** Lien interne sous la section. */
  link?: { href: string; label: string };
  /** Affiche, sous la section, l'identité du vendeur : seulement les éléments confirmés (jamais inventés). */
  showIdentity?: boolean;
}

export const COOKIES_TITLE = 'Gérer mes cookies';
export const COOKIES_INTRO =
  'Cette page explique ce que la boutique mesure, ce que fait chaque choix et ce qui est enregistré dans votre navigateur. Vous pouvez changer d’avis à tout moment.';

export const CONSENT_ACCEPT_LABEL = 'Accepter';
export const CONSENT_REFUSE_LABEL = 'Refuser';
export const CONSENT_LEARN_MORE_LABEL = 'En savoir plus sur les cookies';
export const CONSENT_BANNER_LABEL = 'Mesure d’audience et cookies';

export function bannerText(homeAnalytics: boolean): string {
  const measured = homeAnalytics
    ? 'pays et ville approximatifs, pages vues, boutons touchés et durée de visite'
    : 'pays et ville approximatifs, pages vues et provenance de la visite';
  return `Nous mesurons l’audience du site pour l’améliorer : ${measured}. Aucune adresse IP n’est conservée. Vous pouvez refuser, cela ne change rien à votre commande.`;
}

export const CHOICE_STATUS: Record<ConsentState, string> = {
  pending: 'Vérification de votre choix…',
  unset: 'Vous n’avez pas encore fait de choix : aucune mesure n’a lieu.',
  granted: 'Vous avez accepté la mesure d’audience.',
  denied: 'Vous avez refusé la mesure d’audience : rien n’est mesuré.',
};

export const CHOICE_TITLE = 'Votre choix actuel';

const days = (milliseconds: number) => Math.round(milliseconds / (24 * 60 * 60 * 1000));

export function cookiesSections(options: { homeAnalytics: boolean }): LegalSection[] {
  const { homeAnalytics } = options;

  const measured: LegalSection = {
    id: 'mesure',
    title: 'Ce qui est mesuré',
    paragraphs: homeAnalytics
      ? [
          'Avec votre accord, la boutique mesure l’audience du site : pays, région ou province et ville approximatifs, appareil, navigateur, provenance de la visite, pages vues, boutons touchés et durée de visite.',
          'Le pays, la région et la ville sont déduits de votre connexion par l’hébergeur du site : la boutique n’en conserve pas votre adresse IP, et ces statistiques ne sont pas reliées à votre commande ni à votre identité.',
          'À la première visite d’un navigateur qui a accepté, la boutique reçoit un email d’alerte : zone approximative, provenance (Google, Instagram, Facebook…), page d’arrivée, type d’appareil et heure. Il ne contient ni adresse IP ni identité, et le nombre d’alertes est plafonné chaque jour.',
          'Un second outil, Vercel Web Analytics, mesure aussi les pages vues et le pays ; il suit le même choix.',
        ]
      : [
          'Avec votre accord, la boutique utilise Vercel Web Analytics, un outil de mesure d’audience : il compte les pages vues et indique le pays, la région ou la province et la ville approximatifs, l’appareil, le navigateur et la provenance de la visite.',
          'Les mesures sont anonymes : elles ne sont rattachées ni à une personne ni à une adresse IP.',
        ],
  };

  const choices: LegalSection = {
    id: 'choix',
    title: 'Ce que fait chaque choix',
    paragraphs: [
      `« Accepter » active la mesure. « Refuser » la coupe : rien n’est mesuré et, si des données de mesure avaient été enregistrées pour ce navigateur, elles sont effacées${homeAnalytics ? ' (dans le navigateur et sur le serveur de la boutique)' : ''}.`,
      'Votre choix n’a aucune conséquence sur la navigation, le panier ou la commande.',
    ],
  };

  const stored: LegalSection = {
    id: 'navigateur',
    title: 'Ce qui est enregistré dans votre navigateur',
    paragraphs: [],
    items: [
      `Votre choix (« ${CONSENT_COOKIE_NAME} ») : conservé ${CONSENT_COOKIE_DAYS} jours.`,
      `Votre panier (« ${CART_STORAGE_KEY} ») : les produits et les quantités, conservés ${days(CART_TTL_MS)} jours pour que vous les retrouviez. Il est nécessaire au fonctionnement de la boutique et ne dépend pas de votre choix.`,
      'Un repère temporaire, effacé à la fermeture de l’onglet, qui permet de télécharger votre reçu juste après la commande.',
      ...(homeAnalytics
        ? [
            `Si vous acceptez : un identifiant aléatoire de visiteur (« ${ANALYTICS_STORAGE_KEYS[0]} »), conservé ${ANALYTICS_VISITOR_COOKIE_DAYS} jours, qui permet de reconnaître un navigateur qui revient. Il est effacé si vous refusez.`,
            `Si vous acceptez : un repère temporaire (« ${ANALYTICS_STORAGE_KEYS[1]} »), effacé à la fermeture de l’onglet, qui évite de signaler deux fois la même arrivée à la boutique.`,
          ]
        : []),
      'Vercel Web Analytics ne dépose pas de cookie tiers : il reconnaît un visiteur par une empreinte calculée à partir de sa requête, supprimée automatiquement au bout de 24 heures.',
    ],
  };

  const retention: LegalSection = {
    id: 'conservation',
    title: 'Conservation',
    paragraphs: [
      'Vercel Web Analytics ne garde pas d’identifiant de visiteur au-delà de 24 heures ; les statistiques agrégées sont conservées par Vercel.',
      ...(homeAnalytics
        ? [`Le détail des visites enregistrées par la boutique (visites, pages vues, boutons touchés) est supprimé au bout de ${ANALYTICS_DETAIL_RETENTION_DAYS} jours.`]
        : []),
    ],
  };

  const rights: LegalSection = {
    id: 'droits',
    title: 'Vos droits',
    paragraphs: ['Vous pouvez demander à accéder à vos données, à les faire corriger ou à les faire supprimer.'],
    showContact: true,
    link: { href: PUBLIC_ROUTES.privacy, label: 'Lire la politique de confidentialité' },
  };

  return [measured, choices, stored, retention, rights];
}
