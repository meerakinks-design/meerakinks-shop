import { describe, expect, it } from 'vitest';
import {
  checkNewPayment,
  collectedSince,
  deliveryActions,
  derivePaymentStatus,
  groupOrdersByTodo,
  orderTodos,
  paymentKindOptions,
  planStockRestoration,
  refundDue,
} from '@/lib/shop/order-admin';
import type { PaymentLine } from '@/lib/shop/payments';

const pay = (kind: PaymentLine['kind'], amount: number, voidedAt: Date | null = null): PaymentLine => ({ kind, amount, voidedAt });
const ctx = (overrides: Partial<Parameters<typeof derivePaymentStatus>[0]> = {}) => ({
  deliveryStatus: 'PENDING' as const,
  zoneType: 'ABIDJAN' as const,
  total: 17000,
  upfrontAmount: 2000,
  payments: [] as PaymentLine[],
  ...overrides,
});

describe('derivePaymentStatus (RM-19)', () => {
  it('sans paiement : acompte attendu à Abidjan, « à confirmer » ailleurs (jamais « payé » sans saisie, RM-10)', () => {
    expect(derivePaymentStatus(ctx())).toBe('DEPOSIT_DUE');
    expect(derivePaymentStatus(ctx({ zoneType: 'INTERIOR', upfrontAmount: null, total: null }))).toBe('TO_CONFIRM');
  });
  it('acompte seul reçu à Abidjan → Acompte reçu', () => {
    expect(derivePaymentStatus(ctx({ payments: [pay('DEPOSIT', 2000)] }))).toBe('DEPOSIT_PAID');
  });
  it('acompte reçu alors que les frais ne sont pas encore fixés (total inconnu)', () => {
    expect(derivePaymentStatus(ctx({ total: null, payments: [pay('DEPOSIT', 2000)] }))).toBe('DEPOSIT_PAID');
  });
  it('acompte + solde partiel → Paiement partiel ; tout le total → Paiement intégral', () => {
    expect(derivePaymentStatus(ctx({ payments: [pay('DEPOSIT', 2000), pay('BALANCE', 5000)] }))).toBe('PARTIALLY_PAID');
    expect(derivePaymentStatus(ctx({ payments: [pay('DEPOSIT', 2000), pay('BALANCE', 15000)] }))).toBe('PAID');
  });
  it('paiement intégral hors Abidjan', () => {
    expect(derivePaymentStatus(ctx({ zoneType: 'INTERIOR', upfrontAmount: 20000, total: 20000, payments: [pay('FULL', 20000)] }))).toBe('PAID');
    expect(derivePaymentStatus(ctx({ zoneType: 'INTERIOR', upfrontAmount: 20000, total: 20000, payments: [pay('BALANCE', 5000)] }))).toBe('PARTIALLY_PAID');
  });
  it('un montant inférieur à l’acompte attendu reste un paiement partiel', () => {
    expect(derivePaymentStatus(ctx({ payments: [pay('DEPOSIT', 1000)] }))).toBe('PARTIALLY_PAID');
  });
  it('un paiement annulé ne compte plus (RM-21) : retour au statut de départ', () => {
    expect(derivePaymentStatus(ctx({ payments: [pay('DEPOSIT', 2000, new Date())] }))).toBe('DEPOSIT_DUE');
  });
  it('remboursement total → Remboursé ; remboursement partiel → statut recalculé sur le net (RM-22)', () => {
    expect(derivePaymentStatus(ctx({ deliveryStatus: 'CANCELLED', payments: [pay('DEPOSIT', 2000), pay('REFUND', 2000)] }))).toBe('REFUNDED');
    expect(derivePaymentStatus(ctx({ payments: [pay('FULL', 17000), pay('REFUND', 3000)] }))).toBe('PARTIALLY_PAID');
  });
  it('commande annulée : Annulé si rien n’a été encaissé, sinon le statut reste visible jusqu’au remboursement', () => {
    expect(derivePaymentStatus(ctx({ deliveryStatus: 'CANCELLED' }))).toBe('CANCELLED');
    expect(derivePaymentStatus(ctx({ deliveryStatus: 'CANCELLED', payments: [pay('DEPOSIT', 2000)] }))).toBe('DEPOSIT_PAID');
  });
});

describe('refundDue', () => {
  it('somme à rendre pour une commande annulée déjà payée', () => {
    expect(refundDue('CANCELLED', [pay('DEPOSIT', 2000)])).toBe(2000);
    expect(refundDue('CANCELLED', [pay('DEPOSIT', 2000), pay('REFUND', 2000)])).toBe(0);
    expect(refundDue('PENDING', [pay('DEPOSIT', 2000)])).toBe(0);
  });
});

