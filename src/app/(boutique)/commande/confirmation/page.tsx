import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrderConfirmation } from '@/components/shop/OrderConfirmation';
import { ORDER_RATE_LIMITS, ORDER_REFERENCE_PATTERN } from '@/lib/constants/order';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { hashIdentifier } from '@/server/auth/tokens';
import { clientIpFromHeaders } from '@/server/http';
import { getPublicDelivery, getPublicSettings } from '@/server/services/catalog.queries';
import { getOrderConfirmation } from '@/server/services/orders.service';
import { consumeRateLimit } from '@/server/services/rate-limit';

// Page propre à un client : jamais indexée, jamais mise en cache, et sans « referrer » (la référence est dans l'adresse).
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Commande enregistrée',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function OrderConfirmationPage({ searchParams }: { searchParams: { ref?: string | string[] } }) {
  const raw = Array.isArray(searchParams.ref) ? searchParams.ref[0] : searchParams.ref;
  const reference = (raw ?? '').trim().toUpperCase();
  // Une référence invalide ramène à l'accueil (§6.4).
  if (!ORDER_REFERENCE_PATTERN.test(reference)) redirect(PUBLIC_ROUTES.home);

  // La référence est le seul secret de la page : on freine toute tentative de les essayer une à une.
  const { limit, windowSeconds } = ORDER_RATE_LIMITS.confirmationPerIp;
  const attempt = await consumeRateLimit(`confirmation:ip:${hashIdentifier(clientIpFromHeaders(headers()))}`, limit, windowSeconds);
  if (!attempt.allowed) {
    return (
      <div className="container">
        <h1>Un instant</h1>
        <p>Trop de consultations en peu de temps. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const [order, settings, delivery] = await Promise.all([getOrderConfirmation(reference), getPublicSettings(), getPublicDelivery()]);
  if (!order) redirect(PUBLIC_ROUTES.home);
  return <OrderConfirmation order={order} depositAmount={settings.depositAmount} storeName={settings.storeName} deliveryNotes={delivery.notes} />;
}
