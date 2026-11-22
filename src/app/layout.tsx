import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'Meëra Kinks', template: '%s · Meëra Kinks' },
  description: 'La beauté, le soin et vos essentiels au quotidien.',
  // Icônes servies par le site lui-même (jamais par Cloudinary) : le navigateur les réclame avant tout le reste.
  icons: {
    icon: [{ url: '/brand/favicon-icon.png', type: 'image/png' }, { url: '/favicon.ico', sizes: 'any' }],
    shortcut: '/favicon.ico',
    apple: '/brand/apple-touch-icon.png',
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
