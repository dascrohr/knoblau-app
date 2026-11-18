"use client";
// Generische Pflege einer Stammdaten-Tabelle: Liste, Suche, Filter, Anlegen, Ändern, Deaktivieren.
// Was gezeigt und bearbeitet wird, steht in konfig.ts.
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { speichereStamm } from "@/lib/aktionen";
import { formatBetrag, formatZahl } from "@/lib/preis";
import { Abzeichen, Auswahl, Feld, Hinweis, Knopf, Leerzustand, Schalter, Tabelle, Textbereich, Zahlfeld, type Spalte } from "@/components/neu/ui";
import { konfigZuSlug, type FeldDef } from "./konfig";

export type StammZeile = Record<string, unknown> & { id: number; aktiv: boolean; sortierung: number };
type Entwurf = Record<string, unknown> & { id?: number };

const JE_SEITE = 50;
const zahl = new Intl.NumberFormat("de-DE");

function text(x: unknown): string {
  return x == null ? "" : String(x);
}
function istZahlArt(f: FeldDef): boolean {
  return f.art === "zahl" || f.art === "betrag" || f.art === "prozent";
}
function zelle(f: FeldDef, wert: unknown): React.ReactNode {
  if (wert == null || wert === "") return "";
  switch (f.art) {
    case "betrag":
      return formatBetrag(Number(wert));
    case "prozent":
      return `${formatZahl(Number(wert))} %`;
    case "zahl":
      return formatZahl(Number(wert)) + (f.einheit ? ` ${f.einheit}` : "");
    case "ja_nein":
      return wert ? "ja" : "";
    case "auswahl":
      return f.optionen?.find((o) => o.wert === wert)?.text ?? text(wert);
    case "lang": {
      const t = text(wert).replace(/\s+/g, " ");
      return t.length > 90 ? <span title={text(wert)}>{t.slice(0, 90)}…</span> : t;
    }
    default:
      return text(wert);
  }
}