describe('checkNewPayment (RM-20)', () => {
  const base = { deliveryStatus: 'CONFIRMED' as const, zoneType: 'ABIDJAN' as const, total: 17000, payments: [] as PaymentLine[] };

  it('accepte l’acompte à Abidjan, une seule fois', () => {
    expect(checkNewPayment(base, { kind: 'DEPOSIT', amount: 2000 }).ok).toBe(true);
    const again = checkNewPayment({ ...base, payments: [pay('DEPOSIT', 2000)] }, { kind: 'DEPOSIT', amount: 2000 });
    expect(again).toMatchObject({ ok: false, field: 'kind' });
  });
  it('refuse l’acompte hors Abidjan', () => {
    expect(checkNewPayment({ ...base, zoneType: 'INTERIOR' }, { kind: 'DEPOSIT', amount: 2000 })).toMatchObject({ ok: false, field: 'kind' });
  });
  it('refuse un montant au-delà du reste à payer', () => {
    const result = checkNewPayment({ ...base, payments: [pay('DEPOSIT', 2000)] }, { kind: 'BALANCE', amount: 16000 });
    expect(result).toMatchObject({ ok: false, field: 'amount' });
    expect(checkNewPayment({ ...base, payments: [pay('DEPOSIT', 2000)] }, { kind: 'BALANCE', amount: 15000 }).ok).toBe(true);
  });
  it('le paiement intégral doit égaler le reste à payer', () => {
    expect(checkNewPayment(base, { kind: 'FULL', amount: 17000 }).ok).toBe(true);
    expect(checkNewPayment(base, { kind: 'FULL', amount: 10000 })).toMatchObject({ ok: false, field: 'amount' });
  });
  it('le paiement intégral n’a de sens que sans encaissement préalable : après un acompte, c’est un solde', () => {
    expect(checkNewPayment({ ...base, payments: [pay('DEPOSIT', 2000)] }, { kind: 'FULL', amount: 15000 })).toMatchObject({ ok: false, field: 'kind' });
  });
  it('total inconnu : l’acompte passe, pas le solde ni l’intégral (RM-03)', () => {
    const open = { ...base, total: null };
    expect(checkNewPayment(open, { kind: 'DEPOSIT', amount: 2000 }).ok).toBe(true);
    expect(checkNewPayment(open, { kind: 'BALANCE', amount: 5000 })).toMatchObject({ ok: false, field: 'kind' });
    expect(checkNewPayment(open, { kind: 'FULL', amount: 5000 })).toMatchObject({ ok: false, field: 'kind' });
  });
  it('commande déjà payée en totalité : plus d’encaissement', () => {
    expect(checkNewPayment({ ...base, payments: [pay('FULL', 17000)] }, { kind: 'BALANCE', amount: 1 })).toMatchObject({ ok: false, field: 'amount' });
  });
  it('commande annulée : plus d’encaissement, mais le remboursement reste possible', () => {
    const cancelled = { ...base, deliveryStatus: 'CANCELLED' as const, payments: [pay('DEPOSIT', 2000)] };
    expect(checkNewPayment(cancelled, { kind: 'BALANCE', amount: 1000 })).toMatchObject({ ok: false, field: 'kind' });
    expect(checkNewPayment(cancelled, { kind: 'REFUND', amount: 2000 }).ok).toBe(true);
  });
  it('remboursement : rien à rembourser sans encaissement, jamais plus que l’encaissé', () => {
    expect(checkNewPayment(base, { kind: 'REFUND', amount: 100 })).toMatchObject({ ok: false, field: 'kind' });
    const paid = { ...base, payments: [pay('DEPOSIT', 2000), pay('REFUND', 500)] };
    expect(checkNewPayment(paid, { kind: 'REFUND', amount: 1500 }).ok).toBe(true);
    expect(checkNewPayment(paid, { kind: 'REFUND', amount: 1501 })).toMatchObject({ ok: false, field: 'amount' });
  });
  it('un encaissement annulé ne compte pas dans le net', () => {
    const voided = { ...base, payments: [pay('DEPOSIT', 2000, new Date())] };
    expect(checkNewPayment(voided, { kind: 'REFUND', amount: 100 })).toMatchObject({ ok: false });
    expect(checkNewPayment(voided, { kind: 'DEPOSIT', amount: 2000 }).ok).toBe(true);
  });
});

describe('paymentKindOptions', () => {
  const base = { deliveryStatus: 'CONFIRMED' as const, zoneType: 'ABIDJAN' as const, total: 17000, upfrontAmount: 2000, payments: [] as PaymentLine[] };
  it('Abidjan, rien payé : acompte conseillé à 2 000, solde et intégral au reste', () => {
    expect(paymentKindOptions(base)).toEqual([
      { kind: 'DEPOSIT', suggested: 2000 },
      { kind: 'BALANCE', suggested: 17000 },
      { kind: 'FULL', suggested: 17000 },
    ]);
  });
  it('Abidjan, acompte reçu : solde conseillé = reste, remboursement possible', () => {
    const kinds = paymentKindOptions({ ...base, payments: [pay('DEPOSIT', 2000)] });
    expect(kinds.map((option) => option.kind)).toEqual(['BALANCE', 'REFUND']);
    expect(kinds[0]?.suggested).toBe(15000);
    expect(kinds[1]?.suggested).toBe(2000);
  });
  it('hors Abidjan sans frais fixés : rien à proposer tant que le total est inconnu', () => {
    expect(paymentKindOptions({ ...base, zoneType: 'INTERIOR', total: null, upfrontAmount: null })).toEqual([]);
  });
  it('commande annulée et payée : seul le remboursement', () => {
    const kinds = paymentKindOptions({ ...base, deliveryStatus: 'CANCELLED', payments: [pay('DEPOSIT', 2000)] });
    expect(kinds).toEqual([{ kind: 'REFUND', suggested: 2000 }]);
  });
});

