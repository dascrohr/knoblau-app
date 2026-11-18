import Link from "next/link";
import type { ReactNode } from "react";
import type { Firma } from "@/lib/firma";

type Empfaenger = { anrede?: string | null; titel?: string | null; vorname?: string | null; name?: string | null; name1?: string | null; name2?: string | null; zuhaenden?: string | null; strasse?: string | null; lkz?: string | null; plz?: string | null; ort?: string | null };

export function anschriftZeilen(a: Empfaenger | null | undefined): string[] {
  if (!a) return [];
  const person = [a.titel, a.vorname, a.name].filter(Boolean).join(" ");
  return [a.name1, a.name2, a.anrede && person ? a.anrede : null, person || null, a.zuhaenden ? `z. H. ${a.zuhaenden}` : null, a.strasse, [a.lkz && a.lkz !== "D" ? a.lkz : null, a.plz, a.ort].filter(Boolean).join(" ") || null].filter((z): z is string => Boolean(z && z.trim()));
}

const gefuellt = (s: string | null | undefined): s is string => Boolean(s && s.trim());
/** Gefüllte Teile mit " · " verbinden; leere Angaben fallen samt Trennzeichen weg. */
function verbinde(...teile: (string | null | undefined | false)[]): string {
  return teile.filter((t): t is string => typeof t === "string" && gefuellt(t)).map((t) => t.trim()).join(" · ");
}
const mit = (vorsatz: string, wert: string) => (gefuellt(wert) ? `${vorsatz} ${wert.trim()}` : null);

/** Die drei Zeilen der Fußzeile; leere Zeilen entfallen. */
export function fusszeilen(f: Firma): string[] {
  return [
    verbinde(f.name, mit("Inhaber", f.inhaber), f.strasse, f.plz_ort),
    verbinde(mit("Telefon", f.telefon), mit("Telefax", f.telefax), f.email, f.web),
    verbinde(mit("USt-IdNr.", f.ust_id), mit("Steuernummer", f.steuernummer), f.fusszeile_zusatz),
  ].filter(Boolean);
}

/** A4-Blatt mit Briefkopf, Anschriftfeld (DIN-lang-Fenster), Infoblock rechts und Fußzeile. Eigenes Layout, keine Vorlage der Altsoftware. */
export function Blatt({ firma, empfaenger, info, children }: { firma: Firma; empfaenger: Empfaenger | null | undefined; info: [string, ReactNode][]; children: ReactNode }) {
  const zeilen = anschriftZeilen(empfaenger);
  return (
    <article className="d-blatt">
      <header className="d-kopf">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {firma.logo ? <img src={firma.logo} alt={firma.name} className="d-logo" /> : <span />}
        <div className="d-kopf-firma">
          <strong>{firma.name}</strong>
          <span>{verbinde(firma.strasse, firma.plz_ort)}</span>
          {gefuellt(firma.telefon) ? <span>Telefon {firma.telefon}</span> : null}
          {gefuellt(firma.email) ? <span>{firma.email}</span> : null}
        </div>
      </header>
      <div className="d-adresszeile">
        <div className="d-anschrift">
          <div className="d-absender">{verbinde(firma.name, firma.strasse, firma.plz_ort)}</div>
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
        {fusszeilen(firma).map((z, i) => (
          <span key={i}>{z}</span>
        ))}
      </footer>
    </article>
  );
}

/** Überschrift des Blatts; bei Entwürfen mit mitgedrucktem Vermerk rechts daneben. */
export function Titel({ children, entwurf }: { children: ReactNode; entwurf?: boolean }) {
  return (
    <div className="d-titel">
      <h1>{children}</h1>
      {entwurf ? <span className="d-entwurf-vermerk">ENTWURF</span> : null}
    </div>
  );
}

/** Mehrzeiliger Freitext aus der Datenbank, Zeilenumbrüche bleiben erhalten. `lang` = darf über Seiten laufen. */
export function Freitext({ titel, text, lang }: { titel?: string; text: string | null | undefined; lang?: boolean }) {
  if (!text || !text.trim()) return null;
  return (
    <section className={lang ? "d-text d-text-lang" : "d-text"}>
      {titel ? <h3>{titel}</h3> : null}
      <p>{text.trim()}</p>
    </section>
  );
}

/** Gelber Bildschirmhinweis (wird nicht gedruckt): nennt fehlende Firmenangaben, sonst nur der kurze Standardsatz. */
export function DruckHinweis({ firma }: { firma: Firma }) {
  const fehlt = [!gefuellt(firma.steuernummer) ? "Steuernummer" : null, !gefuellt(firma.fusszeile_zusatz) ? "Zusatzzeile der Fußzeile (z. B. Bankverbindung)" : null].filter(Boolean);
  return (
    <p className="d-hinweis">
      {fehlt.length ? (
        <>
          <strong>In der Fußzeile {fehlt.length > 1 ? "fehlen" : "fehlt"} noch: {fehlt.join(" und ")}.</strong> <Link href="/neu/stammdaten/firma">Firmenangaben pflegen</Link>.{" "}
        </>
      ) : null}
      Gezeigt wird der zuletzt gespeicherte Stand.
    </p>
  );
}
