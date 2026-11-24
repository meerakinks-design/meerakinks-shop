import type { Metadata } from 'next';
import Link from 'next/link';
import Spaghetti from '@/components/shop/Spaghetti';
import { JsonLd } from '@/components/shop/JsonLd';
import { LANDING } from '@/content/landing';
import { SEO } from '@/content/seo';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { absoluteUrl } from '@/lib/shop/seo';
import { fill } from '@/lib/shop/template';
import { getPublicSettings } from '@/server/services/catalog.queries';

// Page dédiée « À propos » (avant : modal « Notre histoire »). Le texte raconte la marque à partir de sa charte : il ne
// prétend pas raconter l'histoire personnelle de la fondatrice, qui n'a pas été fournie (textes v1.0, §2.9).
export const revalidate = 3600;
export const metadata: Metadata = { title: { absolute: SEO.about.title }, description: SEO.about.description, alternates: { canonical: PUBLIC_ROUTES.about } };

export default async function AboutPage() {
  const settings = await getPublicSettings();
  const copy = LANDING.story;
  const vars = { storeName: settings.storeName };
  const url = absoluteUrl(PUBLIC_ROUTES.about);

  return (
    <article className="container section about-page page-narrow" aria-labelledby="about-title">
      <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
      <Spaghetti as="h1" id="about-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
      {copy.intro.map((paragraph) => (
        <p key={paragraph} className="lead">
          {fill(paragraph, vars)}
        </p>
      ))}

      <section className="about-block" aria-labelledby="about-vision">
        <Spaghetti as="h2" id="about-vision">{copy.visionTitle}</Spaghetti>
        <p>{copy.vision}</p>
      </section>
      <section className="about-block" aria-labelledby="about-commitment">
        <Spaghetti as="h2" id="about-commitment">{copy.commitmentTitle}</Spaghetti>
        <p>{copy.commitment}</p>
      </section>

      <p className="about-cta">
        <Link className="btn btn-pill" href={PUBLIC_ROUTES.shop}>
          {copy.closeCta}
          <span aria-hidden="true">›</span>
        </Link>
      </p>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: SEO.about.title,
          ...(url ? { url } : {}),
          about: { '@type': 'Organization', name: settings.storeName },
        }}
      />
    </article>
  );
}