describe('deliveryActions (RM-16)', () => {
  it('une étape à la fois, annulation possible tant que ce n’est pas livré', () => {
    expect(deliveryActions('PENDING')).toEqual({ next: 'CONFIRMED', canCancel: true });
    expect(deliveryActions('SHIPPED')).toEqual({ next: 'DELIVERED', canCancel: true });
  });
  it('livrée ou annulée : définitif', () => {
    expect(deliveryActions('DELIVERED')).toEqual({ next: null, canCancel: false });
    expect(deliveryActions('CANCELLED')).toEqual({ next: null, canCancel: false });
  });
});

describe('planStockRestoration (RM-16, RM-17, RM-45)', () => {
  it('remet sur la variante quand la ligne en a une, sinon sur le produit', () => {
    expect(
      planStockRestoration([
        { productId: 'p1', variantId: 'v1', quantity: 2 },
        { productId: 'p2', variantId: null, quantity: 3 },
      ]),
    ).toEqual([
      { target: 'product', id: 'p2', quantity: 3 },
      { target: 'variant', id: 'v1', quantity: 2 },
    ]);
  });
  it('regroupe les lignes identiques et ignore les produits supprimés', () => {
    expect(
      planStockRestoration([
        { productId: 'p1', variantId: null, quantity: 1 },
        { productId: 'p1', variantId: null, quantity: 4 },
        { productId: null, variantId: null, quantity: 9 },
      ]),
    ).toEqual([{ target: 'product', id: 'p1', quantity: 5 }]);
  });
});

describe('orderTodos et tableau de bord', () => {
  const order = (id: string, deliveryStatus: Parameters<typeof orderTodos>[0]['deliveryStatus'], total: number | null, payments: PaymentLine[] = []) => ({ id, deliveryStatus, total, payments });

  it('nouvelle commande non payée : à confirmer et à encaisser', () => {
    expect(orderTodos(order('a', 'PENDING', 17000))).toEqual(['CONFIRM', 'COLLECT']);
  });
  it('frais à fixer en premier quand le total est inconnu', () => {
    expect(orderTodos(order('a', 'PENDING', null))).toEqual(['SET_FEE', 'CONFIRM', 'COLLECT']);
  });
  it('confirmée et payée : à préparer ; en livraison : à clôturer', () => {
    expect(orderTodos(order('a', 'CONFIRMED', 17000, [pay('FULL', 17000)]))).toEqual(['PREPARE']);
    expect(orderTodos(order('a', 'SHIPPED', 17000, [pay('FULL', 17000)]))).toEqual(['DELIVER']);
  });
  it('livrée avec un solde dû → à encaisser ; livrée et payée → rien', () => {
    expect(orderTodos(order('a', 'DELIVERED', 17000, [pay('DEPOSIT', 2000)]))).toEqual(['COLLECT_BALANCE']);
    expect(orderTodos(order('a', 'DELIVERED', 17000, [pay('FULL', 17000)]))).toEqual([]);
  });
  it('annulée : à rembourser tant que de l’argent est encaissé, sinon rien', () => {
    expect(orderTodos(order('a', 'CANCELLED', 17000, [pay('DEPOSIT', 2000)]))).toEqual(['REFUND']);
    expect(orderTodos(order('a', 'CANCELLED', 17000, [pay('DEPOSIT', 2000), pay('REFUND', 2000)]))).toEqual([]);
    expect(orderTodos(order('a', 'CANCELLED', 17000))).toEqual([]);
  });
  it('regroupe dans l’ordre d’urgence et omet les blocs vides', () => {
    const groups = groupOrdersByTodo([order('a', 'PENDING', 17000), order('b', 'SHIPPED', 5000, [pay('FULL', 5000)]), order('c', 'CANCELLED', 5000, [pay('FULL', 5000)])]);
    expect(groups.map((group) => group.todo)).toEqual(['CONFIRM', 'COLLECT', 'DELIVER', 'REFUND']);
    expect(groups[0]?.orders.map((o) => o.id)).toEqual(['a']);
  });
});

describe('collectedSince (RM-23)', () => {
  it('additionne les paiements reçus depuis la date, remboursements déduits, annulés ignorés', () => {
    const day = new Date('2026-11-22T00:00:00Z');
    const rows = [
      { ...pay('DEPOSIT', 2000), receivedAt: new Date('2026-11-22T09:00:00Z') },
      { ...pay('FULL', 10000), receivedAt: new Date('2026-11-21T23:59:00Z') },
      { ...pay('REFUND', 500), receivedAt: new Date('2026-11-22T12:00:00Z') },
      { ...pay('FULL', 9999, new Date()), receivedAt: new Date('2026-11-22T10:00:00Z') },
    ];
    expect(collectedSince(rows, day)).toBe(1500);
  });
});
