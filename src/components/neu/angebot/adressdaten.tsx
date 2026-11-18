"use client";
import { memo, useState } from "react";
import { AdressVorschlag } from "@/components/neu/karte";
import { ADRESS_TITEL, type AdressArt, type Adresse, type Angebot } from "@/lib/angebot-typen";
import { Feld, Karte, Knopf } from "../ui";
import { KundenDialog, type KundenTreffer } from "./kunden-dialog";
import type { Auswahllisten, Setzer } from "./zustand";

const ANREDEN = ["Herr", "Frau", "Familie", "Firma", "Eheleute"];

/** Felder einer Adresse. `mitVorschlag` = Straßenfeld mit Autovervollständigung (Belade-/Entladestelle). */
export function AdressFelder({ art, adresse, onAendern, mitVorschlag, mitBezeichnung }: { art: AdressArt; adresse: Adresse; onAendern: (art: AdressArt, a: Partial<Adresse>) => void; mitVorschlag?: boolean; mitBezeichnung?: boolean }) {
  const s = (feld: keyof Adresse) => (w: string | null) => onAendern(art, { [feld]: w });
  return (
    <div className="k-raster">
      {mitBezeichnung ? <Feld label="Art der Adresse" wert={adresse.bezeichnung} onWert={s("bezeichnung")} placeholder="z. B. Lager, Zwischenstopp" /> : null}
      <Feld className="k-s4" label="Anrede" wert={adresse.anrede} onWert={s("anrede")} vorschlaege={ANREDEN} />
      <Feld className="k-s3" label="Titel" wert={adresse.titel} onWert={s("titel")} />
      <Feld className="k-s5" label="Vorname" wert={adresse.vorname} onWert={s("vorname")} />
      <Feld label="Name" wert={adresse.name} onWert={s("name")} />
      <Feld className="k-s6" label="Name 1 / Firma" wert={adresse.name1} onWert={s("name1")} />
      <Feld className="k-s6" label="Name 2" wert={adresse.name2} onWert={s("name2")} />
      <Feld label="z. H." wert={adresse.zuhaenden} onWert={s("zuhaenden")} />
      {mitVorschlag ? (
        <AdressVorschlag
          label="Straße"
          wert={adresse.strasse ?? ""}
          onWert={(w) => onAendern(art, { strasse: w || null })}
          onAuswahl={(a) => onAendern(art, { strasse: a.strasse || null, plz: a.plz || null, ort: a.ort || null, ...(a.lkz ? { lkz: a.lkz } : {}) })}
        />
      ) : (
        <Feld label="Straße" wert={adresse.strasse} onWert={s("strasse")} />
      )}
      <Feld className="k-s2" label="LKZ" wert={adresse.lkz} onWert={s("lkz")} maxLength={4} />
      <Feld className="k-s3" label="PLZ" wert={adresse.plz} onWert={s("plz")} inputMode="numeric" maxLength={10} />
      <Feld className="k-s7" label="Ort" wert={adresse.ort} onWert={s("ort")} />
    </div>
  );
}

const KOPIERFELDER = ["anrede", "titel", "vorname", "name", "name1", "name2", "zuhaenden", "strasse", "lkz", "plz", "ort"] as const;
function kopie(a: Adresse): Partial<Adresse> {
  return Object.fromEntries(KOPIERFELDER.map((f) => [f, a[f]]));
}

type Props = { angebot: Angebot; adressen: Record<AdressArt, Adresse>; setzer: Setzer; listen: Auswahllisten };

