"use client";
// Bausteine der Neuansicht. Styles: src/app/neu/neu.css (Klassen .k-*, nur unter .neu wirksam).
// Doku mit allen Props: docs/design-system.md
import Link from "next/link";
import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { formatZahl, parseZahl } from "@/lib/preis";

function kl(...teile: (string | false | null | undefined)[]): string {
  return teile.filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ Knopf
export type KnopfArt = "primaer" | "sekundaer" | "still" | "gefahr";
type KnopfProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  art?: KnopfArt;
  klein?: boolean;
  /** Mit `href` wird der Knopf zum Link (gleiche Optik). */
  href?: string;
};

export function Knopf({ art = "sekundaer", klein, href, className, children, type, ...rest }: KnopfProps) {
  const klasse = kl("k-knopf", `k-knopf-${art}`, klein && "k-knopf-klein", className);
  if (href) {
    return (
      <Link href={href} className={klasse}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={klasse} {...rest}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Feld
type FeldRahmenProps = { label: ReactNode; htmlFor: string; fehler?: string | null; hinweis?: string | null; className?: string; children: ReactNode; labelVersteckt?: boolean };

/** Rahmen aus Label, Eingabe, Hinweis- und Fehlertext. Für eigene Eingaben; sonst `Feld` benutzen. */
export function FeldRahmen({ label, htmlFor, fehler, hinweis, className, children, labelVersteckt }: FeldRahmenProps) {
  return (
    <div className={kl("k-feld", className)}>
      <label htmlFor={htmlFor} className={labelVersteckt ? "sr-only" : "k-label"}>
        {label}
      </label>
      {children}
      {hinweis && !fehler ? (
        <span id={`${htmlFor}-hinweis`} className="k-feldhinweis">
          {hinweis}
        </span>
      ) : null}
      {fehler ? (
        <span id={`${htmlFor}-fehler`} className="k-feldfehler" role="alert">
          {fehler}
        </span>
      ) : null}
    </div>
  );
}

type FeldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  label: ReactNode;
  /** Gesteuerter Wert; `null` wird als leer gezeigt. Ohne `wert` ist das Feld ungesteuert (`defaultValue`, `name`). */
  wert?: string | null;
  /** Liefert den Text; leer = `null`. */
  onWert?: (wert: string | null) => void;
  fehler?: string | null;
  hinweis?: string | null;
  /** Vorschläge (frei überschreibbar). */
  vorschlaege?: string[];
  labelVersteckt?: boolean;
};

export function Feld({ label, wert, onWert, fehler, hinweis, vorschlaege, labelVersteckt, className, id, ...rest }: FeldProps) {
  const eigeneId = useId();
  const feldId = id ?? eigeneId;
  const listenId = vorschlaege?.length ? `${feldId}-liste` : undefined;
  const gesteuert = wert !== undefined ? { value: wert ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onWert?.(e.target.value === "" ? null : e.target.value) } : {};
  return (
    <FeldRahmen label={label} htmlFor={feldId} fehler={fehler} hinweis={hinweis} className={className} labelVersteckt={labelVersteckt}>
      <input
        id={feldId}
        className="k-eingabe"
        list={listenId}
        aria-invalid={fehler ? true : undefined}
        aria-describedby={fehler ? `${feldId}-fehler` : hinweis ? `${feldId}-hinweis` : undefined}
        autoComplete="off"
        {...gesteuert}
        {...rest}
      />
      {listenId ? (
        <datalist id={listenId}>
          {vorschlaege!.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      ) : null}
    </FeldRahmen>
  );
}

// ------------------------------------------------------------------ Zahlfeld
type ZahlEingabeProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  wert: number | null | undefined;
  onWert: (wert: number | null) => void;
  /** Feste Nachkommastellen in der Anzeige (z. B. 2 für Preise). Ohne Angabe: bis zu 3, nur wenn nötig. */
  nachkomma?: number;
};

function zeigeZahl(x: number | null | undefined, nachkomma?: number): string {
  if (x == null || !Number.isFinite(x)) return "";
  if (nachkomma == null) return formatZahl(x);
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: nachkomma, maximumFractionDigits: nachkomma }).format(x);
}

