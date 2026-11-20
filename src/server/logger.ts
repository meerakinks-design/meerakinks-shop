// Journal structuré (une ligne JSON par événement), lisible dans les logs Vercel.
// Ne jamais y passer de mot de passe, de jeton, de numéro de téléphone ni d'email.

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  if (error === undefined || error === null) return undefined;
  return { message: String(error) };
}

export function logError(event: string, context: Record<string, unknown> = {}, error?: unknown): void {
  console.error(JSON.stringify({ level: 'error', event, ...context, error: serializeError(error), time: new Date().toISOString() }));
}

export function logInfo(event: string, context: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({ level: 'info', event, ...context, time: new Date().toISOString() }));
}
