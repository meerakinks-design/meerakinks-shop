import { beforeAll, describe, expect, it } from 'vitest';
import { cloudinaryThumbnail, cloudinaryTransform } from '@/lib/cloudinary-url';

process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
process.env.CLOUDINARY_CLOUD_NAME = 'demo';
process.env.CLOUDINARY_API_KEY = '123456789012345';
process.env.CLOUDINARY_API_SECRET = 'secret-de-test';

let cloudinary: typeof import('@/server/integrations/cloudinary');
beforeAll(async () => {
  cloudinary = await import('@/server/integrations/cloudinary');
});

describe('signCloudinaryParams', () => {
  it('reproduit l’exemple officiel de la documentation Cloudinary', () => {
    const signature = cloudinary.signCloudinaryParams(
      { eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 },
      'abcd',
    );
    expect(signature).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
  it('trie les paramètres quel que soit l’ordre fourni', () => {
    expect(cloudinary.signCloudinaryParams({ timestamp: 1, folder: 'a' }, 's')).toBe(
      cloudinary.signCloudinaryParams({ folder: 'a', timestamp: 1 }, 's'),
    );
  });
});

describe('createUploadSignature', () => {
  it('signe le dossier, les formats et l’heure, sans jamais renvoyer le secret', async () => {
    const { createHash } = await import('node:crypto');
    const result = cloudinary.createUploadSignature(1_700_000_000_000);
    const expected = createHash('sha1')
      .update('allowed_formats=jpg,jpeg,png,webp,gif,avif&folder=boutique/products&timestamp=1700000000' + 'secret-de-test')
      .digest('hex');
    expect(result.signature).toBe(expected);
    expect(result).toMatchObject({ cloudName: 'demo', apiKey: '123456789012345', timestamp: 1_700_000_000, folder: 'boutique/products', resourceType: 'image' });
    expect(JSON.stringify(result)).not.toContain('secret-de-test');
  });

  it('accepte GIF et AVIF pour les images, jamais SVG (un SVG peut embarquer du script)', async () => {
    const { allowedFormats } = cloudinary.createUploadSignature(1_700_000_000_000);
    expect(allowedFormats.split(',')).toEqual(expect.arrayContaining(['jpg', 'png', 'webp', 'gif', 'avif']));
    expect(allowedFormats).not.toContain('svg');
  });

  it('signe les vidéos (webm, mp4, mov) dans leur propre dossier, avec le type « video »', async () => {
    const { createHash } = await import('node:crypto');
    const result = cloudinary.createUploadSignature(1_700_000_000_000, 'video');
    const expected = createHash('sha1')
      .update('allowed_formats=webm,mp4,mov&folder=boutique/videos&timestamp=1700000000' + 'secret-de-test')
      .digest('hex');
    expect(result).toMatchObject({ folder: 'boutique/videos', allowedFormats: 'webm,mp4,mov', resourceType: 'video', signature: expected });
    expect(JSON.stringify(result)).not.toContain('secret-de-test');
  });
});

describe('isOwnCloudinaryImage', () => {
  const good = { url: 'https://res.cloudinary.com/demo/image/upload/v1700000000/boutique/products/abc123.jpg', publicId: 'boutique/products/abc123' };

  it('accepte une image de notre compte et de notre dossier', () => {
    expect(cloudinary.isOwnCloudinaryImage(good, 'demo')).toBe(true);
  });
  it('refuse le compte d’un autre', () => {
    expect(cloudinary.isOwnCloudinaryImage({ ...good, url: good.url.replace('/demo/', '/autre/') }, 'demo')).toBe(false);
  });
  it('refuse une URL externe, http ou déguisée', () => {
    expect(cloudinary.isOwnCloudinaryImage({ ...good, url: 'https://pirate.example/demo/image/upload/boutique/products/abc123.jpg' }, 'demo')).toBe(false);
    expect(cloudinary.isOwnCloudinaryImage({ ...good, url: good.url.replace('https', 'http') }, 'demo')).toBe(false);
    expect(cloudinary.isOwnCloudinaryImage({ ...good, url: good.url + '?x=1' }, 'demo')).toBe(false);
    expect(cloudinary.isOwnCloudinaryImage({ ...good, url: 'https://res.cloudinary.com.pirate.example/demo/image/upload/boutique/products/abc123.jpg' }, 'demo')).toBe(false);
  });
  it('refuse un identifiant hors de notre dossier ou qui ne correspond pas à l’URL', () => {
    expect(cloudinary.isOwnCloudinaryImage({ ...good, publicId: 'autre-dossier/abc123' }, 'demo')).toBe(false);
    expect(cloudinary.isOwnCloudinaryImage({ ...good, publicId: 'boutique/products/../secret' }, 'demo')).toBe(false);
    expect(cloudinary.isOwnCloudinaryImage({ ...good, publicId: 'boutique/products/autre' }, 'demo')).toBe(false);
  });
});

describe('cloudinaryTransform', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1/boutique/products/a.jpg';
  it('insère la transformation après /image/upload/', () => {
    expect(cloudinaryTransform(url, 'w_100')).toBe('https://res.cloudinary.com/demo/image/upload/w_100/v1/boutique/products/a.jpg');
    expect(cloudinaryThumbnail(url, 160)).toContain('/upload/c_fill,w_160,h_160,f_auto,q_auto/v1/');
  });
  it('laisse intacte une URL qui n’est pas Cloudinary', () => {
    expect(cloudinaryTransform('https://exemple.com/a.jpg', 'w_100')).toBe('https://exemple.com/a.jpg');
  });
});
