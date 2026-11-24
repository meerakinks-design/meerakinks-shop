import type { SVGProps } from 'react';

export type SocialIconName = 'whatsapp' | 'mail' | 'instagram' | 'tiktok' | 'facebook';

/** Pictogrammes du pied de page. Décoratifs : le lien qui les porte a son propre nom accessible. */
export function SocialIcon({ name, size = 22, ...props }: Omit<SVGProps<SVGSVGElement>, 'name'> & { name: SocialIconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false, ...props } as const;
  switch (name) {
    case 'facebook':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M13.6 21v-7.5h2.6l.45-3.1H13.6V8.5c0-.9.3-1.5 1.6-1.5h1.7V4.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.1 1.5-4.1 4.2v2.2H7.6v3.1h2.7V21z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 7.5 12 13l7.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M12 3.2a8.8 8.8 0 0 0-7.5 13.4L3.3 20.7l4.2-1.1A8.8 8.8 0 1 0 12 3.2z" />
          <path fill="currentColor" d="M9.1 7.9c-.3 0-.6.1-.8.4-.4.5-.8 1.2-.4 2.2.7 1.8 2.1 3.4 3.9 4.4 1.2.6 2.1.5 2.7.1.4-.3.7-.8.7-1.2 0-.2-.1-.3-.3-.4l-1.5-.7c-.2-.1-.4 0-.5.1l-.6.7c-.1.1-.3.2-.5.1-.9-.4-1.7-1.1-2.2-2-.1-.2-.1-.3 0-.5l.5-.6c.1-.1.1-.3 0-.5l-.7-1.5c-.1-.2-.3-.3-.5-.3z" />
        </svg>
      );
  }
}