/**
 * Nackte Zahleneingabe ohne Label (für Tabellenzellen; dort `aria-label` setzen).
 * Beim Tippen bleibt der Rohtext stehen, der Wert wird laufend mit `parseZahl` gemeldet,
 * beim Verlassen wird deutsch formatiert.
 */
export function ZahlEingabe({ wert, onWert, nachkomma, className, onFocus, onBlur, ...rest }: ZahlEingabeProps) {
  const [roh, setRoh] = useState<string | null>(null);
  const ungueltig = roh != null && roh.trim() !== "" && parseZahl(roh) == null;
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={kl("k-eingabe k-eingabe-zahl", className)}
      value={roh ?? zeigeZahl(wert, nachkomma)}
      aria-invalid={ungueltig ? true : undefined}
      title={ungueltig ? "Bitte eine Zahl eingeben, z. B. 1.225,50" : undefined}
      onFocus={(e) => {
        setRoh(zeigeZahl(wert, nachkomma));
        e.target.select();
        onFocus?.(e);
      }}
      onChange={(e) => {
        setRoh(e.target.value);
        const n = parseZahl(e.target.value);
        if (n != null || e.target.value.trim() === "") onWert(n);
      }}
      onBlur={(e) => {
        if (roh != null) {
          const n = parseZahl(roh);
          if (n !== (wert ?? null) && (n != null || roh.trim() === "")) onWert(n);
        }
        setRoh(null);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
}

type ZahlfeldProps = ZahlEingabeProps & { label: ReactNode; einheit?: string; fehler?: string | null; hinweis?: string | null; labelVersteckt?: boolean };

/** Deutsche Zahleneingabe mit Label, rechtsbündig. `einheit` (z. B. "€", "km", "%") steht im Feld rechts. */
export function Zahlfeld({ label, einheit, fehler, hinweis, labelVersteckt, className, id, ...rest }: ZahlfeldProps) {
  const eigeneId = useId();
  const feldId = id ?? eigeneId;
  const eingabe = <ZahlEingabe id={feldId} aria-describedby={fehler ? `${feldId}-fehler` : hinweis ? `${feldId}-hinweis` : undefined} {...rest} />;
  return (
    <FeldRahmen label={label} htmlFor={feldId} fehler={fehler} hinweis={hinweis} className={className} labelVersteckt={labelVersteckt}>
      {einheit ? (
        <span className="k-mit-einheit">
          {eingabe}
          <span className="k-einheit" aria-hidden="true">
            {einheit}
          </span>
        </span>
      ) : (
        eingabe
      )}
    </FeldRahmen>
  );
}

// ------------------------------------------------------------------ Textbereich
type TextbereichProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  label: ReactNode;
  wert?: string | null;
  onWert?: (wert: string | null) => void;
  fehler?: string | null;
  hinweis?: string | null;
  labelVersteckt?: boolean;
};

export function Textbereich({ label, wert, onWert, fehler, hinweis, labelVersteckt, className, id, rows = 4, ...rest }: TextbereichProps) {
  const eigeneId = useId();
  const feldId = id ?? eigeneId;
  const gesteuert = wert !== undefined ? { value: wert ?? "", onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onWert?.(e.target.value === "" ? null : e.target.value) } : {};
  return (
    <FeldRahmen label={label} htmlFor={feldId} fehler={fehler} hinweis={hinweis} className={className} labelVersteckt={labelVersteckt}>
      <textarea id={feldId} className="k-eingabe" rows={rows} aria-invalid={fehler ? true : undefined} {...gesteuert} {...rest} />
    </FeldRahmen>
  );
}

// ------------------------------------------------------------------ Auswahl
export type AuswahlOption = string | { wert: string; text: string };
type AuswahlProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  label: ReactNode;
  optionen: AuswahlOption[];
  wert?: string | null;
  onWert?: (wert: string | null) => void;
  /** Text der leeren Option; ohne Angabe gibt es keine leere Option. */
  leer?: string;
  fehler?: string | null;
  hinweis?: string | null;
  labelVersteckt?: boolean;
};

