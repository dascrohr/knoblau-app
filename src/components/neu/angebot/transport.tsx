"use client";
import { memo, useCallback, useState } from "react";
import { RoutenBlock } from "@/components/neu/karte";
import { BEREICH_ZEILEN, type AdressArt, type Adresse, type Angebot, type Position } from "@/lib/angebot-typen";
import { formatDatum } from "@/lib/preis";
import { Feld, Karte, Schalter, Zahlfeld } from "../ui";
import { PositionsTabelle } from "./positionen";
import { aenderePosition, entfernePosition, positionenVon, type Setzer } from "./zustand";

type Props = { angebot: Angebot; adressen: Record<AdressArt, Adresse>; positionen: Position[]; setzer: Setzer };

function Block({ bereich, name, positionen, setzer }: { bereich: "beladen" | "befoerdern" | "entladen"; name: string; positionen: Position[]; setzer: Setzer }) {
  const aendern = useCallback((zeile: number, a: Partial<Position>) => setzer.positionen((l) => aenderePosition(l, bereich, zeile, a)), [setzer, bereich]);
  return (
    <Karte titel={name} randlos>
      <PositionsTabelle bereich={bereich} name={name} zeilen={BEREICH_ZEILEN[bereich]} positionen={positionenVon(positionen, bereich)} onAendern={aendern} />
    </Karte>
  );
}

export const Transport = memo(function Transport({ angebot, adressen, positionen, setzer }: Props) {
  const k = <F extends keyof Angebot>(feld: F) => (w: Angebot[F]) => setzer.kopf({ [feld]: w } as Partial<Angebot>);
  const b = adressen.beladestelle;
  const e = adressen.entladestelle;
  const maut = positionenVon(positionen, "maut");
  const mautAendern = useCallback((zeile: number, a: Partial<Position>) => setzer.positionen((l) => aenderePosition(l, "maut", zeile, a)), [setzer]);
  // Nur der Anfangszustand: danach klappt der Nutzer selbst auf und zu.
  const [mautOffen] = useState(() => angebot.maut_in_angebot || maut.length > 0 || !!angebot.maut_gesamt);
  const mautEntfernen = useCallback((zeile: number) => setzer.positionen((l) => entfernePosition(l, "maut", zeile)), [setzer]);
  return (
    <div id="transport" className="k-abschnitt flex flex-col gap-4">
      <Karte titel="Entfernung und Route">
        <div className="k-raster items-end">
          <Zahlfeld className="k-s3" label="Entfernung" einheit="km" wert={angebot.km} onWert={k("km")} />
          <p className="k-s9 k-leise pb-2">
            {angebot.route_km != null
              ? `Zuletzt berechnete Route: ${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(angebot.route_km)} km${angebot.route_minuten != null ? `, etwa ${Math.floor(angebot.route_minuten / 60)} Std. ${Math.round(angebot.route_minuten % 60)} Min. Fahrzeit` : ""}${angebot.route_berechnet_am ? ` (${formatDatum(angebot.route_berechnet_am)})` : ""}.`
              : "Noch keine Route berechnet."}
          </p>
        </div>
        <div id="route" className="k-abschnitt mt-4">
          <RoutenBlock
            start={{ strasse: b.strasse ?? "", plz: b.plz ?? "", ort: b.ort ?? "" }}
            ziel={{ strasse: e.strasse ?? "", plz: e.plz ?? "", ort: e.ort ?? "" }}
            km={angebot.km}
            onUebernehmen={(r) => setzer.kopf({ km: r.km, route_km: r.km, route_minuten: r.minuten, route_berechnet_am: new Date().toISOString() })}
          />
        </div>
      </Karte>
      <Block bereich="beladen" name="Beladen" positionen={positionen} setzer={setzer} />
      <Block bereich="befoerdern" name="Befördern" positionen={positionen} setzer={setzer} />
      <Block bereich="entladen" name="Entladen" positionen={positionen} setzer={setzer} />
      <details className="k-karte" open={mautOffen}>
        <summary className="k-karte-kopf cursor-pointer">
          <span className="k-karte-titel">Mautberechnung</span>
          <span className="k-leise">{angebot.maut_in_angebot ? "wird im Angebot berechnet" : "nicht im Angebot"}</span>
        </summary>
        <div className="k-karte-inhalt flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Schalter label="Mautkosten in eigenem Abschnitt berechnen und drucken" an={angebot.maut_in_angebot} onAn={k("maut_in_angebot")} />
            <Schalter label="Autobahnkilometer doppelt rechnen" an={angebot.autobahn_doppelt} onAn={k("autobahn_doppelt")} />
            <Schalter label="Maut doppelt rechnen" an={angebot.maut_doppelt} onAn={k("maut_doppelt")} />
            <Schalter label="mit Anhänger oder mind. 4 Achsen" an={angebot.maut_anhaenger} onAn={k("maut_anhaenger")} />
            <Schalter label="Übertrag in Freie Leistungen" an={angebot.maut_in_freie_leistung} onAn={k("maut_in_freie_leistung")} />
            <Schalter label="Übertrag in Transportleistungen" an={angebot.maut_in_transport} onAn={k("maut_in_transport")} />
          </div>
          <div className="k-raster">
            <Feld className="k-s6" label="Text zum Ausdruck" wert={angebot.maut_text} onWert={k("maut_text")} />
            <Feld className="k-s6" label="Inhalt/Gründe" wert={angebot.maut_inhalt} onWert={k("maut_inhalt")} />
            <Zahlfeld className="k-s2" label="Anzahl" wert={angebot.maut_anzahl} onWert={k("maut_anzahl")} />
            <Zahlfeld className="k-s2" label="Einheiten" wert={angebot.maut_einheiten} onWert={k("maut_einheiten")} />
            <Zahlfeld className="k-s3" label="Einzelpreis" einheit="€" nachkomma={2} wert={angebot.maut_einzelpreis} onWert={k("maut_einzelpreis")} />
            <Zahlfeld className="k-s2" label="Aufschlag" einheit="%" wert={angebot.maut_aufschlag} onWert={k("maut_aufschlag")} />
            <Zahlfeld
              className="k-s3"
              label="Maut gesamt"
              einheit="€"
              nachkomma={2}
              wert={angebot.maut_gesamt}
              onWert={k("maut_gesamt")}
              hinweis={angebot.maut_in_angebot ? "Zählt zur Nettosumme" : "Zählt erst mit Haken oben"}
            />
            <Zahlfeld className="k-s3" label="davon Autobahn" einheit="km" wert={angebot.autobahn_km} onWert={k("autobahn_km")} />
            <Zahlfeld className="k-s3" label="Maut je km" einheit="ct" wert={angebot.autobahn_ct} onWert={k("autobahn_ct")} />
            <Feld className="k-s3" label="Geplantes Fahrzeug" wert={angebot.maut_fahrzeug} onWert={k("maut_fahrzeug")} />
            <Zahlfeld className="k-s3" label="Eigenkosten" einheit="€" nachkomma={2} wert={angebot.maut_eigenkosten} onWert={k("maut_eigenkosten")} />
          </div>
          {maut.length > 0 ? (
            <div>
              <h3 className="k-untertitel mb-2">Mautpositionen aus dem Altbestand</h3>
              <PositionsTabelle bereich="maut" name="Maut" zeilen={maut.map((p) => p.zeile)} positionen={maut} onAendern={mautAendern} onEntfernen={mautEntfernen} />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
});
