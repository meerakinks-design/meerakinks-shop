'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import type { ApiFieldErrors } from '@/lib/api-result';
import { PAYMENT_NOTE_MAX } from '@/lib/constants/admin-orders';
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, type PaymentKindValue, type PaymentMethodValue } from '@/lib/constants/payment';
import { formatDay } from '@/lib/admin-format';
import { formatFcfa, parseFcfaInput } from '@/lib/money';

export interface PaymentLineView {
  id: string;
  kind: PaymentKindValue;
  method: PaymentMethodValue;
  amount: number;
  receivedAt: string;
  note: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  recordedBy: string | null;
}

interface PaymentPanelProps {
  orderId: string;
  /** Types proposés (le service refuse les autres) et montant conseillé pour chacun, calculés côté serveur. */
  kinds: { kind: PaymentKindValue; suggested: number | null }[];
  payments: PaymentLineView[];
  netPaid: number;
  remaining: number | null;
  /** Aucun nouvel encaissement possible (commande annulée) : seuls les remboursements restent. */
  canRecord: boolean;
  defaultMethod: PaymentMethodValue;
}

const todayInput = () => new Date().toISOString().slice(0, 10);

export function PaymentPanel({ orderId, kinds, payments, netPaid, remaining, canRecord, defaultMethod }: PaymentPanelProps) {
  const router = useRouter();
  const [chosenKind, setKind] = useState<PaymentKindValue>(kinds[0]?.kind ?? 'FULL');
  // Après un enregistrement, les types possibles changent (l'acompte disparaît, par exemple) : on ne garde jamais un type périmé.
  const kind: PaymentKindValue = kinds.some((item) => item.kind === chosenKind) ? chosenKind : (kinds[0]?.kind ?? 'FULL');
  const [method, setMethod] = useState<PaymentMethodValue>(defaultMethod);
  const [amount, setAmount] = useState(() => (kinds[0]?.suggested ? String(kinds[0].suggested) : ''));
  const [receivedAt, setReceivedAt] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [saved, setSaved] = useState<string | null>(null);

  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidPending, setVoidPending] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  function chooseKind(next: PaymentKindValue) {
    setKind(next);
    const suggested = kinds.find((item) => item.kind === next)?.suggested;
    setAmount(suggested ? String(suggested) : '');
    if (next === 'DEPOSIT') setMethod('WAVE'); // l'acompte passe toujours par Wave (RM-05)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaved(null);
    const parsed = parseFcfaInput(amount);
    if (parsed === null || parsed <= 0) {
      setFieldErrors({ amount: ['Renseigne un montant en FCFA.'] });
      return;
    }
    setPending(true);
    const result = await adminApi.orders.recordPayment(orderId, {
      kind,
      method,
      amount: parsed,
      ...(receivedAt ? { receivedAt } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setPending(false);
    if (!result.ok) {
      const hasFields = Object.values(result.error.fields ?? {}).some((messages) => messages && messages.length > 0);
      setError(hasFields ? null : result.error.message);
      setFieldErrors(result.error.fields ?? {});
      return;
    }
    setSaved(`${PAYMENT_KIND_LABELS[kind]} de ${formatFcfa(parsed)} enregistré.`);
    setNote('');
    setReceivedAt('');
    setAmount('');
    router.refresh();
  }

  async function handleVoid(paymentId: string) {
    const reason = voidReason.trim();
    if (reason.length < 3) {
      setVoidError('Indique pourquoi ce paiement est annulé.');
      return;
    }
    setVoidPending(true);
    setVoidError(null);
    const result = await adminApi.orders.voidPayment(orderId, paymentId, reason);
    setVoidPending(false);
    if (!result.ok) {
      setVoidError(result.error.fields?.reason?.[0] ?? result.error.message);
      return;
    }
    setVoidingId(null);
    setVoidReason('');
    setSaved('Paiement annulé : il reste dans l’historique, mais ne compte plus.');
    router.refresh();
  }

  return (
    <div>
      <ul className="line-list" aria-label="Paiements enregistrés">
        {payments.length === 0 && <li className="help-text">Aucun paiement enregistré.</li>}
        {payments.map((payment) => (
          <li key={payment.id}>
            <div className={payment.voidedAt ? 'is-voided' : undefined} style={{ minWidth: 0 }}>
              <strong>{PAYMENT_KIND_LABELS[payment.kind]}</strong> · {PAYMENT_METHOD_LABELS[payment.method]}
              <br />
              <span className="help-text">
                {formatDay(payment.receivedAt)}
                {payment.recordedBy ? ` · ${payment.recordedBy}` : ''}
                {payment.note ? ` · ${payment.note}` : ''}
              </span>
              {payment.voidedAt && (
                <>
                  <br />
                  <span className="help-text">Annulé le {formatDay(payment.voidedAt)}{payment.voidReason ? ` : ${payment.voidReason}` : ''}</span>
                </>
              )}
              {!payment.voidedAt && voidingId === payment.id && (
                <div className="confirm-box">
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor={`void-${payment.id}`}>Motif de l’annulation</label>
                    <input id={`void-${payment.id}`} value={voidReason} maxLength={PAYMENT_NOTE_MAX} onChange={(event) => setVoidReason(event.target.value)} placeholder="Ex. montant saisi en double" />
                    {voidError && <p className="field-error">{voidError}</p>}
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-danger btn-small" disabled={voidPending} onClick={() => void handleVoid(payment.id)}>
                      {voidPending ? 'Annulation…' : 'Annuler ce paiement'}
                    </button>
                    <button type="button" className="btn btn-quiet btn-small" disabled={voidPending} onClick={() => setVoidingId(null)}>
                      Garder
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              <span className={`money ${payment.voidedAt ? 'is-voided' : ''}`}>
                {payment.kind === 'REFUND' ? '−' : '+'} {formatFcfa(payment.amount)}
              </span>
              {!payment.voidedAt && voidingId !== payment.id && (
                <div>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setVoidingId(payment.id);
                      setVoidReason('');
                      setVoidError(null);
                    }}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <dl className="kv" style={{ marginTop: 'var(--space-3)' }}>
        <dt>Encaissé (remboursements déduits)</dt>
        <dd className="money">{formatFcfa(netPaid)}</dd>
        <dt>Reste à payer</dt>
        <dd className="money">{remaining === null ? 'Total à confirmer' : formatFcfa(remaining)}</dd>
      </dl>

      {saved && (
        <p role="status" className="notice" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>
          {saved}
        </p>
      )}

      {kinds.length > 0 && (
        <form className="pay-form" onSubmit={handleSubmit} noValidate>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{canRecord ? 'Enregistrer un paiement' : 'Enregistrer un remboursement'}</h3>
          <p className="help-text">Saisis un paiement seulement une fois reçu (Wave, espèces…). Une erreur s’annule, elle ne se supprime pas.</p>
          {error && (
            <p className="alert-error" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <div className="pay-form-grid">
            <div className="field">
              <label htmlFor="pay-kind">Type</label>
              <select id="pay-kind" value={kind} onChange={(event) => chooseKind(event.target.value as PaymentKindValue)} aria-invalid={Boolean(fieldErrors.kind)}>
                {kinds.map((item) => (
                  <option key={item.kind} value={item.kind}>
                    {PAYMENT_KIND_LABELS[item.kind]}
                  </option>
                ))}
              </select>
              {fieldErrors.kind && <p className="field-error">{fieldErrors.kind[0]}</p>}
            </div>
            <div className="field">
              <label htmlFor="pay-method">Mode</label>
              <select id="pay-method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethodValue)}>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodValue[]).map((value) => (
                  <option key={value} value={value}>
                    {PAYMENT_METHOD_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pay-amount">Montant (FCFA)</label>
              <input id="pay-amount" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={Boolean(fieldErrors.amount)} aria-describedby={fieldErrors.amount ? 'pay-amount-error' : undefined} />
              {fieldErrors.amount && (
                <p id="pay-amount-error" className="field-error">
                  {fieldErrors.amount[0]}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor="pay-date">Reçu le (facultatif)</label>
              <input id="pay-date" type="date" max={todayInput()} value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} aria-invalid={Boolean(fieldErrors.receivedAt)} />
              {fieldErrors.receivedAt && <p className="field-error">{fieldErrors.receivedAt[0]}</p>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pay-note">{kind === 'REFUND' ? 'Motif du remboursement' : 'Note (facultatif)'}</label>
            <input id="pay-note" value={note} maxLength={PAYMENT_NOTE_MAX} onChange={(event) => setNote(event.target.value)} aria-invalid={Boolean(fieldErrors.note)} />
            {fieldErrors.note && <p className="field-error">{fieldErrors.note[0]}</p>}
          </div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={pending}>
              {pending ? 'Enregistrement…' : kind === 'REFUND' ? 'Enregistrer le remboursement' : 'Enregistrer le paiement'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
