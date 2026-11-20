import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';

export function NotFoundContent() {
  return (
    <div className="container page-narrow">
      <p className="eyebrow">ERREUR 404</p>
      <h1>Cette page n’existe pas (ou plus).</h1>
      <p>Le lien est peut-être ancien ou le produit n’est plus disponible. Retrouvez nos produits dans la boutique.</p>
      <p>
        <Link className="btn" href={PUBLIC_ROUTES.shop}>
          Découvrir la boutique
        </Link>{' '}
        <Link className="btn btn-quiet" href={PUBLIC_ROUTES.home}>
          Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}
