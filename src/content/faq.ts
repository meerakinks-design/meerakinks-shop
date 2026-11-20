import { formatFcfa } from '@/lib/money';

export interface FaqItem {
  question: string;
  answer: string;
}

// Textes du document de la landing (§11). Les montants viennent des paramètres, jamais écrits en dur.
export function faqItems(depositAmount: number): FaqItem[] {
  const deposit = formatFcfa(depositAmount);
  return [
    {
      question: 'Comment passer une commande ?',
      answer:
        'Parcourez la boutique, choisissez les produits qui vous intéressent et ajoutez-les à votre panier. Lorsque votre sélection est prête, ouvrez votre panier, vérifiez les articles et remplissez le formulaire de commande. Votre commande est enregistrée sur le site. Notre équipe vous contacte ensuite sur WhatsApp pour vérifier les informations et confirmer les prochaines étapes.',
    },
    {
      question: 'Quels sont les moyens de paiement ?',
      answer:
        'Le paiement de l’acompte à Abidjan et le paiement intégral des commandes hors d’Abidjan et à l’international s’effectuent par Wave. Le numéro de paiement et les instructions vous sont communiqués par la vendeuse après confirmation de votre commande. Le numéro Wave n’est pas affiché publiquement sur le site.',
    },
    {
      question: 'Comment fonctionne l’acompte à Abidjan ?',
      answer: `Pour les commandes dans les communes d’Abidjan, un acompte de ${deposit} est demandé pour confirmer la commande. Le solde est réglé à la réception. L’équipe vous contacte après réception de votre commande pour vérifier les informations et vous communiquer les modalités de paiement.`,
    },
    {
      question: 'Livrez-vous hors d’Abidjan et à l’étranger ?',
      answer:
        'Les commandes provenant de l’intérieur du pays et de l’étranger sont prises en compte. Pour ces destinations, le paiement intégral est requis avant l’expédition. L’équipe vous contacte afin de confirmer la disponibilité des produits, la destination et les modalités d’expédition.',
    },
    {
      question: 'Quels sont les frais et les délais de livraison ?',
      answer:
        'Les frais exacts sont communiqués par la vendeuse après réception de votre commande et vérification de votre destination. Pour les commandes hors d’Abidjan et à l’international, les frais d’expédition sont inclus dans le montant à régler. Les délais et les zones effectivement desservies doivent être confirmés par l’équipe avant validation définitive.',
    },
    {
      question: 'Comment contacter la vendeuse ?',
      answer:
        'Vous pouvez échanger avec notre équipe sur WhatsApp. Après l’envoi de votre commande, nous vous contactons également sur WhatsApp pour vérifier les informations, confirmer la disponibilité des produits et vous communiquer les modalités de paiement et de livraison.',
    },
  ];
}
