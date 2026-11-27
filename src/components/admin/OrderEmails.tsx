'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { EMAIL_STATUS_LABELS, emailTypeLabel, type EmailStatusValue } from '@/lib/constants/email';
import { formatDateTime } from '@/lib/admin-format';

export interface OrderEmailView {
  id: string;
  type: string;
  toEmail: string;
  status: EmailStatusValue;
  attempts: number;
  lastError: string | null;
  /** Dates en texte ISO : elles traversent la frontière serveur / navigateur. */
  sentAt: string | null;
  createdAt: string;
}

const BADGE: Record<EmailStatusValue, string> = { PENDING: 'badge-warn', PROCESSING: 'badge-warn', SENT: 'badge-ok', FAILED: 'badge-solid' };

/** Emails automatiques de la commande. Un email abandonné après six tentatives se relance d'un geste (bouton « Renvoyer »). */
export function OrderEmails({ orderId, emails }: { orderId: string; emails: OrderEmailView[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend(emailId: string) {
    setPendingId(emailId);
    setError(null);
    const result = await adminApi.orders.resendEmail(orderId, emailId);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  if (emails.length === 0) return <p className="help-text">Aucun email automatique pour cette commande.</p>;

  return (
    <>
      <ul className="email-list">
        {emails.map((email) => (
          <li key={email.id} className="email-row">
            <div className="email-row-head">
              <strong>{emailTypeLabel(email.type)}</strong>
              <span className={`badge ${BADGE[email.status]}`}>{EMAIL_STATUS_LABELS[email.status]}</span>
            </div>
            <p className="help-text">
              À {email.toEmail} · {email.status === 'SENT' && email.sentAt ? `envoyé le ${formatDateTime(new Date(email.sentAt))}` : `créé le ${formatDateTime(new Date(email.createdAt))}`}
              {email.status !== 'SENT' && email.attempts > 0 ? ` · ${email.attempts} tentative${email.attempts > 1 ? 's' : ''}` : ''}
            </p>
            {email.status === 'FAILED' && (
              <>
                {email.lastError && <p className="help-text">Dernière erreur : {email.lastError}</p>}
                <div>
                  <button type="button" className="btn btn-quiet btn-small" disabled={pendingId !== null} onClick={() => resend(email.id)}>
                    {pendingId === email.id ? 'Envoi…' : 'Renvoyer'}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
