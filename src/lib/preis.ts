// Preisberechnung. Eine Quelle für Altansicht, Neuansicht und das Speichern.
// Läuft im Browser (live) und auf dem Server. Keine Abhängigkeiten.

export type Bereich = "beladen" | "befoerdern" | "entladen" | "nebenleistung" | "packmaterial" | "frei" | "maut";

export type PreisPosition = {
  bereich: Bereich;
  anzahl?: number | null;
  einheiten?: number | null; // Std/Stck
  einzelpreis?: number | null;
  prozent?: number | null; // +/- Prozent
};

export type PreisKopf = {
  ust_satz?: number | null;
  generalrabatt?: number | null;
  klavier?: boolean | null; klavier_anzahl?: number | null; klavier_preis?: number | null;
  fluegel?: boolean | null; fluegel_anzahl?: number | null; fluegel_preis?: number | null;
  schwergut?: boolean | null; schwergut_kilo?: number | null; schwergut_preis?: number | null; // Preis je 100 kg
  versicherungsbetrag?: number | null;
  versicherungssteuer?: number | null; // 1 = Versicherungssteuer statt USt auf den Versicherungsbetrag
  maut_in_angebot?: boolean | null; maut_gesamt?: number | null;
};

export const VERSICHERUNGSSTEUER_SATZ = 16;

/** Kaufmännisch auf 2 Stellen runden (ohne Gleitkomma-Ausreißer wie 1.005 → 1.00). */
export function runde2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

const zahl = (x: number | null | undefined) => (typeof x === "number" && Number.isFinite(x) ? x : 0);

/**
 * Gesamtpreis einer Zeile: Anzahl × Std/Stck × Einzelpreis, danach +/- Prozent.
 * Leere Anzahl bzw. leere Std/Stck zählen als 1 (in der Altsoftware bleiben die Felder oft leer).
 * Ohne Einzelpreis ist die Zeile ein Hinweistext und zählt 0.
 */
export function zeilenSumme(p: Pick<PreisPosition, "anzahl" | "einheiten" | "einzelpreis" | "prozent">): number {
  const ep = zahl(p.einzelpreis);
  if (!ep) return 0;
  const anzahl = zahl(p.anzahl) || 1;
  const einheiten = zahl(p.einheiten) || 1;
  return runde2(anzahl * einheiten * ep * (1 + zahl(p.prozent) / 100));
}

export type PreisUebersicht = {
  beladen: number;
  transport: number; // Befördern + Freie Leistungen
  befoerdern: number;
  frei: number;
  entladen: number;
  versicherung: number;
  besonderheiten: number;
  packmaterial: number;
  nebenleistungen: number;
  maut: number;
  netto: number; // Gesamtnettosumme vor Generalrabatt
  rabatt: number; // abzügl. Generalmarge
  nettoNachRabatt: number;
  ustSatz: number;
  ust: number;
  vsst: number; // Versicherungssteuer 16 % nur auf den Versicherungsbetrag
  gesamt: number;
};

export function berechnePreis(kopf: PreisKopf, positionen: PreisPosition[]): PreisUebersicht {
  const summe = (b: Bereich) => runde2(positionen.filter((p) => p.bereich === b).reduce((s, p) => s + zeilenSumme(p), 0));
  const beladen = summe("beladen");
  const befoerdern = summe("befoerdern");
  const frei = summe("frei");
  const entladen = summe("entladen");
  const nebenleistungen = summe("nebenleistung");
  const packmaterial = summe("packmaterial");
  const besonderheiten = runde2(
    (kopf.klavier ? (zahl(kopf.klavier_anzahl) || 1) * zahl(kopf.klavier_preis) : 0) +
      (kopf.fluegel ? (zahl(kopf.fluegel_anzahl) || 1) * zahl(kopf.fluegel_preis) : 0) +
      (kopf.schwergut ? (zahl(kopf.schwergut_kilo) / 100) * zahl(kopf.schwergut_preis) : 0),
  );
  const versicherung = runde2(zahl(kopf.versicherungsbetrag));
  const maut = runde2(summe("maut") + (kopf.maut_in_angebot ? zahl(kopf.maut_gesamt) : 0));
  const transport = runde2(befoerdern + frei);
  const netto = runde2(beladen + transport + entladen + versicherung + besonderheiten + packmaterial + nebenleistungen + maut);
  // Generalrabatt wirkt auf die Leistungen, nicht auf die Versicherung.
  const rabatt = runde2(((netto - versicherung) * zahl(kopf.generalrabatt)) / 100);
  const nettoNachRabatt = runde2(netto - rabatt);
  const ustSatz = kopf.ust_satz == null ? 19 : zahl(kopf.ust_satz);
  const mitVsst = zahl(kopf.versicherungssteuer) > 0 && versicherung > 0;
  const ustBasis = mitVsst ? nettoNachRabatt - versicherung : nettoNachRabatt;
  const ust = runde2((ustBasis * ustSatz) / 100);
  const vsst = mitVsst ? runde2((versicherung * VERSICHERUNGSSTEUER_SATZ) / 100) : 0;
  const gesamt = runde2(nettoNachRabatt + ust + vsst);
  return { beladen, transport, befoerdern, frei, entladen, versicherung, besonderheiten, packmaterial, nebenleistungen, maut, netto, rabatt, nettoNachRabatt, ustSatz, ust, vsst, gesamt };
}

const euro = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 17316 → "17.316,00" */
export function formatBetrag(x: number | null | undefined): string {
  return x == null || !Number.isFinite(x) ? "" : euro.format(x);
}
const zahlFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 });
export function formatZahl(x: number | null | undefined): string {
  return x == null || !Number.isFinite(x) ? "" : zahlFmt.format(x);
}
/** "1.225,50" oder "1225.5" → 1225.5; leer → null */
export function parseZahl(s: string | number | null | undefined): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (s == null) return null;
  let t = s.trim().replace(/\s|€|%/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
/** "2026-11-17" → "17.11.2026" */
export function formatDatum(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}
