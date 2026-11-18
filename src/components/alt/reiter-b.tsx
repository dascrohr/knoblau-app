"use client";
// Reiter 3 bis 6: Transport/Maut, Freie Leistung, Nebenleistung, Packmaterial.
import { useId, useState } from "react";
import { BEREICH_ZEILEN, leerePosition, type Position } from "@/lib/angebot-typen";
import type { StammLeistungenZeile, StammPackmaterialZeile } from "@/lib/db-typen";
import { berechnePreis, formatBetrag, zeilenSumme, type Bereich } from "@/lib/preis";
import { AHaken, AMemo, AText, AZahl, Aus, TextEingabe, Zahl, ZahlEingabe, useMaske } from "./felder";
import { Gruppe } from "./anzeige";
import { BausteinKnopf } from "./dialoge";

type StammZeile = { id: number; suchbegriff: string | null; text: string; beschreibung: string | null; einheiten: number | null; einzelpreis: number | null; prozent: number | null; anzahl?: number | null; art?: string | null };

/** Einfacher Auswahldialog „Suche in Stammdaten“. */
function StammDialog({ titel, liste, onWahl, onZu }: { titel: string; liste: StammZeile[]; onWahl: (s: StammZeile) => void; onZu: () => void }) {
  const [q, setQ] = useState("");
  const id = useId();
  const t = q.trim().toLowerCase();
  const treffer = t ? liste.filter((s) => `${s.suchbegriff ?? ""} ${s.text}`.toLowerCase().includes(t)) : liste;
  return (
    <div className="schleier" onClick={onZu} onKeyDown={(e) => { if (e.key === "Escape") onZu(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={titel} onClick={(e) => e.stopPropagation()}>
        <div className="titel"><span>{titel}</span><button type="button" className="knopf klein" onClick={onZu} aria-label="Schließen">✕</button></div>
        <div className="koerper">
          <div className="suchzeile">
            <label htmlFor={id}>Suchbegriff</label>
            <input id={id} type="text" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            <span>{treffer.length} Einträge</span>
          </div>
          {liste.length === 0 ? (
            <p className="hinweistext">Keine Stammdaten vorhanden. Pflege unter Stammdaten → Datenbestände pflegen.</p>
          ) : (
            <table className="tab">
              <thead><tr><th>Suchbegriff</th><th>Text</th><th className="r">Stück/Std.</th><th className="r">Einzelpreis</th><th /></tr></thead>
              <tbody>
                {treffer.map((s) => (
                  <tr key={s.id} className="klick" onDoubleClick={() => onWahl(s)}>
                    <td>{s.suchbegriff}</td>
                    <td>{s.text}</td>
                    <td className="r">{s.einheiten ?? ""}</td>
                    <td className="r">{formatBetrag(s.einzelpreis)}</td>
                    <td><button type="button" className="knopf klein" onClick={() => onWahl(s)}>Übernehmen</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

type Art = "transport" | "nebenleistung" | "packmaterial";

/** Positionszeilen eines Bereichs mit festen Zeilennummern wie in der Altmaske. */
export function PositionsTabelle({ bereich, zeilen, art, stamm, stammTitel }: { bereich: Bereich; zeilen: number[]; art: Art; stamm?: StammZeile[]; stammTitel?: string }) {
  const m = useMaske();
  const [suche, setSuche] = useState<number | null>(null);
  const vorhanden = m.z.positionen.filter((p) => p.bereich === bereich);
  const pos = (zeile: number): Position => vorhanden.find((p) => p.zeile === zeile) ?? leerePosition(bereich, zeile);
  const pack = art === "packmaterial";
  const mitAnzahl = !pack || vorhanden.some((p) => p.anzahl != null);
  const summe = vorhanden.filter((p) => zeilen.includes(p.zeile)).reduce((s, p) => s + zeilenSumme(p), 0);
  const name = `${bereich} Zeile `;
  const uebernehmen = (zeile: number, s: StammZeile) => {
    m.setPos(bereich, zeile, pack
      ? { text: s.text, art: s.art ?? null, einheiten: s.einheiten ?? 1, einzelpreis: s.einzelpreis, prozent: s.prozent }
      : { text: s.text, anzahl: s.anzahl ?? 1, einheiten: s.einheiten ?? 1, einzelpreis: s.einzelpreis, prozent: s.prozent });
    setSuche(null);
  };
  return (
    <>
      <table className="pos">
        <thead>
          <tr>
            <th />
            {mitAnzahl && <th>Anzahl</th>}
            <th>{pack ? "Packmaterial" : "Text"}</th>
            <th />
            {pack && <th>Verkauf/Leihe</th>}
            <th>{art === "transport" ? "Std/Stck" : pack ? "Stück" : "Stück/Std."}</th>
            <th>Einzelpreis</th>
            <th>+/- Prozent</th>
            <th>{art === "transport" ? "Gesamtpreis" : "Summe"}</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((zeile) => {
            const p = pos(zeile);
            const set = (patch: Partial<Position>) => m.setPos(bereich, zeile, patch);
            return (
              <tr key={zeile}>
                <td className="nr">{zeile}</td>
                {mitAnzahl && <td className="w-k"><ZahlEingabe label={name + zeile + " Anzahl"} wert={p.anzahl} onWert={(n) => set({ anzahl: n })} lesen={m.lesen} /></td>}
                <td><TextEingabe label={name + zeile + " Text"} wert={p.text} onWert={(s) => set({ text: s })} lesen={m.lesen} /></td>
                <td className="w-s">
                  {stamm ? (
                    <button type="button" className="knopf klein" disabled={m.lesen} title="Suche in Stammdaten" aria-label={`Suche in Stammdaten, Zeile ${zeile}`} onClick={() => setSuche(zeile)}>…</button>
                  ) : (
                    <button type="button" className="knopf klein" disabled title="Suche in Stammdaten – heute nicht umgesetzt" aria-label="Suche in Stammdaten">…</button>
                  )}
                </td>
                {pack && <td className="w-b"><TextEingabe label={name + zeile + " Verkauf/Leihe"} wert={p.art} onWert={(s) => set({ art: s })} lesen={m.lesen} liste={["Verkauf", "Leihe"]} /></td>}
                <td className="w-k"><ZahlEingabe label={name + zeile + " Stück"} wert={p.einheiten} onWert={(n) => set({ einheiten: n })} lesen={m.lesen} /></td>
                <td className="w-z"><ZahlEingabe label={name + zeile + " Einzelpreis"} wert={p.einzelpreis} onWert={(n) => set({ einzelpreis: n })} lesen={m.lesen} betrag /></td>
                <td className="w-k"><ZahlEingabe label={name + zeile + " Prozent"} wert={p.prozent} onWert={(n) => set({ prozent: n })} lesen={m.lesen} /></td>
                <td className="w-b"><ZahlEingabe label={name + zeile + " Summe"} wert={p.einzelpreis == null ? null : zeilenSumme(p)} betrag berechnet /></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={(mitAnzahl ? 6 : 5) + (pack ? 1 : 0)} style={{ textAlign: "right" }}>Summe</td>
            <td className="w-b"><ZahlEingabe label={`Summe ${bereich}`} wert={summe} betrag berechnet /></td>
          </tr>
        </tfoot>
      </table>
      {suche != null && stamm && !m.lesen && <StammDialog titel={stammTitel ?? "Suche in Stammdaten"} liste={stamm} onWahl={(s) => uebernehmen(suche, s)} onZu={() => setSuche(null)} />}
    </>
  );
}

export function ReiterTransport() {
  const m = useMaske();
  const a = m.z.angebot;
  const mautZeilen = m.z.positionen.filter((p) => p.bereich === "maut").map((p) => p.zeile).sort((x, y) => x - y);
  const rechneMaut = () => m.setA({ maut_gesamt: zeilenSumme({ anzahl: a.maut_anzahl, einheiten: a.maut_einheiten, einzelpreis: a.maut_einzelpreis }) });
  return (
    <div>
      <div className="reihe" style={{ ["--lb" as string]: "110px" }}>
        <div style={{ width: 220 }}><AZahl spalte="km" label="Entfernung in km" /></div>
        <Aus>AMÖ-Empfehlungs-Tarifberechnung</Aus>
        <Aus>Verbands-Tarifberechnung</Aus>
        <Aus>BW / feste CBM-Preise</Aus>
        <Aus>Suche in Stammdaten</Aus>
      </div>
      <div className="spalten s2">
        <div>
          <Gruppe titel="Beladen"><PositionsTabelle bereich="beladen" zeilen={BEREICH_ZEILEN.beladen} art="transport" /></Gruppe>
          <Gruppe titel="Befördern"><PositionsTabelle bereich="befoerdern" zeilen={BEREICH_ZEILEN.befoerdern} art="transport" /></Gruppe>
          <Gruppe titel="Entladen"><PositionsTabelle bereich="entladen" zeilen={BEREICH_ZEILEN.entladen} art="transport" /></Gruppe>
        </div>
        <Gruppe titel="Mautberechnung">
          <div className="spalten s2" style={{ ["--lb" as string]: "120px" }}>
            <div>
              <AHaken spalte="maut_in_angebot" label="Mautkosten in eigenem Abschnitt drucken" />
              <AHaken spalte="maut_doppelt" label="Autobahnkilometer doppelt rechnen" />
              <AHaken spalte="maut_anhaenger" label="mit Anhänger oder mind. 4 Achsen" />
              <AText spalte="maut_text" label="Text zum Ausdruck" />
              <AZahl spalte="maut_anzahl" label="Anzahl" />
              <AZahl spalte="maut_einheiten" label="Einheiten" />
              <AZahl spalte="maut_einzelpreis" label="Einzelpreis" betrag />
              <AZahl spalte="maut_aufschlag" label="Aufschlag %" />
              <AZahl spalte="maut_gesamt" label="Gesamt" betrag />
              <div className="reihe">
                <button type="button" className="knopf" disabled={m.lesen} onClick={rechneMaut} title="Anzahl × Einheiten × Einzelpreis">Gesamt berechnen</button>
              </div>
            </div>
            <div>
              <AZahl spalte="km" label="Gesamt-Entfernung" />
              <AZahl spalte="autobahn_km" label="davon Autobahn-km" />
              <AZahl spalte="autobahn_ct" label="Maut ct je km" />
              <AHaken spalte="autobahn_doppelt" label="Autobahn-km doppelt (Hin und zurück)" />
              <AText spalte="maut_fahrzeug" label="geplantes Fahrzeug" />
              <div className="reihe"><Aus>Fahrzeug aus Fahrzeugstamm</Aus></div>
              <AZahl spalte="maut_eigenkosten" label="Eigenkosten" betrag />
              <div className="reihe"><Aus>Standard-KFZ-Kosten</Aus><Aus>In Preis/km einsetzen</Aus></div>
              <Zahl label="Kosten" wert={null} berechnet />
              <Zahl label="Deckungsbeitrag" wert={null} berechnet />
            </div>
          </div>
          <AMemo spalte="maut_inhalt" label="Inhalt/Gründe" zeilen={3} />
          <Gruppe titel="Übertrag Mautkosten">
            <AHaken spalte="maut_in_freie_leistung" label="Übertrag in Freie Leistung" />
            <AHaken spalte="maut_in_transport" label="Übertrag in Transportleistungen" />
          </Gruppe>
          {mautZeilen.length > 0 && (
            <Gruppe titel="Mautpositionen"><PositionsTabelle bereich="maut" zeilen={mautZeilen} art="transport" /></Gruppe>
          )}
        </Gruppe>
      </div>
    </div>
  );
}

export function ReiterFrei() {
  const m = useMaske();
  const zeilen = m.z.positionen.filter((p) => p.bereich === "frei").sort((x, y) => x.zeile - y.zeile);
  const naechste = zeilen.reduce((mx, p) => Math.max(mx, p.zeile), 0) + 1;
  const summe = berechnePreis({}, zeilen).frei;
  return (
    <div>
      <div className="reihe">
        <button type="button" className="knopf" disabled={m.lesen} onClick={() => m.setPos("frei", naechste, {})}>Zeile hinzufügen</button>
        <Aus>AMÖ-Tarifberechnung</Aus>
        <Aus>Vorlagen/Texte anhängen</Aus>
        <Aus>Bild einfügen</Aus>
        <Aus>Bild löschen</Aus>
        <Aus>Zwischensummen rechnen</Aus>
        <BausteinKnopf spalte="freie_leistung_text" bereich="frei">Textbaustein einfügen</BausteinKnopf>
        <div style={{ width: 210, ["--lb" as string]: "110px" }}><AZahl spalte="km" label="Entfernung in km" /></div>
      </div>
      <table className="pos">
        <thead>
          <tr><th>Nr</th><th>Anzahl</th><th>Text + Beschreibung</th><th>Stück</th><th>E-Preis</th><th>Währung</th><th>USt</th><th>Marge</th><th>Summe</th><th>Bild</th><th>Konto</th><th>Kostenstelle</th><th /></tr>
        </thead>
        <tbody>
          {zeilen.length === 0 && <tr><td colSpan={13} className="hinweistext">Keine freien Leistungen erfasst.</td></tr>}
          {zeilen.map((p) => {
            const set = (patch: Partial<Position>) => m.setPos("frei", p.zeile, patch);
            const n = `Freie Leistung ${p.zeile} `;
            return (
              <tr key={p.zeile}>
                <td className="nr">{p.zeile}</td>
                <td className="w-k"><ZahlEingabe label={n + "Anzahl"} wert={p.anzahl} onWert={(x) => set({ anzahl: x })} lesen={m.lesen} /></td>
                <td>
                  <TextEingabe label={n + "Text"} wert={p.text} onWert={(s) => set({ text: s })} lesen={m.lesen} />
                  <textarea aria-label={n + "Beschreibung"} rows={2} value={p.beschreibung ?? ""} readOnly={m.lesen} onChange={(e) => set({ beschreibung: e.target.value === "" ? null : e.target.value })} />
                </td>
                <td className="w-k"><ZahlEingabe label={n + "Stück"} wert={p.einheiten} onWert={(x) => set({ einheiten: x })} lesen={m.lesen} /></td>
                <td className="w-z"><ZahlEingabe label={n + "E-Preis"} wert={p.einzelpreis} onWert={(x) => set({ einzelpreis: x })} lesen={m.lesen} betrag /></td>
                <td className="w-k"><TextEingabe label={n + "Währung"} wert={p.waehrung} onWert={(s) => set({ waehrung: s })} lesen={m.lesen} /></td>
                <td className="w-k"><ZahlEingabe label={n + "USt"} wert={p.ust} onWert={(x) => set({ ust: x })} lesen={m.lesen} /></td>
                <td className="w-k"><ZahlEingabe label={n + "Marge"} wert={p.prozent} onWert={(x) => set({ prozent: x })} lesen={m.lesen} /></td>
                <td className="w-b"><ZahlEingabe label={n + "Summe"} wert={p.einzelpreis == null ? null : zeilenSumme(p)} betrag berechnet /></td>
                <td className="w-s" title="Heute nicht umgesetzt">–</td>
                <td className="w-z"><TextEingabe label={n + "Konto"} wert={p.konto} onWert={(s) => set({ konto: s })} lesen={m.lesen} /></td>
                <td className="w-z"><TextEingabe label={n + "Kostenstelle"} wert={p.kostenstelle} onWert={(s) => set({ kostenstelle: s })} lesen={m.lesen} /></td>
                <td className="w-s"><button type="button" className="knopf klein" disabled={m.lesen} title="Zeile entfernen" aria-label={`Zeile ${p.zeile} entfernen`} onClick={() => m.entfernePos("frei", p.zeile)}>✕</button></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8} style={{ textAlign: "right" }}>Summe Freie Leistungen</td>
            <td className="w-b"><ZahlEingabe label="Summe Freie Leistungen" wert={summe} betrag berechnet /></td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>
      <p className="hinweistext">Leere Zeilen (ohne Text, Menge und Preis) werden beim Speichern verworfen.</p>
      <Gruppe titel="Freie Leistungsbeschreibung">
        <AMemo spalte="freie_leistung_text" label="Freie Leistungsbeschreibung" zeilen={7} />
      </Gruppe>
    </div>
  );
}

export function ReiterNebenleistung({ stamm }: { stamm: StammLeistungenZeile[] }) {
  return (
    <div>
      <Gruppe titel="Nebenleistungen">
        <PositionsTabelle bereich="nebenleistung" zeilen={BEREICH_ZEILEN.nebenleistung} art="nebenleistung" stamm={stamm} stammTitel="Suche in Stammdaten: Nebenleistungen" />
        <p className="hinweistext">Zeilen ohne Preis dienen als Hinweistext.</p>
      </Gruppe>
      <Gruppe titel="Arbeiten der Handwerker">
        <div className="reihe"><BausteinKnopf spalte="handwerker" bereich="handwerker">Textbausteine aus Stammdaten</BausteinKnopf></div>
        <AMemo spalte="handwerker" label="Arbeiten der Handwerker" zeilen={5} />
      </Gruppe>
    </div>
  );
}

export function ReiterPackmaterial({ stamm }: { stamm: StammPackmaterialZeile[] }) {
  return (
    <div>
      <Gruppe titel="Packmaterial">
        <PositionsTabelle bereich="packmaterial" zeilen={BEREICH_ZEILEN.packmaterial} art="packmaterial" stamm={stamm} stammTitel="Suche in Stammdaten: Packmaterial" />
      </Gruppe>
      <Gruppe titel="Vereinbarungen über Packleistungen">
        <div className="reihe"><BausteinKnopf spalte="packarbeit" bereich="packarbeit">Textbausteine</BausteinKnopf></div>
        <AMemo spalte="packarbeit" label="Vereinbarungen über Packleistungen" zeilen={5} />
      </Gruppe>
    </div>
  );
}
