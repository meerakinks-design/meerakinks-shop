import type { Metadata } from 'next';
import Link from 'next/link';
import { SEO } from '@/content/seo';
import { AKATECH_NAME, AKATECH_URL } from '@/lib/constants/credits';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';

// Page mince : pas dans le sitemap, pas indexée. Ne nomme que ce qui est confirmé (textes v1.0 : « Site réalisé par AKATech Studio »).
export const metadata: Metadata = { title: { absolute: SEO.credits.title }, description: SEO.credits.description, robots: { index: false, follow: true } };

export default function CreditsPage() {
  return (
    <div className="container section page-narrow">
      <h1>Crédits</h1>
      <p className="lead">
        Site créé par{' '}
        <a href={AKATECH_URL} target="_blank" rel="noopener noreferrer">
          {AKATECH_NAME}
          <span className="visually-hidden"> (s’ouvre dans un nouvel onglet)</span>
        </a>
        .
      </p>
      <p>
        <Link className="btn btn-quiet" href={PUBLIC_ROUTES.home}>
          Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}
