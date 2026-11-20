import Link from 'next/link';
import { INSTAGRAM_POSTS, MAX_INSTAGRAM_POSTS, MIN_INSTAGRAM_POSTS } from '@/content/instagram';
import { faqItems } from '@/content/faq';
import { LANDING } from '@/content/landing';
import { REVIEWS } from '@/content/avis';
import { categoryPath, MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { fill } from '@/lib/shop/template';
import { hasContactChannels } from '@/lib/shop/contact';
import { whatsappLink } from '@/lib/shop/whatsapp';
import { cloudinaryTransform } from '@/lib/cloudinary-url';
import type { CategorySection, ShopProduct } from '@/lib/shop/sections';
import type { FocusProduct, PublicSettings } from '@/server/services/catalog.queries';
import { JsonLd } from './JsonLd';
import { ModalLink } from './ModalLink';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';
import { ProductPurchase } from './ProductPurchase';
import { effectivePrice } from '@/lib/shop/product-display';
import { summarize } from '@/lib/shop/seo';

export function Hero({ showBestSellers }: { showBestSellers: boolean }) {
  const hero = LANDING.hero;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container">
        <p className="eyebrow">{hero.eyebrow}</p>
        <h1 id="hero-title">{hero.title}</h1>
        <p className="lead">{hero.text}</p>
        <div className="hero-actions">
          <Link className="btn" href={PUBLIC_ROUTES.shop}>
            {hero.primaryCta}
          </Link>
          {showBestSellers && (
            <Link className="btn btn-quiet" href="/#best-sellers">
              {hero.secondaryCta}
            </Link>
          )}
        </div>
        <p className="help-text">{hero.reassurance}</p>
      </div>
    </section>
  );
}

/** Bandeau décoratif : masqué aux lecteurs d'écran, en pause au survol, arrêté si l'utilisateur demande moins de mouvement. */
export function Marquee() {
  const words = [...LANDING.marquee, ...LANDING.marquee];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>{word}</span>
        ))}
      </div>
    </div>
  );
}

