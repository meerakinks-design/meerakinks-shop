'use client';

import { useId, useState, type ChangeEvent } from 'react';
import { adminApi } from '@/lib/admin-api';
import { uploadImageToCloudinary } from '@/lib/cloudinary-client';
import { cloudinaryThumbnail } from '@/lib/cloudinary-url';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_PRODUCT_IMAGES } from '@/lib/constants/images';
import type { ProductImageInput } from '@/lib/validation/product.schema';

interface ImageUploaderProps {
  images: ProductImageInput[];
  /** Reçoit une fonction de mise à jour : plusieurs envois peuvent se terminer en même temps. */
  onChange: (update: (current: ProductImageInput[]) => ProductImageInput[]) => void;
  defaultAlt: string;
  error?: string | undefined;
}

const isAllowedType = (type: string) => (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);

export function ImageUploader({ images, onChange, defaultAlt, error }: ImageUploaderProps) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ''; // permet de re-choisir le même fichier
    if (files.length === 0) return;

    const issues: string[] = [];
    const slotsLeft = MAX_PRODUCT_IMAGES - images.length;
    const accepted = files.slice(0, Math.max(slotsLeft, 0)).filter((file) => {
      if (!isAllowedType(file.type)) {
        issues.push(`« ${file.name} » : format refusé (JPG, PNG ou WebP uniquement).`);
        return false;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        issues.push(`« ${file.name} » : fichier trop lourd (8 Mo maximum).`);
        return false;
      }
      return true;
    });
    if (files.length > slotsLeft) issues.push(`${MAX_PRODUCT_IMAGES} photos maximum par produit.`);

    if (accepted.length > 0) {
      setIsUploading(true);
      const signature = await adminApi.uploads.sign();
      if (!signature.ok) {
        issues.push(signature.error.message);
      } else {
        for (const file of accepted) {
          const uploaded = await uploadImageToCloudinary(file, signature.data);
          if (uploaded.ok) {
            const added: ProductImageInput = { ...uploaded.data, alt: defaultAlt };
            onChange((current) => [...current, added]);
          } else {
            issues.push(uploaded.error.message);
          }
        }
      }
      setIsUploading(false);
    }
    setProblems(issues);
  }

  function move(index: number, direction: -1 | 1) {
    onChange((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });
  }

  const updateAlt = (index: number, alt: string) =>
    onChange((current) => current.map((image, position) => (position === index ? { ...image, alt } : image)));
  const remove = (index: number) => onChange((current) => current.filter((_, position) => position !== index));

  return (
    <fieldset className="field">
      <legend>Photos</legend>
      <p className="help-text">La première photo est la photo principale. JPG, PNG ou WebP, 8 Mo maximum chacune.</p>

      {images.length > 0 && (
        <ul className="image-grid">
          {images.map((image, index) => (
            <li key={image.publicId} className="image-card">
              {index === 0 && <span className="badge badge-ok">Principale</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cloudinaryThumbnail(image.url, 240)} alt={image.alt || 'Photo du produit'} width={120} height={120} loading="lazy" />
              <label className="visually-hidden" htmlFor={`${inputId}-alt-${index}`}>
                Description de la photo n°{index + 1}
              </label>
              <input
                id={`${inputId}-alt-${index}`}
                value={image.alt}
                onChange={(event) => updateAlt(index, event.target.value)}
                placeholder="Décris la photo"
                maxLength={125}
              />
              <div className="image-actions">
                <button type="button" className="btn btn-quiet" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Déplacer la photo n°${index + 1} vers la gauche`}>
                  ←
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label={`Déplacer la photo n°${index + 1} vers la droite`}>
                  →
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => remove(index)} aria-label={`Supprimer la photo n°${index + 1}`}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length < MAX_PRODUCT_IMAGES && (
        <div>
          <label className="btn btn-quiet file-button" htmlFor={inputId}>
            {isUploading ? 'Envoi en cours…' : images.length === 0 ? 'Ajouter des photos' : 'Ajouter d’autres photos'}
          </label>
          <input
            id={inputId}
            className="visually-hidden"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            multiple
            disabled={isUploading}
            onChange={handleFiles}
          />
        </div>
      )}

      <div aria-live="polite">
        {isUploading && <p className="help-text">Envoi des photos, ne ferme pas la page…</p>}
        {problems.map((problem) => (
          <p key={problem} className="field-error" role="alert">
            {problem}
          </p>
        ))}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </fieldset>
  );
}
