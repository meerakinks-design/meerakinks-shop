import { describe, expect, it } from 'vitest';
import { formatFcfa, parseFcfaInput } from '@/lib/money';

describe('formatFcfa', () => {
  it('sépare les milliers et ajoute FCFA, sans décimales', () => {
    expect(formatFcfa(12500).replace(/[\s\u202f\u00a0]/g, ' ')).toBe('12 500 FCFA');
    expect(formatFcfa(0)).toContain('0 FCFA');
  });
});

describe('parseFcfaInput', () => {
  it('lit les saisies courantes', () => {
    expect(parseFcfaInput('12 500')).toBe(12500);
    expect(parseFcfaInput('12.500 FCFA')).toBe(12500);
    expect(parseFcfaInput(' 6000 ')).toBe(6000);
    expect(parseFcfaInput('0')).toBe(0);
  });
  it('rend null quand il n’y a aucun chiffre ou un nombre absurde', () => {
    expect(parseFcfaInput('')).toBeNull();
    expect(parseFcfaInput('abc')).toBeNull();
    expect(parseFcfaInput('1'.repeat(13))).toBeNull();
  });
});
