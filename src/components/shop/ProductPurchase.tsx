'use client';

import { useEffect, useRef, useState } from 'react';
import { PRODUCT_TEXT } from '@/content/product-page';
import { formatFcfa } from '@/lib/money';
import { isOutOfStock, maxOrderableQuantity } from '@/lib/shop/product-display';
import { useCart } from './CartProvider';
import { QuantityStepper } from './QuantityStepper';

interface ProductPurchaseProps {
  product: { id: string; name: string; price: number; salePrice?: number | null; stock: number | null; optionLabel?: string; variants?: { id: string; label: string; price: number | null; salePrice: number | null; stock: number | null }[] };
  /** Barre d'achat collée en bas du téléphone : prévue pour la FICHE PRODUIT seulement (cahier §4.3). Désactivée pour le produit mis en avant de la landing. */
  stickyBar?: boolean;
}

/**
 * Achat de la fiche produit : ligne « Quantité − 1 + », grand bouton « Ajouter au panier ↗ » avec le prix à droite,
 * et, sur téléphone, une barre collée en bas qui reprend le bouton dès que le bouton principal sort de l'écran.
 * La barre se range quand le pied de page est à l'écran : elle ne recouvre jamais ses liens ni le mini-jeu.
 * Le prix affiché est une indication (prix × quantité) : le total officiel est celui du devis du serveur (RM-02).
 */
export function ProductPurchase({ product, stickyBar = true }: ProductPurchaseProps) {
  const { add, quantityOf, hydrated } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [variantId, setVariantId] = useState<string | null>(product.variants?.[0]?.id ?? null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const resetTimer = useRef<number | undefined>(undefined);
  const variant = product.variants?.find((item) => item.id === variantId) ?? null;
  const currentPrice = variant?.salePrice ?? variant?.price ?? product.salePrice ?? product.price;
  const currentStock = variant ? variant.stock : product.stock;
  const max = maxOrderableQuantity(currentStock);
  const inCart = hydrated ? quantityOf(product.id, variantId) : 0;
  const soldOut = isOutOfStock(currentStock);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!stickyBar || !anchor || typeof IntersectionObserver === 'undefined') return undefined;
    // La barre est visible quand le bouton principal n'est pas à l'écran ET que le pied de page n'y est pas non plus.
    let anchorOnScreen = true;
    let footerOnScreen = false;
    const update = () => setBarVisible(!anchorOnScreen && !footerOnScreen);
    const anchorObserver = new IntersectionObserver(([entry]) => {
      anchorOnScreen = entry ? entry.isIntersecting : true;
      update();
    });
    anchorObserver.observe(anchor);
    const footer = document.querySelector('.site-footer');
    const footerObserver = footer
      ? new IntersectionObserver(([entry]) => {
          footerOnScreen = entry ? entry.isIntersecting : false;
          update();
        })
      : null;
    if (footer) footerObserver?.observe(footer);
    return () => {
      anchorObserver.disconnect();
      footerObserver?.disconnect();
    };
  }, [soldOut, stickyBar]);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  if (soldOut) {
    return (
      <p className="purchase-out" role="status">
        {PRODUCT_TEXT.outOfStock}
      </p>
    );
  }

  const chosen = Math.max(1, Math.min(quantity, max));
  const total = formatFcfa(currentPrice * chosen);

  function handleAdd() {
    add({ ...product, price: currentPrice, stock: currentStock, variantId }, chosen);
    setJustAdded(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setJustAdded(false), 1800);
  }

  return (
    <>
      <div className="purchase">
        {product.variants && product.variants.length > 0 && (
          <label className="purchase-row">
            <span className="purchase-row-label">{product.optionLabel ?? 'Option'}</span>
            <select value={variantId ?? ''} onChange={(event) => setVariantId(event.target.value || null)} aria-label={product.optionLabel ?? 'Option'}>
              {product.variants.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        )}
        <div className="purchase-row">
          <span className="purchase-row-label">{PRODUCT_TEXT.quantity}</span>
          <QuantityStepper min={1} max={max} value={chosen} onChange={(next) => setQuantity(Math.max(1, Math.min(next, max)))} label={product.name} />
        </div>
        <button ref={anchorRef} type="button" className="purchase-add" onClick={handleAdd}>
          <span>
            {justAdded ? PRODUCT_TEXT.added : PRODUCT_TEXT.add} <span aria-hidden="true">↗</span>
          </span>
          <span className="purchase-add-price">{total}</span>
        </button>
        {inCart > 0 && <p className="help-text">Déjà dans votre panier : {inCart}</p>}
      </div>

      {stickyBar && (
        <div className={`sticky-buy${barVisible ? ' is-visible' : ''}`} aria-hidden={!barVisible}>
          <div className="sticky-buy-info">
            <span className="sticky-buy-name">{product.name}</span>
            <strong>{total}</strong>
          </div>
          <button type="button" className="sticky-buy-add" onClick={handleAdd} tabIndex={barVisible ? 0 : -1}>
            {justAdded ? PRODUCT_TEXT.added : PRODUCT_TEXT.stickyAdd}
          </button>
        </div>
      )}
    </>
  );
}
