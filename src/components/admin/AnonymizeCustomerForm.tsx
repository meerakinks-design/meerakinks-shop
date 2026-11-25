'use client';

import { useState, type FormEvent } from 'react';
import { postJson } from '@/lib/api-client';
import type { ApiFieldErrors } from '@/lib/api-result';
import { ANONYMIZE_CUSTOMER_API_PATH } from '@/lib/constants/retention';
import { DEFAULT_DIAL_CODE } from '@/lib/shop/phone';

interface Outcome {
  anonymized: boolean;
  orders: number;
}

const EMPTY = { phoneDialCode: DEFAULT_DIAL_CODE, phone: '', confirm: false };

/** Effacement d'un client sur sa demande (propriétaire). Rien ne part sans la case de confirmation cochée. */
export function AnonymizeCustomerForm() {
  const [values, setValues] = useState(EMPTY);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});
    setOutcome(null);

    const result = await postJson<Outcome>(ANONYMIZE_CUSTOMER_API_PATH, values);

    if (result.ok) {
      setOutcome(result.data);
      setValues(EMPTY);
    } else {
      const hasFieldErrors = Object.values(result.error.fields ?? {}).some((messages) => messages && messages.length > 0);
      setErrorMessage(hasFieldErrors ? null : result.error.message);
      setFieldErrors(result.error.fields ?? {});
    }
    setIsPending(false);
  }

  const phoneError = fieldErrors.phone?.[0];
  const confirmError = fieldErrors.confirm?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <p className="alert-error" role="alert">
          {errorMessage}
        </p>
      )}
      {outcome && (
        <p className="alert-success" role="status">
          {outcome.anonymized
            ? `Données effacées. ${outcome.orders} commande${outcome.orders > 1 ? 's restent' : ' reste'} dans les comptes, sans nom, téléphone ni adresse.`
            : 'Ce client était déjà effacé : rien n’a été modifié.'}
        </p>
      )}

      <div className="field">
        <label htmlFor="phone">Numéro de téléphone du client</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={values.phone}
          onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
          aria-invalid={Boolean(phoneError)}
          aria-describedby={phoneError ? 'phone-error' : 'phone-hint'}
          required
        />
        <p id="phone-hint" className="help-text">
          Le numéro donné en commandant, avec ou sans l’indicatif (+{DEFAULT_DIAL_CODE} par défaut).
        </p>
        {phoneError && (
          <p id="phone-error" className="field-error">
            {phoneError}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="confirm" className="check-row check-row-top">
          <input
            id="confirm"
            name="confirm"
            type="checkbox"
            checked={values.confirm}
            onChange={(event) => setValues((current) => ({ ...current, confirm: event.target.checked }))}
            aria-invalid={Boolean(confirmError)}
            aria-describedby={confirmError ? 'confirm-error' : undefined}
          />
          <span>Je confirme : le nom, le téléphone, l’email et l’adresse de ce client seront effacés. Cette action est définitive.</span>
        </label>
        {confirmError && (
          <p id="confirm-error" className="field-error">
            {confirmError}
          </p>
        )}
      </div>

      <button className="btn btn-danger" type="submit" disabled={isPending}>
        {isPending ? 'Effacement…' : 'Effacer les données de ce client'}
      </button>
    </form>
  );
}
