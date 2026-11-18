// Kleine Helfer für die Seiten der Neuansicht (Server und Browser).

/** Ersten Wert eines GET-Parameters lesen. */
export function einer(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function ganzzahl(v: string | string[] | undefined): number | null {
  const n = Number(einer(v));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export type SuchParameter = Promise<{ [key: string]: string | string[] | undefined }>;
