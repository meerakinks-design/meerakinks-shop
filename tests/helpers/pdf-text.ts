import { inflateSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';

/**
 * Extrait le texte d'un PDF produit par pdf-lib (polices standard, texte en hexadécimal WinAnsi, flux compressés).
 * Suffisant pour vérifier ce qu'un reçu CONTIENT sans lecteur PDF ; renvoie une ligne par instruction `Tj`.
 */
export function extractPdfLines(bytes: Uint8Array): string[] {
  const raw = Buffer.from(bytes).toString('latin1');
  const lines: string[] = [];
  const decoder = new TextDecoder('windows-1252');
  // pdf-lib écrit « stream\n » + données + « \nendstream » : ne PAS retirer un éventuel \r final, il peut faire partie des données compressées.
  const streamPattern = /stream\n([\s\S]*?)\nendstream/g;
  for (const match of raw.matchAll(streamPattern)) {
    let content: string;
    try {
      content = inflateSync(Buffer.from(match[1] as string, 'latin1')).toString('latin1');
    } catch {
      continue; // flux non compressé ou binaire (polices, images) : sans texte à lire
    }
    for (const text of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      const hex = text[1] as string;
      lines.push(decoder.decode(Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16))));
    }
  }
  return lines;
}

export const extractPdfText = (bytes: Uint8Array): string => extractPdfLines(bytes).join('\n');

export async function countPdfPages(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}
