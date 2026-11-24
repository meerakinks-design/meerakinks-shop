// Règles du traitement des commandes : fonctions pures, sans base de données, partagées par le service
// (qui fait foi) et par les écrans (qui n'affichent que ce que le service acceptera).
// RM-16 (définitif), RM-17 (stock non suivi), RM-19 (statut de paiement calculé), RM-20 à RM-23 (registre).
import type { ZoneTypeValue } from '@/lib/constants/order';
import { DELIVERY_TRANSITIONS, type DeliveryStatusValue, type PaymentStatusValue } from '@/lib/constants/order-status';
import type { PaymentKindValue } from '@/lib/constants/payment';
import { formatFcfa } from '@/lib/money';
import { initialPaymentStatus } from '@/lib/shop/order-amounts';
import { netPaid, remainingToPay, type PaymentLine } from '@/lib/shop/payments';

// ---------------------------------------------------------------------------
// Statut de paiement (RM-19)
// ---------------------------------------------------------------------------

export interface PaymentStatusContext {
  deliveryStatus: DeliveryStatusValue;
  zoneType: ZoneTypeValue;
  total: number | null;
  upfrontAmount: number | null;
  payments: readonly PaymentLine[];
}

/**
 * Statut de paiement recalculé à partir du registre. Jamais « payé » sans paiement saisi par la vendeuse (RM-10) :
 *  - plus rien d'encaissé après un remboursement → Remboursé ;
 *  - rien encaissé et commande annulée → Annulé ; sinon on revient au statut de départ de la zone ;
 *  - tout le total encaissé → Paiement intégral ; l'acompte seul (Abidjan) → Acompte reçu ; le reste → Paiement partiel.
 * Une commande annulée mais déjà payée garde son statut : l'argent à rendre reste visible tant qu'il n'est pas remboursé.
 */
export function derivePaymentStatus(context: PaymentStatusContext): PaymentStatusValue {
  const live = context.payments.filter((payment) => !payment.voidedAt);
  const paid = netPaid(live);
  if (paid <= 0) {
    const hasRefund = live.some((payment) => payment.kind === 'REFUND');
    const hasCollected = live.some((payment) => payment.kind !== 'REFUND');
    if (hasRefund && hasCollected) return 'REFUNDED';
    if (context.deliveryStatus === 'CANCELLED') return 'CANCELLED';
    return initialPaymentStatus(context.zoneType);
  }
  if (context.total !== null && paid >= context.total) return 'PAID';
  const onlyDeposit = !live.some((payment) => payment.kind === 'BALANCE' || payment.kind === 'FULL');
  if (context.zoneType === 'ABIDJAN' && context.upfrontAmount !== null && paid >= context.upfrontAmount && onlyDeposit) return 'DEPOSIT_PAID';
  return 'PARTIALLY_PAID';
}

/** Montant encaissé à rendre au client : commande annulée dont l'argent n'a pas encore été remboursé. */
export function refundDue(deliveryStatus: DeliveryStatusValue, payments: readonly PaymentLine[]): number {
  return deliveryStatus === 'CANCELLED' ? Math.max(netPaid(payments), 0) : 0;
}

// ---------------------------------------------------------------------------
// Saisie d'un paiement (RM-20)
// ---------------------------------------------------------------------------

export interface NewPaymentContext {
  deliveryStatus: DeliveryStatusValue;
  zoneType: ZoneTypeValue;
  total: number | null;
  payments: readonly PaymentLine[];
}

export interface NewPaymentInput {
  kind: PaymentKindValue;
  amount: number;
}

export type PaymentCheck = { ok: true } | { ok: false; field: 'kind' | 'amount'; message: string };

const refuse = (field: 'kind' | 'amount', message: string): PaymentCheck => ({ ok: false, field, message });

