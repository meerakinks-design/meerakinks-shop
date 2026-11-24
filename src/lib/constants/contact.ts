// Formulaire de contact : sujets, canaux de réponse, limites et protections (même esprit que la commande).
export const CONTACT_TOPICS = ['PRODUCT', 'ORDER', 'AVAILABILITY', 'OTHER'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const REPLY_CHANNELS = ['WHATSAPP', 'EMAIL'] as const;
export type ReplyChannel = (typeof REPLY_CHANNELS)[number];

export const CONTACT_LIMITS = { name: 80, email: 120, message: 1200, messageMin: 10 } as const;

export const CONTACT_RATE_LIMITS = {
  perIp: { limit: 5, windowSeconds: 600 },
  perContact: { limit: 3, windowSeconds: 3600 },
} as const;
