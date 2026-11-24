import Link from 'next/link';
import { INSTAGRAM_POSTS, MAX_INSTAGRAM_POSTS, MIN_INSTAGRAM_POSTS } from '@/content/instagram';
import { faqItems } from '@/content/faq';
import { LANDING } from '@/content/landing';
import { REVIEWS } from '@/content/avis';
import { categoryPath, productPath, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { fill } from '@/lib/shop/template';
import { hasContactChannels, hasContactSection } from '@/lib/shop/contact';
import { whatsappLink } from '@/lib/shop/whatsapp';
import { cloudinaryTransform } from '@/lib/cloudinary-url';
import type { CategorySection, ShopProduct } from '@/lib/shop/sections';
import type { FocusProduct, PublicSettings } from '@/server/services/catalog.queries';
import { JsonLd } from './JsonLd';
import { ContactForm } from './ContactForm';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';
import { ProductPurchase } from './ProductPurchase';
import Spaghetti from './Spaghetti';
import { effectivePrice } from '@/lib/shop/product-display';
import { summarize } from '@/lib/shop/seo';

/**
 * Héros (référence My Frida + Bucks) : gros titre en deux temps (la fin passe en cursive), bouton pastille incliné,
 * badge circulaire qui tourne, disque orange derrière les produits qui flottent. Le surtitre et le titre jouent l'effet
 * élastique dès l'affichage ; la description reste fixe. Les produits viennent du catalogue ; sans photo, la tête aux
 * deux puffs de la marque tient la scène.
 */
export function Hero({ showCollections, products = [], iconSrc }: { showCollections: boolean; products?: readonly ShopProduct[]; iconSrc: string }) {
  const hero = LANDING.hero;
  const [main, ...floating] = products.filter((product) => product.image).slice(0, 4);
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <Spaghetti as="p" trigger="mount" className="eyebrow hero-eyebrow">{hero.eyebrow}</Spaghetti>
        <h1 id="hero-title" className="hero-title" aria-label={hero.title}>
          <Spaghetti as="span" mode="chars" trigger="mount" className="hero-title-main">{hero.titleMain}</Spaghetti>{' '}
          <Spaghetti as="span" mode="chars" trigger="mount" className="hero-title-script">{hero.titleScript}</Spaghetti>
        </h1>
        <p className="lead hero-lead">{hero.text}</p>
        <div className="hero-actions">
          <Link className="btn btn-pill" href={PUBLIC_ROUTES.shop}>
            {hero.primaryCta}
            <span aria-hidden="true">›</span>
          </Link>
          {showCollections && (
            <Link className="btn btn-quiet" href="/#collections">
              {hero.secondaryCta}
            </Link>
          )}
        </div>
        <p className="hero-reassurance">{hero.reassurance}</p>

        <div className="hero-stage" aria-hidden={main ? undefined : 'true'}>
          <div className="hero-disc" />
          {main ? (
            <Link href={productPath(main.slug)} className="hero-main" aria-label={`Voir ${main.name}`}>
              <ProductImage image={main.image} sizes="(min-width: 900px) 30rem, 80vw" priority />
            </Link>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hero-icon" src={iconSrc} alt="" width={420} height={420} />
          )}
          {floating.slice(0, 3).map((product, index) => (
            <span key={product.id} className={`hero-float hero-float-${index + 1}`} aria-hidden="true">
              <ProductImage image={product.image} widths={[160, 240, 320]} sizes="8rem" />
            </span>
          ))}
          <svg className="hero-badge" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
            <defs>
              <path id="hero-badge-circle" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
            </defs>
            <circle cx="100" cy="100" r="96" className="hero-badge-bg" />
            <text className="hero-badge-text">
              <textPath href="#hero-badge-circle" startOffset="0">
                {`${hero.badge} • ${hero.badge} • `}
              </textPath>
            </text>
            <image href={iconSrc} x="46" y="46" width="108" height="108" />
          </svg>
        </div>
      </div>
      <svg className="hero-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0,70 C240,10 480,10 720,60 C960,110 1200,110 1440,50 L1440,120 L0,120 Z" />
      </svg>
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
          <span key={`${word}-${index}`}>
            {word} <span className="marquee-dot">•</span>
          </span>
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
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="collections-title">{copy.title}</Spaghetti>
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
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="best-sellers-title">{copy.title}</Spaghetti>
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
    <section className="section section-brand" aria-labelledby="story-title">
      <div className="container page-narrow">
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="story-title">{copy.title}</Spaghetti>
        <p className="lead">{fill(copy.intro[0], { storeName })}</p>
        <Link href={PUBLIC_ROUTES.about} className="btn btn-quiet">
          {copy.openCta}
        </Link>
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
          <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
          <Spaghetti as="h2" id="focus-title">{copy.title}</Spaghetti>
          <p className="lead">{copy.text}</p>
          <Spaghetti as="h3">{product.name}</Spaghetti>
          <p>{summarize(product.description, 240)}</p>
          {product.characteristics.length > 0 && (
            <ul className="check-list">
              {product.characteristics.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <ProductPurchase product={{ id: product.id, name: product.name, price: effectivePrice(product), stock: product.stock }} stickyBar={false} />
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

export function Why({ storeName }: { storeName: string }) {
  const copy = LANDING.why;
  return (
    <section id="pourquoi-nous" className="section section-brand" aria-labelledby="why-title">
      <div className="container">
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="why-title">{copy.title}</Spaghetti>
        <p className="lead">{fill(copy.intro, { storeName })}</p>
        <div className="why-grid">
          {copy.items.map((item, index) => (
            <details key={item.title} className="why-item" name="why" open={index === 0}>
              <summary>
                <span>{item.title}</span>
                <span className="why-dot" aria-hidden="true" />
              </summary>
              <div className="why-body">
                <span className="why-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <p>{item.text}</p>
              </div>
            </details>
          ))}
        </div>
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
  const shareLink = whatsappLink(settings.whatsappNumber, fill(copy.shareMessage, { storeName: settings.storeName }));
  const reviews = REVIEWS.slice(0, 6);
  return (
    <section id="avis" className="section" aria-labelledby="reviews-title">
      <div className="container">
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="reviews-title">{copy.title}</Spaghetti>
        {reviews.length > 0 ? (
          <>
            <p className="lead">{fill(copy.text, { storeName: settings.storeName })}</p>
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
          <p className="lead">{fill(copy.emptyText, { storeName: settings.storeName })}</p>
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
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="instagram-title">{copy.title}</Spaghetti>
        <p className="lead">{fill(copy.text, { storeName: settings.storeName })}</p>
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
              {fill(copy.cta, { storeName: settings.storeName })}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

export function Faq({ settings }: { settings: PublicSettings }) {
  const copy = LANDING.faq;
  const items = faqItems(settings.depositAmount, settings.storeName);
  const askLink = whatsappLink(settings.whatsappNumber, fill(LANDING.contact.whatsappMessage, { storeName: settings.storeName }));
  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className="container page-narrow">
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="faq-title">{copy.title}</Spaghetti>
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

/**
 * Contact : le formulaire intelligent (envoi par Resend vers la vendeuse) et, en plus, seulement les coordonnées présentes
 * dans les paramètres. Sans formulaire (interrupteur) ni coordonnée, la section n'est pas affichée.
 */
export function Contact({ settings }: { settings: PublicSettings }) {
  const copy = LANDING.contact;
  const whatsapp = whatsappLink(settings.whatsappNumber, fill(copy.whatsappMessage, { storeName: settings.storeName }));
  const socials = [
    { label: 'Instagram', href: settings.instagramUrl },
    { label: 'TikTok', href: settings.tiktokUrl },
    { label: 'Facebook', href: settings.facebookUrl },
  ].filter((social): social is { label: string; href: string } => Boolean(social.href));
  if (!hasContactSection({ ...settings, whatsappLink: whatsapp })) return null;
  const hasChannels = hasContactChannels({ ...settings, whatsappLink: whatsapp });

  return (
    <section id="contact" className="section section-tinted" aria-labelledby="contact-title">
      <div className="container page-narrow">
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="contact-title">{copy.title}</Spaghetti>
        <p className="lead">{copy.text}</p>
        {hasChannels && (
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
        )}
        <ContactForm whatsappHref={whatsapp} />
      </div>
    </section>
  );
}

export function FinalCta() {
  const copy = LANDING.finalCta;
  return (
    <section className="section final-cta section-brand" aria-labelledby="final-title">
      <div className="container page-narrow">
        <Spaghetti as="p" className="eyebrow">{copy.eyebrow}</Spaghetti>
        <Spaghetti as="h2" id="final-title">{copy.title}</Spaghetti>
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
