'use client';

import { useState, type FormEvent } from 'react';
import { downloadFile } from '@/lib/api-client';
import { ZONE_TYPES } from '@/lib/constants/order';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUSES, PAYMENT_STATUS_LABELS, PAYMENT_STATUSES } from '@/lib/constants/order-status';
import {
  ORDERS_EXPORT_FORMAT_LABELS,
  ORDERS_EXPORT_FORMATS,
  ORDERS_EXPORT_MAX_ROWS,
  ORDERS_EXPORT_ROWS_HEADER,
  ORDERS_EXPORT_ZONE_LABELS,
} from '@/lib/constants/orders-export';
import { buildOrdersExportUrl, EMPTY_ORDERS_EXPORT_FORM, toggleValue, type OrdersExportFormValues } from '@/lib/orders-export-form';


interface Outcome {
  filename: string;
  rows: number | null;
}

/** Export des commandes (propriétaire). Aucun filtre coché = toutes les commandes ; la limite est affichée avant le clic. */
export function OrdersExportForm() {
  const [values, setValues] = useState<OrdersExportFormValues>(EMPTY_ORDERS_EXPORT_FORM);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setOutcome(null);

    const result = await downloadFile(buildOrdersExportUrl(values), `commandes.${values.format}`);

    if (result.ok) {
      const rows = Number(result.headers.get(ORDERS_EXPORT_ROWS_HEADER));
      setOutcome({ filename: result.filename, rows: Number.isInteger(rows) ? rows : null });
    } else {
      const fieldMessage = Object.values(result.error.fields ?? {}).flat()[0];
      setErrorMessage(fieldMessage ?? result.error.message);
    }
    setIsPending(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <p className="alert-error" role="alert">
          {errorMessage}
        </p>
      )}
      {outcome && (
        <p className="alert-success" role="status">
          {outcome.rows === null
            ? `Fichier téléchargé : ${outcome.filename}.`
            : `Fichier téléchargé : ${outcome.filename} (${outcome.rows} commande${outcome.rows > 1 ? 's' : ''}).`}
        </p>
      )}

      <fieldset className="field choice-group">
        <legend>Format</legend>
        {ORDERS_EXPORT_FORMATS.map((format) => (
          <label key={format} className="check-row">
            <input
              type="radio"
              name="format"
              value={format}
              checked={values.format === format}
              onChange={() => setValues((current) => ({ ...current, format }))}
            />
            <span>{ORDERS_EXPORT_FORMAT_LABELS[format]}</span>
          </label>
        ))}
      </fieldset>

      <div className="field-row">
        <div className="field">
          <label htmlFor="export-from">Commandes passées à partir du</label>
          <input id="export-from" type="date" value={values.from} onChange={(event) => setValues((current) => ({ ...current, from: event.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="export-to">jusqu’au (inclus)</label>
          <input id="export-to" type="date" value={values.to} onChange={(event) => setValues((current) => ({ ...current, to: event.target.value }))} />
        </div>
      </div>

      <fieldset className="field choice-group">
        <legend>Statut de livraison</legend>
        {DELIVERY_STATUSES.map((status) => (
          <label key={status} className="check-row">
            <input
              type="checkbox"
              checked={values.deliveryStatuses.includes(status)}
              onChange={() => setValues((current) => ({ ...current, deliveryStatuses: toggleValue(current.deliveryStatuses, status) }))}
            />
            <span>{DELIVERY_STATUS_LABELS[status]}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="field choice-group">
        <legend>Statut de paiement</legend>
        {PAYMENT_STATUSES.map((status) => (
          <label key={status} className="check-row">
            <input
              type="checkbox"
              checked={values.paymentStatuses.includes(status)}
              onChange={() => setValues((current) => ({ ...current, paymentStatuses: toggleValue(current.paymentStatuses, status) }))}
            />
            <span>{PAYMENT_STATUS_LABELS[status]}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="field choice-group">
        <legend>Zone</legend>
        {ZONE_TYPES.map((zone) => (
          <label key={zone} className="check-row">
            <input
              type="checkbox"
              checked={values.zones.includes(zone)}
              onChange={() => setValues((current) => ({ ...current, zones: toggleValue(current.zones, zone) }))}
            />
            <span>{ORDERS_EXPORT_ZONE_LABELS[zone]}</span>
          </label>
        ))}
      </fieldset>

      <p className="help-text" style={{ marginBottom: 'var(--space-4)' }}>
        Sans case cochée, toutes les valeurs sont incluses. Un fichier contient {ORDERS_EXPORT_MAX_ROWS.toLocaleString('fr-FR')} commandes au plus.
      </p>

      <button className="btn" type="submit" disabled={isPending}>
        {isPending ? 'Préparation du fichier…' : 'Télécharger'}
      </button>
    </form>
  );
}
