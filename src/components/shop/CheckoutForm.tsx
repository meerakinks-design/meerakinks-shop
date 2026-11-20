import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { ORDER_LIMITS, PLACE_LABELS, ZONE_TYPES, ZONE_TYPE_LABELS, type ZoneTypeValue } from '@/lib/constants/order';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { formatFcfa } from '@/lib/money';
import { controlIdFor, type CheckoutAmounts, type CheckoutErrors, type CheckoutValues } from '@/lib/shop/checkout-form';
import { DIAL_CODES, OTHER_DIAL_CODE } from '@/lib/shop/phone';
import type { PublicZones } from '@/lib/shop/zones';
import { OrderNotice, OrderTotals } from './OrderSummary';

export type CheckoutStatus = 'idle' | 'sending' | 'done';

export interface CheckoutAlert {
  tone: 'error' | 'conflict';
  message: string;
  details?: string[];
}

interface CheckoutFormProps {
  idPrefix: string;
  values: CheckoutValues;
  errors: CheckoutErrors;
  zones: PublicZones;
  depositAmount: number;
  recap: { lines: { productId: string; name: string; quantity: number; lineTotal: number }[]; subtotal: number };
  amounts: CheckoutAmounts;
  alert: CheckoutAlert | null;
  status: CheckoutStatus;
  canSubmit: boolean;
  onChange: (field: keyof CheckoutValues, value: string) => void;
  onZoneTypeChange: (zoneType: ZoneTypeValue) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditCart: () => void;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  help?: string;
  optional?: boolean;
  children: ReactNode;
}

