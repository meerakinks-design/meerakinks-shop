import type { CSSProperties } from 'react';
import Link from 'next/link';
import { INSTAGRAM_POSTS, MAX_INSTAGRAM_POSTS, MIN_INSTAGRAM_POSTS } from '@/content/instagram';
import { faqItems } from '@/content/faq';
import type { DelaySummary, DeliveryNotes } from '@/lib/shop/delivery-delay';
import { LANDING } from '@/content/landing';
import { REVIEWS } from '@/content/avis';
import { categoryPath, PUBLIC_ROUTES } from '@/lib/constants/routes';
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
 * badge circulaire qui tourne, disque orange derrière les produits qui flottent. Le titre (écrit dans la police du filigrane)
 * joue l'effet élastique dès l'affichage. Aucun surtitre au-dessus des titres, aucune description sous le titre. Les produits viennent du catalogue ; sans photo, la tête aux
 * deux puffs de la marque tient la scène.
 */
export function Hero({ showCollections, iconSrc }: { showCollections: boolean; products?: readonly ShopProduct[]; iconSrc: string }) {
  const hero = LANDING.hero;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <h1 id="hero-title" className="hero-title" aria-label={hero.title}>
          <Spaghetti as="span" mode="chars" trigger="mount" className="hero-title-main">{hero.titleMain}</Spaghetti>{' '}
          <Spaghetti as="span" mode="chars" trigger="mount" className="hero-title-script">{hero.titleScript}</Spaghetti>
        </h1>
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

        <div className="hero-stage">
          <div className="hero-poster">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hero-poster-img" src="/stage/hero2.webp" alt={hero.posterAlt} width={1086} height={1448} />
          </div>
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
        <Spaghetti as="h2" id="collections-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
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
              <Link href="/?filtre=offres#boutique">{copy.offersCta}</Link>
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
        <Spaghetti as="h2" id="best-sellers-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
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
        <Spaghetti as="h2" id="story-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
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
          <Spaghetti as="h2" id="focus-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
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

/**
 * « Le soin en toute simplicité » : de vraies étapes. Chaque étape est une carte à onglet ; en défilant, les cartes se
 * posent les unes sur les autres (sticky, légèrement inclinées) et seuls les onglets des étapes précédentes restent
 * visibles, comme sur la capture de référence. Tout le texte est dans le HTML ; l'empilement est du CSS pur (ui.css).
 */
export function Why({ storeName }: { storeName: string }) {
  const copy = LANDING.why;
  return (
    <section id="pourquoi-nous" className="section" aria-labelledby="why-title">
      <div className="container">
        <Spaghetti as="h2" id="why-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
        <p className="lead">{fill(copy.intro, { storeName })}</p>
        <ol className="why-steps" role="list">
          {copy.items.map((item, index) => (
            <li key={item.title} className="why-step" style={{ '--i': index } as CSSProperties}>
              <h3 className="why-step-tab">
                <span className="why-step-dot" aria-hidden="true" />
                <span className="why-step-title">{item.title}</span>
                <span className="why-step-dot" aria-hidden="true" />
              </h3>
              <div className="why-step-card">
                <span className="why-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
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
        <Spaghetti as="h2" id="reviews-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
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
    <section id="instagram" className="section" aria-labelledby="instagram-title">
      <div className="container">
        <Spaghetti as="h2" id="instagram-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
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

export function Faq({ settings, delays, notes }: { settings: PublicSettings; delays?: DelaySummary; notes?: DeliveryNotes }) {
  const copy = LANDING.faq;
  const items = faqItems(settings.depositAmount, settings.storeName, delays, notes);
  const askLink = whatsappLink(settings.whatsappNumber, fill(LANDING.contact.whatsappMessage, { storeName: settings.storeName }));
  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className="container">
        <Spaghetti as="h2" id="faq-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
        <p className="lead">{copy.text}</p>
        <div>
          <div>
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
        </div>
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
 * Contact (avant le CTA) : à gauche le titre et le texte restent fixes (sticky sur ordinateur), à droite le formulaire intelligent
 * (envoi par Resend vers la vendeuse) défile. Sur téléphone tout s'empile. Seules les coordonnées présentes dans les paramètres
 * sont affichées. Sans formulaire (interrupteur) ni coordonnée, la section n'est pas affichée.
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
    <section id="contact" className="section contact-section" aria-labelledby="contact-title">
      <div className="container contact-split">
        <div className="contact-intro">
          <Spaghetti as="h2" id="contact-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
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
        </div>
        <div className="contact-formcol">
          <ContactForm whatsappHref={whatsapp} />
        </div>
      </div>
    </section>
  );
}

/**
 * CTA final (réf. carte E-Carnet) : la photo de la femme qui tend le spray se fond en dégradé dans une carte brun chocolat,
 * puis titre, texte, bouton et lien. Le spray 3D (brume) atterrit sur celui de la photo au défilement.
 */
export function FinalCta() {
  const copy = LANDING.finalCta;
  return (
    <section className="section cta-section" aria-labelledby="final-title">
      <div className="container">
        <div className="cta-card">
          <div className="cta-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/stage/cta1.webp" alt={copy.photoAlt} width={1122} height={1402} loading="lazy" />
          </div>
          <div className="cta-body">
            <Spaghetti as="h2" id="final-title" ghost={copy.titleGhost}>{copy.title}</Spaghetti>
            <p className="lead">{copy.text}</p>
            <Link className="cta-btn" href={PUBLIC_ROUTES.shop}>
              {copy.primaryCta}
              <span aria-hidden="true">›</span>
            </Link>
            <Link className="cta-link" href="/?tri=nouveautes#boutique">
              {copy.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
