import type { ReactNode } from "react";

/** Nur-Lese-Felder als Beschriftung/Wert-Paare; leere Werte fallen weg. */
export function Datenliste({ eintraege }: { eintraege: [string, ReactNode][] }) {
  const sichtbar = eintraege.filter(([, w]) => w != null && w !== "" && w !== false);
  if (sichtbar.length === 0) return <p className="k-leise">Keine Angaben.</p>;
  return (
    <dl className="grid gap-x-4 gap-y-1.5" style={{ gridTemplateColumns: "minmax(7rem, max-content) minmax(0, 1fr)" }}>
      {sichtbar.map(([l, w]) => (
        <div key={l} className="contents">
          <dt className="k-leise">{l}</dt>
          <dd className="min-w-0 break-words">{w}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Anschrift in Briefform aus den üblichen Adressfeldern. */
export function Anschrift({ a }: { a: { anrede?: string | null; titel?: string | null; vorname?: string | null; name?: string | null; name1?: string | null; name2?: string | null; zuhaenden?: string | null; strasse?: string | null; lkz?: string | null; plz?: string | null; ort?: string | null } }) {
  const zeilen = [
    a.name1,
    a.name2,
    [a.anrede, a.titel, a.vorname, a.name].filter(Boolean).join(" "),
    a.zuhaenden ? `z. H. ${a.zuhaenden}` : null,
    a.strasse,
    [a.lkz && a.lkz !== "D" ? a.lkz : null, a.plz, a.ort].filter(Boolean).join(" "),
  ].filter(Boolean);
  if (zeilen.length === 0) return <p className="k-leise">Keine Anschrift hinterlegt.</p>;
  return (
    <address className="not-italic leading-relaxed">
      {zeilen.map((z, i) => (
        <div key={i}>{z}</div>
      ))}
    </address>
  );
}
