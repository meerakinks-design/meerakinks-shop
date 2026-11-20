import { DeliveryStatus, PaymentKind, PaymentMethod, PaymentStatus, ProductStatus, ZoneType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { DELIVERY_STATUSES, DELIVERY_STATUS_LABELS, DELIVERY_TRANSITIONS, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS, canTransitionDelivery } from '@/lib/constants/order-status';
import { ZONE_TYPES, ZONE_TYPE_LABELS } from '@/lib/constants/order';
import { PAYMENT_KINDS, PAYMENT_KIND_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/constants/payment';
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS } from '@/lib/constants/product';

// Filet de sécurité : si le schéma Prisma gagne un statut, ce test casse tant que le libellé français manque.
const sorted = (values: readonly string[]) => [...values].sort();

describe('statuts alignés sur le schéma Prisma', () => {
  it('livraison', () => {
    expect(sorted(DELIVERY_STATUSES)).toEqual(sorted(Object.keys(DeliveryStatus)));
    expect(sorted(Object.keys(DELIVERY_STATUS_LABELS))).toEqual(sorted(Object.keys(DeliveryStatus)));
  });
  it('paiement', () => {
    expect(sorted(PAYMENT_STATUSES)).toEqual(sorted(Object.keys(PaymentStatus)));
    expect(sorted(Object.keys(PAYMENT_STATUS_LABELS))).toEqual(sorted(Object.keys(PaymentStatus)));
  });
  it('produit', () => {
    expect(sorted(PRODUCT_STATUSES)).toEqual(sorted(Object.keys(ProductStatus)));
    expect(sorted(Object.keys(PRODUCT_STATUS_LABELS))).toEqual(sorted(Object.keys(ProductStatus)));
  });
  it('types et modes de paiement', () => {
    expect(sorted(PAYMENT_KINDS)).toEqual(sorted(Object.keys(PaymentKind)));
    expect(sorted(Object.keys(PAYMENT_KIND_LABELS))).toEqual(sorted(Object.keys(PaymentKind)));
    expect(sorted(PAYMENT_METHODS)).toEqual(sorted(Object.keys(PaymentMethod)));
    expect(sorted(Object.keys(PAYMENT_METHOD_LABELS))).toEqual(sorted(Object.keys(PaymentMethod)));
  });
  it('zone de livraison', () => {
    expect(sorted(ZONE_TYPES)).toEqual(sorted(Object.keys(ZoneType)));
    expect(sorted(Object.keys(ZONE_TYPE_LABELS))).toEqual(sorted(Object.keys(ZoneType)));
  });
  it('les libellés suivent le cahier', () => {
    expect(DELIVERY_STATUS_LABELS.PENDING).toBe('En attente');
    expect(DELIVERY_STATUS_LABELS.SHIPPED).toBe('En livraison');
    expect(PAYMENT_STATUS_LABELS.DEPOSIT_DUE).toBe('Acompte attendu');
    expect(PAYMENT_STATUS_LABELS.REFUNDED).toBe('Remboursé');
  });
});

describe('transitions de livraison', () => {
  it('avance d’une étape à la fois', () => {
    expect(canTransitionDelivery('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransitionDelivery('PENDING', 'DELIVERED')).toBe(false);
    expect(canTransitionDelivery('CONFIRMED', 'PENDING')).toBe(false);
  });
  it('permet d’annuler tant que ce n’est pas livré', () => {
    for (const from of ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED'] as const) expect(canTransitionDelivery(from, 'CANCELLED')).toBe(true);
  });
  it('une commande livrée ou annulée est définitive', () => {
    expect(DELIVERY_TRANSITIONS.DELIVERED).toEqual([]);
    expect(DELIVERY_TRANSITIONS.CANCELLED).toEqual([]);
  });
  it('ne mène jamais vers un statut inconnu', () => {
    for (const targets of Object.values(DELIVERY_TRANSITIONS)) for (const target of targets) expect(DELIVERY_STATUSES).toContain(target);
  });
});
