"use client";
import { memo } from "react";
import type { Umzugsgut as Gut } from "@/lib/angebot-typen";
import { formatZahl } from "@/lib/preis";
import { Abzeichen, Karte, Leerzustand, Tabelle } from "../ui";

const n = (x: number | null | undefined) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const reVon = (g: Gut) => n(g.anzahl || 1) * n(g.re);

export const Umzugsgut = memo(function Umzugsgut({ umzugsgut }: { umzugsgut: Gut[] }) {
  const zimmer = new Map<string, Gut[]>();
  for (const g of umzugsgut) {
    const z = g.zimmer?.trim() || "Ohne Zimmer";
    zimmer.set(z, [...(zimmer.get(z) ?? []), g]);
  }
  const stueck = umzugsgut.reduce((s, g) => s + n(g.anzahl), 0);
  const re = umzugsgut.reduce((s, g) => s + reVon(g), 0);
  return (
    <div id="umzugsgut" className="k-abschnitt">
      <Karte titel="Umzugsgut" randlos aktionen={<Abzeichen>nur Anzeige</Abzeichen>}>
        {umzugsgut.length === 0 ? (
          <Leerzustand titel="Kein Umzugsgut erfasst" text="Die Erfassung je Zimmer ist in der Neuansicht heute noch nicht möglich." />
        ) : (
          <Tabelle
            beschriftung="Umzugsgut je Zimmer"
            spalten={[{ titel: "Anzahl", rechts: true, breite: "5rem" }, "Gegenstand", "Besonderes", { titel: "RE je Stück", rechts: true }, { titel: "RE gesamt", rechts: true }, "Packmittel"]}
            fuss={
              <tr>
                <td className="k-rechts">{formatZahl(stueck)}</td>
                <td colSpan={3}>Gesamt ({zimmer.size} Zimmer)</td>
                <td className="k-rechts">{formatZahl(re)}</td>
                <td />
              </tr>
            }
          >
            {[...zimmer.entries()].flatMap(([name, liste]) => [
              <tr key={`z-${name}`}>
                <th scope="colgroup" colSpan={4} style={{ textTransform: "none", fontSize: "var(--k-text-m)", color: "var(--k-schwarz)" }}>
                  {name} <span className="k-leise font-normal">· {formatZahl(liste.reduce((s, g) => s + n(g.anzahl), 0))} Stück</span>
                </th>
                <th className="k-rechts" style={{ fontSize: "var(--k-text-m)", color: "var(--k-schwarz)" }}>
                  {formatZahl(liste.reduce((s, g) => s + reVon(g), 0))}
                </th>
                <th />
              </tr>,
              ...liste.map((g) => (
                <tr key={g.id}>
                  <td className="k-rechts">{formatZahl(g.anzahl)}</td>
                  <td>{g.gegenstand}</td>
                  <td className="k-leise">{[g.besonderes, g.zusatz].filter(Boolean).join(" · ")}</td>
                  <td className="k-rechts">{formatZahl(g.re)}</td>
                  <td className="k-rechts">{formatZahl(reVon(g))}</td>
                  <td>{g.packmittel ? "ja" : ""}</td>
                </tr>
              )),
            ])}
          </Tabelle>
        )}
      </Karte>
    </div>
  );
});
