import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';

/** Page légale en attente du texte validé par la cliente (pas d'invention de contenu juridique). */
export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <div className="container page-narrow">
      <h1>{title}</h1>
      <p>Ce document est en cours de rédaction et sera publié ici dès sa validation par la boutique.</p>
      <p>
        <Link className="btn" href={PUBLIC_ROUTES.home}>
          Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}
