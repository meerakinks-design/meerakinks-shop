// Envoi direct navigateur → Cloudinary avec une signature fournie par notre serveur.
import type { UploadSignature } from '@/lib/admin-api';
import { NETWORK_FAILURE } from '@/lib/api-client';
import type { ApiResult } from '@/lib/api-result';

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
}

export async function uploadImageToCloudinary(
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
    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
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
        message: `« ${file.name} » n’a pas pu être envoyée. Vérifie le format (JPG, PNG ou WebP) et la taille.`,
        retryable: true,
      },
    };
  } catch {
    return NETWORK_FAILURE;
  }
}
