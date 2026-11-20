import { cloudinaryTransform } from '@/lib/cloudinary-url';

interface ProductImageProps {
  image: { url: string; alt: string } | null;
  /** Largeurs générées (px) ; le navigateur choisit selon `sizes`. */
  widths?: readonly number[];
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Photo 4:5 livrée par Cloudinary (format et qualité automatiques), dimensions déclarées pour éviter les sauts de page. */
export function ProductImage({ image, widths = [320, 480, 640, 960], sizes, priority = false, className = '' }: ProductImageProps) {
  if (!image) {
    return <div className={`img-placeholder ${className}`} role="img" aria-label="Photo à venir" />;
  }
  const at = (width: number) => cloudinaryTransform(image.url, `c_fill,ar_4:5,w_${width},f_auto,q_auto`);
  const largest = widths[widths.length - 1] ?? 960;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={at(widths[Math.min(1, widths.length - 1)] ?? largest)}
      srcSet={widths.map((width) => `${at(width)} ${width}w`).join(', ')}
      sizes={sizes}
      alt={image.alt}
      width={largest}
      height={Math.round(largest * 1.25)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' as const } : {})}
    />
  );
}
