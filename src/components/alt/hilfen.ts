// Kleine Helfer der Altansicht (Server und Browser).
export type SuchParameter = Promise<Record<string, string | string[] | undefined>>;

/** Ersten Wert eines GET-Parameters als Text. */
export function eins(sp: Record<string, string | string[] | undefined>, k: string): string {
  const v = sp[k];
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim();
}

/** Query-String aus befüllten Werten. */
export function abfrage(werte: Record<string, string | number | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(werte)) if (v != null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const NICHT_UMGESETZT = "Heute nicht umgesetzt";
