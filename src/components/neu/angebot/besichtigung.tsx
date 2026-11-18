"use client";
import { memo } from "react";
import type { Angebot } from "@/lib/angebot-typen";
import { Feld, Karte, Schalter, Textbereich, Zahlfeld } from "../ui";
import { TextbausteinKnopf } from "./textbausteine";
import type { Auswahllisten, Setzer } from "./zustand";

type Props = { angebot: Angebot; setzer: Setzer; listen: Auswahllisten };

function Stelle({ titel, p, angebot, setzer }: { titel: string; p: "b" | "e"; angebot: Angebot; setzer: Setzer }) {
  const f = <K extends string>(name: K) => `${p}_${name}` as `b_${K}` | `e_${K}`;
  const setze = (feld: keyof Angebot, w: unknown) => setzer.kopf({ [feld]: w } as Partial<Angebot>);
  return (
    <Karte titel={titel}>
      <div className="k-raster">
        <Feld label="Etage" wert={angebot[f("etage")]} onWert={(w) => setze(f("etage"), w)} placeholder="z. B. 2. Etage ohne Aufzug" />
        <Zahlfeld className="k-s3" label="Geschosse" wert={angebot[f("geschosse")]} onWert={(w) => setze(f("geschosse"), w)} />
        <Zahlfeld className="k-s3" label="Stufen" wert={angebot[f("stufen")]} onWert={(w) => setze(f("stufen"), w)} />
        <Zahlfeld className="k-s3" label="Tragweg" einheit="m" wert={angebot[f("tragweg")]} onWert={(w) => setze(f("tragweg"), w)} />
        <Zahlfeld className="k-s3" label="Wohnfläche" einheit="m²" wert={angebot[f("wohnflaeche")]} onWert={(w) => setze(f("wohnflaeche"), w)} />
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Schalter label="Außenaufzug" an={angebot[f("aussenaufzug")]} onAn={(w) => setze(f("aussenaufzug"), w)} />
          <Schalter label="Halteverbotszone einrichten" an={angebot[f("hvz")]} onAn={(w) => setze(f("hvz"), w)} />
          <Schalter label="Aufzug im Treppenhaus" an={(angebot[f("aufzug")] ?? 0) > 0} onAn={(w) => setze(f("aufzug"), w ? 1 : 0)} />
        </div>
      </div>
    </Karte>
  );
}

