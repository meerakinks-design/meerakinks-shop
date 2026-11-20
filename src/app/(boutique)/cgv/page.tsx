import type { Metadata } from 'next';
import { LegalPlaceholder } from '@/components/shop/LegalPlaceholder';

// Pas indexée tant que le texte n'est pas validé par la cliente.
export const metadata: Metadata = { title: 'Conditions générales de vente', robots: { index: false, follow: true } };

export default function Page() {
  return <LegalPlaceholder title="Conditions générales de vente" />;
}
