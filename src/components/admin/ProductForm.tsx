'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import type { ApiFieldErrors } from '@/lib/api-result';
import { PRODUCT_STATUSES, PRODUCT_STATUS_HELP, PRODUCT_STATUS_LABELS, type ProductStatusValue } from '@/lib/constants/product';
import { productPath } from '@/lib/constants/routes';
import { parseFcfaInput } from '@/lib/money';
import { slugify } from '@/lib/slug';
import type { ProductFormInput, ProductImageInput } from '@/lib/validation/product.schema';
import { parseWeightToGrams, splitGrams, type WeightUnit } from '@/lib/weight';
import { ImageUploader } from './ImageUploader';

export interface ProductFormInitial {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  description: string;
  characteristics: string[];
  usageAdvice: string | null;
  price: number;
  salePrice: number | null;
  weightGrams: number | null;
  sku: string | null;
  stock: number | null;
  status: ProductStatusValue;
  isFeatured: boolean;
  seoTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
  images: ProductImageInput[];
}

interface ProductFormProps {
  initial?: ProductFormInitial;
  categories: Array<{ id: string; name: string; isArchived?: boolean }>;
}

interface FormValues {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  salePrice: string;
  weight: string;
  weightUnit: WeightUnit;
  sku: string;
  trackStock: boolean;
  stock: string;
  description: string;
  characteristics: string; // une caractéristique par ligne
  usageAdvice: string;
  status: ProductStatusValue;
  isFeatured: boolean;
  seoTitle: string;
  metaDescription: string;
  sortOrder: string;
  images: ProductImageInput[];
}

function toFormValues(initial?: ProductFormInitial): FormValues {
  const weight = initial?.weightGrams != null ? splitGrams(initial.weightGrams) : { value: '', unit: 'g' as WeightUnit };
  return {
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    categoryId: initial?.categoryId ?? '',
    price: initial ? String(initial.price) : '',
    salePrice: initial?.salePrice != null ? String(initial.salePrice) : '',
    weight: weight.value,
    weightUnit: weight.unit,
    sku: initial?.sku ?? '',
    trackStock: initial ? initial.stock !== null : false,
    stock: initial?.stock != null ? String(initial.stock) : '',
    description: initial?.description ?? '',
    characteristics: initial?.characteristics.join('\n') ?? '',
    usageAdvice: initial?.usageAdvice ?? '',
    status: initial?.status ?? 'DRAFT',
    isFeatured: initial?.isFeatured ?? false,
    seoTitle: initial?.seoTitle ?? '',
    metaDescription: initial?.metaDescription ?? '',
    sortOrder: String(initial?.sortOrder ?? 0),
    images: initial?.images ?? [],
  };
}

