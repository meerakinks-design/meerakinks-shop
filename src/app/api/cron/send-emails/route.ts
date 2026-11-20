import { assertCronAuthorized } from '@/server/auth/cron';
import { jsonOk, withApi } from '@/server/http';
import { processOutbox } from '@/server/services/notifications.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Reprise des emails en attente ou échoués (cahier RM-34). Appelée par Vercel Cron (GET, avec le secret) ; peut aussi
 * être lancée à la main : curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/send-emails
 */
export const GET = withApi(async (request) => {
  assertCronAuthorized(request);
  return jsonOk(await processOutbox());
});