export function StammPflege({ slug, zeilen }: { slug: string; zeilen: StammZeile[] }) {
  const konfig = konfigZuSlug(slug)!;
  const router = useRouter();
  const dialogId = useId();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const [suche, setSuche] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [auchInaktive, setAuchInaktive] = useState(false);
  const [seite, setSeite] = useState(1);
  const [entwurf, setEntwurf] = useState<Entwurf | null>(null);
  const [feldFehler, setFeldFehler] = useState<Record<string, string>>({});
  const [dialogFehler, setDialogFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ art: "erfolg" | "fehler"; text: string } | null>(null);
  const [inArbeit, setInArbeit] = useState<number | "dialog" | null>(null);
  const [, starte] = useTransition();

  const felder = konfig.felder;
  const feldZuName = useMemo(() => new Map(felder.map((f) => [f.name, f])), [felder]);
  const spaltenFelder = konfig.spalten.map((n) => feldZuName.get(n)!).filter(Boolean);
  const filterFeld = konfig.filter ? feldZuName.get(konfig.filter) : undefined;

  // Vorhandene Werte je Spalte: für Filter und als Eingabevorschläge.
  const werteJeFeld = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const f of felder) {
      if (!f.vorschlaegeAusDaten && f.name !== konfig.filter) continue;
      const menge = new Set<string>();
      for (const z of zeilen) {
        const w = text(z[f.name]).trim();
        if (w) menge.add(w);
      }
      m.set(f.name, [...menge].sort((a, b) => a.localeCompare(b, "de")));
    }
    return m;
  }, [felder, zeilen, konfig.filter]);

  const filterOptionen = filterFeld ? (filterFeld.optionen ?? (werteJeFeld.get(filterFeld.name) ?? []).map((w) => ({ wert: w, text: w }))) : [];
  // Auch Werte zeigen, die in den festen Optionen fehlen (z. B. ältere Listen).
  const filterAlle = filterFeld?.optionen ? [...filterOptionen, ...(werteJeFeld.get(filterFeld.name) ?? []).filter((w) => !filterOptionen.some((o) => o.wert === w)).map((w) => ({ wert: w, text: w }))] : filterOptionen;

  const anzahlAktiv = zeilen.filter((z) => z.aktiv).length;
  const gefiltert = useMemo(() => {
    const q = (suche ?? "").trim().toLowerCase();
    const worte = q ? q.split(/\s+/) : [];
    return zeilen.filter((z) => {
      if (!auchInaktive && !z.aktiv) return false;
      if (filter && filterFeld && text(z[filterFeld.name]).trim() !== filter) return false;
      if (worte.length === 0) return true;
      const heu = felder
        .filter((f) => !istZahlArt(f) && f.art !== "ja_nein")
        .map((f) => text(z[f.name]))
        .join(" ")
        .toLowerCase();
      return worte.every((w) => heu.includes(w));
    });
  }, [zeilen, suche, filter, auchInaktive, felder, filterFeld]);

  const seiten = Math.max(1, Math.ceil(gefiltert.length / JE_SEITE));
  const aktSeite = Math.min(seite, seiten);
  const sichtbar = gefiltert.slice((aktSeite - 1) * JE_SEITE, aktSeite * JE_SEITE);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (entwurf && !d.open) d.showModal();
    if (!entwurf && d.open) d.close();
  }, [entwurf]);

  function oeffne(z: StammZeile | null) {
    setFeldFehler({});
    setDialogFehler(null);
    setMeldung(null);
    if (z) {
      setEntwurf({ ...z });
      return;
    }
    const neu: Entwurf = { aktiv: true };
    for (const f of felder) {
      if (f.standard !== undefined) neu[f.name] = f.standard;
      else if (f.art === "ja_nein") neu[f.name] = false;
      else neu[f.name] = null;
    }
    // Der gewählte Filter (z. B. Zimmer oder Liste) wird vorbelegt.
    if (filter && filterFeld) neu[filterFeld.name] = filter;
    setEntwurf(neu);
  }

  function setze(name: string, wert: unknown) {
    setEntwurf((e) => (e ? { ...e, [name]: wert } : e));
    setFeldFehler((f) => {
      if (!f[name]) return f;
      const { [name]: _weg, ...rest } = f;
      void _weg;
      return rest;
    });
  }

  function pruefe(e: Entwurf): Record<string, string> {
    const f: Record<string, string> = {};
    for (const feld of felder) {
      const w = e[feld.name];
      if (feld.pflicht && text(w).trim() === "") f[feld.name] = `Bitte „${feld.label}“ ausfüllen.`;
      if (istZahlArt(feld) && w != null && w !== "" && !Number.isFinite(Number(w))) f[feld.name] = "Bitte eine Zahl eingeben, z. B. 1.225,50";
    }
    if (konfig.eindeutig && konfig.eindeutig.every((n) => !f[n])) {
      const schluessel = (z: Record<string, unknown>) => konfig.eindeutig!.map((n) => text(z[n]).trim().toLowerCase()).join("|");
      const doppelt = zeilen.find((z) => z.id !== e.id && schluessel(z) === schluessel(e));
      if (doppelt) {
        const n = konfig.eindeutig[konfig.eindeutig.length - 1];
        f[n] = doppelt.aktiv ? "Diesen Eintrag gibt es schon." : "Diesen Eintrag gibt es schon – er ist deaktiviert. Bitte „auch deaktivierte zeigen“ einschalten und reaktivieren.";
      }
    }
    return f;
  }

  async function sende(zeile: Record<string, unknown>, erfolg: string, ziel: number | "dialog") {
    setInArbeit(ziel);
    setMeldung(null);
    setDialogFehler(null);
    let fehler: string | null = null;
    try {
      const r = await speichereStamm(konfig.tabelle, zeile);
      if (!r.ok) fehler = r.fehler;
    } catch {
      fehler = "Speichern nicht möglich. Bitte Verbindung prüfen und gegebenenfalls neu anmelden.";
    }
    setInArbeit(null);
    if (fehler) {
      if (ziel === "dialog") setDialogFehler(fehler);
      else setMeldung({ art: "fehler", text: fehler });
      return;
    }
    if (ziel === "dialog") setEntwurf(null);
    setMeldung({ art: "erfolg", text: erfolg });
    starte(() => router.refresh());
  }

  function speichere() {
    if (!entwurf || inArbeit != null) return;
    const f = pruefe(entwurf);
    setFeldFehler(f);
    const erstes = Object.keys(f)[0];
    if (erstes) {
      document.getElementById(`${dialogId}-${erstes}`)?.focus();
      return;
    }
    const zeile: Record<string, unknown> = { aktiv: entwurf.aktiv !== false };
    if (entwurf.id) zeile.id = entwurf.id;
    for (const feld of felder) {
      const w = entwurf[feld.name];
      if (feld.art === "ja_nein") zeile[feld.name] = !!w;
      else if (istZahlArt(feld)) zeile[feld.name] = w == null || w === "" ? null : Number(w);
      else zeile[feld.name] = typeof w === "string" ? w.trim() : (w ?? null);
    }
    // Sortierung ist eine Pflicht-Ganzzahl: neue Einträge kommen ans Ende.
    const s = zeile.sortierung;
    zeile.sortierung = typeof s === "number" ? Math.round(s) : entwurf.id ? 0 : Math.max(0, ...zeilen.map((z) => Number(z.sortierung) || 0)) + 10;
    const name = text(zeile[felder.find((x) => x.pflicht && x.art === "text")?.name ?? ""]);
    sende(zeile, entwurf.id ? `„${name}“ gespeichert.` : `„${name}“ angelegt.`, "dialog");
  }

  function schalteAktiv(z: StammZeile) {
    if (inArbeit != null) return;
    const name = text(z[felder.find((x) => x.pflicht && x.art === "text")?.name ?? ""]);
    sende({ id: z.id, aktiv: !z.aktiv }, z.aktiv ? `„${name}“ deaktiviert. Der Eintrag bleibt erhalten und kann reaktiviert werden.` : `„${name}“ reaktiviert.`, z.id);
  }

  const spalten: Spalte[] = [
    ...spaltenFelder.map((f): Spalte => ({ titel: f.label, rechts: istZahlArt(f) })),
    { titel: "Status", breite: "7rem" },
    { titel: "Aktionen", versteckt: true, breite: "13rem" },
  ];

  function eingabe(f: FeldDef, e: Entwurf) {
    const id = `${dialogId}-${f.name}`;
    const gemeinsam = { id, fehler: feldFehler[f.name] ?? null, hinweis: f.hinweis ?? null, className: f.breit ? "sm:col-span-2" : undefined };
    const label = f.pflicht ? `${f.label} *` : f.label;
    switch (f.art) {
      case "betrag":
        return <Zahlfeld key={f.name} {...gemeinsam} label={label} nachkomma={2} einheit="€" wert={e[f.name] as number | null} onWert={(w) => setze(f.name, w)} />;
      case "prozent":
        return <Zahlfeld key={f.name} {...gemeinsam} label={label} einheit="%" wert={e[f.name] as number | null} onWert={(w) => setze(f.name, w)} />;
      case "zahl":
        return <Zahlfeld key={f.name} {...gemeinsam} label={label} einheit={f.einheit} wert={e[f.name] as number | null} onWert={(w) => setze(f.name, w)} />;
      case "lang":
        return <Textbereich key={f.name} {...gemeinsam} label={label} rows={4} wert={text(e[f.name])} onWert={(w) => setze(f.name, w)} />;
      case "auswahl":
        return <Auswahl key={f.name} {...gemeinsam} label={label} optionen={f.optionen ?? []} leer="– bitte wählen –" wert={text(e[f.name])} onWert={(w) => setze(f.name, w)} required={f.pflicht} />;
      case "ja_nein":
        return (
          <div key={f.name} className={f.breit ? "sm:col-span-2" : undefined} style={{ alignSelf: "end" }}>
            <Schalter id={id} label={f.label} an={!!e[f.name]} onAn={(w) => setze(f.name, w)} />
            {f.hinweis ? <span className="k-feldhinweis block">{f.hinweis}</span> : null}
          </div>
        );
      default:
        return <Feld key={f.name} {...gemeinsam} label={label} wert={text(e[f.name])} onWert={(w) => setze(f.name, w)} vorschlaege={f.vorschlaegeAusDaten ? werteJeFeld.get(f.name) : undefined} required={f.pflicht} maxLength={500} />;
    }
  }

  const gefiltertAktiv = !!(suche && suche.trim()) || !!filter;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Feld
          label="Suche"
          type="search"
          placeholder={`${konfig.titel} durchsuchen …`}
          wert={suche}
          onWert={(w) => {
            setSuche(w);
            setSeite(1);
          }}
          className="w-full sm:w-72"
        />
        {filterFeld && filterAlle.length > 0 ? (
          <Auswahl
            label={filterFeld.label}
            optionen={filterAlle}
            leer={`Alle (${filterFeld.label})`}
            wert={filter}
            onWert={(w) => {
              setFilter(w);
              setSeite(1);
            }}
            className="w-full sm:w-64"
          />
        ) : null}
        <Schalter
          label={`auch deaktivierte zeigen (${zahl.format(zeilen.length - anzahlAktiv)})`}
          an={auchInaktive}
          onAn={(w) => {
            setAuchInaktive(w);
            setSeite(1);
          }}
          className="pb-1.5"
        />
        <span className="flex-1" />
        <Knopf art="primaer" onClick={() => oeffne(null)}>
          + {konfig.einzahl} anlegen
        </Knopf>
      </div>

      {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}

      {zeilen.length === 0 ? (
        <Leerzustand titel={`Noch keine Einträge in „${konfig.titel}“`} text="Legen Sie den ersten Eintrag an – er steht danach sofort zur Auswahl." aktion={<Knopf art="primaer" onClick={() => oeffne(null)}>+ {konfig.einzahl} anlegen</Knopf>} />
      ) : gefiltert.length === 0 ? (
        <Leerzustand
          titel="Keine Treffer"
          text={gefiltertAktiv ? "Zu Suche und Filter passt kein Eintrag." : "Alle Einträge sind deaktiviert. Schalten Sie „auch deaktivierte zeigen“ ein."}
          aktion={
            gefiltertAktiv ? (
              <Knopf
                onClick={() => {
                  setSuche(null);
                  setFilter(null);
                  setSeite(1);
                }}
              >
                Suche und Filter zurücksetzen
              </Knopf>
            ) : undefined
          }
        />
      ) : (
        <>
          <Tabelle spalten={spalten} beschriftung={konfig.titel}>
            {sichtbar.map((z) => (
              <tr key={z.id} style={z.aktiv ? undefined : { color: "var(--k-text-3)" }}>
                {spaltenFelder.map((f, i) => (
                  <td key={f.name} className={istZahlArt(f) ? "k-rechts k-zahl" : undefined} style={i === 0 || f.pflicht ? { fontWeight: 600 } : undefined}>
                    {zelle(f, z[f.name])}
                  </td>
                ))}
                <td>{z.aktiv ? <Abzeichen art="erfolg">aktiv</Abzeichen> : <Abzeichen>deaktiviert</Abzeichen>}</td>
                <td className="k-rechts" style={{ whiteSpace: "nowrap" }}>
                  <Knopf klein onClick={() => oeffne(z)} disabled={inArbeit != null}>
                    Ändern
                  </Knopf>{" "}
                  <Knopf klein art="still" onClick={() => schalteAktiv(z)} disabled={inArbeit != null} aria-busy={inArbeit === z.id}>
                    {inArbeit === z.id ? "…" : z.aktiv ? "Deaktivieren" : "Reaktivieren"}
                  </Knopf>
                </td>
              </tr>
            ))}
          </Tabelle>
          <nav className="k-blaettern" aria-label="Seiten">
            <span>
              {zahl.format(gefiltert.length)} {gefiltert.length === zeilen.length ? "Einträge" : `von ${zahl.format(zeilen.length)} Einträgen`}
              {seiten > 1 ? ` · Seite ${aktSeite} von ${seiten}` : ""}
            </span>
            {seiten > 1 ? (
              <span className="flex items-center gap-2">
                <Knopf klein disabled={aktSeite <= 1} onClick={() => setSeite(aktSeite - 1)}>
                  ← Zurück
                </Knopf>
                <Knopf klein disabled={aktSeite >= seiten} onClick={() => setSeite(aktSeite + 1)}>
                  Weiter →
                </Knopf>
              </span>
            ) : null}
          </nav>
        </>
      )}

      <dialog
        ref={dialog}
        className="k-dialog"
        aria-labelledby={`${dialogId}-titel`}
        onClose={() => setEntwurf(null)}
        onCancel={(e) => {
          if (inArbeit === "dialog") e.preventDefault();
        }}
      >
        {entwurf ? (
          <form
            noValidate
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              speichere();
            }}
          >
            <header style={{ padding: "var(--k-a4)", borderBottom: "1px solid var(--k-rahmen)" }}>
              <h2 id={`${dialogId}-titel`} style={{ fontSize: "var(--k-text-xl)", margin: 0 }}>
                {entwurf.id ? `${konfig.einzahl} ändern` : `${konfig.einzahl} anlegen`}
              </h2>
            </header>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2" style={{ padding: "var(--k-a4)" }}>
              {dialogFehler ? (
                <Hinweis art="fehler" className="sm:col-span-2">
                  {dialogFehler}
                </Hinweis>
              ) : null}
              {felder.flatMap((f) => [
                konfig.gruppen?.[f.name] ? (
                  <h3 key={`g-${f.name}`} className="k-untertitel sm:col-span-2" style={{ marginTop: "var(--k-a2)" }}>
                    {konfig.gruppen[f.name]}
                  </h3>
                ) : null,
                eingabe(f, entwurf),
              ])}
              <div className="sm:col-span-2" style={{ marginTop: "var(--k-a2)" }}>
                <Schalter label="Aktiv (steht in der Angebotsmaske zur Auswahl)" an={entwurf.aktiv !== false} onAn={(w) => setze("aktiv", w)} />
              </div>
            </div>
            <footer className="flex flex-wrap items-center justify-end gap-2" style={{ padding: "var(--k-a3) var(--k-a4)", borderTop: "1px solid var(--k-rahmen)", background: "var(--k-flaeche-2)" }}>
              <span className="k-leise mr-auto">* Pflichtfeld</span>
              <Knopf onClick={() => setEntwurf(null)} disabled={inArbeit === "dialog"}>
                Abbrechen
              </Knopf>
              <Knopf art="primaer" type="submit" disabled={inArbeit === "dialog"} aria-busy={inArbeit === "dialog"}>
                {inArbeit === "dialog" ? "Speichert …" : "Speichern"}
              </Knopf>
            </footer>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
