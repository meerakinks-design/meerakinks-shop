'use client';

import { useId, useState, type FormEvent } from 'react';
import { LANDING } from '@/content/landing';
import { postJson } from '@/lib/api-client';
import { CONTACT_LIMITS, CONTACT_TOPICS, type ContactTopic, type ReplyChannel } from '@/lib/constants/contact';
import { createIdempotencyKey } from '@/lib/shop/checkout-form';
import { DEFAULT_DIAL_CODE, DIAL_CODES } from '@/lib/shop/phone';
import { contactInputSchema } from '@/lib/validation/contact.schema';

const copy = LANDING.contact.form;

interface Values {
  topic: ContactTopic;
  name: string;
  replyChannel: ReplyChannel;
  dialCode: string;
  phone: string;
  email: string;
  orderReference: string;
  message: string;
  consent: boolean;
  companyFax: string;
}

type FieldName = 'topic' | 'name' | 'replyChannel' | 'phone' | 'email' | 'orderReference' | 'message' | 'consent';
type Errors = Partial<Record<FieldName, string>>;
type Status = 'idle' | 'sending' | 'done';

const emptyValues = (): Values => ({
  topic: 'PRODUCT',
  name: '',
  replyChannel: 'WHATSAPP',
  dialCode: DEFAULT_DIAL_CODE,
  phone: '',
  email: '',
  orderReference: '',
  message: '',
  consent: false,
  companyFax: '',
});

const FIELD_ORDER: FieldName[] = ['topic', 'name', 'replyChannel', 'phone', 'email', 'orderReference', 'message', 'consent'];
const SEND_TIMEOUT_MS = 15_000;

