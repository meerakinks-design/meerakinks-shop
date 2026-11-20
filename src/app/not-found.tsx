import '@/styles/shop.css';
import { NotFoundContent } from '@/components/shop/NotFoundContent';

// Adresse inconnue (hors des pages du site) : page de marque simple.
export default function RootNotFound() {
  return (
    <main>
      <NotFoundContent />
    </main>
  );
}
