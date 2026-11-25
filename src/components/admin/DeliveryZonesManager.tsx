'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { PLACE_LABELS, ZONE_TYPES, type ZoneTypeValue } from '@/lib/constants/order';
import { DEFAULT_DELAYS, DELAY_DISCLAIMER, formatDelay, zoneDelay } from '@/lib/shop/delivery-delay';
import { formatFcfa, parseFcfaInput } from '@/lib/money';

export interface DeliveryZoneItem {
  id: string;
  name: string;
  type: ZoneTypeValue;
  fee: number | null;
  deliveryMinHours: number | null;
  deliveryMaxHours: number | null;
  isActive: boolean;
  position: number;
  orderCount: number;
}

export interface DeliveryNotesItem {
  deliveryLeadTimeNote: string | null;
  deliveryRules: string | null;
}

const SECTION_TITLES: Record<ZoneTypeValue, string> = {
  ABIDJAN: 'Communes d’Abidjan',
  INTERIOR: 'Intérieur du pays',
  INTERNATIONAL: 'International',
};

const SECTION_HELP: Record<ZoneTypeValue, string> = {
  ABIDJAN: 'Acompte pour confirmer, solde à la livraison. Une commune par ligne.',
  INTERIOR: 'Paiement intégral avant expédition. Sans zone ici, la cliente saisit sa ville et les frais restent « à confirmer ».',
  INTERNATIONAL: 'Paiement intégral avant expédition. Sans zone ici, la cliente saisit son pays et les frais restent « à confirmer ».',
};

const toNumberOrNull = (text: string): number | null => {
  const digits = text.replace(/\D/g, '');
  return digits === '' || digits.length > 6 ? null : Number(digits);
};

/** Ce que le public verra pour un délai saisi : le délai propre de la zone, sinon celui de son type. */
function delayPreview(type: ZoneTypeValue, min: string, max: string): string {
  const own = zoneDelay(toNumberOrNull(min), toNumberOrNull(max));
  return own ? `Affiché : ${formatDelay(own)}` : `Affiché : ${formatDelay(DEFAULT_DELAYS[type])} (délai par défaut de ce type de zone)`;
}

export function DeliveryZonesManager({ zones, notes }: { zones: DeliveryZoneItem[]; notes: DeliveryNotesItem }) {
  return (
    <div className="stack">
      <NotesForm notes={notes} />
      {ZONE_TYPES.map((type) => {
        const ofType = zones.filter((zone) => zone.type === type);
        return (
          <section key={type} className="card zone-section" aria-labelledby={`zones-${type}`}>
            <h2 id={`zones-${type}`}>{SECTION_TITLES[type]}</h2>
            <p className="help-text">
              {SECTION_HELP[type]} Délai par défaut : {formatDelay(DEFAULT_DELAYS[type])}.
            </p>
            {ofType.length === 0 ? (
              <p className="help-text">Aucune zone enregistrée.</p>
            ) : (
              <ul className="plain-list">
                {ofType.map((zone) => (
                  <li key={zone.id} className="zone-item">
                    <ZoneRow zone={zone} />
                  </li>
                ))}
              </ul>
            )}
            <NewZoneForm type={type} nextPosition={ofType.length} />
          </section>
        );
      })}
    </div>
  );
}

