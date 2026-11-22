'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/api-client';
import type { ApiFieldErrors } from '@/lib/api-result';
import { CHANGE_PASSWORD_API_PATH, PASSWORD_MIN_LENGTH } from '@/lib/constants/auth';

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

const FIELDS: ReadonlyArray<{ name: FieldName; label: string; autoComplete: string; hint?: string }> = [
  { name: 'currentPassword', label: 'Mot de passe actuel', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Nouveau mot de passe', autoComplete: 'new-password', hint: `${PASSWORD_MIN_LENGTH} caractères minimum. Une phrase facile à retenir est plus sûre qu’un mot court avec des chiffres.` },
  { name: 'confirmPassword', label: 'Confirme le nouveau mot de passe', autoComplete: 'new-password' },
];

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});
    setDone(false);

    const result = await postJson<Record<string, never>>(CHANGE_PASSWORD_API_PATH, values);

    if (result.ok) {
      setValues(EMPTY);
      setDone(true);
      setIsPending(false);
      // Le cookie de session a été remplacé : on relit la page avec le nouveau.
      router.refresh();
      return;
    }
    // Un champ précis en erreur s'affiche sous le champ ; sinon (limite atteinte, réseau…) le message général suffit.
    const hasFieldErrors = Object.values(result.error.fields ?? {}).some((messages) => messages && messages.length > 0);
    setErrorMessage(hasFieldErrors ? null : result.error.message);
    setFieldErrors(result.error.fields ?? {});
    setIsPending(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <p className="alert-error" role="alert">
          {errorMessage}
        </p>
      )}
      {done && (
        <p className="alert-success" role="status">
          Mot de passe changé. Les autres appareils ont été déconnectés.
        </p>
      )}

      {FIELDS.map((field) => {
        const error = fieldErrors[field.name]?.[0];
        const describedBy = [error ? `${field.name}-error` : null, field.hint ? `${field.name}-hint` : null].filter(Boolean).join(' ') || undefined;
        return (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy}
              required
            />
            {field.hint && (
              <p id={`${field.name}-hint`} className="help-text">
                {field.hint}
              </p>
            )}
            {error && (
              <p id={`${field.name}-error`} className="field-error">
                {error}
              </p>
            )}
          </div>
        );
      })}

      <button className="btn" type="submit" disabled={isPending}>
        {isPending ? 'Enregistrement…' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}