/** Feste Auswahlliste (select). Für frei überschreibbare Vorschläge `Feld` mit `vorschlaege` nehmen. */
export function Auswahl({ label, optionen, wert, onWert, leer, fehler, hinweis, labelVersteckt, className, id, ...rest }: AuswahlProps) {
  const eigeneId = useId();
  const feldId = id ?? eigeneId;
  const liste = optionen.map((o) => (typeof o === "string" ? { wert: o, text: o } : o));
  // Ein gespeicherter Wert, der nicht (mehr) in der Liste steht, bleibt wählbar.
  if (wert && !liste.some((o) => o.wert === wert)) liste.unshift({ wert, text: wert });
  const gesteuert = wert !== undefined ? { value: wert ?? "", onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onWert?.(e.target.value === "" ? null : e.target.value) } : {};
  return (
    <FeldRahmen label={label} htmlFor={feldId} fehler={fehler} hinweis={hinweis} className={className} labelVersteckt={labelVersteckt}>
      <select id={feldId} className="k-eingabe" aria-invalid={fehler ? true : undefined} {...gesteuert} {...rest}>
        {leer !== undefined ? <option value="">{leer}</option> : null}
        {liste.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.text}
          </option>
        ))}
      </select>
    </FeldRahmen>
  );
}

// ------------------------------------------------------------------ Schalter (Checkbox)
type SchalterProps = Omit<InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "type"> & {
  label: ReactNode;
  an: boolean | null | undefined;
  onAn?: (an: boolean) => void;
};

export function Schalter({ label, an, onAn, className, ...rest }: SchalterProps) {
  return (
    <label className={kl("k-schalter", className)}>
      <input type="checkbox" checked={!!an} onChange={(e) => onAn?.(e.target.checked)} {...rest} />
      <span>{label}</span>
    </label>
  );
}

// ------------------------------------------------------------------ Karte
type KarteProps = {
  titel?: ReactNode;
  /** Knöpfe o. Ä. rechts im Kartenkopf. */
  aktionen?: ReactNode;
  /** Ohne Innenabstand (z. B. für Tabellen bis zum Rand). */
  randlos?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
};

export function Karte({ titel, aktionen, randlos, id, className, children }: KarteProps) {
  return (
    <section id={id} className={kl("k-karte", className)}>
      {titel || aktionen ? (
        <header className="k-karte-kopf">
          {titel ? <h2 className="k-karte-titel">{titel}</h2> : <span />}
          {aktionen ? <div className="flex flex-wrap items-center gap-2">{aktionen}</div> : null}
        </header>
      ) : null}
      <div className={randlos ? undefined : "k-karte-inhalt"}>{children}</div>
    </section>
  );
}

// ------------------------------------------------------------------ Tabelle
export type Spalte = string | { titel: ReactNode; rechts?: boolean; breite?: string; versteckt?: boolean };
type TabelleProps = {
  spalten: Spalte[];
  /** Zeilen als <tr>. Zellen mit Zahlen: className="k-rechts". */
  children: ReactNode;
  /** Fußzeile(n) als <tr>. */
  fuss?: ReactNode;
  /** Beschreibung für Screenreader. */
  beschriftung?: string;
  /** Dichte Variante für Eingabezeilen. */
  eingabe?: boolean;
  className?: string;
};

