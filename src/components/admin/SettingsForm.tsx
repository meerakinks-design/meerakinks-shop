'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { parseFcfaInput } from '@/lib/money';
import { DEPOSIT_MAX, DEPOSIT_MIN } from '@/lib/validation/settings.schema';

/** Valeurs de départ (déjà lues en base) : un champ vide = non renseigné. */
export interface SettingsValues {
  storeName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  legalName: string | null;
  address: string | null;
  sellerWhatsApp: string;
  notificationEmail: string;
  waveNumber: string | null;
  depositAmount: number;
  paymentRules: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
}

type Fields = Record<keyof SettingsValues, string>;

const toFields = (values: SettingsValues): Fields => ({
  storeName: values.storeName,
  contactEmail: values.contactEmail ?? '',
  contactPhone: values.contactPhone ?? '',
  legalName: values.legalName ?? '',
  address: values.address ?? '',
  sellerWhatsApp: values.sellerWhatsApp,
  notificationEmail: values.notificationEmail,
  waveNumber: values.waveNumber ?? '',
  depositAmount: String(values.depositAmount),
  paymentRules: values.paymentRules ?? '',
  instagramUrl: values.instagramUrl ?? '',
  tiktokUrl: values.tiktokUrl ?? '',
  facebookUrl: values.facebookUrl ?? '',
});

/** Paramètres de la boutique (propriétaire) : nom, contact, commandes et paiement, réseaux. Les textes de livraison sont dans « Livraison ». */
export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const id = useId();
  const [fields, setFields] = useState<Fields>(() => toFields(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof SettingsValues, string>>>({});
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  const set = (key: keyof SettingsValues) => (value: string) => setFields((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    setErrors({});
    const deposit = parseFcfaInput(fields.depositAmount);
    const result = await adminApi.settings.update({
      storeName: fields.storeName,
      contactEmail: fields.contactEmail,
      contactPhone: fields.contactPhone,
      legalName: fields.legalName,
      address: fields.address,
      sellerWhatsApp: fields.sellerWhatsApp,
      notificationEmail: fields.notificationEmail,
      waveNumber: fields.waveNumber,
      // Vide ou sans chiffre : on laisse le serveur répondre « saisissez un nombre entier ».
      depositAmount: deposit ?? Number.NaN,
      paymentRules: fields.paymentRules,
      instagramUrl: fields.instagramUrl,
      tiktokUrl: fields.tiktokUrl,
      facebookUrl: fields.facebookUrl,
    });
    setIsPending(false);
    if (!result.ok) {
      const next: Partial<Record<keyof SettingsValues, string>> = {};
      for (const [key, messages] of Object.entries(result.error.fields ?? {})) {
        const first = messages?.[0];
        if (key in fields && first) next[key as keyof SettingsValues] = first;
      }
      setErrors(next);
      setMessage({ kind: 'error', text: Object.keys(next).length > 0 ? 'Certains champs sont à corriger.' : result.error.message });
      return;
    }
    setMessage({ kind: 'ok', text: result.data.changed > 0 ? 'Enregistré. La boutique est mise à jour.' : 'Rien n’a changé.' });
    router.refresh();
  }

  const field = (key: keyof SettingsValues, label: string, options: { type?: string; inputMode?: 'text' | 'tel' | 'numeric' | 'email' | 'url'; help?: string; required?: boolean; autoComplete?: string; maxLength?: number } = {}) => {
    const inputId = `${id}-${key}`;
    const error = errors[key];
    return (
      <div className="field">
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          name={key}
          type={options.type ?? 'text'}
          inputMode={options.inputMode}
          value={fields[key]}
          onChange={(event) => set(key)(event.target.value)}
          required={options.required}
          autoComplete={options.autoComplete ?? 'off'}
          maxLength={options.maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : options.help ? `${inputId}-help` : undefined}
        />
        {options.help && !error && (
          <p className="help-text" id={`${inputId}-help`}>
            {options.help}
          </p>
        )}
        {error && (
          <p className="field-error" id={`${inputId}-error`} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit} noValidate>
      <section className="card settings-group" aria-labelledby={`${id}-shop`}>
        <h2 id={`${id}-shop`}>La boutique</h2>
        <p className="help-text">Le nom et les coordonnées s’affichent sur la vitrine, les reçus et les emails.</p>
        <div className="settings-grid">
          {field('storeName', 'Nom de la boutique', { required: true, maxLength: 80 })}
          {field('legalName', 'Nom légal (reçus, mentions légales)', { maxLength: 120 })}
          {field('contactEmail', 'Email de contact', { type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 160 })}
          {field('contactPhone', 'Téléphone de contact', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 30 })}
        </div>
        {field('address', 'Adresse', { maxLength: 240 })}
      </section>

      <section className="card settings-group" aria-labelledby={`${id}-orders`}>
        <h2 id={`${id}-orders`}>Commandes et paiement</h2>
        <div className="settings-grid">
          {field('sellerWhatsApp', 'Numéro WhatsApp de la boutique', { type: 'tel', inputMode: 'tel', required: true, maxLength: 30, help: 'Avec l’indicatif du pays, par exemple +225 07 00 00 00 00. Sert aux liens « Écrire sur WhatsApp ».' })}
          {field('notificationEmail', 'Email qui reçoit les alertes', { type: 'email', inputMode: 'email', required: true, maxLength: 160, help: 'Nouvelles commandes et nouvelles visites.' })}
          {field('depositAmount', 'Acompte à Abidjan (FCFA)', { inputMode: 'numeric', required: true, maxLength: 9, help: `Entre ${DEPOSIT_MIN} et ${DEPOSIT_MAX.toLocaleString('fr-FR')} FCFA. Il s’applique aux nouvelles commandes ; les commandes déjà passées gardent le leur.` })}
          {field('waveNumber', 'Numéro Wave', { type: 'tel', inputMode: 'tel', maxLength: 30, help: 'Jamais affiché sur le site : vous le communiquez après confirmation.' })}
        </div>
        <div className="field">
          <label htmlFor={`${id}-paymentRules`}>Texte sur le paiement (facultatif)</label>
          <textarea id={`${id}-paymentRules`} name="paymentRules" rows={3} maxLength={1200} value={fields.paymentRules} onChange={(event) => set('paymentRules')(event.target.value)} aria-invalid={errors.paymentRules ? true : undefined} />
          {errors.paymentRules && (
            <p className="field-error" role="alert">
              {errors.paymentRules}
            </p>
          )}
        </div>
      </section>

      <section className="card settings-group" aria-labelledby={`${id}-social`}>
        <h2 id={`${id}-social`}>Réseaux sociaux</h2>
        <p className="help-text">Un réseau sans lien n’est pas affiché sur la vitrine. Les liens commencent par https://.</p>
        <div className="settings-grid">
          {field('instagramUrl', 'Instagram', { type: 'url', inputMode: 'url', maxLength: 300 })}
          {field('tiktokUrl', 'TikTok', { type: 'url', inputMode: 'url', maxLength: 300 })}
          {field('facebookUrl', 'Facebook', { type: 'url', inputMode: 'url', maxLength: 300 })}
        </div>
      </section>

      <div className="form-actions">
        <button className="btn" type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </button>
      </div>
      {message && (
        <p className={message.kind === 'error' ? 'field-error' : 'help-text'} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </form>
  );
}
