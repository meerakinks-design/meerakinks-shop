'use client';

import Link from 'next/link';
import { PUBLIC_ROUTES, MODAL_HASHES, productPath } from '@/lib/constants/routes';
import { CHECKOUT_ENABLED } from '@/lib/constants/features';
import { cloudinaryThumbnail } from '@/lib/cloudinary-url';
import { formatFcfa } from '@/lib/money';
import type { QuoteLine } from '@/lib/shop/quote-types';
import { DELIVERY_FEES_NOTE, paymentReminder } from '@/content/livraison';
import { useCart } from './CartProvider';
import { Modal } from './Modal';
import { QuantityStepper } from './QuantityStepper';
import { openModal } from '@/lib/shop/modal-state';
import { useModal } from './useModal';

const STATUS_NOTES: Partial<Record<QuoteLine['status'], string>> = {
  unavailable: 'Ce produit n’est plus disponible.',
  out_of_stock: 'Ce produit est épuisé pour le moment.',
};

export function CartModal({ depositAmount }: { depositAmount: number }) {
  const { cart, quote, quoteIsCurrent, quoteStatus, setQuantity, remove, retryQuote } = useCart();
  const { close } = useModal(MODAL_HASHES.cart);
  const isEmpty = cart.lines.length === 0;

  return (
    <Modal hash={MODAL_HASHES.cart} title="Mon panier" className="modal-cart">
      {isEmpty ? (
        <div className="empty-state">
          <p>Votre panier est vide.</p>
          <Link className="btn" href={PUBLIC_ROUTES.shop} onClick={close}>
            Découvrir la boutique
          </Link>
        </div>
      ) : quoteStatus === 'error' && !quote ? (
        <div className="empty-state" role="alert">
          <p>Impossible d’afficher votre panier pour le moment.</p>
          <button type="button" className="btn" onClick={retryQuote}>
            Réessayer
          </button>
        </div>
      ) : !quote ? (
        <ul className="cart-lines" aria-busy="true" aria-label="Chargement du panier">
          {cart.lines.map((line) => (
            <li key={line.productId} className="skeleton" />
          ))}
        </ul>
      ) : (
        <>
          <div className="cart-scroll">
            <ul className="cart-lines">
              {quote.lines.map((line) => {
                const note = STATUS_NOTES[line.status] ?? (line.status === 'limited' ? `Quantité limitée à ${line.quantity} (stock disponible).` : null);
                const unavailable = line.status === 'unavailable' || line.status === 'out_of_stock';
                return (
                  <li key={line.productId} className={`cart-line${unavailable ? ' is-unavailable' : ''}`}>
                    {line.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cloudinaryThumbnail(line.imageUrl, 240)} alt={line.imageAlt} width={104} height={104} loading="lazy" />
                    ) : (
                      <span className="img-placeholder cart-thumb" aria-hidden="true" />
                    )}
                    <div className="cart-line-info">
                      {line.slug ? (
                        <Link href={productPath(line.slug)} onClick={close}>
                          {line.name}
                        </Link>
                      ) : (
                        <span className="cart-line-name">{line.name}</span>
                      )}
                      {!unavailable && <span className="cart-line-meta">{formatFcfa(line.unitPrice)} l’unité</span>}
                      {note && (
                        <span className="field-error" role="status">
                          {note}
                        </span>
                      )}
                      <div className="cart-line-bottom">
                        {!unavailable && (
                          <QuantityStepper compact label={line.name} value={line.quantity} max={line.maxQuantity} onChange={(next) => setQuantity(line.productId, next, line.maxQuantity)} />
                        )}
                        {!unavailable && (
                          <p className="cart-line-price">
                            {line.regularPrice !== null && <s>{formatFcfa(line.regularPrice * line.quantity)}</s>}
                            <strong>{formatFcfa(line.lineTotal)}</strong>
                          </p>
                        )}
                      </div>
                      <button type="button" className="link-button cart-remove" onClick={() => remove(line.productId)}>
                        Retirer
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="help-text">{paymentReminder(depositAmount)}</p>
          </div>

          <div className="cart-footer">
            <div className="cart-summary" aria-live="polite">
              <p className="cart-row">
                <span>Livraison</span>
                <span>À confirmer</span>
              </p>
              <p className="cart-row cart-subtotal">
                <span>Sous-total</span>
                <strong>{quoteIsCurrent ? formatFcfa(quote.subtotal) : 'Mise à jour…'}</strong>
              </p>
              <p className="help-text">{DELIVERY_FEES_NOTE}</p>
            </div>

            <div className="cart-checkout-bar">
              <button
                type="button"
                className="cart-checkout"
                disabled={!CHECKOUT_ENABLED || !quoteIsCurrent || quote.subtotal === 0}
                aria-describedby={CHECKOUT_ENABLED ? undefined : 'checkout-soon'}
                onClick={() => openModal(MODAL_HASHES.checkout)}
              >
                <span>Passer commande</span>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M4 12h16M14 6l6 6-6 6" />
                </svg>
              </button>
              {!CHECKOUT_ENABLED && (
                <p id="checkout-soon" className="help-text cart-soon">
                  La commande en ligne ouvre très bientôt.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
