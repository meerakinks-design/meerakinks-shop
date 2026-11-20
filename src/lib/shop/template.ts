/** Remplace {cle} dans un texte. Une clé inconnue lève une erreur : on ne publie jamais un « {storeName} » brut. */
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Variable de texte inconnue : {${key}}`);
    return value;
  });
}
