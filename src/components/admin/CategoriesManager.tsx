'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { readableTextColor } from '@/lib/color';
import { parseFcfaInput } from '@/lib/money';

export interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  accentColor: string | null;
  position: number;
  isArchived: boolean;
  productCount: number;
}

export function CategoriesManager({ categories }: { categories: CategoryItem[] }) {
  return (
    <div className="stack">
      <NewCategoryForm nextPosition={categories.length} />
      {categories.length === 0 ? (
        <div className="empty-state">
          <h2>Aucune catégorie</h2>
          <p>Les catégories servent à classer les produits dans le catalogue. Tu peux aussi t’en passer.</p>
        </div>
      ) : (
        <ul className="plain-list">
          {categories.map((category) => (
            <li key={category.id} className="card">
              <CategoryRow category={category} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewCategoryForm({ nextPosition }: { nextPosition: number }) {
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    const result = await adminApi.categories.create({ name, position: nextPosition });
    setIsPending(false);
    if (!result.ok) {
      setError(result.error.fields?.name?.[0] ?? result.error.message);
      return;
    }
    setName('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card inline-form" noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>Nouvelle catégorie</label>
        <input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} aria-invalid={Boolean(error)} />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button className="btn" type="submit" disabled={isPending}>
        {isPending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}

function CategoryRow({ category }: { category: CategoryItem }) {
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState(category.name);
  const [position, setPosition] = useState(String(category.position));
  const [description, setDescription] = useState(category.description ?? '');
  const [isArchived, setIsArchived] = useState(category.isArchived);
  const [accentColor, setAccentColor] = useState(category.accentColor ?? '');
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    const result = await adminApi.categories.update(category.id, { name, description: description.trim() || null, accentColor: accentColor || null, isArchived, position: parseFcfaInput(position) ?? 0 });
    setIsPending(false);
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.fields?.name?.[0] ?? result.error.message });
      return;
    }
    setMessage({ kind: 'ok', text: 'Enregistré.' });
    router.refresh();
  }

  async function handleDelete() {
    setIsPending(true);
    const result = await adminApi.categories.remove(category.id);
    setIsPending(false);
    setConfirmingDelete(false);
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="category-row" noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>Nom</label>
        <input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
      </div>
      <div className="field">
        <label htmlFor={`${id}-desc`}>Description courte (facultatif)</label>
        <textarea id={`${id}-desc`} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
      </div>
      <div className="field">
        <label htmlFor={`${id}-color`}>Couleur de la section (facultatif)</label>
        <div className="inline-fields">
          <input id={`${id}-color`} type="color" className="color-input" value={accentColor || '#ffffff'} onChange={(event) => setAccentColor(event.target.value)} />
          {accentColor && (
            <>
              <span className="color-sample" style={{ background: accentColor, color: readableTextColor(accentColor) }}>
                {name || 'Aperçu'}
              </span>
              <button type="button" className="btn btn-quiet" onClick={() => setAccentColor('')}>
                Retirer
              </button>
            </>
          )}
        </div>
      </div>
      <div className="field">
        <label className="check-row">
          <input type="checkbox" checked={isArchived} onChange={(event) => setIsArchived(event.target.checked)} />
          <span>Archivée (masquée du site)</span>
        </label>
      </div>
      <div className="field field-narrow">
        <label htmlFor={`${id}-pos`}>Ordre</label>
        <input id={`${id}-pos`} inputMode="numeric" value={position} onChange={(event) => setPosition(event.target.value)} />
      </div>
      <p className="help-text">
        {category.productCount} produit{category.productCount > 1 ? 's' : ''}
      </p>
      <div className="form-actions">
        <button className="btn" type="submit" disabled={isPending}>
          Enregistrer
        </button>
        {!confirmingDelete ? (
          <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(true)} disabled={isPending}>
            Supprimer
          </button>
        ) : (
          <span className="confirm-delete" role="group" aria-label="Confirmer la suppression">
            <span>{category.productCount > 0 ? 'Les produits resteront en ligne, sans catégorie.' : 'Supprimer cette catégorie ?'}</span>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isPending}>
              Oui, supprimer
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(false)}>
              Annuler
            </button>
          </span>
        )}
      </div>
      {message && (
        <p className={message.kind === 'error' ? 'field-error' : 'help-text'} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </form>
  );
}
