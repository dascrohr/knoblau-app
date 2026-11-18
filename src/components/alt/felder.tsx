"use client";
// Bausteine der Angebotsmaske: Zustand (Kontext) und Felder im Altstil.
import { createContext, useContext, useId, useState } from "react";
import type { AdressArt, Adresse, Angebot, Checkpunkt, Position, Termin } from "@/lib/angebot-typen";
import { formatBetrag, formatZahl, parseZahl, type Bereich } from "@/lib/preis";

export type Zustand = {
  angebot: Angebot;
  adressen: Record<AdressArt, Adresse>;
  positionen: Position[];
  termine: Termin[];
  checkliste: Checkpunkt[];
};

export type Textbaustein = { id: number; bereich: string | null; titel: string; text: string | null };

export type Maske = {
  z: Zustand;
  lesen: boolean;
  /** Textbausteine aus den Stammdaten (für die großen Textfelder). */
  bausteine: Textbaustein[];
  /** Legt nach Rückfrage eine Kopie des Angebots an und öffnet sie. */
  duplizieren: () => void;
  /** Läuft gerade Speichern/Duplizieren? Dann Aktionsknöpfe sperren. */
  beschaeftigt: boolean;
  setA: (patch: Partial<Angebot>) => void;
  setAdr: (art: AdressArt, patch: Partial<Adresse>) => void;
  setPos: (bereich: Bereich, zeile: number, patch: Partial<Position>) => void;
  entfernePos: (bereich: Bereich, zeile: number) => void;
  setTermin: (zeile: number, patch: Partial<Termin>) => void;
  setCheckliste: (liste: Checkpunkt[]) => void;
};

export const MaskeKontext = createContext<Maske | null>(null);
export function useMaske(): Maske {
  const m = useContext(MaskeKontext);
  if (!m) throw new Error("Maske fehlt");
  return m;
}

type Schluessel<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T] & string;
export type ATextSpalte = Schluessel<Angebot, string | null>;
export type AZahlSpalte = Schluessel<Angebot, number | null>;
export type AHakenSpalte = Schluessel<Angebot, boolean>;

// ---------------------------------------------------------------- nackte Eingaben (für Tabellenzellen)

/** Zahl in deutscher Schreibweise; hält während des Tippens den Rohtext. */
export function ZahlEingabe({ wert, onWert, betrag, lesen, id, label, className, berechnet }: { wert: number | null | undefined; onWert?: (n: number | null) => void; betrag?: boolean; lesen?: boolean; id?: string; label?: string; className?: string; berechnet?: boolean }) {
  const [roh, setRoh] = useState<string | null>(null);
  const anzeige = roh ?? (betrag ? formatBetrag(wert) : formatZahl(wert));
  return (
    <input
      id={id}
      aria-label={label}
      type="text"
      inputMode="decimal"
      className={"zahl" + (berechnet ? " berechnet" : "") + (className ? " " + className : "")}
      value={anzeige}
      readOnly={lesen || berechnet || !onWert}
      tabIndex={berechnet ? -1 : undefined}
      onChange={(e) => { setRoh(e.target.value); onWert?.(parseZahl(e.target.value)); }}
      onBlur={() => setRoh(null)}
    />
  );
}

export function TextEingabe({ wert, onWert, lesen, id, label, liste, typ = "text", className }: { wert: string | null | undefined; onWert?: (s: string | null) => void; lesen?: boolean; id?: string; label?: string; liste?: string[]; typ?: "text" | "date" | "email" | "tel"; className?: string }) {
  const eigen = useId();
  const listId = liste?.length ? eigen + "l" : undefined;
  const v = typ === "date" ? (wert ?? "").slice(0, 10) : (wert ?? "");
  return (
    <>
      <input id={id} aria-label={label} type={typ} className={className} value={v} list={listId} readOnly={lesen || !onWert} onChange={(e) => onWert?.(e.target.value === "" ? null : e.target.value)} />
      {listId && <datalist id={listId}>{liste!.map((o) => <option key={o} value={o} />)}</datalist>}
    </>
  );
}

// ---------------------------------------------------------------- Felder mit Beschriftung

export function Text(p: { label: string; wert: string | null | undefined; onWert?: (s: string | null) => void; lesen?: boolean; liste?: string[]; typ?: "text" | "date" | "email" | "tel"; kurz?: boolean }) {
  const id = useId();
  return (
    <div className={"feld" + (p.kurz || p.typ === "date" ? " kurz" : "")}>
      <label htmlFor={id}>{p.label}</label>
      <TextEingabe id={id} wert={p.wert} onWert={p.onWert} lesen={p.lesen} liste={p.liste} typ={p.typ} />
    </div>
  );
}

export function Zahl(p: { label: string; wert: number | null | undefined; onWert?: (n: number | null) => void; lesen?: boolean; betrag?: boolean; berechnet?: boolean }) {
  const id = useId();
  return (
    <div className="feld kurz">
      <label htmlFor={id}>{p.label}</label>
      <ZahlEingabe id={id} wert={p.wert} onWert={p.onWert} lesen={p.lesen} betrag={p.betrag} berechnet={p.berechnet} />
    </div>
  );
}

