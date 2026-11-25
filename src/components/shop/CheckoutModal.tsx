'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { postJson } from '@/lib/api-client';
import type { ApiError } from '@/lib/api-result';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import type { ZoneTypeValue } from '@/lib/constants/order';
import {
  buildOrderPayload,
  controlIdFor,
  createIdempotencyKey,
  emptyCheckoutValues,
  estimateCheckoutAmounts,
  firstInvalidField,
  toFieldErrors,
  type CheckoutErrors,
  type CheckoutValues,
} from '@/lib/shop/checkout-form';
import { saveConfirmedOrder } from '@/lib/shop/confirmed-order';
import { openModal, replaceModal } from '@/lib/shop/modal-state';
import { markFreshReceipt } from '@/lib/shop/receipt-flag';
import type { OrderCreated } from '@/lib/shop/order-types';
import type { PublicZones } from '@/lib/shop/zones';
import { orderInputSchema } from '@/lib/validation/order.schema';
import { useCart } from './CartProvider';
import type { DeliveryNotes } from '@/lib/shop/delivery-delay';
import { CheckoutForm, type CheckoutAlert, type CheckoutStatus } from './CheckoutForm';
import { CurtainModal } from './CurtainModal';
import { useModal } from './useModal';

/** Au-delà, on propose « Réessayer » plutôt que d'attendre sans fin (la clé d'idempotence rend le renvoi sûr). */
const ORDER_TIMEOUT_MS = 20_000;

interface CheckoutModalProps {
  depositAmount: number;
  zones: PublicZones;
  deliveryNotes?: DeliveryNotes;
}

