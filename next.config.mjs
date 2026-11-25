import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

// Banc d'essai visuel (e2e/) : E2E_FAKE_DATA=1 remplace les lectures de la base par des données de démonstration,
// pour lancer les vraies pages dans un vrai navigateur sans base ni compte externe. Réservé au développement.
const FAKE_DATA = process.env.E2E_FAKE_DATA === '1';
if (FAKE_DATA && process.env.NODE_ENV === 'production') {
  throw new Error('E2E_FAKE_DATA=1 est réservé au développement : jamais pour un build de production.');
}
const FAKED_SERVICES = ['catalog.queries', 'slug-redirects.service', 'quote.service', 'rate-limit', 'orders.service'];
const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }] },
  webpack(config, { webpack }) {
    if (FAKE_DATA) {
      for (const name of FAKED_SERVICES) {
        config.plugins.push(new webpack.NormalModuleReplacementPlugin(new RegExp(`^@/server/services/${name.replace('.', '\\.')}$`), path.join(root, 'e2e', 'fakes', `${name}.ts`)));
      }
    }
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // La boutique est une section de la landing : l'ancienne page /boutique (et ses filtres ?categorie=, ?filtre=offres, ?tri=, ?q=)
  // est redirigée de façon permanente vers /#boutique ; Next.js conserve la requête (/boutique?filtre=offres → /?filtre=offres#boutique).
  async redirects() {
    return [{ source: '/boutique', destination: '/#boutique', permanent: true }];
  },
};

export default nextConfig;