export function ProductForm({ initial, categories }: ProductFormProps) {
  const router = useRouter();
  const formId = useId();
  const isEdit = initial !== undefined;

  const [values, setValues] = useState<FormValues>(() => toFormValues(initial));
  // En création, le lien suit le nom tant qu'on ne l'a pas modifié à la main.
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const setValue = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function handleNameChange(name: string) {
    setValues((current) => ({ ...current, name, slug: slugEdited ? current.slug : slugify(name) }));
  }

  function failWith(message: string, fields: ApiFieldErrors = {}) {
    setFormError(message);
    setFieldErrors(fields);
    setIsPending(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const price = parseFcfaInput(values.price);
    const salePrice = values.salePrice.trim() === '' ? null : parseFcfaInput(values.salePrice);
    const stock = values.trackStock ? parseFcfaInput(values.stock) : null;
    const weightGrams = values.weight.trim() === '' ? null : parseWeightToGrams(values.weight, values.weightUnit);

    const clientErrors: ApiFieldErrors = {};
    if (price === null) clientErrors.price = ['Indique un prix en FCFA.'];
    if (values.salePrice.trim() !== '' && salePrice === null) clientErrors.salePrice = ['Indique un prix promotionnel en FCFA, ou laisse vide.'];
    if (values.trackStock && stock === null) clientErrors.stock = ['Indique la quantité en stock.'];
    if (values.weight.trim() !== '' && weightGrams === null) clientErrors.weight = ['Indique un poids valide (ex. 250 g ou 1,5 kg), ou laisse vide.'];
    if (Object.keys(clientErrors).length > 0) {
      setFormError('Certaines informations sont à corriger.');
      setFieldErrors(clientErrors);
      return;
    }

    const payload: ProductFormInput = {
      name: values.name,
      ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
      categoryId: values.categoryId || null,
      description: values.description,
      characteristics: values.characteristics.split('\n').map((line) => line.trim()).filter(Boolean),
      usageAdvice: values.usageAdvice.trim() || null,
      price: price as number,
      salePrice,
      weightGrams,
      sku: values.sku.trim() || null,
      stock,
      status: values.status,
      isFeatured: values.isFeatured,
      seoTitle: values.seoTitle.trim() || null,
      metaDescription: values.metaDescription.trim() || null,
      sortOrder: parseFcfaInput(values.sortOrder) ?? 0,
      images: values.images,
      optionLabel: 'Option',
      variants: [],
    };

    setIsPending(true);
    const result = isEdit ? await adminApi.products.update(initial.id, payload) : await adminApi.products.create(payload);
    if (!result.ok) {
      failWith(result.error.message, { ...result.error.fields, ...(result.error.fields?.weightGrams ? { weight: result.error.fields.weightGrams } : {}) });
      return;
    }
    router.push('/admin/produits');
    router.refresh();
  }

  async function handleDelete() {
    if (!initial) return;
    setIsPending(true);
    const result = await adminApi.products.remove(initial.id);
    if (!result.ok) {
      setConfirmingDelete(false);
      failWith(result.error.message);
      return;
    }
    router.push('/admin/produits');
    router.refresh();
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];
  const errorProps = (name: string) => ({
    'aria-invalid': Boolean(fieldError(name)),
    'aria-describedby': fieldError(name) ? `${formId}-${name}-error` : undefined,
  });
  const renderError = (name: string) =>
    fieldError(name) ? (
      <p id={`${formId}-${name}-error`} className="field-error">
        {fieldError(name)}
      </p>
    ) : null;

  const selectableCategories = categories.filter((category) => !category.isArchived || category.id === values.categoryId);

  return (
    <form onSubmit={handleSubmit} noValidate className="product-form">
      {formError && (
        <p className="alert-error" role="alert">
          {formError}
        </p>
      )}

      <div className="form-columns">
        <section className="card form-section">
          <h2>Informations</h2>

          <div className="field">
            <label htmlFor={`${formId}-name`}>Nom du produit</label>
            <input id={`${formId}-name`} value={values.name} onChange={(event) => handleNameChange(event.target.value)} maxLength={120} required {...errorProps('name')} />
            {renderError('name')}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-slug`}>Lien de la page</label>
            <input
              id={`${formId}-slug`}
              value={values.slug}
              onChange={(event) => {
                setSlugEdited(true);
                setValue('slug', event.target.value);
              }}
              maxLength={80}
              autoCapitalize="none"
              spellCheck={false}
              {...errorProps('slug')}
            />
            <p className="help-text">
              Adresse : {productPath(values.slug || '…')}
              {isEdit && initial.status !== 'DRAFT' && ' — si tu le changes, l’ancien lien redirige automatiquement vers le nouveau.'}
            </p>
            {renderError('slug')}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-category`}>Catégorie</label>
            <select id={`${formId}-category`} value={values.categoryId} onChange={(event) => setValue('categoryId', event.target.value)} {...errorProps('categoryId')}>
              <option value="">Aucune catégorie</option>
              {selectableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.isArchived ? ' (archivée)' : ''}
                </option>
              ))}
            </select>
            {renderError('categoryId')}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-description`}>Description</label>
            <textarea id={`${formId}-description`} rows={5} value={values.description} onChange={(event) => setValue('description', event.target.value)} maxLength={5000} required {...errorProps('description')} />
            {renderError('description')}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-characteristics`}>Caractéristiques</label>
            <textarea id={`${formId}-characteristics`} rows={4} value={values.characteristics} onChange={(event) => setValue('characteristics', event.target.value)} {...errorProps('characteristics')} />
            <p className="help-text">Une caractéristique par ligne (matière, taille, entretien…).</p>
            {renderError('characteristics')}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-usage`}>Mode d’utilisation (facultatif)</label>
            <textarea id={`${formId}-usage`} rows={3} value={values.usageAdvice} onChange={(event) => setValue('usageAdvice', event.target.value)} maxLength={3000} {...errorProps('usageAdvice')} />
            {renderError('usageAdvice')}
          </div>
        </section>

        <section className="card form-section">
          <h2>Prix, stock et références</h2>

          <div className="field">
            <label htmlFor={`${formId}-price`}>Prix (FCFA)</label>
            <input id={`${formId}-price`} inputMode="numeric" autoComplete="off" value={values.price} onChange={(event) => setValue('price', event.target.value)} required {...errorProps('price')} />
            {renderError('price')}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-sale`}>Prix promotionnel (FCFA, facultatif)</label>
            <input id={`${formId}-sale`} inputMode="numeric" autoComplete="off" value={values.salePrice} onChange={(event) => setValue('salePrice', event.target.value)} {...errorProps('salePrice')} />
            <p className="help-text">S’il est rempli, c’est ce prix que le client paie. Il doit être inférieur au prix normal.</p>
            {renderError('salePrice')}
          </div>

          <div className="field">
            <label className="check-row">
              <input type="checkbox" checked={values.trackStock} onChange={(event) => setValue('trackStock', event.target.checked)} />
              <span>Suivre le stock de ce produit</span>
            </label>
            <p className="help-text">Désactivé : le produit n’est jamais affiché « épuisé ».</p>
          </div>

          {values.trackStock && (
            <div className="field">
              <label htmlFor={`${formId}-stock`}>Quantité en stock</label>
              <input id={`${formId}-stock`} inputMode="numeric" autoComplete="off" value={values.stock} onChange={(event) => setValue('stock', event.target.value)} {...errorProps('stock')} />
              {renderError('stock')}
            </div>
          )}

          <div className="field">
            <label htmlFor={`${formId}-weight`}>Poids (facultatif)</label>
            <div className="inline-fields">
              <input id={`${formId}-weight`} inputMode="decimal" autoComplete="off" value={values.weight} onChange={(event) => setValue('weight', event.target.value)} {...errorProps('weight')} />
              <select aria-label="Unité de poids" value={values.weightUnit} onChange={(event) => setValue('weightUnit', event.target.value as WeightUnit)}>
                <option value="g">g</option>
                <option value="kg">kg</option>
              </select>
            </div>
            {renderError('weight')}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-sku`}>Référence interne (facultatif)</label>
            <input id={`${formId}-sku`} value={values.sku} onChange={(event) => setValue('sku', event.target.value)} maxLength={40} autoCapitalize="characters" spellCheck={false} {...errorProps('sku')} />
            {renderError('sku')}
          </div>
        </section>

        <section className="card form-section">
          <h2>Photos</h2>
          <ImageUploader
            images={values.images}
            onChange={(update) => setValues((current) => ({ ...current, images: update(current.images) }))}
            defaultAlt={values.name.trim()}
            error={fieldError('images')}
          />
        </section>

        <section className="card form-section">
          <h2>Publication</h2>
          <fieldset className="field">
            <legend>Statut</legend>
            {PRODUCT_STATUSES.map((status) => (
              <label key={status} className="radio-row">
                <input type="radio" name={`${formId}-status`} checked={values.status === status} onChange={() => setValue('status', status)} />
                <span>
                  <strong>{PRODUCT_STATUS_LABELS[status]}</strong>
                  <span className="help-text"> {PRODUCT_STATUS_HELP[status]}</span>
                </span>
              </label>
            ))}
            {renderError('status')}
          </fieldset>

          <div className="field">
            <label className="check-row">
              <input type="checkbox" checked={values.isFeatured} onChange={(event) => setValue('isFeatured', event.target.checked)} />
              <span>Mettre en avant sur la landing</span>
            </label>
            <p className="help-text">Les produits mis en avant forment la section « Best-sellers » (8 maximum, dans l’ordre d’affichage).</p>
          </div>

          <div className="field">
            <label htmlFor={`${formId}-order`}>Ordre d’affichage</label>
            <input id={`${formId}-order`} inputMode="numeric" value={values.sortOrder} onChange={(event) => setValue('sortOrder', event.target.value)} {...errorProps('sortOrder')} />
            <p className="help-text">0 s’affiche en premier.</p>
          </div>
        </section>

        <section className="card form-section">
          <h2>Référencement (facultatif)</h2>
          <p className="help-text">Si tu laisses vide, le site génère un titre et une description à partir du nom et de la description du produit.</p>

          <div className="field">
            <label htmlFor={`${formId}-seo-title`}>Titre pour Google</label>
            <input id={`${formId}-seo-title`} value={values.seoTitle} onChange={(event) => setValue('seoTitle', event.target.value)} maxLength={70} {...errorProps('seoTitle')} />
            <p className="help-text">{values.seoTitle.length}/70 caractères</p>
            {renderError('seoTitle')}
          </div>

          <div className="field">
            <label htmlFor={`${formId}-meta`}>Description pour Google</label>
            <textarea id={`${formId}-meta`} rows={3} value={values.metaDescription} onChange={(event) => setValue('metaDescription', event.target.value)} maxLength={160} {...errorProps('metaDescription')} />
            <p className="help-text">{values.metaDescription.length}/160 caractères</p>
            {renderError('metaDescription')}
          </div>
        </section>
      </div>

      <div className="form-actions">
        <button className="btn" type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
        </button>

        {isEdit && !confirmingDelete && (
          <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(true)} disabled={isPending}>
            Supprimer
          </button>
        )}
        {isEdit && confirmingDelete && (
          <span className="confirm-delete" role="group" aria-label="Confirmer la suppression">
            <span>Supprimer définitivement ce produit ?</span>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isPending}>
              Oui, supprimer
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(false)} disabled={isPending}>
              Annuler
            </button>
          </span>
        )}
      </div>
    </form>
  );
}
