'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { ADMIN_NOTE_MAX } from '@/lib/constants/admin-orders';
import { DELIVERY_STATUS_LABELS, type DeliveryStatusValue } from '@/lib/constants/order-status';
import { formatFcfa } from '@/lib/money';
import { DELIVERY_ADVANCE_LABELS, deliveryActions } from '@/lib/shop/order-admin';

interface OrderActionsProps {
  orderId: string;
  status: DeliveryStatusValue;
  /** Encaissé net : sert à prévenir qu'une annulation laisse de l'argent à rendre. */
  paid: number;
  /** Reste à payer (null : total à confirmer). */
  remaining: number | null;
}

type Pending = 'advance' | 'cancel' | null;

/** Le prochain geste de la vendeuse, et l'annulation (avec retour du stock). Livrée ou annulée : définitif (RM-16). */
export function OrderActions({ orderId, status, paid, remaining }: OrderActionsProps) {
  const router = useRouter();
  const { next, canCancel } = deliveryActions(status);
  const [confirming, setConfirming] = useState<'advance' | 'cancel' | null>(null);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(target: DeliveryStatusValue, kind: 'advance' | 'cancel') {
    setPending(kind);
    setError(null);
    setMessage(null);
    const result = await adminApi.orders.changeStatus(orderId, target, note.trim() || undefined);
    setPending(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setConfirming(null);
    setNote('');
    if (target === 'CANCELLED') {
      const parts = [result.data.stockRestored ? 'Commande annulée, stock remis en rayon.' : 'Commande annulée.'];
      if (result.data.refundDue > 0) parts.push(`Pense à rembourser ${formatFcfa(result.data.refundDue)} au client.`);
      setMessage(parts.join(' '));
    } else {
      setMessage(`Statut mis à jour : ${DELIVERY_STATUS_LABELS[target]}.`);
    }
    router.refresh();
  }

  if (!next && !canCancel) {
    return (
      <section className="card action-panel" aria-label="Statut de la commande">
        <p style={{ margin: 0 }}>
          <strong>{status === 'DELIVERED' ? 'Commande livrée.' : 'Commande annulée.'}</strong> Ce statut est définitif : en cas d’erreur, crée une nouvelle commande.
        </p>
        {message && (
          <p role="status" className="notice" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>
            {message}
          </p>
        )}
      </section>
    );
  }

  const needsConfirm = next === 'DELIVERED';

  return (
    <section className="card action-panel" aria-label="Traiter la commande">
      <h2 style={{ fontSize: '1.125rem' }}>Que faire maintenant ?</h2>
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      {confirming === null && (
        <div className="form-actions">
          {next && (
            <button
              type="button"
              className="btn"
              disabled={pending !== null}
              onClick={() => (needsConfirm ? setConfirming('advance') : void submit(next, 'advance'))}
            >
              {pending === 'advance' ? 'Enregistrement…' : (DELIVERY_ADVANCE_LABELS[next] ?? DELIVERY_STATUS_LABELS[next])}
            </button>
          )}
          {canCancel && (
            <button type="button" className="btn btn-quiet" disabled={pending !== null} onClick={() => setConfirming('cancel')}>
              Annuler la commande
            </button>
          )}
        </div>
      )}

      {confirming === 'advance' && next && (
        <div className="confirm-box">
          <p style={{ margin: 0 }}>
            Marquer cette commande comme <strong>livrée</strong> ? Ce statut est définitif.
            {remaining !== null && remaining > 0 && <> Il reste encore <strong>{formatFcfa(remaining)}</strong> à encaisser : enregistre le paiement ci-dessous.</>}
          </p>
          <div className="form-actions">
            <button type="button" className="btn" disabled={pending !== null} onClick={() => void submit(next, 'advance')}>
              {pending === 'advance' ? 'Enregistrement…' : 'Oui, elle est livrée'}
            </button>
            <button type="button" className="btn btn-quiet" disabled={pending !== null} onClick={() => setConfirming(null)}>
              Pas encore
            </button>
          </div>
        </div>
      )}

      {confirming === 'cancel' && (
        <div className="confirm-box">
          <p style={{ margin: 0 }}>
            Annuler cette commande ? Le stock des articles suivis sera remis en rayon. L’annulation est définitive.
            {paid > 0 && <> <strong>{formatFcfa(paid)}</strong> ont déjà été encaissés : tu pourras enregistrer le remboursement ensuite.</>}
          </p>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="cancel-note">Motif (facultatif)</label>
            <textarea id="cancel-note" rows={2} maxLength={ADMIN_NOTE_MAX} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-danger" disabled={pending !== null} onClick={() => void submit('CANCELLED', 'cancel')}>
              {pending === 'cancel' ? 'Annulation…' : 'Oui, annuler la commande'}
            </button>
            <button type="button" className="btn btn-quiet" disabled={pending !== null} onClick={() => setConfirming(null)}>
              Garder la commande
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