export const Adressdaten = memo(function Adressdaten({ angebot, adressen, setzer, listen }: Props) {
  const k = <F extends keyof Angebot>(feld: F) => (w: Angebot[F]) => setzer.kopf({ [feld]: w } as Partial<Angebot>);
  const uebernehmen = (von: AdressArt, nach: AdressArt) => {
    const ziel = adressen[nach];
    const belegt = KOPIERFELDER.some((f) => ziel[f]);
    if (belegt && !window.confirm(`Die ${ADRESS_TITEL[nach]} ist schon ausgefüllt. Mit den Daten aus „${ADRESS_TITEL[von]}“ überschreiben?`)) return;
    setzer.adresse(nach, kopie(adressen[von]));
  };
  const [kundenwahl, setKundenwahl] = useState(false);
  /** Kunde aus dem Kundenstamm: Anschrift und Kundenbezug immer, Kontaktfelder und Zahlungsbedingung nur, wenn im Angebot noch leer. */
  const ausKundenstamm = (kunde: KundenTreffer) => {
    setKundenwahl(false);
    const belegt = KOPIERFELDER.some((f) => adressen.auftraggeber[f]);
    if (belegt && !window.confirm("Der Auftraggeber ist schon ausgefüllt. Mit den Daten aus dem Kundenstamm überschreiben?")) return;
    setzer.adresse("auftraggeber", Object.fromEntries(KOPIERFELDER.map((f) => [f, kunde[f] ?? null])));
    const kopf: Partial<Angebot> = { kunde_id: kunde.id, kundennr: kunde.kundennr };
    if (!angebot.telefon_auftraggeber && kunde.telefon) kopf.telefon_auftraggeber = kunde.telefon;
    if (!angebot.mobil && kunde.mobil) kopf.mobil = kunde.mobil;
    if (!angebot.telefax && kunde.telefax) kopf.telefax = kunde.telefax;
    if (!angebot.email && kunde.email) kopf.email = kunde.email;
    if (!angebot.zahlungsbedingung && kunde.zahlungsbedingung) kopf.zahlungsbedingung = kunde.zahlungsbedingung;
    setzer.kopf(kopf);
  };
  return (
    <div id="adressdaten" className="k-abschnitt flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
        <Karte
          titel="Auftraggeber"
          aktionen={
            <Knopf klein onClick={() => setKundenwahl(true)} title="Anschrift und Kontaktdaten eines vorhandenen Kunden übernehmen">
              Aus Kundenstamm
            </Knopf>
          }
        >
          <AdressFelder art="auftraggeber" adresse={adressen.auftraggeber} onAendern={setzer.adresse} />
          {angebot.kunde_id ? (
            <p className="k-leise mt-3 text-xs">
              Verknüpft mit dem Kundenstamm{angebot.kundennr ? ` (Kundennr. ${angebot.kundennr})` : ""}:{" "}
              <a href={`/neu/kunden/${angebot.kunde_id}`} target="_blank" rel="noopener" className="k-link">
                Kunde öffnen
              </a>
            </p>
          ) : null}
          {kundenwahl ? <KundenDialog onWahl={ausKundenstamm} onZu={() => setKundenwahl(false)} /> : null}
        </Karte>
        <Karte
          titel="Beladestelle"
          aktionen={
            <Knopf klein onClick={() => uebernehmen("auftraggeber", "beladestelle")} title="Adresse des Auftraggebers in die Beladestelle übernehmen">
              Auftraggeber → Beladestelle
            </Knopf>
          }
        >
          <AdressFelder art="beladestelle" adresse={adressen.beladestelle} onAendern={setzer.adresse} mitVorschlag />
        </Karte>
        <Karte
          titel="Entladestelle"
          aktionen={
            <>
              <Knopf klein onClick={() => uebernehmen("beladestelle", "entladestelle")} title="Adresse der Beladestelle in die Entladestelle übernehmen">
                Beladestelle → Entladestelle
              </Knopf>
              <Knopf klein onClick={() => uebernehmen("auftraggeber", "entladestelle")} title="Adresse des Auftraggebers in die Entladestelle übernehmen">
                Auftraggeber → Entladestelle
              </Knopf>
            </>
          }
        >
          <AdressFelder art="entladestelle" adresse={adressen.entladestelle} onAendern={setzer.adresse} mitVorschlag />
        </Karte>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Karte titel="Kontakt">
          <div className="k-raster">
            <Feld className="k-s6" label="Telefon Auftraggeber" type="tel" wert={angebot.telefon_auftraggeber} onWert={k("telefon_auftraggeber")} />
            <Feld className="k-s6" label="Mobil" type="tel" wert={angebot.mobil} onWert={k("mobil")} />
            <Feld className="k-s6" label="Telefon Beladestelle" type="tel" wert={angebot.telefon_beladestelle} onWert={k("telefon_beladestelle")} />
            <Feld className="k-s6" label="Telefon Entladestelle" type="tel" wert={angebot.telefon_entladestelle} onWert={k("telefon_entladestelle")} />
            <Feld className="k-s6" label="E-Mail" type="email" wert={angebot.email} onWert={k("email")} />
            <Feld className="k-s6" label="Fax" type="tel" wert={angebot.telefax} onWert={k("telefax")} />
          </div>
        </Karte>
        <Karte titel="Vorgang">
          <div className="k-raster">
            <Feld className="k-s4" label="Angebotsdatum" type="date" wert={angebot.angebotsdatum} onWert={k("angebotsdatum")} />
            <Feld className="k-s4" label="Umzugstermin" type="date" wert={angebot.umzugstermin} onWert={k("umzugstermin")} />
            <Feld className="k-s4" label="Status" wert={angebot.status} onWert={k("status")} vorschlaege={listen.status} hinweis="Kürzel wie in der Altsoftware" />
            <Feld className="k-s4" label="Besichtigung am" type="date" wert={angebot.besichtigung_datum} onWert={k("besichtigung_datum")} />
            <Feld className="k-s3" label="Uhrzeit" wert={angebot.besichtigung_zeit} onWert={k("besichtigung_zeit")} placeholder="z. B. 14:30" />
            <Feld className="k-s5" label="Art der Besichtigung" wert={angebot.besichtigung_art} onWert={k("besichtigung_art")} vorschlaege={listen.besichtigung_art} />
            <Feld className="k-s6" label="Sachbearbeiter" wert={angebot.sachbearbeiter} onWert={k("sachbearbeiter")} vorschlaege={listen.sachbearbeiter} />
            <Feld className="k-s6" label="Akquisiteur" wert={angebot.akquisiteur} onWert={k("akquisiteur")} vorschlaege={listen.sachbearbeiter} />
            <Feld className="k-s6" label="Abteilung/Bereich" wert={angebot.bereich} onWert={k("bereich")} />
            <Feld className="k-s6" label="Herkunft" wert={angebot.herkunft} onWert={k("herkunft")} vorschlaege={listen.herkunft} />
          </div>
          <p className="mt-3">
            <a href="#route" className="k-link">
              Route berechnen und zeigen ↓
            </a>
          </p>
        </Karte>
      </div>
    </div>
  );
});