export function CheckoutModal({ depositAmount, zones, deliveryNotes }: CheckoutModalProps) {
  const { hydrated, cart, quote, quoteIsCurrent, quoteStatus, clear, retryQuote } = useCart();
  const { isOpen, close } = useModal(MODAL_HASHES.checkout);
  const idPrefix = useId();

  const [values, setValues] = useState<CheckoutValues>(emptyCheckoutValues);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [alert, setAlert] = useState<CheckoutAlert | null>(null);
  const [status, setStatus] = useState<CheckoutStatus>('idle');

  // RM-14 : une clé par tentative de commande. Elle survit à un échec réseau (le renvoi ne crée pas de doublon),
  // et change dès que le panier change (un autre panier est une autre commande).
  const keyRef = useRef<string | null>(null);
  const linesSignature = useMemo(() => JSON.stringify(cart.lines), [cart.lines]);
  useEffect(() => {
    keyRef.current = null;
  }, [linesSignature]);

  // Après une commande réussie, le modal se rouvrira pour un nouveau panier : on repart d'un bouton actif.
  useEffect(() => {
    if (isOpen) setStatus((current) => (current === 'done' ? 'idle' : current));
  }, [isOpen]);

  const billableLines = useMemo(() => (quote ? quote.lines.filter((line) => line.quantity > 0) : []), [quote]);
  const hasProblems = quote ? quote.lines.some((line) => line.status !== 'ok') : false;
  const subtotal = quote?.subtotal ?? 0;
  const selectedZone = zones[values.zoneType].find((zone) => zone.id === values.deliveryZoneId) ?? null;
  const amounts = estimateCheckoutAmounts({ subtotal, zoneType: values.zoneType, zone: selectedZone, depositAmount });
  const canSubmit = quoteIsCurrent && !hasProblems && subtotal > 0;

  function changeField(field: keyof CheckoutValues, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field in errors || (field === 'deliveryZoneId' && errors.placeName) || (field === 'placeName' && errors.deliveryZoneId)) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field as keyof CheckoutErrors];
        if (field === 'deliveryZoneId') delete next.placeName;
        if (field === 'placeName') delete next.deliveryZoneId;
        return next;
      });
    }
  }

  function changeZoneType(zoneType: ZoneTypeValue) {
    // La destination n'a pas le même sens d'une zone à l'autre (commune, ville, pays) : on la ressaisit.
    setValues((current) => ({ ...current, zoneType, deliveryZoneId: '', placeName: '', city: '' }));
    setErrors((current) => ({ ...current, deliveryZoneId: undefined, placeName: undefined, city: undefined }));
  }

  function showErrors(found: CheckoutErrors, general?: string | null) {
    setErrors(found);
    setAlert({ tone: 'error', message: general ?? 'Certains champs sont à compléter avant de continuer.' });
    const first = firstInvalidField(found);
    if (first) document.getElementById(controlIdFor(idPrefix, first))?.focus();
  }

  function handleFailure(error: ApiError) {
    setStatus('idle');
    if (error.code === 'NETWORK_ERROR') {
      setAlert({ tone: 'error', message: 'La connexion semble interrompue. Vos informations sont conservées : vérifiez votre réseau puis réessayez.' });
    } else if (error.code === 'VALIDATION_ERROR') {
      const { errors: found, general } = toFieldErrors(error.fields);
      showErrors(found, general ?? error.message);
    } else if (error.code === 'CONFLICT') {
      // Panier changé (stock, produit retiré) ou clé déjà utilisée : on rafraîchit le devis et on repart d'une clé neuve.
      keyRef.current = null;
      retryQuote();
      setAlert({ tone: 'conflict', message: error.message, ...(error.fields?.items ? { details: error.fields.items } : {}) });
    } else {
      setAlert({ tone: 'error', message: error.message });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== 'idle' || !canSubmit) return;

    keyRef.current ??= createIdempotencyKey();
    const payload = buildOrderPayload(values, cart.lines, keyRef.current);

    // Confort : on signale les erreurs tout de suite. Le serveur revalide tout de toute façon.
    const parsed = orderInputSchema.safeParse(payload);
    if (!parsed.success) {
      showErrors(toFieldErrors(parsed.error.flatten().fieldErrors).errors);
      return;
    }

    setStatus('sending');
    setAlert(null);
    setErrors({});
    const result = await postJson<OrderCreated>('/api/v1/orders', payload, { timeoutMs: ORDER_TIMEOUT_MS });
    if (!result.ok) {
      handleFailure(result.error);
      return;
    }

    // Commande enregistrée : le panier est vidé et le modal de confirmation prend le relais, à droite (le bouton WhatsApp s'y trouve).
    setStatus('done');
    keyRef.current = null;
    clear();
    setValues(emptyCheckoutValues());
    // Le reçu (ticket PNG) se télécharge tout de suite dans le modal de confirmation.
    markFreshReceipt(result.data.reference);
    saveConfirmedOrder(result.data);
    replaceModal(MODAL_HASHES.confirmation);
  }

  const shopLink = (
    <Link className="btn" href={PUBLIC_ROUTES.shop} onClick={close}>
      Découvrir la boutique
    </Link>
  );

  let body;
  if (status === 'done') {
    body = (
      <p role="status" className="empty-state">
        Votre commande est enregistrée. Nous préparons la suite.
      </p>
    );
  } else if (!hydrated) {
    body = <div className="skeleton" aria-busy="true" aria-label="Chargement" />;
  } else if (cart.lines.length === 0) {
    body = (
      <div className="empty-state">
        <p>Votre panier attend ses premiers essentiels.</p>
        {shopLink}
      </div>
    );
  } else if (quoteStatus === 'error' && !quote) {
    body = (
      <div className="empty-state" role="alert">
        <p>Votre commande n’a pas pu être préparée pour le moment. Veuillez réessayer.</p>
        <button type="button" className="btn" onClick={retryQuote}>
          Réessayer
        </button>
      </div>
    );
  } else if (!quote) {
    body = <div className="skeleton" aria-busy="true" aria-label="Chargement" />;
  } else {
    const problemAlert: CheckoutAlert | null = hasProblems
      ? { tone: 'conflict', message: 'Votre panier a changé : certains articles ne sont plus disponibles en quantité suffisante. Revoyez votre panier avant de commander.' }
      : null;
    body = (
      <>
        <p className="help-text checkout-intro">
          Renseignez vos coordonnées pour transmettre votre commande. Notre équipe vous contactera ensuite sur WhatsApp pour la confirmer.
        </p>
        <CheckoutForm
          idPrefix={idPrefix}
          values={values}
          errors={errors}
          zones={zones}
          {...(deliveryNotes ? { deliveryNotes } : {})}
          depositAmount={depositAmount}
          recap={{ lines: billableLines.map(({ productId, name, quantity, lineTotal }) => ({ productId, name, quantity, lineTotal })), subtotal }}
          amounts={amounts}
          alert={alert ?? problemAlert}
          status={status}
          canSubmit={canSubmit}
          onChange={changeField}
          onZoneTypeChange={changeZoneType}
          onSubmit={handleSubmit}
          onEditCart={() => openModal(MODAL_HASHES.cart)}
        />
      </>
    );
  }

  return (
    <CurtainModal hash={MODAL_HASHES.checkout} title="Vos informations de livraison" closeLabel="Fermer la commande" className="modal-checkout">
      {body}
    </CurtainModal>
  );
}