/** Ce que le registre accepte. Une erreur de saisie déjà enregistrée s'annule ; ici on évite surtout d'en créer. */
export function checkNewPayment(context: NewPaymentContext, input: NewPaymentInput): PaymentCheck {
  const live = context.payments.filter((payment) => !payment.voidedAt);
  const paid = netPaid(live);

  if (input.kind === 'REFUND') {
    if (paid <= 0) return refuse('kind', 'Rien n’a été encaissé sur cette commande : il n’y a rien à rembourser.');
    if (input.amount > paid) return refuse('amount', `Le remboursement dépasse le montant encaissé (${formatFcfa(paid)}).`);
    return { ok: true };
  }

  if (context.deliveryStatus === 'CANCELLED') return refuse('kind', 'Cette commande est annulée : on n’encaisse plus rien dessus.');

  if (input.kind === 'DEPOSIT') {
    if (context.zoneType !== 'ABIDJAN') return refuse('kind', 'L’acompte ne concerne que les commandes d’Abidjan. Ailleurs, enregistre un paiement intégral ou un solde.');
    if (live.some((payment) => payment.kind === 'DEPOSIT' || payment.kind === 'FULL')) return refuse('kind', 'Un acompte ou un paiement intégral est déjà enregistré.');
  }

  const remaining = remainingToPay(context.total, paid);
  if (remaining === null) {
    if (input.kind === 'DEPOSIT') return { ok: true }; // l'acompte se prend avant que les frais soient connus (RM-05)
    return refuse('kind', 'Les frais de livraison ne sont pas encore fixés : fixe-les d’abord pour connaître le total.');
  }
  if (remaining === 0) return refuse('amount', 'Cette commande est déjà payée en totalité.');
  if (input.amount > remaining) return refuse('amount', `Ce montant dépasse le reste à payer (${formatFcfa(remaining)}).`);
  if (input.kind === 'FULL' && live.some((payment) => payment.kind !== 'REFUND')) return refuse('kind', 'Un paiement a déjà été encaissé : enregistre le reste comme « Solde ».');
  if (input.kind === 'FULL' && input.amount !== remaining) return refuse('amount', `Un paiement intégral correspond au reste à payer (${formatFcfa(remaining)}). Pour un montant moindre, choisis « Solde ».`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Statut de livraison (RM-16)
// ---------------------------------------------------------------------------

/** Libellé du bouton qui fait avancer la commande d'une étape. */
export const DELIVERY_ADVANCE_LABELS: Partial<Record<DeliveryStatusValue, string>> = {
  CONFIRMED: 'Confirmer la commande',
  PREPARING: 'Passer en préparation',
  SHIPPED: 'Marquer en livraison',
  DELIVERED: 'Marquer comme livrée',
};

export interface DeliveryActions {
  /** Étape suivante (null si la commande est livrée ou annulée : définitif). */
  next: DeliveryStatusValue | null;
  canCancel: boolean;
}

export function deliveryActions(status: DeliveryStatusValue): DeliveryActions {
  const targets = DELIVERY_TRANSITIONS[status];
  return { next: targets.find((target) => target !== 'CANCELLED') ?? null, canCancel: targets.includes('CANCELLED') };
}

// ---------------------------------------------------------------------------
// Stock à restituer à l'annulation (RM-16, RM-17, RM-45)
// ---------------------------------------------------------------------------

export interface StockLine {
  productId: string | null;
  variantId: string | null;
  quantity: number;
}

export type StockRestoration = { target: 'variant'; id: string; quantity: number } | { target: 'product'; id: string; quantity: number };

/**
 * Où remettre les quantités : sur la variante quand la ligne en a une (RM-45), sinon sur le produit. Une ligne dont le
 * produit a été supprimé n'a plus de stock à rendre. Les lignes identiques sont regroupées, dans un ordre fixe
 * (pas d'interblocage entre deux annulations simultanées). Le stock non suivi (null, RM-17) est laissé tel quel par
 * le service : l'incrément ne s'applique qu'aux stocks renseignés.
 */
export function planStockRestoration(lines: readonly StockLine[]): StockRestoration[] {
  const totals = new Map<string, StockRestoration>();
  for (const line of lines) {
    const target = line.variantId ? ({ target: 'variant', id: line.variantId } as const) : line.productId ? ({ target: 'product', id: line.productId } as const) : null;
    if (!target || line.quantity <= 0) continue;
    const key = `${target.target}:${target.id}`;
    const current = totals.get(key);
    totals.set(key, { ...target, quantity: (current?.quantity ?? 0) + line.quantity });
  }
  return [...totals.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, value]) => value);
}

// ---------------------------------------------------------------------------
// Ce qui reste à faire sur une commande (tableau « à traiter aujourd'hui »)
// ---------------------------------------------------------------------------

export interface OrderTodoContext {
  deliveryStatus: DeliveryStatusValue;
  total: number | null;
  payments: readonly PaymentLine[];
}

export type OrderTodo = 'CONFIRM' | 'SET_FEE' | 'COLLECT' | 'PREPARE' | 'DELIVER' | 'REFUND' | 'COLLECT_BALANCE';