/** Première erreur de chaque champ, dans l'ordre du formulaire. */
function toErrors(fieldErrors: Record<string, string[] | undefined>): Errors {
  const errors: Errors = {};
  for (const field of FIELD_ORDER) {
    const message = fieldErrors[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}

/**
 * Formulaire de contact « intelligent » : il s'adapte au sujet et au canal de réponse choisis.
 *  - sujet « Ma commande » → la référence de commande devient obligatoire (et vérifiée) ;
 *  - réponse sur WhatsApp → numéro avec indicatif (normalisé comme à la commande) ; par e-mail → adresse e-mail ;
 *  - les erreurs sont posées champ par champ, le focus va sur le premier champ à corriger ;
 *  - une clé par tentative : un renvoi après coupure réseau ne crée pas de doublon.
 * Le message part par Resend vers la vendeuse (POST /api/v1/contact) ; les informations saisies sont conservées en cas d'échec.
 */
export function ContactForm({ whatsappHref }: { whatsappHref: string | null }) {
  const idPrefix = useId();
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [key, setKey] = useState<string | null>(null);

  const id = (name: string) => `${idPrefix}-${name}`;
  const controlId = (field: FieldName) => (field === 'replyChannel' ? id('replyChannel-whatsapp') : id(field));

  function change<K extends keyof Values>(field: K, value: Values[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field as FieldName];
        return next;
      });
    }
  }

  function showErrors(found: Errors, general?: string) {
    setErrors(found);
    setAlert(general ?? copy.incomplete);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) document.getElementById(controlId(first))?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== 'idle') return;

    const attemptKey = key ?? createIdempotencyKey();
    setKey(attemptKey);
    const payload = { ...values, idempotencyKey: attemptKey };
    const parsed = contactInputSchema.safeParse(payload);
    if (!parsed.success) {
      showErrors(toErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setStatus('sending');
    setAlert(null);
    setErrors({});
    const result = await postJson<{ sent: boolean }>('/api/v1/contact', payload, { timeoutMs: SEND_TIMEOUT_MS });
    if (!result.ok) {
      setStatus('idle');
      if (result.error.code === 'VALIDATION_ERROR') showErrors(toErrors(result.error.fields ?? {}), result.error.message);
      else setAlert(result.error.code === 'NETWORK_ERROR' ? copy.error : result.error.message);
      return;
    }
    setStatus('done');
    setKey(null);
    setValues(emptyValues());
  }

  if (status === 'done') {
    return (
      <div className="contact-done" role="status">
        <p>{copy.success}</p>
        <button type="button" className="btn btn-quiet" onClick={() => setStatus('idle')}>
          Envoyer un autre message
        </button>
      </div>
    );
  }

  const describe = (field: FieldName, helpId?: string) => ({
    id: id(field),
    'aria-invalid': errors[field] ? (true as const) : undefined,
    'aria-describedby': errors[field] ? `${id(field)}-error` : helpId,
  });
  const fieldError = (field: FieldName) =>
    errors[field] ? (
      <p id={`${id(field)}-error`} className="field-error">
        {errors[field]}
      </p>
    ) : null;
  const remaining = CONTACT_LIMITS.message - values.message.length;

  return (
    <form className="contact-form" noValidate onSubmit={handleSubmit} aria-busy={status === 'sending'}>
      <h3 className="contact-form-title">{copy.title}</h3>
      <p className="help-text">{copy.intro}</p>

      <div className="field">
        <label htmlFor={id('topic')}>{copy.topicLabel}</label>
        <select {...describe('topic')} value={values.topic} onChange={(event) => change('topic', event.target.value as ContactTopic)}>
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {copy.topics[topic]}
            </option>
          ))}
        </select>
        {fieldError('topic')}
      </div>

      <div className="field">
        <label htmlFor={id('name')}>{copy.nameLabel}</label>
        <input {...describe('name')} type="text" name="name" autoComplete="name" placeholder={copy.namePlaceholder} value={values.name} onChange={(event) => change('name', event.target.value)} />
        {fieldError('name')}
      </div>

      <fieldset className="field" aria-describedby={errors.replyChannel ? `${id('replyChannel')}-error` : undefined}>
        <legend>{copy.replyLabel}</legend>
        <label className="radio-row" htmlFor={id('replyChannel-whatsapp')}>
          <input id={id('replyChannel-whatsapp')} type="radio" name="replyChannel" value="WHATSAPP" checked={values.replyChannel === 'WHATSAPP'} onChange={() => change('replyChannel', 'WHATSAPP')} />
          <span>{copy.replyWhatsapp}</span>
        </label>
        <label className="radio-row" htmlFor={id('replyChannel-email')}>
          <input id={id('replyChannel-email')} type="radio" name="replyChannel" value="EMAIL" checked={values.replyChannel === 'EMAIL'} onChange={() => change('replyChannel', 'EMAIL')} />
          <span>{copy.replyEmail}</span>
        </label>
        {fieldError('replyChannel')}
      </fieldset>

      {values.replyChannel === 'WHATSAPP' ? (
        <div className="field">
          <label htmlFor={id('phone')}>{copy.phoneLabel}</label>
          <div className="phone-row">
            <select aria-label="Indicatif du pays" name="dialCode" autoComplete="tel-country-code" value={values.dialCode} onChange={(event) => change('dialCode', event.target.value)}>
              {DIAL_CODES.map((dial) => (
                <option key={dial.code} value={dial.code}>
                  {dial.label}
                </option>
              ))}
            </select>
            <input {...describe('phone')} type="tel" name="phone" inputMode="tel" autoComplete="tel-national" value={values.phone} onChange={(event) => change('phone', event.target.value)} />
          </div>
          {fieldError('phone')}
        </div>
      ) : (
        <div className="field">
          <label htmlFor={id('email')}>{copy.emailLabel}</label>
          <input {...describe('email')} type="email" name="email" inputMode="email" autoComplete="email" placeholder={copy.emailPlaceholder} value={values.email} onChange={(event) => change('email', event.target.value)} />
          {fieldError('email')}
        </div>
      )}

      {values.topic === 'ORDER' && (
        <div className="field">
          <label htmlFor={id('orderReference')}>{copy.referenceLabel}</label>
          <input
            {...describe('orderReference', `${id('orderReference')}-help`)}
            type="text"
            name="orderReference"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder={copy.referencePlaceholder}
            value={values.orderReference}
            onChange={(event) => change('orderReference', event.target.value.toUpperCase())}
          />
          {errors.orderReference ? fieldError('orderReference') : (
            <p id={`${id('orderReference')}-help`} className="help-text">
              {copy.referenceHelp}
            </p>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor={id('message')}>{copy.messageLabel}</label>
        <textarea
          {...describe('message', `${id('message')}-count`)}
          name="message"
          rows={5}
          maxLength={CONTACT_LIMITS.message}
          placeholder={copy.messagePlaceholder}
          value={values.message}
          onChange={(event) => change('message', event.target.value)}
        />
        {fieldError('message')}
        <p id={`${id('message')}-count`} className="help-text contact-count">
          {values.message.length} / {CONTACT_LIMITS.message}
          {remaining <= 100 ? ` (${remaining} restants)` : ''}
        </p>
      </div>

      <div className="field">
        <label className="check-row" htmlFor={id('consent')}>
          <input {...describe('consent')} type="checkbox" name="consent" checked={values.consent} onChange={(event) => change('consent', event.target.checked)} />
          <span>{copy.consent}</span>
        </label>
        {fieldError('consent')}
      </div>

      {/* Champ piège : invisible et hors du parcours clavier ; un robot le remplit, pas un humain. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={id('companyFax')}>Ne pas remplir</label>
        <input id={id('companyFax')} type="text" name="companyFax" tabIndex={-1} autoComplete="off" value={values.companyFax} onChange={(event) => change('companyFax', event.target.value)} />
      </div>

      {alert && (
        <div className="checkout-alert is-error" role="alert">
          <p>{alert}</p>
          {whatsappHref && (
            <p>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                {LANDING.contact.cta}
              </a>
            </p>
          )}
        </div>
      )}

      <button type="submit" className="btn btn-block" disabled={status !== 'idle'}>
        {status === 'sending' ? copy.sending : copy.submit}
      </button>
    </form>
  );
}
