export function buildCsp(options?: { isDev?: boolean; allowMapTiles?: boolean }): string;
export const baseSecurityHeaders: { key: string; value: string }[];
export function buildHeaderRules(options?: {
  isDev?: boolean;
  reportOnly?: boolean;
}): { source: string; headers: { key: string; value: string }[] }[];