function NotesForm({ notes }: { notes: DeliveryNotesItem }) {
  const router = useRouter();
  const id = useId();
  const [leadTime, setLeadTime] = useState(notes.deliveryLeadTimeNote ?? '');
  const [rules, setRules] = useState(notes.deliveryRules ?? '');
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    const result = await adminApi.deliveryNotes.update({ deliveryLeadTimeNote: leadTime, deliveryRules: rules });
    setIsPending(false);
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.fields?.deliveryLeadTimeNote?.[0] ?? result.error.fields?.deliveryRules?.[0] ?? result.error.message });
      return;
    }
    setMessage({ kind: 'ok', text: 'Enregistré. Le site est mis à jour.' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card category-row" noValidate>
      <h2>Textes affichés avec les délais</h2>
      <p className="help-text">
        Un délai est toujours présenté comme indicatif. Le site écrit déjà : « {DELAY_DISCLAIMER} ». Vous pouvez y ajouter une précision (par exemple le point de départ du délai) et un texte sur la livraison.
      </p>
      <div className="field">
        <label htmlFor={`${id}-lead`}>Précision sur les délais (facultatif)</label>
        <textarea id={`${id}-lead`} rows={2} value={leadTime} onChange={(event) => setLeadTime(event.target.value)} maxLength={400} />
      </div>
      <div className="field">
        <label htmlFor={`${id}-rules`}>Texte sur la livraison (facultatif)</label>
        <textarea id={`${id}-rules`} rows={3} value={rules} onChange={(event) => setRules(event.target.value)} maxLength={1200} />
      </div>
      <div className="form-actions">
        <button className="btn" type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer les textes'}
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

function NewZoneForm({ type, nextPosition }: { type: ZoneTypeValue; nextPosition: number }) {
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    const result = await adminApi.deliveryZones.create({ name, type, position: nextPosition });
    setIsPending(false);
    if (!result.ok) {
      setError(result.error.fields?.name?.[0] ?? result.error.message);
      return;
    }
    setName('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form" noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>Nouvelle zone ({PLACE_LABELS[type].toLowerCase()})</label>
        <input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} aria-invalid={Boolean(error)} />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button className="btn" type="submit" disabled={isPending}>
        {isPending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}

function ZoneRow({ zone }: { zone: DeliveryZoneItem }) {
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState(zone.name);
  const [fee, setFee] = useState(zone.fee === null ? '' : String(zone.fee));
  const [minHours, setMinHours] = useState(zone.deliveryMinHours === null ? '' : String(zone.deliveryMinHours));
  const [maxHours, setMaxHours] = useState(zone.deliveryMaxHours === null ? '' : String(zone.deliveryMaxHours));
  const [isActive, setIsActive] = useState(zone.isActive);
  const [position, setPosition] = useState(String(zone.position));
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const feeValue = parseFcfaInput(fee);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    const result = await adminApi.deliveryZones.update(zone.id, {
      name,
      type: zone.type,
      fee: feeValue,
      deliveryMinHours: toNumberOrNull(minHours),
      deliveryMaxHours: toNumberOrNull(maxHours),
      isActive,
      position: toNumberOrNull(position) ?? 0,
    });
    setIsPending(false);
    if (!result.ok) {
      const fields = result.error.fields;
      setMessage({ kind: 'error', text: fields?.name?.[0] ?? fields?.deliveryMaxHours?.[0] ?? fields?.deliveryMinHours?.[0] ?? fields?.fee?.[0] ?? result.error.message });
      return;
    }
    setMessage({ kind: 'ok', text: 'Enregistré. Le site est mis à jour.' });
    router.refresh();
  }

  async function handleDelete() {
    setIsPending(true);
    const result = await adminApi.deliveryZones.remove(zone.id);
    setIsPending(false);
    setConfirmingDelete(false);
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.message });
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="category-row" noValidate>
      <div className="zone-fields">
        <div className="field">
          <label htmlFor={`${id}-name`}>Nom</label>
          <input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-fee`}>Frais (FCFA)</label>
          <input id={`${id}-fee`} inputMode="numeric" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="À confirmer" />
          <p className="help-text">{feeValue === null ? 'Vide : « frais à confirmer » sur le site.' : `Affiché : ${formatFcfa(feeValue)}`}</p>
        </div>
        <div className="field">
          <label htmlFor={`${id}-min`}>Délai minimal (heures)</label>
          <input id={`${id}-min`} inputMode="numeric" value={minHours} onChange={(event) => setMinHours(event.target.value)} placeholder="Par défaut" />
        </div>
        <div className="field">
          <label htmlFor={`${id}-max`}>Délai maximal (heures)</label>
          <input id={`${id}-max`} inputMode="numeric" value={maxHours} onChange={(event) => setMaxHours(event.target.value)} placeholder="Par défaut" />
        </div>
      </div>
      <p className="help-text" role="status">
        {delayPreview(zone.type, minHours, maxHours)}. Toujours présenté comme indicatif.
      </p>
      <div className="zone-fields">
        <div className="field">
          <label className="check-row">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            <span>Zone desservie (proposée aux clients)</span>
          </label>
        </div>
        <div className="field field-narrow">
          <label htmlFor={`${id}-pos`}>Ordre</label>
          <input id={`${id}-pos`} inputMode="numeric" value={position} onChange={(event) => setPosition(event.target.value)} />
        </div>
      </div>
      {zone.orderCount > 0 && (
        <p className="help-text">
          {zone.orderCount} commande{zone.orderCount > 1 ? 's' : ''} dans cette zone : pour la retirer du site, décochez « Zone desservie » plutôt que de la supprimer.
        </p>
      )}
      <div className="form-actions">
        <button className="btn" type="submit" disabled={isPending}>
          Enregistrer
        </button>
        {!confirmingDelete ? (
          <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(true)} disabled={isPending}>
            Supprimer
          </button>
        ) : (
          <span className="confirm-delete" role="group" aria-label="Confirmer la suppression">
            <span>Supprimer cette zone ?</span>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isPending}>
              Oui, supprimer
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(false)}>
              Annuler
            </button>
          </span>
        )}
      </div>
      {message && (
        <p className={message.kind === 'error' ? 'field-error' : 'help-text'} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </form>
  );
}
