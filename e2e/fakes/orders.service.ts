import { ORDER_REFERENCE_PATTERN } from '@/lib/constants/order';
import type { OrderCreated } from '@/lib/shop/order-types';
import { FIXTURE_REFERENCE } from '../fixtures';
import order from '../order.json';

// Commande de démonstration (e2e/order.json, relu aussi par le script Playwright) pour la page de confirmation.
// L'enregistrement réel (createOrder) n'existe pas ici : le script intercepte POST /api/v1/orders.
export const E2E_ORDER = order as OrderCreated;

export async function getOrderConfirmation(reference: string): Promise<OrderCreated | null> {
  return ORDER_REFERENCE_PATTERN.test(reference) && reference === FIXTURE_REFERENCE ? E2E_ORDER : null;
}

export function decoyOrder(): OrderCreated {
  return { ...E2E_ORDER, lines: [], subtotal: 0 };
}

export async function createOrder(): Promise<never> {
  throw new Error('createOrder n’existe pas dans le banc d’essai : intercepter POST /api/v1/orders.');
}