function Field({ id, label, error, help, optional = false, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="field-optional"> (facultatif)</span>}
      </label>
      {children}
      {help && !error && (
        <p id={`${id}-help`} className="help-text">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Attributs d'accessibilité d'un champ : invalide, et description = message d'erreur sinon aide. */
function a11y(id: string, error: string | undefined, hasHelp = false) {
  return {
    id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-error` : hasHelp ? `${id}-help` : undefined,
  };
}

const SENDING_LABELS: Record<CheckoutStatus, string> = {
  idle: 'Envoyer ma commande',
  sending: 'Envoi en cours…',
  done: 'Commande envoyée',
};

/** Formulaire de commande (§6.2). Présentationnel : l'état et l'envoi vivent dans CheckoutModal. */
export function CheckoutForm(props: CheckoutFormProps) {
  const { idPrefix, values, errors, zones, depositAmount, recap, amounts, alert, status, canSubmit, onChange, onZoneTypeChange, onSubmit, onEditCart } = props;
  const id = (name: string) => `${idPrefix}-${name}`;
  const text = (field: keyof CheckoutValues) => ({
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) => onChange(field, event.target.value),
  });

  const zoneOptions = zones[values.zoneType];
  const destinationError = errors.deliveryZoneId ?? errors.placeName;
  const destinationId = controlIdFor(idPrefix, 'placeName');
  const placeLabel = PLACE_LABELS[values.zoneType];
  const international = values.zoneType === 'INTERNATIONAL';
  const phoneError = errors.phone;

  return (
    <form className="checkout-form" noValidate onSubmit={onSubmit} aria-busy={status === 'sending'}>
      <section className="checkout-recap" aria-label="Votre commande">
        <h3>Votre commande</h3>
        <ul>
          {recap.lines.map((line) => (
            <li key={line.productId}>
              <span>
                {line.quantity} × {line.name}
              </span>
              <span>{formatFcfa(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="link-button" onClick={onEditCart}>
          Modifier mon panier
        </button>
      </section>

      <fieldset className="field checkout-group">
        <legend>Vos coordonnées</legend>
        <div className="checkout-row">
          <Field id={id('firstName')} label="Prénom" error={errors.firstName}>
            <input type="text" autoComplete="given-name" maxLength={ORDER_LIMITS.name} {...text('firstName')} {...a11y(id('firstName'), errors.firstName)} />
          </Field>
          <Field id={id('lastName')} label="Nom" error={errors.lastName}>
            <input type="text" autoComplete="family-name" maxLength={ORDER_LIMITS.name} {...text('lastName')} {...a11y(id('lastName'), errors.lastName)} />
          </Field>
        </div>

        <Field id={id('phone')} label="Téléphone (WhatsApp)" error={phoneError} help="Avec l’indicatif de votre pays : la vendeuse vous contactera sur ce numéro.">
          <div className="phone-row">
            <select aria-label="Indicatif du pays" name="dialCode" value={values.dialCode} onChange={(event) => onChange('dialCode', event.target.value)}>
              {DIAL_CODES.map((dial) => (
                <option key={dial.code} value={dial.code}>
                  {dial.label}
                </option>
              ))}
              <option value={OTHER_DIAL_CODE}>Autre pays</option>
            </select>
            {values.dialCode === OTHER_DIAL_CODE && (
              <input
                className="dial-input"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Indicatif"
                aria-label="Indicatif du pays, chiffres seulement"
                name="otherDialCode"
                value={values.otherDialCode}
                onChange={(event) => onChange('otherDialCode', event.target.value)}
              />
            )}
            <input type="tel" inputMode="tel" autoComplete="tel-national" maxLength={ORDER_LIMITS.phone} {...text('phone')} {...a11y(id('phone'), phoneError, true)} />
          </div>
        </Field>

        <Field id={id('email')} label="Email" optional error={errors.email} help="Pour recevoir un accusé de réception de votre commande.">
          <input type="email" inputMode="email" autoComplete="email" maxLength={ORDER_LIMITS.email} {...text('email')} {...a11y(id('email'), errors.email, true)} />
        </Field>
      </fieldset>

      <fieldset className="field checkout-group">
        <legend>Livraison</legend>
        <div role="radiogroup" aria-label="Où livrer ?" className="checkout-zones">
          {ZONE_TYPES.map((type) => (
            <label key={type} className="radio-row">
              <input type="radio" name="zoneType" value={type} checked={values.zoneType === type} onChange={() => onZoneTypeChange(type)} />
              <span>{ZONE_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>

        {zoneOptions.length > 0 ? (
          <Field id={destinationId} label={placeLabel} error={destinationError}>
            <select name="deliveryZoneId" value={values.deliveryZoneId} onChange={(event) => onChange('deliveryZoneId', event.target.value)} {...a11y(destinationId, destinationError)}>
              <option value="">Choisir…</option>
              {zoneOptions.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field id={destinationId} label={placeLabel} error={destinationError}>
            <input type="text" autoComplete={international ? 'country-name' : 'address-level2'} maxLength={ORDER_LIMITS.place} {...text('placeName')} {...a11y(destinationId, destinationError)} />
          </Field>
        )}

        {international && (
          <Field id={id('city')} label="Ville" error={errors.city}>
            <input type="text" autoComplete="address-level2" maxLength={ORDER_LIMITS.place} {...text('city')} {...a11y(id('city'), errors.city)} />
          </Field>
        )}

        <Field id={id('address')} label="Adresse précise" error={errors.address} help="Quartier, rue, repère connu…">
          <input type="text" autoComplete="street-address" maxLength={ORDER_LIMITS.address} {...text('address')} {...a11y(id('address'), errors.address, true)} />
        </Field>
        <Field id={id('addressDetails')} label="Précisions" optional error={errors.addressDetails}>
          <input type="text" maxLength={ORDER_LIMITS.addressDetails} {...text('addressDetails')} {...a11y(id('addressDetails'), errors.addressDetails)} />
        </Field>
      </fieldset>

      <Field id={id('customerNote')} label="Note pour la vendeuse" optional error={errors.customerNote}>
        <textarea rows={3} maxLength={ORDER_LIMITS.note} {...text('customerNote')} {...a11y(id('customerNote'), errors.customerNote)} />
      </Field>

      {/* Champ piège : invisible et hors du parcours clavier ; un robot le remplit, pas un humain. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={id('companyFax')}>Ne pas remplir</label>
        <input id={id('companyFax')} type="text" tabIndex={-1} autoComplete="off" {...text('companyFax')} />
      </div>

      <OrderTotals subtotal={recap.subtotal} zoneType={values.zoneType} estimated {...amounts} />
      <OrderNotice zoneType={values.zoneType} depositAmount={depositAmount} />

      <p className="help-text">
        Vos informations servent uniquement à traiter votre commande (voir la <Link href={PUBLIC_ROUTES.privacy}>politique de confidentialité</Link>).
      </p>

      {alert && (
        <div className={`checkout-alert is-${alert.tone}`} role="alert">
          <p>{alert.message}</p>
          {alert.details && alert.details.length > 0 && (
            <ul>
              {alert.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
          {alert.tone === 'conflict' && (
            <button type="button" className="btn btn-quiet" onClick={onEditCart}>
              Revoir mon panier
            </button>
          )}
        </div>
      )}

      <button type="submit" className="btn btn-block" disabled={!canSubmit || status !== 'idle'}>
        {SENDING_LABELS[status]}
      </button>
    </form>
  );
}
