"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { neuesAngebot } from "@/lib/aktionen";
import { abmelden } from "@/app/login/aktionen";

export type Nachbarn = { erster: number | null; zurueck: number | null; vor: number | null; letzter: number | null };

function NavKnopf({ ziel, aktuell, zeichen, text }: { ziel: number | null | undefined; aktuell?: number; zeichen: string; text: string }) {
  if (ziel == null || ziel === aktuell) return <button type="button" className="knopf" disabled title={text} aria-label={text}>{zeichen}</button>;
  return <Link className="knopf" prefetch={false} href={`/alt/angebote/${ziel}`} title={text} aria-label={text}>{zeichen}</Link>;
}

/**
 * Symbolleiste der Altansicht. Auf Listen sind die Datensatz-Knöpfe ausgegraut;
 * die Angebotsmaske übergibt Navigation und die Aktionen Speichern/Bearbeiten/Löschen.
 */
export function Symbolleiste(p: {
  nachbarn?: Nachbarn;
  aktuell?: number;
  sucheHref?: string;
  onSpeichern?: () => void;
  speichernAktiv?: boolean;
  onBearbeiten?: () => void;
  inBearbeitung?: boolean;
  bearbeitenText?: string;
  bearbeitenAus?: boolean;
  /** „Fertig“: speichern und Bearbeitung beenden (nur im Bearbeitungsmodus aktiv). */
  onFertig?: () => void;
  onLoeschen?: () => void;
  loeschenHinweis?: string;
  darfWeg?: () => boolean;
  meldung?: { art: "ok" | "fehler"; text: string } | null;
}) {
  const router = useRouter();
  const [laeuft, start] = useTransition();
  const [fehler, setFehler] = useState("");
  const neu = () => {
    if (p.darfWeg && !p.darfWeg()) return;
    setFehler("");
    start(async () => {
      const r = await neuesAngebot();
      if (r.ok) router.push(`/alt/angebote/${r.daten.id}?neu=1`);
      else setFehler(r.fehler);
    });
  };
  const meldung = fehler ? { art: "fehler" as const, text: fehler } : p.meldung;
  return (
    <div className="leiste" role="toolbar" aria-label="Symbolleiste">
      <NavKnopf ziel={p.nachbarn?.erster} aktuell={p.aktuell} zeichen="|◀" text="Erster Datensatz" />
      <NavKnopf ziel={p.nachbarn?.zurueck} aktuell={p.aktuell} zeichen="◀" text="Datensatz zurück" />
      <NavKnopf ziel={p.nachbarn?.vor} aktuell={p.aktuell} zeichen="▶" text="Datensatz vor" />
      <NavKnopf ziel={p.nachbarn?.letzter} aktuell={p.aktuell} zeichen="▶|" text="Letzter Datensatz" />
      <span className="trenn" />
      <button type="button" className="knopf" onClick={() => {
        // Angebot oder Rechnung: eigene Druckansicht öffnen, sonst die Seite drucken.
        const m = /^\/alt\/(angebote|rechnungen)\/(\d+)/.exec(window.location.pathname);
        if (m) window.open(`/druck/${m[1] === "angebote" ? "angebot" : "rechnung"}/${m[2]}`, "_blank", "noopener");
        else window.print();
      }}>Drucken</button>
      <Link className="knopf" href={p.sucheHref ?? "/alt/angebote"}>Suche</Link>
      <span className="trenn" />
      <button type="button" className="knopf" onClick={neu} disabled={laeuft}>{laeuft ? "Neu …" : "Neu"}</button>
      <button type="button" className="knopf" onClick={p.onSpeichern} disabled={!p.onSpeichern || !p.speichernAktiv}>Speichern</button>
      <button type="button" className={"knopf" + (p.inBearbeitung ? " gedrueckt" : "")} onClick={p.onBearbeiten} disabled={!p.onBearbeiten || p.bearbeitenAus} aria-pressed={p.onBearbeiten ? !!p.inBearbeitung : undefined}>{p.bearbeitenText ?? "Bearbeiten"}</button>
      <button type="button" className="knopf" onClick={p.onFertig} disabled={!p.onFertig || !p.inBearbeitung} title="Speichern und Bearbeitung beenden">Fertig</button>
      <button type="button" className="knopf" onClick={p.onLoeschen} disabled={!p.onLoeschen} title={p.onLoeschen ? undefined : p.loeschenHinweis}>Löschen</button>
      <span className="trenn" />
      <form action={abmelden}>
        <button type="submit" className="knopf" title="Abmelden" onClick={(e) => { if (p.darfWeg && !p.darfWeg()) e.preventDefault(); }}>Beenden</button>
      </form>
      {meldung && <span className={`meldung ${meldung.art}`} role={meldung.art === "fehler" ? "alert" : "status"}>{meldung.text}</span>}
    </div>
  );
}

export function Statusleiste({ datei, satz, sperre, zusatz }: { datei: string; satz?: string; sperre?: string; zusatz?: string }) {
  return (
    <div className="status" role="status">
      <span>Datendatei: {datei}</span>
      <span>{satz ?? ""}</span>
      {zusatz ? <span>{zusatz}</span> : null}
      <span>{sperre ?? "Nur lesen"}</span>
    </div>
  );
}

/** Tabellenzeile, die per Klick, Doppelklick oder Eingabetaste einen Datensatz öffnet. */
export function KlickZeile({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr className="klick" tabIndex={0} onClick={() => router.push(href)} onKeyDown={(e) => { if (e.key === "Enter") router.push(href); }}>
      {children}
    </tr>
  );
}