export function Tabelle({ spalten, children, fuss, beschriftung, eingabe, className }: TabelleProps) {
  return (
    <div className={kl("k-tabelle-rahmen", className)}>
      <table className={kl("k-tabelle", eingabe && "k-tabelle-eingabe")}>
        {beschriftung ? <caption className="sr-only">{beschriftung}</caption> : null}
        <thead>
          <tr>
            {spalten.map((s, i) => {
              const sp = typeof s === "string" ? { titel: s } : s;
              return (
                <th key={i} scope="col" className={sp.rechts ? "k-rechts" : undefined} style={sp.breite ? { width: sp.breite } : undefined}>
                  {sp.versteckt ? <span className="sr-only">{sp.titel}</span> : sp.titel}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
        {fuss ? <tfoot>{fuss}</tfoot> : null}
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ Abzeichen
export type AbzeichenArt = "neutral" | "erfolg" | "warnung" | "fehler" | "info" | "marke";

/** Kleines Etikett, z. B. für den Status. Statuskürzel werden unverändert gezeigt. */
export function Abzeichen({ art = "neutral", children, title }: { art?: AbzeichenArt; children: ReactNode; title?: string }) {
  return (
    <span className={kl("k-abzeichen", art !== "neutral" && `k-abzeichen-${art}`)} title={title}>
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ Seitenkopf
export function Seitenkopf({ titel, unter, aktionen }: { titel: ReactNode; unter?: ReactNode; aktionen?: ReactNode }) {
  return (
    <div className="k-seitenkopf">
      <div className="min-w-0">
        <h1>{titel}</h1>
        {unter ? <p className="k-seitenkopf-unter">{unter}</p> : null}
      </div>
      {aktionen ? <div className="flex flex-wrap items-center gap-2">{aktionen}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------------ Leerzustand
export function Leerzustand({ titel, text, aktion }: { titel: ReactNode; text?: ReactNode; aktion?: ReactNode }) {
  return (
    <div className="k-leer">
      <p className="k-leer-titel">{titel}</p>
      {text ? <p>{text}</p> : null}
      {aktion ? <div className="mt-2">{aktion}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------------ Blättern
type BlaetternProps = {
  seite: number;
  seiten: number;
  gesamt: number;
  /** Pfad der Liste, z. B. "/neu/angebote". */
  pfad: string;
  /** Übrige GET-Parameter (Suche, Filter); leere Werte fallen weg. */
  parameter?: Record<string, string | number | null | undefined>;
  /** Wort für die Trefferzahl, z. B. "Angebote". */
  einheit?: string;
};

export function Blaettern({ seite, seiten, gesamt, pfad, parameter = {}, einheit = "Einträge" }: BlaetternProps) {
  const ziel = (s: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(parameter)) if (v != null && v !== "") p.set(k, String(v));
    if (s > 1) p.set("seite", String(s));
    const q = p.toString();
    return q ? `${pfad}?${q}` : pfad;
  };
  const zahl = new Intl.NumberFormat("de-DE");
  return (
    <nav className="k-blaettern" aria-label="Seiten">
      <span>
        {zahl.format(gesamt)} {einheit}
        {seiten > 1 ? ` · Seite ${zahl.format(seite)} von ${zahl.format(seiten)}` : ""}
      </span>
      {seiten > 1 ? (
        <span className="flex items-center gap-2">
          {seite > 1 ? (
            <Knopf klein href={ziel(seite - 1)}>
              ← Zurück
            </Knopf>
          ) : (
            <Knopf klein disabled>
              ← Zurück
            </Knopf>
          )}
          {seite < seiten ? (
            <Knopf klein href={ziel(seite + 1)}>
              Weiter →
            </Knopf>
          ) : (
            <Knopf klein disabled>
              Weiter →
            </Knopf>
          )}
        </span>
      ) : null}
    </nav>
  );
}

// ------------------------------------------------------------------ Hinweis
export type HinweisArt = "info" | "erfolg" | "warnung" | "fehler";

/** Meldungskasten. `fehler` und `warnung` werden Screenreadern sofort angesagt. */
export function Hinweis({ art = "info", titel, children, className }: { art?: HinweisArt; titel?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={kl("k-hinweis", art !== "info" && `k-hinweis-${art}`, className)} role={art === "fehler" || art === "warnung" ? "alert" : "status"}>
      <div className="min-w-0">
        {titel ? <p className="k-hinweis-titel">{titel}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
