'use client';

import { dialCountryName, MAX_DIAL_CODE_LENGTH, sanitizeDialCode } from '@/lib/shop/phone';

interface PhoneInputProps {
  /** Identifiant du champ « numéro » (celui du label, des erreurs et du focus). */
  id: string;
  dialCode: string;
  phone: string;
  onDialCodeChange: (dialCode: string) => void;
  onPhoneChange: (phone: string) => void;
  invalid?: boolean;
  describedBy?: string | undefined;
  maxLength?: number;
  className?: string;
}

/**
 * Numéro WhatsApp avec indicatif TAPÉ par le client : « + [225] [numéro] ».
 * Pas de liste fermée : un pays absent de notre liste ne bloque personne. On affiche le pays quand l'indicatif est connu
 * et on accepte tel quel un indicatif inconnu. Le client peut aussi coller son numéro complet « +… » dans le champ du numéro.
 * Utilisé par le formulaire de contact ET par le formulaire de commande : même comportement partout.
 */
export function PhoneInput({ id, dialCode, phone, onDialCodeChange, onPhoneChange, invalid = false, describedBy, maxLength, className = '' }: PhoneInputProps) {
  const country = dialCountryName(dialCode);
  const typedCode = sanitizeDialCode(dialCode);
  const hintId = `${id}-country`;
  return (
    <div className={`phone-input ${className}`.trim()}>
      <div className="phone-row">
        <div className="dial-group">
          <span aria-hidden="true">+</span>
          <input
            className="dial-input"
            type="text"
            inputMode="numeric"
            autoComplete="tel-country-code"
            name="dialCode"
            maxLength={MAX_DIAL_CODE_LENGTH + 1}
            placeholder="225"
            aria-label="Indicatif de votre pays, chiffres seulement"
            aria-describedby={hintId}
            value={dialCode}
            onChange={(event) => onDialCodeChange(sanitizeDialCode(event.target.value))}
          />
        </div>
        <input
          id={id}
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel-national"
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          {...(maxLength ? { maxLength } : {})}
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
        />
      </div>
      <p id={hintId} className="help-text dial-hint">
        {typedCode === ''
          ? 'Tapez l’indicatif de votre pays (ex. 225).'
          : country
            ? `Pays : ${country}`
            : 'Pays non listé : aucun souci, votre indicatif est accepté tel quel.'}
      </p>
    </div>
  );
}
