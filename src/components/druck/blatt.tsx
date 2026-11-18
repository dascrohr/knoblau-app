import type { ReactNode } from "react";
import { FIRMA } from "@/lib/firma";

type Empfaenger = { anrede?: string | null; titel?: string | null; vorname?: string | null; name?: string | null; name1?: string | null; name2?: string | null; zuhaenden?: string | null; strasse?: string | null; lkz?: string | null; plz?: string | null; ort?: string | null };

export function anschriftZeilen(a: Empfaenger | null | undefined): string[] {
  if (!a) return [];
  const person = [a.titel, a.vorname, a.name].filter(Boolean).join(" ");
  return [a.name1, a.name2, a.anrede && person ? a.anrede : null, person || null, a.zuhaenden ? `z. H. ${a.zuhaenden}` : null, a.strasse, [a.lkz && a.lkz !== "D" ? a.lkz : null, a.plz, a.ort].filter(Boolean).join(" ") || null].filter((z): z is string => Boolean(z && z.trim()));
}

/** A4-Blatt mit Briefkopf, Anschriftfeld, Infoblock rechts und Fußzeile. Eigenes Layout, keine Vorlage der Altsoftware. */
export function Blatt({ empfaenger, info, children }: { empfaenger: Empfaenger | null | undefined; info: [string, ReactNode][]; children: ReactNode }) {
  const zeilen = anschriftZeilen(empfaenger);
  return (
    <article className="d-blatt">
      <header className="d-kopf">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FIRMA.logo} alt={FIRMA.name} className="d-logo" />
        <div className="d-kopf-firma">
          <strong>{FIRMA.name}</strong>
          <span>{FIRMA.strasse} · {FIRMA.plzOrt}</span>
          <span>Telefon {FIRMA.telefon}</span>
          <span>{FIRMA.email}</span>
        </div>
      </header>
      <div className="d-adresszeile">
        <div className="d-anschrift">
          <div className="d-absender">{FIRMA.name} · {FIRMA.strasse} · {FIRMA.plzOrt}</div>
          {zeilen.length ? zeilen.map((z, i) => <div key={i}>{z}</div>) : <div className="d-leer">(keine Anschrift eingetragen)</div>}
        </div>
        <dl className="d-info">
          {info.filter(([, w]) => w != null && w !== "").map(([k, w]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{w}</dd>
            </div>
          ))}
        </dl>
      </div>
      <main className="d-inhalt">{children}</main>
      <footer className="d-fuss">
        <span>{FIRMA.name} · Inhaber {FIRMA.inhaber} · {FIRMA.strasse} · {FIRMA.plzOrt}</span>
        <span>Telefon {FIRMA.telefon} · Telefax {FIRMA.telefax} · {FIRMA.email} · {FIRMA.web}</span>
        <span>
          USt-IdNr. {FIRMA.ustId}
          {FIRMA.steuernummer ? ` · Steuernummer ${FIRMA.steuernummer}` : ""}
          {FIRMA.bankzeile ? ` · ${FIRMA.bankzeile}` : ""}
        </span>
      </footer>
    </article>
  );
}

/** Mehrzeiliger Freitext aus der Datenbank, Zeilenumbrüche bleiben erhalten. */
export function Freitext({ titel, text }: { titel?: string; text: string | null | undefined }) {
  if (!text || !text.trim()) return null;
  return (
    <section className="d-text">
      {titel ? <h3>{titel}</h3> : null}
      <p>{text.trim()}</p>
    </section>
  );
}