export const Besichtigung = memo(function Besichtigung({ angebot, setzer, listen }: Props) {
  const k = <F extends keyof Angebot>(feld: F) => (w: Angebot[F]) => setzer.kopf({ [feld]: w } as Partial<Angebot>);
  return (
    <div id="besichtigung" className="k-abschnitt flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Stelle titel="Besichtigung Beladestelle" p="b" angebot={angebot} setzer={setzer} />
        <Stelle titel="Besichtigung Entladestelle" p="e" angebot={angebot} setzer={setzer} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Karte titel="Besonderheiten">
          <div className="flex flex-col gap-3">
            <div className="k-raster items-end">
              <Schalter className="k-s4" label="Klavier" an={angebot.klavier} onAn={k("klavier")} />
              <Zahlfeld className="k-s3" label="Anzahl" wert={angebot.klavier_anzahl} onWert={k("klavier_anzahl")} disabled={!angebot.klavier} />
              <Zahlfeld className="k-s5" label="Preis je Klavier" einheit="€" nachkomma={2} wert={angebot.klavier_preis} onWert={k("klavier_preis")} disabled={!angebot.klavier} />
            </div>
            <div className="k-raster items-end">
              <Schalter className="k-s4" label="Flügel" an={angebot.fluegel} onAn={k("fluegel")} />
              <Zahlfeld className="k-s3" label="Anzahl" wert={angebot.fluegel_anzahl} onWert={k("fluegel_anzahl")} disabled={!angebot.fluegel} />
              <Zahlfeld className="k-s5" label="Preis je Flügel" einheit="€" nachkomma={2} wert={angebot.fluegel_preis} onWert={k("fluegel_preis")} disabled={!angebot.fluegel} />
            </div>
            <div className="k-raster items-end">
              <Schalter className="k-s4" label="Schwergutzuschlag" an={angebot.schwergut} onAn={k("schwergut")} />
              <Zahlfeld className="k-s3" label="Kilo" einheit="kg" wert={angebot.schwergut_kilo} onWert={k("schwergut_kilo")} disabled={!angebot.schwergut} />
              <Zahlfeld className="k-s5" label="Preis je 100 kg" einheit="€" nachkomma={2} wert={angebot.schwergut_preis} onWert={k("schwergut_preis")} disabled={!angebot.schwergut} />
            </div>
            <div className="k-raster items-end">
              <Schalter className="k-s4" label="Einzelfahrt" an={angebot.einzelfahrt} onAn={k("einzelfahrt")} />
              <Feld className="k-s8" label="Wohnung/Büro" wert={angebot.wohnung_buero} onWert={k("wohnung_buero")} vorschlaege={["Wohnung", "Büro"]} />
            </div>
          </div>
        </Karte>
        <Karte titel="Volumen und Konditionen">
          <div className="k-raster">
            <Zahlfeld className="k-s4" label="Volumen" wert={angebot.volumen} onWert={k("volumen")} />
            <Feld className="k-s3" label="Einheit" wert={angebot.volumen_einheit} onWert={k("volumen_einheit")} vorschlaege={["CBM", "RE", "MWM"]} />
            <Feld className="k-s5" label="Art der Ermittlung" wert={angebot.volumen_ermittlung} onWert={k("volumen_ermittlung")} vorschlaege={listen.volumen_ermittlung.length ? listen.volumen_ermittlung : ["geschätzt", "laut Liste", "nach Beladung", "Schätzung", "Angabe"]} />
            <Feld className="k-s4" label="Gewicht" wert={angebot.gewicht} onWert={k("gewicht")} />
            <Feld className="k-s8" label="Umzugsart" wert={angebot.umzugsart} onWert={k("umzugsart")} vorschlaege={listen.umzugsart} />
            <div className="flex flex-col gap-1">
              <Feld label="Zahlungsbedingung" wert={angebot.zahlungsbedingung} onWert={k("zahlungsbedingung")} vorschlaege={listen.zahlungsbedingung} />
              <TextbausteinKnopf bereich="zahlungsbedingung" ersetzen wert={angebot.zahlungsbedingung} onWert={k("zahlungsbedingung")} />
            </div>
            <Zahlfeld className="k-s6" label="Umsatzsteuer" einheit="%" wert={angebot.ust_satz} onWert={(w) => setzer.kopf({ ust_satz: w ?? 19 })} list="k-ust-saetze" />
            <Zahlfeld className="k-s6" label="Generalrabatt" einheit="%" wert={angebot.generalrabatt} onWert={k("generalrabatt")} />
            <datalist id="k-ust-saetze">
              {listen.mwst.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
        </Karte>
      </div>
      <Karte titel="Versicherung">
        <div className="k-raster">
          <Zahlfeld className="k-s3" label="Gesamtwert Umzugsgut" einheit="€" nachkomma={2} wert={angebot.versicherungswert} onWert={k("versicherungswert")} />
          <Zahlfeld className="k-s2" label="Promille Zeitwert" einheit="‰" wert={angebot.promille_zeitwert} onWert={k("promille_zeitwert")} />
          <Zahlfeld className="k-s2" label="Promille Neuwert" einheit="‰" wert={angebot.promille_neuwert} onWert={k("promille_neuwert")} />
          <Zahlfeld className="k-s2" label="UTV-Höhe" einheit="€" wert={angebot.utv} onWert={k("utv")} />
          <Zahlfeld className="k-s3" label="Versicherungsbetrag" einheit="€" nachkomma={2} wert={angebot.versicherungsbetrag} onWert={k("versicherungsbetrag")} hinweis="Geht in die Nettosumme ein" />
          <Schalter label="mit Versicherungssteuer (16 %) statt Umsatzsteuer auf den Versicherungsbetrag" an={(angebot.versicherungssteuer ?? 0) > 0} onAn={(w) => setzer.kopf({ versicherungssteuer: w ? 1 : 0 })} />
        </div>
      </Karte>
      <Karte titel="Vereinbarungen (Vertragsbestandteil)">
        <div className="flex flex-col gap-1">
          <Textbereich label="Vereinbarungen" labelVersteckt rows={6} wert={angebot.vereinbarungen} onWert={k("vereinbarungen")} />
          <TextbausteinKnopf bereich="vereinbarungen" wert={angebot.vereinbarungen} onWert={k("vereinbarungen")} />
        </div>
      </Karte>
    </div>
  );
});
