// Formularzustand der Angebotsmaske und kleine, reine Helfer dazu.
import { leerePosition, type AdressArt, type Adresse, type Angebot, type AngebotKomplett, type AngebotSpeichern, type Checkpunkt, type Position, type Termin } from "@/lib/angebot-typen";
import type { Bereich } from "@/lib/preis";

export type Zustand = {
  angebot: Angebot;
  adressen: Record<AdressArt, Adresse>;
  positionen: Position[];
  termine: Termin[];
  checkliste: Checkpunkt[];
};

/** Änderungsfunktionen, die die Maske an die Abschnitte gibt (alle stabil). */
export type Setzer = {
  kopf: (aenderung: Partial<Angebot>) => void;
  adresse: (art: AdressArt, aenderung: Partial<Adresse>) => void;
  positionen: (f: (liste: Position[]) => Position[]) => void;
  termine: (f: (liste: Termin[]) => Termin[]) => void;
  checkliste: (f: (liste: Checkpunkt[]) => Checkpunkt[]) => void;
};

export type Auswahllisten = {
  herkunft: string[];
  umzugsart: string[];
  zahlungsbedingung: string[];
  sachbearbeiter: string[];
  besichtigung_art: string[];
  volumen_ermittlung: string[];
  mwst: string[];
  status: string[];
};

export function startZustand(k: AngebotKomplett): Zustand {
  return { angebot: k.angebot, adressen: k.adressen, positionen: k.positionen, termine: k.termine, checkliste: k.checkliste };
}

/** Zeile eines Bereichs ändern; legt sie an, wenn es sie noch nicht gibt. */
export function aenderePosition(liste: Position[], bereich: Bereich, zeile: number, aenderung: Partial<Position>): Position[] {
  let gefunden = false;
  const neu = liste.map((p) => {
    if (p.bereich !== bereich || p.zeile !== zeile) return p;
    gefunden = true;
    return { ...p, ...aenderung };
  });
  if (!gefunden) neu.push({ ...leerePosition(bereich, zeile), ...aenderung });
  return neu;
}

export function entfernePosition(liste: Position[], bereich: Bereich, zeile: number): Position[] {
  return liste.filter((p) => !(p.bereich === bereich && p.zeile === zeile));
}

export function positionenVon(liste: Position[], bereich: Bereich): Position[] {
  return liste.filter((p) => p.bereich === bereich).sort((a, b) => a.zeile - b.zeile);
}

/** Kleinste freie Zeilennummer aus `erlaubt`, sonst null (Bereich voll). */
export function freieZeile(belegt: number[], erlaubt: number[]): number | null {
  return erlaubt.find((z) => !belegt.includes(z)) ?? null;
}

const adresseLeer = (a: Adresse) => Object.entries(a).every(([k, v]) => k === "art" || v == null || v === "");

/** Baut den Speicherauftrag: geänderte Kopffelder, Adressen und die vollständigen Listen. */
export function speicherAuftrag(jetzt: Zustand, gespeichert: Zustand): AngebotSpeichern {
  const auftrag: AngebotSpeichern = { id: jetzt.angebot.id };
  if (jetzt.angebot !== gespeichert.angebot) {
    const kopf: Record<string, unknown> = {};
    for (const k of Object.keys(jetzt.angebot) as (keyof Angebot)[]) {
      if (jetzt.angebot[k] !== gespeichert.angebot[k]) kopf[k] = jetzt.angebot[k];
    }
    if (Object.keys(kopf).length) auftrag.angebot = kopf as Partial<Angebot>;
  }
  if (jetzt.adressen !== gespeichert.adressen) {
    const adressen: Partial<Record<AdressArt, Partial<Adresse>>> = {};
    for (const art of Object.keys(jetzt.adressen) as AdressArt[]) {
      if (jetzt.adressen[art] === gespeichert.adressen[art]) continue;
      // Leere Zusatzadressen nicht neu anlegen.
      if ((art === "zusatz1" || art === "zusatz2") && adresseLeer(jetzt.adressen[art]) && adresseLeer(gespeichert.adressen[art])) continue;
      adressen[art] = jetzt.adressen[art];
    }
    if (Object.keys(adressen).length) auftrag.adressen = adressen;
  }
  if (jetzt.positionen !== gespeichert.positionen) auftrag.positionen = jetzt.positionen;
  if (jetzt.termine !== gespeichert.termine) auftrag.termine = jetzt.termine;
  if (jetzt.checkliste !== gespeichert.checkliste) auftrag.checkliste = jetzt.checkliste;
  return auftrag;
}

export const ABSCHNITTE = [
  { id: "adressdaten", titel: "Adressdaten" },
  { id: "besichtigung", titel: "Besichtigung" },
  { id: "transport", titel: "Transport/Maut" },
  { id: "freie-leistung", titel: "Freie Leistung" },
  { id: "nebenleistung", titel: "Nebenleistung" },
  { id: "packmaterial", titel: "Packmaterial" },
  { id: "termine", titel: "Termine" },
  { id: "preisuebersicht", titel: "Preisübersicht" },
  { id: "anlagen", titel: "Adressen + Anlagen" },
  { id: "checkliste", titel: "Checkliste" },
  { id: "umzugsgut", titel: "Umzugsgut" },
] as const;
