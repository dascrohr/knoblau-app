// Gemeinsame Typen und Konstanten der Angebotsmaske (Browser + Server).
import type { AngebotAdressenZeile, AngebotPositionenZeile, AngebotTermineZeile, AngeboteZeile, ChecklistenpunkteZeile, UmzugsgutZeile } from "./db-typen";
import type { Bereich } from "./preis";

export type AdressArt = "auftraggeber" | "beladestelle" | "entladestelle" | "zusatz1" | "zusatz2";
export const ADRESS_ARTEN: AdressArt[] = ["auftraggeber", "beladestelle", "entladestelle", "zusatz1", "zusatz2"];
export const ADRESS_TITEL: Record<AdressArt, string> = {
  auftraggeber: "Auftraggeber", beladestelle: "Beladestelle", entladestelle: "Entladestelle", zusatz1: "Zusatzadresse 1", zusatz2: "Zusatzadresse 2",
};

export type Angebot = AngeboteZeile;
export type Adresse = Omit<AngebotAdressenZeile, "id" | "angebot_id">;
export type Position = Omit<AngebotPositionenZeile, "id" | "angebot_id" | "bereich"> & { bereich: Bereich };
export type Termin = Omit<AngebotTermineZeile, "id" | "angebot_id">;
export type Checkpunkt = Omit<ChecklistenpunkteZeile, "id" | "angebot_id">;
export type Umzugsgut = UmzugsgutZeile;

/** Feste Zeilen je Bereich wie in der Altmaske. `frei` hat beliebig viele Zeilen (ab 1). */
export const BEREICH_ZEILEN: Record<Exclude<Bereich, "frei" | "maut">, number[]> = {
  beladen: [1, 2, 3, 4],
  befoerdern: [0, 1, 2, 3, 4],
  entladen: [1, 2, 3, 4],
  nebenleistung: Array.from({ length: 15 }, (_, i) => i + 1),
  packmaterial: Array.from({ length: 15 }, (_, i) => i + 1),
};
export const TERMIN_ZEILEN = Array.from({ length: 10 }, (_, i) => i + 1);

export type AngebotKomplett = {
  angebot: Angebot;
  adressen: Record<AdressArt, Adresse>; // immer alle fünf, leere Felder = null
  positionen: Position[]; // nur befüllte Zeilen
  termine: Termin[]; // nur befüllte Zeilen
  checkliste: Checkpunkt[];
  umzugsgut: Umzugsgut[];
  rechnungen: { id: number; rechnungnr: string | null; rechnungsdatum: string | null; gesamtsumme: number | null }[];
  halteverbotszonen: { id: number; adressart: string | null; strasse: string | null; plz: string | null; ort: string | null; von_datum: string | null; bis_datum: string | null; anfrage_ergebnis: string | null; buchung_ergebnis: string | null }[];
  arbeitsscheine: { id: number; arbnr: string | null; art: string | null; datum: string | null; status: string | null }[];
};

/** Was die Maske beim Speichern schickt. Fehlende Teile bleiben unverändert. */
export type AngebotSpeichern = {
  id: number;
  angebot?: Partial<Angebot>;
  adressen?: Partial<Record<AdressArt, Partial<Adresse>>>;
  positionen?: Position[]; // vollständige Liste aller Bereiche; ersetzt den Bestand
  termine?: Termin[]; // vollständige Liste; ersetzt den Bestand
  checkliste?: Checkpunkt[]; // vollständige Liste; ersetzt den Bestand
};

export type Ergebnis<T = undefined> = { ok: true; daten: T } | { ok: false; fehler: string };

export function leereAdresse(art: AdressArt): Adresse {
  return { art, bezeichnung: null, anrede: null, titel: null, vorname: null, name: null, name1: null, name2: null, zuhaenden: null, strasse: null, lkz: null, plz: null, ort: null, telefon: null };
}
export function leerePosition(bereich: Bereich, zeile: number): Position {
  return { bereich, zeile, anzahl: null, text: null, einheiten: null, einzelpreis: null, prozent: null, art: null, beschreibung: null, ust: null, konto: null, kostenstelle: null, waehrung: null };
}
/** Zeile gilt als leer, wenn weder Text noch Preis noch Menge eingetragen ist. */
export function positionIstLeer(p: Partial<Position>): boolean {
  return !(p.text && p.text.trim()) && p.einzelpreis == null && p.anzahl == null && p.einheiten == null;
}
/** Anzeigename einer Adresse für Listen: "Name, Vorname" bzw. Firma. */
export function adressName(a: Partial<Adresse> | null | undefined): string {
  if (!a) return "";
  const person = [a.name, a.vorname].filter(Boolean).join(", ");
  return [person, a.name1].filter(Boolean).join(" · ");
}
