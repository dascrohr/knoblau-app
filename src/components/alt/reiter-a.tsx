"use client";
// Reiter 1 und 2: Adreßdaten, Besichtigungsergebnisse.
import Link from "next/link";
import { useState } from "react";
import type { KundenTreffer } from "@/lib/aktionen";
import type { AdressArt, Adresse } from "@/lib/angebot-typen";
import { ADatum, AHaken, AHakenZahl, AMemo, AText, AZahl, AdressFelder, Aus, useMaske } from "./felder";
import { Gruppe } from "./anzeige";
import { BausteinKnopf, KundenDialog } from "./dialoge";

export type Auswahl = Record<string, string[]>;

const KOPIER_FELDER = ["anrede", "titel", "vorname", "name", "name1", "name2", "zuhaenden", "strasse", "lkz", "plz", "ort"] as const;

export function ReiterAdressdaten({ id, auswahl }: { id: number; auswahl: Auswahl }) {
  const m = useMaske();
  const [kundenSuche, setKundenSuche] = useState(false);
  const leer = (s: string | null | undefined) => !s || !s.trim();
  const ausKunde = (k: KundenTreffer) => {
    const a = m.z.angebot;
    m.setAdr("auftraggeber", { anrede: k.anrede, titel: k.titel, vorname: k.vorname, name: k.name, name1: k.name1, name2: k.name2, zuhaenden: k.zuhaenden, strasse: k.strasse, lkz: k.lkz, plz: k.plz, ort: k.ort });
    m.setA({
      kunde_id: k.id,
      kundennr: k.kundennr,
      ...(leer(a.telefon_auftraggeber) && k.telefon ? { telefon_auftraggeber: k.telefon } : {}),
      ...(leer(a.mobil) && k.mobil ? { mobil: k.mobil } : {}),
      ...(leer(a.telefax) && k.telefax ? { telefax: k.telefax } : {}),
      ...(leer(a.email) && k.email ? { email: k.email } : {}),
    });
    setKundenSuche(false);
  };
  const kopiere = (von: AdressArt, nach: AdressArt) => {
    const q = m.z.adressen[von];
    const patch: Partial<Adresse> = {};
    for (const k of KOPIER_FELDER) patch[k] = q[k];
    m.setAdr(nach, patch);
  };
  const k = (von: AdressArt, nach: AdressArt, text: string) => (
    <button type="button" className="knopf" disabled={m.lesen} onClick={() => kopiere(von, nach)}>{text}</button>
  );
  return (
    <div className="spalten s31">
      <div>
        <div className="reihe">
          <button type="button" className="knopf" disabled={m.lesen} onClick={() => setKundenSuche(true)}>Adresse aus Kundenstamm</button>
          <Aus>Adresse + Leistungen aus Kundenstamm</Aus>
          {k("auftraggeber", "beladestelle", "Angebot → Beladeadresse")}
          {k("beladestelle", "entladestelle", "Belade → Entladeadresse")}
          {k("auftraggeber", "entladestelle", "Angebots → Entladeadresse")}
          <button type="button" className="knopf" disabled={m.beschaeftigt} onClick={m.duplizieren} title="Kopie dieses Angebots mit neuer Nummer anlegen">Duplizieren</button>
          <Aus>PLZ-Suche</Aus>
        </div>
        <div className="spalten s3" style={{ ["--lb" as string]: "92px" }}>
          <Gruppe titel="Auftraggeber / Angebotsadresse"><AdressFelder art="auftraggeber" /></Gruppe>
          <Gruppe titel="Beladestelle"><AdressFelder art="beladestelle" /></Gruppe>
          <Gruppe titel="Entladestelle"><AdressFelder art="entladestelle" /></Gruppe>
        </div>
        {kundenSuche && !m.lesen && <KundenDialog onWahl={ausKunde} onZu={() => setKundenSuche(false)} />}
        <Gruppe titel="Briefvorlagen">
          <div className="reihe">
            <Aus>Brief 1</Aus>
            <Aus>Brief 2</Aus>
            <Aus>alle Briefvorlagen</Aus>
          </div>
        </Gruppe>
      </div>
      <div style={{ ["--lb" as string]: "130px" }}>
        <Gruppe titel="Kontakt">
          <AText spalte="telefon_auftraggeber" label="Telefon Auftraggeber" typ="tel" />
          <AText spalte="telefax" label="Fax" typ="tel" />
          <AText spalte="telefon_beladestelle" label="Telefon Beladestelle" typ="tel" />
          <AText spalte="telefon_entladestelle" label="Telefon Entladestelle" typ="tel" />
          <AText spalte="email" label="E-Mail" />
          <AText spalte="mobil" label="Mobil" typ="tel" />
        </Gruppe>
        <Gruppe titel="Besichtigung und Termin">
          <ADatum spalte="besichtigung_datum" label="Besichtigungstermin" />
          <AText spalte="besichtigung_zeit" label="Uhrzeit" kurz />
          <AText spalte="besichtigung_art" label="Art der Besichtigung" liste={auswahl.besichtigung_art} />
          <AText spalte="sachbearbeiter" label="Sachbearbeiter" liste={auswahl.sachbearbeiter} />
          <AText spalte="akquisiteur" label="Akquisiteur" liste={auswahl.sachbearbeiter} />
          <ADatum spalte="umzugstermin" label="Umzugstermin" />
          <AText spalte="bereich" label="Abteilung/Bereich" />
        </Gruppe>
        <Gruppe titel="Route">
          <div className="reihe">
            <Link className="knopf" href={`/neu/angebote/${id}#route`}>Route berechnen + zeigen</Link>
          </div>
          <AZahl spalte="autobahn_km" label="Autobahn-km" />
          <AZahl spalte="km" label="Entfernung (km)" />
        </Gruppe>
      </div>
    </div>
  );
}