export function Haken(p: { label: string; wert: boolean; onWert?: (b: boolean) => void; lesen?: boolean; title?: string }) {
  const id = useId();
  return (
    <div className="haken" title={p.title}>
      <input id={id} type="checkbox" checked={!!p.wert} disabled={p.lesen || !p.onWert} onChange={(e) => p.onWert?.(e.target.checked)} />
      <label htmlFor={id}>{p.label}</label>
    </div>
  );
}

export function Mehrzeilig(p: { label: string; wert: string | null | undefined; onWert?: (s: string | null) => void; lesen?: boolean; zeilen?: number }) {
  const id = useId();
  return (
    <div className="feld oben">
      <label htmlFor={id}>{p.label}</label>
      <textarea id={id} rows={p.zeilen ?? 5} value={p.wert ?? ""} readOnly={p.lesen || !p.onWert} onChange={(e) => p.onWert?.(e.target.value === "" ? null : e.target.value)} />
    </div>
  );
}

/** Sichtbarer, aber heute nicht umgesetzter Knopf. */
export function Aus({ children, klein }: { children: React.ReactNode; klein?: boolean }) {
  return <button type="button" className={"knopf" + (klein ? " klein" : "")} disabled title="Heute nicht umgesetzt">{children}</button>;
}

// ---------------------------------------------------------------- an Angebotsspalten gebundene Felder

export function AText({ spalte, label, liste, typ, kurz }: { spalte: ATextSpalte; label: string; liste?: string[]; typ?: "text" | "date" | "email" | "tel"; kurz?: boolean }) {
  const m = useMaske();
  return <Text label={label} wert={m.z.angebot[spalte]} onWert={(s) => m.setA({ [spalte]: s } as Partial<Angebot>)} lesen={m.lesen} liste={liste} typ={typ} kurz={kurz} />;
}
export function ADatum({ spalte, label }: { spalte: ATextSpalte; label: string }) {
  return <AText spalte={spalte} label={label} typ="date" />;
}
export function AZahl({ spalte, label, betrag }: { spalte: AZahlSpalte; label: string; betrag?: boolean }) {
  const m = useMaske();
  return <Zahl label={label} wert={m.z.angebot[spalte]} onWert={(n) => m.setA({ [spalte]: n } as Partial<Angebot>)} lesen={m.lesen} betrag={betrag} />;
}
export function AHaken({ spalte, label }: { spalte: AHakenSpalte; label: string }) {
  const m = useMaske();
  return <Haken label={label} wert={m.z.angebot[spalte]} onWert={(b) => m.setA({ [spalte]: b } as Partial<Angebot>)} lesen={m.lesen} />;
}
/** Häkchen auf einer Zahlenspalte (1/0), z. B. Versicherungssteuer. */
export function AHakenZahl({ spalte, label }: { spalte: AZahlSpalte; label: string }) {
  const m = useMaske();
  return <Haken label={label} wert={(m.z.angebot[spalte] ?? 0) > 0} onWert={(b) => m.setA({ [spalte]: b ? 1 : 0 } as Partial<Angebot>)} lesen={m.lesen} />;
}
export function AMemo({ spalte, label, zeilen }: { spalte: ATextSpalte; label: string; zeilen?: number }) {
  const m = useMaske();
  return <Mehrzeilig label={label} wert={m.z.angebot[spalte]} onWert={(s) => m.setA({ [spalte]: s } as Partial<Angebot>)} lesen={m.lesen} zeilen={zeilen} />;
}

/** Adressblock: Anrede … Ort für eine der fünf Adressen. */
export function AdressFelder({ art, mitBezeichnung }: { art: AdressArt; mitBezeichnung?: boolean }) {
  const m = useMaske();
  const a = m.z.adressen[art];
  const id = useId();
  const f = (spalte: Exclude<keyof Adresse, "art">, label: string) => (
    <Text label={label} wert={a[spalte]} onWert={(s) => m.setAdr(art, { [spalte]: s } as Partial<Adresse>)} lesen={m.lesen} />
  );
  return (
    <>
      {mitBezeichnung && f("bezeichnung", "Art der Adresse")}
      {f("anrede", "Anrede")}
      {f("titel", "Titel")}
      {f("vorname", "Vorname")}
      {f("name", "Name")}
      {f("name1", "Name1")}
      {f("name2", "Name2")}
      {f("zuhaenden", "z. H.")}
      {f("strasse", "Straße")}
      <div className="plzort">
        <label htmlFor={id}>LKZ / PLZ / Ort</label>
        <TextEingabe id={id} label="LKZ" wert={a.lkz} onWert={(s) => m.setAdr(art, { lkz: s })} lesen={m.lesen} />
        <TextEingabe label="PLZ" wert={a.plz} onWert={(s) => m.setAdr(art, { plz: s })} lesen={m.lesen} />
        <TextEingabe label="Ort" wert={a.ort} onWert={(s) => m.setAdr(art, { ort: s })} lesen={m.lesen} />
      </div>
    </>
  );
}
