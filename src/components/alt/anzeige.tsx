import Link from "next/link";
import { useId } from "react";
import { abfrage } from "./hilfen";

/** Nur-Lese-Feld im Stil der Maske. */
export function Anzeige({ label, wert, zahl, kurz }: { label: string; wert: string | number | null | undefined; zahl?: boolean; kurz?: boolean }) {
  const id = useId();
  return (
    <div className={"feld" + (kurz ? " kurz" : "")}>
      <label htmlFor={id}>{label}</label>
      <input id={id} readOnly value={wert ?? ""} className={zahl ? "zahl" : undefined} />
    </div>
  );
}

export function AnzeigeText({ label, wert, zeilen = 4 }: { label: string; wert: string | null | undefined; zeilen?: number }) {
  const id = useId();
  return (
    <div className="feld oben">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} readOnly rows={zeilen} value={wert ?? ""} />
    </div>
  );
}

export function Gruppe({ titel, children, className }: { titel: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={"gruppe" + (className ? " " + className : "")}>
      <legend>{titel}</legend>
      {children}
    </fieldset>
  );
}

/** Blättern in Listen; behält die übrigen GET-Parameter. */
export function Blaettern({ basis, parameter, seite, seiten, gesamt }: { basis: string; parameter: Record<string, string | number | null | undefined>; seite: number; seiten: number; gesamt: number }) {
  const ziel = (s: number) => basis + abfrage({ ...parameter, seite: s > 1 ? s : null });
  const knopf = (s: number, text: string, aktiv: boolean) =>
    aktiv ? <Link className="knopf" href={ziel(s)}>{text}</Link> : <button type="button" className="knopf" disabled>{text}</button>;
  return (
    <div className="blaettern nicht-drucken">
      {knopf(1, "|◀", seite > 1)}
      {knopf(seite - 1, "◀ Zurück", seite > 1)}
      <span>Seite {seite} von {seiten} · {gesamt} Datensätze</span>
      {knopf(seite + 1, "Weiter ▶", seite < seiten)}
      {knopf(seiten, "▶|", seite < seiten)}
    </div>
  );
}
