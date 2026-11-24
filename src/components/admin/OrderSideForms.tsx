'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { ADMIN_INTERNAL_NOTE_MAX } from '@/lib/constants/admin-orders';
import { formatFcfa, parseFcfaInput } from '@/lib/money';

/** Fixe les frais de livraison : le total « à confirmer » devient un total définitif (RM-03, RM-06). */
export function DeliveryFeeForm({ orderId, subtotal, currentFee }: { orderId: string; subtotal: number; currentFee: number | null }) {
  const router = useRouter();
  const [fee, setFee] = useState(currentFee === null ? '' : String(currentFee));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    // Zéro est une valeur valide (livraison offerte) ; un champ vide ne l'est pas.
    const parsed = fee.trim() === '' ? null : parseFcfaInput(fee);
    if (parsed === null) {
      setError('Renseigne les frais en FCFA (0 si la livraison est offerte).');
      return;
    }
    setPending(true);
    const result = await adminApi.orders.setDeliveryFee(orderId, parsed);
    setPending(false);
    if (!result.ok) {
      setError(result.error.fields?.fee?.[0] ?? result.error.message);
      return;
    }
    setSaved(`Frais fixés. Total : ${formatFcfa(result.data.total)}.`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="pay-form" style={{ marginTop: 'var(--space-3)' }}>
      <div className="field">
        <label htmlFor="delivery-fee">{currentFee === null ? 'Fixer les frais de livraison (FCFA)' : 'Modifier les frais de livraison (FCFA)'}</label>
        <input id="delivery-fee" inputMode="numeric" value={fee} onChange={(event) => setFee(event.target.value)} aria-invalid={Boolean(error)} />
        <p className="help-text">Sous-total {formatFcfa(subtotal)} + frais = total annoncé au client.</p>
        {error && <p className="field-error">{error}</p>}
      </div>
      {saved && (
        <p role="status" className="notice" style={{ margin: 0 }}>
          {saved}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-quiet" type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer les frais'}
        </button>
      </div>
    </form>
  );
}

/** Note interne : jamais montrée au client. */
export function InternalNoteForm({ orderId, initial }: { orderId: string; initial: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState(initial ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await adminApi.orders.setNote(orderId, note);
    setPending(false);
    if (!result.ok) {
      setError(result.error.fields?.note?.[0] ?? result.error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="internal-note">Note interne</label>
        <textarea id="internal-note" rows={3} maxLength={ADMIN_INTERNAL_NOTE_MAX} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Visible de l’équipe seulement" />
        {error && <p className="field-error">{error}</p>}
      </div>
      <div className="form-actions">
        <button className="btn btn-quiet" type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer la note'}
        </button>
        {saved && (
          <span role="status" className="help-text">
            Note enregistrée.
          </span>
        )}
      </div>
    </form>
  );
}
