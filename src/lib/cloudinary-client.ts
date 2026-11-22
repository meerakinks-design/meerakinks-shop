// Envoi direct navigateur → Cloudinary avec une signature fournie par notre serveur.
// Rien de ce qui est envoyé depuis le back-office ne passe par le disque de notre serveur.
import type { UploadSignature } from '@/lib/admin-api';
import { NETWORK_FAILURE } from '@/lib/api-client';
import type { ApiResult } from '@/lib/api-result';
import type { UploadKind } from '@/lib/constants/images';

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
}

const FORMAT_HINT: Record<UploadKind, string> = {
  image: 'JPG, PNG, WebP, GIF ou AVIF',
  video: 'WebM, MP4 ou MOV',
};

export async function uploadMediaToCloudinary(
  file: File,
  signature: UploadSignature,
): Promise<ApiResult<{ url: string; publicId: string }>> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('allowed_formats', signature.allowedFormats);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`, {
      method: 'POST',
      body: form,
    });
    const payload = (await response.json().catch(() => null)) as CloudinaryUploadResponse | null;
    if (response.ok && payload?.secure_url && payload.public_id) {
      return { ok: true, data: { url: payload.secure_url, publicId: payload.public_id } };
    }
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `« ${file.name} » n’a pas pu être envoyé. Vérifie le format (${FORMAT_HINT[signature.resourceType]}) et la taille.`,
        retryable: true,
      },
    };
  } catch {
    return NETWORK_FAILURE;
  }
}

/** Nom conservé : le formulaire produit envoie des photos. */
export const uploadImageToCloudinary = uploadMediaToCloudinary;
