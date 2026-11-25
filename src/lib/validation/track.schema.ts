import { z } from 'zod';
import { TRACK_EVENT_TYPES, TRACK_LIMITS, VISITOR_KEY_PATTERN, isTrackTarget } from '@/lib/analytics/events';

// Corps de POST /api/v1/track : aucune clé inconnue (`strict`), aucune chaîne libre au-delà des champs bornés ci-dessous,
// et un bouton doit porter un identifiant de la liste fermée (cahier §7.6 : « le serveur refuse tout identifiant hors liste »).

export const trackBodySchema = z
  .object({
    visitorKey: z.string().regex(VISITOR_KEY_PATTERN, 'Identifiant de visiteur invalide.'),
    type: z.enum(TRACK_EVENT_TYPES),
    path: z.string().max(300).optional(),
    target: z.string().max(40).optional(),
    utmSource: z.string().max(TRACK_LIMITS.utm * 2).optional(),
    referrer: z.string().max(300).optional(),
    /** Secondes d'activité écoulées depuis le signal précédent (signal d'activité seulement). */
    seconds: z.number().int().min(0).max(TRACK_LIMITS.heartbeatMaxSeconds).optional(),
  })
  .strict()
  .superRefine((body, context) => {
    if (body.type === 'click' && !isTrackTarget(body.target)) {
      context.addIssue({ code: 'custom', path: ['target'], message: 'Identifiant de bouton inconnu.' });
    }
    if ((body.type === 'page_view' || body.type === 'product_view') && !body.path) {
      context.addIssue({ code: 'custom', path: ['path'], message: 'Page manquante.' });
    }
  });

export type TrackBody = z.infer<typeof trackBodySchema>;

/** Corps de /track/arrival et /track/forget : seulement l'identifiant du navigateur. */
export const visitorKeyBodySchema = z.object({ visitorKey: z.string().regex(VISITOR_KEY_PATTERN, 'Identifiant de visiteur invalide.') }).strict();
