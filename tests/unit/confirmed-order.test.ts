import { beforeEach, describe, expect, it } from 'vitest';
import { clearConfirmedOrder, getConfirmedOrderRaw, parseConfirmedOrder, saveConfirmedOrder } from '@/lib/shop/confirmed-order';
import type { OrderCreated } from '@/lib/shop/order-types';

const ORDER: OrderCreated = {
  reference: 'CMD-7K3M9QXP',
  zoneType: 'ABIDJAN',
  placeLabel: 'Cocody (Abidjan)',
  lines: [{ name: 'Sérum éclat', quantity: 2, unitPrice: 10000, lineTotal: 20000 }],
  subtotal: 20000,
  deliveryFee: null,
  total: null,
  upfrontAmount: 2000,
  whatsappUrl: 'https://wa.me/2250102030405?text=Bonjour',
};

function fakeStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value), removeItem: (key: string) => void data.delete(key) };
}

describe('dernière commande gardée pour le modal de confirmation', () => {
  beforeEach(() => clearConfirmedOrder(null));

  it('se range puis se relit à l’identique', () => {
    const storage = fakeStorage();
    saveConfirmedOrder(ORDER, storage);
    expect(parseConfirmedOrder(getConfirmedOrderRaw(storage))).toEqual(ORDER);
  });

  it('sans stockage (navigation privée stricte), la commande reste en mémoire pour la session de la page', () => {
    saveConfirmedOrder(ORDER, null);
    expect(parseConfirmedOrder(getConfirmedOrderRaw(null))).toEqual(ORDER);
  });

  it('s’efface', () => {
    const storage = fakeStorage();
    saveConfirmedOrder(ORDER, storage);
    clearConfirmedOrder(storage);
    expect(getConfirmedOrderRaw(storage)).toBeNull();
  });

  it('une valeur absente, abîmée ou de mauvaise forme ne donne jamais une commande à moitié lue', () => {
    expect(parseConfirmedOrder(null)).toBeNull();
    expect(parseConfirmedOrder('')).toBeNull();
    expect(parseConfirmedOrder('{pas du json')).toBeNull();
    expect(parseConfirmedOrder('42')).toBeNull();
    expect(parseConfirmedOrder(JSON.stringify({ ...ORDER, reference: '' }))).toBeNull();
    expect(parseConfirmedOrder(JSON.stringify({ ...ORDER, zoneType: 'MARS' }))).toBeNull();
    expect(parseConfirmedOrder(JSON.stringify({ ...ORDER, lines: [{ name: 'x' }] }))).toBeNull();
    expect(parseConfirmedOrder(JSON.stringify({ ...ORDER, subtotal: 'beaucoup' }))).toBeNull();
    expect(parseConfirmedOrder(JSON.stringify({ ...ORDER, whatsappUrl: 12 }))).toBeNull();
  });
});
