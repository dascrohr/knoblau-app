"use client";
// Abschnitte Freie Leistung, Nebenleistung, Packmaterial.
import { memo, useCallback, useState } from "react";
import { BEREICH_ZEILEN, type Angebot, type Position } from "@/lib/angebot-typen";
import { Karte, Knopf, Textbereich } from "../ui";
import { PositionsTabelle, type StammEintrag } from "./positionen";
import { TextbausteinKnopf } from "./textbausteine";
import { aenderePosition, entfernePosition, freieZeile, positionenVon, type Setzer } from "./zustand";

/** Hält fest, welche (noch leeren) Zeilen zusätzlich sichtbar sind. */
function useZeilen(befuellt: Position[], erlaubt: number[] | null) {
  const [extra, setExtra] = useState<number[]>([]);
  const belegt = [...new Set([...befuellt.map((p) => p.zeile), ...extra])].sort((a, b) => a - b);
  const naechste = erlaubt ? freieZeile(belegt, erlaubt) : (belegt.length ? Math.max(...belegt) : 0) + 1;
  return {
    zeilen: belegt,
    naechste,
    hinzu: () => naechste != null && setExtra((x) => [...x, naechste]),
    weg: (z: number) => setExtra((x) => x.filter((y) => y !== z)),
  };
}

type FreiProps = { positionen: Position[]; text: string | null; setzer: Setzer };

export const FreieLeistung = memo(function FreieLeistung({ positionen, text, setzer }: FreiProps) {
  const frei = positionenVon(positionen, "frei");
  const z = useZeilen(frei, null);
  const aendern = useCallback((zeile: number, a: Partial<Position>) => setzer.positionen((l) => aenderePosition(l, "frei", zeile, a)), [setzer]);
  const { weg } = z;
  const entfernen = (zeile: number) => {
    weg(zeile);
    setzer.positionen((l) => entfernePosition(l, "frei", zeile));
  };
  return (
    <div id="freie-leistung" className="k-abschnitt flex flex-col gap-4">
      <Karte
        titel="Freie Leistung"
        randlos
        aktionen={
          <Knopf klein onClick={z.hinzu}>
            + Zeile hinzufügen
          </Knopf>
        }
      >
        <div className="px-1">
          <PositionsTabelle bereich="frei" name="Freie Leistungen" zeilen={z.zeilen} positionen={frei} onAendern={aendern} onEntfernen={entfernen} mitBeschreibung einheitenTitel="Stück" leerText="Noch keine freien Leistungen. Mit „Zeile hinzufügen“ legen Sie eine an." />
        </div>
        <div className="k-karte-inhalt flex flex-col gap-1">
          <Textbereich label="Freie Leistungsbeschreibung" rows={4} wert={text} onWert={(w) => setzer.kopf({ freie_leistung_text: w })} />
          <TextbausteinKnopf bereich="frei" wert={text} onWert={(w) => setzer.kopf({ freie_leistung_text: w })} />
        </div>
      </Karte>
    </div>
  );
});

type ListenProps = { positionen: Position[]; text: string | null; setzer: Setzer; stamm: StammEintrag[] };

function ListenAbschnitt({ bereich, id, titel, name, positionen, text, textLabel, textFeld, setzer, stamm, packmaterial }: ListenProps & { bereich: "nebenleistung" | "packmaterial"; id: string; titel: string; name: string; textLabel: string; textFeld: keyof Pick<Angebot, "handwerker" | "packarbeit">; packmaterial?: boolean }) {
  const liste = positionenVon(positionen, bereich);
  const z = useZeilen(liste, BEREICH_ZEILEN[bereich]);
  const aendern = useCallback((zeile: number, a: Partial<Position>) => setzer.positionen((l) => aenderePosition(l, bereich, zeile, a)), [setzer, bereich]);
  const { weg } = z;
  const entfernen = (zeile: number) => {
    weg(zeile);
    setzer.positionen((l) => entfernePosition(l, bereich, zeile));
  };
  const max = BEREICH_ZEILEN[bereich].length;
  return (
    <div id={id} className="k-abschnitt flex flex-col gap-4">
      <Karte
        titel={titel}
        randlos
        aktionen={
          <>
            <span className="k-leise text-xs">
              {z.zeilen.length} von {max} Zeilen
            </span>
            <Knopf klein onClick={z.hinzu} disabled={z.naechste == null} title={z.naechste == null ? `Mehr als ${max} Zeilen sind nicht möglich` : undefined}>
              + Zeile hinzufügen
            </Knopf>
          </>
        }
      >
        <div className="px-1">
          <PositionsTabelle
            bereich={bereich}
            name={name}
            zeilen={z.zeilen}
            positionen={liste}
            onAendern={aendern}
            onEntfernen={entfernen}
            stamm={stamm}
            stammTitel={`${name}: aus Stammdaten übernehmen`}
            packmaterial={packmaterial}
            einheitenTitel="Stück/Std."
            hinweistexte
            leerText={`Noch keine Zeilen. Mit „Zeile hinzufügen“ legen Sie eine an; über „Stammdaten“ übernehmen Sie Text und Preis.`}
          />
        </div>
        <div className="k-karte-inhalt flex flex-col gap-1">
          <Textbereich label={textLabel} rows={4} wert={text} onWert={(w) => setzer.kopf({ [textFeld]: w } as Partial<Angebot>)} />
          <TextbausteinKnopf bereich={textFeld} wert={text} onWert={(w) => setzer.kopf({ [textFeld]: w } as Partial<Angebot>)} />
        </div>
      </Karte>
    </div>
  );
}

export const Nebenleistung = memo(function Nebenleistung(p: ListenProps) {
  return <ListenAbschnitt {...p} bereich="nebenleistung" id="nebenleistung" titel="Nebenleistung" name="Nebenleistungen" textLabel="Arbeiten der Handwerker" textFeld="handwerker" />;
});

export const Packmaterial = memo(function Packmaterial(p: ListenProps) {
  return <ListenAbschnitt {...p} bereich="packmaterial" id="packmaterial" titel="Packmaterial" name="Packmaterial" textLabel="Vereinbarungen über Packleistungen" textFeld="packarbeit" packmaterial />;
});
