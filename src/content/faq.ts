import { formatFcfa } from '@/lib/money';

export interface FaqItem {
  question: string;
  answer: string;
}

// Textes v1.0 (§2.12). Les montants viennent des paramètres, jamais écrits en dur. Les délais restent INDICATIFS :
// ils ne sont jamais présentés comme une garantie.
export function faqItems(depositAmount: number, storeName = 'Meëra Kinks'): FaqItem[] {
  const deposit = formatFcfa(depositAmount);
  return [
    {
      question: 'Comment choisir les soins adaptés à mon besoin ?',
      answer:
        'La gamme est organisée par besoin et par couleur. Repérez la famille qui correspond à votre routine, puis consultez la fiche de chaque produit pour découvrir ses caractéristiques et ses conseils d’utilisation.',
    },
    {
      question: 'Comment passer une commande ?',
      answer:
        'Choisissez vos produits, ajoutez-les au panier puis remplissez le formulaire de commande. Votre commande est enregistrée sur le site. Notre équipe vous contacte ensuite sur WhatsApp pour vérifier les informations, confirmer la disponibilité et vous communiquer les modalités de paiement et de livraison.',
    },
    {
      question: 'Quels sont les moyens de paiement ?',
      answer: `À Abidjan, un acompte de ${deposit} est demandé pour confirmer la commande. Le solde est réglé à la livraison. Hors d’Abidjan et à l’international, le paiement intégral est requis avant expédition. Le paiement s’effectue par Wave au numéro communiqué par la vendeuse après confirmation.`,
    },
    {
      question: 'Pourquoi dois-je verser un acompte à Abidjan ?',
      answer: `L’acompte de ${deposit} permet de confirmer votre commande. Le solde est réglé à la réception. Notre équipe vous communique les modalités de paiement après avoir vérifié votre commande.`,
    },
    {
      question: 'Livrez-vous en dehors d’Abidjan ?',
      answer:
        'Oui, les commandes de l’intérieur du pays et de l’étranger peuvent être étudiées. Notre équipe vérifie votre destination, la disponibilité des produits et les modalités d’expédition avant de confirmer la commande.',
    },
    {
      question: 'Quels sont les frais de livraison ?',
      answer:
        'Les frais exacts dépendent de votre destination. Ils vous sont communiqués par la vendeuse après réception de votre commande. Pour les commandes hors d’Abidjan et à l’international, les frais d’expédition sont inclus dans le montant à régler avant l’envoi.',
    },
    {
      question: 'Quels sont les délais de livraison ?',
      answer:
        'Les délais communiqués sont indicatifs : 24 h à Abidjan, 72 h à l’intérieur de la Côte d’Ivoire et 5 à 15 jours à l’international. Le délai applicable et son point de départ sont à confirmer avec l’équipe selon votre destination et votre commande.',
    },
    {
      question: 'Puis-je modifier ou annuler ma commande ?',
      answer:
        'Contactez rapidement notre équipe sur WhatsApp en indiquant votre référence de commande. La possibilité de modification ou d’annulation dépend de l’état de préparation de la commande. Les modalités de remboursement doivent être confirmées par la vendeuse.',
    },
    {
      question: `Comment contacter ${storeName} ?`,
      answer:
        'Vous pouvez nous écrire sur WhatsApp ou utiliser le formulaire de contact. Après l’envoi de votre commande, notre équipe peut également vous contacter sur WhatsApp pour confirmer les informations utiles.',
    },
  ];
}