export function Collections({ sections, hasOffers }: { sections: readonly CategorySection[]; hasOffers: boolean }) {
  const copy = LANDING.collections;
  return (
    <section id="collections" className="section" aria-labelledby="collections-title">
      <div className="container">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="collections-title">{copy.title}</h2>
        <p className="lead">{copy.text}</p>
        <ul className="collection-cards">
          {sections.map((section) => (
            <li key={section.category.id} className="collection-card" style={{ background: section.background, color: section.textColor }}>
              <h3>{section.category.name}</h3>
              {section.category.description && <p>{section.category.description}</p>}
              <Link href={categoryPath(section.category.slug)}>{copy.cta}</Link>
            </li>
          ))}
          {hasOffers && (
            <li className="collection-card collection-offers">
              <h3>{copy.offersLabel}</h3>
              <p>{copy.offersText}</p>
              <Link href="/boutique?filtre=offres">{copy.offersCta}</Link>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

export function BestSellers({ products }: { products: readonly ShopProduct[] }) {
  const copy = LANDING.bestSellers;
  return (
    <section id="best-sellers" className="section" aria-labelledby="best-sellers-title">
      <div className="container">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="best-sellers-title">{copy.title}</h2>
        <p className="lead">{copy.text}</p>
        <ul className="row-scroll">
          {products.map((product, index) => (
            <li key={product.id}>
              <ProductCard product={product} priority={index < 2} sizes="(min-width: 900px) 25vw, 60vw" />
            </li>
          ))}
        </ul>
        <p>
          <Link className="btn btn-quiet" href={PUBLIC_ROUTES.shop}>
            {copy.cta}
          </Link>
        </p>
      </div>
    </section>
  );
}

export function StoryTeaser({ storeName }: { storeName: string }) {
  const copy = LANDING.story;
  return (
    <section className="section section-tinted" aria-labelledby="story-title">
      <div className="container page-narrow">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="story-title">{copy.title}</h2>
        <p className="lead">{fill(copy.intro[0], { storeName })}</p>
        <ModalLink hash={MODAL_HASHES.story} className="btn btn-quiet">
          {copy.openCta}
        </ModalLink>
      </div>
    </section>
  );
}

export function Focus({ product }: { product: FocusProduct }) {
  const copy = LANDING.focus;
  return (
    <section id="focus-produit" className="section" aria-labelledby="focus-title">
      <div className="container focus-grid">
        <div className="focus-media">
          <ProductImage image={product.image} sizes="(min-width: 900px) 40vw, 90vw" />
        </div>
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="focus-title">{copy.title}</h2>
          <h3>{product.name}</h3>
          <p>{summarize(product.description, 240)}</p>
          {product.characteristics.length > 0 && (
            <ul className="check-list">
              {product.characteristics.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <ProductPurchase product={{ id: product.id, name: product.name, price: effectivePrice(product), stock: product.stock }} />
          <p>
            <Link className="section-link" href={`/produit/${product.slug}`}>
              {copy.primaryCta}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export function Why() {
  const copy = LANDING.why;
  return (
    <section id="pourquoi-nous" className="section section-tinted" aria-labelledby="why-title">
      <div className="container">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="why-title">{copy.title}</h2>
        <p className="lead">{copy.intro}</p>
        <ul className="why-grid">
          {copy.items.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Avis (RM-40). Tant qu'il n'existe aucun avis RÉEL avec autorisation, seule l'invitation s'affiche :
 * ni fausses cartes, ni étoiles, ni note moyenne.
 */
export function Reviews({ settings }: { settings: PublicSettings }) {
  const copy = LANDING.reviews;
  const shareLink = whatsappLink(settings.whatsappNumber, copy.shareMessage);
  const reviews = REVIEWS.slice(0, 6);
  return (
    <section id="avis" className="section" aria-labelledby="reviews-title">
      <div className="container">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="reviews-title">{copy.title}</h2>
        {reviews.length > 0 ? (
          <>
            <p className="lead">{copy.text}</p>
            <ul className="review-cards">
              {reviews.map((review) => (
                <li key={`${review.displayName}-${review.consent.grantedOn}`}>
                  <blockquote>
                    <p>{review.text}</p>
                    <footer>
                      {review.rating && <span role="img" aria-label={`Note : ${review.rating} sur 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>}{' '}
                      <cite>{review.displayName}</cite>
                    </footer>
                  </blockquote>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="lead">{copy.emptyText}</p>
        )}
        {shareLink && (
          <p>
            <a className="btn btn-quiet" href={shareLink} target="_blank" rel="noopener noreferrer">
              {copy.shareCta}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

export function Instagram({ settings }: { settings: PublicSettings }) {
  if (INSTAGRAM_POSTS.length < MIN_INSTAGRAM_POSTS) return null; // sous 4 publications : section non affichée
  const copy = LANDING.instagram;
  return (
    <section id="instagram" className="section section-tinted" aria-labelledby="instagram-title">
      <div className="container">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="instagram-title">{copy.title}</h2>
        <p className="lead">{copy.text}</p>
        <ul className="instagram-grid">
          {INSTAGRAM_POSTS.slice(0, MAX_INSTAGRAM_POSTS).map((post) => (
            <li key={post.href}>
              <a href={post.href} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cloudinaryTransform(post.imageUrl, 'c_fill,ar_1:1,w_480,f_auto,q_auto')} alt={post.alt} width={480} height={480} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
        {settings.instagramUrl && (
          <p>
            <a className="btn btn-quiet" href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
              {copy.cta}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

export function Faq({ settings }: { settings: PublicSettings }) {
  const copy = LANDING.faq;
  const items = faqItems(settings.depositAmount);
  const askLink = whatsappLink(settings.whatsappNumber, LANDING.contact.whatsappMessage);
  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className="container page-narrow">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="faq-title">{copy.title}</h2>
        <p className="lead">{copy.text}</p>
        <div className="faq-list">
          {items.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
        {askLink && (
          <p>
            <a className="btn btn-quiet" href={askLink} target="_blank" rel="noopener noreferrer">
              {copy.cta}
            </a>
          </p>
        )}
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
        }}
      />
    </section>
  );
}

/** Seules les coordonnées présentes dans les paramètres s'affichent ; sans aucune, la section n'est pas affichée. */
export function Contact({ settings }: { settings: PublicSettings }) {
  const copy = LANDING.contact;
  const whatsapp = whatsappLink(settings.whatsappNumber, copy.whatsappMessage);
  const socials = [
    { label: 'Instagram', href: settings.instagramUrl },
    { label: 'TikTok', href: settings.tiktokUrl },
    { label: 'Facebook', href: settings.facebookUrl },
  ].filter((social): social is { label: string; href: string } => Boolean(social.href));
  if (!hasContactChannels({ ...settings, whatsappLink: whatsapp })) return null;

  return (
    <section id="contact" className="section section-tinted" aria-labelledby="contact-title">
      <div className="container page-narrow">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="contact-title">{copy.title}</h2>
        <p className="lead">{copy.text}</p>
        <div className="hero-actions">
          {whatsapp && (
            <a className="btn" href={whatsapp} target="_blank" rel="noopener noreferrer">
              {copy.cta}
            </a>
          )}
          {settings.contactEmail && (
            <a className="btn btn-quiet" href={`mailto:${settings.contactEmail}`}>
              {settings.contactEmail}
            </a>
          )}
          {socials.map((social) => (
            <a key={social.label} className="btn btn-quiet" href={social.href} target="_blank" rel="noopener noreferrer">
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const copy = LANDING.finalCta;
  return (
    <section className="section final-cta" aria-labelledby="final-title">
      <div className="container page-narrow">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="final-title">{copy.title}</h2>
        <p className="lead">{copy.text}</p>
        <div className="hero-actions">
          <Link className="btn" href={PUBLIC_ROUTES.shop}>
            {copy.primaryCta}
          </Link>
          <Link className="btn btn-quiet" href="/boutique?tri=nouveautes">
            {copy.secondaryCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
