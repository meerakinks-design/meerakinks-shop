import { afterEach, describe, expect, it } from 'vitest';
import { cld, isLocalOnly, staticPublicId, staticResourceType } from '@/lib/cloudinary-static';

const original = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  else process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = original;
});

describe('staticResourceType', () => {
  it.each(['a.png', 'a.JPG', 'a.jpeg', 'a.webp', 'a.gif', 'a.avif', 'a.svg'])('%s → image', (file) => {
    expect(staticResourceType(file)).toBe('image');
  });
  it.each(['a.webm', 'a.mp4', 'a.mov', 'son.mp3'])('%s → video (Cloudinary range aussi l’audio avec la vidéo)', (file) => {
    expect(staticResourceType(file)).toBe('video');
  });
  it('tout autre format part en raw', () => {
    expect(staticResourceType('doc.pdf')).toBe('raw');
    expect(staticResourceType('sans-extension')).toBe('raw');
    expect(staticResourceType('dossier.v2/fichier')).toBe('raw');
  });
});

describe('staticPublicId', () => {
  it('reprend l’arborescence de public/ sous le dossier racine, sans extension pour image et vidéo', () => {
    expect(staticPublicId('/brand/logo-meera-kinks.png')).toBe('meera/public/brand/logo-meera-kinks');
    expect(staticPublicId('videos/hero.webm')).toBe('meera/public/videos/hero');
  });
  it('garde l’extension pour raw', () => {
    expect(staticPublicId('docs/guide.pdf')).toBe('meera/public/docs/guide.pdf');
  });
});

describe('isLocalOnly', () => {
  it('garde les polices et les icônes de site sur le site', () => {
    expect(isLocalOnly('/fonts/great-vibes.ttf')).toBe(true);
    expect(isLocalOnly('favicon.ico')).toBe(true);
    expect(isLocalOnly('/brand/favicon-icon.png')).toBe(true);
    expect(isLocalOnly('/brand/apple-touch-icon.png')).toBe(true);
    expect(isLocalOnly('/brand/logo-meera-kinks.png')).toBe(false);
  });
});

describe('cld', () => {
  it('sans nom de cloud (développement, tests) : renvoie le chemin local, rien ne casse', () => {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    expect(cld('/brand/logo-meera-kinks.png')).toBe('/brand/logo-meera-kinks.png');
  });

  it('image : format et qualité automatiques, largeur facultative', () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo';
    expect(cld('/brand/logo-meera-kinks.png')).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/meera/public/brand/logo-meera-kinks');
    expect(cld('/brand/logo-meera-kinks.png', { width: 400 })).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/meera/public/brand/logo-meera-kinks');
  });

  it('vidéo et son : adresse /video/upload', () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo';
    expect(cld('/videos/hero.webm')).toBe('https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/meera/public/videos/hero');
    expect(cld('/sons/pop.mp3')).toContain('/video/upload/');
  });

  it('autre format : raw, sans transformation, extension conservée', () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo';
    expect(cld('/docs/guide.pdf')).toBe('https://res.cloudinary.com/demo/raw/upload/meera/public/docs/guide.pdf');
  });

  it('encode chaque segment (espaces, accents) sans toucher aux « / »', () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo';
    expect(cld('/galerie été/photo 1.webp')).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/meera/public/galerie%20%C3%A9t%C3%A9/photo%201');
  });

  it('les polices et les icônes restent locales même avec un cloud configuré', () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo';
    expect(cld('/fonts/great-vibes.ttf')).toBe('/fonts/great-vibes.ttf');
    expect(cld('/favicon.ico')).toBe('/favicon.ico');
  });
});
