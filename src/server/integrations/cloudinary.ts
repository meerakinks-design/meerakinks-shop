import { createHash } from 'node:crypto';
import { CLOUDINARY_UPLOAD_FOLDER, UPLOAD_SETTINGS, type UploadKind } from '@/lib/constants/images';
import { getServerEnv } from '@/lib/env';
import { HttpError } from '@/server/http';
import { logError } from '@/server/logger';

export function getCloudinaryConfig() {
  const env = getServerEnv();
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'Le service d’images n’est pas configuré.');
  }
  return { cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, apiSecret: env.CLOUDINARY_API_SECRET };
}

/**
 * Signature Cloudinary : paramètres triés par nom, joints par « & », suivis du secret, puis SHA-1.
 * (Algorithme de la documentation Cloudinary, vérifié par un test sur l'exemple officiel.)
 */
export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}

/**
 * Signature d'un envoi direct navigateur → Cloudinary. Le secret ne quitte jamais le serveur ;
 * le navigateur ne reçoit que la signature, valable une heure, pour ce dossier et ces formats.
 * `kind` : « image » (JPG, PNG, WebP, GIF, AVIF) ou « vidéo » (WebM, MP4, MOV) ; chaque type a son dossier et ses formats.
 * On envoie directement à Cloudinary : une photo de téléphone dépasse la limite de 4,5 Mo
 * du corps d'une requête sur Vercel.
 */
export function createUploadSignature(nowMs: number = Date.now(), kind: UploadKind = 'image') {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const { folder, allowedFormats } = UPLOAD_SETTINGS[kind];
  const timestamp = Math.floor(nowMs / 1000);
  const signature = signCloudinaryParams({ allowed_formats: allowedFormats, folder, timestamp }, apiSecret);
  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    allowedFormats,
    resourceType: kind,
    signature,
  };
}

/**
 * Une image n'est acceptée que si elle vient de NOTRE compte Cloudinary et de NOTRE dossier :
 * sans cette vérification, un client pourrait enregistrer n'importe quelle URL externe comme photo.
 */
export function isOwnCloudinaryImage(image: { url: string; publicId: string }, cloudName: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(image.url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.search !== '' || parsed.hash !== '') return false;
  if (!parsed.pathname.startsWith(`/${cloudName}/image/upload/`)) return false;
  if (parsed.hostname !== 'res.cloudinary.com') return false;
  if (!image.publicId.startsWith(`${CLOUDINARY_UPLOAD_FOLDER}/`) || image.publicId.includes('..')) return false;
  return parsed.pathname.includes(`/${image.publicId}.`) || parsed.pathname.endsWith(`/${image.publicId}`);
}

/** Supprime des images chez Cloudinary. Au mieux : une panne ici ne doit jamais faire échouer l'enregistrement. */
export async function deleteCloudinaryAssets(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  let config: ReturnType<typeof getCloudinaryConfig>;
  try {
    config = getCloudinaryConfig();
  } catch {
    logError('cloudinary.delete_skipped', { reason: 'not_configured', count: publicIds.length });
    return;
  }
  for (const publicId of publicIds) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const body = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        invalidate: 'true',
        api_key: config.apiKey,
        signature: signCloudinaryParams({ invalidate: 'true', public_id: publicId, timestamp }, config.apiSecret),
      });
      const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) logError('cloudinary.delete_failed', { publicId, status: response.status });
    } catch (error) {
      logError('cloudinary.delete_error', { publicId }, error);
    }
  }
}
