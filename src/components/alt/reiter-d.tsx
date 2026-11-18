"use client";
// Reiter 11 bis 13: Umzugsgut – heute nur lesend.
import { useState } from "react";
import type { Umzugsgut } from "@/lib/angebot-typen";
import type { StammZimmerZeile } from "@/lib/db-typen";
import { formatZahl } from "@/lib/preis";
import { Anzeige, Gruppe } from "./anzeige";
import { Aus } from "./felder";

const z = (x: number | null | undefined) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const f = (x: number | null | undefined) => (x == null || x === 0 ? "" : formatZahl(x));
const HINWEIS = <p className="hinweistext">Nur lesend. Bearbeitung in der Neuansicht.</p>;

export function ReiterUmzugsgutErfassung({ gut, zimmer }: { gut: Umzugsgut[]; zimmer: StammZimmerZeile[] }) {
  const [raum, setRaum] = useState<string | null>(null);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const knoepfe = zimmer.filter((r) => r.knopf);
  const bekannt = new Set(zimmer.flatMap((r) => [r.zimmer, r.kurz].filter(Boolean) as string[]));
  const weitere = [...new Set(gut.map((g) => g.zimmer).filter((n): n is string => !!n && !bekannt.has(n)))].sort();
  const raeume: { name: string; passt: (g: Umzugsgut) => boolean }[] = [
    ...(knoepfe.length ? knoepfe : zimmer).map((r) => ({ name: r.zimmer, passt: (g: Umzugsgut) => g.zimmer === r.zimmer || (!!r.kurz && g.zimmer === r.kurz) })),
    ...weitere.map((n) => ({ name: n, passt: (g: Umzugsgut) => g.zimmer === n })),
  ];
  const aktiv = raeume.find((r) => r.name === raum);
  const liste = aktiv ? gut.filter(aktiv.passt) : gut;
  const d = gut.find((g) => g.id === gewaehlt) ?? null;
  return (
    <div>
      {HINWEIS}
      <Gruppe titel="Zimmer">
        <div className="reihe">
          {raeume.map((r) => {
            const n = gut.filter(r.passt).length;
            return <button key={r.name} type="button" className={"knopf" + (raum === r.name ? " gedrueckt" : "")} aria-pressed={raum === r.name} onClick={() => setRaum(r.name)}>{r.name}{n ? ` (${n})` : ""}</button>;
          })}
          <button type="button" className={"knopf" + (raum == null ? " gedrueckt" : "")} aria-pressed={raum == null} onClick={() => setRaum(null)}>Alle Zimmer ({gut.length})</button>
        </div>
        <div className="reihe">
          <Aus klein>A–Z</Aus><Aus klein>alle</Aus><Aus klein>PM</Aus><Aus klein>Bld</Aus><Aus klein>Txt</Aus><Aus klein>beginnt mit</Aus><Aus klein>5 Neue</Aus>
          <Aus klein>Objektumzug einschalten</Aus><Aus klein>Vorlage speichern</Aus><Aus klein>Vorlage laden</Aus><Aus klein>Liste duplizieren</Aus><Aus klein>Liste löschen</Aus>
        </div>
      </Gruppe>
      <div className="spalten s31">
        <div className="rollen">
          <table className="tab">
            <thead><tr><th className="r">Anzahl</th><th>Gegenstand</th><th className="r">RE</th><th>PM</th><th>Zimmer</th><th className="r">Demontage</th><th className="r">Montage</th><th className="r">Einpacken</th><th className="r">Auspacken</th><th className="r">Einladen</th><th className="r">Ausladen</th></tr></thead>
            <tbody>
              {liste.length === 0 && <tr><td colSpan={11}>Kein Umzugsgut erfasst.</td></tr>}
              {liste.map((g) => (
                <tr key={g.id} className={"klick" + (g.id === gewaehlt ? " gewaehlt" : "")} tabIndex={0} onClick={() => setGewaehlt(g.id)} onKeyDown={(e) => { if (e.key === "Enter") setGewaehlt(g.id); }}>
                  <td className="r">{f(g.anzahl)}</td><td>{g.gegenstand}</td><td className="r">{f(g.re)}</td><td>{g.packmittel ? "✓" : ""}</td><td>{g.zimmer}</td>
                  <td className="r">{f(g.demontage)}</td><td className="r">{f(g.montage)}</td><td className="r">{f(g.einpacken)}</td><td className="r">{f(g.auspacken)}</td><td className="r">{f(g.einladen)}</td><td className="r">{f(g.ausladen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Gruppe titel="Details">
          {d ? (
            <div style={{ ["--lb" as string]: "100px" }}>
              <Anzeige label="Beladestelle" wert={d.beladestelle} />
              <Anzeige label="Etage" wert={d.etage} />
              <Anzeige label="Zimmer" wert={d.zimmer} />
              <Anzeige label="Organisation" wert={d.organisation} />
              <Anzeige label="Mitarbeiter" wert={d.mitarbeiter} />
              <Anzeige label="Besonderes" wert={d.besonderes} />
              <Anzeige label="Gegenstand" wert={d.gegenstand} />
              <Anzeige label="Zusatz" wert={d.zusatz} />
              <Anzeige label="Entladestelle" wert={d.entladestelle} />
              <Anzeige label="Entladeetage" wert={d.entlade_etage} />
              <Anzeige label="Entladezimmer" wert={d.entlade_zimmer} />
              <Anzeige label="Anzahl" wert={f(d.anzahl)} zahl kurz />
              <Anzeige label="Raumeinheit" wert={f(d.raumeinheit ?? d.re)} zahl kurz />
            </div>
          ) : (
            <p className="hinweistext">Zeile anklicken, um die Details zu sehen.</p>
          )}
        </Gruppe>
      </div>
    </div>
  );
}

export function ReiterUmzugsgutKomplett({ gut }: { gut: Umzugsgut[] }) {
  const re = gut.reduce((s, g) => s + z(g.anzahl) * z(g.re), 0);
  return (
    <div>
      {HINWEIS}
      <div className="reihe"><Aus>leere Liste erzeugen</Aus><span>Gesamt: {formatZahl(re)} RE ≈ {formatZahl(re / 10)} m³ (Näherung RE/10)</span></div>
      <div className="rollen">
        <table className="tab">
          <thead>
            <tr>
              <th>Beladestelle</th><th>Etage</th><th>Zimmer</th><th className="r">Anzahl</th><th>Gegenstand</th><th className="r">RE</th><th>PM</th><th>Organisation</th><th className="r">Einheit</th><th>Mitarbeiter</th><th>Besonderes</th><th>Montagehinweise</th>
              <th className="r">Montage</th><th className="r">Demontage</th><th className="r">Einpacken</th><th className="r">Auspacken</th><th className="r">Einladen</th><th className="r">Ausladen</th><th>Entladestelle</th><th>-stock</th><th>-zimmer</th>
            </tr>
          </thead>
          <tbody>
            {gut.length === 0 && <tr><td colSpan={21}>Kein Umzugsgut erfasst.</td></tr>}
            {gut.map((g) => (
              <tr key={g.id}>
                <td>{g.beladestelle}</td><td>{g.etage}</td><td>{g.zimmer}</td><td className="r">{f(g.anzahl)}</td><td>{g.gegenstand}</td><td className="r">{f(g.re)}</td><td>{g.packmittel ? "✓" : ""}</td><td>{g.organisation}</td><td className="r">{f(g.raumeinheit)}</td><td>{g.mitarbeiter}</td><td>{g.besonderes}</td><td>{g.zusatz}</td>
                <td className="r">{f(g.montage)}</td><td className="r">{f(g.demontage)}</td><td className="r">{f(g.einpacken)}</td><td className="r">{f(g.auspacken)}</td><td className="r">{f(g.einladen)}</td><td className="r">{f(g.ausladen)}</td><td>{g.entladestelle}</td><td>{g.entlade_etage}</td><td>{g.entlade_zimmer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Summe = { zimmer: string; posten: number; anzahl: number; re: number; besonderes: number; pm: number; einladen: number; ausladen: number; einpacken: number; auspacken: number; montage: number; demontage: number };

export function ReiterUmzugsgutSummen({ gut }: { gut: Umzugsgut[] }) {
  const leer = (zimmer: string): Summe => ({ zimmer, posten: 0, anzahl: 0, re: 0, besonderes: 0, pm: 0, einladen: 0, ausladen: 0, einpacken: 0, auspacken: 0, montage: 0, demontage: 0 });
  const je = new Map<string, Summe>();
  const gesamt = leer("Gesamt");
  for (const g of gut) {
    const name = g.zimmer || "(ohne Zimmer)";
    const s = je.get(name) ?? leer(name);
    je.set(name, s);
    const n = z(g.anzahl) || 1;
    for (const t of [s, gesamt]) {
      t.posten += 1;
      t.anzahl += z(g.anzahl);
      t.re += z(g.anzahl) * z(g.re);
      if (g.besonderes || g.zusatz) t.besonderes += 1;
      if (g.packmittel) t.pm += z(g.anzahl);
      t.einladen += n * z(g.einladen); t.ausladen += n * z(g.ausladen);
      t.einpacken += n * z(g.einpacken); t.auspacken += n * z(g.auspacken);
      t.montage += n * z(g.montage); t.demontage += n * z(g.demontage);
    }
  }
  const zeile = (s: Summe) => (
    <>
      <td>{s.zimmer}</td><td className="r">{formatZahl(s.anzahl)}</td><td className="r">{formatZahl(s.re)}</td><td className="r">{formatZahl(s.re / 10)}</td>
      <td className="r">{f(s.besonderes)}</td><td className="r">{f(s.pm)}</td>
      <td className="r">{f(s.einladen)}</td><td className="r">{f(s.ausladen)}</td><td className="r">{f(s.einpacken)}</td><td className="r">{f(s.auspacken)}</td><td className="r">{f(s.montage)}</td><td className="r">{f(s.demontage)}</td>
    </>
  );
  return (
    <div>
      {HINWEIS}
      <div className="reihe"><Aus>Buchen in Angebot</Aus></div>
      <div className="rollen">
        <table className="tab">
          <thead>
            <tr>
              <th>Zimmer</th><th className="r">Anzahl</th><th className="r">RE-Summe</th><th className="r">CBM (Näherung RE/10)</th><th className="r">Besonderes/Zusatz</th><th className="r">Packmaterialien</th>
              <th className="r">Einladen</th><th className="r">Ausladen</th><th className="r">Einpacken</th><th className="r">Auspacken</th><th className="r">Montage</th><th className="r">Demontage</th>
            </tr>
          </thead>
          <tbody>
            {je.size === 0 && <tr><td colSpan={12}>Kein Umzugsgut erfasst.</td></tr>}
            {[...je.values()].sort((a, b) => a.zimmer.localeCompare(b.zimmer, "de")).map((s) => <tr key={s.zimmer}>{zeile(s)}</tr>)}
          </tbody>
          <tfoot><tr>{zeile(gesamt)}</tr></tfoot>
        </table>
      </div>
      <p className="hinweistext">RE-Summe = Σ Anzahl × RE. CBM ist eine Näherung (RE/10); MWM wird heute nicht berechnet. Zeiten = Anzahl × Zeit je Gegenstand (Einheit wie in den Stammdaten).</p>
    </div>
  );
}
