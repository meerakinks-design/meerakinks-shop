import { assertCronAuthorized } from '@/server/auth/cron';
import { jsonOk, withApi } from '@/server/http';
import { runRetentionJob } from '@/server/services/customer-data.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Tâche quotidienne (Vercel Cron, GET, avec le secret) :
 *  1. toujours : supprime les empreintes anti-abus expirées ;
 *  2. seulement si RETENTION_PURGE_ENABLED=1 : anonymise un lot de clients arrivés en fin de conservation.
 * La purge des clients est fermée par défaut : la durée (CUSTOMER_RETENTION_MONTHS) doit d'abord être validée.
 * Lancement à la main : curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/retention
 */
export const GET = withApi(async (request) => {
  assertCronAuthorized(request);
  return jsonOk(await runRetentionJob({ purgeCustomers: process.env.RETENTION_PURGE_ENABLED === '1' }));
});
