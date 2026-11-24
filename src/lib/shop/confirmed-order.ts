// Dernière commande enregistrée, gardée dans l'onglet (sessionStorage) pour le modal de confirmation (#confirmation).
// Le modal s'ouvre juste après l'envoi : les données viennent de la réponse du serveur, sans nouvel appel réseau.
// Le stockage disparaît avec l'onglet ; une page rechargée sur #confirmation retrouve la commande tant que l'onglet vit.
// Stockage indisponible (navigation privée stricte) : la commande reste en mémoire pour la session de la page.
import type { OrderCreated } from './order-types';

const KEY = 'confirmed-order';
const EVENT = 'boutique:confirmed-order';

type OrderStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

let memoryRaw: string | null = null;

function defaultStorage(): OrderStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNumberOrNull = (value: unknown): value is number | null => value === null || isNumber(value);

/** Relit une commande sérialisée ; toute forme inattendue donne `null` (jamais d'exception, jamais de donnée à moitié lue). */
export function parseConfirmedOrder(raw: string | null): OrderCreated | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<OrderCreated> | null;
    if (typeof data !== 'object' || data === null) return null;
    if (typeof data.reference !== 'string' || data.reference === '') return null;
    if (data.zoneType !== 'ABIDJAN' && data.zoneType !== 'INTERIOR' && data.zoneType !== 'INTERNATIONAL') return null;
    if (typeof data.placeLabel !== 'string' || !Array.isArray(data.lines)) return null;
    if (!isNumber(data.subtotal) || !isNumberOrNull(data.deliveryFee) || !isNumberOrNull(data.total) || !isNumberOrNull(data.upfrontAmount)) return null;
    const linesOk = data.lines.every(
      (line) => typeof line === 'object' && line !== null && typeof line.name === 'string' && isNumber(line.quantity) && isNumber(line.unitPrice) && isNumber(line.lineTotal),
    );
    if (!linesOk) return null;
    if (data.whatsappUrl !== null && typeof data.whatsappUrl !== 'string') return null;
    return data as OrderCreated;
  } catch {
    return null;
  }
}

export function saveConfirmedOrder(order: OrderCreated, storage: OrderStorage | null = defaultStorage()): void {
  const raw = JSON.stringify(order);
  memoryRaw = raw;
  try {
    storage?.setItem(KEY, raw);
  } catch {
    /* mémoire seulement */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

export function getConfirmedOrderRaw(storage: OrderStorage | null = defaultStorage()): string | null {
  try {
    return storage?.getItem(KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

export function clearConfirmedOrder(storage: OrderStorage | null = defaultStorage()): void {
  memoryRaw = null;
  try {
    storage?.removeItem(KEY);
  } catch {
    /* idem */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

export function subscribeConfirmedOrder(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}
