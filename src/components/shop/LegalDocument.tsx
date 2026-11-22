import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LegalSection } from '@/content/cookies';
import { PRIVACY_TEXTS_VALIDATED, PROVISIONAL_NOTICE } from '@/content/legal-status';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import type { ContactSettings } from '@/lib/shop/contact';

/** Moyens de contact CONFIRMÉS dans les paramètres : jamais inventés (cahier RM-42). */
function ContactLines({ settings }: { settings: Pick<ContactSettings, 'whatsappLink' | 'contactEmail'> }) {
  const { whatsappLink, contactEmail } = settings;
  if (!whatsappLink && !contactEmail) {
    return <p>Les moyens de contact de la boutique seront indiqués ici dès leur confirmation.</p>;
  }
  return (
    <ul>
      {whatsappLink && (
        <li>
          WhatsApp : <a href={whatsappLink} target="_blank" rel="noopener noreferrer">écrire à la boutique</a>
        </li>
      )}
      {contactEmail && (
        <li>
          Email : <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </li>
      )}
    </ul>
  );
}

/** Page de texte légal : titre, bandeau « provisoire » tant que le texte n'est pas validé, sections. */
export function LegalDocument({
  title,
  intro,
  sections,
  settings,
  children,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  settings: Pick<ContactSettings, 'whatsappLink' | 'contactEmail'>;
  /** Affiché entre l'introduction et les sections (ex. le choix de consentement). */
  children?: ReactNode;
}) {
  return (
    <div className="container page-narrow legal-document">
      <h1>{title}</h1>
      {!PRIVACY_TEXTS_VALIDATED && <p className="legal-notice" role="note">{PROVISIONAL_NOTICE}</p>}
      <p>{intro}</p>
      {children}
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`section-${section.id}`}>
          <h2 id={`section-${section.id}`}>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.items && (
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {section.showContact && <ContactLines settings={settings} />}
          {section.link && (
            <p>
              <Link href={section.link.href}>{section.link.label}</Link>
            </p>
          )}
        </section>
      ))}
      <p>
        <Link className="btn" href={PUBLIC_ROUTES.home}>
          Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}
