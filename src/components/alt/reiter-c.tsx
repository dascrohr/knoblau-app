"use client";
// Reiter 7 bis 10: Termine, Preisübersicht, Adressen+Anlagen, Checkliste.
import { TERMIN_ZEILEN, type AngebotKomplett, type Checkpunkt, type Termin } from "@/lib/angebot-typen";
import type { StammChecklisteZeile } from "@/lib/db-typen";
import { VERSICHERUNGSSTEUER_SATZ, berechnePreis, formatDatum, formatZahl } from "@/lib/preis";
import { AMemo, AText, AdressFelder, Aus, TextEingabe, Zahl, ZahlEingabe, useMaske } from "./felder";
import { Gruppe } from "./anzeige";
import type { Auswahl } from "./reiter-a";

export function ReiterTermine() {
  const m = useMaske();
  const termin = (zeile: number): Termin => m.z.termine.find((t) => t.zeile === zeile) ?? { zeile, text: null, datum: null, von: null, bis: null, gebucht: false };
  return (
    <div>
      <Gruppe titel="Freie Termine">
        <AMemo spalte="termine_frei" label="Freie Termine" zeilen={3} />
      </Gruppe>
      <Gruppe titel="Termine">
        <div className="reihe"><Aus>Termine aus Stamm</Aus></div>
        <table className="pos">
          <thead><tr><th /><th>Text</th><th>Datum</th><th>von</th><th>bis</th><th>In Kalender buchen</th></tr></thead>
          <tbody>
            {TERMIN_ZEILEN.map((zeile) => {
              const t = termin(zeile);
              const n = `Termin ${zeile} `;
              return (
                <tr key={zeile}>
                  <td style={{ whiteSpace: "nowrap", width: 70, paddingTop: 3 }}>Termin {zeile}</td>
                  <td><TextEingabe label={n + "Text"} wert={t.text} onWert={(s) => m.setTermin(zeile, { text: s })} lesen={m.lesen} /></td>
                  <td style={{ width: 130 }}><TextEingabe label={n + "Datum"} typ="date" wert={t.datum} onWert={(s) => m.setTermin(zeile, { datum: s })} lesen={m.lesen} /></td>
                  <td className="w-z"><TextEingabe label={n + "von"} wert={t.von} onWert={(s) => m.setTermin(zeile, { von: s })} lesen={m.lesen} /></td>
                  <td className="w-z"><TextEingabe label={n + "bis"} wert={t.bis} onWert={(s) => m.setTermin(zeile, { bis: s })} lesen={m.lesen} /></td>
                  <td style={{ width: 120, textAlign: "center", paddingTop: 4 }}>
                    <input type="checkbox" aria-label={n + "In Kalender buchen"} checked={!!t.gebucht} disabled={m.lesen} onChange={(e) => m.setTermin(zeile, { gebucht: e.target.checked })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Gruppe>
      <Gruppe titel="Absprachen, die nicht ins Angebot gehören">
        <AMemo spalte="info" label="Absprachen, die nicht ins Angebot gehören" zeilen={5} />
      </Gruppe>
    </div>
  );
}

export function ReiterPreis({ auswahl }: { auswahl: Auswahl }) {
  const m = useMaske();
  const p = berechnePreis(m.z.angebot, m.z.positionen);
  const zeile = (text: string, wert: number, stark?: boolean) => (
    <tr className={stark ? "stark" : undefined}>
      <td>{text}</td>
      <td><ZahlEingabe label={text} wert={wert} betrag berechnet /></td>
    </tr>
  );
  return (
    <div className="spalten s2">
      <div>
        <Gruppe titel="Preisübersicht">
          <table className="summen">
            <tbody>
              {zeile("Summe Beladekosten", p.beladen)}
              {zeile("Transportkosten + Freie Leistungen", p.transport)}
              {zeile("Summe Entladekosten", p.entladen)}
              {zeile("Versicherungsbeträge", p.versicherung)}
              {zeile("Summe Besonderheiten", p.besonderheiten)}
              {zeile("Summe Packmaterialien", p.packmaterial)}
              {zeile("Summe Nebenleistungen", p.nebenleistungen)}
              {zeile("Mautkostenberechnung", p.maut)}
              {zeile("Gesamtnettosumme", p.netto, true)}
              {zeile(`abzügl. Generalmarge (${formatZahl(m.z.angebot.generalrabatt ?? 0)} %)`, p.rabatt)}
              {zeile(`zzgl. USt (${formatZahl(p.ustSatz)} %)`, p.ust)}
              {zeile(`zzgl. VsSt (${VERSICHERUNGSSTEUER_SATZ} %)`, p.vsst)}
              {zeile("Gesamtsumme", p.gesamt, true)}
            </tbody>
          </table>
          <div style={{ marginTop: 6, ["--lb" as string]: "230px" }}>
            <Zahl label={`umgerechneter Betrag (${m.z.angebot.waehrung2 ?? "Zweitwährung"})`} wert={null} berechnet />
          </div>
        </Gruppe>
        <Gruppe titel="Block-Überschriften im Ausdruck">
          <AText spalte="ueberschrift1" label="Überschrift 1" liste={["ANGEBOT/AUFTRAG"]} />
          <AText spalte="ueberschrift2" label="Überschrift 2" liste={["NEBENLEISTUNGEN"]} />
          <AText spalte="ueberschrift3" label="Überschrift 3" liste={["PACKMATERIALIEN"]} />
          <AText spalte="ueberschrift4" label="Überschrift 4" liste={["BEFÖRDERUNG"]} />
        </Gruppe>
        <Gruppe titel="Zahlungsbedingungen manuell">
          <AText spalte="zahlungsbedingung" label="Zahlungsbedingung" liste={auswahl.zahlungsbedingung} />
          <AText spalte="text_netto" label="Text Netto" />
          <AText spalte="text_brutto" label="Text Brutto" />
        </Gruppe>
      </div>
      <Gruppe titel="Vorkalkulation / Deckungsbeitrag">
        <p className="hinweistext">Heute nicht umgesetzt – Felder nur zur Vollständigkeit.</p>
        <div className="reihe"><Aus>Automatische Vorkalkulation</Aus><Aus>Übernahmetarif abfragen</Aus><Aus>Status des Angebots abfragen</Aus></div>
        <div style={{ ["--lb" as string]: "230px" }}>
          {["Eigene Kosten Beladen", "Eigene Kosten Transport", "Eigene Kosten Entladen", "Eigene Kosten Nebenleistungen", "Eigene Kosten Packmaterial", "Reine Durchführungskosten", "Verwaltungskosten %", "Unternehmergewinn %", "Gesamtkosten", "Deckungsbeitrag"].map((t) => (
            <div className="feld kurz" key={t} title="Heute nicht umgesetzt">
              <label>{t}</label>
              <input disabled aria-label={t} value="" readOnly className="zahl" />
            </div>
          ))}
        </div>
      </Gruppe>
    </div>
  );
}

export function ReiterAdressenAnlagen({ halteverbotszonen }: { halteverbotszonen: AngebotKomplett["halteverbotszonen"] }) {
  const zusatz = (art: "zusatz1" | "zusatz2", titel: string) => (
    <Gruppe titel={titel}>
      <div className="reihe"><Aus klein>Halteverbotszone abfragen</Aus><Aus klein>aus Kundenstamm</Aus><Aus klein>weitere Adressen</Aus><Aus klein>Kartenansicht</Aus></div>
      <AdressFelder art={art} mitBezeichnung />
    </Gruppe>
  );
  return (
    <div>
      <div className="spalten s2">
        {zusatz("zusatz1", "Zusatzadresse 1")}
        {zusatz("zusatz2", "Zusatzadresse 2")}
      </div>
      <Gruppe titel="Halteverbotszonen zu diesem Angebot">
        <table className="tab">
          <thead><tr><th>Adresse</th><th>Straße</th><th>PLZ</th><th>Ort</th><th>von</th><th>bis</th><th>Anfrage</th><th>Buchung</th></tr></thead>
          <tbody>
            {halteverbotszonen.length === 0 && <tr><td colSpan={8}>Keine Halteverbotszonen erfasst.</td></tr>}
            {halteverbotszonen.map((h) => (
              <tr key={h.id}>
                <td>{h.adressart}</td><td>{h.strasse}</td><td>{h.plz}</td><td>{h.ort}</td>
                <td>{formatDatum(h.von_datum)}</td><td>{formatDatum(h.bis_datum)}</td><td>{h.anfrage_ergebnis}</td><td>{h.buchung_ergebnis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Gruppe>
      <Gruppe titel="Dateianlagen">
        <div className="reihe"><Aus>Scannen</Aus><Aus>Öffnen</Aus><Aus>Drehen 90°</Aus><Aus>Drehen 180°</Aus></div>
        <table className="tab">
          <thead><tr><th>ID</th><th>Beschreibung/Inhalt/Dateityp</th><th>Endung</th><th>Benutzer</th><th>Erstelldatum</th></tr></thead>
          <tbody><tr><td colSpan={5}>Keine Dateianlagen (heute nicht umgesetzt).</td></tr></tbody>
        </table>
      </Gruppe>
    </div>
  );
}

/** Vorgabewerte robust trennen: Komma, Semikolon, Zeilenumbruch, senkrechter Strich. */
function vorgabeWerte(vorgaben: string | null): string[] {
  if (!vorgaben) return [];
  return [...new Set(vorgaben.split(/[,;|\r\n]+/).map((s) => s.trim()).filter(Boolean))];
}

export function ReiterCheckliste({ vorlage }: { vorlage: StammChecklisteZeile[] }) {
  const m = useMaske();
  const liste = m.z.checkliste;
  const setze = (i: number, patch: Partial<Checkpunkt>) => m.setCheckliste(liste.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const erzeugen = () =>
    m.setCheckliste(vorlage.map((v, i) => ({ zeile: i + 1, aufgabe: v.aufgabe, erledigt: false, ignorieren: false, datentyp: v.datentyp, wert: null, vorgaben: v.vorgaben, eintragen: v.eintragen })));
  const loeschen = () => {
    if (window.confirm("Checkliste dieses Angebots wirklich löschen? Wirksam wird das erst beim Speichern.")) m.setCheckliste([]);
  };
  return (
    <div>
      <div className="reihe">
        <button type="button" className="knopf" disabled={m.lesen || liste.length > 0 || vorlage.length === 0} onClick={erzeugen} title={liste.length > 0 ? "Es gibt schon eine Checkliste" : vorlage.length === 0 ? "Keine Vorlage in den Stammdaten" : undefined}>Checkliste erzeugen</button>
        <button type="button" className="knopf" disabled={m.lesen || liste.length === 0} onClick={loeschen}>Checkliste löschen</button>
      </div>
      <table className="pos">
        <thead><tr><th>ToDo</th><th>Erledigt</th><th>Ignorieren</th><th>Eingabe</th><th>Übertrag</th></tr></thead>
        <tbody>
          {liste.length === 0 && <tr><td colSpan={5} className="hinweistext">Keine Checkliste vorhanden.</td></tr>}
          {liste.map((c, i) => {
            const werte = vorgabeWerte(c.vorgaben);
            const jaNein = !werte.length && /^(l|logi|bool|ja)/i.test(c.datentyp ?? "");
            const optionen = jaNein ? ["Ja", "Nein"] : werte;
            const alle = c.wert && !optionen.includes(c.wert) ? [c.wert, ...optionen] : optionen;
            const n = `Checkliste ${c.zeile} `;
            return (
              <tr key={c.zeile}>
                <td><TextEingabe label={n + "ToDo"} wert={c.aufgabe} onWert={(s) => setze(i, { aufgabe: s })} lesen={m.lesen} /></td>
                <td style={{ width: 60, textAlign: "center", paddingTop: 4 }}><input type="checkbox" aria-label={n + "Erledigt"} checked={!!c.erledigt} disabled={m.lesen} onChange={(e) => setze(i, { erledigt: e.target.checked })} /></td>
                <td style={{ width: 70, textAlign: "center", paddingTop: 4 }}><input type="checkbox" aria-label={n + "Ignorieren"} checked={!!c.ignorieren} disabled={m.lesen} onChange={(e) => setze(i, { ignorieren: e.target.checked })} /></td>
                <td style={{ width: 300 }}>
                  {alle.length ? (
                    <select aria-label={n + "Eingabe"} value={c.wert ?? ""} disabled={m.lesen} onChange={(e) => setze(i, { wert: e.target.value === "" ? null : e.target.value })} style={{ width: "100%" }}>
                      <option value="" />
                      {alle.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <TextEingabe label={n + "Eingabe"} wert={c.wert} onWert={(s) => setze(i, { wert: s })} lesen={m.lesen} />
                  )}
                </td>
                <td style={{ width: 230 }}>
                  <select aria-label={n + "Übertrag"} value={c.eintragen ? "1" : "0"} disabled={m.lesen} onChange={(e) => setze(i, { eintragen: e.target.value === "1" })} style={{ width: "100%" }}>
                    <option value="1">in Angebotsdaten übernehmen</option>
                    <option value="0">nur in Checkliste speichern</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