/** Premières choses à faire pour cette commande, de la plus urgente à la moins urgente. */
export function orderTodos(context: OrderTodoContext): OrderTodo[] {
  const todos: OrderTodo[] = [];
  const paid = netPaid(context.payments);
  const { deliveryStatus } = context;
  if (deliveryStatus === 'CANCELLED') return paid > 0 ? ['REFUND'] : [];
  if (context.total === null) todos.push('SET_FEE');
  if (deliveryStatus === 'PENDING') todos.push('CONFIRM');
  if (paid <= 0 && deliveryStatus !== 'DELIVERED') todos.push('COLLECT');
  if (deliveryStatus === 'CONFIRMED' || deliveryStatus === 'PREPARING') todos.push('PREPARE');
  if (deliveryStatus === 'SHIPPED') todos.push('DELIVER');
  if (deliveryStatus === 'DELIVERED' && context.total !== null && paid < context.total) todos.push('COLLECT_BALANCE');
  return todos;
}

/** Ordre d'affichage des blocs du tableau de bord : ce qui rapporte ou bloque le plus vite d'abord. */
export const TODO_ORDER: readonly OrderTodo[] = ['CONFIRM', 'COLLECT', 'SET_FEE', 'PREPARE', 'DELIVER', 'COLLECT_BALANCE', 'REFUND'];

export const TODO_LABELS: Record<OrderTodo, { title: string; hint: string }> = {
  CONFIRM: { title: 'À confirmer', hint: 'Nouvelles commandes à vérifier, puis à confirmer au client.' },
  COLLECT: { title: 'Paiement à encaisser', hint: 'Acompte ou paiement intégral pas encore reçu : enregistre-le dès que Wave le confirme.' },
  SET_FEE: { title: 'Frais de livraison à fixer', hint: 'Le total reste « à confirmer » tant que les frais ne sont pas fixés.' },
  PREPARE: { title: 'À préparer', hint: 'Commandes confirmées, à préparer puis à expédier.' },
  DELIVER: { title: 'En livraison', hint: 'À marquer comme livrées une fois remises au client.' },
  COLLECT_BALANCE: { title: 'Soldes à encaisser', hint: 'Commandes livrées dont le total n’est pas entièrement payé.' },
  REFUND: { title: 'À rembourser', hint: 'Commandes annulées dont l’argent encaissé n’a pas été rendu.' },
};

/** Regroupe les commandes par chose à faire (une commande peut figurer dans plusieurs blocs). Blocs vides omis. */
export function groupOrdersByTodo<T extends OrderTodoContext>(orders: readonly T[]): { todo: OrderTodo; orders: T[] }[] {
  const buckets = new Map<OrderTodo, T[]>();
  for (const order of orders) {
    for (const todo of orderTodos(order)) buckets.set(todo, [...(buckets.get(todo) ?? []), order]);
  }
  return TODO_ORDER.filter((todo) => buckets.has(todo)).map((todo) => ({ todo, orders: buckets.get(todo) ?? [] }));
}

/** Encaissé net (remboursements déduits) pour les paiements reçus à partir de `from` (RM-23). */
export function collectedSince(payments: readonly (PaymentLine & { receivedAt: Date })[], from: Date): number {
  return netPaid(payments.filter((payment) => payment.receivedAt >= from));
}

// ---------------------------------------------------------------------------
// Types de paiement proposés à la saisie
// ---------------------------------------------------------------------------

export interface PaymentKindOption {
  kind: PaymentKindValue;
  /** Montant conseillé, pré-rempli dans le formulaire (modifiable). */
  suggested: number | null;
}

/**
 * Types de paiement que le registre accepterait aujourd'hui, avec le montant conseillé. Le formulaire ne propose que
 * ceux-là : le service refuserait les autres. Abidjan : acompte, solde, intégral ; ailleurs : intégral, solde.
 */
export function paymentKindOptions(context: NewPaymentContext & { upfrontAmount: number | null }): PaymentKindOption[] {
  const paid = netPaid(context.payments);
  const remaining = remainingToPay(context.total, paid);
  const candidates: PaymentKindOption[] = [
    ...(context.zoneType === 'ABIDJAN' ? [{ kind: 'DEPOSIT' as const, suggested: context.upfrontAmount === null ? null : Math.min(context.upfrontAmount, remaining ?? context.upfrontAmount) }] : []),
    ...(context.zoneType === 'ABIDJAN' ? [{ kind: 'BALANCE' as const, suggested: remaining }] : [{ kind: 'FULL' as const, suggested: remaining }, { kind: 'BALANCE' as const, suggested: remaining }]),
    ...(context.zoneType === 'ABIDJAN' ? [{ kind: 'FULL' as const, suggested: remaining }] : []),
    { kind: 'REFUND', suggested: paid > 0 ? paid : null },
  ];
  return candidates.filter((option) => checkNewPayment(context, { kind: option.kind, amount: option.suggested && option.suggested > 0 ? option.suggested : 1 }).ok);
}
