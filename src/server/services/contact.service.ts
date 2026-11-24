import { CONTACT_FORM_UNAVAILABLE_MESSAGE } from '@/content/contact-messages';
import { STORE_SETTINGS_ID } from '@/lib/constants/store';
import type { ContactInput } from '@/lib/validation/contact.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { createResendTransport, EmailSendError, getEmailConfig, type EmailTransport } from '@/server/integrations/resend';
import { logError, logInfo } from '@/server/logger';
import { buildContactEmail } from '@/server/services/contact-email';

/**
 * Envoie le message d'un client à la vendeuse, directement par Resend (aucune donnée gardée en base : le courriel est
 * la seule trace). Sans clé Resend ni expéditeur valide, ou sans adresse de notification : 503, jamais un faux succès.
 * Le client n'est pas relancé par courriel automatique (cela ferait de la boutique un relais de spam vers n'importe
 * quelle adresse). Le transport est injectable : les tests ne touchent jamais le réseau.
 */
export async function sendContactMessage(input: ContactInput, transport?: EmailTransport): Promise<void> {
  const config = getEmailConfig();
  if (!config) {
    logError('contact.not_configured');
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', CONTACT_FORM_UNAVAILABLE_MESSAGE);
  }
  const settings = await prisma.storeSettings.findUnique({
    where: { id: STORE_SETTINGS_ID },
    select: { storeName: true, notificationEmail: true },
  });
  if (!settings?.notificationEmail) {
    logError('contact.no_recipient');
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', CONTACT_FORM_UNAVAILABLE_MESSAGE);
  }

  const email = buildContactEmail(input, settings.storeName);
  try {
    await (transport ?? createResendTransport(config.apiKey)).send({
      ...email,
      from: config.from,
      to: settings.notificationEmail,
      ...(input.replyChannel === 'EMAIL' && input.email ? { replyTo: input.email } : {}),
      idempotencyKey: `contact:${input.idempotencyKey}`,
    });
    logInfo('contact.sent', { topic: input.topic, channel: input.replyChannel });
  } catch (error) {
    // Jamais d'adresse ni de contenu dans le journal : le sujet et le code HTTP suffisent.
    logError('contact.failed', { topic: input.topic, status: error instanceof EmailSendError ? error.status : null });
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', CONTACT_FORM_UNAVAILABLE_MESSAGE, { retryable: true });
  }
}