function Stelle({ k, titel }: { k: "b" | "e"; titel: string }) {
  return (
    <Gruppe titel={titel}>
      <AText spalte={`${k}_etage`} label="Etage" />
      <AZahl spalte={`${k}_geschosse`} label="Anzahl Geschosse" />
      <AZahl spalte={`${k}_stufen`} label="Anzahl Stufen" />
      <AZahl spalte={`${k}_tragweg`} label="Meter Tragweg" />
      <AZahl spalte={`${k}_wohnflaeche`} label="m² Wohnfläche" />
      <AHaken spalte={`${k}_aussenaufzug`} label="Außenaufzug" />
      <AHaken spalte={`${k}_hvz`} label="Halteverbotszone einrichten" />
      <AHakenZahl spalte={`${k}_aufzug`} label="Aufzug im Treppenhaus" />
    </Gruppe>
  );
}

export function ReiterBesichtigung({ id, auswahl }: { id: number; auswahl: Auswahl }) {
  return (
    <div style={{ ["--lb" as string]: "150px" }}>
      <div className="spalten s4">
        <Stelle k="b" titel="Beladestelle" />
        <Stelle k="e" titel="Entladestelle" />
        <Gruppe titel="Besonderheiten">
          <AHaken spalte="klavier" label="Klavier" />
          <AZahl spalte="klavier_anzahl" label="Anzahl" />
          <AZahl spalte="klavier_preis" label="Preis" betrag />
          <AHaken spalte="fluegel" label="Flügel" />
          <AZahl spalte="fluegel_anzahl" label="Anzahl" />
          <AZahl spalte="fluegel_preis" label="Preis" betrag />
          <AHaken spalte="schwergut" label="Schwergutzuschlag" />
          <AZahl spalte="schwergut_kilo" label="Kilo" />
          <AZahl spalte="schwergut_preis" label="Preis je 100 kg" betrag />
          <AHaken spalte="einzelfahrt" label="Einzelfahrt" />
          <AText spalte="wohnung_buero" label="Wohnung/Büro" liste={["Wohnung", "Büro"]} />
        </Gruppe>
        <Gruppe titel="Konditionen">
          <AText spalte="herkunft" label="Herkunft" liste={auswahl.herkunft} />
          <AText spalte="zahlungsbedingung" label="Zahlungsbedingung" liste={auswahl.zahlungsbedingung} />
          <AText spalte="waehrung" label="Hauptwährung" kurz />
          <AText spalte="waehrung2" label="Zweitwährung" kurz />
          <AZahl spalte="ust_satz" label="Umsatzsteuer %" />
          <AZahl spalte="generalrabatt" label="Generalrabatt %" />
          <ADatum spalte="angebotsdatum" label="Datum Angebot" />
          <AText spalte="umzugsart" label="Umzugsart" liste={auswahl.umzugsart} />
          <AText spalte="status" label="Druck-Status" kurz />
          <AHaken spalte="entwurf" label="Entwurf" />
          <div className="reihe">
            <Link className="knopf" href={`/neu/angebote/${id}#route`}>Route berechnen + zeigen</Link>
          </div>
          <AZahl spalte="km" label="km" />
        </Gruppe>
      </div>
      <div className="spalten s2">
        <Gruppe titel="Volumen und Gewicht">
          <AZahl spalte="volumen" label="Volumen" />
          <AText spalte="volumen_einheit" label="Einheit" liste={["CBM"]} kurz />
          <AText spalte="volumen_ermittlung" label="Art der Ermittlung" liste={auswahl.volumen_ermittlung?.length ? auswahl.volumen_ermittlung : ["geschätzt", "laut Liste", "nach Beladung", "Schätzung", "Angabe"]} />
          <AText spalte="gestellt" label="Gestellt" />
          <AText spalte="gewicht" label="Gewicht" kurz />
          <div className="reihe"><Aus>Eisenbahnkm ermitteln</Aus></div>
        </Gruppe>
        <Gruppe titel="Versicherung">
          <AZahl spalte="versicherungswert" label="Gesamtwert Umzugsgut" betrag />
          <AZahl spalte="zeitwert" label="Höherwertvers. (Zeitwert)" betrag />
          <AZahl spalte="promille_zeitwert" label="Promille Zeitwert" />
          <AZahl spalte="promille_neuwert" label="Promille Neuwert" />
          <AZahl spalte="utv" label="UTV-Höhe" betrag />
          <AZahl spalte="versicherungsbetrag" label="Versicherungsbetrag" betrag />
          <AHakenZahl spalte="versicherungssteuer" label="mit Versicherungssteuer" />
        </Gruppe>
      </div>
      <Gruppe titel="Vereinbarungen als Vertragsbestandteil">
        <div className="reihe"><BausteinKnopf spalte="vereinbarungen" bereich="vereinbarungen">Textbaustein einfügen</BausteinKnopf></div>
        <AMemo spalte="vereinbarungen" label="Vereinbarungen als Vertragsbestandteil" zeilen={7} />
      </Gruppe>
    </div>
  );
}
