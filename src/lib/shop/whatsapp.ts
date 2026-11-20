/** Numéro utilisable dans un lien wa.me : chiffres seulement, 8 à 15 (format international sans « + »). */
export function toWhatsappDigits(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function whatsappLink(number: string | null | undefined, message?: string): string | null {
  const digits = toWhatsappDigits(number);
  if (!digits) return null; // « À configurer » et autres valeurs provisoires : aucun lien
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}
