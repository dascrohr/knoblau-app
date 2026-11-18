// Anzeigeformate des Dashboards.
import type { Quote, Vergleich } from "@/lib/dashboard/rechnen";

const ganz = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const zwei = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eins = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
export const MONATE_LANG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const QUOTE_NAME = "180-Tage-Fakturierungsquote";
export const QUOTE_ERKLAERUNG = "Anteil der auswertbaren Angebote, zu denen vom Angebotstag bis einschließlich Tag 180 eine erste eindeutig zugeordnete Rechnung vorliegt.";

export const zahl = (x: number) => ganz.format(x);
export const euro = (x: number | null | undefined, waehrung: string | null = "EUR") => (x == null ? "–" : `${zwei.format(x)} ${waehrung === "EUR" || !waehrung ? "€" : waehrung}`);
/** Kompakter Betrag für Zellen und Achsen: 12.345 € → „12,3 T€“. */
export function euroKurz(x: number): string {
  const a = Math.abs(x);
  if (a >= 1_000_000) return `${eins.format(x / 1_000_000)} Mio. €`;
  if (a >= 10_000) return `${ganz.format(x / 1000)} T€`;
  if (a >= 1000) return `${eins.format(x / 1000)} T€`;
  return `${ganz.format(x)} €`;
}
export const prozent = (anteil: number | null) => (anteil == null ? "nicht berechenbar" : `${eins.format(anteil * 100)} %`);
export const quoteText = (q: Quote) => (q.nenner === 0 ? "nicht berechenbar" : `${eins.format((q.wert as number) * 100)} % (${zahl(q.zaehler)} von ${zahl(q.nenner)})`);
export function datum(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}
export const monatText = (m: string) => `${MONATE_LANG[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const vz = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "±");

/** „+12 (+10,8 %)“ bzw. bei Vorjahresbasis 0 „+12 (Vorjahr 0)“. */
export function veraenderung(v: Vergleich, alsBetrag = false): string {
  const abs = alsBetrag ? euro(Math.abs(v.absolut)) : zahl(Math.abs(v.absolut));
  const rel = v.relativ == null ? (v.vorjahr === 0 && v.wert === 0 ? "unverändert" : "Vorjahr 0, kein Prozentwert") : `${vz(v.relativ)}${eins.format(Math.abs(v.relativ) * 100)} %`;
  return `${vz(v.absolut)}${abs} (${rel})`;
}
export const punkte = (p: number | null) => (p == null ? "kein Vergleich möglich" : `${vz(p)}${eins.format(Math.abs(p))} Prozentpunkte`);
