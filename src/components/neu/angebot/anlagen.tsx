"use client";
import Link from "next/link";
import { memo } from "react";
import type { AdressArt, Adresse, AngebotKomplett } from "@/lib/angebot-typen";
import { formatBetrag, formatDatum } from "@/lib/preis";
import { Abzeichen, Karte, Tabelle } from "../ui";
import { AdressFelder } from "./adressdaten";
import type { Setzer } from "./zustand";

type Props = { adressen: Record<AdressArt, Adresse>; setzer: Setzer; rechnungen: AngebotKomplett["rechnungen"]; halteverbotszonen: AngebotKomplett["halteverbotszonen"]; arbeitsscheine: AngebotKomplett["arbeitsscheine"] };

export const Anlagen = memo(function Anlagen({ adressen, setzer, rechnungen, halteverbotszonen, arbeitsscheine }: Props) {
  return (
    <div id="anlagen" className="k-abschnitt flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Karte titel="Zusatzadresse 1">
          <AdressFelder art="zusatz1" adresse={adressen.zusatz1} onAendern={setzer.adresse} mitBezeichnung />
        </Karte>
        <Karte titel="Zusatzadresse 2">
          <AdressFelder art="zusatz2" adresse={adressen.zusatz2} onAendern={setzer.adresse} mitBezeichnung />
        </Karte>
      </div>
      <Karte titel="Halteverbotszonen" randlos aktionen={<Abzeichen>nur Anzeige</Abzeichen>}>
        {halteverbotszonen.length === 0 ? (
          <p className="k-leise k-karte-inhalt">Zu diesem Angebot gibt es keine Halteverbotszone.</p>
        ) : (
          <Tabelle beschriftung="Halteverbotszonen" spalten={["Adresse", "Straße", "Ort", "von", "bis", "Anfrage", "Buchung"]}>
            {halteverbotszonen.map((h) => (
              <tr key={h.id}>
                <td>{h.adressart}</td>
                <td>{h.strasse}</td>
                <td>{[h.plz, h.ort].filter(Boolean).join(" ")}</td>
                <td className="whitespace-nowrap">{formatDatum(h.von_datum)}</td>
                <td className="whitespace-nowrap">{formatDatum(h.bis_datum)}</td>
                <td>{h.anfrage_ergebnis}</td>
                <td>{h.buchung_ergebnis}</td>
              </tr>
            ))}
          </Tabelle>
        )}
      </Karte>
      <div className="grid gap-4 md:grid-cols-2">
        <Karte titel="Rechnungen" randlos aktionen={<Abzeichen>nur Anzeige</Abzeichen>}>
          {rechnungen.length === 0 ? (
            <p className="k-leise k-karte-inhalt">Zu diesem Angebot gibt es noch keine Rechnung.</p>
          ) : (
            <Tabelle beschriftung="Rechnungen zum Angebot" spalten={["Rechnungsnr.", "Datum", { titel: "Gesamt €", rechts: true }]}>
              {rechnungen.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/neu/rechnungen/${r.id}`} className="k-link">
                      {r.rechnungnr || "ohne Nr."}
                    </Link>
                  </td>
                  <td>{formatDatum(r.rechnungsdatum)}</td>
                  <td className="k-rechts">{formatBetrag(r.gesamtsumme)}</td>
                </tr>
              ))}
            </Tabelle>
          )}
        </Karte>
        <Karte titel="Arbeitsscheine" randlos aktionen={<Abzeichen>nur Anzeige</Abzeichen>}>
          {arbeitsscheine.length === 0 ? (
            <p className="k-leise k-karte-inhalt">Zu diesem Angebot gibt es noch keinen Arbeitsschein.</p>
          ) : (
            <Tabelle beschriftung="Arbeitsscheine zum Angebot" spalten={["Nr.", "Art", "Datum", "Status"]}>
              {arbeitsscheine.map((a) => (
                <tr key={a.id}>
                  <td>{a.arbnr || "–"}</td>
                  <td>{a.art}</td>
                  <td>{formatDatum(a.datum)}</td>
                  <td>{a.status ? <Abzeichen>{a.status}</Abzeichen> : null}</td>
                </tr>
              ))}
            </Tabelle>
          )}
        </Karte>
      </div>
    </div>
  );
});
